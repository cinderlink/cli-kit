/**
 * Logger Types and Interfaces
 * 
 * Core types for the tuix logging system
 */

import { Effect, Context, Option } from "effect"

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

export const LogLevels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
} as const

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  metadata?: Record<string, any>
  error?: Error
  context?: string[]
  span?: {
    name: string
    duration?: number
    attributes?: Record<string, any>
  }
  pid?: number
  hostname?: string
  name?: string
  v?: number // version
  src?: {
    file: string
    line: number
    func?: string
  }
}

export interface LogFormatter {
  format(entry: LogEntry): string
}

export interface LogTransport {
  write(entry: LogEntry): Effect.Effect<void, never, never>
  flush?(): Effect.Effect<void, never, never>
  close?(): Effect.Effect<void, never, never>
}

export interface LoggerConfig {
  level: LogLevel
  transports: LogTransport[]
  formatter?: LogFormatter
  context?: string[]
  metadata?: Record<string, any>
}

export interface Logger {
  // Basic logging methods
  trace(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  debug(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  info(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  warn(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  error(message: string, error?: Error, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  fatal(message: string, error?: Error, metadata?: Record<string, any>): Effect.Effect<void, never, never>
  
  // Object-based logging (like bunyan)
  log(entry: Partial<LogEntry>): Effect.Effect<void, never, never>
  
  // Child loggers with context
  child(context: string | Record<string, any>): Logger
  
  // Tracing and spans
  span<R, E, A>(name: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
  startSpan(name: string, attributes?: Record<string, any>): SpanContext
  
  // Pretty printing for development
  pretty(): Logger
  
  // Serializers
  addSerializer(field: string, serializer: (value: unknown) => unknown): Logger
  
  // Level management
  level(): LogLevel
  level(level: LogLevel): void
  isLevelEnabled(level: LogLevel): boolean
}

export interface InteractiveLogEntry extends LogEntry {
  id: string
  expanded: boolean
  children?: InteractiveLogEntry[]
  details?: string
  actions?: Array<{
    label: string
    handler: () => Effect.Effect<void, never, never>
  }>
}

export interface InteractiveLogRenderer {
  render(entries: InteractiveLogEntry[]): Effect.Effect<void, never, never>
  expand(entryId: string): Effect.Effect<void, never, never>
  collapse(entryId: string): Effect.Effect<void, never, never>
  clear(): Effect.Effect<void, never, never>
}

export interface LogRotationConfig {
  maxSize?: number // bytes
  maxFiles?: number
  maxAge?: number // days
  compress?: boolean
  datePattern?: string
}

export interface StructuredLogFormat {
  timestamp: string
  level: string
  message: string
  context?: string[]
  metadata?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
  span?: {
    name: string
    duration?: number
    attributes?: Record<string, any>
  }
}

export interface SpanContext {
  name: string
  startTime: number
  attributes: Record<string, any>
  end(attributes?: Record<string, any>): Effect.Effect<void, never, never>
}

export interface TransportOptions {
  level?: LogLevel
  format?: LogFormatter
  handleExceptions?: boolean
  handleRejections?: boolean
}

export interface ConsoleTransportOptions extends TransportOptions {
  colorize?: boolean
  prettyPrint?: boolean
  timestamp?: boolean | string | (() => string)
  depth?: number
  showLevel?: boolean
  showMetadata?: boolean
}

export interface FileTransportOptions extends TransportOptions {
  filename: string
  maxSize?: number | string
  maxFiles?: number
  tailable?: boolean
  zippedArchive?: boolean
  options?: {
    flags?: string
    encoding?: string
    mode?: number
  }
}

export interface StreamTransportOptions extends TransportOptions {
  stream: NodeJS.WritableStream
}

export interface HttpTransportOptions extends TransportOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  batch?: boolean
  batchSize?: number
  batchInterval?: number
}

export type Serializers = Record<string, (value: unknown) => unknown>

export const defaultSerializers: Serializers = {
  error: (err: Error) => ({
    message: err.message,
    name: err.name,
    stack: err.stack,
    ...(err as Record<string, unknown>)
  }),
  req: (req: { method?: string; url?: string; headers?: unknown; connection?: { remoteAddress?: string; remotePort?: number } }) => ({
    method: req.method,
    url: req.url,
    headers: req.headers,
    remoteAddress: req.connection?.remoteAddress,
    remotePort: req.connection?.remotePort
  }),
  res: (res: { statusCode?: number; headers?: unknown }) => ({
    statusCode: res.statusCode,
    headers: res.getHeaders?.()
  })
}

export const Logger = Context.GenericTag<Logger>("tuix/Logger")

export const LoggerConfig = Context.GenericTag<LoggerConfig>("tuix/LoggerConfig")

export const InteractiveLogRenderer = Context.GenericTag<InteractiveLogRenderer>("tuix/InteractiveLogRenderer")