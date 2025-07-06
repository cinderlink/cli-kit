/**
 * Simplified Component API
 * 
 * Provides Svelte 5-inspired component creation with automatic Effect handling
 */

import { Effect, Ref } from "effect"
import type { Component } from "../core/types"
import type { View, SystemMsg } from "../core/types"
import { text } from "../core/view"

// Reactive state primitives
export interface State<T> {
  value: T
  subscribe: (callback: (value: T) => void) => () => void
  set: (value: T) => void
  update: (updater: (current: T) => T) => void
}

export interface Derived<T> {
  value: T
  subscribe: (callback: (value: T) => void) => () => void
}

export interface EffectCleanup {
  (): void
}

// Component context for accessing reactive primitives
export interface ComponentContext {
  $state: <T>(initial: T) => State<T>
  $derived: <T>(computation: () => T) => Derived<T>
  $effect: (fn: () => void | EffectCleanup) => void
  onMount: (fn: () => void | Promise<void>) => void
  onDestroy: (fn: () => void | Promise<void>) => void
}

// Simplified component definition
export interface SimpleComponent<TModel = any, TMsg = any> {
  (context: ComponentContext): {
    view: () => View
    init?: () => TModel
    update?: (msg: TMsg, model: TModel) => TModel
    subscriptions?: (model: TModel) => any
  }
}

// Internal state management
interface ComponentState {
  stateRefs: Map<string, Ref.Ref<any>>
  derivedRefs: Map<string, Ref.Ref<any>>
  effects: Array<() => void>
  mountCallbacks: Array<() => void | Promise<void>>
  destroyCallbacks: Array<() => void | Promise<void>>
  subscriptions: Map<string, Array<(value: any) => void>>
}

let componentStateId = 0

/**
 * Create a simplified component that wraps the Effect-based TEA architecture
 */
export function createComponent<TModel = any, TMsg = any>(
  componentFn: SimpleComponent<TModel, TMsg>
): Component<TModel, TMsg> {
  const stateId = ++componentStateId
  const state: ComponentState = {
    stateRefs: new Map(),
    derivedRefs: new Map(),
    effects: [],
    mountCallbacks: [],
    destroyCallbacks: [],
    subscriptions: new Map()
  }

  // Create reactive state
  const $state = <T>(initial: T): State<T> => {
    const key = `state_${stateId}_${state.stateRefs.size}`
    
    if (!state.stateRefs.has(key)) {
      state.stateRefs.set(key, Ref.make(initial))
    }
    
    const ref = state.stateRefs.get(key)!
    const subscribers = state.subscriptions.get(key) || []
    
    return {
      get value() {
        return Effect.runSync(Ref.get(ref))
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
        const oldValue = Effect.runSync(Ref.get(ref))
        if (oldValue !== value) {
          Effect.runSync(Ref.set(ref, value))
          // Notify subscribers
          subscribers.forEach(callback => callback(value))
        }
      },
      
      update(updater: (current: T) => T) {
        const current = Effect.runSync(Ref.get(ref))
        const newValue = updater(current)
        this.set(newValue)
      }
    }
  }

  // Create derived state
  const $derived = <T>(computation: () => T): Derived<T> => {
    const key = `derived_${stateId}_${state.derivedRefs.size}`
    
    if (!state.derivedRefs.has(key)) {
      const initialValue = computation()
      state.derivedRefs.set(key, Ref.make(initialValue))
    }
    
    const ref = state.derivedRefs.get(key)!
    const subscribers = state.subscriptions.get(key) || []
    
    // Re-compute when dependencies change (simple implementation)
    const update = () => {
      const newValue = computation()
      const oldValue = Effect.runSync(Ref.get(ref))
      if (oldValue !== newValue) {
        Effect.runSync(Ref.set(ref, newValue))
        subscribers.forEach(callback => callback(newValue))
      }
    }
    
    // Schedule update (in real implementation, this would track dependencies)
    setTimeout(update, 0)
    
    return {
      get value() {
        return Effect.runSync(Ref.get(ref))
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

  // Effect management
  const $effect = (fn: () => void | EffectCleanup) => {
    const cleanup = fn()
    if (typeof cleanup === 'function') {
      state.effects.push(cleanup)
    }
  }

  // Lifecycle hooks
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
      (model: TModel) => componentDef.subscriptions!(model) : 
      () => Effect.succeed([])
  }
}

/**
 * Utility to convert existing TEA components to simplified API
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
 */
export function functional(viewFn: () => View): SimpleComponent {
  return (context) => ({
    view: viewFn
  })
}

/**
 * Create a component with reactive state
 */
export function reactive<TState = any>(
  initialState: TState,
  render: (state: State<TState>, context: ComponentContext) => View
): SimpleComponent {
  return (context) => {
    const state = context.$state(initialState)
    
    return {
      view: () => render(state, context)
    }
  }
}