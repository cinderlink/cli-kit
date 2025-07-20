#!/usr/bin/env bun
/**
 * Example worker process that logs random messages
 * This simulates a background service that does work periodically
 */

const messages = [
  "Processing batch job #1234",
  "Cleaning up temporary files",
  "Checking system health",
  "Syncing data with remote server",
  "Analyzing user metrics",
  "Performing maintenance tasks",
  "Updating cache entries",
  "Validating data integrity"
]

let messageCount = 0

function getRandomMessage(): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

function getRandomDelay(): number {
  return Math.floor(Math.random() * 3000) + 2000 // 2-5 seconds
}

async function workerLoop() {
  console.log(`[${new Date().toISOString()}] Worker logger started`)
  
  while (true) {
    messageCount++
    const message = getRandomMessage()
    console.log(`[${new Date().toISOString()}] [${messageCount}] ${message}`)
    
    // Random delay between messages
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
    
    // Occasionally simulate a "busy" period
    if (messageCount % 10 === 0) {
      console.log(`[${new Date().toISOString()}] [${messageCount}] 📊 Processed ${messageCount} tasks so far`)
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Worker logger shutting down gracefully`)
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Worker logger interrupted`)
  process.exit(0)
})

// Start the worker
workerLoop().catch(error => {
  console.error(`[${new Date().toISOString()}] Worker logger error:`, error)
  process.exit(1)
})