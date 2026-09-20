# CLIBeats

A terminal music player built with Node.js. Uses an IPC-based audio worker architecture, a full-featured TUI powered by `blessed`, and persistent user configuration.

---

## Features

- Scrollable track list with real-time now-playing panel and progress bar
- Play, pause, stop, next, previous
- Seek forward and backward 10 seconds
- Volume control (0–100)
- Shuffle and repeat modes (off / track / all)
- ID3 tag reading — title, artist, album, duration
- Persistent config stored in `~/.clibeats/config.json`
- Cross-platform audio backend (macOS, Linux)

---

## Installation

```bash
git clone https://github.com/mausam-005/CLIBeats.git
cd CLIBeats
npm install
```

---

## Usage

```bash
# Launch TUI with a specific folder
node bin/clibeats.js tui -f /path/to/music

# Default shortcut (points to ~/Music)
npm start

# List tracks in a folder without launching TUI
node bin/clibeats.js list /path/to/music
```

---

## Keyboard Shortcuts

| Key             | Action              |
|-----------------|---------------------|
| `Up` / `Down`   | Navigate list       |
| `Enter`         | Play selected track |
| `Space`         | Play / Pause        |
| `n`             | Next track          |
| `b`             | Previous track      |
| `Right` / `l`   | Seek +10 seconds    |
| `Left` / `h`    | Seek −10 seconds    |
| `+` / `-`       | Volume up / down    |
| `s`             | Toggle shuffle      |
| `r`             | Cycle repeat mode   |
| `q`             | Quit                |

---

## Project Structure

```
CLIBeats/
├── bin/
│   └── clibeats.js          CLI entry point (Commander)
├── src/
│   ├── core/
│   │   ├── audioWorker.js   Forked process — owns afplay and POSIX signals
│   │   ├── AudioEngine.js   Forks worker, communicates via IPC messages
│   │   ├── Player.js        Composes AudioEngine and Queue, exposes controls
│   │   ├── Queue.js         Ordered track list with navigation and shuffle
│   │   └── Scanner.js       Recursive directory scan with ID3 metadata
│   ├── cli/
│   │   ├── Dashboard.js     Orchestrates Player, Renderer, and Keybindings
│   │   ├── Renderer.js      blessed TUI — header, list, now-playing, help bar
│   │   └── Keybindings.js   Key-to-action dispatch table
│   ├── config/
│   │   └── Config.js        Read/write ~/.clibeats/config.json
│   └── utils/
│       └── format.js        Time, volume, and progress bar formatters
└── test/
    └── queue.test.js
```

---

## Architecture

Audio playback is handled by a dedicated worker process forked via `child_process.fork()`. The main process communicates with it exclusively through IPC messages — it never manages `afplay` or any POSIX signals directly.

```
Main process                          audioWorker.js
(AudioEngine)                         (child process)

     -- { type: 'play', track }  -->  spawns afplay
     -- { type: 'pause' }        -->  SIGSTOP  --> afplay
     -- { type: 'resume' }       -->  SIGCONT  --> afplay
     -- { type: 'seek', seconds} -->  kills + restarts afplay with -t offset
     <-- { type: 'tick', pos }   --  every second while playing
     <-- { type: 'end' }         --  track finished naturally
```

This isolation means audio crashes cannot bring down the TUI process, and the worker can be respawned transparently.

---

## Tech Stack

| Component       | Technology                          |
|-----------------|-------------------------------------|
| CLI parsing     | commander                           |
| Terminal UI     | blessed                             |
| Audio (macOS)   | afplay via IPC worker               |
| Audio (Linux)   | mpg123 via IPC worker               |
| Metadata        | music-metadata                      |
| Config storage  | JSON file at `~/.clibeats/`         |
| Testing         | Jest                                |

---

## License

MIT — [Mausam Kumar Dwivedi](https://github.com/mausam-005)
