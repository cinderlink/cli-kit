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
 * @module
 */

// Re-export everything from the errors module
export * from "./errors/index"