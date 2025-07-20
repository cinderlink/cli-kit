/**
 * Reactive Component Integration
 * 
 * Provides integration between the reactive system and TUIX components,
 * coordinating with Task 1F for seamless component-reactive system integration.
 * 
 * This module defines the integration patterns and interfaces that allow
 * components to use reactive state, effects, and derived values while
 * maintaining compatibility with the existing component architecture.
 * 
 * @example
 * ```typescript
 * import { useReactiveState, useReactiveEffect, ReactiveComponent } from '@tuix/reactive/components'
 * 
 * // Reactive hook integration
 * function MyComponent() {
 *   const state = useReactiveState({ count: 0 })
 *   const doubled = useReactiveDerived(() => state.value.count * 2)
 *   
 *   useReactiveEffect(() => {
 *     console.log('Count:', state.value.count)
 *   })
 *   
 *   return <div>{doubled.value}</div>
 * }
 * 
 * // Class-based reactive component
 * class CounterComponent extends ReactiveComponent {
 *   state = this.useState({ count: 0 })
 *   doubled = this.useDerived(() => this.state.value.count * 2)
 *   
 *   onMount() {
 *     this.useEffect(() => {
 *       console.log('Count:', this.state.value.count)
 *     })
 *   }
 * }
 * ```
 */

import { $state, $derived, $effect, State, Derived, EffectFunction } from '../runes'
import { StateContainer, createState } from '../state'
import { EffectHandle, createEffect, onCleanup, onMount, onUnmount } from '../effects'
import { Effect } from "effect"

// =============================================================================
// Integration Interfaces for Task 1F Coordination
// =============================================================================

/**
 * Reactive component integration interface
 * 
 * This interface defines how reactive capabilities integrate with
 * the component system from Task 1F. It provides a bridge between
 * reactive state management and component lifecycle.
 */
export interface ReactiveComponentIntegration {
  /**
   * Initialize reactive state for a component
   */
  initializeReactiveState<T>(initialState: T): StateContainer<T>
  
  /**
   * Create component-scoped derived values
   */
  createComponentDerived<T>(fn: () => T): Derived<T>
  
  /**
   * Register component-scoped effects
   */
  registerComponentEffect(fn: EffectFunction): EffectHandle
  
  /**
   * Cleanup all reactive resources for a component
   */
  cleanupComponent(componentId: string): void
  
  /**
   * Connect reactive state to component props
   */
  connectProps<T>(props: T): State<T>
}

/**
 * Component reactive context
 * 
 * Tracks reactive resources associated with a component instance
 * for proper cleanup and lifecycle management.
 */
export interface ComponentReactiveContext {
  readonly componentId: string
  readonly mounted: boolean
  readonly states: Set<StateContainer<any>>
  readonly effects: Set<EffectHandle>
  readonly deriveds: Set<Derived<any>>
}

/**
 * Reactive component lifecycle hooks
 * 
 * Defines lifecycle integration points that coordinate with
 * Task 1F's component lifecycle system.
 */
export interface ReactiveLifecycleHooks {
  onReactiveMount?: () => void | (() => void)
  onReactiveUpdate?: () => void | (() => void)
  onReactiveUnmount?: () => void
}

// =============================================================================
// Component Context Management
// =============================================================================

/**
 * Component reactive context registry
 */
class ComponentContextRegistry {
  private contexts = new Map<string, ComponentReactiveContext>()
  private activeContext: ComponentReactiveContext | undefined
  
  createContext(componentId: string): ComponentReactiveContext {
    const context: ComponentReactiveContext = {
      componentId,
      mounted: false,
      states: new Set(),
      effects: new Set(),
      deriveds: new Set()
    }
    
    this.contexts.set(componentId, context)
    return context
  }
  
  getContext(componentId: string): ComponentReactiveContext | undefined {
    return this.contexts.get(componentId)
  }
  
  setActiveContext(context: ComponentReactiveContext | undefined): void {
    this.activeContext = context
  }
  
