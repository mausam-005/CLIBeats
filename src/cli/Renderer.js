'use strict';

const blessed = require('blessed');
const { formatTime, renderBar, formatVolume, fitStr } = require('../utils/format');

/**
 * Renderer — owns the blessed screen and all widgets.
 * Has NO music logic. Accepts plain data and redraws widgets.
 *
 * Layout (from top):
 *   ┌─ header (3 rows) ─────────────────────────────┐
 *   │  🎵  CLIBeats              Vol: 75%  ⇄  ↺      │
 *   ├─ list (flexible) ─────────────────────────────┤
 *   │  scrollable song list                          │
 *   ├─ now-playing (5 rows) ─────────────────────────┤
 *   │  ▶  Song Title                                 │
 *   │     Artist — Album                             │
 *   │     ████████░░░░░░  1:23 / 3:45               │
 *   ├─ help (2 rows) ────────────────────────────────┤
 *   │  ↑↓ Nav  Enter Play  Space Pause  n/b ...      │
 *   └────────────────────────────────────────────────┘
 */
class Renderer {
  constructor() {
    this.screen = blessed.screen({
      smartCSR   : true,
      title      : 'CLIBeats',
      fullUnicode: true,
      forceUnicode: true,
    });

    this._buildWidgets();

    // Restore terminal cleanly on unexpected exit
    this.screen.on('destroy', () => {
      // blessed already restores the terminal on destroy
    });
  }

  // ─── Widget construction ──────────────────────────────────────────────────

  _buildWidgets() {
    const s = this.screen;

    // ── Header ──────────────────────────────────────────────────────────────
    this.header = blessed.box({
      parent : s,
      top    : 0,
      left   : 0,
      width  : '100%',
      height : 3,
      tags   : true,
      style  : {
        fg   : 'white',
        bg   : '#1a1a2e',
        bold : false,
      },
    });

    // ── Song list ────────────────────────────────────────────────────────────
    this.list = blessed.list({
      parent     : s,
      top        : 3,
      left       : 0,
      width      : '100%',
      bottom     : 8,
      scrollable : true,
      keys       : false,   // keyboard handled by Dashboard/Keybindings
      mouse      : false,
      border     : { type: 'line' },
      tags       : true,
      style      : {
        fg      : 'white',
        bg      : 'black',
        border  : { fg: '#444' },
        selected: { fg: 'black', bg: 'cyan', bold: true },
        item    : { fg: '#ccc' },
      },
      scrollbar  : {
        ch   : '▐',
        style: { fg: '#444' },
        track: { bg: '#111' },
      },
    });

    // ── Now-playing panel ────────────────────────────────────────────────────
    this.nowPlaying = blessed.box({
      parent : s,
      bottom : 3,
      left   : 0,
      width  : '100%',
      height : 5,
      border : { type: 'line' },
      tags   : true,
      style  : {
        fg    : 'white',
        bg    : '#0d0d1a',
        border: { fg: '#6c63ff' },
      },
    });

    // ── Help bar ─────────────────────────────────────────────────────────────
    this.help = blessed.box({
      parent : s,
      bottom : 0,
      left   : 0,
      width  : '100%',
      height : 3,
      tags   : true,
      style  : {
        fg: '#555',
        bg: '#0a0a0a',
      },
    });

    this._renderHelp();
    s.render();
  }

  // ─── Public render methods ────────────────────────────────────────────────

  /**
   * Render the top header bar with title, volume, shuffle, repeat indicators.
   * @param {{ volume, shuffle, repeat }} state
   */
  renderHeader(state) {
    const { volume, shuffle, repeat } = state;

    const shuffleOn = shuffle;
    const shuffleStr = shuffleOn
      ? '{bold}{cyan-fg}⇄ SHF{/}{/}'
      : '{gray-fg}⇄ SHF{/}';

    const repeatStr = repeat === 'none'
      ? '{gray-fg}↺ REP{/}'
      : repeat === 'track'
        ? '{bold}{cyan-fg}↺ 1{/}{/}'
        : '{bold}{cyan-fg}↺ ALL{/}{/}';

    const volStr = `{white-fg}Vol:{/} {bold}{cyan-fg}${formatVolume(volume)}{/}{/}`;

    // Left: title   Right: vol + shuffle + repeat
    const left  = '  {bold}{cyan-fg}♪  CLIBeats{/}{/}';
    const right  = `${volStr}   ${shuffleStr}   ${repeatStr}  `;

    this.header.setContent(`${left}{|}${right}`);
    this.screen.render();
  }

