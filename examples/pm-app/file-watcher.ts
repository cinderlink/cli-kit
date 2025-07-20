#!/usr/bin/env bun
/**
 * Example file watcher that monitors a directory for changes
 * This simulates a development server or build watcher
 */

import { watch, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const watchDir = './watch-me'
let changeCount = 0

// Ensure watch directory exists
if (!existsSync(watchDir)) {
  mkdirSync(watchDir, { recursive: true })
  console.log(`[${new Date().toISOString()}] Created watch directory: ${watchDir}`)
}

console.log(`[${new Date().toISOString()}] File watcher started, monitoring: ${watchDir}`)

// Watch for file changes
const watcher = watch(watchDir, { recursive: true }, (eventType, filename) => {
  changeCount++
  if (filename) {
    console.log(`[${new Date().toISOString()}] [${changeCount}] File ${eventType}: ${filename}`)
    
    // Simulate some processing work
    setTimeout(() => {
      console.log(`[${new Date().toISOString()}] [${changeCount}] ✅ Processed change for ${filename}`)
    }, 500)
  } else {
    console.log(`[${new Date().toISOString()}] [${changeCount}] Directory ${eventType} detected`)
  }
})

// Periodically create test files to show activity
setInterval(() => {
  const testFile = join(watchDir, `test-${Date.now()}.txt`)
  Bun.write(testFile, `Test file created at ${new Date().toISOString()}`)
  
  // Clean up old test files
  setTimeout(async () => {
    try {
      await Bun.$`rm -f ${testFile}`.quiet()
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 10000)
}, 15000) // Every 15 seconds

// Handle graceful shutdown
function gracefulShutdown() {
  console.log(`[${new Date().toISOString()}] File watcher shutting down...`)
  watcher.close()
  console.log(`[${new Date().toISOString()}] 📊 Processed ${changeCount} file changes`)
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Keep the process alive
console.log(`[${new Date().toISOString()}] 👁️  Watching for file changes...`)