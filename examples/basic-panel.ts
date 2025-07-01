#!/usr/bin/env bun
/**
 * Basic Panel Example
 * 
 * Fundamental test demonstrating core framework capabilities:
 * - Panel rendering with complete borders (top, right, bottom, left)
 * - ANSI color system working correctly (cyan title, white text, gray help)
 * - Basic keyboard interaction and state management
 * - Proper text positioning within bordered containers
 * 
 * This example confirms the framework foundations work correctly
 * and serves as a baseline for more complex examples.
 * 
 * Key Learning: This proves our box model and border rendering work correctly.
 * The issue in earlier examples was theming integration, not core functionality.
 */

import { Effect } from "effect"
import { 
  runApp,
  View,
  type Component,
  type RuntimeConfig
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { InputService } from "../src/services/index.ts"
import { style, Colors } from "../src/styling/index.ts"
import { panel } from "../src/layout/index.ts"
import { simpleVBox } from "../src/layout/flexbox-simple.ts"

// =============================================================================
// Model - Simple counter state to demonstrate interaction
// =============================================================================

interface BasicPanelModel {
  counter: number
}

// =============================================================================
// Messages - Basic increment/decrement operations
// =============================================================================

type BasicPanelMsg =
  | { _tag: "Increment" }
  | { _tag: "Decrement" }

// =============================================================================
// Component - Demonstrates panel rendering and basic interaction
// =============================================================================

export const BasicPanelComponent: Component<BasicPanelModel, BasicPanelMsg> = {
  init: Effect.succeed([
    { counter: 0 },
    []
  ]),
  
  update: (msg: BasicPanelMsg, model: BasicPanelModel) =>
    Effect.succeed((() => {
      switch (msg._tag) {
        case "Increment":
          return [{ ...model, counter: model.counter + 1 }, []]
        case "Decrement":
          return [{ ...model, counter: model.counter - 1 }, []]
        default:
          return [model, []]
      }
    })()),
  
  view: (model: BasicPanelModel) => {
    const title = View.styledText(
      "Basic Panel Demo",
      style().foreground(Colors.cyan).bold()
    )
    
    const counter = View.styledText(
      `Counter: ${model.counter}`,
      style().foreground(Colors.white)
    )
    
    const instructions = View.styledText(
      "Press + to increment, - to decrement, q to quit",
      style().foreground(Colors.gray).italic()
    )
    
    const explanation = View.styledText(
      "This demonstrates basic panel rendering with borders and colors.",
      style().foreground(Colors.white)
    )
    
    const content = simpleVBox([
      title,
      View.text(""),
      explanation,
      View.text(""),
      counter,
      View.text(""),
      instructions
    ])
    
    // Key Learning: panel() creates a bordered container with padding
    // The borders render correctly when using stringWidth() for calculations
    return panel(content, {
      padding: { top: 2, right: 4, bottom: 2, left: 4 }
    })
  },
  
  subscriptions: (model: BasicPanelModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        if (key.key === 'q' || (key.ctrl && key.key === 'ctrl+c')) {
          process.stdout.write('\x1b[?25h')  // Show cursor
          process.stdout.write('\x1b[2J')    // Clear screen
          process.stdout.write('\x1b[H')     // Move to home
          process.exit(0)
        }
        
        if (key.key === '+' || key.key === '=') {
          return { _tag: "Increment" as const }
        }
        
        if (key.key === '-') {
          return { _tag: "Decrement" as const }
        }
        
        return null
      })
    })
}

// =============================================================================
// Main Application - Runs the basic panel demonstration
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: false,
  quitOnCtrlC: false,
  enableMouse: false,
  fullscreen: true
}

// This configuration proves that our framework can:
// 1. Render bordered panels correctly in all terminals
// 2. Handle ANSI colors consistently
// 3. Manage basic state and interactions
const program = runApp(BasicPanelComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program).catch(console.error)