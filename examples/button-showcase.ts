#!/usr/bin/env bun
/**
 * Button Showcase Example
 * 
 * Comprehensive demonstration of button component capabilities:
 * - All 6 button variants: Primary, Secondary, Success, Danger, Warning, Ghost
 * - Focus management with visual indicators (border changes)
 * - Keyboard navigation between buttons (Tab/Shift+Tab)
 * - Click interaction with feedback messages
 * - Consistent button sizing and alignment in grid layout
 * 
 * Key Learnings Demonstrated:
 * - Button components render with consistent height (3 lines: border + content + border)
 * - Focus states work correctly with visual feedback
 * - Grid layout using simpleHBox/simpleVBox composes cleanly
 * - Button color variants all use proven ANSI color system
 * 
 * This example confirms our button component architecture is solid
 * and can handle complex interactive UI scenarios.
 */

import { Effect } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type RuntimeConfig
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { InputService } from "../src/services/index.ts"
import {
  Button,
  ButtonVariant,
  primaryButton,
  secondaryButton,
  successButton,
  dangerButton,
  warningButton,
  ghostButton,
  type ButtonModel,
  type ButtonMsg
} from "../src/components/index.ts"
import { style, Colors } from "../src/styling/index.ts"
import { panel } from "../src/layout/index.ts"
import { simpleVBox, simpleHBox } from "../src/layout/flexbox-simple.ts"

// =============================================================================
// Model
// =============================================================================

interface ButtonShowcaseModel {
  buttons: ButtonModel[]
  focusIndex: number
  clickedButton: string | null
}

// =============================================================================
// Messages
// =============================================================================

type ButtonShowcaseMsg =
  | { _tag: "NextButton" }
  | { _tag: "PrevButton" }
  | { _tag: "ButtonClicked"; buttonId: string }
  | ButtonMsg

// =============================================================================
// Component Setup
// =============================================================================

const buttons = [
  primaryButton("Primary", { width: 16 }),
  secondaryButton("Secondary", { width: 16 }),
  successButton("Success", { width: 16 }),
  dangerButton("Danger", { width: 16 }),
  warningButton("Warning", { width: 16 }),
  ghostButton("Ghost", { width: 16 }),
] as const

const buttonLabels = [
  "Primary",
  "Secondary", 
  "Success",
  "Danger",
  "Warning",
  "Ghost"
] as const

// =============================================================================
// Component
// =============================================================================

