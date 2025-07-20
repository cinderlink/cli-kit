/**
 * Logging Engine Implementation
 * 
 * This module provides the core logging engine that handles log entry creation,
 * buffering, output management, and log retrieval.
 * 
 * @module plugins/core/logging-engine
 */

import { Effect } from "effect"
import {
  LoggerConfig,
  LogLevel,
  LogLevelString,
  LogEntry,
  LogMetadata,
  LogQuery,
  LogSearchQuery,
  LogOutput,
  CircularBuffer,
  LoggerInitializationError,
  LogOutputError,
  generateLogId,
  parseLogLevel,
  logLevelToString,
} from './types'
import { CircularBufferImpl } from './circular-buffer'
import * as os from 'os'

// =============================================================================
// Logging Engine Class
// =============================================================================

/**
 * Core logging engine that handles log processing and distribution
 */
export class LoggingEngine {
  private config: LoggerConfig
  private outputs: Map<string, LogOutput> = new Map()
  private buffer: CircularBuffer<LogEntry>
  private level: LogLevel
  private metadata: Record<string, unknown> = {}
  private isInitialized = false
  
  // Performance tracking
  private totalLogs = 0
  private errorCount = 0
  private lastFlushTime = Date.now()

  constructor(config: LoggerConfig) {
    this.config = config
    this.level = parseLogLevel(config.level)
    this.metadata = { ...config.metadata }
    this.buffer = new CircularBufferImpl<LogEntry>(config.bufferSize)
  }

  // =============================================================================
  // Lifecycle Methods
  // =============================================================================

  /**
   * Initialize the logging engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Add global metadata
      this.metadata = {
        ...this.metadata,
        pid: process.pid,
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
        startTime: new Date().toISOString(),
      }

      this.isInitialized = true
      
      // Log engine startup only if debug level or below is enabled
      if (this.level <= LogLevel.DEBUG) {
        this.logInternal(LogLevel.INFO, 'Logging engine initialized', {
          config: {
            level: this.config.level,
            outputs: this.config.outputs,
            bufferSize: this.config.bufferSize,
          }
        })
      }
      
    } catch (error) {
      throw new LoggerInitializationError(
        `Failed to initialize logging engine: ${error}`,
        error
      )
    }
  }

  /**
   * Destroy the logging engine
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // Log shutdown only if debug level or below is enabled
      if (this.level <= LogLevel.DEBUG) {
        this.logInternal(LogLevel.INFO, 'Logging engine shutting down', {
          stats: {
            totalLogs: this.totalLogs,
            errorCount: this.errorCount,
            bufferSize: this.buffer.size(),
          }
        })
      }

      // Flush all pending logs
      await this.flush()

      // Destroy all outputs
      const destroyPromises = Array.from(this.outputs.values()).map(output =>
        output.destroy().catch(error => {
          console.error('Failed to destroy output:', error)
        })
      )
      
      await Promise.all(destroyPromises)
      this.outputs.clear()

      this.isInitialized = false
      
    } catch (error) {
      throw new Error(`Failed to destroy logging engine: ${error}`)
    }
  }

  // =============================================================================
  // Core Logging Methods
  // =============================================================================

  /**
   * Log a debug message
   */
  debug(message: string, meta: LogMetadata = {}): void {
    this.log(LogLevel.DEBUG, message, meta)
  }

  /**
   * Log an info message
   */
  info(message: string, meta: LogMetadata = {}): void {
    this.log(LogLevel.INFO, message, meta)
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta: LogMetadata = {}): void {
    this.log(LogLevel.WARN, message, meta)
  }

  /**
   * Log an error message
   */
  error(message: string, meta: LogMetadata = {}): void {
    this.log(LogLevel.ERROR, message, meta)
  }

  /**
   * Log a fatal message
   */
  fatal(message: string, meta: LogMetadata = {}): void {
    this.log(LogLevel.FATAL, message, meta)
  }

  /**
   * Main logging method
   */
  log(level: LogLevel, message: string, meta: LogMetadata = {}): void {
    // Check if this level should be logged
    if (level < this.level) {
      return
    }

    try {
      this.logInternal(level, message, meta)
    } catch (error) {
      this.handleLoggingError(error, level, message, meta)
    }
  }

