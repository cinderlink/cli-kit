#!/usr/bin/env bun
/**
 * Demo script to show process manager functionality
 * This loads processes from processes.json and starts them
 */

import { ProcessManager } from '../../src/process-manager/manager'
import { join } from 'path'

async function runDemo() {
  console.log('🎬 Process Manager Demo')
  console.log('=' .repeat(50))
  
  const demoDir = join(import.meta.dir, '.tuix')
  const manager = new ProcessManager({ tuixDir: demoDir })
  
  try {
    await manager.init()
    
    // Load processes from config
    const config = await Bun.file(join(import.meta.dir, 'processes.json')).json()
    
    console.log('\n📋 Adding processes from configuration...')
    for (const processConfig of config.processes) {
      await manager.add({
        ...processConfig,
        cwd: import.meta.dir // Run in the demo directory
      })
      console.log(`✓ Added: ${processConfig.name}`)
    }
    
    console.log('\n🚀 Starting all processes...')
    const result = await manager.startAll()
    
    if (result.success) {
      console.log('\n✅ All processes started successfully!')
      console.log('📊 Process statuses:')
      
      // Show status of each process
      for (const processConfig of config.processes) {
        const status = manager.status(processConfig.name)
        console.log(`   ${processConfig.name}: ${status?.status} (PID: ${status?.pid || 'N/A'})`)
      }
      
      console.log('\n📋 Logs will be written to:', join(demoDir, 'logs'))
      console.log('⏰ Let processes run for 10 seconds...')
      
      // Let processes run for a bit
      await new Promise(resolve => setTimeout(resolve, 10000))
      
    } else {
      console.log('\n❌ Some processes failed to start:')
      result.failures.forEach(failure => console.log(`   ${failure}`))
    }
    
    console.log('\n🛑 Stopping all processes...')
    await manager.stopAll()
    
    console.log('\n🎉 Demo completed!')
    
  } catch (error) {
    console.error('\n💥 Demo failed:', error)
    process.exit(1)
  } finally {
    await manager.shutdown()
  }
}

if (import.meta.main) {
  runDemo()
}