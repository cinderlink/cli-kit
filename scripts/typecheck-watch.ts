#!/usr/bin/env bun

import { spawn } from 'child_process';
import { watch } from 'fs';

console.log('Starting TypeScript watcher...');

let isRunning = false;

async function runTypecheck() {
  if (isRunning) {
    console.log('Typecheck already running, skipping...');
    return;
  }

  isRunning = true;
  console.log('\n[' + new Date().toISOString() + '] Running typecheck...');

  const tsc = spawn('bun', ['run', 'typecheck'], {
    stdio: 'inherit',
    shell: true
  });

  tsc.on('close', (code) => {
    isRunning = false;
    if (code === 0) {
      console.log('✓ Typecheck passed');
    } else {
      console.log('✗ Typecheck failed with code', code);
    }
  });

  tsc.on('error', (err) => {
    isRunning = false;
    console.error('Failed to start typecheck:', err);
  });
}

// Run once on start
runTypecheck();

// Set up file watchers
const watchDirs = ['src', 'bin', '__tests__'];
const watchers = watchDirs.map(dir => {
  console.log(`Watching ${dir}...`);
  return watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
      console.log(`File changed: ${filename}`);
      runTypecheck();
    }
  });
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nShutting down typecheck watcher...');
  watchers.forEach(w => w.close());
  process.exit(0);
});