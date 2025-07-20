/**
 * ReactiveComponent - Base class for reactive TUIX components
 * 
 * Provides the foundation for building reactive components with:
 * - Reactive state management using $state, $derived, $effect
 * - Lifecycle management (onMount, onDestroy)
 * - Automatic cleanup of effects and subscriptions
 * - Integration with TUIX MVU architecture
 */

import { Effect, Ref } from "effect"
import { $state, $derived, $effect, type Signal, type ReadonlySignal } from "./reactivity"
import type { View, Cmd, AppServices } from "@tuix/core"

export interface ReactiveComponentState {
  mounted: boolean
  destroyed: boolean
  effects: Array<() => void>
  subscriptions: Array<() => void>
}

/**
 * Base class for reactive components
 */
export abstract class ReactiveComponent {
  protected _state: ReactiveComponentState
  protected _stateRef: Ref.Ref<ReactiveComponentState>
  
  constructor() {
    this._state = {
      mounted: false,
      destroyed: false,
      effects: [],
      subscriptions: []
    }
    this._stateRef = Ref.make(this._state)
  }
  
  /**
   * Create reactive state
   */
  protected $state<T>(initial: T): Signal<T> {
    return $state(initial)
  }
  
  /**
   * Create derived reactive state
   */
  protected $derived<T>(computation: () => T): ReadonlySignal<T> {
    return $derived(computation)
  }
  
  /**
   * Create reactive effect
   */
  protected $effect(fn: () => void | (() => void)): void {
    const cleanup = $effect(fn)
    this._state.effects.push(cleanup)
  }
  
  /**
   * Mount the component
   */
  async mount(): Promise<void> {
    if (this._state.mounted) return
    
    this._state.mounted = true
    await this.onMount()
  }
  
  /**
   * Destroy the component
   */
  async destroy(): Promise<void> {
    if (this._state.destroyed) return
    
    this._state.destroyed = true
    
    // Clean up all effects
    this._state.effects.forEach(cleanup => cleanup())
    this._state.effects = []
    
    // Clean up all subscriptions
    this._state.subscriptions.forEach(cleanup => cleanup())
    this._state.subscriptions = []
    
    await this.onDestroy()
  }
  
  /**
   * Lifecycle hook called when component is mounted
   */
  protected async onMount(): Promise<void> {
    // Override in subclasses
  }
  
  /**
   * Lifecycle hook called when component is destroyed
   */
  protected async onDestroy(): Promise<void> {
    // Override in subclasses
  }
  
  /**
   * Add a subscription for cleanup
   */
  protected addSubscription(cleanup: () => void): void {
    this._state.subscriptions.push(cleanup)
  }
  
  /**
   * Get current state (must be implemented by subclasses)
   */
  abstract getState(): any
  
  /**
   * Cleanup resources (must be implemented by subclasses)
   */
  abstract cleanup(state: any): Promise<void>
}

/**
 * Simple effect implementation for reactive components
 */
export function $effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | undefined
  
  // Run the effect immediately
  const result = fn()
  if (typeof result === 'function') {
    cleanup = result
  }
  
  // Return cleanup function
  return () => {
    if (cleanup) {
      cleanup()
    }
  }
}