/**
 * E2E Test Runner
 * 
 * Runs all e2e tests and provides a summary report
 */

import { $ } from "bun"

async function runE2ETests() {
  console.log("🧪 Running CLI-Kit E2E Tests\n")
  
  const testFiles = [
    "tests/e2e/git-dashboard.test.ts",
    "tests/e2e/process-monitor.test.ts", 
    "tests/e2e/log-viewer.test.ts",
    "tests/e2e/package-manager.test.ts"
  ]
  
  const results = []
  
  for (const testFile of testFiles) {
    console.log(`\n📋 Running ${testFile}...`)
    
    try {
      const result = await $`bun test ${testFile}`.quiet()
      const passed = result.exitCode === 0
      
      results.push({
        file: testFile,
        passed,
        output: result.stdout || result.stderr
      })
      
      if (passed) {
        console.log(`✅ ${testFile} - PASSED`)
      } else {
        console.log(`❌ ${testFile} - FAILED`)
        console.log(result.stderr)
      }
    } catch (error) {
      results.push({
        file: testFile,
        passed: false,
        output: error.message
      })
      console.log(`❌ ${testFile} - ERROR: ${error.message}`)
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 Test Summary")
  console.log("=".repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📁 Total:  ${results.length}`)
  
  if (failed > 0) {
    console.log("\n🔍 Failed Tests:")
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  • ${result.file}`)
    })
  }
  
  console.log("\n" + "=".repeat(60))
  
  return failed === 0
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const success = await runE2ETests()
  process.exit(success ? 0 : 1)
}