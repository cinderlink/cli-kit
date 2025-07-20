/**
 * Hook System - Plugin hook management and execution
 * 
 * This module provides a comprehensive hook system enabling plugins to extend
 * TUIX behavior at runtime. Supports before/after/around patterns with
 * proper ordering, error handling, and performance optimization.
 * 
 * ## Key Features:
 * 
 * ### Hook Registration
 * - Type-safe hook registration with validation
 * - Plugin-specific hook namespacing
 * - Priority-based hook ordering
 * - Dynamic hook registration and removal
 * 
 * ### Hook Execution
 * - Before/after/around execution patterns
 * - Async hook support with Effect.ts
 * - Hook result composition and transformation
 * - Error isolation and recovery
 * 
 * ### Performance Optimization
 * - Lazy hook resolution
 * - Hook caching for frequently used hooks
 * - Minimal overhead for unused hooks
 * - Batch hook execution for related operations
 * 
 * @example
 * ```typescript
 * import { createHookManager } from './hooks'
 * 
 * const hookManager = await Effect.runPromise(createHookManager())
 * 
 * // Register hooks
 * await Effect.runPromise(hookManager.register('myPlugin', 'component:init', {
 *   before: Effect.succeed(() => console.log('Before init')),
 *   after: Effect.succeed(() => console.log('After init')),
 *   priority: 10
 * }))
 * 
 * // Execute hooks
 * await Effect.runPromise(hookManager.executeBefore('component:init', { id: 'test' }))
 * ```
 * 
 * @module core/plugin/hooks
 */

import { Effect, Map as IMap, Ref, Array as IArray, pipe } from "effect"
import type {
  Hook,
  HookContext,
  HookRegistration,
  HookManager,
  HookError,
  HookName,
  HookNames,
} from "./types"

// =============================================================================
// Hook Manager State
// =============================================================================

/**
 * Hook manager internal state
 */
interface HookManagerState {
  readonly hooks: IMap.Map<string, HookRegistration[]>
  readonly cache: IMap.Map<string, HookRegistration[]>
  readonly executing: Set<string>
}

/**
 * Hook execution context
 */
interface HookExecutionContext {
  readonly hookName: string
  readonly pluginName: string
  readonly args: unknown[]
  readonly result?: unknown
  readonly startTime: number
}

// =============================================================================
// Hook Manager Implementation
// =============================================================================

/**
 * Create a new hook manager
 */
