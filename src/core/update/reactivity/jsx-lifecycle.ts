/**
 * JSX Component Lifecycle with Runes
 *
 * Implements a clean, predictable lifecycle system inspired by Svelte 5:
 * 1. Component initialization (runs once)
 * 2. $effect.pre() - Before DOM updates
 * 3. DOM updates
 * 4. $effect() - After DOM updates
 * 5. onMount() - After first DOM update
 * 6. tick() - Await next update cycle
 * 7. onDestroy() - Cleanup
 *
 * In our terminal UI context:
 * - "DOM" = Terminal render
 * - "Updates" = View re-renders
 *
 * Design Philosophy:
 * We've adopted Svelte's clean, intuitive lifecycle API because it provides
 * the best developer experience. Simple, predictable, and powerful - just
 * like everything else in TUIX's JSX/runes system.
 */

import { Effect, Queue, Deferred } from 'effect'
import type { View } from '../core/types'

/**
 * Component lifecycle state
 */
interface ComponentState {
  id: string
  mounted: boolean
  destroyed: boolean
  updateQueue: Queue.Queue<() => void>
  effects: {
    pre: Array<() => void | (() => void)>
    post: Array<() => void | (() => void)>
  }
  cleanups: Array<() => void>
  mountCallbacks: Array<() => void | (() => void)>
  destroyCallbacks: Array<() => void>
  parent?: ComponentState
  children: Set<ComponentState>
  renderCount: number
}

// Global component registry
const components = new Map<string, ComponentState>()
const componentStack: ComponentState[] = []
let updatePromise: Deferred.Deferred<void> | null = null
let flushingUpdates = false

/**
 * Get current component context
 */
function getCurrentComponent(): ComponentState | undefined {
  return componentStack[componentStack.length - 1]
}

/**
 * Create unique component ID
 */
let componentIdCounter = 0
function createComponentId(): string {
  return `component-${++componentIdCounter}`
}

/**
 * Initialize a new component
 */
export function initComponent(): ComponentState {
  const parent = getCurrentComponent()
  const component: ComponentState = {
    id: createComponentId(),
    mounted: false,
    destroyed: false,
    updateQueue: Queue.unbounded<() => void>(),
    effects: {
      pre: [],
      post: [],
    },
    cleanups: [],
    mountCallbacks: [],
    destroyCallbacks: [],
    parent,
    children: new Set(),
    renderCount: 0,
  }

  if (parent) {
    parent.children.add(component)
  }

  components.set(component.id, component)
  componentStack.push(component)

  return component
}

/**
 * Cleanup component context
 */
export function cleanupComponent(component: ComponentState): void {
  const index = componentStack.indexOf(component)
  if (index !== -1) {
    componentStack.splice(index, 1)
  }
}

/**
 * $effect - Run side effects after render
 *
 * Runs after the view has been rendered to the terminal.
 * Returns a cleanup function that runs on destroy or before re-run.
 *
 * @example
 * ```ts
 * $effect(() => {
 *   console.log('View rendered!')
 *
 *   return () => {
 *     console.log('Cleaning up')
 *   }
 * })
 * ```
 */
export function $effect(fn: () => void | (() => void)): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('$effect called outside component context')
  }

  component.effects.post.push(fn)
}

/**
 * $effect.pre - Run side effects before render
 *
 * Runs before the view is rendered, useful for:
 * - Reading terminal dimensions
 * - Preparing render state
 * - Synchronous calculations
 *
 * @example
 * ```ts
 * $effect.pre(() => {
 *   console.log('About to render!')
 * })
 * ```
 */
$effect.pre = function (fn: () => void | (() => void)): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('$effect.pre called outside component context')
  }

  component.effects.pre.push(fn)
}

/**
 * $effect.root - Create an effect outside component context
 *
 * Creates a root effect scope that must be manually cleaned up.
 * Useful for global effects or effects that outlive components.
 *
 * @example
 * ```ts
 * const cleanup = $effect.root(() => {
 *   $effect(() => {
 *     console.log('Root effect')
 *   })
 * })
 *
 * // Later...
 * cleanup()
 * ```
 */
$effect.root = function (fn: () => void): () => void {
  const rootComponent = initComponent()

  try {
    fn()
    runEffects(rootComponent, 'pre')
    runEffects(rootComponent, 'post')
  } finally {
    cleanupComponent(rootComponent)
  }

  return () => {
    destroyComponent(rootComponent)
  }
}

/**
 * onMount - Run after component is first rendered
 *
 * Guaranteed to run:
 * - After the component's first render
 * - After all child components are mounted
 * - Only once per component lifecycle
 *
 * @example
 * ```ts
 * onMount(() => {
 *   console.log('Component mounted to terminal!')
 *
 *   return () => {
 *     console.log('Component will unmount')
 *   }
 * })
 * ```
 */
export function onMount(fn: () => void | (() => void)): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('onMount called outside component context')
  }

  component.mountCallbacks.push(fn)
}

/**
 * onDestroy - Register cleanup callback
 *
 * Runs when component is destroyed.
 * Also runs any cleanup functions returned from onMount.
 *
 * @example
 * ```ts
 * onDestroy(() => {
 *   console.log('Component destroyed')
 * })
 * ```
 */
export function onDestroy(fn: () => void): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('onDestroy called outside component context')
  }

  component.destroyCallbacks.push(fn)
}

/**
 * beforeUpdate - Run before any component updates
 *
 * Global hook that runs before ANY component updates.
 * Useful for reading current terminal state.
 */
