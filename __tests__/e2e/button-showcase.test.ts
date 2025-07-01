/**
 * E2E Test for Button Showcase Example
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { runSimpleTest } from "@/testing/simple-harness.ts"

test("button showcase - navigation and selection", async () => {
  await Effect.runPromise(
    runSimpleTest(
      {
        command: "bun",
        args: ["examples/button-showcase.ts"],
        screenshotDir: "__tests__/screenshots-button-showcase"
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for initial render
        yield* _(harness.waitForOutput("Button Showcase"))
        yield* _(harness.saveScreenshot("01-initial"))
        
        // Verify initial state - first button should be focused
        yield* _(harness.waitForOutput("Primary Button"))
        
        // Navigate down with arrow key
        yield* _(harness.sendInput("\x1B[B")) // Down arrow
        yield* _(Effect.sleep(200))
        yield* _(harness.saveScreenshot("02-focus-secondary"))
        
        // Navigate down again
        yield* _(harness.sendInput("\x1B[B")) // Down arrow
        yield* _(Effect.sleep(200))
        yield* _(harness.saveScreenshot("03-focus-danger"))
        
        // Navigate down to Success button
        yield* _(harness.sendInput("\x1B[B")) // Down arrow
        yield* _(Effect.sleep(200))
        yield* _(harness.saveScreenshot("04-focus-success"))
        
        // Press Enter to select Success button
        yield* _(harness.sendInput("\r"))
        yield* _(Effect.sleep(200))
        yield* _(harness.waitForOutput("Success Button clicked"))
        yield* _(harness.saveScreenshot("05-success-clicked"))
        
        // Navigate back up
        yield* _(harness.sendInput("\x1B[A")) // Up arrow
        yield* _(Effect.sleep(200))
        yield* _(harness.saveScreenshot("06-navigate-up"))
        
        // Test Tab navigation
        yield* _(harness.sendInput("\t"))
        yield* _(Effect.sleep(200))
        yield* _(harness.saveScreenshot("07-tab-navigation"))
        
        // Verify button states
        const output = yield* _(harness.getOutput())
        expect(output).toContain("Primary Button")
        expect(output).toContain("Secondary Button")
        expect(output).toContain("Danger Button")
        expect(output).toContain("Success Button")
        expect(output).toContain("Click counter:")
        
        // Exit
        yield* _(harness.sendInput("q"))
      })
    )
  )
})

test("button showcase - disabled button handling", async () => {
  await Effect.runPromise(
    runSimpleTest(
      {
        command: "bun",
        args: ["examples/button-showcase.ts"],
        screenshotDir: "__tests__/screenshots-button-disabled"
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for initial render
        yield* _(harness.waitForOutput("Button Showcase"))
        
        // Navigate to disabled button (it's the 5th button)
        for (let i = 0; i < 4; i++) {
          yield* _(harness.sendInput("\x1B[B")) // Down arrow
          yield* _(Effect.sleep(100))
        }
        
        yield* _(harness.saveScreenshot("01-disabled-focused"))
        
        // Try to click disabled button
        yield* _(harness.sendInput("\r"))
        yield* _(Effect.sleep(200))
        
        // Verify no click was registered (counter should still be 0)
        const output = yield* _(harness.getOutput())
        expect(output).toContain("Click counter: 0")
        
        // Exit
        yield* _(harness.sendInput("q"))
      })
    )
  )
})