/**
 * Test the native Bun IPC approach
 */

import { BunNativeProcessManager } from './src/process-manager/bun-native-manager'

async function test() {
  console.log('🚀 Testing native Bun process manager...')
  
  const pm = new BunNativeProcessManager()
  
  // Add a simple process
  await pm.add({
    name: 'test-echo',
    command: 'bun',
    args: ['-e', 'console.log("Hello from managed process"); setInterval(() => console.log("Heartbeat"), 2000)'],
    cwd: process.cwd(),
    env: process.env,
    autostart: true
  })
  
  // Check status
  console.log('📊 Initial status:', pm.status())
  
  // Wait a bit to see process running
  console.log('⏳ Waiting 5 seconds...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Check status again
  console.log('📊 Running status:', pm.status())
  
  // Stop
  console.log('🛑 Stopping process...')
  await pm.stop('test-echo')
  
  console.log('📊 Final status:', pm.status())
  
  // Shutdown
  await pm.shutdown()
  console.log('✅ Test complete')
}

test().catch(console.error)