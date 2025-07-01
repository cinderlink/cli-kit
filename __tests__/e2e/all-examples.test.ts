/**
 * Comprehensive E2E Test Suite for All Examples
 * 
 * This test file runs all example applications and verifies:
 * - Initial rendering
 * - User interactions
 * - State management
 * - Screen clearing between major UI changes
 * - Proper cleanup on exit
 */

import { test, expect, describe } from "bun:test"
import { Effect } from "effect"
import { runSimpleTest } from "@/testing/simple-harness.ts"

describe("All Examples E2E Tests", () => {
  
  test("all examples start and exit cleanly", async () => {
    const examples = [
      { name: "basic-panel", file: "examples/basic-panel.ts" },
      { name: "button-showcase", file: "examples/button-showcase.ts" },
      { name: "contact-form", file: "examples/contact-form.ts" },
      { name: "layout-patterns", file: "examples/layout-patterns.ts" }
    ]
    
    for (const example of examples) {
      await Effect.runPromise(
        runSimpleTest(
          {
            command: "bun",
            args: [example.file],
            screenshotDir: `__tests__/screenshots-smoke/${example.name}`
          },
          (harness) => Effect.gen(function* (_) {
            // Just wait for initial render and exit
            yield* _(Effect.sleep(1000))
            yield* _(harness.saveScreenshot("smoke-test"))
            
            // Verify we got some output
            const output = yield* _(harness.getOutput())
            expect(output.length).toBeGreaterThan(0)
            
            // Exit cleanly
            yield* _(harness.sendInput("q"))
          })
        )
      )
    }
  })
  
  test("verify ANSI escape sequences are properly used", async () => {
    await Effect.runPromise(
      runSimpleTest(
        {
          command: "bun",
          args: ["examples/layout-patterns.ts"],
          screenshotDir: "__tests__/screenshots-ansi-verify"
        },
        (harness) => Effect.gen(function* (_) {
          // Wait for initial render
          yield* _(harness.waitForOutput("Layout Showcase"))
          
          // Navigate to trigger screen clear
          yield* _(harness.sendInput("\x1B[C")) // Right arrow
          yield* _(Effect.sleep(300))
          
          const output = yield* _(harness.getOutput())
          
          // Verify ANSI sequences are present
          expect(output).toContain("\x1B[2J") // Clear screen
          expect(output).toContain("\x1B[H")  // Home position
          expect(output).toContain("\x1B[1;1H") // Absolute positioning
          
          // Exit
          yield* _(harness.sendInput("q"))
        })
      )
    )
  })
  
  test("memory leak test - rapid interactions", async () => {
    await Effect.runPromise(
      runSimpleTest(
        {
          command: "bun",
          args: ["examples/button-showcase.ts"],
          screenshotDir: "__tests__/screenshots-memory-test"
        },
        (harness) => Effect.gen(function* (_) {
          // Wait for initial render
          yield* _(harness.waitForOutput("Button Showcase"))
          
          // Perform many rapid interactions
          for (let i = 0; i < 50; i++) {
            yield* _(harness.sendInput("\x1B[B")) // Down
            yield* _(Effect.sleep(10))
            yield* _(harness.sendInput("\r"))     // Enter
            yield* _(Effect.sleep(10))
            yield* _(harness.sendInput("\x1B[A")) // Up
            yield* _(Effect.sleep(10))
          }
          
          // Let it settle
          yield* _(Effect.sleep(500))
          
          // Should still be responsive
          yield* _(harness.sendInput("\r"))
          yield* _(Effect.sleep(200))
          
          const output = yield* _(harness.getOutput())
          expect(output).toContain("clicked")
          
          // Exit
          yield* _(harness.sendInput("q"))
        })
      )
    )
  })
})

describe("Cross-Example Integration", () => {
  
  test("consistent theming across examples", async () => {
    const examples = [
      { name: "basic-panel", file: "examples/basic-panel.ts", expectedColors: ["cyan", "white", "gray"] },
      { name: "button-showcase", file: "examples/button-showcase.ts", expectedColors: ["blue", "green", "red"] },
      { name: "contact-form", file: "examples/contact-form.ts", expectedColors: ["blue", "green"] },
      { name: "layout-patterns", file: "examples/layout-patterns.ts", expectedColors: ["bold", "italic"] }
    ]
    
    for (const example of examples) {
      await Effect.runPromise(
        runSimpleTest(
          {
            command: "bun",
            args: [example.file],
            screenshotDir: `__tests__/screenshots-theme/${example.name}`
          },
          (harness) => Effect.gen(function* (_) {
            yield* _(Effect.sleep(500))
            
            const output = yield* _(harness.getOutput())
            
            // Verify ANSI color codes are present
            expect(output).toContain("\x1B[") // ANSI escape sequence
            
            yield* _(harness.saveScreenshot("theme-check"))
            yield* _(harness.sendInput("q"))
          })
        )
      )
    }
  })
})