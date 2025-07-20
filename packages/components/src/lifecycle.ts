/**
 * Component Lifecycle Hooks
 * 
 * Provides lifecycle management for components similar to Svelte
 */

import { Effect, Ref } from "effect"

export interface LifecycleHook {
  (): void | Promise<void> | (() => void)
}

export interface AsyncLifecycleHook {
  (): Promise<void> | Promise<() => void>
}

// Global lifecycle context
export interface LifecycleContext {
  currentComponent: string | null
  hooks: Map<string, ComponentHooks>
}

interface ComponentHooks {
  mount: LifecycleHook[]
  destroy: LifecycleHook[]
  beforeUpdate: LifecycleHook[]
  afterUpdate: LifecycleHook[]
  cleanups: Array<() => void>
}

const lifecycleContext: LifecycleContext = {
  currentComponent: null,
  hooks: new Map()
}

/**
 * Create a new lifecycle context
 */
export function createLifecycleContext(): LifecycleContext {
  return {
    currentComponent: null,
    hooks: new Map()
  }
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
}

/**
 * Run when component is destroyed
 */
export function onDestroy(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.destroy.push(fn)
}

/**
 * Run before component updates
 */
export function beforeUpdate(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.beforeUpdate.push(fn)
}

/**
 * Run after component updates
 */
export function afterUpdate(fn: LifecycleHook) {
  const hooks = getCurrentHooks()
  hooks.afterUpdate.push(fn)
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
      cleanup()
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
export const useInterval = createHook((callback: () => void, delay: number) => {
  onMount(() => {
    const interval = setInterval(callback, delay)
    return () => clearInterval(interval)
  })
})

/**
 * Use timeout - runs a function after a delay
 */
export const useTimeout = createHook((callback: () => void, delay: number) => {
  onMount(() => {
    const timeout = setTimeout(callback, delay)
    return () => clearTimeout(timeout)
  })
})

/**
 * Use async effect - for handling async side effects
 */
export const useAsyncEffect = createHook((
  effect: () => Promise<void | (() => void)>,
  dependencies?: readonly unknown[]
) => {
  onMount(async () => {
    try {
      const cleanup = await effect()
      if (typeof cleanup === 'function') {
        return cleanup
      }
    } catch (error) {
      console.error("Error in async effect:", error)
    }
  })
})

/**
 * Use previous value - keeps track of the previous value of a variable
 */
export const usePrevious = createHook(<T>(value: T): T | undefined => {
  const ref = Effect.runSync(Ref.make<T | undefined>(undefined))
  
  afterUpdate(() => {
    Effect.runSync(Ref.set(ref, value))
  })
  
  return Effect.runSync(Ref.get(ref))
})