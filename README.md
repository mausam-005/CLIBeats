# 🎵 CLIBeats

A dual-mode music player built with **Node.js** and **Electron** — run it in your terminal or launch a beautiful desktop GUI.

![CLIBeats Banner](assets/banner.png)

---

## ✨ Features

- 🖥️ **CLI Mode** — Full-featured terminal TUI using `blessed`
- 🪟 **GUI Mode** — Electron desktop app with React + Vite
- ⏯ Play, Pause, Stop, Next, Previous
- 🔊 Volume control
- 🔀 Shuffle & 🔁 Repeat modes
- 📋 Playlist & folder scanning
- 🎵 ID3 tag reading (title, artist, album, duration)
- 📊 Audio visualizer (GUI mode)
- ⌨️ Full keyboard shortcuts in both modes

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install

```bash
git clone https://github.com/mausam-005/CLIBeats.git
cd CLIBeats
npm install
cd renderer && npm install && cd ..
```

### Run CLI Mode

```bash
npm run start:cli
# or
node bin/clibeats.js play ./music/
```

### Run GUI (Electron) Mode

```bash
npm run dev
# or
node bin/clibeats.js gui
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `n` | Next track |
| `p` | Previous track |
| `→` / `l` | Seek forward 5s |
| `←` / `h` | Seek backward 5s |
| `+` / `=` | Volume up |
| `-` | Volume down |
| `s` | Toggle shuffle |
| `r` | Toggle repeat |
| `q` | Quit |

---

## 📁 Project Structure

```
CLIBeats/
├── bin/            # CLI entry point
├── src/
│   ├── core/       # Shared: Player, Queue, Scanner, Metadata
│   ├── cli/        # CLI TUI (blessed)
│   ├── electron/   # Electron main + IPC
│   └── config/     # User config
├── renderer/       # React + Vite frontend
├── assets/         # Icons, images
└── test/           # Jest tests
```

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| CLI UI | `blessed`, `chalk`, `figlet` |
| Audio (CLI) | `play-sound` |
| Desktop shell | `electron` |
| Frontend | `react` + `vite` |
| Audio (GUI) | Web Audio API |
| Metadata | `music-metadata` |
| Args | `commander` |
| Tests | `jest` |

---

## 📄 License

MIT © [mausam-005](https://github.com/mausam-005)
