/**
 * Component Base System - Core interfaces and base implementation for TUIX components
 * 
 * This module provides the foundational types and utilities for building reactive
 * terminal UI components with lifecycle management, props handling, state integration,
 * and Effect.ts integration for the TUIX framework.
 * 
 * ## Key Features:
 * 
 * ### Component Architecture
 * - Generic Component interface with lifecycle methods
 * - BaseComponent class providing common functionality
 * - Type-safe props and state handling
 * - Effect.ts integration for async operations
 * 
 * ### Lifecycle Management
 * - init: Component initialization with props
 * - update: Props/state changes handling
 * - render: Pure view rendering
 * - cleanup: Resource cleanup and disposal
 * 
 * ### Error Handling
 * - ComponentError integration
 * - Graceful error recovery
 * - Error boundaries support
 * 
 * @example
 * ```typescript
 * import { Component, BaseComponent, ComponentError } from './base'
 * 
 * interface CounterProps {
 *   initialCount: number
 * }
 * 
 * interface CounterState {
 *   count: number
 * }
 * 
 * class Counter extends BaseComponent<CounterProps, CounterState> {
 *   init(props: CounterProps) {
 *     return Effect.succeed({ count: props.initialCount })
 *   }
 * 
 *   render(props: CounterProps, state: CounterState) {
 *     return <Text>Count: {state.count}</Text>
 *   }
 * }
 * ```
 * 
 * @module components/base
 */

import { Effect } from "effect"
import type { ComponentError } from "@tuix/core/errors"

// Re-export for convenience
export type { ComponentError }

/**
 * Core component interface for all TUIX components
 * 
 * Defines the fundamental contract that all components must implement,
 * providing lifecycle methods, props handling, state management, and
 * rendering capabilities with full Effect.ts integration.
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export interface Component<Props = {}, State = {}> {
  /**
   * Initialize component state from props
   * 
   * Called when the component is first created. Should return the
   * initial state based on the provided props. This is the only
   * place where state is created from scratch.
   * 
   * @param props - Component props for initialization
   * @returns Effect that resolves to initial state
   */
  init(props: Props): Effect.Effect<State, ComponentError, never>

  /**
   * Update component state when props change
   * 
   * Called when component props change. Should return updated state
   * based on new props and current state. The default implementation
   * returns the current state unchanged.
   * 
   * @param props - New component props
   * @param state - Current component state
   * @returns Effect that resolves to updated state
   */
  update(props: Props, state: State): Effect.Effect<State, ComponentError, never>

  /**
   * Render component view from props and state
   * 
   * Pure function that transforms props and state into a JSX element.
   * Should not have side effects or modify state. Called on every render.
   * 
   * @param props - Current component props
   * @param state - Current component state
   * @returns JSX element representing the component
   */
  render(props: Props, state: State): JSX.Element

  /**
   * Cleanup component resources
   * 
   * Optional method called when component is unmounted. Use this to
   * clean up subscriptions, timers, or other resources to prevent
   * memory leaks.
   * 
   * @param state - Final component state
   * @returns Effect that resolves when cleanup is complete
   */
  cleanup?(state: State): Effect.Effect<void, ComponentError, never>
}

/**
 * Base component class implementing common functionality
 * 
 * Provides a foundation for component implementations with:
 * - Default lifecycle method implementations
 * - Effect management and cleanup
 * - Mount state tracking
 * - Common component patterns
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export abstract class BaseComponent<Props = {}, State = {}> implements Component<Props, State> {
  /**
   * Current component state
   * Protected to allow subclass access while maintaining encapsulation
   */
  protected state: State | undefined

  /**
   * Current component props
   * Protected to allow subclass access while maintaining encapsulation
   */
  protected props: Props | undefined

  /**
   * Mount state tracking
   * Prevents operations on unmounted components
   */
  protected mounted: boolean = false

  /**
   * Active effects for cleanup
   * Tracks running effects to ensure proper cleanup
   */
  protected effects: Effect.Effect<any, any, any>[] = []

  /**
   * Abstract init method - must be implemented by subclasses
   * 
   * @param props - Component props for initialization
   * @returns Effect that resolves to initial state
   */
  abstract init(props: Props): Effect.Effect<State, ComponentError, never>

  /**
   * Abstract render method - must be implemented by subclasses
   * 
   * @param props - Current component props
   * @param state - Current component state
   * @returns JSX element representing the component
   */
  abstract render(props: Props, state: State): JSX.Element

  /**
   * Default update implementation
   * 
   * Returns the current state unchanged. Override in subclasses
   * that need to handle prop changes.
   * 
   * @param props - New component props
   * @param state - Current component state
   * @returns Effect that resolves to unchanged state
   */
  update(props: Props, state: State): Effect.Effect<State, ComponentError, never> {
    return Effect.succeed(state)
  }

  /**
   * Default cleanup implementation
   * 
   * Cleans up tracked effects and resets mount state.
   * Override in subclasses that need additional cleanup.
   * 
   * @param state - Final component state
   * @returns Effect that resolves when cleanup is complete
   */
  cleanup?(state: State): Effect.Effect<void, ComponentError, never> {
    this.mounted = false
    this.effects = []
    return Effect.succeed(void 0)
  }

  /**
   * Check if component is currently mounted
   * 
   * @returns True if component is mounted
   */
  isMounted(): boolean {
    return this.mounted
  }

  /**
   * Get current component state
   * 
   * @returns Current state or undefined if not initialized
   */
  getState(): State | undefined {
    return this.state
  }

  /**
   * Get current component props
   * 
   * @returns Current props or undefined if not initialized
   */
  getProps(): Props | undefined {
    return this.props
  }

  /**
   * Add an effect to be tracked for cleanup
   * 
   * @param effect - Effect to track
   */
  protected addEffect<A, E, R>(effect: Effect.Effect<A, E, R>): void {
    this.effects.push(effect)
  }

  /**
   * Remove an effect from tracking
   * 
   * @param effect - Effect to untrack
   */
  protected removeEffect<A, E, R>(effect: Effect.Effect<A, E, R>): void {
    const index = this.effects.indexOf(effect)
    if (index >= 0) {
      this.effects.splice(index, 1)
    }
  }

  /**
   * Internal method to set mount state
   * Used by lifecycle manager
   * 
   * @internal
   */
  _setMounted(mounted: boolean): void {
    this.mounted = mounted
  }

  /**
   * Internal method to set state
   * Used by lifecycle manager
   * 
   * @internal
   */
  _setState(state: State): void {
    this.state = state
  }

  /**
   * Internal method to set props
   * Used by lifecycle manager
   * 
   * @internal
   */
  _setProps(props: Props): void {
    this.props = props
  }
}

