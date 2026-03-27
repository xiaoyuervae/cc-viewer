import React, { useState } from 'react';

/**
 * Folder icon that changes to a yellow open-folder on hover.
 * onClick calls the provided apiEndpoint via POST to open the directory in OS file manager.
 */
export default function OpenFolderIcon({ apiEndpoint, title, size = 16 }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    fetch(apiEndpoint, { method: 'POST' }).catch(() => {});
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  // Closed folder (stroke outline, like the original log manager icon)
  const closedFolder = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );

  // Open folder (yellow filled)
  const openFolder = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e8a838" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 2h5a2 2 0 0 1 2 2v1" fill="none" />
      <path d="M20 10H8.5A2.5 2.5 0 0 0 6 12.5L5 19h13.5a2 2 0 0 0 2-1.75l1-6.25A1 1 0 0 0 20.5 10z" fill="#e8a838" stroke="#d49520" />
    </svg>
  );

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', opacity: hovered ? 1 : 0.7, transition: 'opacity 0.15s', flexShrink: 0 }}
    >
      {hovered ? openFolder : closedFolder}
    </span>
  );
}
