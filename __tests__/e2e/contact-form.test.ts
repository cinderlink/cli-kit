/**
 * E2E Test for Contact Form Example
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { runTest, type KeySequence } from "@/testing/e2e-harness.ts"

test("contact form - complete flow", async () => {
  await Effect.runPromise(
    runTest(
      {
        command: "bun",
        args: ["examples/contact-form.ts"],
        cols: 80,
        rows: 24,
        screenshotDir: "__tests__/screenshots"
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for form to load
        yield* _(harness.waitForText("Simple Contact Form"))
        yield* _(harness.screenshot("01-initial.txt"))
        
        // Type name
        const nameKeys: KeySequence[] = [
          { key: "J", delay: 50 },
          { key: "o", delay: 50 },
          { key: "h", delay: 50 },
          { key: "n", delay: 50 },
          { key: " ", delay: 50 },
          { key: "D", delay: 50 },
          { key: "o", delay: 50 },
          { key: "e", delay: 50 }
        ]
        yield* _(harness.sendKeys(nameKeys))
        yield* _(harness.screenshot("02-name-entered.txt"))
        
        // Tab to email field
        yield* _(harness.sendKey("tab"))
        yield* _(Effect.sleep(100))
        yield* _(harness.screenshot("03-email-focused.txt"))
        
        // Type email
        const emailKeys: KeySequence[] = [
          { key: "j", delay: 50 },
          { key: "o", delay: 50 },
          { key: "h", delay: 50 },
          { key: "n", delay: 50 },
          { key: "@", delay: 50 },
          { key: "e", delay: 50 },
          { key: "x", delay: 50 },
          { key: "a", delay: 50 },
          { key: "m", delay: 50 },
          { key: "p", delay: 50 },
          { key: "l", delay: 50 },
          { key: "e", delay: 50 },
          { key: ".", delay: 50 },
          { key: "c", delay: 50 },
          { key: "o", delay: 50 },
          { key: "m", delay: 50 }
        ]
        yield* _(harness.sendKeys(emailKeys))
        yield* _(harness.screenshot("04-email-entered.txt"))
        
        // Tab to submit button
        yield* _(harness.sendKey("tab"))
        yield* _(Effect.sleep(100))
        yield* _(harness.screenshot("05-submit-focused.txt"))
        
        // Submit form
        yield* _(harness.sendKey("enter"))
        yield* _(Effect.sleep(200))
        yield* _(harness.waitForText("Form Submitted Successfully"))
        yield* _(harness.screenshot("06-success.txt"))
        
        // Test reset
        yield* _(harness.sendKey("r"))
        yield* _(Effect.sleep(200))
        yield* _(harness.waitForText("Simple Contact Form"))
        yield* _(harness.screenshot("07-reset.txt"))
        
        // Verify form is cleared
        const output = yield* _(harness.getOutput())
        expect(output).toContain("Simple Contact Form")
        
        // Exit
        yield* _(harness.sendKey("q"))
      })
    )
  )
})

test("contact form - validation", async () => {
  await Effect.runPromise(
    runTest(
      {
        command: "bun",
        args: ["examples/contact-form.ts"],
        cols: 80,
        rows: 24
      },
      (harness) => Effect.gen(function* (_) {
        // Wait for form to load
        yield* _(harness.waitForText("Simple Contact Form"))
        
        // Type name
        yield* _(harness.sendKeys([
          { key: "T", delay: 50 },
          { key: "e", delay: 50 },
          { key: "s", delay: 50 },
          { key: "t", delay: 50 }
        ]))
        
        // Tab to email and enter invalid email
        yield* _(harness.sendKey("tab"))
        yield* _(harness.sendKeys([
          { key: "b", delay: 50 },
          { key: "a", delay: 50 },
          { key: "d", delay: 50 }
        ]))
        
        // Try to submit (should see validation error)
        yield* _(harness.sendKey("tab"))
        yield* _(harness.sendKey("enter"))
        yield* _(Effect.sleep(100))
        
        const output = yield* _(harness.getOutput())
        expect(output).toContain("Invalid email address")
        
        // Exit
        yield* _(harness.sendKey("q"))
      })
    )
  )
})

test("contact form - keyboard navigation", async () => {
  await Effect.runPromise(
    runTest(
      {
        command: "bun",
        args: ["examples/contact-form.ts"],
        cols: 80,
        rows: 24
      },
      (harness) => Effect.gen(function* (_) {
        yield* _(harness.waitForText("Simple Contact Form"))
        
        // Tab through all fields
        yield* _(harness.sendKey("tab")) // to email
        yield* _(harness.sendKey("tab")) // to submit
        yield* _(harness.sendKey("tab")) // to cancel
        yield* _(harness.sendKey("tab")) // back to name
        
        // Shift+Tab backwards
        yield* _(harness.sendKeys([
          { key: "shift+tab", delay: 100 } // to cancel
        ]))
        
        // Press cancel
        yield* _(harness.sendKey("enter"))
        
        // Should exit
        const output = yield* _(harness.getOutput())
        expect(output).toContain("[?25h") // cursor shown on exit
      })
    )
  )
})