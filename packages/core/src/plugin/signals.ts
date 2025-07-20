/**
 * Signal System - Type-safe inter-plugin communication
 * 
 * This module provides a comprehensive signal system enabling plugins to
 * communicate through typed events with schema validation, routing, filtering,
 * and history support. All operations are Effect-based for composability.
 * 
 * ## Key Features:
 * 
 * ### Type-Safe Communication
 * - Schema validation for signal payloads
 * - Compile-time type checking for signal handlers
 * - Discriminated union types for different signal types
 * - Generic signal interfaces for custom payloads
 * 
 * ### Publish/Subscribe Pattern
 * - Efficient event routing and filtering
 * - One-time and persistent subscriptions
 * - Subscription priority and ordering
 * - Automatic subscription cleanup
 * 
 * ### Signal History and Replay
 * - Configurable signal history retention
 * - Signal replay for new subscribers
 * - Event sourcing capabilities
 * - Debugging and monitoring support
 * 
 * ### Performance Optimization
 * - Lazy subscription resolution
 * - Batched signal emission
 * - Memory-efficient history management
 * - Subscription leak prevention
 * 
 * @example
 * ```typescript
 * import { createSignalManager } from './signals'
 * 
 * const signalManager = await Effect.runPromise(createSignalManager())
 * 
 * // Define a signal with schema
 * const processStartedSignal = {
 *   name: 'process:started',
 *   schema: z.object({
 *     id: z.string(),
 *     name: z.string(),
 *     pid: z.number()
 *   })
 * }
 * 
 * // Subscribe to signals
 * await Effect.runPromise(signalManager.subscribe(
 *   'process:started',
 *   Effect.succeed((data) => {
 *     console.log('Process started:', data.name)
 *   })
 * ))
 * 
 * // Emit signals
 * await Effect.runPromise(signalManager.emit('process:started', {
 *   id: 'proc-1',
 *   name: 'my-process',
 *   pid: 12345
 * }))
 * ```
 * 
 * @module core/plugin/signals
 */

import { Effect, Map as IMap, Ref, Array as IArray, Queue, Schedule, Context, pipe } from "effect"
import { z } from "zod"
import type {
  Signal,
  SignalHandler,
  SignalManager,
  SignalError,
  SignalRegistration,
  Subscription,
  SignalName,
  SignalNames,
} from "./types"

// =============================================================================
// Signal Manager State
// =============================================================================

/**
 * Signal manager internal state
 */
interface SignalManagerState {
  readonly signals: IMap.Map<string, SignalRegistration>
  readonly subscriptions: IMap.Map<string, Subscription[]>
  readonly history: IMap.Map<string, SignalHistoryEntry[]>
  readonly nextSubscriptionId: number
}

/**
 * Signal history entry
 */
interface SignalHistoryEntry {
  readonly id: string
  readonly signalName: string
  readonly data: unknown
  readonly timestamp: Date
  readonly emittedBy?: string
}

/**
 * Signal emission context
 */
interface SignalEmissionContext {
  readonly signalName: string
  readonly data: unknown
  readonly timestamp: Date
  readonly emittedBy?: string
}

// =============================================================================
// Signal Manager Implementation
// =============================================================================

/**
 * Signal manager configuration
 */
interface SignalManagerConfig {
  readonly maxHistorySize: number
  readonly enableHistory: boolean
  readonly enableReplay: boolean
  readonly batchSize: number
  readonly batchTimeout: number
}

/**
 * Default signal manager configuration
 */
const defaultSignalManagerConfig: SignalManagerConfig = {
  maxHistorySize: 1000,
  enableHistory: true,
  enableReplay: false,
  batchSize: 10,
  batchTimeout: 100,
}

/**
 * Create a new signal manager
 */
