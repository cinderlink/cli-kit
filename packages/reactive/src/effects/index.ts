/**
 * Advanced Effect System
 * 
 * Provides sophisticated side effect management with scheduling, batching,
 * lifecycle integration, and advanced cleanup capabilities. This builds on
 * the core $effect implementation for production-ready effect management.
 * 
 * Features:
 * - Effect scheduling and batching
 * - Component lifecycle integration
 * - Resource management with cleanup
 * - Async effects with cancellation
 * - Effect composition and chaining
 * 
 * @example
 * ```typescript
 * import { createEffect, createScheduler, onCleanup, onMount } from '@tuix/reactive/effects'
 * 
 * // Advanced effect with lifecycle
 * const effect = createEffect(() => {
 *   const timer = setInterval(() => console.log('tick'), 1000)
 *   onCleanup(() => clearInterval(timer))
 * })
 * 
 * // Async effect with cancellation
 * createAsyncEffect(() => 
 *   Effect.gen(function*() {
 *     const data = yield* fetchData()
 *     updateUI(data)
 *   })
 * )
 * ```
 */

import { $effect, EffectFunction, ReactiveValue, getValue } from '../runes'
import { Effect, Schedule } from "effect"

// =============================================================================
// Effect System Interfaces
// =============================================================================

/**
 * Effect handle for lifecycle management
 */
export interface EffectHandle {
  /**
   * Dispose the effect and run cleanup
   */
  dispose(): void
  
  /**
   * Check if effect is disposed
   */
  readonly disposed: boolean
  
  /**
   * Effect ID for tracking
   */
  readonly id: string
  
  /**
   * Effect status
   */
  readonly status: 'idle' | 'running' | 'completed' | 'error' | 'disposed'
}

/**
 * Scheduled effect with timing control
 */
export interface ScheduledEffect extends EffectHandle {
  /**
   * Schedule the effect to run after delay
   */
  schedule(delay: number): void
  
  /**
   * Cancel scheduled execution
   */
  cancel(): void
  
  /**
   * Check if effect is scheduled
   */
  readonly scheduled: boolean
}

/**
 * Async effect with status tracking
 */
export interface AsyncEffectHandle extends EffectHandle {
  /**
   * Last error if execution failed
   */
  readonly error: any
  
  /**
   * Retry the async effect
   */
  retry(): void
  
  /**
   * Cancel ongoing async operation
   */
  cancel(): void
}

/**
 * Effect scheduler for batching and optimization
 */
export interface EffectScheduler {
  /**
   * Schedule an effect to run
   */
  schedule(effect: () => void): void
  
  /**
   * Flush all scheduled effects immediately
   */
  flush(): void
  
  /**
   * Start the scheduler
   */
  start(): void
  
  /**
   * Stop the scheduler
   */
  stop(): void
  
  /**
   * Get scheduler statistics
   */
  getStats(): {
    pending: number
    executed: number
    errors: number
  }
}

// =============================================================================
// Effect Registry and Management
// =============================================================================

/**
 * Global effect registry for tracking and cleanup
 */
class EffectRegistry {
  private effects = new Map<string, EffectHandle>()
  private cleanupQueue: Array<() => void> = []
  private nextId = 0
  
  register(effect: EffectHandle): void {
    this.effects.set(effect.id, effect)
  }
  
  unregister(id: string): void {
    this.effects.delete(id)
  }
  
  scheduleCleanup(cleanup: () => void): void {
    this.cleanupQueue.push(cleanup)
  }
  
  flushCleanup(): void {
    const queue = [...this.cleanupQueue]
    this.cleanupQueue = []
    
    queue.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.error('Error during effect cleanup:', error)
      }
    })
  }
  
  disposeAll(): void {
    this.effects.forEach(effect => {
      try {
        effect.dispose()
      } catch (error) {
        console.error('Error disposing effect:', error)
      }
    })
    this.effects.clear()
    this.flushCleanup()
  }
  
  generateId(): string {
    return `effect_${++this.nextId}`
  }
  
  getStats() {
    return {
      active: this.effects.size,
      pendingCleanup: this.cleanupQueue.length
    }
  }
}

const globalRegistry = new EffectRegistry()

// =============================================================================
// Cleanup Context Management
// =============================================================================

/**
 * Cleanup context for effect cleanup registration
 */
interface CleanupContext {
  cleanups: Array<() => void>
  disposed: boolean
}

const cleanupStack: CleanupContext[] = []

/**
 * Get the current cleanup context
 */
function getCurrentCleanupContext(): CleanupContext | undefined {
  return cleanupStack[cleanupStack.length - 1]
}

/**
 * Register a cleanup function in the current effect context
 * 
 * @param cleanup - Cleanup function to register
 */