/**
 * Component factory function type
 * 
 * A function that creates component instances with given props.
 * Used for component registration and instantiation.
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export interface ComponentFactory<Props = {}, State = {}> {
  (props: Props): Component<Props, State>
}

/**
 * Component constructor type
 * 
 * A class constructor that creates component instances.
 * Alternative to factory functions for class-based components.
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export interface ComponentConstructor<Props = {}, State = {}> {
  new (props?: Props): Component<Props, State>
}

/**
 * Component definition for registration
 * 
 * Contains all information needed to register and create
 * component instances, including metadata and dependencies.
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export interface ComponentDefinition<Props = {}, State = {}> {
  /**
   * Unique component name/identifier
   */
  name: string

  /**
   * Component factory or constructor
   */
  component: ComponentFactory<Props, State> | ComponentConstructor<Props, State>

  /**
   * Component metadata
   */
  metadata?: ComponentMetadata

  /**
   * Component dependencies
   */
  dependencies?: string[]
}

/**
 * Component metadata for documentation and tooling
 * 
 * Provides information about component purpose, usage,
 * and capabilities for development tools and documentation.
 */
export interface ComponentMetadata {
  /**
   * Human-readable component description
   */
  description?: string

  /**
   * Component version
   */
  version?: string

  /**
   * Component author
   */
  author?: string

  /**
   * Component tags for categorization
   */
  tags?: string[]

  /**
   * Whether component is experimental
   */
  experimental?: boolean

  /**
   * Whether component is deprecated
   */
  deprecated?: boolean

  /**
   * Props schema for validation
   */
  propsSchema?: any

  /**
   * Usage examples
   */
  examples?: ComponentExample[]
}

/**
 * Component usage example
 * 
 * Provides example code showing how to use the component
 * for documentation and development tools.
 */
export interface ComponentExample {
  /**
   * Example title
   */
  title: string

  /**
   * Example description
   */
  description?: string

  /**
   * Example code
   */
  code: string

  /**
   * Expected output or behavior
   */
  output?: string
}

/**
 * Create a component factory from a component class
 * 
 * Converts a component constructor into a factory function
 * for easier registration and instantiation.
 * 
 * @param ComponentClass - Component constructor
 * @returns Component factory function
 * 
 * @example
 * ```typescript
 * class MyComponent extends BaseComponent<MyProps, MyState> {
 *   // Implementation...
 * }
 * 
 * const factory = createFactory(MyComponent)
 * const instance = factory({ prop: 'value' })
 * ```
 */
export function createFactory<Props, State>(
  ComponentClass: ComponentConstructor<Props, State>
): ComponentFactory<Props, State> {
  return (props: Props) => new ComponentClass(props)
}

/**
 * Check if a value is a component factory
 * 
 * @param value - Value to check
 * @returns True if value is a component factory
 */
export function isComponentFactory<Props, State>(
  value: any
): value is ComponentFactory<Props, State> {
  return typeof value === 'function' && value.length > 0
}

/**
 * Check if a value is a component constructor
 * 
 * @param value - Value to check
 * @returns True if value is a component constructor
 */
export function isComponentConstructor<Props, State>(
  value: any
): value is ComponentConstructor<Props, State> {
  return typeof value === 'function' && value.prototype && value.prototype.constructor === value
}

/**
 * Create a component instance from definition and props
 * 
 * Handles both factory and constructor-based components
 * for unified component instantiation.
 * 
 * @param definition - Component definition
 * @param props - Component props
 * @returns Component instance
 * 
 * @example
 * ```typescript
 * const definition = {
 *   name: 'MyComponent',
 *   component: MyComponentClass
 * }
 * 
 * const instance = createInstance(definition, { prop: 'value' })
 * ```
 */
export function createInstance<Props, State>(
  definition: ComponentDefinition<Props, State>,
  props: Props
): Component<Props, State> {
  if (isComponentFactory(definition.component)) {
    return definition.component(props)
  } else if (isComponentConstructor(definition.component)) {
    return new definition.component(props)
  } else {
    throw new Error(`Invalid component definition: ${definition.name}`)
  }
}