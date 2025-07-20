/**
 * Button Showcase Example
 * 
 * Demonstrates the button component with various variants and states.
 * Shows focus handling, keyboard navigation, and different button styles.
 */

import { Effect } from "effect"
import { runApp } from "@/index.ts"
import { text, styledText, vstack, hstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { LiveServices } from "@/services/impl/index.ts"
import type { Component, AppOptions, KeyEvent } from "@/core/types.ts"
import { ButtonVariant } from "@/components/Button.ts"

// =============================================================================
// Model
// =============================================================================

interface SimpleButton {
  readonly id: string
  readonly label: string
  readonly variant: ButtonVariant
  readonly focused: boolean
  readonly disabled?: boolean
}

interface ButtonShowcaseModel {
  readonly buttons: readonly SimpleButton[]
  readonly selectedIndex: number
  readonly message: string
}

// =============================================================================
// Messages
// =============================================================================

type ButtonShowcaseMsg = 
  | { readonly tag: "buttonClicked"; readonly buttonId: string }
  | { readonly tag: "navigate"; readonly direction: "up" | "down" }
  | { readonly tag: "activate" }
  | { readonly tag: "clearMessage" }

// =============================================================================
// Component
// =============================================================================

const app: Component<ButtonShowcaseModel, ButtonShowcaseMsg> = {
  init: Effect.succeed([
    {
      buttons: [
        {
          id: "primary-btn",
          label: "Primary Button",
          variant: ButtonVariant.Primary,
          focused: true
        },
        {
          id: "secondary-btn", 
          label: "Secondary Button",
          variant: ButtonVariant.Secondary,
          focused: false
        },
        {
          id: "success-btn",
          label: "Success Button", 
          variant: ButtonVariant.Success,
          focused: false
        },
        {
          id: "danger-btn",
          label: "Danger Button",
          variant: ButtonVariant.Danger,
          focused: false
        },
        {
          id: "disabled-btn",
          label: "Disabled Button",
          variant: ButtonVariant.Secondary,
          focused: false,
          disabled: true
        }
      ],
      selectedIndex: 0,
      message: ""
    },
    []
  ]),

  update: (msg: ButtonShowcaseMsg, model: ButtonShowcaseModel) => {
    switch (msg.tag) {
      case "buttonClicked": {
        const button = model.buttons.find(b => b.id === msg.buttonId)
        const message = button ? `Clicked: ${button.label}` : "Unknown button"
        return Effect.succeed([
          { ...model, message },
          []
        ])
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
          []
        ])
      }

      case "activate": {
        const focusedButton = model.buttons.find(b => b.focused)
        if (focusedButton && !focusedButton.disabled) {
          return Effect.succeed([
            { ...model, message: `Activated: ${focusedButton.label}` },
            []
          ])
        }
        return Effect.succeed([model, [] as const] as const)
      }

      case "clearMessage": {
        return Effect.succeed([
          { ...model, message: "" },
          []
        ])
      }
    }
  },

  view: (model: ButtonShowcaseModel) => {
    const title = styledText("Button Showcase", style().foreground(Colors.brightCyan).bold())
    const instructions = styledText(
      "Use ↑/↓ to navigate, Enter/Space to activate, q to quit",
      style().foreground(Colors.gray)
    )

    const buttons = model.buttons.map(button => {
      const focused = button.focused ? " [FOCUSED]" : ""
      const disabled = button.disabled ? " (disabled)" : ""
      const label = `[${button.label}]${focused}${disabled}`
      
      let color = Colors.white
      switch (button.variant) {
        case ButtonVariant.Primary:
          color = Colors.blue
          break
        case ButtonVariant.Success:
          color = Colors.green
          break
        case ButtonVariant.Danger:
          color = Colors.red
          break
      }
      
      if (button.disabled) color = Colors.gray
      if (button.focused) color = Colors.brightWhite
      
      return styledText(label, style().foreground(color))
    })
    const buttonList = vstack(...buttons)

    const messageText = model.message 
      ? styledText(model.message, style().foreground(Colors.green))
      : styledText("Select a button and press Enter or Space", style().foreground(Colors.gray))

    return vstack(
      title,
      text(""),
      instructions,
      text(""),
      buttonList,
      text(""),
      messageText
    )
  },

  subscriptions: (model: ButtonShowcaseModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0)
        }

        switch (key.key) {
          case 'up':
            return { tag: "navigate", direction: "up" } as const
          case 'down':
            return { tag: "navigate", direction: "down" } as const
          case 'enter':
          case ' ':
            return { tag: "activate" } as const
          case 'c':
            return { tag: "clearMessage" } as const
          default:
            return null
        }
      })
    })
}

// =============================================================================
// Runtime
// =============================================================================

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
}

const program = runApp(app, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })