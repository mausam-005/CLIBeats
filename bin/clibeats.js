#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const path = require('path');
const Config = require('../src/config/Config');

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner() {
  console.log(
    chalk.cyan(
      figlet.textSync('CLIBeats', { font: 'Slant', horizontalLayout: 'default' })
    )
  );
  console.log(chalk.gray('  A terminal music player\n'));
}

// ─── CLI Definition ───────────────────────────────────────────────────────────
program
  .name('clibeats')
  .description('A terminal music player built with Node.js')
  .version('1.0.0');

// Default: open interactive TUI
program
  .command('tui', { isDefault: true })
  .description('Launch interactive terminal TUI (default)')
  .option('-f, --folder <path>', 'Music folder to load', '.')
  .action(async (opts) => {
    showBanner();
    const { Dashboard } = require('../src/cli/Dashboard');
    const scanner = require('../src/core/Scanner');

    // Auto-load last folder when -f is not explicitly provided
    const cfg = Config.load();
    const folderArg = opts.folder;
    const isDefault = folderArg === '.';
    const targetFolder = (isDefault && cfg.lastFolder)
      ? cfg.lastFolder
      : path.resolve(folderArg);

    const tracks = await scanner.scan(targetFolder);
    if (tracks.length === 0) {
      console.log(chalk.yellow('\u26a0  No audio files found in: ') + targetFolder);
      console.log(chalk.gray('   Supported: .mp3 .wav .ogg .flac .m4a\n'));
      process.exit(0);
    }
    const dashboard = new Dashboard(tracks, targetFolder);
    dashboard.start();
  });

// Play a file or folder directly
program
  .command('play [target]')
  .description('Play a file or all audio files in a folder')
  .action(async (target = '.') => {
    showBanner();
    const { Dashboard } = require('../src/cli/Dashboard');
    const scanner = require('../src/core/Scanner');
    const absTarget = path.resolve(target);
    const tracks = await scanner.scan(absTarget);
    if (tracks.length === 0) {
      console.log(chalk.yellow('\u26a0  No audio files found in: ') + target);
      process.exit(0);
    }
    const dashboard = new Dashboard(tracks, absTarget);
    dashboard.start();
  });

// List tracks in a folder
program
  .command('list [folder]')
  .description('List all audio files in a folder')
  .action(async (folder = '.') => {
    const scanner = require('../src/core/Scanner');
    const tracks = await scanner.scan(path.resolve(folder));
    if (tracks.length === 0) {
      console.log(chalk.yellow('No audio files found.'));
      return;
    }
    console.log(chalk.cyan(`\n  Found ${tracks.length} tracks:\n`));
    tracks.forEach((t, i) => {
      const num = chalk.gray(`${String(i + 1).padStart(3)}.`);
      const name = chalk.white(t.title || t.filename);
      const artist = chalk.gray(t.artist ? `— ${t.artist}` : '');
      const dur = chalk.cyan(t.durationStr || '');
      console.log(`  ${num} ${name} ${artist}  ${dur}`);
    });
    console.log();
  });

program.parse(process.argv);
