/**
 * Component Lifecycle Hooks
 * 
 * Provides lifecycle management for components similar to Svelte
 */

import { Effect, Ref } from "effect"

export interface LifecycleHook { (): void | Promise<void> | (() => void) }
export interface AsyncLifecycleHook { (): Promise<void> | Promise<() => void> }

// Minimal context shape used by simple unit tests
export interface LifecycleContext {
  mounted: LifecycleHook[]
  beforeUpdate: LifecycleHook[]
  afterUpdate: LifecycleHook[]
  destroy: LifecycleHook[]
  errorHandlers: Array<(error: Error) => void>
  isActive: boolean
}

export function createLifecycleContext(): LifecycleContext {
  return {
    mounted: [],
    beforeUpdate: [],
    afterUpdate: [],
    destroy: [],
    errorHandlers: [],
    isActive: true
  }
}

// Internal global context for hook-based helpers used elsewhere
interface GlobalLifecycleContext {
  currentComponent: string | null
  hooks: Map<string, ComponentHooks>
}

interface ComponentHooks {
  mount: LifecycleHook[]
  destroy: LifecycleHook[]
  beforeUpdate: LifecycleHook[]
  afterUpdate: LifecycleHook[]
  cleanups: Array<() => void | Promise<void>>
}

const lifecycleContext: GlobalLifecycleContext = {
  currentComponent: null,
  hooks: new Map()
}

let componentId = 0

/**
 * Get or create hooks for the current component
 */
function getCurrentHooks(): ComponentHooks {
  if (!lifecycleContext.currentComponent) {
    lifecycleContext.currentComponent = `component_${++componentId}`
  }
  
  const id = lifecycleContext.currentComponent
  if (!lifecycleContext.hooks.has(id)) {
    lifecycleContext.hooks.set(id, {
      mount: [],
      destroy: [],
      beforeUpdate: [],
      afterUpdate: [],
      cleanups: []
    })
  }
  
  return lifecycleContext.hooks.get(id)!
}

/**
 * Set the current component context
 */
export function setCurrentComponent(id: string) {
  lifecycleContext.currentComponent = id
}

/**
 * Clear the current component context
 */
export function clearCurrentComponent() {
  lifecycleContext.currentComponent = null
}

/**
 * Run when component is mounted
 */
export function onMount(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.mount.push(fn)
  // Return a cleanup that removes this hook
  return (): Promise<void> => {
    const idx = hooks.mount.indexOf(fn)
    if (idx >= 0) hooks.mount.splice(idx, 1)
  }
}

/**
 * Run when component is destroyed
 */
export function onDestroy(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.destroy.push(fn)
  return () => {
    const idx = hooks.destroy.indexOf(fn)
    if (idx >= 0) hooks.destroy.splice(idx, 1)
  }
}

/**
 * Run before component updates
 */
export function beforeUpdate(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.beforeUpdate.push(fn)
  return () => {
    const idx = hooks.beforeUpdate.indexOf(fn)
    if (idx >= 0) hooks.beforeUpdate.splice(idx, 1)
  }
}

/**
 * Run after component updates
 */
export function afterUpdate(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.afterUpdate.push(fn)
  return () => {
    const idx = hooks.afterUpdate.indexOf(fn)
    if (idx >= 0) hooks.afterUpdate.splice(idx, 1)
  }
}

/**
 * Execute all mount hooks for a component
 */
export async function executeMountHooks(componentId: string) {
  const hooks = lifecycleContext.hooks.get(componentId)
  if (!hooks) return
  
  for (const hook of hooks.mount) {
    try {
      const result = hook()
      
      // If hook returns a cleanup function, store it
      if (typeof result === 'function') {
        hooks.cleanups.push(result)
      } else if (result instanceof Promise) {
        const cleanup = await result
        if (typeof cleanup === 'function') {
          hooks.cleanups.push(cleanup)
        }
      }
    } catch (error) {
      console.error(`Error in onMount hook:`, error)
    }
  }
}

/**
 * Execute all destroy hooks for a component
 */
export async function executeDestroyHooks(componentId: string) {
  const hooks = lifecycleContext.hooks.get(componentId)
  if (!hooks) return
  
  // Run cleanup functions first
  for (const cleanup of hooks.cleanups) {
    try {
      const result = cleanup()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error(`Error in cleanup function:`, error)
    }
  }
  
  // Then run destroy hooks
  for (const hook of hooks.destroy) {
    try {
      const result = hook()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error(`Error in onDestroy hook:`, error)
    }
  }
  
  // Clean up hooks map
  lifecycleContext.hooks.delete(componentId)
}

