'use strict';

const EventEmitter = require('events');
const { AudioEngine } = require('../src/core/AudioEngine');

describe('AudioEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AudioEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  test('initializes with default volume and stopped state', () => {
    expect(engine.isPlaying).toBe(false);
    expect(engine.isPaused).toBe(false);
    expect(engine.position).toBe(0);
  });

  test('clamps volume levels between 0 and 100', () => {
    engine.setVolume(50);
    expect(engine._volume).toBe(50);

    engine.setVolume(-20);
    expect(engine._volume).toBe(0);

    engine.setVolume(150);
    expect(engine._volume).toBe(100);
  });

  test('handles IPC events from worker process correctly', (done) => {
    // Simulate events on internal worker mock
    engine.on('play', ({ track }) => {
      expect(track.title).toBe('Test');
      expect(engine.isPlaying).toBe(true);
      done();
    });

    engine._worker.emit('message', { type: 'playing', track: { title: 'Test' } });
  });

  test('handles pause, resume, and tick events', () => {
    engine._worker.emit('message', { type: 'playing', track: { title: 'Song' } });
    expect(engine.isPlaying).toBe(true);

    engine._worker.emit('message', { type: 'paused' });
    expect(engine.isPaused).toBe(true);

    engine._worker.emit('message', { type: 'resumed' });
    expect(engine.isPaused).toBe(false);

    engine._worker.emit('message', { type: 'tick', position: 15, duration: 100 });
    expect(engine.position).toBe(15);
  });

  test('records and clears audioPid on spawned and stopped', () => {
    engine._worker.emit('message', { type: 'spawned', pid: 9999 });
    expect(engine._audioPid).toBe(9999);

    engine._worker.emit('message', { type: 'stopped' });
    expect(engine._audioPid).toBeNull();
    expect(engine.isPlaying).toBe(false);
  });
});
