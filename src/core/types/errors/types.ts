/**
 * Error Type Definitions and Guards
 *
 * Type aliases and utility functions for error handling
 */

import type {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  ConfigError,
  ComponentError,
  ApplicationError,
  ValidationError,
} from './base'

/**
 * Union type of all application errors
 *
 * This type represents any error that can occur in the TUIX framework.
 * Use this for exhaustive error handling in catch blocks.
 *
 * @example
 * ```typescript
 * Effect.catchTag("TerminalError", (error) => ...)
 *   .pipe(Effect.catchTag("InputError", (error) => ...))
 *   .pipe(Effect.catchTag("RenderError", (error) => ...))
 *   // ... handle all error types
 * ```
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
 * Type guard to check if a value is an AppError
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   if (isAppError(error)) {
 *     console.log(error.userMessage)
 *     console.log(error.debugInfo)
 *   }
 * }
 * ```
 */
export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== 'object') return false

  const error = value as { _tag?: string }
  const validTags = [
    'TerminalError',
    'InputError',
    'RenderError',
    'StorageError',
    'ConfigError',
    'ComponentError',
    'ApplicationError',
    'ValidationError',
  ]

  return typeof error._tag === 'string' && validTags.includes(error._tag)
}

/**
 * Critical errors that typically require application termination
 */
export type CriticalError = TerminalError | ApplicationError

/**
 * Recoverable errors that can be handled without terminating
 */
export type RecoverableError =
  | InputError
  | RenderError
  | StorageError
  | ConfigError
  | ValidationError

/**
 * Check if an error is critical
 */
export function isCriticalError(error: AppError): error is CriticalError {
  return error._tag === 'TerminalError' || error._tag === 'ApplicationError'
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: AppError): error is RecoverableError {
  return !isCriticalError(error)
}

/**
 * Error categorization for handling strategies
 */
export const ErrorCategories = {
  /**
   * Errors that should trigger immediate termination
   */
  critical: ['TerminalError', 'ApplicationError'] as const,

  /**
   * Errors that can be retried
   */
  retryable: ['InputError', 'StorageError', 'RenderError'] as const,

  /**
   * Errors that need user intervention
   */
  userFixable: ['ConfigError', 'ValidationError'] as const,

  /**
   * Errors that can be safely ignored
   */
  ignorable: ['RenderError'] as const,
} as const

/**
 * Get error category for handling strategy
 */
export function getErrorCategory(error: AppError): keyof typeof ErrorCategories | null {
  for (const [category, tags] of Object.entries(ErrorCategories)) {
    if ((tags as readonly string[]).includes(error._tag)) {
      return category as keyof typeof ErrorCategories
    }
  }
  return null
}