/**
 * Execute before update hooks
 */
export async function executeBeforeUpdateHooks(componentId: string) {
  const hooks = lifecycleContext.hooks.get(componentId)
  if (!hooks) return
  
  for (const hook of hooks.beforeUpdate) {
    try {
      const result = hook()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error(`Error in beforeUpdate hook:`, error)
    }
  }
}

/**
 * Execute after update hooks
 */
export async function executeAfterUpdateHooks(componentId: string) {
  const hooks = lifecycleContext.hooks.get(componentId)
  if (!hooks) return
  
  for (const hook of hooks.afterUpdate) {
    try {
      const result = hook()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error(`Error in afterUpdate hook:`, error)
    }
  }
}

/**
 * Utility to automatically manage component lifecycle
 */
export function createLifecycleManager(componentId: string) {
  return {
    async mount() {
      await executeMountHooks(componentId)
    },
    
    async destroy() {
      await executeDestroyHooks(componentId)
    },
    
    async beforeUpdate() {
      await executeBeforeUpdateHooks(componentId)
    },
    
    async afterUpdate() {
      await executeAfterUpdateHooks(componentId)
    }
  }
}

/**
 * Tick - schedule a callback to run after the next update
 */
export function tick(): Promise<void> {
  return new Promise(resolve => {
    // In a real implementation, this would integrate with the render cycle
    setTimeout(resolve, 0)
  })
}

/**
 * Create a custom hook that can use other hooks
 */
export function createHook<T extends any[], R>(
  fn: (...args: T) => R
): (...args: T) => R {
  return (...args: T) => {
    // Ensure we're in a component context
    if (!lifecycleContext.currentComponent) {
      throw new Error("Hooks can only be called during component initialization")
    }
    
    return fn(...args)
  }
}

/**
 * Use interval - runs a function at regular intervals
 */
export const useInterval = (callback: () => void, delay: number) => {
  const id = setInterval(callback, delay)
  return () => clearInterval(id)
}

/**
 * Use timeout - runs a function after a delay
 */
export const useTimeout = (callback: () => void, delay: number) => {
  const id = setTimeout(callback, delay)
  return () => clearTimeout(id)
}

/**
 * Use async effect - for handling async side effects
 */
export const useAsyncEffect = (
  effect: () => Promise<void | (() => void)>,
  _dependencies?: any[]
) => {
  let active = true
  let cleanup: (() => void | Promise<void>) | undefined
  let cleanupRequested = false
  let cleanupCompleted = false

  const executeCleanup = async (fn?: (() => void | Promise<void>) | void) => {
    if (!fn) {
      return
    }
    try {
      await fn()
    } catch (error) {
      console.error("Error in async effect cleanup:", error)
    }
  }

  const runCleanupSafely = (fn?: (() => void | Promise<void>) | void): Promise<void> => {
    if (cleanupCompleted) {
      return Promise.resolve()
    }
    cleanupCompleted = true
    return executeCleanup(fn)
  }

  const effectPromise = (async () => {
    try {
      if (!active) {
        return undefined
      }
      const maybeCleanup = await effect()
      if (!active || cleanupRequested || cleanupCompleted) {
        await runCleanupSafely(maybeCleanup)
        return maybeCleanup ?? undefined
      }
      cleanup = maybeCleanup ?? undefined
      return cleanup
    } catch (error) {
      console.error("Error in async effect:", error)
      return undefined
    }
  })()
  return () => {
    if (cleanupCompleted) {
      return Promise.resolve()
    }
    active = false
    cleanupRequested = true
    if (cleanup) {
      const fn = cleanup
      cleanup = undefined
      return runCleanupSafely(fn)
    }
    return effectPromise
      .then(runCleanupSafely)
      .catch(() => Promise.resolve())
  }
}

/**
 * Use previous value - keeps track of the previous value of a variable
 */
export function usePrevious<T>(initial?: T) {
  let prev = initial as T | undefined
  return (next?: T): T | undefined => {
    const out = prev
    prev = next as T | undefined
    return out
  }
}

// Re-export component helpers expected by tests from this module
export { createComponent, wrapComponent, functional, reactive } from "./component"
