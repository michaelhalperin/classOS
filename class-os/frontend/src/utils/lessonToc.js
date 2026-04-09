/** Strip common markdown inline formatting for TOC labels */
export function stripInlineMd(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function baseSlug(text) {
  return stripInlineMd(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

/** Build stable ids for ## headings (deduped). Order matches document order. */
export function extractLessonH2Toc(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const seen = new Map();
  const items = [];
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    const m = /^##\s+(.+)$/.exec(trimmed);
    if (!m) continue;
    const text = stripInlineMd(m[1]);
    if (!text) continue;
    let id = baseSlug(text);
    const n = seen.get(id) || 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    items.push({ text, id });
  }
  return items;
}
