#!/usr/bin/env bun
/**
 * Counter Example - A simple counter application demonstrating the CLI-Kit framework
 */

import { Effect } from "effect"
import { 
  runApp,
  View,
  KeyUtils
} from "../src/index.ts"
import type {
  Component,
  Cmd,
  RuntimeConfig
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { InputService } from "../src/services/index.ts"

// =============================================================================
// Model
// =============================================================================

interface Model {
  count: number
  lastAction: string
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { _tag: "Increment" }
  | { _tag: "Decrement" }
  | { _tag: "Reset" }
  | { _tag: "IncrementBy"; amount: number }

// =============================================================================
// Component Implementation
// =============================================================================

export const CounterComponent: Component<Model, Msg> = {
  /**
   * Initialize the counter with a starting value
   */
  init: Effect.succeed([
    { count: 0, lastAction: "Started" },
    [] // No initial commands
  ]),

  /**
   * Update the model based on messages
   */
  update: (msg: Msg, model: Model) =>
    Effect.succeed((() => {
      switch (msg._tag) {
        case "Increment":
          return [
            { ...model, count: model.count + 1, lastAction: "Incremented" },
            [] as Cmd<Msg>[]
          ] as const

        case "Decrement":
          return [
            { ...model, count: model.count - 1, lastAction: "Decremented" },
            [] as Cmd<Msg>[]
          ] as const

        case "Reset":
          return [
            { ...model, count: 0, lastAction: "Reset" },
            [] as Cmd<Msg>[]
          ] as const

        case "IncrementBy":
          return [
            { ...model, count: model.count + msg.amount, lastAction: `Added ${msg.amount}` },
            [] as Cmd<Msg>[]
          ] as const
      }
    })()),

  /**
   * Render the view
   */
  view: (model: Model) => {
    // Create the counter display
    const counterDisplay = View.box(
      View.vstack(
        View.text("🎯 Counter App"),
        View.text(""),
        View.bold(View.text(`Count: ${model.count}`)),
        View.dim(View.text(`Last: ${model.lastAction}`))
      )
    )

    // Create the help text
    const help = View.vstack(
      View.text(""),
      View.dim(View.text("Commands:")),
      View.text("  ↑/k  - Increment"),
      View.text("  ↓/j  - Decrement"),
      View.text("  r    - Reset"),
      View.text("  q    - Quit"),
      View.text("  1-9  - Add that amount")
    )

    // Center everything
    return View.center(
      View.vstack(counterDisplay, help),
      80
    )
  },

  /**
   * Handle keyboard input
   */
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      return input.mapKeys(key => {
        // Check for quit keys first
        if (KeyUtils.matches(key, 'q', 'escape') || (key.ctrl && key.key === 'ctrl+c')) {
          process.exit(0)
        }
        
        // Use the normalized key name for matching
        if (KeyUtils.matches(key, 'up', 'k')) {
          return { _tag: "Increment" as const }
        }
        if (KeyUtils.matches(key, 'down', 'j')) {
          return { _tag: "Decrement" as const }
        }
        if (KeyUtils.matches(key, 'r')) {
          return { _tag: "Reset" as const }
        }
        
        // Check for number keys
        if (key.runes && /^[1-9]$/.test(key.runes)) {
          return { 
            _tag: "IncrementBy" as const, 
            amount: parseInt(key.runes) 
          }
        }
        
        // Ignore unmatched keys
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
  quitOnEscape: true,
  quitOnCtrlC: true,
  enableMouse: false,
  fullscreen: true
}

// Run the application
const program = runApp(CounterComponent, config).pipe(
  Effect.provide(LiveServices),
  Effect.tapErrorCause(cause =>
    Effect.sync(() => {
      console.error("Application crashed:", cause)
    })
  )
)

// Execute
Effect.runPromise(program).catch(console.error)