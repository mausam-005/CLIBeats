'use strict';

const { Player }      = require('../core/Player');
const { Renderer }    = require('./Renderer');
const { Keybindings } = require('./Keybindings');
const Config          = require('../config/Config');

/**
 * Dashboard — orchestrates Player, Renderer, and Keybindings.
 *
 * Responsibilities:
 *  - Loads tracks into Player
 *  - Applies saved config (volume, shuffle, repeat)
 *  - Subscribes to Player events and calls Renderer to update UI
 *  - Provides action handlers that Keybindings calls
 *  - Persists config on every state change
 */
class Dashboard {
  /**
   * @param {import('../core/Scanner').Track[]} tracks
   * @param {string} folder — the folder path that was scanned
   */
  constructor(tracks, folder = null) {
    this._tracks  = tracks;
    this._folder  = folder;
    this._config  = Config.load();
    this._cursor  = 0;        // row highlighted in the list (not necessarily playing)
    this._playing = -1;       // index of song currently playing

    this._player   = new Player();
    this._renderer = new Renderer();

    // Apply saved state
    this._player.setVolume(this._config.volume);
    if (this._config.shuffle) this._player.toggleShuffle();
    // Cycle repeat to match saved value
    while (this._player.repeat !== this._config.repeat) {
      this._player.cycleRepeat();
      if (this._player.repeat === 'none') break; // safety: avoid infinite loop
    }
  }

  /** Start the TUI */
  start() {
    // Initial render
    this._renderer.renderHeader(this._player.state);
    this._renderer.renderList(this._tracks, this._cursor, this._playing);
    this._renderer.renderNowPlaying(this._player.state);

    // ── Player event listeners ─────────────────────────────────────────────

    this._player.on('tick', () => {
      this._renderer.renderNowPlaying(this._player.state);
    });

    this._player.on('track-change', ({ index }) => {
      this._playing = index;
      this._cursor  = index;
      this._renderer.renderList(this._tracks, this._cursor, this._playing);
      this._renderer.renderNowPlaying(this._player.state);
      this._renderer.renderHeader(this._player.state);
    });

    this._player.on('pause', () => {
      this._renderer.renderNowPlaying(this._player.state);
    });

    this._player.on('resume', () => {
      this._renderer.renderNowPlaying(this._player.state);
    });

    this._player.on('stop', () => {
      this._playing = -1;
      this._renderer.renderList(this._tracks, this._cursor, this._playing);
      this._renderer.renderNowPlaying(this._player.state);
    });


    this._player.on('error', ({ err }) => {
      // Show error in now-playing area without crashing
      this._renderer.nowPlaying.setContent(
        `\n  {red-fg}Playback error: ${err.message || err}{/}`
      );
      this._renderer.screen.render();
    });

    // ── Keybindings ────────────────────────────────────────────────────────

    new Keybindings(this._renderer.screen, {
      cursorUp: () => {
        this._cursor = Math.max(0, this._cursor - 1);
        this._renderer.renderList(this._tracks, this._cursor, this._playing);
      },

      cursorDown: () => {
        this._cursor = Math.min(this._tracks.length - 1, this._cursor + 1);
        this._renderer.renderList(this._tracks, this._cursor, this._playing);
      },

      playSelected: () => {
        this._player.load(this._tracks, this._cursor);
        this._renderer.renderHeader(this._player.state);
      },

      togglePlay: () => {
        this._player.togglePlay();
        // pause/resume events will re-render
      },

      next: () => {
        this._player.next();
        // track-change event will re-render
      },

      prev: () => {
        this._player.prev();
        // track-change event will re-render
      },

      volumeUp: () => {
        this._player.volumeUp();
        this._saveConfig();
        this._renderer.renderHeader(this._player.state);
      },

      volumeDown: () => {
        this._player.volumeDown();
        this._saveConfig();
        this._renderer.renderHeader(this._player.state);
      },

      seekForward: () => {
        this._player.seekForward(10);
        // tick event will re-render now-playing
      },

      seekBack: () => {
        this._player.seekBack(10);
        // tick event will re-render now-playing
      },

      toggleShuffle: () => {
        this._player.toggleShuffle();
        this._saveConfig();
        this._renderer.renderHeader(this._player.state);
      },

      cycleRepeat: () => {
        this._player.cycleRepeat();
        this._saveConfig();
        this._renderer.renderHeader(this._player.state);
      },

      quit: () => {
        this.destroy();
        process.exit(0);
      },
    });

    this._renderer.screen.render();
  }

  /** Clean shutdown: stop audio, kill worker, persist config, destroy TUI. */
  destroy() {
    this._player.destroy();
    this._saveConfig();
    this._renderer.destroy();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  _saveConfig() {
    Config.save({
      lastFolder: this._folder || this._config.lastFolder,
      volume    : this._player.volume,
      shuffle   : this._player.shuffle,
      repeat    : this._player.repeat,
    });
  }
}

module.exports = { Dashboard };
