/**
 * Coordination Module Error Definitions
 *
 * This file contains all error classes for the coordination module
 */

/**
 * Choreography error type
 */
export class ChoreographyError {
  readonly _tag = 'ChoreographyError'
  constructor(
    readonly message: string,
    readonly workflow?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Workflow error type
 */
export class WorkflowError {
  readonly _tag = 'WorkflowError'
  constructor(
    readonly workflowId: string,
    readonly cause: Error
  ) {}
}

/**
 * Stream optimization error
 */
export class StreamOptimizationError {
  readonly _tag = 'StreamOptimizationError'
  constructor(
    readonly message: string,
    readonly eventType?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Coordination error type
 */
export class CoordinationError {
  readonly _tag = 'CoordinationError'
  constructor(
    readonly message: string,
    readonly module?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Pattern error type
 */
export class PatternError {
  readonly _tag = 'PatternError'
  constructor(
    readonly message: string,
    readonly patternName?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Performance monitoring error
 */
export class PerformanceMonitorError {
  readonly _tag = 'PerformanceMonitorError'
  constructor(
    readonly message: string,
    readonly metricName?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Error recovery failure
 */
export class RecoveryError {
  readonly _tag = 'RecoveryError'
  constructor(
    readonly message: string,
    readonly strategyId?: string,
    readonly originalError?: unknown,
    readonly cause?: unknown
  ) {}
}
