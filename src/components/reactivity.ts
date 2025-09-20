/**
 * Reactivity Primitives
 * 
 * Svelte 5-inspired reactive state management
 */

import { Effect } from "effect"

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

// Simple batching implementation
let batchDepth = 0
const pendingNotifications = new Map<Signal<any>, any>()

function enqueueNotification<T>(signal: Signal<T>, value: T) {
  if (batchDepth > 0) {
    pendingNotifications.set(signal, value)
  } else {
    // flush immediately when not batching
    notifySubscribers(signal, value)
  }
}

function flushNotifications() {
  // Drain the queue, allowing cascading updates produced during notify
  while (pendingNotifications.size > 0) {
    const entries = Array.from(pendingNotifications.entries())
    pendingNotifications.clear()
    for (const [sig, val] of entries) {
      notifySubscribers(sig as any, val)
    }
  }
}

function notifySubscribers<T>(signal: Signal<T>, value: T) {
  // We rely on a hidden property where we stored subscribers on signal creation
  const subs: Set<(v: T) => void> | undefined = (signal as any).__subs
  if (!subs) return
  subs.forEach((callback) => {
    try {
      callback(value)
    } catch (error) {
      console.error("Error in signal subscription:", error)
    }
  })
}

/**
 * Create a reactive signal
 */
export function $state<T>(initial: T): Signal<T> {
  let current = initial
  const subscribers = new Set<(value: T) => void>()
  
  const signal = (() => {
    // Track dependency if we're in an effect
    if (reactivityContext.tracking) {
      reactivityContext.dependencies.add(signal)
    }
    return current
  }) as Signal<T>
  // Expose subscribers for batching notify
  ;(signal as any).__subs = subscribers
  
  signal.set = (value: T) => {
    const oldValue = current
    if (oldValue !== value) {
      current = value
      enqueueNotification(signal, value)
    }
  }
  
  signal.update = (updater: (current: T) => T) => {
    const next = updater(current)
    signal.set(next)
  }
  
  signal.subscribe = (callback: (value: T) => void) => {
    subscribers.add(callback)
    // Do not call immediately to avoid re-entrancy issues
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
  const signal = $state<T>(undefined as unknown as T)
  let dependencies = new Set<Signal<any>>()
  
  // Track dependencies during computation and capture the resulting set
  const trackDependencies = () => {
    const prevTracking = reactivityContext.tracking
    const prevDependencies = new Set(reactivityContext.dependencies)
    
    reactivityContext.tracking = true
    reactivityContext.dependencies.clear()
    
    try {
      const value = computation()
      const nextDependencies = new Set<Signal<any>>()
      reactivityContext.dependencies.forEach(dep => nextDependencies.add(dep))
      return { value, nextDependencies }
    } finally {
      reactivityContext.tracking = prevTracking
      reactivityContext.dependencies = prevDependencies
    }
  }
  
  // Subscribe to all dependencies
  const subscriptions: Array<() => void> = []

  function refreshSubscriptions(newDependencies: Set<Signal<any>>) {
    subscriptions.forEach(unsub => unsub())
    subscriptions.length = 0

    dependencies = newDependencies

    dependencies.forEach(dep => {
      const unsubscribe = dep.subscribe(() => {
        updateDerived()
      })
      subscriptions.push(unsubscribe)
    })
  }

  function updateDerived() {
    const { value, nextDependencies } = trackDependencies()
    const needsRefresh =
      nextDependencies.size !== dependencies.size ||
      Array.from(nextDependencies).some(dep => !dependencies.has(dep))

    signal.set(value)

    if (needsRefresh) {
      refreshSubscriptions(nextDependencies)
    }
  }

  // Initial setup
  const initial = trackDependencies()
  signal.set(initial.value)
  refreshSubscriptions(initial.nextDependencies)
  
  const derivedSignal = (() => signal()) as ReadonlySignal<T>
  derivedSignal.subscribe = signal.subscribe
  
  return derivedSignal
}

/**
 * Create a reactive effect that runs when dependencies change
 */
export function $effect(fn: () => void | (() => void)):
  Effect.Effect<() => void> {
  let dependencies = new Set<Signal<any>>()
  let cleanup: (() => void) | void
  let subscriptions: Array<() => void> = []
  
  const runEffect = () => {
    // Clean up previous effect
    if (cleanup) {
      cleanup()
      cleanup = undefined
    }
    
    // Track dependencies
    const prevTracking = reactivityContext.tracking
    const prevDependencies = new Set(reactivityContext.dependencies)
    
    reactivityContext.tracking = true
    reactivityContext.dependencies.clear()
    
    try {
      cleanup = fn()
      const nextDependencies = new Set<Signal<any>>()
      reactivityContext.dependencies.forEach(dep => nextDependencies.add(dep))
      const needsRefresh =
        nextDependencies.size !== dependencies.size ||
        Array.from(nextDependencies).some(dep => !dependencies.has(dep))

      if (needsRefresh) {
        subscriptions.forEach(unsub => unsub())
        subscriptions = []
        dependencies = nextDependencies
        dependencies.forEach(dep => {
          const unsubscribe = dep.subscribe(() => {
            runEffect()
          })
          subscriptions.push(unsubscribe)
        })
      } else {
        dependencies = nextDependencies
      }
    } finally {
      reactivityContext.tracking = prevTracking
      reactivityContext.dependencies = prevDependencies
    }
  }
  
  // Return an Effect that runs the effect immediately and yields a cleanup
  return Effect.sync(() => {
    runEffect()
    return () => {
      if (cleanup) cleanup()
      subscriptions.forEach((unsub) => unsub())
    }
  })
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
export function batch<T>(fn: () => T): T {
  batchDepth++
  let result!: T
  try {
    result = fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      flushNotifications()
    }
  }
  return result
}

/**
 * Create a signal that debounces updates
 */
export function $debounced<T>(signal: Signal<T>, delay: number): ReadonlySignal<T> {
  const debouncedSignal = $state(signal())
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
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
