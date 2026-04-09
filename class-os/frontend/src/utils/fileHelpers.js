/**
 * Returns an emoji icon for a given MIME type.
 */
export function fileIcon(mimetype = '') {
  if (mimetype === 'application/pdf') return '📄';
  if (mimetype.startsWith('image/')) return '🖼️';
  if (mimetype.includes('word')) return '📝';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📊';
  if (mimetype.includes('zip')) return '🗜️';
  return '📎';
}

/**
 * Formats a byte count into a human-readable string (B / KB / MB).
 */
export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
