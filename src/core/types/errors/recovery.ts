/**
 * Error Recovery Strategies
 * 
 * Configurable strategies for handling and recovering from errors
 */

import { Effect, Schedule, Duration } from "effect"
import type { AppError } from "./types"

/**
 * Error recovery strategy interface
 * 
 * Defines how to handle specific error types with configurable
 * retry policies, fallbacks, and recovery actions.
 */
export interface ErrorRecoveryStrategy<E extends AppError, A> {
  readonly canRecover: (error: E) => boolean
  readonly recover: (error: E) => Effect<A, E>
  readonly maxAttempts?: number
  readonly backoff?: Schedule.Schedule<unknown, unknown>
}

/**
 * Pre-built recovery strategies
 */
export const RecoveryStrategies = {
  /**
   * Retry with exponential backoff
   * 
   * @example
   * ```typescript
   * const strategy = RecoveryStrategies.retry(3, 1000)
   * ```
   */
  retry: <E extends AppError, A>(
    maxAttempts: number,
    baseDelay: number,
    factor = 2
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: () => true,
    recover: (error) => Effect.fail(error),
    maxAttempts,
    backoff: Schedule.exponential(Duration.millis(baseDelay), factor)
      .pipe(Schedule.compose(Schedule.recurs(maxAttempts - 1)))
  }),
  
  /**
   * Fallback to a default value
   * 
   * @example
   * ```typescript
   * const strategy = RecoveryStrategies.fallback(defaultValue)
   * ```
   */
  fallback: <E extends AppError, A>(
    value: A | ((error: E) => A)
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: () => true,
    recover: (error) => Effect.succeed(
      typeof value === 'function' ? (value as (error: E) => A)(error) : value
    )
  }),
  
  /**
   * Ignore specific errors
   * 
   * @example
   * ```typescript
   * const strategy = RecoveryStrategies.ignore(defaultValue)
   * ```
   */
  ignore: <E extends AppError, A>(
    defaultValue: A
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: () => true,
    recover: () => Effect.succeed(defaultValue)
  }),
  
  /**
   * Transform error to another type
   * 
   * @example
   * ```typescript
   * const strategy = RecoveryStrategies.transform(
   *   error => new ApplicationError({ ... })
   * )
   * ```
   */
  transform: <E extends AppError, E2 extends AppError>(
    transformer: (error: E) => E2
  ): ErrorRecoveryStrategy<E, never> => ({
    canRecover: () => true,
    recover: (error) => Effect.fail(transformer(error))
  }),
  
  /**
   * Composite strategy that tries multiple strategies in order
   * 
   * @example
   * ```typescript
   * const strategy = RecoveryStrategies.compose([
   *   RecoveryStrategies.retry(2, 100),
   *   RecoveryStrategies.fallback(defaultValue)
   * ])
   * ```
   */
  compose: <E extends AppError, A>(
    strategies: ReadonlyArray<ErrorRecoveryStrategy<E, A>>
  ): ErrorRecoveryStrategy<E, A> => ({
    canRecover: (error) => strategies.some(s => s.canRecover(error)),
    recover: (error) => {
      for (const strategy of strategies) {
        if (strategy.canRecover(error)) {
          return strategy.recover(error)
        }
      }
      return Effect.fail(error)
    }
  })
}

/**
 * Apply recovery strategy to an effect
 */
export const withRecovery = <A, E extends AppError, R>(
  effect: Effect<A, E, R>,
  strategy: ErrorRecoveryStrategy<E, A>
): Effect<A, E, R> => {
  if (strategy.backoff && strategy.maxAttempts) {
    return effect.pipe(
      Effect.retry({
        while: (error) => strategy.canRecover(error as E),
        schedule: strategy.backoff
      }),
      Effect.catchAll((error) => 
        strategy.canRecover(error as E)
          ? strategy.recover(error as E)
          : Effect.fail(error)
      )
    )
  }
  
  return effect.pipe(
    Effect.catchAll((error) =>
      strategy.canRecover(error as E)
        ? strategy.recover(error as E)
        : Effect.fail(error)
    )
  )
}