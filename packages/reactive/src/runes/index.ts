/**
 * Core Rune System - Svelte 5 Compatible Reactive Primitives
 * 
 * This module provides the core reactive system for TUIX, implementing
 * Svelte 5 runes ($state, $derived, $effect) with full Effect.ts integration.
 * 
 * The system supports:
 * - Reactive state management with $state
 * - Computed values with automatic dependency tracking via $derived
 * - Side effects with cleanup via $effect
 * - Full type safety with generics
 * - Effect.ts integration for async operations
 * 
 * @example
 * ```typescript
 * import { $state, $derived, $effect } from '@tuix/reactive'
 * 
 * // Basic state management
 * const state = $state({ count: 0 })
 * 
 * // Derived values
 * const doubled = $derived(() => state.value.count * 2)
 * 
 * // Side effects
 * $effect(() => {
 *   console.log('Count changed:', state.value.count)
 * })
 * ```
 */

import { Effect } from "effect"

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Base interface for all reactive values
 */
export interface ReactiveValue<T> {
  readonly value: T
  readonly $reactive: true
  readonly $type: string
}

/**
 * State interface for reactive state management
 * 
 * State objects are mutable reactive containers that notify subscribers
 * when their value changes. They support both direct value updates
 * and functional updates.
 * 
 * @template T - The type of the stored value
 */
export interface State<T> extends ReactiveValue<T> {
  readonly $type: 'state'
  
  /**
   * Set the state to a new value
   * @param value - The new value
   */
  set(value: T): void
  
  /**
   * Update the state using a function
   * @param fn - Function that receives current value and returns new value
   */
  update(fn: (value: T) => T): void
  
  /**
   * Subscribe to state changes
   * @param fn - Callback function called when state changes
   * @returns Unsubscribe function
   */
  subscribe(fn: (value: T) => void): () => void
}

/**
 * Derived interface for computed reactive values
 * 
 * Derived values automatically recalculate when their dependencies change.
 * They are read-only and maintain their own subscription system.
 * 
 * @template T - The type of the computed value
 */
export interface Derived<T> extends ReactiveValue<T> {
  readonly $type: 'derived'
  
  /**
   * Subscribe to derived value changes
   * @param fn - Callback function called when derived value changes
   * @returns Unsubscribe function
   */
  subscribe(fn: (value: T) => void): () => void
}

/**
 * Effect cleanup function type
 */
export interface EffectCleanup {
  (): void
}

/**
 * Effect function type that can optionally return cleanup
 */
export type EffectFunction = () => void | EffectCleanup | Effect.Effect<void | EffectCleanup, never, any>

// =============================================================================
// Dependency Tracking System
// =============================================================================

/**
 * Dependency tracking context for reactive computations
 */
interface ReactiveContext {
  tracking: boolean
  dependencies: Set<ReactiveValue<any>>
  computeCallback?: () => void
}

/**
 * Global reactive context stack for proper nesting support
 */
const contextStack: ReactiveContext[] = []

/**
 * Get the current reactive context
 */
function getCurrentContext(): ReactiveContext | undefined {
  return contextStack[contextStack.length - 1]
}

/**
 * Track a dependency in the current reactive context
 */
function trackDependency<T>(reactive: ReactiveValue<T>): void {
  const context = getCurrentContext()
  if (context?.tracking) {
    context.dependencies.add(reactive)
  }
}

/**
 * Run a function with dependency tracking
 */
function withTracking<T>(fn: () => T): [T, Set<ReactiveValue<any>>] {
  const context: ReactiveContext = {
    tracking: true,
    dependencies: new Set()
  }
  
  contextStack.push(context)
  
  try {
    const result = fn()
    return [result, context.dependencies]
  } finally {
    contextStack.pop()
  }
}

// =============================================================================
// Core Implementation
// =============================================================================

