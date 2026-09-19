'use strict';

// AudioEngine — sends IPC commands to audioWorker.js and re-emits responses
// as EventEmitter events for Player to consume.
//
// Main process  ──▶  { type:'play'|'pause'|'seek'… }  ──▶  audioWorker
// Main process  ◀──  { type:'tick'|'end'|'paused'… }  ◀──  audioWorker

const EventEmitter = require('events');
const { fork }     = require('child_process');
const path         = require('path');

const WORKER = path.join(__dirname, 'audioWorker.js');

class AudioEngine extends EventEmitter {
  constructor() {
    super();
    this._isPlaying = false;
    this._isPaused  = false;
    this._position  = 0;
    this._volume    = 75;
    this._worker    = null;
    this._forkWorker();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setVolume(level) {
    this._volume = Math.max(0, Math.min(100, level));
    this._send({ type: 'volume', level: this._volume });
  }

  play(track)      { this._send({ type: 'play',   track, volume: this._volume }); }
  seek(seconds)    { this._send({ type: 'seek',   seconds }); }
  pause()          { if (!this._isPaused) this._send({ type: 'pause' }); }
  resume()         { if (this._isPaused)  this._send({ type: 'resume' }); }
  stop()           { this._send({ type: 'stop' }); }

  destroy() {
    if (this._worker) { this._worker.kill(); this._worker = null; }
  }

  get isPlaying() { return this._isPlaying && !this._isPaused; }
  get isPaused()  { return this._isPaused; }
  get position()  { return this._position; }

  // ── Private ────────────────────────────────────────────────────────────────

  _forkWorker() {
    this._worker = fork(WORKER, [], { silent: false });

    this._worker.on('message', (msg) => {
      switch (msg.type) {
        case 'playing':
          this._isPlaying = true;
          this._isPaused  = false;
          this.emit('play', { track: msg.track });
          break;
        case 'tick':
          this._position = msg.position;
          this.emit('tick', { position: msg.position, duration: msg.duration });
          break;
        case 'paused':
          this._isPaused = true;
          this.emit('pause');
          break;
        case 'resumed':
          this._isPaused = false;
          this.emit('resume');
          break;
        case 'stopped':
          this._isPlaying = false;
          this._isPaused  = false;
          this._position  = 0;
          this.emit('stop');
          break;
        case 'end':
          this._isPlaying = false;
          this._position  = 0;
          this.emit('end');
          break;
        case 'error':
          this.emit('error', { err: new Error(msg.message) });
          break;
      }
    });

    // Respawn worker if it crashes
    this._worker.on('exit', (code) => {
      if (code !== 0 && code !== null) this._forkWorker();
    });
  }

  _send(msg) {
    if (this._worker?.connected) this._worker.send(msg);
  }
}

module.exports = { AudioEngine };