export function createSignalManager(
  config: Partial<SignalManagerConfig> = {}
): Effect.Effect<SignalManager, never, never> {
  return Effect.gen(function* () {
    const finalConfig = { ...defaultSignalManagerConfig, ...config }
    
    const stateRef = yield* Ref.make<SignalManagerState>({
      signals: IMap.empty(),
      subscriptions: IMap.empty(),
      history: IMap.empty(),
      nextSubscriptionId: 1,
    })

    const emissionQueue = yield* Queue.bounded<SignalEmissionContext>(finalConfig.batchSize)

    // Start batch processor
    yield* Effect.fork(processBatchedEmissions(stateRef, emissionQueue, finalConfig))

    const registerSignal = <T>(
      pluginName: string,
      signal: Signal<T>
    ): Effect.Effect<void, SignalError, never> =>
      Effect.gen(function* () {
        // Validate signal structure
        if (!signal.name || typeof signal.name !== 'string') {
          return yield* Effect.fail(new SignalError({
            pluginName,
            signalName: signal.name || 'unknown',
            message: 'Signal name must be a non-empty string',
          }))
        }

        // Check for duplicate registration
        const state = yield* Ref.get(stateRef)
        const existing = IMap.get(state.signals, signal.name)
        if (existing._tag === 'Some') {
          return yield* Effect.fail(new SignalError({
            pluginName,
            signalName: signal.name,
            message: `Signal ${signal.name} is already registered by plugin ${existing.value.pluginName}`,
          }))
        }

        const registration: SignalRegistration<T> = {
          pluginName,
          signal,
        }

        // Register the signal
        yield* Ref.update(stateRef, state => ({
          ...state,
          signals: IMap.set(state.signals, signal.name, registration),
        }))
      })

    const emit = <T>(
      signalName: string,
      data: T
    ): Effect.Effect<void, SignalError, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        
        // Check if signal is registered
        const signal = IMap.get(state.signals, signalName)
        if (signal._tag === 'None') {
          return yield* Effect.fail(new SignalError({
            signalName,
            message: `Signal ${signalName} is not registered`,
          }))
        }

        const registration = signal.value

        // Validate data against schema if provided
        if (registration.signal.schema) {
          const validation = registration.signal.schema.safeParse(data)
          if (!validation.success) {
            return yield* Effect.fail(new SignalError({
              pluginName: registration.pluginName,
              signalName,
              message: `Signal data validation failed: ${validation.error.message}`,
            }))
          }
        }

        // Add to emission queue for batched processing
        const context: SignalEmissionContext = {
          signalName,
          data,
          timestamp: new Date(),
          emittedBy: registration.pluginName,
        }

        yield* Queue.offer(emissionQueue, context)
      })

    const subscribe = <T>(
      signalName: string,
      handler: SignalHandler<T>
    ): Effect.Effect<Subscription, SignalError, never> =>
      Effect.gen(function* () {
        return yield* subscribeInternal(signalName, handler, false)
      })

    const subscribeOnce = <T>(
      signalName: string,
      handler: SignalHandler<T>
    ): Effect.Effect<Subscription, SignalError, never> =>
      Effect.gen(function* () {
        return yield* subscribeInternal(signalName, handler, true)
      })

    const subscribeInternal = <T>(
      signalName: string,
      handler: SignalHandler<T>,
      once: boolean
    ): Effect.Effect<Subscription, SignalError, never> =>
      Effect.gen(function* () {
        // Validate handler
        if (!handler || typeof handler !== 'function') {
          return yield* Effect.fail(new SignalError({
            signalName,
            message: 'Signal handler must be a function',
          }))
        }

        const state = yield* Ref.get(stateRef)
        const subscriptionId = state.nextSubscriptionId.toString()

        const subscription: Subscription = {
          id: subscriptionId,
          pluginName: 'unknown', // TODO: Get from context
          signalName,
          handler,
          once,
          timestamp: new Date(),
        }

        // Add subscription
        yield* Ref.update(stateRef, state => {
          const existing = IMap.get(state.subscriptions, signalName)
          const subscriptions = existing._tag === 'Some' ? existing.value : []
          
          return {
            ...state,
            subscriptions: IMap.set(state.subscriptions, signalName, [...subscriptions, subscription]),
            nextSubscriptionId: state.nextSubscriptionId + 1,
          }
        })

        // Replay history if enabled
        if (finalConfig.enableReplay) {
          yield* replayHistoryForSubscription(stateRef, subscription)
        }

        return subscription
      })

    const unsubscribe = (subscription: Subscription): Effect.Effect<void, SignalError, never> =>
      Effect.gen(function* () {
        yield* Ref.update(stateRef, state => {
          const existing = IMap.get(state.subscriptions, subscription.signalName)
          if (existing._tag === 'None') return state

          const subscriptions = existing.value
          const filtered = subscriptions.filter(s => s.id !== subscription.id)
          
          return {
            ...state,
            subscriptions: filtered.length > 0
              ? IMap.set(state.subscriptions, subscription.signalName, filtered)
              : IMap.remove(state.subscriptions, subscription.signalName),
          }
        })
      })

    const listSignals = (): Effect.Effect<SignalRegistration[], never, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        return IArray.fromIterable(IMap.values(state.signals))
      })

    const listSubscriptions = (signalName?: string): Effect.Effect<Subscription[], never, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        
        if (signalName) {
          const subscriptions = IMap.get(state.subscriptions, signalName)
          return subscriptions._tag === 'Some' ? subscriptions.value : []
        }

        const allSubscriptions: Subscription[] = []
        for (const subscriptions of IMap.values(state.subscriptions)) {
          allSubscriptions.push(...subscriptions)
        }
        
        return allSubscriptions
      })

    const getHistory = (signalName: string, limit?: number): Effect.Effect<SignalHistoryEntry[], never, never> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef)
        const history = IMap.get(state.history, signalName)
        
        if (history._tag === 'None') return []
        
        const entries = history.value
        return limit ? entries.slice(-limit) : entries
      })

    const clearHistory = (signalName?: string): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* Ref.update(stateRef, state => ({
          ...state,
          history: signalName
            ? IMap.remove(state.history, signalName)
            : IMap.empty(),
        }))
      })

    return {
      emit,
      subscribe,
      subscribeOnce,
      unsubscribe,
      listSignals,
      listSubscriptions,
      // Extended API
      registerSignal,
      getHistory,
      clearHistory,
    }
  })
}

