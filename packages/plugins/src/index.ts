/**
 * TUIX Plugins Package
 * 
 * This package provides production-ready plugins for the TUIX framework,
 * including system plugins for process management, logging, and monitoring.
 * 
 * @module @tuix/plugins
 */

// Re-export system plugins
export { ProcessManagerPlugin } from "./system/process-manager"
export { BasePlugin } from "./system/base-plugin"

// Re-export core plugins
export {
  LoggerPlugin,
  LoggingEngine,
  LogStreamManager,
  CircularBufferImpl,
  LogOutputFactory,
  ConsoleLogOutput,
  FileLogOutput,
  StreamLogOutput,
  createLoggerPlugin,
  createDevLoggerPlugin,
  createProdLoggerPlugin,
  createTestLoggerPlugin,
  LogFilters,
  combineFilters,
  anyFilter,
  notFilter,
} from "./core"

// Re-export system types
export type {
  ProcessManagerConfig,
  ProcessManagerAPI,
  ProcessInfo,
  ProcessTreeNode,
  ProcessQuery,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
  TimeRange,
  AggregatedMetrics,
  ProcessPlatformAdapter,
} from "./system/types"

// Re-export core types
export type {
  LogLevelString,
  LogMetadata,
  LogEntry,
  LogQuery,
  LogSearchQuery,
  LogFilter,
  LogFilterConfig,
  LogFormat,
  LogRotationConfig,
  FileOutputConfig,
  ConsoleOutputConfig,
  StreamOutputConfig,
  LoggerConfig,
  LoggerAPI,
  LogOutput,
  LogStats,
  CircularBuffer,
  LoggerPluginMetadata,
  LogStreamInfo,
  StreamStats,
} from "./core"

// Re-export logger enums and utilities
export {
  LogLevel,
  logLevelToString,
  parseLogLevel,
  generateLogId,
  parseSize,
  formatSize,
  LoggerConfigSchema,
} from "./core"

// Re-export system errors
export {
  ProcessCollectionError,
  ProcessEnumerationError,
  ProcessManagementError,
  ProcessNotFoundError,
  MetricsCollectionError,
} from "./system/types"

// Re-export core errors
export {
  LoggerInitializationError,
  LogOutputError,
  LogRotationError,
  LogFormattingError,
  LogStreamingError,
} from "./core"

// Package version
export const VERSION = "1.0.0-rc.2"