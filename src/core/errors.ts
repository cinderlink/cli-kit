/**
 * Core Module Error Definitions
 *
 * Centralized error types and factories for the core module.
 * All errors use tagged error patterns for proper Effect.ts integration.
 */

import { Effect } from 'effect'

/**
 * Base error class for all core module errors
 */
export abstract class CoreError {
  abstract readonly _tag: string
  abstract readonly message: string

  constructor(public readonly cause?: unknown) {}
}

/**
 * Runtime initialization errors
 */
export class RuntimeInitializationError extends CoreError {
  readonly _tag = 'RuntimeInitializationError'

  constructor(
    public readonly message: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * View system errors
 */
export class ViewSystemError extends CoreError {
  readonly _tag = 'ViewSystemError'

  constructor(
    public readonly message: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Lifecycle management errors
 */
export class LifecycleError extends CoreError {
  readonly _tag = 'LifecycleError'

  constructor(
    public readonly message: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Service integration errors
 */
export class ServiceIntegrationError extends CoreError {
  readonly _tag = 'ServiceIntegrationError'

  constructor(
    public readonly message: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Event system errors
 */
export class EventSystemError extends CoreError {
  readonly _tag = 'EventSystemError'

  constructor(
    public readonly message: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

// Error factories for common scenarios
export const CoreErrors = {
  runtimeInitialization: (message: string, cause?: unknown) =>
    new RuntimeInitializationError(message, cause),

  viewSystem: (message: string, cause?: unknown) => new ViewSystemError(message, cause),

  lifecycle: (message: string, cause?: unknown) => new LifecycleError(message, cause),

  serviceIntegration: (message: string, cause?: unknown) =>
    new ServiceIntegrationError(message, cause),

  eventSystem: (message: string, cause?: unknown) => new EventSystemError(message, cause),
} as const

// Type union for all core errors
export type CoreErrorType =
  | RuntimeInitializationError
  | ViewSystemError
  | LifecycleError
  | ServiceIntegrationError
  | EventSystemError

// Effect helpers
export const failWithCoreError = <E extends CoreErrorType>(error: E) => Effect.fail(error)

export const catchCoreError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catchAll(effect, error => {
    if (error instanceof CoreError) {
      return Effect.fail(error)
    }
    return Effect.fail(CoreErrors.runtimeInitialization('Unknown core error', error))
  })
