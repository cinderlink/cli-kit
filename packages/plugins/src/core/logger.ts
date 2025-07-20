/**
 * Logger Plugin Implementation
 * 
 * This module provides the main Logger Plugin class that implements comprehensive
 * logging services including structured logging, multiple outputs, and real-time streaming.
 * 
 * @module plugins/core/logger
 */

import { Effect, Stream } from "effect"
import { BasePlugin } from "../system/base-plugin"
import type { PluginMetadata, PluginError } from "../../../core/src/plugin"
import {
  LoggerConfig,
  LoggerConfigSchema,
  LoggerAPI,
  LogLevel,
  LogLevelString,
  LogEntry,
  LogMetadata,
  LogQuery,
  LogSearchQuery,
  LogFilter,
  LogOutput,
  LogStats,
  CircularBuffer,
  LoggerPluginMetadata,
  LoggerInitializationError,
  LogOutputError,
  generateLogId,
  parseLogLevel,
  logLevelToString,
} from './types'
import { CircularBufferImpl } from './circular-buffer'
import { LoggingEngine } from './logging-engine'
import { LogOutputFactory } from './outputs/factory'
import { LogStreamManager } from './stream-manager'

// =============================================================================
// Logger Plugin Class
// =============================================================================

/**
 * Logger Plugin - Provides comprehensive logging services for TUIX applications
 */
export class LoggerPlugin extends BasePlugin {
  /**
   * Plugin metadata
   */
  public readonly metadata: PluginMetadata = {
    name: 'logger',
    version: '1.0.0',
    description: 'Centralized logging and log management system',
    author: 'TUIX Team',
    capabilities: [
      'structured-logging',
      'log-storage', 
      'log-streaming',
      'log-rotation',
      'multi-output'
    ],
    dependencies: [],
    platform: ['darwin', 'linux', 'win32']
  } as const

  /**
   * Plugin configuration
   */
  protected override config: LoggerConfig
  
  /**
   * Logging engine instance
   */
  private engine: LoggingEngine | null = null
  
  /**
   * Stream manager instance
   */
  private streamManager: LogStreamManager | null = null
  
  /**
   * Plugin statistics
   */
  private stats = {
    totalLogs: 0,
    logsByLevel: {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    },
    errorCount: 0,
    uptime: 0,
    outputsActive: [] as string[],
    bufferSize: 0,
    lastLogTime: undefined as Date | undefined,
  }
  
  /**
   * Plugin start time for uptime calculation
   */
  private startTime: Date = new Date()

  constructor(config: Partial<LoggerConfig> = {}) {
    // Parse and validate configuration
    const parsedConfig = LoggerConfigSchema.parse(config)
    super(parsedConfig)
    this.config = parsedConfig
  }

  /**
   * Get configuration (override BasePlugin method)
   */
  public override getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // =============================================================================
  // Plugin Lifecycle Methods
  // =============================================================================

  /**
   * Initialize the logger plugin
   */
  protected override doInit(): Effect.Effect<void, PluginError, never> {
    return Effect.gen(function* (this: LoggerPlugin) {
      try {
        this.log('info', 'Initializing Logger Plugin', { config: this.config })
        
        // Initialize logging engine
        this.engine = new LoggingEngine(this.config)
        yield* Effect.promise(() => this.engine!.initialize())
        
        // Initialize stream manager
        this.streamManager = new LogStreamManager(this.engine!)
        yield* Effect.promise(() => this.streamManager!.initialize())
        
        // Initialize outputs
        yield* this.initializeOutputs()
        
        // Start background services
        yield* this.startServices()
        
        // Update statistics
        this.updateStats()
        
        this.log('info', 'Logger Plugin initialized successfully', {
          outputs: Array.from(this.engine!.getOutputNames()),
          bufferSize: this.config.bufferSize,
        })
        
      } catch (error) {
        const pluginError = new LoggerInitializationError(
          `Failed to initialize Logger Plugin: ${error}`,
          error
        ) as PluginError
        
        yield* Effect.fail(pluginError)
      }
    }.bind(this))
  }

