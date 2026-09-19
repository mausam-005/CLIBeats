"use strict";

const EventEmitter = require("events");
const { AudioEngine } = require("./AudioEngine");
const Queue = require("./Queue");

/**
 * Player — high-level music controller.
 * Composes AudioEngine (sound) + Queue (ordering) into one clean API.
 *
 * Emitted events (forwarded from AudioEngine):
 *   'play'         { track }
 *   'pause'
 *   'resume'
 *   'stop'
 *   'end'
 *   'tick'         { position, duration }
 *   'track-change' { track, index }
 *   'error'        { err }
 */
class Player extends EventEmitter {
  constructor() {
    super();
    this.engine = new AudioEngine();
    this.queue = new Queue();
    this._volume = 75;
    this._shuffle = false;
    this._repeat = "none"; // 'none' | 'track' | 'all'

    // Forward engine events
    this.engine.on("play", (d) => this.emit("play", d));
    this.engine.on("pause", () => this.emit("pause"));
    this.engine.on("resume", () => this.emit("resume"));
    this.engine.on("stop", () => this.emit("stop"));
    this.engine.on("tick", (d) => this.emit("tick", d));
    this.engine.on("error", (d) => this.emit("error", d));

    // Auto-advance when a track ends naturally
    this.engine.on("end", () => {
      if (this._repeat === "track") {
        this._playCurrentTrack();
      } else {
        this.next();
      }
    });
  }

  // ─── Playback ──────────────────────────────────────────────────────────────

  /** Load tracks array and start playing from startIndex. */
  load(tracks, startIndex = 0) {
    this.queue.load(tracks);
    this.queue.index = startIndex;
    this._playCurrentTrack();
  }

  /** Play / resume / start — handles all three states in one call. */
  togglePlay() {
    if (this.engine.isPaused) this.engine.resume();
    else if (this.engine.isPlaying) this.engine.pause();
    else this._playCurrentTrack();
  }

  stop() {
    this.engine.stop();
  }

  /** Shutdown: stop audio + kill the IPC worker process. */
  destroy() {
    this.engine.stop();
    this.engine.destroy();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  /** Skip to the next track (wraps when repeat-all is on). */
  next() {
    const track = this._shuffle ? this.queue.random() : this.queue.next();

    if (!track) {
      if (this._repeat === "all") {
        this.queue.index = 0;
        this._playCurrentTrack();
      } else this.engine.stop();
      return;
    }
    this._playCurrentTrack();
  }

  /**
   * Go back to the previous track.
   * If more than 3 seconds in, restarts the current track instead.
   */
  prev() {
    if (this.engine.position > 3) {
      this._playCurrentTrack();
      return;
    }
    this.queue.prev();
    this._playCurrentTrack();
  }

  // ─── Volume & Seek ─────────────────────────────────────────────────────────

  setVolume(level) {
    this._volume = Math.max(0, Math.min(100, level));
    this.engine.setVolume(this._volume);
  }

  volumeUp(step = 5) {
    this.setVolume(this._volume + step);
  }
  volumeDown(step = 5) {
    this.setVolume(this._volume - step);
  }

  seekForward(step = 10) {
    this.engine.seek(this.engine.position + step);
  }
  seekBack(step = 10) {
    this.engine.seek(this.engine.position - step);
  }

  // ─── Modes ─────────────────────────────────────────────────────────────────

  toggleShuffle() {
    this._shuffle = !this._shuffle;
    return this._shuffle;
  }

  cycleRepeat() {
    const modes = ["none", "track", "all"];
    this._repeat = modes[(modes.indexOf(this._repeat) + 1) % modes.length];
    return this._repeat;
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get currentTrack() {
    return this.queue.current;
  }
  get currentIndex() {
    return this.queue.index;
  }
  get tracks() {
    return this.queue.tracks;
  }
  get volume() {
    return this._volume;
  }
  get shuffle() {
    return this._shuffle;
  }
  get repeat() {
    return this._repeat;
  }
  get isPlaying() {
    return this.engine.isPlaying;
  }
  get isPaused() {
    return this.engine.isPaused;
  }

  get state() {
    return {
      track: this.currentTrack,
      index: this.currentIndex,
      position: this.engine.position,
      volume: this._volume,
      shuffle: this._shuffle,
      repeat: this._repeat,
      isPlaying: this.engine.isPlaying,
      isPaused: this.engine.isPaused,
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _playCurrentTrack() {
    const track = this.queue.current;
    if (!track) return;
    this.engine.play(track);
    this.emit("track-change", { track, index: this.queue.index });
  }
}

module.exports = { Player };
