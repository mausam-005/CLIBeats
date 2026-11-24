'use strict';

// audioWorker.js — forked by AudioEngine via child_process.fork()
// Owns the actual afplay/mpg123 process and communicates via IPC.
//
// Receives: play | seek | pause | resume | stop | volume
// Sends:    playing | paused | resumed | stopped | end | tick | error

const { spawn, execSync } = require('child_process');

let afplay       = null;
let track        = null;
let paused       = false;
let volume       = 75;
let position     = 0;
let startTime    = null;
let tickInterval = null;

// Helper to check for CLI audio binaries
function hasBinary(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_MPV    = hasBinary('mpv');
const HAS_FFPLAY = !HAS_MPV && hasBinary('ffplay');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildArgs(filePath, offsetSeconds) {
  // If mpv is installed, it provides full seeking and volume control
  if (HAS_MPV) {
    const args = ['mpv', '--no-video', `--volume=${volume}`];
    if (offsetSeconds > 0) args.push(`--start=${Math.floor(offsetSeconds)}`);
    args.push(filePath);
    return args;
  }

  // If ffplay is installed, use native seek and volume
  if (HAS_FFPLAY) {
    const args = ['ffplay', '-nodisp', '-autoexit', '-volume', String(volume)];
    if (offsetSeconds > 0) args.push('-ss', String(Math.floor(offsetSeconds)));
    args.push(filePath);
    return args;
  }

  if (process.platform === 'darwin') {
    const vol  = (volume / 100).toFixed(2);
    // Note: afplay does not support start offset (-t specifies duration limit, not start offset)
    return ['afplay', '-v', vol, filePath];
  }

  if (process.platform === 'win32') {
    return ['powershell', '-c',
      `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
  }

  // Linux: mpg123 -k <frames> (~38 frames/sec @ 128kbps)
  const args = ['mpg123', '-q'];
  if (offsetSeconds > 0) args.push('-k', String(Math.floor(offsetSeconds * 38)));
  args.push(filePath);
  return args;
}

function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (!paused && startTime !== null) {
      position = (Date.now() - startTime) / 1000;
      process.send({ type: 'tick', position, duration: track?.duration || 0 });
    }
  }, 1000);
}

function stopTick() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

function killAfplay() {
  if (afplay) {
    afplay.removeAllListeners();
    try {
      afplay.kill('SIGKILL');
    } catch (_) {}
    afplay = null;
  }
}

// Start (or restart) afplay from a given offset
function playFrom(t, offsetSeconds) {
  stopTick();
  killAfplay();

  track     = t;
  paused    = false;
  position  = offsetSeconds;
  startTime = Date.now() - offsetSeconds * 1000;

  const [cmd, ...args] = buildArgs(t.filePath, offsetSeconds);
  afplay = spawn(cmd, args, { stdio: 'ignore' });

  if (afplay.pid && process.send) {
    process.send({ type: 'spawned', pid: afplay.pid });
  }

  afplay.on('close', (code) => {
    stopTick();
    afplay = null;
    // code 0 = finished naturally (not killed)
    if (!paused && code === 0) process.send({ type: 'end' });
  });

  afplay.on('error', (err) => process.send({ type: 'error', message: err.message }));

  startTick();
  process.send({ type: 'playing', track: t });
}

// ── IPC: receive commands from AudioEngine ────────────────────────────────────

process.on('message', (msg) => {
  switch (msg.type) {

    case 'play':
      volume = msg.volume ?? volume;
      playFrom(msg.track, 0);
      break;

    case 'seek': {
      if (!track) break;
      const offset = Math.max(0, Math.min(msg.seconds, (track.duration || 0) - 1));
      playFrom(track, offset);
      break;
    }

    case 'pause':
      if (afplay && !paused) {
        paused = true;
        afplay.kill('SIGSTOP');
        stopTick();
        process.send({ type: 'paused' });
      }
      break;

    case 'resume':
      if (afplay && paused) {
        paused    = false;
        startTime = Date.now() - position * 1000;
        afplay.kill('SIGCONT');
        startTick();
        process.send({ type: 'resumed' });
      }
      break;

    case 'stop':
      stopTick();
      killAfplay();
      paused   = false;
      position = 0;
      track    = null;
      process.send({ type: 'stopped' });
      break;

    case 'volume':
      volume = Math.max(0, Math.min(100, msg.level));
      if (afplay && !paused && track && (HAS_MPV || HAS_FFPLAY || process.platform !== 'darwin')) {
        playFrom(track, position);
      }
      break;
  }
});

// Clean up child player on any termination signal, disconnect, or process exit
function cleanupAndExit() {
  stopTick();
  killAfplay();
  process.exit(0);
}

['SIGTERM', 'SIGINT', 'SIGHUP', 'disconnect'].forEach((sig) => {
  process.on(sig, cleanupAndExit);
});

process.on('exit', () => {
  stopTick();
  killAfplay();
});
