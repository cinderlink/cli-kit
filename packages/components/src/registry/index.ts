/**
 * Component Registry System - Component registration and discovery
 * 
 * This module provides comprehensive component registry functionality
 * for registering, discovering, and instantiating components with
 * dependency resolution and metadata support.
 * 
 * @module components/registry
 */

import { Effect } from "effect"
import type { Component, ComponentDefinition, ComponentMetadata, ComponentFactory, ComponentConstructor } from "../base/index"
import { createInstance } from "../base/index"
import { ComponentRegistrationError, ComponentDependencyError } from "../base/errors"

/**
 * Component registry interface
 */
export interface ComponentRegistry {
  register<Props, State>(definition: ComponentDefinition<Props, State>): void
  get<Props, State>(name: string): ComponentDefinition<Props, State> | undefined
  list(): string[]
  has(name: string): boolean
  unregister(name: string): void
  create<Props, State>(name: string, props: Props): Component<Props, State>
  resolveDependencies(name: string): string[]
}

/**
 * Default component registry implementation
 */
export class DefaultComponentRegistry implements ComponentRegistry {
  private components = new Map<string, ComponentDefinition<any, any>>()

  register<Props, State>(definition: ComponentDefinition<Props, State>): void {
    if (this.components.has(definition.name)) {
      throw new ComponentRegistrationError({
        componentName: definition.name,
        operation: 'register',
        reason: 'Component already registered'
      })
    }

    // Validate dependencies
    if (definition.dependencies) {
      for (const dep of definition.dependencies) {
        if (!this.components.has(dep)) {
          throw new ComponentDependencyError(definition.name, {
            missingDependencies: [dep]
          })
        }
      }
    }

    this.components.set(definition.name, definition)
  }

  get<Props, State>(name: string): ComponentDefinition<Props, State> | undefined {
    return this.components.get(name)
  }

  list(): string[] {
    return Array.from(this.components.keys())
  }

  has(name: string): boolean {
    return this.components.has(name)
  }

  unregister(name: string): void {
    this.components.delete(name)
  }

  create<Props, State>(name: string, props: Props): Component<Props, State> {
    const definition = this.get<Props, State>(name)
    if (!definition) {
      throw new ComponentRegistrationError({
        componentName: name,
        operation: 'create',
        reason: 'Component not found'
      })
    }

    return createInstance(definition, props)
  }

  resolveDependencies(name: string): string[] {
    const definition = this.components.get(name)
    return definition?.dependencies || []
  }
}

/**
 * Global component registry
 */
export const globalRegistry: ComponentRegistry = new DefaultComponentRegistry()

/**
 * Register a component
 */
export function registerComponent<Props, State>(definition: ComponentDefinition<Props, State>): void {
  globalRegistry.register(definition)
}

/**
 * Get a component definition
 */
export function getComponent<Props, State>(name: string): ComponentDefinition<Props, State> | undefined {
  return globalRegistry.get(name)
}

/**
 * Create component instance
 */
export function createComponent<Props, State>(name: string, props: Props): Component<Props, State> {
  return globalRegistry.create(name, props)
}