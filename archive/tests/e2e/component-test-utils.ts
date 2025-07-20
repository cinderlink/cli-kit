/**
 * Component Test Utilities
 * 
 * Provides simplified testing utilities for components that avoid the complexity
 * of the full runtime system and focus on testing component logic directly.
 */

import { Effect, Stream, Option } from "effect"
import type { Component, View } from "@/core/types.ts"

// =============================================================================
// Component Test Types
// =============================================================================

export interface ComponentTestContext<Model, Msg> {
  readonly model: Model
  readonly sendMessage: (msg: Msg) => Effect.Effect<ComponentTestContext<Model, Msg>, Error, never>
  readonly getView: () => Effect.Effect<View, Error, never>
  readonly getOutput: () => Effect.Effect<string, Error, never>
}

// =============================================================================
// Direct Component Testing
// =============================================================================

/**
 * Create a test context for testing component logic directly without the runtime
 */
export const createComponentTestContext = <Model, Msg>(
  component: Component<Model, Msg>
): Effect.Effect<ComponentTestContext<Model, Msg>, Error, never> =>
  Effect.gen(function* (_) {
    // Initialize the component
    const [initialModel, initialCmds] = yield* _(component.init)
    
    // Create test context
    const createContext = (model: Model): ComponentTestContext<Model, Msg> => ({
      model,
      sendMessage: (msg: Msg) =>
        Effect.gen(function* (_) {
          const [newModel, cmds] = yield* _(component.update(msg, model))
          // For testing, we ignore commands
          return createContext(newModel)
        }),
      getView: () => Effect.succeed(component.view(model)),
      getOutput: () => Effect.gen(function* (_) {
        const view = component.view(model)
        if (view.render) {
          return yield* _(view.render())
        }
        return String(view)
      })
    })
    
    return createContext(initialModel)
  })

// =============================================================================
// Subscription Testing Utilities
// =============================================================================

/**
 * Test subscription behavior by collecting messages over a period
 */
export const testSubscription = <Model, Msg>(
  component: Component<Model, Msg>,
  model: Model,
  durationMs: number = 100
): Effect.Effect<ReadonlyArray<Msg>, Error, never> =>
  Effect.gen(function* (_) {
    if (!component.subscriptions) {
      return []
    }
    
    const sub = yield* _(component.subscriptions(model))
    const messages: Msg[] = []
    
    // Collect messages for the specified duration
    yield* _(
      sub.pipe(
        Stream.take(10), // Limit to prevent infinite collection
        Stream.runForEach(msg => Effect.sync(() => messages.push(msg))),
        Effect.timeout(durationMs),
        Effect.catchAll(() => Effect.succeed(undefined)) // Ignore timeout
      )
    )
    
    return messages
  })

// =============================================================================
// Simplified Test Assertions
// =============================================================================

/**
 * Assert that output contains expected text
 */
export const assertOutputContains = (output: string, expected: string): Effect.Effect<void, Error, never> =>
  output.includes(expected)
    ? Effect.succeed(undefined)
    : Effect.fail(new Error(`Expected output to contain "${expected}", but got: ${output}`))

/**
 * Assert that model has expected properties
 */
export const assertModelProperty = <Model, T>(
  model: Model,
  key: keyof Model,
  expected: T
): Effect.Effect<void, Error, never> =>
  model[key] === expected
    ? Effect.succeed(undefined)
    : Effect.fail(new Error(`Expected model.${String(key)} to be ${expected}, but got: ${model[key]}`))

/**
 * Test a complete interaction sequence
 */
export const testInteraction = <Model, Msg>(
  component: Component<Model, Msg>,
  messages: ReadonlyArray<Msg>,
  assertions: ReadonlyArray<(ctx: ComponentTestContext<Model, Msg>) => Effect.Effect<void, Error, never>>
): Effect.Effect<void, Error, never> =>
  Effect.gen(function* (_) {
    let ctx = yield* _(createComponentTestContext(component))
    
    // Send all messages
    for (const msg of messages) {
      ctx = yield* _(ctx.sendMessage(msg))
    }
    
    // Run all assertions
    for (const assertion of assertions) {
      yield* _(assertion(ctx))
    }
  })