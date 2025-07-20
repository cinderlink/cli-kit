/**
 * Component Error Types - Error definitions for the component system
 * 
 * This module defines specific error types for component operations,
 * extending the core error system with component-specific error
 * handling and recovery strategies.
 * 
 * @module components/base/errors
 */

import { Data } from "effect"
import type { ComponentError as CoreComponentError } from "@tuix/core"

// Re-export core component error
export type { ComponentError } from "@tuix/core"

/**
 * Component lifecycle error
 * 
 * Thrown when component lifecycle operations fail,
 * such as initialization, mounting, or cleanup.
 */
export class ComponentLifecycleError extends Data.TaggedError("ComponentLifecycleError")<{
  readonly instanceId: string
  readonly phase: string
  readonly operation: string
  readonly cause?: unknown
}> {
  get message() {
    return `Component lifecycle error in ${this.phase} phase: ${this.operation} failed for instance ${this.instanceId}`
  }
}

/**
 * Component props validation error
 * 
 * Thrown when component props fail validation or
 * transformation during component operations.
 */
export class ComponentPropsError extends Data.TaggedError("ComponentPropsError")<{
  readonly componentName: string
  readonly propName?: string
  readonly expectedType?: string
  readonly receivedType?: string
  readonly cause?: unknown
}> {
  get message() {
    const prop = this.propName ? ` for prop '${this.propName}'` : ''
    const type = this.expectedType && this.receivedType 
      ? ` (expected ${this.expectedType}, received ${this.receivedType})`
      : ''
    return `Component props validation error${prop} in ${this.componentName}${type}`
  }
}

/**
 * Component state error
 * 
 * Thrown when component state operations fail,
 * such as state initialization, updates, or access.
 */
export class ComponentStateError extends Data.TaggedError("ComponentStateError")<{
  readonly instanceId: string
  readonly operation: string
  readonly statePath?: string
  readonly cause?: unknown
}> {
  get message() {
    const path = this.statePath ? ` at path '${this.statePath}'` : ''
    return `Component state error: ${this.operation} failed${path} for instance ${this.instanceId}`
  }
}

/**
 * Component render error
 * 
 * Thrown when component rendering fails,
 * including JSX errors and view construction issues.
 */
export class ComponentRenderError extends Data.TaggedError("ComponentRenderError")<{
  readonly componentName: string
  readonly instanceId: string
  readonly renderPhase: string
  readonly cause?: unknown
}> {
  get message() {
    return `Component render error in ${this.renderPhase} phase for ${this.componentName} (${this.instanceId})`
  }
}

/**
 * Component dependency error
 * 
 * Thrown when component dependencies cannot be resolved
 * or when circular dependencies are detected.
 */
export class ComponentDependencyError extends Data.TaggedError("ComponentDependencyError")<{
  readonly componentName: string
  readonly missingDependencies?: string[]
  readonly circularDependencies?: string[]
  readonly cause?: unknown
}> {
  get message() {
    if (this.missingDependencies?.length) {
      return `Component dependency error: missing dependencies ${this.missingDependencies.join(', ')} for ${this.componentName}`
    }
    if (this.circularDependencies?.length) {
      return `Component dependency error: circular dependencies detected ${this.circularDependencies.join(' -> ')} for ${this.componentName}`
    }
    return `Component dependency error for ${this.componentName}`
  }
}

/**
 * Component registration error
 * 
 * Thrown when component registration operations fail,
 * such as duplicate registrations or invalid definitions.
 */
export class ComponentRegistrationError extends Data.TaggedError("ComponentRegistrationError")<{
  readonly componentName: string
  readonly operation: string
  readonly reason?: string
  readonly cause?: unknown
}> {
  get message() {
    const reason = this.reason ? `: ${this.reason}` : ''
    return `Component registration error: ${this.operation} failed for ${this.componentName}${reason}`
  }
}

/**
 * Component event error
 * 
 * Thrown when component event operations fail,
 * such as event emission, subscription, or handling.
 */
export class ComponentEventError extends Data.TaggedError("ComponentEventError")<{
  readonly eventName: string
  readonly operation: string
  readonly sourceComponent?: string
  readonly targetComponent?: string
  readonly cause?: unknown
}> {
  get message() {
    const source = this.sourceComponent ? ` from ${this.sourceComponent}` : ''
    const target = this.targetComponent ? ` to ${this.targetComponent}` : ''
    return `Component event error: ${this.operation} failed for event '${this.eventName}'${source}${target}`
  }
}

/**
 * Component composition error
 * 
 * Thrown when component composition operations fail,
 * such as higher-order component creation or wrapping.
 */
