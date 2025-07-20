/**
 * Logger Plugin Types
 * 
 * This module defines the complete type system for the Logger Plugin,
 * providing interfaces for structured logging, log management, and real-time streaming.
 * 
 * @module plugins/core/types
 */

import { z } from "zod"
import { Effect, Stream } from "effect"

// =============================================================================
// Log Level Types
// =============================================================================

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log level string type
 */
export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Convert log level enum to string
 */
export function logLevelToString(level: LogLevel): LogLevelString {
  switch (level) {
    case LogLevel.DEBUG: return 'debug'
    case LogLevel.INFO: return 'info'
    case LogLevel.WARN: return 'warn'
    case LogLevel.ERROR: return 'error'
    case LogLevel.FATAL: return 'fatal'
    default: return 'info'
  }
}

/**
 * Parse log level from string
 */
export function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'debug': return LogLevel.DEBUG
    case 'info': return LogLevel.INFO
    case 'warn': case 'warning': return LogLevel.WARN
    case 'error': return LogLevel.ERROR
    case 'fatal': case 'critical': return LogLevel.FATAL
    default: return LogLevel.INFO
  }
}

// =============================================================================
// Log Entry Types
// =============================================================================

/**
 * Log metadata interface
 */
export interface LogMetadata {
  readonly [key: string]: unknown
}

/**
 * Core log entry structure
 */
export interface LogEntry {
  readonly id: string
  readonly timestamp: Date
  readonly level: LogLevelString
  readonly message: string
  readonly metadata: LogMetadata
}

/**
 * Log query interface for filtering
 */
export interface LogQuery {
  readonly level?: LogLevelString
  readonly since?: Date
  readonly until?: Date
  readonly search?: string
  readonly metadata?: Partial<LogMetadata>
  readonly limit?: number
  readonly offset?: number
}

/**
 * Log search query interface
 */
export interface LogSearchQuery extends LogQuery {
  readonly textSearch?: string
  readonly metadataFilters?: Record<string, unknown>
  readonly sortBy?: 'timestamp' | 'level'
  readonly sortOrder?: 'asc' | 'desc'
}

// =============================================================================
// Log Filter Types
// =============================================================================

/**
 * Log filter function type
 */
export type LogFilter = (entry: LogEntry) => boolean

/**
 * Log filter configuration
 */
export interface LogFilterConfig {
  readonly name: string
  readonly filter: LogFilter
  readonly description?: string
}

// =============================================================================
// Log Output Types
// =============================================================================

/**
 * Log format options
 */
export type LogFormat = 'json' | 'text' | 'structured'

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  readonly maxSize?: string // e.g., '100MB'
  readonly maxFiles?: number
  readonly datePattern?: string
  readonly compression?: boolean
}

/**
 * File output configuration
 */
export interface FileOutputConfig {
  readonly path: string
  readonly rotation?: LogRotationConfig
  readonly append?: boolean
  readonly encoding?: BufferEncoding
  readonly enableIndexing?: boolean
}

/**
 * Console output configuration
 */
export interface ConsoleOutputConfig {
  readonly colors?: boolean
  readonly level?: LogLevelString
}

/**
 * Stream output configuration
 */
export interface StreamOutputConfig {
  readonly bufferSize?: number
  readonly flushInterval?: number
  readonly backpressureLimit?: number
}

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Logger Plugin configuration schema
 */
export const LoggerConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  outputs: z.array(z.string()).default(['console']),
  format: z.enum(['json', 'text', 'structured']).default('json'),
  bufferSize: z.number().min(10).max(100000).default(1000),
  flushInterval: z.number().min(100).max(30000).default(1000),
  rotation: z.object({
    maxSize: z.string().default('100MB'),
    maxFiles: z.number().min(1).max(100).default(5),
    datePattern: z.string().default('YYYY-MM-DD'),
    compression: z.boolean().default(false)
  }).optional(),
  metadata: z.record(z.unknown()).default({}),
  filters: z.array(z.unknown()).default([]),
  file: z.object({
    path: z.string(),
    append: z.boolean().default(true),
    encoding: z.string().default('utf8'),
    enableIndexing: z.boolean().default(true)
  }).optional(),
  console: z.object({
    colors: z.boolean().default(true),
    level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional()
  }).optional(),
  stream: z.object({
    bufferSize: z.number().default(1000),
    flushInterval: z.number().default(1000),
    backpressureLimit: z.number().default(10000)
  }).optional()
})

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>