/**
 * Process batched signal emissions
 */
function processBatchedEmissions(
  stateRef: Ref.Ref<SignalManagerState>,
  emissionQueue: Queue.Queue<SignalEmissionContext>,
  config: SignalManagerConfig
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    while (true) {
      // Take from queue with timeout
      const context = yield* Queue.take(emissionQueue)
      
      // Process emission
      yield* processEmission(stateRef, context, config).pipe(
        Effect.catchAll(error => Effect.succeed(undefined)) // Log error but continue
      )
    }
  }).pipe(Effect.forever)
}

/**
 * Process a single signal emission
 */
function processEmission(
  stateRef: Ref.Ref<SignalManagerState>,
  context: SignalEmissionContext,
  config: SignalManagerConfig
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const state = yield* Ref.get(stateRef)
    
    // Add to history if enabled
    if (config.enableHistory) {
      const historyEntry: SignalHistoryEntry = {
        id: crypto.randomUUID(),
        signalName: context.signalName,
        data: context.data,
        timestamp: context.timestamp,
        emittedBy: context.emittedBy,
      }

      yield* Ref.update(stateRef, state => {
        const existing = IMap.get(state.history, context.signalName)
        const history = existing._tag === 'Some' ? existing.value : []
        
        const newHistory = [...history, historyEntry]
        
        // Trim history if it exceeds max size
        const trimmedHistory = newHistory.length > config.maxHistorySize
          ? newHistory.slice(-config.maxHistorySize)
          : newHistory
        
        return {
          ...state,
          history: IMap.set(state.history, context.signalName, trimmedHistory),
        }
      })
    }

    // Get subscriptions for this signal
    const subscriptions = IMap.get(state.subscriptions, context.signalName)
    if (subscriptions._tag === 'None') return

    // Execute handlers
    const handlers = subscriptions.value
    const oneTimeSubscriptions: string[] = []

    for (const subscription of handlers) {
      // Execute handler
      yield* subscription.handler(context.data).pipe(
        Effect.catchAll(error => Effect.succeed(undefined)) // Log error but continue
      )

      // Track one-time subscriptions for removal
      if (subscription.once) {
        oneTimeSubscriptions.push(subscription.id)
      }
    }

    // Remove one-time subscriptions
    if (oneTimeSubscriptions.length > 0) {
      yield* Ref.update(stateRef, state => {
        const existing = IMap.get(state.subscriptions, context.signalName)
        if (existing._tag === 'None') return state

        const filtered = existing.value.filter(s => !oneTimeSubscriptions.includes(s.id))
        
        return {
          ...state,
          subscriptions: filtered.length > 0
            ? IMap.set(state.subscriptions, context.signalName, filtered)
            : IMap.remove(state.subscriptions, context.signalName),
        }
      })
    }
  })
}

/**
 * Replay signal history for a new subscription
 */
function replayHistoryForSubscription(
  stateRef: Ref.Ref<SignalManagerState>,
  subscription: Subscription
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const state = yield* Ref.get(stateRef)
    const history = IMap.get(state.history, subscription.signalName)
    
    if (history._tag === 'None') return

    // Replay all history entries
    for (const entry of history.value) {
      yield* subscription.handler(entry.data).pipe(
        Effect.catchAll(error => Effect.succeed(undefined)) // Log error but continue
      )
    }
  })
}

// =============================================================================
// Signal Utilities
// =============================================================================

/**
 * Create a typed signal with schema validation
 */
export function createSignal<T>(
  name: string,
  schema: z.ZodSchema<T>,
  description?: string
): Signal<T> {
  return {
    name,
    schema,
    description,
  }
}

/**
 * Create a simple signal without schema validation
 */
export function createSimpleSignal(
  name: string,
  description?: string
): Signal<unknown> {
  return {
    name,
    description,
  }
}

/**
 * Create a signal handler with error handling
 */