export function beforeUpdate(fn: () => void): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('beforeUpdate called outside component context')
  }

  // Add as a pre-effect that runs on every update
  $effect.pre(() => {
    if (component.renderCount > 0) {
      fn()
    }
  })
}

/**
 * afterUpdate - Run after any component updates
 *
 * Global hook that runs after ANY component updates.
 * Useful for post-render terminal operations.
 */
export function afterUpdate(fn: () => void): void {
  const component = getCurrentComponent()
  if (!component) {
    throw new Error('afterUpdate called outside component context')
  }

  // Add as a post-effect that runs on every update
  $effect(() => {
    if (component.renderCount > 0) {
      fn()
    }
  })
}

/**
 * tick - Wait for pending updates to complete
 *
 * Returns a promise that resolves after all pending updates are flushed.
 * In terminal context, this means after the next render cycle.
 *
 * @example
 * ```ts
 * await tick()
 * console.log('All updates flushed!')
 * ```
 */
export async function tick(): Promise<void> {
  if (!updatePromise) {
    updatePromise = Deferred.make<void>()

    // Schedule flush on next tick
    queueMicrotask(() => {
      flushUpdates()
    })
  }

  return Deferred.await(updatePromise)
}

/**
 * Run effects of a specific type
 */
function runEffects(component: ComponentState, type: 'pre' | 'post'): void {
  const effects = component.effects[type]
  const newCleanups: Array<() => void> = []

  // Run effects and collect cleanups
  effects.forEach(effect => {
    const cleanup = effect()
    if (typeof cleanup === 'function') {
      newCleanups.push(cleanup)
    }
  })

  // Store cleanups
  component.cleanups.push(...newCleanups)
}

/**
 * Run mount callbacks
 */
function runMountCallbacks(component: ComponentState): void {
  if (component.mounted) return

  component.mounted = true

  // Run mount callbacks
  component.mountCallbacks.forEach(callback => {
    const cleanup = callback()
    if (typeof cleanup === 'function') {
      component.destroyCallbacks.push(cleanup)
    }
  })
}

/**
 * Destroy a component
 */
function destroyComponent(component: ComponentState): void {
  if (component.destroyed) return

  component.destroyed = true

  // Destroy children first
  component.children.forEach(child => destroyComponent(child))

  // Run cleanup functions
  component.cleanups.forEach(cleanup => cleanup())

  // Run destroy callbacks
  component.destroyCallbacks.forEach(callback => callback())

  // Remove from parent
  if (component.parent) {
    component.parent.children.delete(component)
  }

  // Remove from registry
  components.delete(component.id)
}

/**
 * Flush all pending updates
 */
function flushUpdates(): void {
  if (flushingUpdates) return

  flushingUpdates = true

  try {
    // Run all pre-effects
    components.forEach(component => {
      if (!component.destroyed) {
        runEffects(component, 'pre')
      }
    })

    // Here would be actual render in real implementation

    // Run all post-effects
    components.forEach(component => {
      if (!component.destroyed) {
        runEffects(component, 'post')
        component.renderCount++

        // Run mount callbacks after first render
        if (component.renderCount === 1) {
          runMountCallbacks(component)
        }
      }
    })

    // Resolve tick promise
    if (updatePromise) {
      Deferred.succeed(updatePromise, undefined)
      updatePromise = null
    }
  } finally {
    flushingUpdates = false
  }
}

/**
 * untrack - Run code without tracking reactive dependencies
 *
 * Prevents the code from being re-run when dependencies change.
 *
 * @example
 * ```ts
 * untrack(() => {
 *   // This won't trigger re-renders
 *   console.log(someState())
 * })
 * ```
 */
export function untrack<T>(fn: () => T): T {
  // In a real implementation, this would prevent dependency tracking
  // For now, just run the function
  return fn()
}

/**
 * Component wrapper with lifecycle
 *
 * @example
 * ```tsx
 * const MyComponent = withLifecycle(() => {
 *   const count = $state(0)
 *
 *   $effect(() => {
 *     console.log('Count changed:', count())
 *   })
 *
 *   onMount(() => {
 *     console.log('Mounted!')
 *     return () => console.log('Unmounting!')
 *   })
 *
 *   return <div>Count: {count()}</div>
 * })
 * ```
 */
export function withLifecycle<P = {}>(
  component: (props: P) => View | JSX.Element
): (props: P) => View | JSX.Element {
  return (props: P) => {
    const componentState = initComponent()

    try {
      // Run component function
      const view = component(props)

      // Run pre-effects before returning view
      runEffects(componentState, 'pre')

      // Schedule post-effects and mount
      queueMicrotask(() => {
        runEffects(componentState, 'post')
        componentState.renderCount++

        if (componentState.renderCount === 1) {
          runMountCallbacks(componentState)
        }
      })

      return view
    } finally {
      cleanupComponent(componentState)
    }
  }
}

/**
 * Get all lifecycle phases for debugging
 */
export function getLifecyclePhases(): string[] {
  return [
    '1. Component function runs (initialization)',
    '2. $effect.pre() callbacks run',
    '3. View renders to terminal',
    '4. $effect() callbacks run',
    '5. onMount() callbacks run (first render only)',
    '6. Component waits for updates...',
    '7. On update: beforeUpdate() runs',
    '8. Repeat steps 2-4',
    '9. On update: afterUpdate() runs',
    '10. On destroy: cleanup functions run',
    '11. On destroy: onDestroy() callbacks run',
  ]
}