  /**
   * Render the scrollable track list.
   * @param {Track[]} tracks
   * @param {number}  cursorIdx  — row highlighted (cursor position)
   * @param {number}  playingIdx — index of currently playing song (-1 if none)
   */
  renderList(tracks, cursorIdx, playingIdx = -1) {
    const w = this.screen.width;

    // Distribute columns: idx | playing | title | artist | dur
    // Total: 4 + 2 + title(flex) + 2 + artist(20) + 2 + 5 + 2
    const durW    = 5;
    const artistW = 18;
    const titleW  = Math.max(15, w - 4 - 2 - 2 - artistW - 2 - durW - 6);

    const items = tracks.map((t, i) => {
      const num    = String(i + 1).padStart(3, ' ');
      const icon   = i === playingIdx ? '♪' : ' ';
      const title  = fitStr(t.title  || t.filename, titleW);
      const artist = fitStr(t.artist || '', artistW);
      const dur    = (t.durationStr || '0:00').padStart(durW);

      // Color the currently-playing row differently in the item text
      if (i === playingIdx) {
        return `{bold}{green-fg}${num} ${icon} ${title}  ${artist}  ${dur}{/}{/}`;
      }
      return `{gray-fg}${num}{/}   ${title}  {gray-fg}${artist}  ${dur}{/}`;
    });

    this.list.setItems(items);
    this.list.select(cursorIdx);
    this.screen.render();
  }

  /**
   * Render the now-playing panel.
   * @param {{ track, position, isPlaying, isPaused }} state
   */
  renderNowPlaying(state) {
    const { track, position, isPlaying, isPaused } = state;

    if (!track) {
      this.nowPlaying.setLabel(' {gray-fg}Now Playing{/} ');
      this.nowPlaying.setContent(
        '\n  {gray-fg}No track selected — press {bold}Enter{/} to play.{/}'
      );
      this.screen.render();
      return;
    }

    const icon = isPlaying ? '{bold}{green-fg}▶{/}{/}' : isPaused ? '{bold}{yellow-fg}⏸{/}{/}' : '{gray-fg}⏹{/}';

    const pct      = track.duration > 0 ? (position / track.duration) * 100 : 0;
    const barWidth = Math.max(20, Math.min(50, this.screen.width - 22));
    const bar      = renderBar(Math.min(100, pct), barWidth);
    const posStr   = formatTime(position);
    const durStr   = track.durationStr || '0:00';

    const title  = track.title  || track.filename || 'Unknown';
    const artist = track.artist || 'Unknown Artist';
    const album  = track.album  || '';

    const line1 = ` ${icon}  {bold}{white-fg}${title}{/}{/}`;
    const line2 = `      {gray-fg}${artist}${album ? '  —  ' + album : ''}{/}`;
    const line3 = `      {cyan-fg}${bar}{/}  {white-fg}${posStr}{/}{gray-fg} / ${durStr}{/}`;

    this.nowPlaying.setLabel(` {magenta-fg}Now Playing{/} `);
    this.nowPlaying.setContent(`${line1}\n${line2}\n${line3}`);
    this.screen.render();
  }

  /** Destroy the screen and restore the terminal */
  destroy() {
    this.screen.destroy();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  _renderHelp() {
    const keys = [
      '{bold}↑↓{/} Nav',
      '{bold}Enter{/} Play',
      '{bold}Space{/} Pause',
      '{bold}n{/} Next',
      '{bold}b{/} Prev',
      '{bold}←→{/} Seek 10s',
      '{bold}+/-{/} Vol',
      '{bold}s{/} Shuffle',
      '{bold}r{/} Repeat',
      '{bold}q{/} Quit',
    ];
    this.help.setContent(' ' + keys.join('  ·  '));
  }
}

module.exports = { Renderer };
