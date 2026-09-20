'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CONFIG_DIR  = path.join(os.homedir(), '.clibeats');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** Default settings */
const DEFAULTS = {
  lastFolder : null,   // last used music folder
  volume     : 75,     // 0–100
  shuffle    : false,
  repeat     : 'none', // 'none' | 'track' | 'all'
};

/**
 * Load config from disk. Returns DEFAULTS if file doesn't exist or is invalid.
 */
function load() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {
    // silently fall back to defaults
  }
  return { ...DEFAULTS };
}

/**
 * Save config to disk. Silently ignores write errors.
 */
function save(data) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch {
    // ignore
  }
}

module.exports = { load, save, CONFIG_FILE };
