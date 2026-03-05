import React, { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/github-dark.css';
import { t } from '../i18n';
import styles from './FileContentView.module.css';

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sql', sql);

const LANG_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  c: 'cpp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'css',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
};

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return LANG_MAP[ext] || null;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileContentView({ filePath, onClose }) {
  const MINIMAP_VIEWPORT_HEIGHT = 56;
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [fileSize, setFileSize] = useState(0);
  const mounted = useRef(true);
  const codeRef = useRef(null);
  const lineNumRef = useRef(null);
  const codeScrollRef = useRef(null);
  const lineNumScrollRef = useRef(null);
  const minimapRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const minimapViewportRef = useRef(null);
  const lineCountRef = useRef(0);
  const minimapDataRef = useRef([]);
  const dragStateRef = useRef({ active: false, offsetY: 0 });

  const computeMinimapData = (text) => {
    const lines = text.split('\n');
    lineCountRef.current = lines.length;
    minimapDataRef.current = lines.map((line) => {
      const len = line.trim().length;
      return Math.min(1, len / 96);
    });
  };

  const drawMinimap = () => {
    const canvas = minimapCanvasRef.current;
    const wrap = minimapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width <= 0 || height <= 0) return;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    const data = minimapDataRef.current;
    const count = lineCountRef.current;
    if (!count || !data.length) return;

    const innerPad = 4;
    const avail = Math.max(4, width - innerPad * 2);
    for (let i = 0; i < count; i += 1) {
      const y = Math.floor((i / count) * height);
      const intensity = data[i];
      if (intensity < 0.06) continue;
      const barWidth = Math.max(2, Math.floor(avail * intensity));
      ctx.fillStyle = `rgba(146, 151, 179, ${0.2 + intensity * 0.45})`;
      ctx.fillRect(innerPad, y, barWidth, 1);
    }
  };

  const syncMinimapViewport = () => {
    const codeEl = codeScrollRef.current;
    const mapEl = minimapRef.current;
    const viewportEl = minimapViewportRef.current;
    if (!codeEl || !mapEl || !viewportEl) return;

    const { scrollTop, scrollHeight, clientHeight } = codeEl;
    const mapHeight = mapEl.clientHeight;
    if (scrollHeight <= 0 || mapHeight <= 0) return;

    const viewportHeight = Math.min(mapHeight, MINIMAP_VIEWPORT_HEIGHT);
    const maxTop = Math.max(0, mapHeight - viewportHeight);
    const scrollRange = Math.max(1, scrollHeight - clientHeight);
    const top = (scrollTop / scrollRange) * maxTop;
    viewportEl.style.height = `${viewportHeight}px`;
    viewportEl.style.transform = `translateY(${top}px)`;
  };

  const scrollByMinimap = (clientY, keepGrabOffset = false) => {
    const mapEl = minimapRef.current;
    const codeEl = codeScrollRef.current;
    const viewportEl = minimapViewportRef.current;
    if (!mapEl || !codeEl || !viewportEl) return;
    const rect = mapEl.getBoundingClientRect();
    const viewportHeight = viewportEl.offsetHeight || MINIMAP_VIEWPORT_HEIGHT;
    const maxViewportTop = Math.max(1, rect.height - viewportHeight);
    const rawTop = keepGrabOffset
      ? (clientY - rect.top - dragStateRef.current.offsetY)
      : (clientY - rect.top - viewportHeight / 2);
    const viewportTop = Math.max(0, Math.min(maxViewportTop, rawTop));
    const ratio = viewportTop / maxViewportTop;
    const maxScroll = Math.max(0, codeEl.scrollHeight - codeEl.clientHeight);
    codeEl.scrollTop = ratio * maxScroll;
  };

  const onMinimapMouseDown = (e) => {
    const viewportEl = minimapViewportRef.current;
    if (!viewportEl) return;
    const onViewport = viewportEl.contains(e.target);
    dragStateRef.current.active = true;
    dragStateRef.current.offsetY = onViewport
      ? (e.clientY - viewportEl.getBoundingClientRect().top)
      : (viewportEl.offsetHeight || MINIMAP_VIEWPORT_HEIGHT) / 2;
    scrollByMinimap(e.clientY, true);
    e.preventDefault();
  };

  useEffect(() => {
    mounted.current = true;
    setContent(null);
    setError(null);

    fetch(`/api/file-content?path=${encodeURIComponent(filePath)}`)
      .then(r => {
        if (!r.ok) {
          return r.json().then(err => {
            throw new Error(err.error || 'Failed to load');
          }).catch(() => {
            throw new Error(`HTTP ${r.status}`);
          });
        }
        return r.json();
      })
      .then(data => {
        if (mounted.current) {
          setContent(data.content);
          setFileSize(data.size);
          computeMinimapData(data.content);
        }
      })
      .catch((err) => {
        if (mounted.current) setError(`${t('ui.fileLoadError')}: ${err.message}`);
      });

    return () => { mounted.current = false; };
  }, [filePath]);

  useEffect(() => {
    if (content && codeRef.current) {
      const lang = getLanguage(filePath);
      const lines = content.split('\n');

      if (lang) {
        try {
          const highlighted = hljs.highlight(content, { language: lang });
          const highlightedLines = highlighted.value.split('\n');
          lineNumRef.current.innerHTML = highlightedLines
            .map((_, i) => `<div class="${styles.lineNumberRow}">${i + 1}</div>`)
            .join('');
          codeRef.current.innerHTML = highlightedLines
            .map((line) => `<div class="${styles.lineContentRow}">${line || ' '}</div>`)
            .join('');
        } catch {
          lineNumRef.current.innerHTML = lines
            .map((_, i) => `<div class="${styles.lineNumberRow}">${i + 1}</div>`)
            .join('');
          codeRef.current.innerHTML = lines
            .map((line) => `<div class="${styles.lineContentRow}">${line || ' '}</div>`)
            .join('');
        }
      } else {
        lineNumRef.current.innerHTML = lines
          .map((_, i) => `<div class="${styles.lineNumberRow}">${i + 1}</div>`)
          .join('');
        codeRef.current.innerHTML = lines
          .map((line) => `<div class="${styles.lineContentRow}">${line || ' '}</div>`)
          .join('');
      }
    }
  }, [content, filePath]);

  // 纵向滚动同步：代码区滚动时同步行号列
  useEffect(() => {
    const codeEl = codeScrollRef.current;
    const lineEl = lineNumScrollRef.current;
    if (!codeEl || !lineEl) return;
    const onScroll = () => {
      lineEl.scrollTop = codeEl.scrollTop;
      syncMinimapViewport();
    };
    codeEl.addEventListener('scroll', onScroll);
    onScroll();
    return () => codeEl.removeEventListener('scroll', onScroll);
  });

  useEffect(() => {
    if (!content) return;
    const onResize = () => {
      drawMinimap();
      syncMinimapViewport();
    };
    drawMinimap();
    syncMinimapViewport();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [content]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragStateRef.current.active) return;
      scrollByMinimap(e.clientY, true);
    };
    const onMouseUp = () => {
      dragStateRef.current.active = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className={styles.fileContentView}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={onClose} title={t('ui.backToChat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className={styles.filePath}>{filePath}</span>
        </div>
        {fileSize > 0 && (
          <span className={styles.fileSize}>{formatFileSize(fileSize)}</span>
        )}
      </div>
      <div className={styles.contentContainer}>
        {error && <div className={styles.error}>{error}</div>}
        {!content && !error && <div className={styles.loading}>{t('ui.loading')}</div>}
        {content && (
          <div className={styles.codeBlock}>
            <div className={styles.lineNumberCol} ref={lineNumScrollRef}>
              <div ref={lineNumRef}></div>
            </div>
            <div className={styles.codePane}>
              <div className={styles.codeCol} ref={codeScrollRef}>
                <pre className={styles.codeContent}><code ref={codeRef}></code></pre>
              </div>
              <div
                className={styles.minimap}
                ref={minimapRef}
                onMouseDown={onMinimapMouseDown}
                title={t('ui.fileContent')}
              >
                <canvas className={styles.minimapCanvas} ref={minimapCanvasRef} />
                <div className={styles.minimapViewport} ref={minimapViewportRef}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
