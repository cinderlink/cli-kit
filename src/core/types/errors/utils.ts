/**
 * Error Utilities
 * 
 * Helper functions for error handling and debugging
 */

import { Effect, Cause, Exit } from "effect"
import type { AppError } from "./types"
import { isAppError } from "./types"
import * as AllErrors from "./base"

/**
 * Error utility functions
 */
export const ErrorUtils = {
  /**
   * Extract user-friendly message from any error
   */
  getUserMessage(error: unknown): string {
    if (isAppError(error)) {
      return error.userMessage
    }
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unexpected error occurred'
  },
  
  /**
   * Extract debug information from any error
   */
  getDebugInfo(error: unknown): Record<string, unknown> {
    if (isAppError(error)) {
      return error.debugInfo
    }
    if (error instanceof Error) {
      return {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }
    return {
      type: 'Unknown',
      value: String(error),
      timestamp: new Date().toISOString()
    }
  },
  
  /**
   * Create a terminal restoration effect for terminal errors
   */
  withTerminalRestore<A, E, R>(
    effect: Effect<A, E, R>,
    terminal: { 
      showCursor: Effect<void>
      exitAlternateScreen: Effect<void>
      disableMouseTracking: Effect<void>
    }
  ): Effect<A, E, R> {
    return effect.pipe(
      Effect.ensuring(
        Effect.all([
          terminal.showCursor,
          terminal.exitAlternateScreen,
          terminal.disableMouseTracking
        ], { discard: true }).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )
    )
  },
  
  /**
   * Log error with full context
   */
  logError(error: unknown, context?: string): Effect<void> {
    const message = ErrorUtils.getUserMessage(error)
    const debug = ErrorUtils.getDebugInfo(error)
    
    return Effect.gen(function* (_) {
      yield* _(Effect.logError(
        context ? `[${context}] ${message}` : message
      ))
      yield* _(Effect.logDebug(JSON.stringify(debug, null, 2)))
    })
  },
  
  /**
   * Convert Exit to Result type
   */
  exitToResult<A, E>(exit: Exit.Exit<A, E>): { success: true, value: A } | { success: false, error: E } {
    if (Exit.isSuccess(exit)) {
      return { success: true, value: exit.value }
    } else {
      const error = Cause.failureOption(exit.cause)
      return { success: false, error: error !== undefined ? error : new Error('Unknown error') as E }
    }
  },
  
  /**
   * Create an error from a cause
   */
  causeToError(cause: Cause.Cause<unknown>): AppError {
    const failure = Cause.failureOption(cause)
    
    if (failure && isAppError(failure)) {
      return failure
    }
    
    const failures = Cause.failures(cause)
    const defects = Cause.defects(cause)
    
    return new AllErrors.ApplicationError({
      phase: 'runtime',
      critical: true,
      message: failures.length > 0 ? String(failures[0]) : 'Application error',
      cause: defects.length > 0 ? defects[0] : cause
    })
  },
  
  /**
   * Create error matchers for exhaustive handling
   */
  matchError<A>(error: AppError) {
    return {
      terminal: (handler: (e: AllErrors.TerminalError) => A) => 
        error._tag === "TerminalError" ? handler(error as AllErrors.TerminalError) : null,
      
      input: (handler: (e: AllErrors.InputError) => A) =>
        error._tag === "InputError" ? handler(error as AllErrors.InputError) : null,
      
      render: (handler: (e: AllErrors.RenderError) => A) =>
        error._tag === "RenderError" ? handler(error as AllErrors.RenderError) : null,
      
      storage: (handler: (e: AllErrors.StorageError) => A) =>
        error._tag === "StorageError" ? handler(error as AllErrors.StorageError) : null,
      
      config: (handler: (e: AllErrors.ConfigError) => A) =>
        error._tag === "ConfigError" ? handler(error as AllErrors.ConfigError) : null,
      
      component: (handler: (e: AllErrors.ComponentError) => A) =>
        error._tag === "ComponentError" ? handler(error as AllErrors.ComponentError) : null,
      
      application: (handler: (e: AllErrors.ApplicationError) => A) =>
        error._tag === "ApplicationError" ? handler(error as AllErrors.ApplicationError) : null,
      
      validation: (handler: (e: AllErrors.ValidationError) => A) =>
        error._tag === "ValidationError" ? handler(error as AllErrors.ValidationError) : null,
      
      orElse: (handler: (e: AppError) => A) => handler(error)
    }
  }
}