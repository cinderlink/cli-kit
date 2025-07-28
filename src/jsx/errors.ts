/**
 * JSX Module Error Definitions
 *
 * Centralized error types and factories for the JSX module.
 * All errors use tagged error patterns for proper Effect.ts integration.
 */

import { Effect } from 'effect'

/**
 * Base error class for all JSX module errors
 */
export abstract class JSXError {
  abstract readonly _tag: string
  abstract readonly message: string

  constructor(public readonly cause?: unknown) {}
}

/**
 * JSX compilation and transformation errors
 */
export class JSXCompileError extends JSXError {
  readonly _tag = 'JSXCompileError'

  constructor(
    public readonly message: string,
    public readonly element?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * JSX rendering errors
 */
export class JSXRenderError extends JSXError {
  readonly _tag = 'JSXRenderError'

  constructor(
    public readonly message: string,
    public readonly componentName?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * JSX component lifecycle errors
 */
export class JSXComponentError extends JSXError {
  readonly _tag = 'JSXComponentError'

  constructor(
    public readonly message: string,
    public readonly componentName?: string,
    public readonly lifecycle?: 'mount' | 'unmount' | 'update',
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * JSX plugin system errors
 */
export class JSXPluginError extends JSXError {
  readonly _tag = 'JSXPluginError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * JSX configuration errors
 */
export class JSXConfigError extends JSXError {
  readonly _tag = 'JSXConfigError'

  constructor(
    public readonly message: string,
    public readonly configPath?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * JSX type validation errors
 */
export class JSXTypeError extends JSXError {
  readonly _tag = 'JSXTypeError'

  constructor(
    public readonly message: string,
    public readonly expectedType?: string,
    public readonly actualType?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

// Error factories for common scenarios
export const JSXErrors = {
  compile: (message: string, element?: string, cause?: unknown) =>
    new JSXCompileError(message, element, cause),

  render: (message: string, componentName?: string, cause?: unknown) =>
    new JSXRenderError(message, componentName, cause),

  component: (
    message: string,
    componentName?: string,
    lifecycle?: 'mount' | 'unmount' | 'update',
    cause?: unknown
  ) => new JSXComponentError(message, componentName, lifecycle, cause),

  plugin: (message: string, pluginId?: string, cause?: unknown) =>
    new JSXPluginError(message, pluginId, cause),

  config: (message: string, configPath?: string, cause?: unknown) =>
    new JSXConfigError(message, configPath, cause),

  type: (message: string, expectedType?: string, actualType?: string, cause?: unknown) =>
    new JSXTypeError(message, expectedType, actualType, cause),
} as const

// Type union for all JSX errors
export type JSXErrorType =
  | JSXCompileError
  | JSXRenderError
  | JSXComponentError
  | JSXPluginError
  | JSXConfigError
  | JSXTypeError

// Effect helpers
export const failWithJSXError = <E extends JSXErrorType>(error: E) => Effect.fail(error)

export const catchJSXError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catchAll(effect, error => {
    if (error instanceof JSXError) {
      return Effect.fail(error)
    }
    return Effect.fail(JSXErrors.render('Unknown JSX error', undefined, error))
  })

// Common error predicates
export const isJSXError = (error: unknown): error is JSXErrorType => error instanceof JSXError

export const isJSXCompileError = (error: unknown): error is JSXCompileError =>
  error instanceof JSXCompileError

export const isJSXRenderError = (error: unknown): error is JSXRenderError =>
  error instanceof JSXRenderError

export const isJSXComponentError = (error: unknown): error is JSXComponentError =>
  error instanceof JSXComponentError