  getActiveContext(): ComponentReactiveContext | undefined {
    return this.activeContext
  }
  
  cleanupContext(componentId: string): void {
    const context = this.contexts.get(componentId)
    if (context) {
      // Cleanup all reactive resources
      context.effects.forEach(effect => effect.dispose())
      context.states.clear()
      context.effects.clear()
      context.deriveds.clear()
      
      this.contexts.delete(componentId)
    }
  }
  
  getAllContexts(): ComponentReactiveContext[] {
    return Array.from(this.contexts.values())
  }
}

const contextRegistry = new ComponentContextRegistry()

// =============================================================================
// Reactive Component Base Class
// =============================================================================

/**
 * Base class for reactive components
 * 
 * Provides reactive capabilities integrated with component lifecycle.
 * Designed to coordinate with Task 1F's component system.
 */
export abstract class ReactiveComponent {
  private context: ComponentReactiveContext
  private disposed = false
  
  constructor(componentId?: string) {
    this.context = contextRegistry.createContext(
      componentId || `reactive_component_${Date.now()}_${Math.random()}`
    )
  }
  
  /**
   * Create component-scoped reactive state
   */
  protected useState<T>(initial: T): StateContainer<T> {
    if (this.disposed) {
      throw new Error('Cannot create state on disposed component')
    }
    
    const state = createState(initial)
    this.context.states.add(state)
    return state
  }
  
  /**
   * Create component-scoped derived value
   */
  protected useDerived<T>(fn: () => T): Derived<T> {
    if (this.disposed) {
      throw new Error('Cannot create derived value on disposed component')
    }
    
    const derived = $derived(fn)
    this.context.deriveds.add(derived)
    return derived
  }
  
  /**
   * Create component-scoped effect
   */
  protected useEffect(fn: EffectFunction): EffectHandle {
    if (this.disposed) {
      throw new Error('Cannot create effect on disposed component')
    }
    
    const effect = createEffect(fn)
    this.context.effects.add(effect)
    return effect
  }
  
  /**
   * Get component reactive context
   */
  protected getContext(): ComponentReactiveContext {
    return this.context
  }
  
  /**
   * Mount the component (called by component system)
   */
  mount(): void {
    if (this.disposed) return
    
    contextRegistry.setActiveContext(this.context)
    
    try {
      this.onMount?.()
      Object.defineProperty(this.context, 'mounted', { value: true })
    } finally {
      contextRegistry.setActiveContext(undefined)
    }
  }
  
  /**
   * Unmount the component (called by component system)
   */
  unmount(): void {
    if (this.disposed) return
    
    this.disposed = true
    this.onUnmount?.()
    contextRegistry.cleanupContext(this.context.componentId)
  }
  
  /**
   * Component mount hook - override in subclasses
   */
  protected onMount?(): void
  
  /**
   * Component unmount hook - override in subclasses
   */
  protected onUnmount?(): void
  
  /**
   * Check if component is disposed
   */
  get isDisposed(): boolean {
    return this.disposed
  }
  
  /**
   * Get component ID
   */
  get componentId(): string {
    return this.context.componentId
  }
}

// =============================================================================
// Hook-Style Integration Functions
// =============================================================================

/**
 * Hook-style reactive state for functional components
 * 
 * Creates reactive state that's automatically cleaned up when
 * the component unmounts. Coordinates with Task 1F's hook system.
 */
export function useReactiveState<T>(initial: T): StateContainer<T> {
  const context = contextRegistry.getActiveContext()
  if (!context) {
    console.warn('useReactiveState called outside of component context')
    return createState(initial)
  }
  
  const state = createState(initial)
  context.states.add(state)
  return state
}

/**
 * Hook-style derived value for functional components
 */
export function useReactiveDerived<T>(fn: () => T): Derived<T> {
  const context = contextRegistry.getActiveContext()
  const derived = $derived(fn)
  
  if (context) {
    context.deriveds.add(derived)
  }
  
  return derived
}

