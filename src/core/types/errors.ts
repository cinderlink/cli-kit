/**
 * Error System - Comprehensive error hierarchy and error handling utilities
 * 
 * This module provides a robust, type-safe error handling system for the TUIX framework.
 * It defines a complete hierarchy of domain-specific errors, recovery strategies,
 * error boundaries, and debugging utilities for building resilient terminal applications.
 * 
 * ## Key Features:
 * 
 * ### Typed Error Hierarchy
 * - Domain-specific error classes with rich context information
 * - Discriminated union types for exhaustive error handling
 * - Built-in categorization of critical vs recoverable errors
 * 
 * ### Error Recovery
 * - Configurable recovery strategies (retry, fallback, ignore)
 * - Automatic terminal restoration for terminal errors
 * - Exponential backoff and retry policies
 * 
 * ### Error Boundaries
 * - Component-level error isolation
 * - Graceful fallback rendering
 * - Automatic error logging and reporting
 * 
 * ### Debugging Support
 * - Rich error context with timestamps and component info
 * - User-friendly error messages
 * - Comprehensive debug information extraction
 * 
 * @example
 * ```typescript
 * import { RenderError, withErrorBoundary, RecoveryStrategies } from './errors'
 * 
 * // Create a typed error
 * const error = new RenderError({
 *   phase: 'paint',
 *   operation: 'drawText',
 *   component: 'TextInput',
 *   cause: originalError
 * })
 * 
 * // Use error boundary
 * const safeEffect = withErrorBoundary(riskyOperation, {
 *   fallback: (error) => Effect.succeed('fallback value'),
 *   logErrors: true
 * })
 * 
 * // Apply recovery strategy
 * const robustEffect = withRecovery(effect, RecoveryStrategies.retry(3, 100))
 * ```
 * 
 * @module core/errors
 */

import { Data, Effect, Schedule } from "effect"

// =============================================================================
// Core Error Classes
// =============================================================================

/**
 * Terminal operation errors
 * 
 * Represents errors that occur during terminal operations like initialization,
 * writing to stdout/stderr, reading from stdin, or terminal state management.
 * These are often critical errors that may require application termination.
 * 
 * @example
 * ```typescript
 * const error = new TerminalError({
 *   operation: 'initialize',
 *   component: 'TerminalService',
 *   cause: originalError,
 *   context: { terminalType: process.env.TERM }
 * })
 * ```
 */
