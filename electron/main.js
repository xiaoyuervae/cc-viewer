import { app, BrowserWindow, Menu } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// --- Workspace mode setup (mirrors cli.js:runCliModeWorkspaceSelector) ---

// 1. Detect Claude Code installation
const { resolveNpmClaudePath, resolveNativePath } = await import(join(rootDir, 'findcc.js'));
let claudePath = resolveNpmClaudePath();
let isNpmVersion = !!claudePath;
if (!claudePath) {
  claudePath = resolveNativePath();
}

// 2. Set environment variables for workspace mode
process.env.CCV_CLI_MODE = '1';
process.env.CCV_WORKSPACE_MODE = '1';

// 3. Start proxy (intercepts Claude API calls for logging)
let proxyPort = null;
if (claudePath) {
  const { startProxy } = await import(join(rootDir, 'proxy.js'));
  proxyPort = await startProxy();
  process.env.CCV_PROXY_PORT = String(proxyPort);
}

// 4. Import and start server (workspace mode skips auto-start, need manual call)
const serverMod = await import(join(rootDir, 'server.js'));
await serverMod.startViewer();

// 5. Store Claude path/args for later launch by /api/workspaces/launch
if (claudePath) {
  serverMod.setWorkspaceClaudeArgs([]);
  serverMod.setWorkspaceClaudePath(claudePath, isNpmVersion);
}

// 6. Pre-import pty-manager for cleanup on exit
const { killPty } = await import(join(rootDir, 'pty-manager.js'));

// Poll getPort() until the server is ready
function waitForServer(timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const port = serverMod.getPort();
      if (port) return resolve(port);
      if (Date.now() - start > timeout) return reject(new Error('Server startup timeout'));
      setTimeout(check, 100);
    };
    setTimeout(check, 200);
  });
}

// --- Cleanup ---

let isQuitting = false;

function cleanup() {
  if (isQuitting) return;
  isQuitting = true;
  killPty();
  serverMod.stopViewer().catch(() => {});
}

// --- Window ---

let mainWindow = null;

async function createWindow() {
  const port = await waitForServer();
  const protocol = serverMod.getProtocol();
  const token = serverMod.getAccessToken();
  const url = `${protocol}://127.0.0.1:${port}${token ? `?token=${token}` : ''}`;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'CC Viewer',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS: basic app menu with standard shortcuts (copy/paste/select-all)
if (process.platform === 'darwin') {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ]));
}

app.on('before-quit', () => {
  cleanup();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Process-level cleanup for unexpected termination
process.on('SIGINT', () => { cleanup(); app.quit(); });
process.on('SIGTERM', () => { cleanup(); app.quit(); });
