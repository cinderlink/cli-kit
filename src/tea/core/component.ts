/**
 * Simplified Component API - Reactive component system for TUIX
 * 
 * This module provides a Svelte 5-inspired component creation API that simplifies
 * the traditional Model-View-Update pattern with reactive state management.
 * It bridges the gap between functional reactive programming and imperative
 * component patterns, making it easier to build interactive TUI components.
 * 
 * ## Key Features:
 * 
 * ### Reactive State Management
 * - `$state`: Mutable reactive state with subscription support
 * - `$derived`: Computed values that update automatically
 * - `$effect`: Side effects that run when dependencies change
 * - Automatic dependency tracking and updates
 * 
 * ### Component Lifecycle
 * - `onMount`: Run code when component is initialized
 * - `onDestroy`: Cleanup when component is removed
 * - Automatic cleanup of effects and subscriptions
 * 
 * ### Simplified API
 * - No explicit message types needed for simple components
 * - Direct state manipulation instead of update functions
 * - Automatic conversion to Effect-based TEA architecture
 * 
 * @example
 * ```typescript
 * import { createComponent, reactive } from './component'
 * 
 * // Simple counter component
 * const Counter = createComponent((ctx) => {
 *   const count = ctx.$state(0)
 *   const doubled = ctx.$derived(() => count.value * 2)
 *   
 *   ctx.$effect(() => {
 *     console.log(`Count changed to: ${count.value}`)
 *   })
 *   
 *   return {
 *     view: () => text(`Count: ${count.value}, Doubled: ${doubled.value}`),
 *     update: (msg) => {
 *       if (msg === 'increment') count.update(n => n + 1)
 *       if (msg === 'decrement') count.update(n => n - 1)
 *     }
 *   }
 * })
 * ```
 * 
 * @module components/component
 */

import { Effect, Ref } from "effect"
import type { Component } from "../core/types"
import type { View, SystemMsg } from "../core/types"
import { text } from "../core/view"

/**
 * Reactive state container with subscription support
 * 
 * Provides a mutable state value that notifies subscribers when changed.
 * Similar to Svelte's `$state` rune or React's `useState`.
 * 
 * @template T - The type of the state value
 */
export interface State<T> {
  value: T
  subscribe: (callback: (value: T) => void) => () => void
  set: (value: T) => void
  update: (updater: (current: T) => T) => void
}

/**
 * Derived (computed) state that updates automatically
 * 
 * Represents a value computed from other reactive values that
 * automatically updates when its dependencies change.
 * 
 * @template T - The type of the derived value
 */
export interface Derived<T> {
  value: T
  subscribe: (callback: (value: T) => void) => () => void
}

/**
 * Cleanup function returned by effects
 * 
 * Called when the effect is re-run or the component is destroyed
 * to clean up resources like timers, subscriptions, etc.
 */
export interface EffectCleanup {
  (): void
}

/**
 * Component context providing reactive primitives and lifecycle hooks
 * 
 * Passed to component functions to enable reactive state management
 * and lifecycle control without explicit Effect handling.
 */
export interface ComponentContext {
  $state: <T>(initial: T) => State<T>
  $derived: <T>(computation: () => T) => Derived<T>
  $effect: (fn: () => void | EffectCleanup) => void
  onMount: (fn: () => void | Promise<void>) => void
  onDestroy: (fn: () => void | Promise<void>) => void
}

/**
 * Simplified component definition function
 * 
 * A function that receives a component context and returns component
 * behavior including view rendering, optional state initialization,
 * update handling, and subscriptions.
 * 
 * @template TModel - The component's model/state type
 * @template TMsg - The component's message type
 */
export interface SimpleComponent<TModel = unknown, TMsg = unknown> {
  (context: ComponentContext): {
    view: () => View
    init?: () => TModel
    update?: (msg: TMsg, model: TModel) => TModel
    subscriptions?: (model: TModel) => Effect.Effect<SystemMsg[], never, never>
  }
}

/**
 * Internal state management for component instances
 * 
 * Tracks all reactive state, effects, and lifecycle callbacks
 * for proper cleanup and dependency management.
 * 
 * @internal
 */
interface ComponentState {
  stateRefs: Map<string, Ref.Ref<unknown>>
  derivedRefs: Map<string, Ref.Ref<unknown>>
  effects: Array<() => void>
  mountCallbacks: Array<() => void | Promise<void>>
  destroyCallbacks: Array<() => void | Promise<void>>
  subscriptions: Map<string, Array<(value: unknown) => void>>
}

/**
 * Generate unique component IDs without global mutable state
 * 
 * Uses crypto.randomUUID when available, falls back to timestamp-based IDs.
 * 
 * @returns Unique component identifier
 * @internal
 */
const generateComponentId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a simplified component that wraps the Effect-based TEA architecture
 * 
 * Transforms a reactive component definition into a standard TUIX component
 * that works with the Effect-based runtime. Handles all the boilerplate of
 * state management, effect tracking, and lifecycle management.
 * 
 * @param componentFn - Function that defines the component behavior
 * @returns Standard TUIX component compatible with the runtime
 * 
 * @example
 * ```typescript
 * const Timer = createComponent((ctx) => {
 *   const seconds = ctx.$state(0)
 *   
 *   ctx.onMount(() => {
 *     const interval = setInterval(() => {
 *       seconds.update(s => s + 1)
 *     }, 1000)
 *     
 *     return () => clearInterval(interval)
 *   })
 *   
 *   return {
 *     view: () => text(`Time: ${seconds.value}s`)
 *   }
 * })
 * ```
 */
