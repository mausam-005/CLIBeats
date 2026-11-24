'use strict';

const EventEmitter = require('events');
const { Player } = require('../src/core/Player');

// Mock AudioEngine so tests do not actually spawn afplay/workers
jest.mock('../src/core/AudioEngine', () => {
  const { EventEmitter } = require('events');
  class MockAudioEngine extends EventEmitter {
    constructor() {
      super();
      this.isPlaying = false;
      this.isPaused = false;
      this.position = 0;
      this.volume = 75;
      this.seekTarget = null;
      this.lastPlayed = null;
    }
    setVolume(v) { this.volume = v; }
    play(t) {
      this.isPlaying = true;
      this.isPaused = false;
      this.lastPlayed = t;
      this.emit('play', { track: t });
    }
    pause() {
      this.isPaused = true;
      this.emit('pause');
    }
    resume() {
      this.isPaused = false;
      this.emit('resume');
    }
    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      this.position = 0;
      this.emit('stop');
    }
    seek(sec) {
      this.seekTarget = sec;
      this.position = sec;
    }
    destroy() {
      this.stop();
    }
  }
  return { AudioEngine: MockAudioEngine };
});

describe('Player', () => {
  let player;
  const sampleTracks = [
    { title: 'Track 1', duration: 180 },
    { title: 'Track 2', duration: 240 },
    { title: 'Track 3', duration: 200 },
  ];

  beforeEach(() => {
    player = new Player();
    player.load(sampleTracks, 0);
  });

  afterEach(() => {
    player.destroy();
  });

  test('initializes with loaded tracks and default settings', () => {
    expect(player.tracks.length).toBe(3);
    expect(player.currentIndex).toBe(0);
    expect(player.currentTrack.title).toBe('Track 1');
    expect(player.volume).toBe(75);
    expect(player.shuffle).toBe(false);
    expect(player.repeat).toBe('none');
  });

  test('togglePlay handles play, pause, and resume transitions', () => {
    // Engine starts playing after load()
    expect(player.isPlaying).toBe(true);

    // Pause
    player.togglePlay();
    expect(player.isPaused).toBe(true);

    // Resume
    player.togglePlay();
    expect(player.isPaused).toBe(false);
    expect(player.isPlaying).toBe(true);
  });

  test('next() advances to next track and stops at the end when repeat is none', () => {
    player.next();
    expect(player.currentIndex).toBe(1);
    expect(player.currentTrack.title).toBe('Track 2');

    player.next();
    expect(player.currentIndex).toBe(2);
    expect(player.currentTrack.title).toBe('Track 3');

    // End of queue
    player.next();
    expect(player.isPlaying).toBe(false);
  });

  test('next() wraps to start when repeat mode is "all"', () => {
    player.cycleRepeat(); // track
    player.cycleRepeat(); // all
    expect(player.repeat).toBe('all');

    player.next(); // to index 1
    player.next(); // to index 2
    player.next(); // should wrap to index 0
    expect(player.currentIndex).toBe(0);
    expect(player.currentTrack.title).toBe('Track 1');
  });

  test('prev() restarts current track if position > 3 seconds', () => {
    player.next(); // on index 1
    player.engine.position = 10; // 10 seconds in

    player.prev();
    // Index should remain 1 because it restarted current track
    expect(player.currentIndex).toBe(1);
  });

  test('prev() moves to previous track if position <= 3 seconds', () => {
    player.next(); // on index 1
    player.engine.position = 1;

    player.prev();
    expect(player.currentIndex).toBe(0);
  });

  test('volume controls clamp between 0 and 100', () => {
    player.setVolume(98);
    expect(player.volume).toBe(98);

    player.volumeUp(10);
    expect(player.volume).toBe(100);

    player.setVolume(5);
    player.volumeDown(10);
    expect(player.volume).toBe(0);
  });

  test('seek controls call engine seek', () => {
    player.engine.position = 30;
    player.seekForward(10);
    expect(player.engine.seekTarget).toBe(40);

    player.seekBack(10);
    expect(player.engine.seekTarget).toBe(30);
  });

  test('toggleShuffle toggles shuffle state', () => {
    expect(player.toggleShuffle()).toBe(true);
    expect(player.shuffle).toBe(true);
    expect(player.toggleShuffle()).toBe(false);
    expect(player.shuffle).toBe(false);
  });

  test('cycleRepeat cycles through none -> track -> all -> none', () => {
    expect(player.cycleRepeat()).toBe('track');
    expect(player.cycleRepeat()).toBe('all');
    expect(player.cycleRepeat()).toBe('none');
  });

  test('state getter returns comprehensive snapshot', () => {
    const s = player.state;
    expect(s.track.title).toBe('Track 1');
    expect(s.index).toBe(0);
    expect(s.volume).toBe(75);
    expect(s.isPlaying).toBe(true);
  });
});
