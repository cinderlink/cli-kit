/**
 * Logger Plugin Core Module
 * 
 * Main exports for the Logger Plugin providing comprehensive logging services
 * for TUIX applications.
 * 
 * @module plugins/core
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Log level types
  LogLevelString,
  LogMetadata,
  LogEntry,
  LogQuery,
  LogSearchQuery,
  LogFilter,
  LogFilterConfig,
  
  // Configuration types
  LogFormat,
  LogRotationConfig,
  FileOutputConfig,
  ConsoleOutputConfig,
  StreamOutputConfig,
  LoggerConfig,
  
  // API types
  LoggerAPI,
  LogOutput,
  LogStats,
  CircularBuffer,
  LoggerPluginMetadata,
  
  // Stream types
  LogStreamInfo,
  StreamStats,
} from './types'

export {
  // Enums and constants
  LogLevel,
  
  // Utility functions
  logLevelToString,
  parseLogLevel,
  generateLogId,
  parseSize,
  formatSize,
  
  // Error classes
  LoggerInitializationError,
  LogOutputError,
  LogRotationError,
  LogFormattingError,
  LogStreamingError,
  
  // Configuration schema
  LoggerConfigSchema,
} from './types'

// =============================================================================
// Core Classes
// =============================================================================

export { LoggerPlugin } from './logger'
export { LoggingEngine } from './logging-engine'
export { LogStreamManager } from './stream-manager'
export { CircularBufferImpl } from './circular-buffer'
export { LogIndex, LogRetriever } from './log-index'
export { StreamAnalyticsTracker } from './stream-analytics'

// =============================================================================
// Output Implementations
// =============================================================================

export { LogOutputFactory } from './outputs/factory'
export { ConsoleLogOutput } from './outputs/console-output'
export { FileLogOutput } from './outputs/file-output'
export { StreamLogOutput } from './outputs/stream-output'

// Export filter utilities
export * from './filters'

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Logger Plugin with default configuration
 */
export function createLoggerPlugin(config: Partial<LoggerConfig> = {}) {
  return new LoggerPlugin(config)
}

/**
 * Create a Logger Plugin for development (debug level, console output)
 */
export function createDevLoggerPlugin(config: Partial<LoggerConfig> = {}) {
  return new LoggerPlugin({
    level: 'debug',
    outputs: ['console'],
    format: 'structured',
    bufferSize: 500,
    console: {
      colors: true,
    },
    ...config,
  })
}

/**
 * Create a Logger Plugin for production (info level, file + console)
 */
export function createProdLoggerPlugin(config: Partial<LoggerConfig> = {}) {
  return new LoggerPlugin({
    level: 'info',
    outputs: ['console', 'file'],
    format: 'json',
    bufferSize: 5000,
    rotation: {
      maxSize: '100MB',
      maxFiles: 10,
      datePattern: 'YYYY-MM-DD',
      compression: true,
    },
    file: {
      path: './logs/tuix.log',
      append: true,
      encoding: 'utf8',
      enableIndexing: true,
    },
    console: {
      colors: false,
      level: 'warn', // Only warnings and errors to console in prod
    },
    ...config,
  })
}

/**
 * Create a Logger Plugin for testing (all outputs disabled by default)
 */
export function createTestLoggerPlugin(config: Partial<LoggerConfig> = {}) {
  return new LoggerPlugin({
    level: 'debug',
    outputs: [], // No outputs by default for tests
    format: 'json',
    bufferSize: 100,
    ...config,
  })
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create common log filters
 */
export const LogFilters = {
  /**
   * Filter by log level
   */
  byLevel: (level: LogLevelString) => (entry: LogEntry) => entry.level === level,
  
  /**
   * Filter by component
   */
  byComponent: (component: string) => (entry: LogEntry) => 
    entry.metadata?.component === component,
  
  /**
   * Filter by message content
   */
  byMessage: (searchTerm: string) => (entry: LogEntry) =>
    entry.message.toLowerCase().includes(searchTerm.toLowerCase()),
  
  /**
   * Filter by metadata key
   */
  byMetadata: (key: string, value: unknown) => (entry: LogEntry) =>
    entry.metadata[key] === value,
  
  /**
   * Filter by time range
   */
  byTimeRange: (start: Date, end?: Date) => (entry: LogEntry) => {
    const entryTime = entry.timestamp.getTime()
    const startTime = start.getTime()
    const endTime = end ? end.getTime() : Date.now()
    return entryTime >= startTime && entryTime <= endTime
  },
  
  /**
   * Filter errors only
   */
  errorsOnly: (entry: LogEntry) => 
    entry.level === 'error' || entry.level === 'fatal',
  
  /**
   * Filter warnings and above
   */
  warningsAndAbove: (entry: LogEntry) => {
    const levels = ['warn', 'error', 'fatal']
    return levels.includes(entry.level)
  },
}

/**
 * Combine multiple filters with AND logic
 */
export function combineFilters(...filters: LogFilter[]): LogFilter {
  return (entry: LogEntry) => filters.every(filter => filter(entry))
}

/**
 * Combine multiple filters with OR logic
 */
export function anyFilter(...filters: LogFilter[]): LogFilter {
  return (entry: LogEntry) => filters.some(filter => filter(entry))
}

/**
 * Invert a filter
 */
export function notFilter(filter: LogFilter): LogFilter {
  return (entry: LogEntry) => !filter(entry)
}

// =============================================================================
// Default Export
// =============================================================================

import type { LoggerConfig, LogLevelString, LogEntry, LogFilter } from './types'
import { LoggerPlugin } from './logger'
export default LoggerPlugin