export const ButtonShowcaseComponent: Component<ButtonShowcaseModel, ButtonShowcaseMsg> = {
  init: Effect.gen(function* (_) {
    const buttonModels: ButtonModel[] = []
    
    for (let i = 0; i < buttons.length; i++) {
      const [buttonModel] = yield* _(buttons[i].init())
      buttonModels.push(buttonModel)
    }
    
    // Focus first button
    const [focusedFirst] = yield* _(buttons[0].update({ _tag: "Focus" }, buttonModels[0]))
    buttonModels[0] = focusedFirst
    
    return [
      {
        buttons: buttonModels,
        focusIndex: 0,
        clickedButton: null
      },
      []
    ]
  }),
  
  update: (msg: ButtonShowcaseMsg, model: ButtonShowcaseModel) =>
    Effect.gen(function* (_) {
      switch (msg._tag) {
        case "NextButton": {
          const nextIndex = (model.focusIndex + 1) % buttons.length
          
          // Blur current button
          const [blurredCurrent] = yield* _(
            buttons[model.focusIndex].update({ _tag: "Blur" }, model.buttons[model.focusIndex])
          )
          
          // Focus next button
          const [focusedNext] = yield* _(
            buttons[nextIndex].update({ _tag: "Focus" }, model.buttons[nextIndex])
          )
          
          const newButtons = [...model.buttons]
          newButtons[model.focusIndex] = blurredCurrent
          newButtons[nextIndex] = focusedNext
          
          return [
            {
              ...model,
              buttons: newButtons,
              focusIndex: nextIndex
            },
            []
          ]
        }
        
        case "PrevButton": {
          const prevIndex = model.focusIndex - 1 < 0 ? buttons.length - 1 : model.focusIndex - 1
          
          // Blur current button
          const [blurredCurrent] = yield* _(
            buttons[model.focusIndex].update({ _tag: "Blur" }, model.buttons[model.focusIndex])
          )
          
          // Focus previous button
          const [focusedPrev] = yield* _(
            buttons[prevIndex].update({ _tag: "Focus" }, model.buttons[prevIndex])
          )
          
          const newButtons = [...model.buttons]
          newButtons[model.focusIndex] = blurredCurrent
          newButtons[prevIndex] = focusedPrev
          
          return [
            {
              ...model,
              buttons: newButtons,
              focusIndex: prevIndex
            },
            []
          ]
        }
        
        case "ButtonClicked": {
          return [
            {
              ...model,
              clickedButton: msg.buttonId
            },
            []
          ]
        }
        
        default: {
          // Update all buttons
          const newButtons: ButtonModel[] = []
          
          for (let i = 0; i < buttons.length; i++) {
            const [newButton] = yield* _(buttons[i].update(msg as any, model.buttons[i]))
            newButtons.push(newButton)
            
            // Check for click
            if (msg._tag === "Click" && i === model.focusIndex && newButton !== model.buttons[i]) {
              return [
                {
                  ...model,
                  buttons: newButtons,
                  clickedButton: buttonLabels[i]
                },
                []
              ]
            }
          }
          
          return [
            {
              ...model,
              buttons: newButtons
            },
            []
          ]
        }
      }
    }),
  
  view: (model: ButtonShowcaseModel) => {
    const title = View.styledText(
      "Button Showcase",
      style().foreground(Colors.cyan).bold()
    )
    
    const subtitle = View.styledText(
      "Demonstrating all button variants and states",
      style().foreground(Colors.gray).italic()
    )
    
    // Button grid (2 columns)
    const row1 = simpleHBox([
      buttons[0].view(model.buttons[0]), // Primary
      buttons[1].view(model.buttons[1])  // Secondary
    ], { gap: 4 })
    
    const row2 = simpleHBox([
      buttons[2].view(model.buttons[2]), // Success
      buttons[3].view(model.buttons[3])  // Danger
    ], { gap: 4 })
    
    const row3 = simpleHBox([
      buttons[4].view(model.buttons[4]), // Warning
      buttons[5].view(model.buttons[5])  // Ghost
    ], { gap: 4 })
    
    const buttonGrid = simpleVBox([
      row1,
      View.text(""),
      row2,
      View.text(""),
      row3
    ])
    
    // Status message
    const status = model.clickedButton
      ? View.styledText(
          `✓ ${model.clickedButton} button clicked!`,
          style().foreground(Colors.green)
        )
      : View.styledText(
          "Press Enter to click the focused button",
          style().foreground(Colors.gray)
        )
    
    const help = View.styledText(
      "Tab/Shift+Tab to navigate • Enter to click • Q to quit",
      style().foreground(Colors.gray).italic()
    )
    
    const content = simpleVBox([
      title,
      subtitle,
      View.text(""),
      buttonGrid,
      View.text(""),
      status,
      View.text(""),
      help
    ])
    
    return panel(content, {
      padding: { top: 1, right: 3, bottom: 1, left: 3 }
    })
  },
  
  subscriptions: (model: ButtonShowcaseModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        // Global keys
        if (key.key === 'q' || (key.ctrl && key.key === 'ctrl+c')) {
          process.stdout.write('\x1b[?25h')  // Show cursor
          process.stdout.write('\x1b[2J')    // Clear screen
          process.stdout.write('\x1b[H')     // Move to home
          process.exit(0)
        }
        
        // Navigation
        if (key.key === 'tab' && !key.shift) {
          return { _tag: "NextButton" as const }
        }
        if (key.key === 'tab' && key.shift) {
          return { _tag: "PrevButton" as const }
        }
        
        // Clear clicked status on space
        if (key.key === ' ') {
          return { _tag: "ButtonClicked" as const, buttonId: null }
        }
        
        // Try current button
        const buttonMsg = buttons[model.focusIndex].handleKey(key, model.buttons[model.focusIndex])
        if (buttonMsg) return buttonMsg
        
        return null
      })
    })
}

// =============================================================================
// Main Application
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: false,
  quitOnCtrlC: false,
  enableMouse: false,
  fullscreen: true
}

const program = runApp(ButtonShowcaseComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program).catch(console.error)