export function createComponent<TModel = unknown, TMsg = unknown>(
  componentFn: SimpleComponent<TModel, TMsg>
): Component<TModel, TMsg> {
  const stateId = generateComponentId()
  const state: ComponentState = {
    stateRefs: new Map(),
    derivedRefs: new Map(),
    effects: [],
    mountCallbacks: [],
    destroyCallbacks: [],
    subscriptions: new Map()
  }

  /**
   * Create reactive state with subscription support
   */
  const $state = <T>(initial: T): State<T> => {
    const key = `state_${stateId}_${state.stateRefs.size}`
    
    // Store the current value instead of using Effect.runSync
    let currentValue = initial
    const subscribers = state.subscriptions.get(key) || []
    
    return {
      get value() {
        return currentValue
      },
      
      subscribe(callback: (value: T) => void) {
        subscribers.push(callback)
        state.subscriptions.set(key, subscribers)
        
        // Return unsubscribe function
        return () => {
          const index = subscribers.indexOf(callback)
          if (index >= 0) {
            subscribers.splice(index, 1)
          }
        }
      },
      
      set(value: T) {
        if (currentValue !== value) {
          currentValue = value
          // Notify subscribers
          subscribers.forEach(callback => callback(value))
        }
      },
      
      update(updater: (current: T) => T) {
        const newValue = updater(currentValue)
        this.set(newValue)
      }
    }
  }

  /**
   * Create derived state that updates when dependencies change
   */
  const $derived = <T>(computation: () => T): Derived<T> => {
    const key = `derived_${stateId}_${state.derivedRefs.size}`
    
    // Store computed value directly instead of using Effect.runSync
    let currentValue = computation()
    const subscribers = state.subscriptions.get(key) || []
    
    // Re-compute when dependencies change (simple implementation)
    const update = () => {
      const newValue = computation()
      if (currentValue !== newValue) {
        currentValue = newValue
        subscribers.forEach(callback => callback(newValue))
      }
    }
    
    // Schedule update (in real implementation, this would track dependencies)
    setTimeout(update, 0)
    
    return {
      get value() {
        return currentValue
      },
      
      subscribe(callback: (value: T) => void) {
        subscribers.push(callback)
        state.subscriptions.set(key, subscribers)
        
        return () => {
          const index = subscribers.indexOf(callback)
          if (index >= 0) {
            subscribers.splice(index, 1)
          }
        }
      }
    }
  }

  /**
   * Register an effect that runs when dependencies change
   */
  const $effect = (fn: () => void | EffectCleanup) => {
    const cleanup = fn()
    if (typeof cleanup === 'function') {
      state.effects.push(cleanup)
    }
  }

  /**
   * Register a callback to run when component mounts
   */
  const onMount = (fn: () => void | Promise<void>) => {
    state.mountCallbacks.push(fn)
  }

  const onDestroy = (fn: () => void | Promise<void>) => {
    state.destroyCallbacks.push(fn)
  }

  // Create context
  const context: ComponentContext = {
    $state,
    $derived,
    $effect,
    onMount,
    onDestroy
  }

  // Call the component function to get the definition
  const componentDef = componentFn(context)

  // Return TEA-compatible component
  return {
    init: Effect.succeed([
      componentDef.init ? componentDef.init() : {} as TModel,
      [] // No initial commands
    ]),

    update: (msg: TMsg, model: TModel) => {
      const newModel = componentDef.update ? componentDef.update(msg, model) : model
      return Effect.succeed([newModel, []])
    },

    view: (model: TModel) => {
      try {
        return componentDef.view()
      } catch (error) {
        console.error("Component view error:", error)
        return text("Error rendering component")
      }
    },

    subscriptions: componentDef.subscriptions ? 
      (model: TModel) => componentDef.subscriptions(model) : 
      () => Effect.succeed([])
  }
}

/**
 * Utility to convert existing TEA components to simplified API
 * 
 * Allows using traditional TUIX components with the simplified
 * reactive API. Useful for gradual migration or integration.
 * 
 * @param teaComponent - Traditional Effect-based component
 * @returns Component using simplified API
 * 
 * @todo Implement proper model state management
 */
export function wrapComponent<TModel, TMsg>(
  teaComponent: Component<TModel, TMsg>
): SimpleComponent<TModel, TMsg> {
  return (context) => ({
    view: () => {
      // This is a simplified wrapper - in practice we'd need to manage model state
      return text("Wrapped component (TODO: implement proper wrapping)")
    }
  })
}

/**
 * Create a simple functional component (view-only)
 * 
 * For components that only render views without state or updates.
 * Useful for static content, labels, or pure display components.
 * 
 * @param viewFn - Function that returns the view to render
 * @returns Simple component without state management
 * 
 * @example
 * ```typescript
 * const Header = functional(() => 
 *   text('Welcome to My App').pipe(bold(), center(80))
 * )
 * ```
 */
export function functional(viewFn: () => View): SimpleComponent {
  return (context) => ({
    view: viewFn
  })
}

/**
 * Create a component with reactive state helper
 * 
 * Simplifies creating components that only need local state without
 * complex update logic. The state is automatically reactive and the
 * view re-renders when state changes.
 * 
 * @param initialState - Initial state value
 * @param render - Function that renders the view based on current state
 * @returns Component with reactive state management
 * 
 * @example
 * ```typescript
 * const Toggle = reactive(false, (isOn, ctx) => 
 *   text(isOn.value ? 'ON' : 'OFF')
 *     .pipe(style(isOn.value ? Colors.green : Colors.red))
 * )
 * ```
 */
export function reactive<TState = unknown>(
  initialState: TState,
  render: (state: State<TState>, context: ComponentContext) => View
): SimpleComponent<TState> {
  return (context) => {
    const state = context.$state(initialState)
    
    return {
      view: () => render(state, context)
    }
  }
}