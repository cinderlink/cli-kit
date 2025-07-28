/**
 * Base Error Classes
 *
 * Core error types for the TUIX framework
 */

import { Data } from 'effect'

/**
 * Terminal-related errors (display, cursor, input/output)
 *
 * These errors indicate problems with terminal operations such as:
 * - Terminal initialization or cleanup
 * - Cursor positioning and visibility
 * - Screen clearing and alternate screen mode
 * - Raw mode and terminal capabilities
 *
 * @example
 * ```typescript
 * const error = new TerminalError({
 *   operation: 'enterRawMode',
 *   cause: originalError,
 *   message: 'Failed to enter raw mode'
 * })
 * ```
 */
export class TerminalError extends Data.TaggedError('TerminalError')<{
  readonly operation: string
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    return this.message || `Terminal operation '${this.operation}' failed`
  }

  get debugInfo() {
    return {
      type: 'TerminalError',
      operation: this.operation,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Input handling errors (keyboard, mouse, focus)
 *
 * These errors occur during input processing:
 * - Invalid key sequences
 * - Mouse event parsing failures
 * - Focus management issues
 * - Input stream interruptions
 */
export class InputError extends Data.TaggedError('InputError')<{
  readonly type: 'keyboard' | 'mouse' | 'focus' | 'stream'
  readonly event?: unknown
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    return this.message || `Input error: ${this.type}`
  }

  get debugInfo() {
    return {
      type: 'InputError',
      inputType: this.type,
      event: this.event,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Rendering pipeline errors
 *
 * These errors occur during the rendering process:
 * - Layout calculation failures
 * - Style application errors
 * - Component rendering issues
 * - Buffer overflow or corruption
 */
export class RenderError extends Data.TaggedError('RenderError')<{
  readonly phase: 'layout' | 'style' | 'paint' | 'composite'
  readonly component?: string
  readonly operation?: string
  readonly cause?: unknown
}> {
  get userMessage() {
    const parts = ['Render error']
    if (this.component) parts.push(`in ${this.component}`)
    if (this.phase) parts.push(`during ${this.phase}`)
    return parts.join(' ')
  }

  get debugInfo() {
    return {
      type: 'RenderError',
      phase: this.phase,
      component: this.component,
      operation: this.operation,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Storage operation errors
 *
 * These errors relate to persistence operations:
 * - File read/write failures
 * - Permission issues
 * - Disk space problems
 * - Serialization/deserialization errors
 */
export class StorageError extends Data.TaggedError('StorageError')<{
  readonly path?: string
  readonly operation?: 'read' | 'write' | 'delete' | 'list'
  readonly code?: string
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    if (this.message) return this.message
    const parts = ['Storage error']
    if (this.operation) parts.push(`during ${this.operation}`)
    if (this.path) parts.push(`at ${this.path}`)
    return parts.join(' ')
  }

  get debugInfo() {
    return {
      type: 'StorageError',
      path: this.path,
      operation: this.operation,
      code: this.code,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Configuration errors
 *
 * These errors occur when dealing with application configuration:
 * - Invalid configuration values
 * - Missing required settings
 * - Schema validation failures
 * - Configuration file parsing errors
 */
export class ConfigError extends Data.TaggedError('ConfigError')<{
  readonly key?: string
  readonly value?: unknown
  readonly expected?: string
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    if (this.message) return this.message
    const parts = ['Configuration error']
    if (this.key) parts.push(`for key '${this.key}'`)
    if (this.expected) parts.push(`expected ${this.expected}`)
    return parts.join(': ')
  }

  get debugInfo() {
    return {
      type: 'ConfigError',
      key: this.key,
      value: this.value,
      expected: this.expected,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Component lifecycle errors
 *
 * These errors occur during component operations:
 * - Initialization failures
 * - Update cycle errors
 * - Subscription management issues
 * - Component communication problems
 */
export class ComponentError extends Data.TaggedError('ComponentError')<{
  readonly component: string
  readonly lifecycle: 'init' | 'update' | 'view' | 'destroy'
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    return this.message || `Component '${this.component}' error during ${this.lifecycle}`
  }

  get debugInfo() {
    return {
      type: 'ComponentError',
      component: this.component,
      lifecycle: this.lifecycle,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Application-level errors
 *
 * These are high-level errors that affect the entire application:
 * - Runtime initialization failures
 * - Critical service unavailability
 * - Unrecoverable state corruption
 * - System resource exhaustion
 */
export class ApplicationError extends Data.TaggedError('ApplicationError')<{
  readonly phase: 'startup' | 'runtime' | 'shutdown'
  readonly critical: boolean
  readonly cause?: unknown
  readonly message?: string
}> {
  get userMessage() {
    return this.message || `Application error during ${this.phase}`
  }

  get debugInfo() {
    return {
      type: 'ApplicationError',
      phase: this.phase,
      critical: this.critical,
      message: this.message,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Validation errors
 *
 * These errors occur during data validation:
 * - Schema validation failures
 * - Type mismatches
 * - Constraint violations
 * - Invalid state transitions
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field?: string
  readonly value?: unknown
  readonly schema?: string
  readonly errors: ReadonlyArray<string>
  readonly cause?: unknown
}> {
  get userMessage() {
    const parts = ['Validation error']
    if (this.field) parts.push(`for field '${this.field}'`)
    if (this.errors.length > 0) {
      parts.push(`\\n${this.errors.map(e => `  - ${e}`).join('\\n')}`)
    }
    return parts.join(' ')
  }

  get debugInfo() {
    return {
      type: 'ValidationError',
      field: this.field,
      value: this.value,
      schema: this.schema,
      errors: this.errors,
      cause: this.cause,
      timestamp: new Date().toISOString(),
    }
  }
}
