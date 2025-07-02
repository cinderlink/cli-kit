#!/usr/bin/env bun

/**
 * Test Examples Script
 * 
 * Quickly tests that all examples start up correctly
 */

import { $ } from "bun"

const examples = [
  { name: "Git Dashboard", script: "examples/git-dashboard.ts" },
  { name: "Process Monitor", script: "examples/process-monitor.ts" },
  { name: "Log Viewer", script: "examples/log-viewer.ts" },
  { name: "Package Manager", script: "examples/package-manager.ts" },
  { name: "Contact Form", script: "examples/contact-form.ts" },
  { name: "Layout Patterns", script: "examples/layout-patterns.ts" },
  { name: "Table Showcase", script: "examples/table-showcase.ts" },
  { name: "Tabs Showcase", script: "examples/tabs-showcase.ts" },
  { name: "Mouse Demo", script: "examples/mouse-demo.ts" }
]

console.log("🧪 Testing CLI-Kit Examples")
console.log("=" .repeat(50))
console.log("Running each example for 3 seconds to verify startup...")
console.log("")

let passed = 0
let failed = 0

for (const example of examples) {
  process.stdout.write(`Testing ${example.name}... `)
  
  try {
    const result = await $`timeout 3s bun ${example.script}`.nothrow().quiet()
    
    // timeout command returns 124 when it times out, which is expected
    // 0 means the app exited cleanly
    if (result.exitCode === 124 || result.exitCode === 0) {
      console.log("✅ PASS")
      passed++
    } else {
      console.log("❌ FAIL")
      console.log(`   Exit code: ${result.exitCode}`)
      if (result.stderr) {
        console.log(`   Error: ${result.stderr}`)
      }
      failed++
    }
  } catch (error) {
    console.log("❌ ERROR")
    console.log(`   ${error.message}`)
    failed++
  }
}

console.log("")
console.log("=" .repeat(50))
console.log(`📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log("❌ Some examples failed to start properly")
  process.exit(1)
} else {
  console.log("✅ All examples started successfully!")
  process.exit(0)
}