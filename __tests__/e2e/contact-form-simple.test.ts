/**
 * E2E Test for Contact Form Example using Simple Harness
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { runSimpleTest } from "@/testing/simple-harness.ts"

test("contact form - complete flow with simple harness", async () => {
  await Effect.runPromise(
    runSimpleTest(
      {
        command: "bun",
        args: ["examples/contact-form.ts"],
        screenshotDir: "__tests__/screenshots-simple"
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for form to load
        yield* _(harness.waitForOutput("Simple Contact Form"))
        yield* _(harness.saveScreenshot("01-initial"))
        
        // Type name
        yield* _(harness.sendInput("John Doe"))
        yield* _(Effect.sleep(500))
        yield* _(harness.saveScreenshot("02-name-entered"))
        
        // Tab to email field
        yield* _(harness.sendInput("\t"))
        yield* _(Effect.sleep(200))
        
        // Type email
        yield* _(harness.sendInput("john@example.com"))
        yield* _(Effect.sleep(500))
        yield* _(harness.saveScreenshot("03-email-entered"))
        
        // Tab to submit button
        yield* _(harness.sendInput("\t"))
        yield* _(Effect.sleep(200))
        
        // Submit form
        yield* _(harness.sendInput("\r"))
        yield* _(Effect.sleep(500))
        yield* _(harness.waitForOutput("Form Submitted Successfully"))
        yield* _(harness.saveScreenshot("04-success"))
        
        // Test reset
        yield* _(harness.sendInput("r"))
        yield* _(Effect.sleep(500))
        yield* _(harness.waitForOutput("Simple Contact Form"))
        yield* _(harness.saveScreenshot("05-reset"))
        
        // Verify output
        const output = yield* _(harness.getOutput())
        expect(output).toContain("Simple Contact Form")
        
        // Exit
        yield* _(harness.sendInput("q"))
      })
    )
  )
})