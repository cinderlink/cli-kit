/**
 * Reactivity Primitives
 * 
 * Svelte 5-inspired reactive state management
 */

import { Effect, Ref, Queue } from "effect"

export interface Signal<T> {
  (): T
  set: (value: T) => void
  update: (updater: (current: T) => T) => void
  subscribe: (callback: (value: T) => void) => () => void
}

export interface ReadonlySignal<T> {
  (): T
  subscribe: (callback: (value: T) => void) => () => void
}

// Global reactivity context
interface ReactivityContext {
  tracking: boolean
  currentEffect: Effect.Effect<void> | null
  dependencies: Set<Signal<any>>
}

const reactivityContext: ReactivityContext = {
  tracking: false,
  currentEffect: null,
  dependencies: new Set()
}

/**
 * Create a reactive signal
 */
export function $state<T>(initial: T): Signal<T> {
  const ref = Ref.make(initial)
  const subscribers = new Set<(value: T) => void>()
  
  const signal = (() => {
    // Track dependency if we're in an effect
    if (reactivityContext.tracking) {
      reactivityContext.dependencies.add(signal)
    }
    return Effect.runSync(Ref.get(ref))
  }) as Signal<T>
  
  signal.set = (value: T) => {
    const oldValue = Effect.runSync(Ref.get(ref))
    if (oldValue !== value) {
      Effect.runSync(Ref.set(ref, value))
      // Notify all subscribers
      subscribers.forEach(callback => {
        try {
          callback(value)
        } catch (error) {
          console.error("Error in signal subscription:", error)
        }
      })
    }
  }
  
  signal.update = (updater: (current: T) => T) => {
    const current = Effect.runSync(Ref.get(ref))
    signal.set(updater(current))
  }
  
  signal.subscribe = (callback: (value: T) => void) => {
    subscribers.add(callback)
    // Call immediately with current value
    callback(Effect.runSync(Ref.get(ref)))
    
    // Return unsubscribe function
    return () => {
      subscribers.delete(callback)
    }
  }
  
  return signal
}

/**
 * Create a derived signal that automatically updates when dependencies change
 */
export function $derived<T>(computation: () => T): ReadonlySignal<T> {
  const signal = $state(computation())
  const dependencies = new Set<Signal<any>>()
  
  // Track dependencies during initial computation
  const trackDependencies = () => {
    const prevTracking = reactivityContext.tracking
    const prevDependencies = new Set(reactivityContext.dependencies)
    
    reactivityContext.tracking = true
    reactivityContext.dependencies.clear()
    
    try {
      const value = computation()
      
      // Update dependencies
      dependencies.clear()
      reactivityContext.dependencies.forEach(dep => dependencies.add(dep))
      
      return value
    } finally {
      reactivityContext.tracking = prevTracking
      reactivityContext.dependencies = prevDependencies
    }
  }
  
  // Subscribe to all dependencies
  const subscriptions: Array<() => void> = []
  const updateDerived = () => {
    // Clean up old subscriptions
    subscriptions.forEach(unsub => unsub())
    subscriptions.length = 0
    
    // Recompute and track new dependencies
    const newValue = trackDependencies()
    signal.set(newValue)
    
    // Subscribe to new dependencies
    dependencies.forEach(dep => {
      const unsubscribe = dep.subscribe(() => {
        const updatedValue = trackDependencies()
        signal.set(updatedValue)
      })
      subscriptions.push(unsubscribe)
    })
  }
  
  // Initial setup
  updateDerived()
  
  const derivedSignal = (() => signal()) as ReadonlySignal<T>
  derivedSignal.subscribe = signal.subscribe
  
  return derivedSignal
}

/**
 * Create a reactive effect that runs when dependencies change
 */
export function $effect(fn: () => void | (() => void)): () => void {
  const dependencies = new Set<Signal<any>>()
  let cleanup: (() => void) | void
  let subscriptions: Array<() => void> = []
  
  const runEffect = () => {
    // Clean up previous effect
    if (cleanup) {
      cleanup()
      cleanup = undefined
    }
    
    // Clean up old subscriptions
    subscriptions.forEach(unsub => unsub())
    subscriptions.length = 0
    
    // Track dependencies
    const prevTracking = reactivityContext.tracking
    const prevDependencies = new Set(reactivityContext.dependencies)
    
    reactivityContext.tracking = true
    reactivityContext.dependencies.clear()
    
    try {
      cleanup = fn()
      
      // Update dependencies
      dependencies.clear()
      reactivityContext.dependencies.forEach(dep => dependencies.add(dep))
      
      // Subscribe to dependencies
      dependencies.forEach(dep => {
        const unsubscribe = dep.subscribe(() => {
          runEffect()
        })
        subscriptions.push(unsubscribe)
      })
      
    } finally {
      reactivityContext.tracking = prevTracking
      reactivityContext.dependencies = prevDependencies
    }
  }
  
  // Run effect initially
  runEffect()
  
  // Return cleanup function
  return () => {
    if (cleanup) {
      cleanup()
    }
    subscriptions.forEach(unsub => unsub())
  }
}

/**
 * Create a store - a signal with additional utilities
 */
export function createStore<T extends Record<string, any>>(initial: T) {
  const signal = $state(initial)
  
  return {
    ...signal,
    
    // Update specific property
    setProperty<K extends keyof T>(key: K, value: T[K]) {
      signal.update(state => ({
        ...state,
        [key]: value
      }))
    },
    
    // Update multiple properties
    patch(partial: Partial<T>) {
      signal.update(state => ({
        ...state,
        ...partial
      }))
    },
    
    // Reset to initial state
    reset() {
      signal.set(initial)
    }
  }
}

/**
 * Create a computed signal that memoizes expensive calculations
 */
export function $memo<T>(computation: () => T, dependencies?: ReadonlySignal<any>[]): ReadonlySignal<T> {
  if (dependencies) {
    // Use explicit dependencies
    const signal = $state(computation())
    
    const updateMemo = () => {
      signal.set(computation())
    }
    
    dependencies.forEach(dep => {
      dep.subscribe(updateMemo)
    })
    
    const memoSignal = (() => signal()) as ReadonlySignal<T>
    memoSignal.subscribe = signal.subscribe
    
    return memoSignal
  } else {
    // Auto-track dependencies
    return $derived(computation)
  }
}

/**
 * Batch multiple signal updates to avoid unnecessary recalculations
 */
export function batch(fn: () => void) {
  // Simple implementation - in a real system this would defer updates
  fn()
}

/**
 * Create a signal that debounces updates
 */
export function $debounced<T>(signal: Signal<T>, delay: number): ReadonlySignal<T> {
  const debouncedSignal = $state(signal())
  let timeoutId: NodeJS.Timeout | null = null
  
  signal.subscribe(value => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      debouncedSignal.set(value)
      timeoutId = null
    }, delay)
  })
  
  const readonlySignal = (() => debouncedSignal()) as ReadonlySignal<T>
  readonlySignal.subscribe = debouncedSignal.subscribe
  
  return readonlySignal
}

/**
 * Create a signal that throttles updates
 */
export function $throttled<T>(signal: Signal<T>, delay: number): ReadonlySignal<T> {
  const throttledSignal = $state(signal())
  let lastUpdate = 0
  
  signal.subscribe(value => {
    const now = Date.now()
    if (now - lastUpdate >= delay) {
      throttledSignal.set(value)
      lastUpdate = now
    }
  })
  
  const readonlySignal = (() => throttledSignal()) as ReadonlySignal<T>
  readonlySignal.subscribe = throttledSignal.subscribe
  
  return readonlySignal
}