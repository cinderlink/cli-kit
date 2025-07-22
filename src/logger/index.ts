/**
 * Logger Module
 * 
 * A powerful, flexible logging system for tuix applications
 */

export * from "./types"
export * from "./core/logger"
export * from "./formatters/formatters"
export * from "./transports/transports"
export { LogExplorer } from "./components/LogExplorer"
export * from "./components/LogComponents"
export { LiveLogDashboard, ProcessLogView } from "./components/LiveLogDashboard"
export * from "./impl/presets"

import { Effect, Layer, Context } from "effect"
import type { Logger, LoggerConfig, LogLevel } from "./types"
import { TuixLogger, makeLoggerLayer, makeQueuedLoggerLayer } from "./core/logger"
import { ConsoleTransport, FileTransport, StreamTransport, HttpTransport } from "./transports/transports"
import { PrettyFormatter, JSONFormatter, CompactFormatter, CLIFormatter } from "./formatters/formatters"

/**
 * Create a default console logger
 */
export const createConsoleLogger = (
  level: LogLevel = "info",
  options?: {
    colorize?: boolean
    prettyPrint?: boolean
    showEmoji?: boolean
  }
): Logger => {
  const config: LoggerConfig = {
    level,
    transports: [
      new ConsoleTransport({
        colorize: options?.colorize !== false,
        prettyPrint: options?.prettyPrint !== false,
        showLevel: true,
        showMetadata: true,
        format: new PrettyFormatter({
          colorize: options?.colorize !== false,
          showEmoji: options?.showEmoji ?? true
        })
      })
    ]
  }
  
  return new TuixLogger(config)
}

/**
 * Create a production logger with file and console output
 */
export const createProductionLogger = (
  name: string,
  options?: {
    level?: LogLevel
    logDir?: string
    maxFileSize?: string
    maxFiles?: number
    console?: boolean
  }
): Layer.Layer<Logger, never, never> => {
  const level = options?.level || "info"
  const logDir = options?.logDir || "./logs"
  
  const transports = []
  
  // File transport for all logs
  transports.push(
    new FileTransport({
      filename: `${logDir}/${name}.log`,
      level,
      maxSize: options?.maxFileSize || "100mb",
      maxFiles: options?.maxFiles || 10,
      zippedArchive: true,
      format: new JSONFormatter()
    })
  )
  
  // Separate error log
  transports.push(
    new FileTransport({
      filename: `${logDir}/${name}-error.log`,
      level: "error",
      maxSize: options?.maxFileSize || "100mb",
      maxFiles: options?.maxFiles || 10,
      zippedArchive: true,
      format: new JSONFormatter()
    })
  )
  
  // Console output if enabled
  if (options?.console !== false) {
    transports.push(
      new ConsoleTransport({
        level,
        colorize: true,
        format: new CompactFormatter()
      })
    )
  }
  
  const config: LoggerConfig = {
    level,
    transports,
    context: name ? [name] : undefined
  }
  
  return makeLoggerLayer(config)
}

/**
 * Create a development logger with pretty printing
 */
export const createDevelopmentLogger = (
  name?: string,
  level: LogLevel = "debug"
): Layer.Layer<Logger, never, never> => {
  const config: LoggerConfig = {
    level,
    transports: [
      new ConsoleTransport({
        colorize: true,
        prettyPrint: true,
        showTimestamp: true,
        showLevel: true,
        showMetadata: true,
        format: new PrettyFormatter({
          colorize: true,
          showEmoji: true,
          showSource: true,
          timestampFormat: "relative"
        })
      })
    ],
    context: name ? [name] : undefined
  }
  
  return makeLoggerLayer(config)
}

/**
 * Create a logger for CLI applications
 */
export const createCLILogger = (
  level: LogLevel = "info",
  options?: {
    verbose?: boolean
    quiet?: boolean
    logFile?: string
  }
): Layer.Layer<Logger, never, never> => {
  const transports = []
  
  // Adjust level based on flags
  let effectiveLevel = level
  if (options?.quiet) effectiveLevel = "error"
  if (options?.verbose) effectiveLevel = "debug"
  
  // Console output
  transports.push(
    new ConsoleTransport({
      level: effectiveLevel,
      format: new CLIFormatter({
        colorize: true,
        maxWidth: process.stdout.columns || 80
      })
    })
  )
  
  // File output if specified
  if (options?.logFile) {
    transports.push(
      new FileTransport({
        filename: options.logFile,
        level: "debug", // Always log everything to file
        format: new JSONFormatter()
      })
    )
  }
  
  const config: LoggerConfig = {
    level: effectiveLevel,
    transports
  }
  
  return makeLoggerLayer(config)
}

/**
 * Create a logger that sends logs to a remote endpoint
 */
export const createRemoteLogger = (
  url: string,
  options?: {
    level?: LogLevel
    headers?: Record<string, string>
    batch?: boolean
    batchSize?: number
    batchInterval?: number
    localFallback?: boolean
  }
): Layer.Layer<Logger, never, never> => {
  const transports = []
  
  // Remote transport
  transports.push(
    new HttpTransport({
      url,
      level: options?.level || "info",
      headers: options?.headers,
      batch: options?.batch !== false,
      batchSize: options?.batchSize || 100,
      batchInterval: options?.batchInterval || 5000,
      format: new JSONFormatter()
    })
  )
  
  // Local fallback
  if (options?.localFallback !== false) {
    transports.push(
      new ConsoleTransport({
        level: "error",
        format: new CompactFormatter()
      })
    )
  }
  
  const config: LoggerConfig = {
    level: options?.level || "info",
    transports
  }
  
  return makeQueuedLoggerLayer(config, 10000)
}

/**
 * Logger utilities
 */
export const LoggerUtils = {
  /**
   * Parse log level from string
   */
  parseLevel(level: string): LogLevel {
    const normalized = level.toLowerCase()
    if (["trace", "debug", "info", "warn", "error", "fatal"].includes(normalized)) {
      return normalized as LogLevel
    }
    throw new Error(`Invalid log level: ${level}`)
  },

  /**
   * Get log level from environment
   */
  getLevelFromEnv(envVar: string = "LOG_LEVEL", defaultLevel: LogLevel = "info"): LogLevel {
    const level = process.env[envVar]
    if (!level) return defaultLevel
    
    try {
      return this.parseLevel(level)
    } catch {
      console.warn(`Invalid log level in ${envVar}: ${level}, using ${defaultLevel}`)
      return defaultLevel
    }
  },

  /**
   * Create a logger from environment configuration
   */
  fromEnv(name: string = "app"): Layer.Layer<Logger, never, never> {
    const level = this.getLevelFromEnv()
    const format = process.env.LOG_FORMAT || "pretty"
    const output = process.env.LOG_OUTPUT || "console"
    
    if (output === "file") {
      const logDir = process.env.LOG_DIR || "./logs"
      return createProductionLogger(name, { level, logDir })
    } else if (process.env.NODE_ENV === "production") {
      return createProductionLogger(name, { level })
    } else {
      return createDevelopmentLogger(name, level)
    }
  }
}

/**
 * Re-export commonly used types and functions
 */
export type { Logger, LogEntry, LogLevel, LogTransport, LogFormatter } from "./types"
export { log, withLoggerContext, setGlobalLogger, getGlobalLogger } from "./core/logger"

/**
 * Logger constants
 */
export * from "./constants"