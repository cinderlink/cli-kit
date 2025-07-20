/**
 * Fast Button Showcase Component Tests
 * Tests the button showcase logic without running the full application
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "../../tests/e2e/component-test-utils.ts"

// Import the button showcase component logic
interface SimpleButton {
  readonly id: string
  readonly label: string
  readonly variant: string
  readonly focused: boolean
  readonly disabled?: boolean
}

interface ButtonShowcaseModel {
  readonly buttons: readonly SimpleButton[]
  readonly selectedIndex: number
  readonly message: string
}

type ButtonShowcaseMsg = 
  | { readonly tag: "buttonClicked"; readonly buttonId: string }
  | { readonly tag: "navigate"; readonly direction: "up" | "down" }
  | { readonly tag: "activate" }
  | { readonly tag: "clearMessage" }

// Mock button showcase component
const buttonShowcaseComponent = {
  init: Effect.succeed([
    {
      buttons: [
        { id: "primary-btn", label: "Primary Button", variant: "primary", focused: true },
        { id: "secondary-btn", label: "Secondary Button", variant: "secondary", focused: false },
        { id: "success-btn", label: "Success Button", variant: "success", focused: false },
        { id: "danger-btn", label: "Danger Button", variant: "danger", focused: false },
        { id: "disabled-btn", label: "Disabled Button", variant: "secondary", focused: false, disabled: true }
      ],
      selectedIndex: 0,
      message: ""
    } as ButtonShowcaseModel,
    [] as const
  ] as const),

  update: (msg: ButtonShowcaseMsg, model: ButtonShowcaseModel) => {
    switch (msg.tag) {
      case "buttonClicked": {
        const button = model.buttons.find(b => b.id === msg.buttonId)
        const message = button ? `Clicked: ${button.label}` : "Unknown button"
        return Effect.succeed([{ ...model, message }, [] as const] as const)
      }

      case "navigate": {
        const direction = msg.direction === "down" ? 1 : -1
        const enabledButtons = model.buttons.filter(b => !b.disabled)
        const currentEnabledIndex = enabledButtons.findIndex(b => b.focused)
        const newEnabledIndex = Math.max(0, Math.min(enabledButtons.length - 1, currentEnabledIndex + direction))
        const newSelectedButton = enabledButtons[newEnabledIndex]
        
        if (!newSelectedButton) return Effect.succeed([model, [] as const] as const)

        const newButtons = model.buttons.map(button => ({
          ...button,
          focused: button.id === newSelectedButton.id
        }))

        const newSelectedIndex = model.buttons.findIndex(b => b.id === newSelectedButton.id)

        return Effect.succeed([
          { 
            ...model, 
            buttons: newButtons,
            selectedIndex: newSelectedIndex
          },
          [] as const
        ] as const)
      }

      case "activate": {
        const focusedButton = model.buttons.find(b => b.focused)
        if (focusedButton && !focusedButton.disabled) {
          return Effect.succeed([
            { ...model, message: `Activated: ${focusedButton.label}` },
            [] as const
          ] as const)
        }
        return Effect.succeed([model, [] as const] as const)
      }

      case "clearMessage": {
        return Effect.succeed([{ ...model, message: "" }, [] as const] as const)
      }

      default:
        return Effect.succeed([model, [] as const] as const)
    }
  },

  view: (model: ButtonShowcaseModel) => ({
    render: () => Effect.succeed([
      "Button Showcase",
      "",
      "Use ↑/↓ to navigate, Enter/Space to activate, q to quit",
      "",
      ...model.buttons.map(button => {
        const prefix = button.focused ? "[FOCUSED] " : ""
        const suffix = button.disabled ? " (disabled)" : ""
        return `${prefix}[${button.label}]${suffix}`
      }),
      "",
      model.message || "Select a button and press Enter or Space"
    ].join('\n'))
  })
}

test("Button Showcase - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Button Showcase")
      expect(output).toContain("[FOCUSED] [Primary Button]")
      expect(output).toContain("[Secondary Button]")
      expect(output).toContain("[Disabled Button] (disabled)")
    })
  )
})

test("Button Showcase - Navigation Down", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Navigate down
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("[FOCUSED] [Secondary Button]")
      expect(output).not.toContain("[FOCUSED] [Primary Button]")
    })
  )
})

test("Button Showcase - Navigation Up", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Navigate down first, then up
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "up" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("[FOCUSED] [Primary Button]")
    })
  )
})

test("Button Showcase - Button Activation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Navigate to success button
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      
      // Activate it
      ctx = yield* _(ctx.sendMessage({ tag: "activate" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Activated: Success Button")
    })
  )
})

test("Button Showcase - Disabled Button Handling", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Navigate to disabled button (skip over it)
      for (let i = 0; i < 5; i++) {
        ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      }
      
      // Should not be able to focus disabled button - focus should stay on enabled buttons
      const output = yield* _(ctx.getOutput())
      expect(output).not.toContain("[FOCUSED] [Disabled Button]")
    })
  )
})

test("Button Showcase - Direct Button Click", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Click specific button by ID
      ctx = yield* _(ctx.sendMessage({ tag: "buttonClicked", buttonId: "danger-btn" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Clicked: Danger Button")
    })
  )
})

test("Button Showcase - Clear Message", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Click button then clear message
      ctx = yield* _(ctx.sendMessage({ tag: "buttonClicked", buttonId: "primary-btn" }))
      ctx = yield* _(ctx.sendMessage({ tag: "clearMessage" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Select a button and press Enter or Space")
      expect(output).not.toContain("Clicked: Primary Button")
    })
  )
})

test("Button Showcase - Navigation Bounds", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(buttonShowcaseComponent))
      
      // Try to navigate up from first button
      ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "up" }))
      
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("[FOCUSED] [Primary Button]") // Should stay on first
      
      // Navigate to last enabled button
      for (let i = 0; i < 10; i++) {
        ctx = yield* _(ctx.sendMessage({ tag: "navigate", direction: "down" }))
      }
      
      output = yield* _(ctx.getOutput())
      expect(output).toContain("[FOCUSED] [Danger Button]") // Should be on last enabled button
    })
  )
})