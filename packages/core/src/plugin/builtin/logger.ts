/**
 * Logger Plugin - Built-in plugin for logging integration
 * 
 * This plugin provides comprehensive logging capabilities with multiple
 * log levels, formatting options, and output destinations.
 * 
 * @module core/plugin/builtin/logger
 */

import { Effect, Ref, Queue, Array as IArray, Schedule } from "effect"
import { z } from "zod"
import { createPlugin } from "../types"
import type { Plugin, HookContext } from "../types"
import { StandardSignals } from "../signals"
import { createBeforeHook, createAfterHook, HOOK_NAMES, HookContext as HookContextService } from "../hooks"

// =============================================================================
// Logger Types
// =============================================================================

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry interface
 */
export interface LogEntry {
  readonly level: LogLevel
  readonly message: string
  readonly timestamp: Date
  readonly source?: string
  readonly metadata?: Record<string, unknown>
  readonly error?: Error
}

/**
 * Logger configuration schema
 */
const LoggerConfigSchema = z.object({
  level: z.nativeEnum(LogLevel).default(LogLevel.INFO),
  format: z.enum(['json', 'text', 'pretty']).default('pretty'),
  destination: z.enum(['console', 'file', 'both']).default('console'),
  filename: z.string().optional(),
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
  maxFiles: z.number().default(5),
  includeTimestamp: z.boolean().default(true),
  includeSource: z.boolean().default(true),
  colorize: z.boolean().default(true),
})

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>

// =============================================================================
// Logger Service
// =============================================================================

/**
 * Logger service interface
 */
export interface LoggerService {
  readonly log: (level: LogLevel, message: string, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>
  readonly debug: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>
  readonly info: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>
  readonly warn: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>
  readonly error: (message: string, error?: Error, metadata?: Record<string, unknown>) => Effect.Effect<void, never, never>
  readonly setLevel: (level: LogLevel) => Effect.Effect<void, never, never>
  readonly getLevel: () => Effect.Effect<LogLevel, never, never>
  readonly getHistory: (limit?: number) => Effect.Effect<LogEntry[], never, never>
  readonly clearHistory: () => Effect.Effect<void, never, never>
}

/**
 * Create logger service
 */
function createLoggerService(config: LoggerConfig): Effect.Effect<LoggerService, never, never> {
  return Effect.gen(function* () {
    const levelRef = yield* Ref.make(config.level)
    const historyRef = yield* Ref.make<LogEntry[]>([])
    const logQueue = yield* Queue.bounded<LogEntry>(1000)

    // Start log processor
    yield* Effect.fork(processLogQueue(logQueue, config))

    const shouldLog = (level: LogLevel): Effect.Effect<boolean, never, never> =>
      Effect.gen(function* () {
        const currentLevel = yield* Ref.get(levelRef)
        return level >= currentLevel
      })

    const log = (level: LogLevel, message: string, metadata?: Record<string, unknown>): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        const shouldProcess = yield* shouldLog(level)
        if (!shouldProcess) return

        const entry: LogEntry = {
          level,
          message,
          timestamp: new Date(),
          source: metadata?.source as string,
          metadata,
        }

        // Add to history
        yield* Ref.update(historyRef, history => {
          const newHistory = [...history, entry]
          return newHistory.length > 1000 ? newHistory.slice(-1000) : newHistory
        })

        // Queue for processing
        yield* Queue.offer(logQueue, entry)
      })

    const debug = (message: string, metadata?: Record<string, unknown>): Effect.Effect<void, never, never> =>
      log(LogLevel.DEBUG, message, metadata)

    const info = (message: string, metadata?: Record<string, unknown>): Effect.Effect<void, never, never> =>
      log(LogLevel.INFO, message, metadata)

    const warn = (message: string, metadata?: Record<string, unknown>): Effect.Effect<void, never, never> =>
      log(LogLevel.WARN, message, metadata)

    const error = (message: string, error?: Error, metadata?: Record<string, unknown>): Effect.Effect<void, never, never> =>
      log(LogLevel.ERROR, message, { ...metadata, error })

    const setLevel = (level: LogLevel): Effect.Effect<void, never, never> =>
      Ref.set(levelRef, level)

    const getLevel = (): Effect.Effect<LogLevel, never, never> =>
      Ref.get(levelRef)

    const getHistory = (limit?: number): Effect.Effect<LogEntry[], never, never> =>
      Effect.gen(function* () {
        const history = yield* Ref.get(historyRef)
        return limit ? history.slice(-limit) : history
      })

    const clearHistory = (): Effect.Effect<void, never, never> =>
      Ref.set(historyRef, [])

    return {
      log,
      debug,
      info,
      warn,
      error,
      setLevel,
      getLevel,
      getHistory,
      clearHistory,
    }
  })
}

/**
 * Process log queue
 */
function processLogQueue(
  queue: Queue.Queue<LogEntry>,
  config: LoggerConfig
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    while (true) {
      const entry = yield* Queue.take(queue)
      yield* outputLogEntry(entry, config)
    }
  }).pipe(Effect.forever)
}

/**
 * Output log entry
 */
function outputLogEntry(
  entry: LogEntry,
  config: LoggerConfig
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const formatted = formatLogEntry(entry, config)
    
    if (config.destination === 'console' || config.destination === 'both') {
      console.log(formatted)
    }
    
    if (config.destination === 'file' || config.destination === 'both') {
      // In a real implementation, this would write to a file
      // For now, we'll just log to console with a file prefix
      console.log(`[FILE] ${formatted}`)
    }
  })
}

/**
 * Format log entry
 */