/**
 * Creates a reactive state value
 * 
 * State values are the foundation of the reactive system. They store mutable
 * values and notify subscribers when changes occur.
 * 
 * @param initial - Initial value for the state
 * @returns State object with reactive capabilities
 * 
 * @example
 * ```typescript
 * const counter = $state({ count: 0 })
 * 
 * // Update state
 * counter.set({ count: 1 })
 * counter.update(state => ({ count: state.count + 1 }))
 * 
 * // Subscribe to changes
 * const unsubscribe = counter.subscribe(state => {
 *   console.log('Counter:', state.count)
 * })
 * ```
 */
export function $state<T>(initial: T): State<T> {
  let currentValue = initial
  const subscribers = new Set<(value: T) => void>()
  
  const state: State<T> = {
    $reactive: true,
    $type: 'state',
    
    get value(): T {
      trackDependency(state)
      return currentValue
    },
    
    set(value: T): void {
      if (currentValue !== value) {
        currentValue = value
        notifySubscribers()
      }
    },
    
    update(fn: (value: T) => T): void {
      state.set(fn(currentValue))
    },
    
    subscribe(fn: (value: T) => void): () => void {
      subscribers.add(fn)
      // Immediate call with current value
      fn(currentValue)
      
      return () => {
        subscribers.delete(fn)
      }
    }
  }
  
  function notifySubscribers(): void {
    subscribers.forEach(fn => {
      try {
        fn(currentValue)
      } catch (error) {
        console.error('Error in state subscriber:', error)
      }
    })
  }
  
  return state
}

/**
 * Creates a derived reactive value
 * 
 * Derived values automatically recalculate when their dependencies change.
 * They use dependency tracking to determine which reactive values they
 * depend on and automatically subscribe to those dependencies.
 * 
 * @param fn - Computation function that returns the derived value
 * @returns Derived object with reactive capabilities
 * 
 * @example
 * ```typescript
 * const state = $state({ count: 0 })
 * const doubled = $derived(() => state.value.count * 2)
 * 
 * // Subscribe to derived changes
 * derived.subscribe(value => {
 *   console.log('Doubled:', value)
 * })
 * 
 * state.set({ count: 5 }) // Triggers derived recalculation
 * ```
 */
export function $derived<T>(fn: () => T): Derived<T> {
  let currentValue: T
  let dependencies = new Set<ReactiveValue<any>>()
  let subscriptions = new Map<ReactiveValue<any>, () => void>()
  const subscribers = new Set<(value: T) => void>()
  let isComputing = false
  
  // Initial computation with dependency tracking
  function recompute(): void {
    if (isComputing) return // Prevent infinite loops
    
    isComputing = true
    
    try {
      // Clear old subscriptions
      subscriptions.forEach(unsubscribe => unsubscribe())
      subscriptions.clear()
      
      // Compute with dependency tracking
      const [newValue, newDependencies] = withTracking(fn)
      
      // Check if value actually changed
      if (currentValue !== newValue) {
        currentValue = newValue
        notifySubscribers()
      }
      
      // Update dependencies
      dependencies = newDependencies
      
      // Subscribe to new dependencies
      dependencies.forEach(dep => {
        if ('subscribe' in dep) {
          const unsubscribe = dep.subscribe(() => {
            recompute()
          })
          subscriptions.set(dep, unsubscribe)
        }
      })
    } finally {
      isComputing = false
    }
  }
  
  // Initial computation
  recompute()
  
  const derived: Derived<T> = {
    $reactive: true,
    $type: 'derived',
    
    get value(): T {
      trackDependency(derived)
      return currentValue
    },
    
    subscribe(fn: (value: T) => void): () => void {
      subscribers.add(fn)
      // Immediate call with current value
      fn(currentValue)
      
      return () => {
        subscribers.delete(fn)
      }
    }
  }
  
  function notifySubscribers(): void {
    subscribers.forEach(fn => {
      try {
        fn(currentValue)
      } catch (error) {
        console.error('Error in derived subscriber:', error)
      }
    })
  }
  
  return derived
}