  /**
   * Internal logging implementation
   */
  private logInternal(level: LogLevel, message: string, meta: LogMetadata): void {
    const entry = this.createLogEntry(level, message, meta)
    
    // Add to buffer for history
    this.buffer.push(entry)
    
    // Write to all outputs
    this.writeToOutputs(entry)
    
    // Update statistics
    this.totalLogs++
  }

  /**
   * Create a log entry
   */
  private createLogEntry(level: LogLevel, message: string, meta: LogMetadata): LogEntry {
    return {
      id: generateLogId(),
      timestamp: new Date(),
      level: logLevelToString(level),
      message,
      metadata: {
        ...this.metadata,
        ...meta,
      },
    }
  }

  /**
   * Write log entry to all outputs
   */
  private writeToOutputs(entry: LogEntry): void {
    if (this.outputs.size === 0) {
      // Fallback to console if no outputs configured
      this.fallbackConsoleLog(entry)
      return
    }

    for (const [name, output] of this.outputs) {
      try {
        if (output.shouldLog(entry)) {
          output.write(entry)
        }
      } catch (error) {
        this.handleOutputError(error, name, entry)
      }
    }
  }

  /**
   * Fallback console logging when no outputs are available
   */
  private fallbackConsoleLog(entry: LogEntry): void {
    const message = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`
    
    switch (entry.level) {
      case 'error':
      case 'fatal':
        console.error(message)
        break
      case 'warn':
        console.warn(message)
        break
      default:
        console.log(message)
    }
  }

  // =============================================================================
  // Output Management
  // =============================================================================

  /**
   * Add a log output
   */
  async addOutput(name: string, output: LogOutput): Promise<void> {
    try {
      await output.initialize()
      this.outputs.set(name, output)
      
      if (this.level <= LogLevel.DEBUG) {
        this.logInternal(LogLevel.DEBUG, `Added log output: ${name}`, {
          outputsActive: Array.from(this.outputs.keys())
        })
      }
      
    } catch (error) {
      throw new LogOutputError(`Failed to add output '${name}': ${error}`, error)
    }
  }

  /**
   * Remove a log output
   */
  async removeOutput(name: string): Promise<void> {
    const output = this.outputs.get(name)
    if (!output) {
      return
    }

    try {
      await output.destroy()
      this.outputs.delete(name)
      
      if (this.level <= LogLevel.DEBUG) {
        this.logInternal(LogLevel.DEBUG, `Removed log output: ${name}`, {
          outputsActive: Array.from(this.outputs.keys())
        })
      }
      
    } catch (error) {
      throw new LogOutputError(`Failed to remove output '${name}': ${error}`, error)
    }
  }

  /**
   * Get output names
   */
  getOutputNames(): Set<string> {
    return new Set(this.outputs.keys())
  }

  /**
   * Get output by name
   */
  getOutput(name: string): LogOutput | undefined {
    return this.outputs.get(name)
  }

  // =============================================================================
  // Configuration Methods
  // =============================================================================

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    const oldLevel = this.level
    this.level = level
    
    // Only log level change if the new level would allow INFO messages
    if (level <= LogLevel.INFO) {
      this.logInternal(LogLevel.INFO, 'Log level changed', {
        from: logLevelToString(oldLevel),
        to: logLevelToString(level)
      })
    }
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.level
  }

  /**
   * Update global metadata
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata }
    
    this.logInternal(LogLevel.DEBUG, 'Global metadata updated', {
      metadataKeys: Object.keys(this.metadata)
    })
  }

  // =============================================================================
  // Buffering and Flushing
  // =============================================================================

  /**
   * Flush all outputs
   */
  async flush(): Promise<void> {
    const flushPromises = Array.from(this.outputs.values()).map(output => {
      if (output.flush) {
        return output.flush().catch(error => {
          console.error('Failed to flush output:', error)
        })
      }
      return Promise.resolve()
    })

    await Promise.all(flushPromises)
    this.lastFlushTime = Date.now()
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.size()
  }

  /**
   * Get buffer capacity
   */
  getBufferCapacity(): number {
    return this.buffer.capacity()
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.buffer.clear()
    this.logInternal(LogLevel.DEBUG, 'Log buffer cleared', {})
  }

  // =============================================================================
  // Log Retrieval
  // =============================================================================

  /**
   * Get log history
   */
  async getLogHistory(query?: LogQuery): Promise<LogEntry[]> {
    let logs = this.buffer.toArray()

    if (query) {
      logs = this.filterLogs(logs, query)
    }

    // Apply limit and offset
    if (query?.offset) {
      logs = logs.slice(query.offset)
    }
    
    if (query?.limit) {
      logs = logs.slice(0, query.limit)
    }

    return logs
  }

  /**
   * Search logs with advanced filtering
   */
  async searchLogs(query: LogSearchQuery): Promise<LogEntry[]> {
    let logs = this.buffer.toArray()

    // Apply basic filters first
    logs = this.filterLogs(logs, query)

    // Apply text search
    if (query.textSearch) {
      const searchTerm = query.textSearch.toLowerCase()
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
      )
    }

    // Apply metadata filters
    if (query.metadataFilters) {
      logs = logs.filter(log => {
        return Object.entries(query.metadataFilters!).every(([key, value]) => {
          return log.metadata[key] === value
        })
      })
    }

    // Apply sorting
    if (query.sortBy) {
      logs.sort((a, b) => {
        let comparison = 0
        
        if (query.sortBy === 'timestamp') {
          comparison = a.timestamp.getTime() - b.timestamp.getTime()
        } else if (query.sortBy === 'level') {
          const levelOrder = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 }
          comparison = levelOrder[a.level] - levelOrder[b.level]
        }
        
        return query.sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Apply limit and offset
    if (query.offset) {
      logs = logs.slice(query.offset)
    }
    
    if (query.limit) {
      logs = logs.slice(0, query.limit)
    }

    return logs
  }

  /**
   * Filter logs based on query
   */
  private filterLogs(logs: LogEntry[], query: LogQuery): LogEntry[] {
    return logs.filter(log => {
      if (query.level && log.level !== query.level) return false
      if (query.since && log.timestamp < query.since) return false
      if (query.until && log.timestamp > query.until) return false
      if (query.search && !log.message.includes(query.search)) return false
      
      if (query.metadata) {
        const matches = Object.entries(query.metadata).every(([key, value]) => {
          return log.metadata[key] === value
        })
        if (!matches) return false
      }
      
      return true
    })
  }

  // =============================================================================
  // Error Handling
  // =============================================================================

  /**
   * Handle logging errors
   */
  private handleLoggingError(error: unknown, level: LogLevel, message: string, meta: LogMetadata): void {
    this.errorCount++
    
    // Logging should never crash the application
    console.error('[LoggingEngine] Logging error:', {
      error,
      level: logLevelToString(level),
      message,
      meta,
      totalErrors: this.errorCount,
    })
  }

  /**
   * Handle output-specific errors
   */
  private handleOutputError(error: unknown, outputName: string, entry: LogEntry): void {
    this.errorCount++
    
    // If one output fails, others should still work
    console.error(`[LoggingEngine] Output '${outputName}' error:`, {
      error,
      entry: {
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
      },
      totalErrors: this.errorCount,
    })
  }

  // =============================================================================
  // Statistics and Monitoring
  // =============================================================================

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      totalLogs: this.totalLogs,
      errorCount: this.errorCount,
      currentLevel: logLevelToString(this.level),
      bufferSize: this.buffer.size(),
      bufferCapacity: this.buffer.capacity(),
      outputsActive: Array.from(this.outputs.keys()),
      lastFlushTime: new Date(this.lastFlushTime),
      metadata: { ...this.metadata },
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.totalLogs = 0
    this.errorCount = 0
    this.lastFlushTime = Date.now()
    
    this.logInternal(LogLevel.DEBUG, 'Statistics reset', {})
  }

  /**
   * Get engine configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}