function formatLogEntry(entry: LogEntry, config: LoggerConfig): string {
  const levelName = LogLevel[entry.level]
  const timestamp = config.includeTimestamp ? entry.timestamp.toISOString() : ''
  const source = config.includeSource && entry.source ? `[${entry.source}]` : ''
  
  switch (config.format) {
    case 'json':
      return JSON.stringify({
        level: levelName,
        message: entry.message,
        timestamp: entry.timestamp,
        source: entry.source,
        metadata: entry.metadata,
      })
    
    case 'text':
      return `${timestamp} ${levelName} ${source} ${entry.message}`
    
    case 'pretty':
    default:
      const levelColor = config.colorize ? getLevelColor(entry.level) : ''
      const resetColor = config.colorize ? '\x1b[0m' : ''
      return `${timestamp} ${levelColor}${levelName}${resetColor} ${source} ${entry.message}`
  }
}

/**
 * Get ANSI color code for log level
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG: return '\x1b[36m' // Cyan
    case LogLevel.INFO: return '\x1b[32m'  // Green
    case LogLevel.WARN: return '\x1b[33m'  // Yellow
    case LogLevel.ERROR: return '\x1b[31m' // Red
    default: return ''
  }
}

// =============================================================================
// Logger Plugin
// =============================================================================

/**
 * Create logger plugin
 */
export function createLoggerPlugin(config: Partial<LoggerConfig> = {}): Effect.Effect<Plugin, never, never> {
  return Effect.gen(function* () {
    const finalConfig = { ...LoggerConfigSchema.parse({}), ...config }
    const service = yield* createLoggerService(finalConfig)

    return createPlugin({
      name: 'logger',
      version: '1.0.0',
      description: 'Logging plugin for TUIX',
      author: 'TUIX Team',
      
      hooks: {
        [HOOK_NAMES.APP_INIT]: createAfterHook(
          Effect.gen(function* () {
            yield* service.info('Application initialized')
          })
        ),
        
        [HOOK_NAMES.APP_SHUTDOWN]: createBeforeHook(
          Effect.gen(function* () {
            yield* service.info('Application shutting down')
          })
        ),
        
        [HOOK_NAMES.APP_ERROR]: createAfterHook(
          Effect.gen(function* () {
            const context = yield* HookContextService
            const error = context.args[0] as Error
            yield* service.error('Application error occurred', error)
          }) as Effect.Effect<void, never, HookContext>
        ),
        
        [HOOK_NAMES.PROCESS_START]: createAfterHook(
          Effect.gen(function* () {
            const context = yield* HookContextService
            const processName = context.args[0] as string
            yield* service.info(`Process started: ${processName}`)
          }) as Effect.Effect<void, never, HookContext>
        ),
        
        [HOOK_NAMES.PROCESS_STOP]: createAfterHook(
          Effect.gen(function* () {
            const context = yield* HookContextService
            const processName = context.args[0] as string
            yield* service.info(`Process stopped: ${processName}`)
          }) as Effect.Effect<void, never, HookContext>
        ),
      },
      
      signals: {
        [StandardSignals.LOG_MESSAGE.name]: StandardSignals.LOG_MESSAGE,
      },
      
      services: {
        logger: service,
      },
      
      config: LoggerConfigSchema,
      
      defaultConfig: finalConfig,
    })
  })
}

/**
 * Logger plugin instance
 */
export const loggerPlugin = Effect.runSync(createLoggerPlugin())

// =============================================================================
// Logger Utilities
// =============================================================================

/**
 * Logger utility functions
 */
export const LoggerUtils = {
  /**
   * Create a scoped logger with a source prefix
   */
  createScopedLogger: (service: LoggerService, source: string) => ({
    debug: (message: string, metadata?: Record<string, unknown>) =>
      service.debug(message, { ...metadata, source }),
    info: (message: string, metadata?: Record<string, unknown>) =>
      service.info(message, { ...metadata, source }),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      service.warn(message, { ...metadata, source }),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
      service.error(message, error, { ...metadata, source }),
  }),
  
  /**
   * Format log level as string
   */
  formatLogLevel: (level: LogLevel): string => {
    return LogLevel[level].toLowerCase()
  },
  
  /**
   * Parse log level from string
   */
  parseLogLevel: (levelString: string): LogLevel => {
    const upperLevel = levelString.toUpperCase()
    return LogLevel[upperLevel as keyof typeof LogLevel] || LogLevel.INFO
  },
  
  /**
   * Get log statistics
   */
  getLogStats: (entries: LogEntry[]) => {
    const stats = {
      total: entries.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    }
    
    for (const entry of entries) {
      switch (entry.level) {
        case LogLevel.DEBUG: stats.debug++; break
        case LogLevel.INFO: stats.info++; break
        case LogLevel.WARN: stats.warn++; break
        case LogLevel.ERROR: stats.error++; break
      }
    }
    
    return stats
  },
  
  /**
   * Filter log entries by level
   */
  filterByLevel: (entries: LogEntry[], level: LogLevel): LogEntry[] => {
    return entries.filter(entry => entry.level >= level)
  },
  
  /**
   * Filter log entries by source
   */
  filterBySource: (entries: LogEntry[], source: string): LogEntry[] => {
    return entries.filter(entry => entry.source === source)
  },
  
  /**
   * Filter log entries by time range
   */
  filterByTimeRange: (entries: LogEntry[], start: Date, end: Date): LogEntry[] => {
    return entries.filter(entry => 
      entry.timestamp >= start && entry.timestamp <= end
    )
  },
}

// =============================================================================
// Export Types
// =============================================================================

// Types are exported inline above