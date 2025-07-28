/**
 * Plugins Module Error Definitions
 *
 * Centralized error types and factories for the plugin system.
 * All errors use tagged error patterns for proper Effect.ts integration.
 */

import { Effect } from 'effect'

/**
 * Base error class for all plugin system errors
 */
export abstract class PluginSystemError {
  abstract readonly _tag: string
  abstract readonly message: string

  constructor(public readonly cause?: unknown) {}
}

/**
 * Plugin registration errors
 */
export class PluginRegistrationError extends PluginSystemError {
  readonly _tag = 'PluginRegistrationError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin initialization errors
 */
export class PluginInitializationError extends PluginSystemError {
  readonly _tag = 'PluginInitializationError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin dependency resolution errors
 */
export class PluginDependencyError extends PluginSystemError {
  readonly _tag = 'PluginDependencyError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    public readonly missingDependency?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin lifecycle errors
 */
export class PluginLifecycleError extends PluginSystemError {
  readonly _tag = 'PluginLifecycleError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    public readonly state?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin communication errors
 */
export class PluginCommunicationError extends PluginSystemError {
  readonly _tag = 'PluginCommunicationError'

  constructor(
    public readonly message: string,
    public readonly sourcePluginId?: string,
    public readonly targetPluginId?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin loading errors
 */
export class PluginLoadingError extends PluginSystemError {
  readonly _tag = 'PluginLoadingError'

  constructor(
    public readonly message: string,
    public readonly pluginPath?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin configuration errors
 */
export class PluginConfigError extends PluginSystemError {
  readonly _tag = 'PluginConfigError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    public readonly configKey?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

// Error factories for common scenarios
export const PluginErrors = {
  registration: (message: string, pluginId?: string, cause?: unknown) =>
    new PluginRegistrationError(message, pluginId, cause),

  initialization: (message: string, pluginId?: string, cause?: unknown) =>
    new PluginInitializationError(message, pluginId, cause),

  dependency: (message: string, pluginId?: string, missingDependency?: string, cause?: unknown) =>
    new PluginDependencyError(message, pluginId, missingDependency, cause),

  lifecycle: (message: string, pluginId?: string, state?: string, cause?: unknown) =>
    new PluginLifecycleError(message, pluginId, state, cause),

  communication: (
    message: string,
    sourcePluginId?: string,
    targetPluginId?: string,
    cause?: unknown
  ) => new PluginCommunicationError(message, sourcePluginId, targetPluginId, cause),

  loading: (message: string, pluginPath?: string, cause?: unknown) =>
    new PluginLoadingError(message, pluginPath, cause),

  config: (message: string, pluginId?: string, configKey?: string, cause?: unknown) =>
    new PluginConfigError(message, pluginId, configKey, cause),
} as const

// Type union for all plugin errors
export type PluginErrorType =
  | PluginRegistrationError
  | PluginInitializationError
  | PluginDependencyError
  | PluginLifecycleError
  | PluginCommunicationError
  | PluginLoadingError
  | PluginConfigError

// Effect helpers
export const failWithPluginError = <E extends PluginErrorType>(error: E) => Effect.fail(error)

export const catchPluginError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catchAll(effect, error => {
    if (error instanceof PluginSystemError) {
      return Effect.fail(error)
    }
    return Effect.fail(PluginErrors.initialization('Unknown plugin error', undefined, error))
  })

// Common error predicates
export const isPluginError = (error: unknown): error is PluginErrorType =>
  error instanceof PluginSystemError

export const isPluginRegistrationError = (error: unknown): error is PluginRegistrationError =>
  error instanceof PluginRegistrationError

export const isPluginInitializationError = (error: unknown): error is PluginInitializationError =>
  error instanceof PluginInitializationError

export const isPluginDependencyError = (error: unknown): error is PluginDependencyError =>
  error instanceof PluginDependencyError

export const isPluginLifecycleError = (error: unknown): error is PluginLifecycleError =>
  error instanceof PluginLifecycleError