/**
 * Creates a reactive effect
 * 
 * Effects run side effects that depend on reactive values. They automatically
 * track their dependencies and re-run when those dependencies change.
 * Effects can return cleanup functions that are called before re-running
 * or when the effect is disposed.
 * 
 * @param fn - Effect function that may return a cleanup function
 * @returns Cleanup function to dispose the effect
 * 
 * @example
 * ```typescript
 * const state = $state({ count: 0 })
 * 
 * // Basic effect
 * const dispose = $effect(() => {
 *   console.log('Count is:', state.value.count)
 * })
 * 
 * // Effect with cleanup
 * $effect(() => {
 *   const timer = setInterval(() => {
 *     console.log('Timer tick')
 *   }, 1000)
 *   
 *   return () => {
 *     clearInterval(timer)
 *   }
 * })
 * 
 * // Effect with async Effect.ts integration
 * $effect(() => {
 *   return Effect.gen(function*() {
 *     const data = yield* fetchData()
 *     updateUI(data)
 *     
 *     return () => {
 *       // Cleanup function
 *       cleanup()
 *     }
 *   })
 * })
 * ```
 */
export function $effect(fn: EffectFunction): () => void {
  let cleanup: EffectCleanup | undefined
  let dependencies = new Set<ReactiveValue<any>>()
  let subscriptions = new Map<ReactiveValue<any>, () => void>()
  let isRunning = false
  let disposed = false
  
  function runEffect(): void {
    if (isRunning || disposed) return
    
    isRunning = true
    
    try {
      // Cleanup previous effect
      if (cleanup) {
        cleanup()
        cleanup = undefined
      }
      
      // Clear old subscriptions
      subscriptions.forEach(unsubscribe => unsubscribe())
      subscriptions.clear()
      
      // Run effect with dependency tracking
      const [result, newDependencies] = withTracking(fn)
      
      // Handle result
      if (result) {
        if (Effect.isEffect(result)) {
          // Handle Effect.ts result
          Effect.runPromise(result).then(effectCleanup => {
            if (typeof effectCleanup === 'function') {
              cleanup = effectCleanup
            }
          }).catch(error => {
            console.error('Error in async effect:', error)
          })
        } else if (typeof result === 'function') {
          // Direct cleanup function
          cleanup = result
        }
      }
      
      // Update dependencies
      dependencies = newDependencies
      
      // Subscribe to new dependencies
      dependencies.forEach(dep => {
        if ('subscribe' in dep) {
          const unsubscribe = dep.subscribe(() => {
            runEffect()
          })
          subscriptions.set(dep, unsubscribe)
        }
      })
    } catch (error) {
      console.error('Error in effect:', error)
    } finally {
      isRunning = false
    }
  }
  
  // Initial run
  runEffect()
  
  // Return dispose function
  return () => {
    disposed = true
    if (cleanup) {
      cleanup()
    }
    subscriptions.forEach(unsubscribe => unsubscribe())
    subscriptions.clear()
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a reactive value
 */
export function isReactive<T>(value: any): value is ReactiveValue<T> {
  return value && typeof value === 'object' && value.$reactive === true
}

/**
 * Type guard to check if a value is a state
 */
export function isState<T>(value: any): value is State<T> {
  return isReactive(value) && value.$type === 'state'
}

/**
 * Type guard to check if a value is a derived value
 */
export function isDerived<T>(value: any): value is Derived<T> {
  return isReactive(value) && value.$type === 'derived'
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the current value from any reactive value
 */
export function getValue<T>(reactive: ReactiveValue<T>): T {
  return reactive.value
}

/**
 * Create a batch update context
 * 
 * Batching allows multiple state updates to be processed together,
 * reducing the number of derived value recalculations and effect runs.
 */
export function batch(fn: () => void): void {
  // For now, just run the function
  // In a more sophisticated implementation, this would defer notifications
  fn()
}

/**
 * Untrack a computation to prevent dependency tracking
 * 
 * Sometimes you need to access reactive values without creating dependencies.
 * This function allows that by temporarily disabling dependency tracking.
 */
export function untrack<T>(fn: () => T): T {
  const context = getCurrentContext()
  if (context) {
    const wasTracking = context.tracking
    context.tracking = false
    try {
      return fn()
    } finally {
      context.tracking = wasTracking
    }
  }
  return fn()
}