#!/usr/bin/env bun

import { spawn } from 'child_process';
import { watch } from 'fs';

console.log('Starting coverage watcher...');

let isRunning = false;
let runQueued = false;

async function runCoverage() {
  if (isRunning) {
    console.log('Coverage already running, queueing next run...');
    runQueued = true;
    return;
  }

  isRunning = true;
  console.log('\n[' + new Date().toISOString() + '] Running coverage tests...');

  const coverage = spawn('bun', ['test', '--coverage'], {
    stdio: 'inherit',
    shell: true
  });

  coverage.on('close', (code) => {
    isRunning = false;
    if (code === 0) {
      console.log('✓ All tests passed');
    } else {
      console.log('✗ Tests failed with code', code);
    }

    // Run again if queued
    if (runQueued) {
      runQueued = false;
      setTimeout(runCoverage, 1000);
    }
  });

  coverage.on('error', (err) => {
    isRunning = false;
    console.error('Failed to start coverage:', err);
  });
}

// Run once on start
runCoverage();

// Set up file watchers
const watchDirs = ['src', '__tests__'];
const watchers = watchDirs.map(dir => {
  console.log(`Watching ${dir}...`);
  return watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.test.ts'))) {
      console.log(`File changed: ${filename}`);
      runCoverage();
    }
  });
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nShutting down coverage watcher...');
  watchers.forEach(w => w.close());
  process.exit(0);
});