  /**
   * Destroy the logger plugin
   */
  protected override doDestroy(): Effect.Effect<void, PluginError, never> {
    return Effect.gen(function* (this: LoggerPlugin) {
      try {
        this.log('info', 'Shutting down Logger Plugin')
        
        // Flush pending logs
        if (this.engine) {
          yield* Effect.promise(() => this.engine!.flush())
        }
        
        // Stop background services
        yield* this.stopServices()
        
        // Destroy stream manager
        if (this.streamManager) {
          yield* Effect.promise(() => this.streamManager!.destroy())
          this.streamManager = null
        }
        
        // Destroy logging engine
        if (this.engine) {
          yield* Effect.promise(() => this.engine!.destroy())
          this.engine = null
        }
        
        this.log('info', 'Logger Plugin shutdown complete')
        
      } catch (error) {
        const pluginError = new Error(
          `Failed to destroy Logger Plugin: ${error}`
        ) as PluginError
        
        yield* Effect.fail(pluginError)
      }
    }.bind(this))
  }

  // =============================================================================
  // Plugin API Implementation
  // =============================================================================

  /**
   * Get the logger API
   */
  public override getAPI(): LoggerAPI {
    if (!this.isInitialized || !this.engine || !this.streamManager) {
      throw new LoggerInitializationError('Logger plugin not initialized')
    }

    return {
      // Logging methods
      debug: this.debug.bind(this),
      info: this.info.bind(this),
      warn: this.warn.bind(this),
      error: this.error.bind(this),
      fatal: this.fatal.bind(this),
      log: this.logWithLevel.bind(this),
      
      // Log retrieval
      getLogHistory: this.getLogHistory.bind(this),
      searchLogs: this.searchLogs.bind(this),
      
      // Log streaming
      subscribeToLogs: this.subscribeToLogs.bind(this),
      createLogStream: this.createLogStream.bind(this),
      
      // Configuration
      setLogLevel: this.setLogLevel.bind(this),
      addOutput: this.addOutput.bind(this),
      removeOutput: this.removeOutput.bind(this),
      getConfig: this.getConfig.bind(this),
      
      // Utility methods
      flush: this.flush.bind(this),
      getStats: this.getStats.bind(this),
    }
  }

  // =============================================================================
  // Logging Methods
  // =============================================================================

  /**
   * Log a debug message
   */
  private debug(message: string, meta: LogMetadata = {}): void {
    this.logEntry('debug', message, meta)
  }

  /**
   * Log an info message
   */
  private info(message: string, meta: LogMetadata = {}): void {
    this.logEntry('info', message, meta)
  }

  /**
   * Log a warning message
   */
  private warn(message: string, meta: LogMetadata = {}): void {
    this.logEntry('warn', message, meta)
  }

  /**
   * Log an error message
   */
  private error(message: string, meta: LogMetadata = {}): void {
    this.logEntry('error', message, meta)
  }

  /**
   * Log a fatal message
   */
  private fatal(message: string, meta: LogMetadata = {}): void {
    this.logEntry('fatal', message, meta)
  }

  /**
   * Main logging method
   */
  private logEntry(level: LogLevelString, message: string, meta: LogMetadata = {}): void {
    if (!this.engine) {
      console.error('[Logger] Engine not initialized, cannot log:', { level, message, meta })
      return
    }

    try {
      const logLevel = parseLogLevel(level)
      this.engine.log(logLevel, message, meta)
      
      // Update statistics
      this.stats.totalLogs++
      this.stats.logsByLevel[level]++
      this.stats.lastLogTime = new Date()
      
    } catch (error) {
      this.stats.errorCount++
      console.error('[Logger] Failed to log message:', error)
    }
  }

  /**
   * Log with LogLevel enum
   */
  private logWithLevel(level: LogLevel, message: string, meta: LogMetadata = {}): void {
    if (!this.engine) {
      console.error('[Logger] Engine not initialized, cannot log:', { level, message, meta })
      return
    }

    try {
      this.engine.log(level, message, meta)
      
      // Update statistics
      this.stats.totalLogs++
      this.stats.logsByLevel[logLevelToString(level)]++
      this.stats.lastLogTime = new Date()
      
    } catch (error) {
      this.stats.errorCount++
      console.error('[Logger] Failed to log message:', error)
    }
  }

