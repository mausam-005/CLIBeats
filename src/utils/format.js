'use strict';

/**
 * Format seconds → "m:ss"  (e.g. 205 → "3:25")
 */
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Render a progress bar of given width using block chars.
 * @param {number} pct  — 0..100
 * @param {number} width — total char width of the bar
 */
function renderBar(pct, width = 30) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled  = Math.round((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Format a 0–100 integer volume as "75%"
 */
function formatVolume(v) {
  return `${Math.max(0, Math.min(100, v))}%`;
}

/**
 * Truncate + pad a string to an exact character width.
 */
function fitStr(str, width) {
  if (!str) str = '';
  if (str.length > width) return str.slice(0, width - 1) + '…';
  return str.padEnd(width);
}

module.exports = { formatTime, renderBar, formatVolume, fitStr };
