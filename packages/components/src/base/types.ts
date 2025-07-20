/**
 * Component Base Types - Type definitions for the component system
 * 
 * This module defines comprehensive types for the TUIX component system,
 * including component interfaces, lifecycle phases, state management,
 * and integration with the reactive system.
 * 
 * @module components/base/types
 */

import { Effect } from "effect"
import type { ComponentError } from "@tuix/core/errors"

/**
 * Component lifecycle phase enumeration
 * 
 * Tracks the current phase of a component's lifecycle for
 * proper state management and operation validation.
 */
export enum LifecyclePhase {
  INITIALIZING = 'initializing',
  MOUNTING = 'mounting',
  MOUNTED = 'mounted',
  UPDATING = 'updating',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
  ERROR = 'error'
}

/**
 * Component instance with lifecycle tracking
 * 
 * Wraps a component with additional metadata and state
 * for lifecycle management and runtime operations.
 * 
 * @template Props - The component's props type
 * @template State - The component's internal state type
 */
export interface ComponentInstance<Props = {}, State = {}> {
  /**
   * Unique instance identifier
   */
  readonly id: string

  /**
   * Component definition name
   */
  readonly name: string

  /**
   * Underlying component implementation
   */
  readonly component: Component<Props, State>

  /**
   * Current lifecycle phase
   */
  readonly phase: LifecyclePhase

  /**
   * Current component props
   */
  readonly props: Props

  /**
   * Current component state
   */
  readonly state: State | undefined

  /**
   * Instance creation timestamp
   */
  readonly createdAt: Date

  /**
   * Last update timestamp
   */
  readonly updatedAt: Date

  /**
   * Instance metadata
   */
  readonly metadata: Record<string, any>
}

/**
 * Component reference for parent-child relationships
 * 
 * Lightweight reference to a component instance for
 * building component trees and managing relationships.
 */
export interface ComponentRef<Props = {}, State = {}> {
  /**
   * Component instance ID
   */
  readonly id: string

  /**
   * Component name
   */
  readonly name: string

  /**
   * Reference to component instance
   */
  readonly instance: ComponentInstance<Props, State>

  /**
   * Parent component reference
   */
  readonly parent?: ComponentRef

  /**
   * Child component references
   */
  readonly children: ComponentRef[]
}

/**
 * Component tree structure
 * 
 * Represents the hierarchical structure of components
 * for rendering and lifecycle management.
 */
export interface ComponentTree {
  /**
   * Root component reference
   */
  readonly root: ComponentRef

  /**
   * All component instances by ID
   */
  readonly instances: Map<string, ComponentInstance>

  /**
   * Component hierarchy relationships
   */
  readonly hierarchy: Map<string, ComponentRef>
}

/**
 * Component context for runtime operations
 * 
 * Provides access to component system services and
 * runtime capabilities for component implementations.
 */
export interface ComponentContext {
  /**
   * Component instance ID
   */
  readonly instanceId: string

  /**
   * Component name
   */
  readonly name: string

  /**
   * Current lifecycle phase
   */
  readonly phase: LifecyclePhase

  /**
   * Parent component context
   */
  readonly parent?: ComponentContext

  /**
   * Child component contexts
   */
  readonly children: ComponentContext[]

  /**
   * Component services
   */
  readonly services: ComponentServices

  /**
   * Runtime metadata
   */
  readonly metadata: Record<string, any>
}

/**
 * Component services interface
 * 
 * Provides access to system services needed by components
 * for lifecycle management, event handling, and integration.
 */
export interface ComponentServices {
  /**
   * Lifecycle manager
   */
  readonly lifecycle: ComponentLifecycleManager

  /**
   * Event system
   */
  readonly events: ComponentEventSystem

  /**
   * Registry access
   */
  readonly registry: ComponentRegistry

  /**
   * State manager
   */
  readonly state: ComponentStateManager

  /**
   * Props validator
   */
  readonly props: ComponentPropsManager
}