export function createHookManager(): Effect.Effect<HookManager, never, never> {
  return Effect.gen(function* () {
    const stateRef = yield* Ref.make<HookManagerState>({
      hooks: IMap.empty(),
      cache: IMap.empty(),
      executing: new Set(),
    })

    const register = (
      pluginName: string,
      hookName: string,
      hook: Hook
    ): Effect.Effect<void, HookError, never> =>
      Effect.gen(function* () {
        // Validate hook name
        if (!hookName || typeof hookName !== 'string') {
          return yield* Effect.fail(new HookError({
            pluginName,
            hookName: hookName || 'unknown',
            message: 'Hook name must be a non-empty string',
          }))
        }

        // Validate plugin name
        if (!pluginName || typeof pluginName !== 'string') {
          return yield* Effect.fail(new HookError({
            pluginName: pluginName || 'unknown',
            hookName,
            message: 'Plugin name must be a non-empty string',
          }))
        }

        // Validate hook structure
        if (!hook || typeof hook !== 'object') {
          return yield* Effect.fail(new HookError({
            pluginName,
            hookName,
            message: 'Hook must be an object',
          }))
        }

        if (!hook.before && !hook.after && !hook.around) {
          return yield* Effect.fail(new HookError({
            pluginName,
            hookName,
            message: 'Hook must have at least one of: before, after, or around',
          }))
        }

        const registration: HookRegistration = {
          pluginName,
          hookName,
          hook,
          priority: hook.priority || 0,
        }

        // Add to registry
        yield* Ref.update(stateRef, state => {
          const existing = IMap.get(state.hooks, hookName)
          const hooks = existing._tag === 'Some' ? existing.value : []
          
          // Check for duplicate registration
          const isDuplicate = hooks.some(h => h.pluginName === pluginName)
          if (isDuplicate) {
            return state
          }

          const newHooks = [...hooks, registration].sort((a, b) => b.priority - a.priority)
          
          return {
            ...state,
            hooks: IMap.set(state.hooks, hookName, newHooks),
            cache: IMap.remove(state.cache, hookName), // Invalidate cache
          }
        })
      })

    const unregister = (
      pluginName: string,
      hookName: string
    ): Effect.Effect<void, HookError, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        const existing = IMap.get(state.hooks, hookName)
        
        if (existing._tag === 'None') {
          return yield* Effect.fail(new HookError({
            pluginName,
            hookName,
            message: `No hooks registered for ${hookName}`,
          }))
        }

        const hooks = existing.value
        const filteredHooks = hooks.filter(h => h.pluginName !== pluginName)
        
        if (filteredHooks.length === hooks.length) {
          return yield* Effect.fail(new HookError({
            pluginName,
            hookName,
            message: `Plugin ${pluginName} has no hooks registered for ${hookName}`,
          }))
        }

        yield* Ref.update(stateRef, state => ({
          ...state,
          hooks: filteredHooks.length > 0 
            ? IMap.set(state.hooks, hookName, filteredHooks)
            : IMap.remove(state.hooks, hookName),
          cache: IMap.remove(state.cache, hookName), // Invalidate cache
        }))
      })

    const execute = (
      hookName: string,
      ...args: unknown[]
    ): Effect.Effect<unknown, HookError, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        
        // Check if already executing this hook (prevent infinite recursion)
        if (state.executing.has(hookName)) {
          return yield* Effect.fail(new HookError({
            pluginName: 'system',
            hookName,
            message: `Circular hook execution detected for ${hookName}`,
          }))
        }

        // Mark as executing
        yield* Ref.update(stateRef, state => ({
          ...state,
          executing: new Set([...state.executing, hookName]),
        }))

        try {
          const hooks = yield* getHooksForName(stateRef, hookName)
          let result: unknown = undefined

          // Execute before hooks
          for (const registration of hooks) {
            if (registration.hook.before) {
              const context: HookContext = {
                pluginName: registration.pluginName,
                hookName,
                args,
                timestamp: new Date(),
              }

              yield* registration.hook.before.pipe(
                Effect.provideService(HookContext, context),
                Effect.catchAll(error => 
                  Effect.fail(new HookError({
                    pluginName: registration.pluginName,
                    hookName,
                    message: `Before hook failed: ${error}`,
                    cause: error,
                  }))
                )
              )
            }
          }

          // Execute around hooks (if any)
          const aroundHooks = hooks.filter(h => h.hook.around)
          if (aroundHooks.length > 0) {
            // Chain around hooks
            let chainedEffect: Effect.Effect<unknown, never, never> = Effect.succeed(undefined)
            
            for (const registration of aroundHooks.reverse()) {
              if (registration.hook.around) {
                const context: HookContext = {
                  pluginName: registration.pluginName,
                  hookName,
                  args,
                  timestamp: new Date(),
                }

                chainedEffect = registration.hook.around(chainedEffect).pipe(
                  Effect.provideService(HookContext, context),
                  Effect.catchAll(error => 
                    Effect.fail(new HookError({
                      pluginName: registration.pluginName,
                      hookName,
                      message: `Around hook failed: ${error}`,
                      cause: error,
                    }))
                  )
                )
              }
            }

            result = yield* chainedEffect
          }

          // Execute after hooks
          for (const registration of hooks.reverse()) {
            if (registration.hook.after) {
              const context: HookContext = {
                pluginName: registration.pluginName,
                hookName,
                args,
                result,
                timestamp: new Date(),
              }

              yield* registration.hook.after.pipe(
                Effect.provideService(HookContext, context),
                Effect.catchAll(error => 
                  Effect.fail(new HookError({
                    pluginName: registration.pluginName,
                    hookName,
                    message: `After hook failed: ${error}`,
                    cause: error,
                  }))
                )
              )
            }
          }

          return result
        } finally {
          // Remove from executing set
          yield* Ref.update(stateRef, state => ({
            ...state,
            executing: new Set([...state.executing].filter(h => h !== hookName)),
          }))
        }
      })

    const executeBefore = (
      hookName: string,
      ...args: unknown[]
    ): Effect.Effect<void, HookError, never> =>
      Effect.gen(function* () {
        const hooks = yield* getHooksForName(stateRef, hookName)
        
        for (const registration of hooks) {
          if (registration.hook.before) {
            const context: HookContext = {
              pluginName: registration.pluginName,
              hookName,
              args,
              timestamp: new Date(),
            }

            yield* registration.hook.before.pipe(
              Effect.provideService(HookContext, context),
              Effect.catchAll(error => 
                Effect.fail(new HookError({
                  pluginName: registration.pluginName,
                  hookName,
                  message: `Before hook failed: ${error}`,
                  cause: error,
                }))
              )
            )
          }
        }
      })

    const executeAfter = (
      hookName: string,
      result: unknown,
      ...args: unknown[]
    ): Effect.Effect<void, HookError, never> =>
      Effect.gen(function* () {
        const hooks = yield* getHooksForName(stateRef, hookName)
        
        for (const registration of hooks.reverse()) {
          if (registration.hook.after) {
            const context: HookContext = {
              pluginName: registration.pluginName,
              hookName,
              args,
              result,
              timestamp: new Date(),
            }

            yield* registration.hook.after.pipe(
              Effect.provideService(HookContext, context),
              Effect.catchAll(error => 
                Effect.fail(new HookError({
                  pluginName: registration.pluginName,
                  hookName,
                  message: `After hook failed: ${error}`,
                  cause: error,
                }))
              )
            )
          }
        }
      })

    const executeAround = (
      hookName: string,
      next: Effect.Effect<unknown, never, never>
    ): Effect.Effect<unknown, HookError, never> =>
      Effect.gen(function* () {
        const hooks = yield* getHooksForName(stateRef, hookName)
        const aroundHooks = hooks.filter(h => h.hook.around)
        
        if (aroundHooks.length === 0) {
          return yield* next
        }

        let chainedEffect = next
        
        for (const registration of aroundHooks.reverse()) {
          if (registration.hook.around) {
            const context: HookContext = {
              pluginName: registration.pluginName,
              hookName,
              args: [],
              timestamp: new Date(),
            }

            chainedEffect = registration.hook.around(chainedEffect).pipe(
              Effect.provideService(HookContext, context),
              Effect.catchAll(error => 
                Effect.fail(new HookError({
                  pluginName: registration.pluginName,
                  hookName,
                  message: `Around hook failed: ${error}`,
                  cause: error,
                }))
              )
            )
          }
        }

        return yield* chainedEffect
      })

    const listHooks = (
      hookName?: string
    ): Effect.Effect<HookRegistration[], never, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        
        if (hookName) {
          const hooks = IMap.get(state.hooks, hookName)
          return hooks._tag === 'Some' ? hooks.value : []
        }

        const allHooks: HookRegistration[] = []
        for (const hooks of IMap.values(state.hooks)) {
          allHooks.push(...hooks)
        }
        
        return allHooks
      })

    return {
      register,
      unregister,
      execute,
      executeBefore,
      executeAfter,
      executeAround,
      listHooks,
    }
  })
}