export class TerminalError extends Data.TaggedError("TerminalError")<{
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly operation: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Terminal operation failed: ${props.operation}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Input handling errors
 * 
 * Represents errors that occur during input processing from keyboard, mouse,
 * or terminal events. These are typically recoverable errors that can be
 * handled gracefully without terminating the application.
 * 
 * @example
 * ```typescript
 * const error = new InputError({
 *   device: 'keyboard',
 *   operation: 'parseKeySequence',
 *   component: 'InputHandler',
 *   context: { rawInput: '\x1b[A' }
 * })
 * ```
 */
export class InputError extends Data.TaggedError("InputError")<{
  readonly device: "keyboard" | "mouse" | "terminal"
  readonly operation?: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly device: "keyboard" | "mouse" | "terminal"
    readonly operation?: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Input error on ${props.device}${props.operation ? `: ${props.operation}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Rendering errors
 * 
 * Represents errors that occur during the rendering pipeline including
 * layout calculation, painting, and measurement operations. These errors
 * are recoverable and should trigger fallback rendering.
 * 
 * @example
 * ```typescript
 * const error = new RenderError({
 *   phase: 'layout',
 *   operation: 'calculateDimensions',
 *   component: 'FlexLayout',
 *   context: { containerWidth: 80, childCount: 5 }
 * })
 * ```
 */
export class RenderError extends Data.TaggedError("RenderError")<{
  readonly phase: "render" | "layout" | "paint" | "measure"
  readonly operation?: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly phase: "render" | "layout" | "paint" | "measure"
    readonly operation?: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Render error in ${props.phase}${props.operation ? `: ${props.operation}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Storage operation errors.
 */
export class StorageError extends Data.TaggedError("StorageError")<{
  readonly operation: "read" | "write" | "delete" | "validate"
  readonly path?: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly operation: "read" | "write" | "delete" | "validate"
    readonly path?: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Storage ${props.operation} failed${props.path ? ` for ${props.path}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Configuration errors.
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly key?: string
  readonly value?: unknown
  readonly expected?: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly key?: string
    readonly value?: unknown
    readonly expected?: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Configuration error${props.key ? ` for key '${props.key}'` : ''}${props.expected ? `: expected ${props.expected}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Component lifecycle errors.
 */
export class ComponentError extends Data.TaggedError("ComponentError")<{
  readonly phase: "init" | "update" | "view" | "cleanup"
  readonly componentType: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly phase: "init" | "update" | "view" | "cleanup"
    readonly componentType: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Component error in ${props.componentType} during ${props.phase}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Application lifecycle errors.
 */
export class ApplicationError extends Data.TaggedError("ApplicationError")<{
  readonly phase: "startup" | "runtime" | "shutdown"
  readonly operation?: string
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly phase: "startup" | "runtime" | "shutdown"
    readonly operation?: string
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Application error during ${props.phase}${props.operation ? `: ${props.operation}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

/**
 * Validation errors for user input, configuration, etc.
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field?: string
  readonly value?: unknown
  readonly rules?: ReadonlyArray<string>
  readonly message: string
  readonly cause?: unknown
  readonly component?: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly field?: string
    readonly value?: unknown
    readonly rules?: ReadonlyArray<string>
    readonly cause?: unknown
    readonly component?: string
    readonly context?: Record<string, unknown>
  }) {
    super({
      message: `Validation failed${props.field ? ` for field '${props.field}'` : ''}${props.rules ? `: ${props.rules.join(', ')}` : ''}`,
      timestamp: new Date(),
      ...props
    })
  }
}

// =============================================================================
// Error Union Types
// =============================================================================

/**
 * Union of all possible framework errors.
 */
export type AppError = 
  | TerminalError
  | InputError
  | RenderError
  | StorageError
  | ConfigError
  | ComponentError
  | ApplicationError
  | ValidationError

/**
 * Error codes for categorizing errors
 */
export enum ErrorCode {
  // Terminal errors
  TERMINAL_INIT_FAILED = "TERMINAL_INIT_FAILED",
  TERMINAL_WRITE_FAILED = "TERMINAL_WRITE_FAILED",
  TERMINAL_READ_FAILED = "TERMINAL_READ_FAILED",
  
  // Input errors
  INPUT_DEVICE_ERROR = "INPUT_DEVICE_ERROR",
  INPUT_PARSE_ERROR = "INPUT_PARSE_ERROR",
  INPUT_TIMEOUT = "INPUT_TIMEOUT",
  
  // Render errors
  RENDER_FAILED = "RENDER_FAILED",
  LAYOUT_FAILED = "LAYOUT_FAILED",
  
  // Storage errors
  STORAGE_READ_FAILED = "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",
  
  // Config errors
  CONFIG_INVALID = "CONFIG_INVALID",
  CONFIG_MISSING = "CONFIG_MISSING",
  
  // Component errors
  COMPONENT_INIT_FAILED = "COMPONENT_INIT_FAILED",
  COMPONENT_UPDATE_FAILED = "COMPONENT_UPDATE_FAILED",
  
  // Application errors
  APPLICATION_STARTUP_FAILED = "APPLICATION_STARTUP_FAILED",
  APP_RUNTIME_ERROR = "APP_RUNTIME_ERROR",
  
  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  
  // General
  UNKNOWN = "UNKNOWN"
}

/**
 * Type guard to check if a value is an AppError
 * 
 * Safely determines if an unknown value is one of the framework's
 * typed error classes by checking the _tag property.
 * 
 * @param value - Value to check
 * @returns True if value is an AppError, false otherwise
 * 
 * @example
 * ```typescript
 * try {
 *   // risky operation
 * } catch (error) {
 *   if (isAppError(error)) {
 *     // Handle with full type safety
 *     console.log(error._tag, error.message)
 *   }
 * }
 * ```
 */
export function isAppError(value: unknown): value is AppError {
  return (
    value !== null &&
    typeof value === 'object' &&
    '_tag' in value &&
    typeof (value as Record<string, unknown>)._tag === 'string' &&
    [
      'TerminalError',
      'InputError', 
      'RenderError',
      'StorageError',
      'ConfigError',
      'ComponentError',
      'ApplicationError',
      'ValidationError'
    ].includes((value as Record<string, unknown>)._tag as string)
  )
}

/**
 * Critical errors that should terminate the application.
 */
export type CriticalError = TerminalError | ApplicationError

/**
 * Recoverable errors that can be handled gracefully.
 */
export type RecoverableError = InputError | RenderError | StorageError | ConfigError | ValidationError

// =============================================================================
// Error Recovery Strategies
// =============================================================================

/**
 * Error recovery strategy interface.
 */
export interface ErrorRecoveryStrategy<E extends AppError, A> {
  readonly canRecover: (error: E) => boolean
  readonly recover: (error: E) => Effect.Effect<A, E, never>
  readonly maxRetries?: number
  readonly retryDelay?: number
}

/**
 * Built-in recovery strategies.
 */
export const RecoveryStrategies = {
  /**
   * Retry strategy with exponential backoff.
   */
  retry: <E extends AppError, A>(
    maxRetries: number = 3,
    initialDelay: number = 100
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: () => true,
    recover: (error) =>
      Effect.sleep(`${initialDelay} millis`).pipe(
        Effect.andThen(Effect.fail(error))
      ),
    maxRetries,
    retryDelay: initialDelay
  }),

  /**
   * Fallback strategy that provides a default value.
   */
  fallback: <E extends AppError, A>(
    fallbackValue: A
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: () => true,
    recover: () => Effect.succeed(fallbackValue),
    maxRetries: 1
  }),

  /**
   * Ignore strategy that converts errors to options.
   */
  ignore: <E extends AppError, A>(): ErrorRecoveryStrategy<E, A | null> => ({
    canRecover: () => true,
    recover: () => Effect.succeed(null),
    maxRetries: 1
  }),

  /**
   * Terminal restoration strategy for terminal errors.
   */
  restoreTerminal: (): ErrorRecoveryStrategy<TerminalError, void> => ({
    canRecover: (error) => error.operation !== 'fatal',
    recover: () =>
      Effect.sync(() => {
        // Restore terminal to a clean state
        process.stdout.write('\x1b[?1049l') // Exit alternate screen
        process.stdout.write('\x1b[?25h')   // Show cursor
        process.stdout.write('\x1b[0m')     // Reset colors
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false)
        }
      }),
    maxRetries: 1
  })
} as const

// =============================================================================
// Error Boundary Implementation
// =============================================================================

/**
 * Error boundary configuration.
 */
export interface ErrorBoundaryConfig<A> {
  readonly fallback: (error: AppError) => Effect.Effect<A, never, never>
  readonly onError?: (error: AppError) => Effect.Effect<void, never, never>
  readonly catchDefects?: boolean
  readonly logErrors?: boolean
}

/**
 * Create an error boundary that catches and handles errors
 * 
 * Wraps an Effect with error handling logic, providing fallback behavior
 * and optional error logging. The resulting Effect never fails, making it
 * safe for use in component trees where errors should be contained.
 * 
 * @param effect - Effect to wrap with error boundary
 * @param config - Error boundary configuration
 * @returns Effect that never fails, using fallback on errors
 * 
 * @example
 * ```typescript
 * const safeRender = withErrorBoundary(riskyRenderEffect, {
 *   fallback: (error) => Effect.succeed('Error: Component failed'),
 *   onError: (error) => Effect.sync(() => console.error(error)),
 *   logErrors: true,
 *   catchDefects: true
 * })
 * ```
 */
export const withErrorBoundary = <A, E extends AppError, R>(
  effect: Effect.Effect<A, E, R>,
  config: ErrorBoundaryConfig<A>
): Effect.Effect<A, never, R> => {
  const handleError = (error: AppError) =>
    Effect.gen(function* (_) {
      if (config.onError) {
        yield* _(config.onError(error))
      }
      
      if (config.logErrors) {
        yield* _(Effect.logError("Error caught by error boundary", error))
      }
      
      return yield* _(config.fallback(error))
    })

  const result = Effect.catchAll(effect, handleError)

  return config.catchDefects
    ? Effect.catchAllDefect(result, (defect) => {
        const error = new ApplicationError({
          phase: "runtime",
          operation: "defect",
          cause: defect,
          context: { defect: String(defect) }
        })
        return handleError(error)
      })
    : result
}

/**
 * Create a recovery effect that applies recovery strategies
 * 
 * Enhances an Effect with automatic error recovery using the provided
 * strategy. If recovery fails or the error is not recoverable, the
 * original error is propagated.
 * 
 * @param effect - Effect to enhance with recovery
 * @param strategy - Recovery strategy to apply
 * @returns Effect with recovery capabilities
 * 
 * @example
 * ```typescript
 * const robustEffect = withRecovery(networkCall, 
 *   RecoveryStrategies.retry(3, 1000)
 * )
 * 
 * const withFallback = withRecovery(primaryService,
 *   RecoveryStrategies.fallback('default value')
 * )
 * ```
 */
export const withRecovery = <A, E extends AppError, R>(
  effect: Effect.Effect<A, E, R>,
  strategy: ErrorRecoveryStrategy<E, A>
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.catchAll((error) =>
      strategy.canRecover(error)
        ? strategy.recover(error)
        : Effect.fail(error)
    ),
    strategy.maxRetries && strategy.maxRetries > 1
      ? Effect.retry(Schedule.recurs(strategy.maxRetries - 1))
      : <E extends AppError, A, R>(effect: Effect.Effect<A, E, R>) => effect
  )

// =============================================================================
// Error Utilities
// =============================================================================

/**
 * Utilities for working with errors.
 */
export const ErrorUtils = {
  /**
   * Check if an error is critical and should terminate the application.
   */
  isCritical: (error: AppError): error is CriticalError => {
    return error._tag === "TerminalError" || error._tag === "ApplicationError"
  },

  /**
   * Check if an error is recoverable.
   */
  isRecoverable: (error: AppError): error is RecoverableError => {
    return !ErrorUtils.isCritical(error)
  },

  /**
   * Create an error from an unknown cause.
   */
  fromUnknown: (
    cause: unknown,
    context?: {
      readonly operation?: string
      readonly component?: string
      readonly additionalContext?: Record<string, unknown>
    }
  ): AppError => {
    if (cause instanceof TerminalError || 
        cause instanceof InputError || 
        cause instanceof RenderError || 
        cause instanceof StorageError ||
        cause instanceof ConfigError ||
        cause instanceof ComponentError ||
        cause instanceof ApplicationError ||
        cause instanceof ValidationError) {
      return cause
    }
    
    if (cause instanceof Error) {
      return new ApplicationError({
        phase: "runtime",
        operation: context?.operation || "unknown",
        cause,
        component: context?.component,
        context: {
          errorName: cause.name,
          errorMessage: cause.message,
          ...context?.additionalContext
        }
      })
    }
    
    return new ApplicationError({
      phase: "runtime",
      operation: context?.operation || "unknown",
      cause,
      component: context?.component,
      context: {
        causeType: typeof cause,
        causeString: String(cause),
        ...context?.additionalContext
      }
    })
  },

  /**
   * Extract a user-friendly error message.
   */
  getUserMessage: (error: AppError): string => {
    switch (error._tag) {
      case "TerminalError":
        return "Terminal operation failed. Please check your terminal settings."
      case "InputError":
        return "Input error occurred. Please try again."
      case "RenderError":
        return "Display error occurred. The interface may not appear correctly."
      case "StorageError":
        return "File operation failed. Please check file permissions."
      case "ConfigError":
        return "Configuration error. Please check your settings."
      case "ComponentError":
        return "Component error occurred. The interface may not work correctly."
      case "ApplicationError":
        return "Application error occurred."
      case "ValidationError":
        return "Invalid input. Please check your entry and try again."
      default:
        return "An unexpected error occurred."
    }
  },

  /**
   * Get debug information from an error.
   */
  getDebugInfo: (error: AppError): Record<string, unknown> => ({
    tag: error._tag,
    type: error._tag,
    message: error.message,
    operation: (error as Record<string, unknown>).operation,
    timestamp: error.timestamp.toISOString(),
    component: error.component,
    context: error.context,
    cause: error.cause ? String(error.cause) : undefined,
    stack: error.cause instanceof Error ? error.cause.stack : undefined
  }),

  /**
   * Create an effect that logs error details.
   */
  logError: (error: AppError, level: "error" | "warn" | "debug" = "error") =>
    Effect.gen(function* (_) {
      const debugInfo = ErrorUtils.getDebugInfo(error)
      
      switch (level) {
        case "error":
          yield* _(Effect.logError("TUI Error", debugInfo))
          break
        case "warn":
          yield* _(Effect.logWarning("TUI Warning", debugInfo))
          break
        case "debug":
          yield* _(Effect.logDebug("TUI Debug", debugInfo))
          break
      }
    })
} as const