/**
 * Interactive Mode Management
 * 
 * Context-based interactive mode that works across the entire framework
 * using Effect.ts for proper scoping and lifecycle management
 */

import { Effect, Context, Layer, Ref, FiberRef } from "effect"
import { runApp } from "./runtime"
import { LiveServices } from "../services/impl"
import type { View } from "./types"

/**
 * Interactive mode configuration
 */
export interface InteractiveConfig {
  // Whether to enter interactive mode
  enabled: boolean
  // Auto-exit after timeout (milliseconds)
  timeout?: number
  // Exit on specific events
  exitOn?: {
    idle?: number // Exit after N ms of no activity
    complete?: boolean // Exit when all streams complete
    error?: boolean // Exit on any error
  }
  // Custom exit handler
  onExit?: (code: number) => void
}

/**
 * Interactive context service
 */
export class InteractiveContext extends Context.Tag("InteractiveContext")<
  InteractiveContext,
  {
    readonly config: Ref.Ref<InteractiveConfig>
    readonly isActive: Ref.Ref<boolean>
    readonly enter: (config?: Partial<InteractiveConfig>) => Effect.Effect<void>
    readonly exit: (code?: number) => Effect.Effect<void>
    readonly withInteractive: <R, E, A>(
      effect: Effect.Effect<A, E, R>,
      config?: Partial<InteractiveConfig>
    ) => Effect.Effect<A, E, R>
  }
>() {}

/**
 * Fiber-local interactive mode flag
 */
export const InteractiveFiberRef = FiberRef.unsafeMake<boolean>(false)

/**
 * Default interactive configuration
 */
const defaultConfig: InteractiveConfig = {
  enabled: false,
  exitOn: {
    error: true
  }
}

/**
 * Create interactive context layer
 */
export const InteractiveContextLive = Layer.effect(
  InteractiveContext,
  Effect.gen(function* () {
    const config = yield* Ref.make(defaultConfig)
    const isActive = yield* Ref.make(false)
    
    return {
      config,
      isActive,
      
      enter: (overrides) => Effect.gen(function* () {
        const currentConfig = yield* Ref.get(config)
        const newConfig = { ...currentConfig, ...overrides, enabled: true }
        yield* Ref.set(config, newConfig)
        yield* Ref.set(isActive, true)
        yield* FiberRef.set(InteractiveFiberRef, true)
        
        // Set up timeout if configured
        if (newConfig.timeout) {
          yield* Effect.fork(
            Effect.sleep(newConfig.timeout).pipe(
              Effect.zipRight(Ref.set(isActive, false)),
              Effect.zipRight(Effect.log("Interactive mode timed out"))
            )
          )
        }
      }),
      
      exit: (code = 0) => Effect.gen(function* () {
        yield* Ref.set(isActive, false)
        yield* FiberRef.set(InteractiveFiberRef, false)
        const cfg = yield* Ref.get(config)
        
        if (cfg.onExit) {
          yield* Effect.sync(() => cfg.onExit(code))
        }
        
        // Exit the process if we're in a CLI context
        if (typeof process !== 'undefined' && process.exit) {
          yield* Effect.sync(() => process.exit(code))
        }
      }),
      
      withInteractive: <R, E, A>(
        effect: Effect.Effect<A, E, R>,
        overrides?: Partial<InteractiveConfig>
      ) => Effect.gen(function* () {
        // Save current state
        const wasActive = yield* Ref.get(isActive)
        const oldConfig = yield* Ref.get(config)
        
        try {
          // Enter interactive mode
          yield* Effect.gen(function* () {
            const currentConfig = yield* Ref.get(config)
            const newConfig = { ...currentConfig, ...overrides, enabled: true }
            yield* Ref.set(config, newConfig)
            yield* Ref.set(isActive, true)
            yield* FiberRef.set(InteractiveFiberRef, true)
          })
          
          // Run the effect
          return yield* effect
        } finally {
          // Restore previous state
          yield* Ref.set(isActive, wasActive)
          yield* Ref.set(config, oldConfig)
          yield* FiberRef.set(InteractiveFiberRef, wasActive)
        }
      })
    }
  })
)

/**
 * Check if currently in interactive mode
 */
export const isInteractive = Effect.gen(function* () {
  return yield* FiberRef.get(InteractiveFiberRef)
})

/**
 * Run an effect in interactive mode
 */
export const runInteractive = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  config?: Partial<InteractiveConfig>
) => Effect.gen(function* () {
  const ctx = yield* InteractiveContext
  return yield* ctx.withInteractive(effect, config)
})

/**
 * Conditionally run as interactive based on context
 */
export const maybeInteractive = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  shouldBeInteractive: boolean | Effect.Effect<boolean, never, never>
) => Effect.gen(function* () {
  const interactive = typeof shouldBeInteractive === 'boolean' 
    ? shouldBeInteractive 
    : yield* shouldBeInteractive
    
  if (interactive) {
    return yield* runInteractive(effect)
  } else {
    return yield* effect
  }
})

/**
 * Run a view in interactive mode (with event loop)
 */
export const runViewInteractive = (
  view: View | (() => View),
  config?: Partial<InteractiveConfig>
) => Effect.gen(function* () {
  const ctx = yield* InteractiveContext
  
  yield* ctx.enter(config)
  
  const component = {
    init: Effect.succeed([{}, []] as const),
    update: () => Effect.succeed([{}, []] as const),
    view: typeof view === 'function' ? view : () => view,
    subscription: () => Effect.succeed([])
  }
  
  yield* runApp(component).pipe(
    Effect.provide(LiveServices),
    Effect.catchAll(() => Effect.void)
  )
})

/**
 * Exit interactive mode
 */
export const exitInteractive = (code = 0) => Effect.gen(function* () {
  const ctx = yield* InteractiveContext
  yield* ctx.exit(code)
})

/**
 * Interactive mode utilities
 */
export const Interactive = {
  /**
   * Enter interactive mode
   */
  enter: (config?: Partial<InteractiveConfig>) => Effect.gen(function* () {
    const ctx = yield* InteractiveContext
    yield* ctx.enter(config)
  }),
  
  /**
   * Exit interactive mode
   */
  exit: exitInteractive,
  
  /**
   * Check if in interactive mode
   */
  isActive: isInteractive,
  
  /**
   * Run effect in interactive mode
   */
  run: runInteractive,
  
  /**
   * Run view in interactive mode
   */
  runView: runViewInteractive,
  
  /**
   * Conditionally interactive
   */
  maybe: maybeInteractive,
  
  /**
   * Create a scoped interactive region
   */
  scope: <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    config?: Partial<InteractiveConfig>
  ) => runInteractive(effect, config)
}