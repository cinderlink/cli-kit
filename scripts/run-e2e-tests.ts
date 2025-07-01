#!/usr/bin/env bun
/**
 * E2E Test Runner Script
 * 
 * Runs all E2E tests and generates a summary report
 */

import { Effect } from "effect"
import { execSync } from "child_process"
import { existsSync, mkdirSync, readdirSync } from "fs"
import { join } from "path"

const runTests = Effect.gen(function* (_) {
  console.log("🧪 Running E2E Tests for CLI-Kit Examples\n")
  
  // Create test directories
  const testDirs = [
    "__tests__/screenshots-basic-panel",
    "__tests__/screenshots-button-showcase", 
    "__tests__/screenshots-button-disabled",
    "__tests__/screenshots-contact-form",
    "__tests__/screenshots-layout-e2e",
    "__tests__/screenshots-layout-stress",
    "__tests__/screenshots-smoke",
    "__tests__/screenshots-ansi-verify",
    "__tests__/screenshots-memory-test",
    "__tests__/screenshots-theme"
  ]
  
  for (const dir of testDirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
  
  // Run tests
  const testFiles = [
    "__tests__/e2e/basic-panel.test.ts",
    "__tests__/e2e/button-showcase.test.ts",
    "__tests__/e2e/contact-form-simple.test.ts",
    "__tests__/e2e/layout-patterns.test.ts",
    "__tests__/e2e/all-examples.test.ts"
  ]
  
  let passed = 0
  let failed = 0
  
  for (const testFile of testFiles) {
    console.log(`\n📋 Running ${testFile}...`)
    
    try {
      execSync(`bun test ${testFile}`, { stdio: 'inherit' })
      passed++
      console.log(`✅ ${testFile} passed`)
    } catch (error) {
      failed++
      console.log(`❌ ${testFile} failed`)
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 E2E Test Summary")
  console.log("=".repeat(60))
  console.log(`Total test files: ${testFiles.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log("=".repeat(60))
  
  // List generated screenshots
  console.log("\n📸 Generated Screenshots:")
  for (const dir of testDirs) {
    if (existsSync(dir)) {
      const files = readdirSync(dir)
      if (files.length > 0) {
        console.log(`\n${dir}:`)
        files.forEach(file => console.log(`  - ${file}`))
      }
    }
  }
  
  if (failed > 0) {
    yield* _(Effect.fail(new Error(`${failed} tests failed`)))
  }
})

Effect.runPromise(runTests)
  .then(() => {
    console.log("\n✨ All E2E tests passed!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 E2E tests failed:", error.message)
    process.exit(1)
  })