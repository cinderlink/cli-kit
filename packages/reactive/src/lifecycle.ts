/**
 * Component Lifecycle with Runes
 * 
 * Provides Svelte 5-style lifecycle hooks for proper component initialization order
 */

import { Effect, FiberRef } from "effect"
import type { StateRune } from "./runes"
import { $state } from "./runes"

/**
 * Component lifecycle phases
 */
export enum LifecyclePhase {
  Created = "created",
  Mounting = "mounting", 
  Mounted = "mounted",
  Updating = "updating",
  Updated = "updated",
  Destroying = "destroying",
  Destroyed = "destroyed"
}

/**
 * Component context for lifecycle management
 */
export interface ComponentContext {
  phase: LifecyclePhase
  parent?: ComponentContext
  children: ComponentContext[]
  onMount: Array<() => void | (() => void)>
  onDestroy: Array<() => void>
  onBeforeUpdate: Array<() => void>
  onAfterUpdate: Array<() => void>
}

// Global context stack for tracking component hierarchy
const contextStack: ComponentContext[] = []

/**
 * Get current component context
 */
export function getCurrentContext(): ComponentContext | undefined {
  return contextStack[contextStack.length - 1]
}

/**
 * Create a new component context
 */
export function createContext(): ComponentContext {
  const parent = getCurrentContext()
  const context: ComponentContext = {
    phase: LifecyclePhase.Created,
    parent,
    children: [],
    onMount: [],
    onDestroy: [],
    onBeforeUpdate: [],
    onAfterUpdate: []
  }
  
  if (parent) {
    parent.children.push(context)
  }
  
  return context
}

/**
 * Push context onto stack
 */
export function pushContext(context: ComponentContext) {
  contextStack.push(context)
}

/**
 * Pop context from stack
 */
export function popContext() {
  return contextStack.pop()
}

/**
 * Run lifecycle hook in current context
 */
function runInContext<T>(context: ComponentContext, fn: () => T): T {
  pushContext(context)
  try {
    return fn()
  } finally {
    popContext()
  }
}

/**
 * $onMount - Register a function to run after the component is mounted
 * 
 * In JSX components, this ensures parent components are fully initialized
 * before child components run their mount effects.
 * 
 * @example
 * ```tsx
 * function MyPlugin() {
 *   const plugin = $state({ commands: {} })
 *   
 *   $onMount(() => {
 *     // This runs AFTER the Plugin element is registered
 *     console.log('Plugin mounted, ready for commands')
 *     
 *     return () => {
 *       // Cleanup on unmount
 *       console.log('Plugin unmounting')
 *     }
 *   })
 *   
 *   return <Plugin name="my-plugin">
 *     <Command name="hello" />
 *   </Plugin>
 * }
 * ```
 */
export function $onMount(fn: () => void | (() => void)): void {
  const context = getCurrentContext()
  if (!context) {
    throw new Error('$onMount called outside component context')
  }
  
  context.onMount.push(fn)
}

/**
 * $onDestroy - Register a cleanup function
 */
export function $onDestroy(fn: () => void): void {
  const context = getCurrentContext()
  if (!context) {
    throw new Error('$onDestroy called outside component context')
  }
  
  context.onDestroy.push(fn)
}

/**
 * $beforeUpdate - Run before component updates
 */
export function $beforeUpdate(fn: () => void): void {
  const context = getCurrentContext()
  if (!context) {
    throw new Error('$beforeUpdate called outside component context')
  }
  
  context.onBeforeUpdate.push(fn)
}

/**
 * $afterUpdate - Run after component updates
 */
export function $afterUpdate(fn: () => void): void {
  const context = getCurrentContext()
  if (!context) {
    throw new Error('$afterUpdate called outside component context')
  }
  
  context.onAfterUpdate.push(fn)
}

/**
 * Mount a component and its children in the correct order
 * 
 * 1. Parent enters mounting phase
 * 2. Children are created and mounted recursively
 * 3. Parent's onMount callbacks run
 * 4. Parent enters mounted phase
 */
export function mountComponent(context: ComponentContext): void {
  if (context.phase !== LifecyclePhase.Created) {
    return // Already mounted
  }
  
  // Enter mounting phase
  context.phase = LifecyclePhase.Mounting
  
  // Mount children first (depth-first)
  context.children.forEach(child => mountComponent(child))
  
  // Run mount callbacks
  const cleanups: Array<() => void> = []
  context.onMount.forEach(fn => {
    const cleanup = fn()
    if (typeof cleanup === 'function') {
      cleanups.push(cleanup)
    }
  })
  
  // Store cleanups in onDestroy
  cleanups.forEach(cleanup => context.onDestroy.push(cleanup))
  
  // Mark as mounted
  context.phase = LifecyclePhase.Mounted
}

/**
 * Update a component
 */
export function updateComponent(context: ComponentContext): void {
  if (context.phase !== LifecyclePhase.Mounted) {
    return
  }
  
  context.phase = LifecyclePhase.Updating
  
  // Run before update callbacks
  context.onBeforeUpdate.forEach(fn => fn())
  
  // Update children
  context.children.forEach(child => updateComponent(child))
  
  // Run after update callbacks  
  context.onAfterUpdate.forEach(fn => fn())
  
  context.phase = LifecyclePhase.Updated
}

/**
 * Destroy a component and its children
 */
export function destroyComponent(context: ComponentContext): void {
  if (context.phase === LifecyclePhase.Destroyed) {
    return
  }
  
  context.phase = LifecyclePhase.Destroying
  
  // Destroy children first (depth-first)
  context.children.forEach(child => destroyComponent(child))
  
  // Run destroy callbacks
  context.onDestroy.forEach(fn => fn())
  
  // Remove from parent
  if (context.parent) {
    const index = context.parent.children.indexOf(context)
    if (index !== -1) {
      context.parent.children.splice(index, 1)
    }
  }
  
  context.phase = LifecyclePhase.Destroyed
}

/**
 * Create a component with lifecycle management
 * 
 * @example
 * ```tsx
 * const MyComponent = $component(() => {
 *   const count = $state(0)
 *   
 *   $onMount(() => {
 *     console.log('Component mounted')
 *     return () => console.log('Component unmounted')
 *   })
 *   
 *   return <div>Count: {count()}</div>
 * })
 * ```
 */
export function $component<P = {}>(
  component: (props: P) => JSX.Element
): (props: P) => JSX.Element {
  return (props: P) => {
    const context = createContext()
    
    // Run component function in context
    const element = runInContext(context, () => component(props))
    
    // Mount after creation
    mountComponent(context)
    
    return element
  }
}

/**
 * Hook to access parent component context
 */
export function $parent<T = any>(): T | undefined {
  const context = getCurrentContext()
  return context?.parent as T
}

/**
 * Hook to access child components
 */
export function $children<T = any>(): T[] {
  const context = getCurrentContext()
  return (context?.children || []) as T[]
}