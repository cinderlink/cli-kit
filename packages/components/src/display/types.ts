/**
 * Display Component Types
 * 
 * Local type definitions for display components to avoid external dependencies
 * while maintaining compatibility with the broader TUIX ecosystem.
 * 
 * @module @tuix/components/display/types
 */

// =============================================================================
// Log Types (compatible with @tuix/plugins/core/types)
// =============================================================================

/**
 * Log level string type
 */
export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Log metadata interface
 */
export interface LogMetadata {
  readonly [key: string]: unknown
}

/**
 * Core log entry structure (compatible with plugin system)
 */
export interface LogEntry {
  readonly id?: string
  readonly timestamp: Date
  readonly level: LogLevelString
  readonly message: string
  readonly metadata?: LogMetadata
  readonly error?: {
    name?: string
    message?: string
    stack?: string
  }
}