/**
 * Get hooks for a specific hook name with caching
 */
function getHooksForName(
  stateRef: Ref.Ref<HookManagerState>,
  hookName: string
): Effect.Effect<HookRegistration[], HookError, never> {
  return Effect.gen(function* () {
    const state = yield* Ref.get(stateRef)
    
    // Check cache first
    const cached = IMap.get(state.cache, hookName)
    if (cached._tag === 'Some') {
      return cached.value
    }

    // Get from registry
    const hooks = IMap.get(state.hooks, hookName)
    const result = hooks._tag === 'Some' ? hooks.value : []
    
    // Cache result
    yield* Ref.update(stateRef, state => ({
      ...state,
      cache: IMap.set(state.cache, hookName, result),
    }))
    
    return result
  })
}

// =============================================================================
// Hook Utilities
// =============================================================================

/**
 * Create a simple hook with just a before handler
 */
export function createBeforeHook(
  handler: Effect.Effect<void, never, HookContext>,
  priority = 0
): Hook {
  return {
    before: handler,
    priority,
  }
}

/**
 * Create a simple hook with just an after handler
 */
export function createAfterHook(
  handler: Effect.Effect<void, never, HookContext>,
  priority = 0
): Hook {
  return {
    after: handler,
    priority,
  }
}

/**
 * Create an around hook that wraps the next effect
 */
