/**
 * Test IPC communication with managed processes
 */

import { BunNativeProcessManager } from './src/process-manager/bun-native-manager'
import { writeFileSync } from 'fs'

// Create a test script that uses IPC
const testScript = `
// Test managed process with IPC
console.log('🚀 Managed process starting...')

// Handle IPC messages from manager
process.on('message', (message) => {
  console.log('📨 Received IPC message:', message)
  
  switch (message.type) {
    case 'ping':
      console.log('🏓 Received ping, sending pong...')
      process.send?.({ type: 'pong', from: process.env.TUIX_PROCESS_NAME })
      break
      
    case 'shutdown':
      console.log('🛑 Received shutdown signal, cleaning up...')
      process.exit(0)
      break
  }
})

// Report status periodically
setInterval(() => {
  if (process.send) {
    process.send({
      type: 'status',
      from: process.env.TUIX_PROCESS_NAME,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    })
  }
}, 5000)

console.log('✅ Managed process ready for IPC')

// Keep process alive
setInterval(() => {
  console.log('💗 Heartbeat from', process.env.TUIX_PROCESS_NAME)
}, 3000)
`

writeFileSync('/tmp/test-ipc-process.js', testScript)

async function test() {
  console.log('🧪 Testing IPC communication...')
  
  const pm = new BunNativeProcessManager()
  
  // Add a process that supports IPC
  await pm.add({
    name: 'test-ipc',
    command: 'bun',
    args: ['/tmp/test-ipc-process.js'],
    cwd: process.cwd(),
    env: process.env,
    autostart: true
  })
  
  console.log('📊 Initial status:', pm.status())
  
  // Wait for process to start
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  console.log('📊 Running status:', pm.status())
  
  // Wait for status reports
  console.log('⏳ Waiting for status reports...')
  await new Promise(resolve => setTimeout(resolve, 8000))
  
  // Stop process
  console.log('🛑 Stopping process...')
  await pm.stop('test-ipc')
  
  console.log('📊 Final status:', pm.status())
  
  // Shutdown
  await pm.shutdown()
  console.log('✅ Test complete')
}

test().catch(console.error)