/**
 * Component lifecycle manager interface
 * 
 * Manages component lifecycle operations with proper
 * phase tracking and error handling.
 */
export interface ComponentLifecycleManager {
  /**
   * Mount a component instance
   */
  mount<Props, State>(
    component: Component<Props, State>,
    props: Props
  ): Effect.Effect<State, ComponentError, never>

  /**
   * Update a component instance
   */
  update<Props, State>(
    component: Component<Props, State>,
    props: Props,
    state: State
  ): Effect.Effect<State, ComponentError, never>

  /**
   * Unmount a component instance
   */
  unmount<State>(
    component: Component<any, State>,
    state: State
  ): Effect.Effect<void, ComponentError, never>

  /**
   * Get component lifecycle phase
   */
  getPhase(instanceId: string): LifecyclePhase

  /**
   * Set component lifecycle phase
   */
  setPhase(instanceId: string, phase: LifecyclePhase): void
}

/**
 * Component event system interface
 * 
 * Handles component-to-component communication and
 * system-wide event propagation.
 */
export interface ComponentEventSystem {
  /**
   * Emit component event
   */
  emit<T>(event: string, data: T, source?: string): void

  /**
   * Subscribe to component events
   */
  on<T>(event: string, handler: (data: T, source?: string) => void): () => void

  /**
   * Subscribe to component events (once)
   */
  once<T>(event: string, handler: (data: T, source?: string) => void): () => void

  /**
   * Remove event listeners
   */
  off(event: string, handler?: Function): void

  /**
   * Propagate event through component tree
   */
  propagate<T>(event: string, data: T, source: string): void
}

/**
 * Component registry interface
 * 
 * Manages component registration, discovery, and instantiation
 * with dependency resolution and metadata support.
 */
export interface ComponentRegistry {
  /**
   * Register component definition
   */
  register<Props, State>(definition: ComponentDefinition<Props, State>): void

  /**
   * Get component definition
   */
  get<Props, State>(name: string): ComponentDefinition<Props, State> | undefined

  /**
   * List all registered components
   */
  list(): string[]

  /**
   * Check if component is registered
   */
  has(name: string): boolean

  /**
   * Unregister component
   */
  unregister(name: string): void

  /**
   * Create component instance
   */
  create<Props, State>(name: string, props: Props): ComponentInstance<Props, State>

  /**
   * Resolve component dependencies
   */
  resolveDependencies(name: string): string[]
}

/**
 * Component state manager interface
 * 
 * Manages component state with reactive integration
 * and change tracking capabilities.
 */
export interface ComponentStateManager {
  /**
   * Get component state
   */
  getState<State>(instanceId: string): State | undefined

  /**
   * Set component state
   */
  setState<State>(instanceId: string, state: State): void

  /**
   * Update component state
   */
  updateState<State>(
    instanceId: string,
    updater: (state: State) => State
  ): void

  /**
   * Subscribe to state changes
   */
  subscribe<State>(
    instanceId: string,
    handler: (state: State) => void
  ): () => void

  /**
   * Clear component state
   */
  clearState(instanceId: string): void
}

/**
 * Component props manager interface
 * 
 * Handles props validation, transformation, and
 * change detection for component updates.
 */
export interface ComponentPropsManager {
  /**
   * Validate component props
   */
  validate<Props>(name: string, props: Props): Props

  /**
   * Transform component props
   */
  transform<Props>(name: string, props: Props): Props

  /**
   * Check if props have changed
   */
  hasChanged<Props>(oldProps: Props, newProps: Props): boolean

  /**
   * Get default props
   */
  getDefaults<Props>(name: string): Partial<Props>

  /**
   * Merge props with defaults
   */
  mergeDefaults<Props>(name: string, props: Partial<Props>): Props
}

/**
 * Re-export component interface from main module
 */
export type { Component } from './index'

/**
 * Re-export component definition from main module
 */
export type { ComponentDefinition, ComponentMetadata, ComponentExample } from './index'