export function createAroundHook(
  wrapper: (next: Effect.Effect<void, never, never>) => Effect.Effect<void, never, HookContext>,
  priority = 0
): Hook {
  return {
    around: wrapper,
    priority,
  }
}

/**
 * Create a logging hook for debugging
 */
export function createLoggingHook(
  pluginName: string,
  logger: (message: string, context: HookContext) => void
): Hook {
  return {
    before: Effect.gen(function* () {
      const context = yield* Effect.service(HookContext)
      logger(`[${pluginName}] Before ${context.hookName}`, context)
    }),
    after: Effect.gen(function* () {
      const context = yield* Effect.service(HookContext)
      logger(`[${pluginName}] After ${context.hookName}`, context)
    }),
    priority: -1000, // Execute logging hooks last
  }
}

/**
 * Create a timing hook for performance monitoring
 */
export function createTimingHook(
  pluginName: string,
  onTiming: (hookName: string, duration: number) => void
): Hook {
  const timers = new Map<string, number>()
  
  return {
    before: Effect.gen(function* () {
      const context = yield* Effect.service(HookContext)
      const key = `${context.pluginName}:${context.hookName}`
      timers.set(key, performance.now())
    }),
    after: Effect.gen(function* () {
      const context = yield* Effect.service(HookContext)
      const key = `${context.pluginName}:${context.hookName}`
      const startTime = timers.get(key)
      if (startTime) {
        const duration = performance.now() - startTime
        onTiming(context.hookName, duration)
        timers.delete(key)
      }
    }),
    priority: 1000, // Execute timing hooks first/last
  }
}

/**
 * Create a validation hook that checks arguments
 */
export function createValidationHook(
  validator: (args: unknown[]) => boolean | string,
  priority = 500
): Hook {
  return {
    before: Effect.gen(function* () {
      const context = yield* Effect.service(HookContext)
      const result = validator(context.args)
      
      if (result !== true) {
        const message = typeof result === 'string' ? result : 'Validation failed'
        return yield* Effect.fail(new HookError({
          pluginName: context.pluginName,
          hookName: context.hookName,
          message,
        }))
      }
    }),
    priority,
  }
}

// =============================================================================
// Hook Context Service
// =============================================================================

/**
 * Hook context service for dependency injection
 */
export const HookContext = Context.GenericTag<HookContext>("HookContext")

/**
 * Get the current hook context
 */
export const getCurrentHookContext = (): Effect.Effect<HookContext, never, HookContext> =>
  Effect.service(HookContext)

/**
 * Get the current hook name
 */
export const getCurrentHookName = (): Effect.Effect<string, never, HookContext> =>
  Effect.gen(function* () {
    const context = yield* getCurrentHookContext()
    return context.hookName
  })

/**
 * Get the current plugin name
 */
export const getCurrentPluginName = (): Effect.Effect<string, never, HookContext> =>
  Effect.gen(function* () {
    const context = yield* getCurrentHookContext()
    return context.pluginName
  })

/**
 * Get the current hook arguments
 */
export const getCurrentHookArgs = (): Effect.Effect<unknown[], never, HookContext> =>
  Effect.gen(function* () {
    const context = yield* getCurrentHookContext()
    return context.args
  })

// =============================================================================
// Built-in Hook Names
// =============================================================================

/**
 * Type-safe hook name constants
 */
export const HOOK_NAMES = HookNames

/**
 * Check if a hook name is valid
 */
export function isValidHookName(name: string): name is HookName {
  return Object.values(HookNames).includes(name as HookName)
}

/**
 * Get all standard hook names
 */
export function getStandardHookNames(): HookName[] {
  return Object.values(HookNames)
}

/**
 * Get hook names by category
 */
export function getHookNamesByCategory(category: 'component' | 'cli' | 'render' | 'process' | 'input' | 'app'): HookName[] {
  return Object.values(HookNames).filter(name => name.startsWith(`${category}:`))
}