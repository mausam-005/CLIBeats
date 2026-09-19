'use strict';

/**
 * Queue — manages an ordered list of tracks with navigation.
 */
class Queue {
  constructor() {
    this._tracks = [];
    this._index = 0;
  }

  /** Load a fresh array of track objects */
  load(tracks) {
    this._tracks = [...tracks];
    this._index = 0;
  }

  /** Add a track to the end of the queue */
  add(track) {
    this._tracks.push(track);
  }

  /** Remove track at position i */
  remove(i) {
    this._tracks.splice(i, 1);
    if (this._index >= this._tracks.length) {
      this._index = Math.max(0, this._tracks.length - 1);
    }
  }

  /** Advance to next track. Returns the new current track or null if end. */
  next() {
    if (this._index < this._tracks.length - 1) {
      this._index++;
      return this.current;
    }
    return null;
  }

  /** Go back to previous track. Returns the new current track. */
  prev() {
    if (this._index > 0) this._index--;
    return this.current;
  }

  /** Jump to a random track (excluding current) */
  random() {
    if (this._tracks.length <= 1) return this.current;
    let next;
    do {
      next = Math.floor(Math.random() * this._tracks.length);
    } while (next === this._index);
    this._index = next;
    return this.current;
  }

  /** Jump to a specific index, clamped to valid range */
  jumpTo(i) {
    this._index = Math.max(0, Math.min(i, this._tracks.length - 1));
    return this.current;
  }

  get current() { return this._tracks[this._index] || null; }
  get tracks()  { return this._tracks; }
  get index()   { return this._index; }
  set index(i)  { this._index = Math.max(0, Math.min(i, this._tracks.length - 1)); }
  get length()  { return this._tracks.length; }
  get hasNext() { return this._index < this._tracks.length - 1; }
  get hasPrev() { return this._index > 0; }
}

module.exports = Queue;
