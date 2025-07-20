#!/usr/bin/env bun

/**
 * ProcessMonitor Component Demo
 * 
 * Demonstrates the ProcessMonitor component functionality
 * including real-time process monitoring, sorting, and system metrics.
 */

import { processMonitor, simpleProcessMonitor, detailedProcessMonitor } from "../packages/components/src/system"

// Simple usage
console.log("=== ProcessMonitor Component Demo ===\n")

// Create a simple process monitor
const simple = simpleProcessMonitor()
console.log("✓ Created simple ProcessMonitor:", simple.id)

// Create a detailed process monitor
const detailed = detailedProcessMonitor()
console.log("✓ Created detailed ProcessMonitor:", detailed.id)

// Create a custom process monitor
const custom = processMonitor({
  refreshInterval: 1500,
  sortBy: 'memory',
  showSystemMetrics: true,
  treeView: true,
  maxProcesses: 25,
  onProcessSelect: (pid) => {
    console.log(`Process selected: PID ${pid}`)
  },
  filterBy: (process) => process.cpu > 0.1 // Only show processes using CPU
})
console.log("✓ Created custom ProcessMonitor:", custom.id)

// Demonstrate the component interface
console.log("\n=== Component Interface ===")
console.log("Component ID:", custom.id)
console.log("Has init method:", typeof custom.init !== 'undefined')
console.log("Has update method:", typeof custom.update === 'function')
console.log("Has view method:", typeof custom.view === 'function')
console.log("Has subscriptions method:", typeof custom.subscriptions === 'function')

// Show component types
console.log("\n=== Component Configuration ===")
console.log("Simple monitor subscriptions:", simple.subscriptions().length)
console.log("Detailed monitor subscriptions:", detailed.subscriptions().length) 
console.log("Custom monitor subscriptions:", custom.subscriptions().length)

console.log("\n=== Demo Complete ===")
console.log("ProcessMonitor components created successfully!")
console.log("In a real application, these would be rendered using the TUIX runtime.")

export { simple, detailed, custom }