  // =============================================================================
  // Log Retrieval Methods
  // =============================================================================

  /**
   * Get log history
   */
  private async getLogHistory(query?: LogQuery): Promise<LogEntry[]> {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    return this.engine.getLogHistory(query)
  }

  /**
   * Search logs
   */
  private async searchLogs(query: LogSearchQuery): Promise<LogEntry[]> {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    return this.engine.searchLogs(query)
  }

  // =============================================================================
  // Stream Methods
  // =============================================================================

  /**
   * Subscribe to log stream
   */
  private subscribeToLogs(filter?: LogFilter): Stream.Stream<LogEntry> {
    if (!this.streamManager) {
      throw new LoggerInitializationError('Stream manager not initialized')
    }
    
    return this.streamManager.subscribeToLogs(filter)
  }

  /**
   * Create named log stream
   */
  private createLogStream(name: string, filter?: LogFilter): Stream.Stream<LogEntry> {
    if (!this.streamManager) {
      throw new LoggerInitializationError('Stream manager not initialized')
    }
    
    return this.streamManager.createLogStream(name, filter)
  }

  // =============================================================================
  // Configuration Methods
  // =============================================================================

  /**
   * Set log level
   */
  private setLogLevel(level: LogLevelString): void {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    this.config.level = level
    this.engine.setLogLevel(parseLogLevel(level))
  }

  /**
   * Add output
   */
  private async addOutput(name: string, output: LogOutput): Promise<void> {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    await this.engine.addOutput(name, output)
    this.updateStats()
  }

  /**
   * Remove output
   */
  private async removeOutput(name: string): Promise<void> {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    await this.engine.removeOutput(name)
    this.updateStats()
  }


  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Flush all pending logs
   */
  private async flush(): Promise<void> {
    if (!this.engine) {
      throw new LoggerInitializationError('Engine not initialized')
    }
    
    await this.engine.flush()
  }

  /**
   * Get logger statistics
   */
  private getStats(): LogStats {
    this.updateStats()
    return { ...this.stats }
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  /**
   * Initialize configured outputs
   */
  private initializeOutputs(): Effect.Effect<void, PluginError, never> {
    return Effect.gen(function* (this: LoggerPlugin) {
      if (!this.engine) {
        yield* Effect.fail(new LoggerInitializationError('Engine not initialized') as PluginError)
        return
      }

      for (const outputName of this.config.outputs) {
        try {
          const output = LogOutputFactory.create(outputName, this.config)
          yield* Effect.promise(() => this.engine!.addOutput(outputName, output))
          this.log('debug', `Initialized output: ${outputName}`)
        } catch (error) {
          this.log('error', `Failed to initialize output: ${outputName}`, { error })
          throw new LogOutputError(`Failed to initialize output: ${outputName}`, error)
        }
      }
    }.bind(this))
  }

  /**
   * Start background services
   */
  private startServices(): Effect.Effect<void, PluginError, never> {
    return Effect.gen(function* () {
      // Start periodic statistics updates
      // Start log rotation monitoring
      // Start health checks
    })
  }

  /**
   * Stop background services
   */
  private stopServices(): Effect.Effect<void, PluginError, never> {
    return Effect.gen(function* () {
      // Stop timers and background processes
    })
  }

  /**
   * Update plugin statistics
   */
  private updateStats(): void {
    this.stats.uptime = Date.now() - this.startTime.getTime()
    this.stats.outputsActive = this.engine ? Array.from(this.engine.getOutputNames()) : []
    this.stats.bufferSize = this.engine ? this.engine.getBufferSize() : 0
  }

  // =============================================================================
  // Lifecycle Event Handlers
  // =============================================================================

  /**
   * Called after successful initialization
   */
  protected override onInitialized(): void {
    this.emit('logger:initialized', {
      plugin: this.name,
      outputs: this.config.outputs,
      level: this.config.level,
    })
  }

  /**
   * Called after successful destruction
   */
  protected override onDestroyed(): void {
    this.emit('logger:destroyed', {
      plugin: this.name,
      stats: this.stats,
    })
  }
}