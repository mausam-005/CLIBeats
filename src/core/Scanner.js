'use strict';

const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');

const SUPPORTED_EXTS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];

/**
 * Recursively scan a path (file or directory) for audio files.
 * Reads ID3 metadata from each file.
 *
 * @param {string} targetPath - absolute path to a file or directory
 * @returns {Promise<Track[]>}
 */
async function scan(targetPath) {
  const stat = fs.statSync(targetPath);
  const files = stat.isDirectory()
    ? collectFiles(targetPath)
    : [targetPath].filter(f => SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()));

  const tracks = await Promise.all(files.map(readTrack));
  return tracks.filter(Boolean);
}

/**
 * Recursively collect all supported audio files in a directory.
 */
function collectFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFiles(fullPath));
    } else if (SUPPORTED_EXTS.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

/**
 * Read metadata for a single audio file and return a Track object.
 */
async function readTrack(filePath) {
  try {
    const meta = await parseFile(filePath, { duration: true });
    const { title, artist, album } = meta.common;
    const duration = meta.format.duration || 0;

    return {
      filePath,
      filename: path.basename(filePath),
      title:    title  || path.basename(filePath, path.extname(filePath)),
      artist:   artist || 'Unknown Artist',
      album:    album  || 'Unknown Album',
      duration,                             // seconds (float)
      durationStr: formatDuration(duration),
    };
  } catch {
    // If metadata fails, return a minimal track object
    return {
      filePath,
      filename: path.basename(filePath),
      title: path.basename(filePath, path.extname(filePath)),
      artist: 'Unknown Artist',
      album:  'Unknown Album',
      duration: 0,
      durationStr: '0:00',
    };
  }
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { scan, SUPPORTED_EXTS };