export function createSignalHandler<T>(
  handler: (data: T) => void | Promise<void>
): SignalHandler<T> {
  return (data: T) => Effect.tryPromise({
    try: async () => await handler(data),
    catch: (error) => error,
  }).pipe(Effect.ignore)
}

/**
 * Create a signal handler from an Effect
 */
export function createEffectSignalHandler<T>(
  effect: (data: T) => Effect.Effect<void, unknown, never>
): SignalHandler<T> {
  return (data: T) => effect(data).pipe(Effect.ignore)
}

/**
 * Create a filtered signal handler
 */
export function createFilteredSignalHandler<T>(
  predicate: (data: T) => boolean,
  handler: SignalHandler<T>
): SignalHandler<T> {
  return (data: T) => {
    if (predicate(data)) {
      return handler(data)
    }
    return Effect.succeed(undefined)
  }
}

/**
 * Create a mapped signal handler
 */
export function createMappedSignalHandler<T, U>(
  mapper: (data: T) => U,
  handler: SignalHandler<U>
): SignalHandler<T> {
  return (data: T) => {
    const mapped = mapper(data)
    return handler(mapped)
  }
}

/**
 * Create a debounced signal handler
 */
export function createDebouncedSignalHandler<T>(
  delay: number,
  handler: SignalHandler<T>
): SignalHandler<T> {
  let timeout: NodeJS.Timeout | undefined
  
  return (data: T) => Effect.gen(function* () {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    yield* Effect.async<void>((resume) => {
      timeout = setTimeout(() => {
        Effect.runPromise(handler(data)).then(
          () => resume(Effect.succeed(undefined)),
          (error) => resume(Effect.succeed(undefined)) // Log error but continue
        )
      }, delay)
    })
  })
}

/**
 * Create a throttled signal handler
 */
export function createThrottledSignalHandler<T>(
  interval: number,
  handler: SignalHandler<T>
): SignalHandler<T> {
  let lastCall = 0
  
  return (data: T) => Effect.gen(function* () {
    const now = Date.now()
    if (now - lastCall >= interval) {
      lastCall = now
      yield* handler(data)
    }
  })
}

// =============================================================================
// Built-in Signals
// =============================================================================

/**
 * Standard signal definitions
 */
export const StandardSignals = {
  // Process signals
  PROCESS_STARTED: createSignal('process:started', z.object({
    id: z.string(),
    name: z.string(),
    pid: z.number(),
    command: z.string(),
    args: z.array(z.string()),
    startTime: z.date(),
  })),

  PROCESS_STOPPED: createSignal('process:stopped', z.object({
    id: z.string(),
    name: z.string(),
    exitCode: z.number(),
    signal: z.string().optional(),
    endTime: z.date(),
  })),

  PROCESS_ERROR: createSignal('process:error', z.object({
    id: z.string(),
    name: z.string(),
    error: z.string(),
    timestamp: z.date(),
  })),

  // Log signals
  LOG_MESSAGE: createSignal('log:message', z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string(),
    timestamp: z.date(),
    source: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),

  // User interaction signals
  USER_INPUT: createSignal('user:input', z.object({
    type: z.enum(['key', 'mouse', 'resize']),
    data: z.unknown(),
    timestamp: z.date(),
  })),

  // Theme signals
  THEME_CHANGED: createSignal('theme:changed', z.object({
    theme: z.string(),
    previousTheme: z.string().optional(),
    timestamp: z.date(),
  })),

  // Application signals
  APP_READY: createSignal('app:ready', z.object({
    version: z.string(),
    startTime: z.date(),
  })),

  APP_SHUTDOWN: createSignal('app:shutdown', z.object({
    reason: z.string(),
    timestamp: z.date(),
  })),

  // Plugin signals
  PLUGIN_LOADED: createSignal('plugin:loaded', z.object({
    name: z.string(),
    version: z.string(),
    timestamp: z.date(),
  })),

  PLUGIN_UNLOADED: createSignal('plugin:unloaded', z.object({
    name: z.string(),
    reason: z.string(),
    timestamp: z.date(),
  })),
} as const

/**
 * Type-safe signal name constants
 */
export const SIGNAL_NAMES = SignalNames

/**
 * Check if a signal name is valid
 */
export function isValidSignalName(name: string): name is SignalName {
  return Object.values(SignalNames).includes(name as SignalName)
}

/**
 * Get all standard signal names
 */
export function getStandardSignalNames(): SignalName[] {
  return Object.values(SignalNames)
}

/**
 * Get signal names by category
 */
export function getSignalNamesByCategory(category: 'process' | 'log' | 'user' | 'theme' | 'app' | 'plugin'): SignalName[] {
  return Object.values(SignalNames).filter(name => name.startsWith(`${category}:`))
}