// =============================================================================
// Logger API Interface
// =============================================================================

/**
 * Main Logger API interface
 */
export interface LoggerAPI {
  // Logging methods
  debug(message: string, meta?: LogMetadata): void
  info(message: string, meta?: LogMetadata): void
  warn(message: string, meta?: LogMetadata): void
  error(message: string, meta?: LogMetadata): void
  fatal(message: string, meta?: LogMetadata): void
  log(level: LogLevel, message: string, meta?: LogMetadata): void
  
  // Log retrieval
  getLogHistory(query?: LogQuery): Promise<LogEntry[]>
  searchLogs(query: LogSearchQuery): Promise<LogEntry[]>
  
  // Log streaming
  subscribeToLogs(filter?: LogFilter): Stream.Stream<LogEntry>
  createLogStream(name: string, filter?: LogFilter): Stream.Stream<LogEntry>
  
  // Configuration
  setLogLevel(level: LogLevelString): void
  addOutput(name: string, output: LogOutput): Promise<void>
  removeOutput(name: string): Promise<void>
  getConfig(): LoggerConfig
  
  // Utility methods
  flush(): Promise<void>
  getStats(): LogStats
}

// =============================================================================
// Log Output Abstraction
// =============================================================================

/**
 * Abstract log output interface
 */
export interface LogOutput {
  initialize(): Promise<void>
  write(entry: LogEntry): void
  destroy(): Promise<void>
  shouldLog(entry: LogEntry): boolean
  flush?(): Promise<void>
}

// =============================================================================
// Log Statistics
// =============================================================================

/**
 * Logger statistics interface
 */
export interface LogStats {
  readonly totalLogs: number
  readonly logsByLevel: Record<LogLevelString, number>
  readonly errorCount: number
  readonly uptime: number
  readonly outputsActive: string[]
  readonly bufferSize: number
  readonly lastLogTime?: Date
}

// =============================================================================
// Circular Buffer Interface
// =============================================================================

/**
 * Circular buffer interface for log history
 */
export interface CircularBuffer<T> {
  push(item: T): void
  toArray(): T[]
  size(): number
  capacity(): number
  clear(): void
  isFull(): boolean
  isEmpty(): boolean
}

// =============================================================================
// Logger Plugin Metadata
// =============================================================================

/**
 * Plugin metadata for Logger
 */
export interface LoggerPluginMetadata {
  readonly name: 'logger'
  readonly version: '1.0.0'
  readonly description: 'Centralized logging and log management system'
  readonly author: 'TUIX Team'
  readonly capabilities: readonly [
    'structured-logging',
    'log-storage',
    'log-streaming',
    'log-rotation',
    'multi-output'
  ]
  readonly dependencies: readonly []
  readonly platform: readonly ['darwin', 'linux', 'win32']
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Logger initialization error
 */
export class LoggerInitializationError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LoggerInitializationError'
  }
}

/**
 * Log output error
 */
export class LogOutputError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LogOutputError'
  }
}

/**
 * Log rotation error
 */
export class LogRotationError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LogRotationError'
  }
}

/**
 * Log formatting error
 */
export class LogFormattingError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LogFormattingError'
  }
}

/**
 * Log streaming error
 */
export class LogStreamingError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LogStreamingError'
  }
}

// =============================================================================
// Stream Management Types
// =============================================================================

/**
 * Log stream information
 */
export interface LogStreamInfo {
  readonly name: string
  readonly filter?: LogFilter
  readonly subscriberCount: number
  readonly isActive: boolean
  readonly createdAt: Date
}

/**
 * Stream statistics
 */
export interface StreamStats {
  readonly activeStreams: number
  readonly streamNames: string[]
  readonly totalSubscribers: number
  readonly messagesSent: number
  readonly messagesBuffered: number
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate unique log ID
 */
export function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse size string to bytes
 */
export function parseSize(sizeStr: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i)
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`)
  }
  
  const [, size, unit] = match
  const upperUnit = unit?.toUpperCase()
  const multiplier = upperUnit ? units[upperUnit] : undefined
  
  if (!multiplier) {
    throw new Error(`Unknown size unit: ${unit}`)
  }
  
  return Math.floor(parseFloat(size) * multiplier)
}

/**
 * Format size in bytes to human readable string
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
}