export function onCleanup(cleanup: () => void): void {
  const context = getCurrentCleanupContext()
  if (context && !context.disposed) {
    context.cleanups.push(cleanup)
  } else {
    console.warn('onCleanup called outside of effect context')
  }
}

// =============================================================================
// Lifecycle Hooks
// =============================================================================

/**
 * Component lifecycle phases
 */
export type LifecyclePhase = 
  | 'mounting'
  | 'mounted'
  | 'updating'
  | 'updated'
  | 'unmounting'
  | 'unmounted'

/**
 * Lifecycle context
 */
interface LifecycleContext {
  phase: LifecyclePhase
  componentId: string
  effects: EffectHandle[]
}

const lifecycleStack: LifecycleContext[] = []

/**
 * Get current lifecycle context
 */
function getCurrentLifecycleContext(): LifecycleContext | undefined {
  return lifecycleStack[lifecycleStack.length - 1]
}

/**
 * Create an effect that runs during component mount
 */
export function onMount(fn: EffectFunction): EffectHandle {
  return createEffect(() => {
    const context = getCurrentLifecycleContext()
    if (context?.phase === 'mounting' || context?.phase === 'mounted') {
      return fn()
    }
  })
}

/**
 * Create an effect that runs before component unmount
 */
export function onUnmount(fn: () => void): void {
  onCleanup(fn)
}

/**
 * Create an effect that runs after each update
 */
export function afterUpdate(fn: EffectFunction): EffectHandle {
  return createEffect(() => {
    const context = getCurrentLifecycleContext()
    if (context?.phase === 'updated') {
      return fn()
    }
  })
}

// =============================================================================
// Advanced Effect Implementations
// =============================================================================

/**
 * Creates a managed effect with comprehensive lifecycle support
 * 
 * @param fn - Effect function
 * @param options - Effect options
 * @returns Effect handle for lifecycle management
 */
export function createEffect(
  fn: EffectFunction,
  options: {
    immediate?: boolean
    errorHandler?: (error: any) => void
    onStatusChange?: (status: EffectHandle['status']) => void
  } = {}
): EffectHandle {
  const id = globalRegistry.generateId()
  let disposed = false
  let disposeCallback: (() => void) | undefined
  let status: EffectHandle['status'] = 'idle'
  
  const cleanupContext: CleanupContext = {
    cleanups: [],
    disposed: false
  }
  
  function setStatus(newStatus: EffectHandle['status']) {
    status = newStatus
    options.onStatusChange?.(status)
  }
  
  function runWithCleanupContext() {
    cleanupStack.push(cleanupContext)
    try {
      setStatus('running')
      const result = fn()
      setStatus('completed')
      return result
    } catch (error) {
      setStatus('error')
      if (options.errorHandler) {
        options.errorHandler(error)
      } else {
        console.error('Error in effect:', error)
      }
    } finally {
      cleanupStack.pop()
    }
  }
  
  if (options.immediate !== false) {
    disposeCallback = $effect(() => {
      if (disposed) return
      return runWithCleanupContext()
    })
  }
  
  const handle: EffectHandle = {
    id,
    
    get disposed(): boolean {
      return disposed
    },
    
    get status(): EffectHandle['status'] {
      return status
    },
    
    dispose(): void {
      if (disposed) return
      
      disposed = true
      cleanupContext.disposed = true
      setStatus('disposed')
      
      // Run registered cleanups
      cleanupContext.cleanups.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.error('Error in cleanup function:', error)
        }
      })
      
      // Run effect disposal
      if (disposeCallback) {
        disposeCallback()
      }
      
      globalRegistry.unregister(id)
    }
  }
  
  globalRegistry.register(handle)
  return handle
}

/**
 * Creates a scheduled effect with timing control
 * 
 * @param fn - Effect function
 * @param options - Scheduling options
 * @returns Scheduled effect handle
 */
export function createScheduledEffect(
  fn: EffectFunction,
  options: {
    scheduler?: EffectScheduler
  } = {}
): ScheduledEffect {
  const baseHandle = createEffect(fn, { immediate: false })
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let scheduled = false
  
  const handle: ScheduledEffect = {
    ...baseHandle,
    
    get scheduled(): boolean {
      return scheduled
    },
    
    schedule(delay: number): void {
      if (baseHandle.disposed) return
      
      this.cancel()
      
      scheduled = true
      timeoutId = setTimeout(() => {
        scheduled = false
        timeoutId = undefined
        
        if (!baseHandle.disposed) {
          const disposeCallback = $effect(fn)
          onCleanup(() => disposeCallback?.())
        }
      }, delay)
    },
    
    cancel(): void {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = undefined
        scheduled = false
      }
    },
    
    dispose(): void {
      this.cancel()
      baseHandle.dispose()
    }
  }
  
  return handle
}

/**
 * Creates an async effect using Effect.ts
 * 
 * @param effect - Effect computation function
 * @param options - Async effect options
 * @returns Async effect handle
 */
