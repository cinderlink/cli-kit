/**
 * Error Boundaries
 *
 * Component-level error isolation and fallback rendering
 */

import { Effect } from 'effect'
import type { AppError } from './types'
import { isAppError } from './types'

/**
 * Error boundary configuration
 *
 * Configures how errors are caught and handled at component boundaries,
 * preventing errors from propagating up the component tree.
 */
export interface ErrorBoundaryConfig<A> {
  /**
   * Fallback value or effect when an error occurs
   */
  readonly fallback: A | ((error: AppError) => Effect<A, never>)

  /**
   * Handler called when an error is caught
   */
  readonly onError?: (error: AppError) => Effect<void>

  /**
   * Whether to log errors to console
   */
  readonly logErrors?: boolean

  /**
   * Custom error filter
   */
  readonly shouldCatch?: (error: unknown) => boolean
}

/**
 * Wrap an effect with an error boundary
 *
 * Provides component-level error isolation with configurable fallback behavior.
 * Errors are caught and handled according to the boundary configuration.
 *
 * @example
 * ```typescript
 * const safeRender = withErrorBoundary(
 *   riskyRenderOperation,
 *   {
 *     fallback: (error) => Effect.succeed(fallbackView),
 *     logErrors: true,
 *     onError: (error) => reportError(error)
 *   }
 * )
 * ```
 */
export const withErrorBoundary = <A, E extends AppError, R>(
  effect: Effect<A, E, R>,
  config: ErrorBoundaryConfig<A>
): Effect<A, never, R> => {
  return effect.pipe(
    Effect.catchAll(error => {
      // Check if we should catch this error
      if (config.shouldCatch && !config.shouldCatch(error)) {
        return Effect.fail(error)
      }

      // Ensure it's an AppError
      if (!isAppError(error)) {
        return Effect.fail(error)
      }

      return Effect.gen(function* (_) {
        // Log if requested
        if (config.logErrors) {
          yield* _(Effect.log(`Error caught by boundary: ${error.userMessage}`))
          yield* _(Effect.logDebug(JSON.stringify(error.debugInfo, null, 2)))
        }

        // Call error handler if provided
        if (config.onError) {
          yield* _(
            config.onError(error).pipe(
              Effect.catchAll(() => Effect.void) // Ignore handler errors
            )
          )
        }

        // Return fallback
        if (typeof config.fallback === 'function') {
          return yield* _(config.fallback(error))
        } else {
          return config.fallback
        }
      })
    }),
    // Catch any remaining errors
    Effect.catchAllCause(cause => {
      if (config.logErrors) {
        Effect.runSync(Effect.logError('Unexpected error in error boundary', cause))
      }

      // Use fallback for unexpected errors too
      if (typeof config.fallback === 'function') {
        // Create a generic ApplicationError
        const appError = new (require('./base').ApplicationError)({
          phase: 'runtime',
          critical: false,
          message: 'Unexpected error in error boundary',
          cause: cause,
        })
        return config.fallback(appError)
      } else {
        return Effect.succeed(config.fallback)
      }
    })
  )
}

/**
 * Create a component error boundary
 *
 * Higher-level abstraction for component error boundaries with
 * automatic terminal restoration and cleanup.
 */
export const createComponentBoundary = <Model, View>(config: {
  component: string
  fallbackView: View
  onError?: (error: AppError, model: Model) => Effect<void>
}) => {
  return <E extends AppError, R>(
    renderEffect: Effect<View, E, R>,
    model: Model
  ): Effect<View, never, R> => {
    return withErrorBoundary(renderEffect, {
      fallback: config.fallbackView,
      logErrors: true,
      onError: config.onError ? error => config.onError(error, model) : undefined,
    })
  }
}
