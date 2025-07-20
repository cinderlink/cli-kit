#!/usr/bin/env bun

/**
 * Bun-Native Process Manager Demo
 * 
 * Showcases the new Bun-first process manager with Effect.ts integration
 */

import { Effect } from 'effect'
import { BunProcessWrapper } from '../src/process-manager/bun-wrapper'
import { createBunDevelopmentLogger, BunLogger } from '../src/logger/bun-logger'
import type { ProcessConfig } from '../src/process-manager/types'

// Demo process configurations
const demoProcesses: ProcessConfig[] = [
  {
    name: 'web-server',
    command: 'bun',
    args: ['--serve', '--port', '3000'],
    cwd: process.cwd(),
    autostart: true,
    autorestart: true,
    maxRestarts: 3,
    healthCheck: {
      type: 'http',
      url: 'http://localhost:3000/health',
      interval: 5000,
      startupDelay: 2000
    }
  },
  {
    name: 'file-watcher',
    command: 'bun',
    args: ['--watch', 'src/**/*.ts'],
    cwd: process.cwd(),
    autostart: true,
    autorestart: false,
    healthCheck: {
      type: 'output',
      outputPattern: 'Watching for changes',
      interval: 10000,
      startupDelay: 1000
    }
  },
  {
    name: 'test-runner',
    command: 'bun',
    args: ['test', '--watch'],
    cwd: process.cwd(),
    autostart: false,
    autorestart: true,
    maxRestarts: 5
  }
]

// Main demo effect
const demoEffect = Effect.gen(function* (_) {
  console.log('🚀 Starting Bun-Native Process Manager Demo\n')
  
  // Create logger
  const logger = yield* _(BunLogger)
  yield* _(logger.info('Demo started', { timestamp: new Date() }))
  
  // Create process wrappers
  const wrappers = demoProcesses.map(config => 
    new BunProcessWrapper(config, '.demo-tuix')
  )
  
  console.log('📦 Created process wrappers:')
  for (const config of demoProcesses) {
    console.log(`   • ${config.name} (${config.command} ${config.args?.join(' ') || ''})`)
  }
  console.log()
  
  // Initialize all wrappers in parallel
  console.log('🔧 Initializing process wrappers...')
  yield* _(Effect.all(
    wrappers.map(wrapper => wrapper.init()),
    { concurrency: 'unbounded' }
  ))
  
  yield* _(logger.info('All wrappers initialized'))
  console.log('✅ All process wrappers initialized\n')
  
  // Start autostart processes
  console.log('🏃 Starting autostart processes...')
  const autostartWrappers = wrappers.filter((_, i) => demoProcesses[i].autostart)
  
  for (const wrapper of autostartWrappers) {
    try {
      yield* _(wrapper.start())
      const config = demoProcesses[wrappers.indexOf(wrapper)]
      console.log(`   ✅ Started ${config.name}`)
    } catch (error) {
      const config = demoProcesses[wrappers.indexOf(wrapper)]
      console.log(`   ❌ Failed to start ${config.name}: ${error}`)
    }
  }
  
  console.log('\n📊 Process Status:')
  for (let i = 0; i < wrappers.length; i++) {
    const wrapper = wrappers[i]
    const config = demoProcesses[i]
    const status = yield* _(wrapper.getStatus())
    
    const statusIcon = status.status === 'running' ? '🟢' : 
                      status.status === 'stopped' ? '🔵' : 
                      status.status === 'errored' ? '🔴' : '🟡'
    
    console.log(`   ${statusIcon} ${config.name}: ${status.status}${status.pid ? ` (PID: ${status.pid})` : ''}`)
  }
  
  console.log('\n⏱️  Running demo for 30 seconds...')
  console.log('    Watch .demo-tuix/logs/ for process output')
  console.log('    Health checks will run automatically')
  
  // Let demo run for 30 seconds
  yield* _(Effect.sleep(30000))
  
  // Stop all processes
  console.log('\n🛑 Stopping all processes...')
  yield* _(Effect.all(
    wrappers.map(wrapper => wrapper.stop()),
    { concurrency: 'unbounded' }
  ))
  
  yield* _(logger.info('Demo completed'))
  console.log('✅ Demo completed successfully!')
  
  // Cleanup
  yield* _(Effect.promise(() => Bun.$`rm -rf .demo-tuix`.quiet()))
})

// Run the demo with logger layer
async function runDemo() {
  const loggerLayer = createBunDevelopmentLogger('demo', 'debug')
  
  try {
    await Effect.runPromise(Effect.provide(demoEffect, loggerLayer))
  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Simple web server for health check demo
const createDemoServer = () => {
  return Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url)
      
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response('Bun Process Manager Demo Server', {
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  })
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2]
  
  if (command === 'server') {
    console.log('🌐 Starting demo web server on port 3000...')
    createDemoServer()
    console.log('📡 Health endpoint: http://localhost:3000/health')
  } else {
    runDemo()
  }
}