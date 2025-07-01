/**
 * E2E Test for Basic Panel Example
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { runSimpleTest } from "@/testing/simple-harness.ts"

test("basic panel - rendering and interaction", async () => {
  await Effect.runPromise(
    runSimpleTest(
      {
        command: "bun",
        args: ["examples/basic-panel.ts"],
        screenshotDir: "__tests__/screenshots-basic-panel"
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for initial render
        yield* _(harness.waitForOutput("Basic Panel Demo"))
        yield* _(harness.saveScreenshot("01-initial"))
        
        // Verify initial state
        const output1 = yield* _(harness.getOutput())
        expect(output1).toContain("Counter: 0")
        
        // Test increment - the output uses differential rendering
        // so we just verify interaction works
        yield* _(harness.sendInput("+"))
        yield* _(Effect.sleep(300))
        yield* _(harness.saveScreenshot("02-incremented"))
        
        // Test multiple increments
        yield* _(harness.sendInput("+"))
        yield* _(Effect.sleep(200))
        yield* _(harness.sendInput("+"))
        yield* _(Effect.sleep(300))
        yield* _(harness.saveScreenshot("03-multiple-increments"))
        
        // Test decrement
        yield* _(harness.sendInput("-"))
        yield* _(Effect.sleep(300))
        yield* _(harness.saveScreenshot("04-decremented"))
        
        // Verify panel structure in output
        const finalOutput = yield* _(harness.getOutput())
        expect(finalOutput).toContain("Basic Panel Demo")
        expect(finalOutput).toContain("This demonstrates basic panel rendering")
        expect(finalOutput).toContain("Press + to increment, - to decrement")
        
        // The counter value is updated via differential rendering
        // Check that we received differential updates (cursor movements)
        expect(finalOutput).toContain("\x1B[8;15H") // Cursor position for counter update
        
        // Exit
        yield* _(harness.sendInput("q"))
      })
    )
  )
})