export class ComponentCompositionError extends Data.TaggedError("ComponentCompositionError")<{
  readonly operation: string
  readonly components: string[]
  readonly reason?: string
  readonly cause?: unknown
}> {
  get message() {
    const reason = this.reason ? `: ${this.reason}` : ''
    return `Component composition error: ${this.operation} failed for components [${this.components.join(', ')}]${reason}`
  }
}

/**
 * Component cleanup error
 * 
 * Thrown when component cleanup operations fail,
 * potentially leading to resource leaks.
 */
export class ComponentCleanupError extends Data.TaggedError("ComponentCleanupError")<{
  readonly instanceId: string
  readonly componentName: string
  readonly resource?: string
  readonly cause?: unknown
}> {
  get message() {
    const resource = this.resource ? ` (${this.resource})` : ''
    return `Component cleanup error: failed to cleanup ${this.componentName} (${this.instanceId})${resource}`
  }
}

/**
 * Component testing error
 * 
 * Thrown when component testing operations fail,
 * such as test harness creation or mock setup.
 */
export class ComponentTestingError extends Data.TaggedError("ComponentTestingError")<{
  readonly componentName: string
  readonly testOperation: string
  readonly reason?: string
  readonly cause?: unknown
}> {
  get message() {
    const reason = this.reason ? `: ${this.reason}` : ''
    return `Component testing error: ${this.testOperation} failed for ${this.componentName}${reason}`
  }
}

/**
 * Union of all component-specific errors
 * 
 * Provides a comprehensive type for handling any
 * component-related error in a type-safe manner.
 */
export type AnyComponentError =
  | ComponentLifecycleError
  | ComponentPropsError
  | ComponentStateError
  | ComponentRenderError
  | ComponentDependencyError
  | ComponentRegistrationError
  | ComponentEventError
  | ComponentCompositionError
  | ComponentCleanupError
  | ComponentTestingError

/**
 * Check if an error is a component-related error
 * 
 * @param error - Error to check
 * @returns True if error is component-related
 */
export function isComponentError(error: unknown): error is AnyComponentError {
  return error instanceof ComponentLifecycleError ||
         error instanceof ComponentPropsError ||
         error instanceof ComponentStateError ||
         error instanceof ComponentRenderError ||
         error instanceof ComponentDependencyError ||
         error instanceof ComponentRegistrationError ||
         error instanceof ComponentEventError ||
         error instanceof ComponentCompositionError ||
         error instanceof ComponentCleanupError ||
         error instanceof ComponentTestingError
}

/**
 * Create a component lifecycle error
 * 
 * @param instanceId - Component instance ID
 * @param phase - Lifecycle phase
 * @param operation - Failed operation
 * @param cause - Optional cause
 * @returns ComponentLifecycleError instance
 */
export function createLifecycleError(
  instanceId: string,
  phase: string,
  operation: string,
  cause?: unknown
): ComponentLifecycleError {
  return new ComponentLifecycleError({ instanceId, phase, operation, cause })
}

/**
 * Create a component props error
 * 
 * @param componentName - Component name
 * @param propName - Optional prop name
 * @param expectedType - Optional expected type
 * @param receivedType - Optional received type
 * @param cause - Optional cause
 * @returns ComponentPropsError instance
 */
export function createPropsError(
  componentName: string,
  propName?: string,
  expectedType?: string,
  receivedType?: string,
  cause?: unknown
): ComponentPropsError {
  return new ComponentPropsError({
    componentName,
    propName,
    expectedType,
    receivedType,
    cause
  })
}

/**
 * Create a component state error
 * 
 * @param instanceId - Component instance ID
 * @param operation - Failed operation
 * @param statePath - Optional state path
 * @param cause - Optional cause
 * @returns ComponentStateError instance
 */
export function createStateError(
  instanceId: string,
  operation: string,
  statePath?: string,
  cause?: unknown
): ComponentStateError {
  return new ComponentStateError({ instanceId, operation, statePath, cause })
}

/**
 * Create a component render error
 * 
 * @param componentName - Component name
 * @param instanceId - Component instance ID
 * @param renderPhase - Render phase
 * @param cause - Optional cause
 * @returns ComponentRenderError instance
 */
export function createRenderError(
  componentName: string,
  instanceId: string,
  renderPhase: string,
  cause?: unknown
): ComponentRenderError {
  return new ComponentRenderError({ componentName, instanceId, renderPhase, cause })
}

/**
 * Create a component dependency error
 * 
 * @param componentName - Component name
 * @param options - Error options
 * @returns ComponentDependencyError instance
 */
export function createDependencyError(
  componentName: string,
  options: {
    missingDependencies?: string[]
    circularDependencies?: string[]
    cause?: unknown
  } = {}
): ComponentDependencyError {
  return new ComponentDependencyError({
    componentName,
    ...options
  })
}