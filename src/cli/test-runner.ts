#!/usr/bin/env bun

/**
 * CLI-Kit Test Runner
 * 
 * A wrapper that can instrument any CLI-Kit application for testing
 * 
 * Usage:
 *   cli-kit-test run ./my-app.ts --record
 *   cli-kit-test replay ./session.json
 *   cli-kit-test screenshot ./my-app.ts --at 5s
 */

import { Effect, Option, Array as A } from "effect"
import { Command } from "commander"
import { createTestHarness, type KeySequence } from "@/testing/e2e-harness.ts"
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

// =============================================================================
// Types
// =============================================================================

interface RecordedSession {
  command: string
  args: string[]
  events: Array<{
    timestamp: number
    type: "key" | "screenshot" | "wait"
    data: any
  }>
  screenshots: string[]
}

// =============================================================================
// Commands
// =============================================================================

const program = new Command()
  .name("cli-kit-test")
  .description("CLI-Kit test runner and recorder")
  .version("1.0.0")

// Run command - interactive mode with optional recording
program
  .command("run <app>")
  .description("Run an app with test instrumentation")
  .option("-r, --record", "Record the session")
  .option("-s, --screenshots", "Take periodic screenshots")
  .option("--interval <ms>", "Screenshot interval", "1000")
  .option("-o, --output <dir>", "Output directory", "./test-output")
  .action(async (app: string, options) => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Create output directory
        mkdirSync(options.output, { recursive: true })
        
        const harness = createTestHarness({
          command: "bun",
          args: [app],
          screenshotDir: options.output,
          recordSession: options.record
        })
        
        yield* _(harness.start())
        
        console.log("🎮 Test runner started. Press Ctrl+C to stop.")
        console.log("📸 Screenshots will be saved to:", options.output)
        
        if (options.screenshots) {
          // Take periodic screenshots
          const interval = parseInt(options.interval)
          let count = 0
          
          const timer = setInterval(async () => {
            const name = `auto-screenshot-${count++}.txt`
            await Effect.runPromise(harness.screenshot(name))
            console.log(`📸 Screenshot saved: ${name}`)
          }, interval)
          
          process.on("SIGINT", () => {
            clearInterval(timer)
            Effect.runPromise(harness.stop()).then(() => {
              console.log("\n✅ Test session ended")
              process.exit(0)
            })
          })
        }
        
        // Keep running until interrupted
        yield* _(Effect.never)
      })
    )
  })

// Replay command - replay a recorded session
program
  .command("replay <session>")
  .description("Replay a recorded session")
  .option("--speed <factor>", "Playback speed factor", "1")
  .action(async (sessionFile: string, options) => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const session: RecordedSession = JSON.parse(
          readFileSync(sessionFile, "utf-8")
        )
        
        const harness = createTestHarness({
          command: session.command,
          args: session.args
        })
        
        yield* _(harness.start())
        
        const speed = parseFloat(options.speed)
        
        console.log("🔄 Replaying session...")
        
        for (const event of session.events) {
          switch (event.type) {
            case "key":
              console.log(`⌨️  Key: ${event.data.key}`)
              yield* _(harness.sendKey(event.data.key))
              break
              
            case "screenshot":
              const path = yield* _(harness.screenshot(event.data.name))
              console.log(`📸 Screenshot: ${path}`)
              break
              
            case "wait":
              const delay = event.data.ms / speed
              console.log(`⏰ Wait: ${delay}ms`)
              yield* _(Effect.sleep(delay))
              break
          }
        }
        
        yield* _(harness.stop())
        console.log("✅ Replay complete")
      })
    )
  })

// Screenshot command - take a screenshot at a specific time
program
  .command("screenshot <app>")
  .description("Take a screenshot at a specific time")
  .option("-t, --at <time>", "Time to take screenshot (e.g. 5s, 500ms)", "1s")
  .option("-o, --output <file>", "Output filename", "screenshot.txt")
  .action(async (app: string, options) => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const harness = createTestHarness({
          command: "bun",
          args: [app]
        })
        
        yield* _(harness.start())
        
        // Parse time
        const timeStr = options.at
        const ms = timeStr.endsWith("s")
          ? parseFloat(timeStr.slice(0, -1)) * 1000
          : parseFloat(timeStr.slice(0, -2))
        
        console.log(`⏰ Waiting ${ms}ms before screenshot...`)
        yield* _(Effect.sleep(ms))
        
        const path = yield* _(harness.screenshot(options.output))
        console.log(`📸 Screenshot saved: ${path}`)
        
        yield* _(harness.stop())
      })
    )
  })

// Interactive test command
program
  .command("test <app> <script>")
  .description("Run a test script against an app")
  .action(async (app: string, scriptFile: string) => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const script = JSON.parse(readFileSync(scriptFile, "utf-8"))
        
        const harness = createTestHarness({
          command: "bun",
          args: [app]
        })
        
        yield* _(harness.start())
        
        for (const step of script.steps) {
          console.log(`▶️  ${step.description}`)
          
          switch (step.action) {
            case "key":
              yield* _(harness.sendKey(step.key))
              break
              
            case "keys":
              yield* _(harness.sendKeys(step.keys))
              break
              
            case "wait":
              yield* _(Effect.sleep(step.ms))
              break
              
            case "waitForText":
              yield* _(harness.waitForText(step.text, step.timeout))
              break
              
            case "screenshot":
              yield* _(harness.screenshot(step.name))
              break
              
            case "assert":
              const output = yield* _(harness.getOutput())
              if (step.contains && !output.includes(step.contains)) {
                throw new Error(`Assertion failed: expected to contain "${step.contains}"`)
              }
              if (step.notContains && output.includes(step.notContains)) {
                throw new Error(`Assertion failed: expected not to contain "${step.notContains}"`)
              }
              break
          }
          
          if (step.delay) {
            yield* _(Effect.sleep(step.delay))
          }
        }
        
        yield* _(harness.stop())
        console.log("✅ Test passed!")
      })
    )
  })

// Parse arguments
program.parse(process.argv)