export function createAsyncEffect<T, E, R>(
  effect: () => Effect.Effect<T, E, R>,
  options: {
    retryCount?: number
    timeout?: number
    onSuccess?: (result: T) => void
    onError?: (error: E) => void
  } = {}
): AsyncEffectHandle {
  let lastError: E | undefined
  let currentExecution: Effect.Effect<T, E, R> | undefined
  let cancelled = false
  
  const baseHandle = createEffect(() => {
    if (cancelled) return
    
    let computation = effect()
    
    if (options.timeout) {
      computation = Effect.timeout(computation, options.timeout)
    }
    
    if (options.retryCount) {
      computation = Effect.retry(computation, { times: options.retryCount })
    }
    
    currentExecution = computation
    
    Effect.runPromise(computation)
      .then(result => {
        if (currentExecution === computation && !cancelled) {
          lastError = undefined
          options.onSuccess?.(result)
        }
      })
      .catch(error => {
        if (currentExecution === computation && !cancelled) {
          lastError = error
          options.onError?.(error)
        }
      })
    
    return () => {
      currentExecution = undefined
    }
  })
  
  const handle: AsyncEffectHandle = {
    ...baseHandle,
    
    get error() {
      return lastError
    },
    
    retry(): void {
      if (baseHandle.disposed || cancelled) return
      
      lastError = undefined
      // Trigger re-run by recreating the effect
    },
    
    cancel(): void {
      cancelled = true
      currentExecution = undefined
    },
    
    dispose(): void {
      this.cancel()
      baseHandle.dispose()
    }
  }
  
  return handle
}

// =============================================================================
// Effect Scheduler Implementation
// =============================================================================

/**
 * Creates an effect scheduler for batching and optimization
 * 
 * @param options - Scheduler options
 * @returns Effect scheduler
 */
export function createScheduler(options: {
  batchSize?: number
  interval?: number
} = {}): EffectScheduler {
  const queue: Array<() => void> = []
  const batchSize = options.batchSize || 100
  const interval = options.interval || 16 // ~60fps
  
  let timerId: ReturnType<typeof setInterval> | undefined
  let running = false
  let stats = { pending: 0, executed: 0, errors: 0 }
  
  const scheduler: EffectScheduler = {
    schedule(effect: () => void): void {
      queue.push(effect)
      stats.pending = queue.length
      
      if (queue.length >= batchSize) {
        this.flush()
      }
    },
    
    flush(): void {
      if (queue.length === 0) return
      
      const batch = queue.splice(0, batchSize)
      stats.pending = queue.length
      
      batch.forEach(effect => {
        try {
          effect()
          stats.executed++
        } catch (error) {
          stats.errors++
          console.error('Error in scheduled effect:', error)
        }
      })
    },
    
    start(): void {
      if (running) return
      
      running = true
      timerId = setInterval(() => {
        this.flush()
      }, interval)
    },
    
    stop(): void {
      if (!running) return
      
      running = false
      if (timerId) {
        clearInterval(timerId)
        timerId = undefined
      }
      
      this.flush()
    },
    
    getStats() {
      return { ...stats }
    }
  }
  
  return scheduler
}

// =============================================================================
// Effect Composition Utilities
// =============================================================================

/**
 * Create an effect that runs when a condition becomes true
 */
export function createConditionalEffect<T>(
  condition: ReactiveValue<boolean>,
  fn: EffectFunction
): EffectHandle {
  return createEffect(() => {
    if (getValue(condition)) {
      return fn()
    }
  })
}

/**
 * Create an effect that debounces its execution
 */
export function createDebouncedEffect(
  fn: EffectFunction,
  delay: number
): EffectHandle {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  
  return createEffect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn()
      timeoutId = undefined
    }, delay)
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  })
}

/**
 * Create an effect that throttles its execution
 */
export function createThrottledEffect(
  fn: EffectFunction,
  delay: number
): EffectHandle {
  let lastRun = 0
  
  return createEffect(() => {
    const now = Date.now()
    if (now - lastRun >= delay) {
      lastRun = now
      return fn()
    }
  })
}

// =============================================================================
// Global Effect Management
// =============================================================================

/**
 * Get global effect system statistics
 */
export function getEffectStats() {
  return globalRegistry.getStats()
}

/**
 * Dispose all effects globally
 */
export function disposeAllEffects(): void {
  globalRegistry.disposeAll()
}

/**
 * Create an effect group for coordinated cleanup
 */
export function createEffectGroup(): {
  add: (effect: EffectHandle) => void
  dispose: () => void
  size: number
} {
  const effects = new Set<EffectHandle>()
  
  return {
    add(effect: EffectHandle) {
      effects.add(effect)
    },
    
    dispose() {
      effects.forEach(effect => effect.dispose())
      effects.clear()
    },
    
    get size() {
      return effects.size
    }
  }
}