/**
 * Hook-style effect for functional components
 */
export function useReactiveEffect(fn: EffectFunction): EffectHandle {
  const context = contextRegistry.getActiveContext()
  const effect = createEffect(fn)
  
  if (context) {
    context.effects.add(effect)
  }
  
  return effect
}

// =============================================================================
// Integration Utilities for Task 1F
// =============================================================================

/**
 * Create reactive component integration instance
 * 
 * This function creates the integration bridge between the reactive
 * system and Task 1F's component system.
 */
export function createReactiveIntegration(): ReactiveComponentIntegration {
  return {
    initializeReactiveState<T>(initialState: T): StateContainer<T> {
      return createState(initialState)
    },
    
    createComponentDerived<T>(fn: () => T): Derived<T> {
      return $derived(fn)
    },
    
    registerComponentEffect(fn: EffectFunction): EffectHandle {
      return createEffect(fn)
    },
    
    cleanupComponent(componentId: string): void {
      contextRegistry.cleanupContext(componentId)
    },
    
    connectProps<T>(props: T): State<T> {
      return $state(props)
    }
  }
}

/**
 * Component reactive wrapper for existing components
 * 
 * Wraps existing components to add reactive capabilities
 * while maintaining compatibility with Task 1F's component system.
 */
export function withReactive<TComponent extends object>(
  Component: TComponent,
  options: {
    stateMapping?: (props: any) => any
    effectsSetup?: (context: ComponentReactiveContext) => void
  } = {}
): TComponent & { reactive: ReactiveComponentIntegration } {
  const integration = createReactiveIntegration()
  
  return Object.assign(Component, {
    reactive: integration
  })
}

/**
 * Create reactive component store
 * 
 * Creates a centralized reactive store for complex component state management
 */
export function createComponentStore<T extends Record<string, any>>(
  initialState: T,
  componentId?: string
) {
  const state = createState(initialState)
  const context = contextRegistry.getActiveContext()
  
  if (context && componentId) {
    context.states.add(state)
  }
  
  return {
    ...state,
    
    /**
     * Select a specific value from the store
     */
    select<R>(selector: (state: T) => R): Derived<R> {
      const derived = $derived(() => selector(state.value))
      if (context) {
        context.deriveds.add(derived)
      }
      return derived
    },
    
    /**
     * Create an effect that responds to store changes
     */
    watch<R>(
      selector: (state: T) => R,
      effect: (value: R) => void | (() => void)
    ): EffectHandle {
      const effectHandle = createEffect(() => {
        const value = selector(state.value)
        return effect(value)
      })
      
      if (context) {
        context.effects.add(effectHandle)
      }
      
      return effectHandle
    }
  }
}

// =============================================================================
// Coordination Interface for Task 1F
// =============================================================================

/**
 * Reactive system API for Task 1F integration
 * 
 * This object provides the public API that Task 1F can use to
 * integrate reactive capabilities into their component system.
 */
export const ReactiveSystemAPI = {
  /**
   * Create reactive integration for a component
   */
  createIntegration: createReactiveIntegration,
  
  /**
   * Component context management
   */
  context: {
    create: (id: string) => contextRegistry.createContext(id),
    get: (id: string) => contextRegistry.getContext(id),
    cleanup: (id: string) => contextRegistry.cleanupContext(id),
    setActive: (context: ComponentReactiveContext | undefined) => 
      contextRegistry.setActiveContext(context)
  },
  
  /**
   * Hook functions for component integration
   */
  hooks: {
    useState: useReactiveState,
    useDerived: useReactiveDerived,
    useEffect: useReactiveEffect
  },
  
  /**
   * Reactive component base class
   */
  ReactiveComponent,
  
  /**
   * Component enhancement utilities
   */
  withReactive,
  createComponentStore
}

// =============================================================================
// Type Exports for Task 1F Coordination
// =============================================================================

export type {
  ReactiveComponentIntegration,
  ComponentReactiveContext,
  ReactiveLifecycleHooks
}