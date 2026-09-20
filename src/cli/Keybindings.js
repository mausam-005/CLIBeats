'use strict';

/**
 * Keybindings — attaches keyboard shortcuts to a blessed screen.
 *
 * `actions` is a plain object with methods the Dashboard provides:
 *   cursorUp(), cursorDown(), playSelected()
 *   togglePlay(), next(), prev()
 *   volumeUp(), volumeDown()
 *   toggleShuffle(), cycleRepeat()
 *   quit()
 */
class Keybindings {
  constructor(screen, actions) {
    this._screen  = screen;
    this._actions = actions;
    this._attach();
  }

  _attach() {
    const s = this._screen;
    const a = this._actions;

    // Navigation
    s.key(['up',   'k'], () => a.cursorUp());
    s.key(['down', 'j'], () => a.cursorDown());

    // Playback
    s.key('enter', () => a.playSelected());
    s.key('space', () => a.togglePlay());
    s.key('n',     () => a.next());
    s.key('b',     () => a.prev());

    // Seek (left/right arrows or h/l vim-style)
    s.key(['right', 'l'], () => a.seekForward());
    s.key(['left',  'h'], () => a.seekBack());

    // Volume
    s.key(['+', '='], () => a.volumeUp());
    s.key('-',        () => a.volumeDown());

    // Modes
    s.key('s', () => a.toggleShuffle());
    s.key('r', () => a.cycleRepeat());

    // Quit
    s.key(['q', 'C-c'], () => a.quit());
  }
}

module.exports = { Keybindings };
