#!/usr/bin/env bun
/**
 * Test CLI - Simple test version without plugins
 */

import { defineConfig, runCLI } from "../../../src/cli/index.js"
import { z } from "zod"

// Simple CLI configuration for testing
const testConfig = defineConfig({
  name: "tuix-test",
  version: "1.0.0-rc.2",
  description: "TUIX CLI Test",
  
  commands: {
    hello: {
      description: "Say hello",
      options: {
        name: {
          type: z.string().default("World"),
          description: "Name to greet"
        }
      },
      handler: async ({ name }: any) => {
        console.log(`Hello, ${name}! 🚀`)
      }
    },
    
    test: {
      description: "Test command",
      handler: async () => {
        console.log("✅ CLI test successful!")
      }
    }
  }
})

// Run the test CLI
if (import.meta.main) {
  runCLI(testConfig).catch((error: any) => {
    console.error("❌ CLI test failed:", error)
    process.exit(1)
  })
}