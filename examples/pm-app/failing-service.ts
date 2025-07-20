#!/usr/bin/env bun
/**
 * Example service that fails to start
 * This demonstrates error handling and retry logic
 */

console.log(`[${new Date().toISOString()}] Failing service attempting to start...`)

// Simulate some startup work
await new Promise(resolve => setTimeout(resolve, 1000))

console.error(`[${new Date().toISOString()}] ❌ CRITICAL ERROR: Failed to connect to database`)
console.error(`[${new Date().toISOString()}] ❌ ERROR: Connection refused on port 5432`)
console.error(`[${new Date().toISOString()}] ❌ Service cannot start without database connection`)

// Exit with error code
process.exit(1)