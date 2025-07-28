/**
 * Core Logger Implementation
 *
 * Effect-based logger with rich features
 */

import { Effect, Ref, Context, Layer, Queue, Stream, Fiber, Option } from 'effect'
import * as os from 'os'
import type {
  LoggerConfig,
  LogEntry,
  LogLevel,
  LogTransport,
  SpanContext,
  Serializers,
} from '../types'
import { Logger, LogLevels, defaultSerializers } from '../types'

export class TuixLogger implements Logger {
  private levelValue: number
  private serializers: Serializers
  private contextPath: string[]
  private metadata: Record<string, any>
  private spans: Map<string, { startTime: number; attributes: Record<string, any> }> = new Map()

  constructor(
    private config: LoggerConfig,
    contextPath: string[] = [],
    metadata: Record<string, any> = {},
    serializers: Serializers = {}
  ) {
    this.levelValue = LogLevels[config.level]
    this.serializers = { ...defaultSerializers, ...serializers }
    this.contextPath = contextPath
    this.metadata = metadata
  }

  trace(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never> {
    return this.log({ level: 'trace', message, metadata })
  }

  debug(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never> {
    return this.log({ level: 'debug', message, metadata })
  }

  info(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never> {
    return this.log({ level: 'info', message, metadata })
  }

  warn(message: string, metadata?: Record<string, any>): Effect.Effect<void, never, never> {
    return this.log({ level: 'warn', message, metadata })
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, any>
  ): Effect.Effect<void, never, never> {
    return this.log({ level: 'error', message, error, metadata })
  }

  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, any>
  ): Effect.Effect<void, never, never> {
    return this.log({ level: 'fatal', message, error, metadata })
  }

  log(entry: Partial<LogEntry>): Effect.Effect<void, never, never> {
    if (!entry.level || !this.isLevelEnabled(entry.level)) {
      return Effect.void
    }

    const fullEntry: LogEntry = {
      level: entry.level,
      message: entry.message || '',
      timestamp: entry.timestamp || new Date(),
      context: [...this.contextPath, ...(entry.context || [])],
      metadata: this.serializeMetadata({ ...this.metadata, ...entry.metadata }),
      error: entry.error,
      span: entry.span,
      pid: process.pid,
      hostname: os.hostname(),
      name: this.config.name,
      v: 1,
      src: this.getSourceInfo(),
    }

    return Effect.forEach(this.config.transports, transport => transport.write(fullEntry)).pipe(
      Effect.asVoid,
      Effect.catchAll(() => Effect.void) // Don't fail on transport errors
    )
  }

  child(context: string | Record<string, any>): Logger {
    if (typeof context === 'string') {
      return new TuixLogger(
        this.config,
        [...this.contextPath, context],
        this.metadata,
        this.serializers
      )
    } else {
      return new TuixLogger(
        this.config,
        this.contextPath,
        { ...this.metadata, ...context },
        this.serializers
      )
    }
  }

  span<R, E, A>(name: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
    const self = this
    return Effect.gen(function* (_) {
      const startTime = Date.now()
      const spanId = `${name}-${startTime}-${Math.random()}`

      yield* _(
        Effect.sync(() => {
          self.spans.set(spanId, { startTime, attributes: {} })
        })
      )

      const result = yield* _(
        effect.pipe(
          Effect.tap(() => {
            const span = self.spans.get(spanId)
            if (span) {
              const duration = Date.now() - span.startTime
              self.spans.delete(spanId)

              return self.log({
                level: 'trace',
                message: `Span completed: ${name}`,
                span: {
                  name,
                  duration,
                  attributes: span.attributes,
                },
              })
            }
            return Effect.void
          }),
          Effect.tapError(() => {
            const span = self.spans.get(spanId)
            if (span) {
              const duration = Date.now() - span.startTime
              self.spans.delete(spanId)

              return self.log({
                level: 'error',
                message: `Span failed: ${name}`,
                span: {
                  name,
                  duration,
                  attributes: { ...span.attributes, error: true },
                },
              })
            }
            return Effect.void
          })
        )
      )

      return result
    })
  }

  startSpan(name: string, attributes?: Record<string, any>): SpanContext {
    const startTime = Date.now()
    const spanId = `${name}-${startTime}-${Math.random()}`

    this.spans.set(spanId, { startTime, attributes: attributes || {} })

    return {
      name,
      startTime,
      attributes: attributes || {},
      end: (endAttributes?: Record<string, any>) => {
        const span = this.spans.get(spanId)
        if (span) {
          const duration = Date.now() - span.startTime
          this.spans.delete(spanId)

          return this.log({
            level: 'trace',
            message: `Span: ${name}`,
            span: {
              name,
              duration,
              attributes: { ...span.attributes, ...endAttributes },
            },
          })
        }
        return Effect.void
      },
    }
  }

  pretty(): Logger {
    // Return a new logger with pretty printing enabled
    // This would modify the transports to use pretty formatters
    return this
  }

  addSerializer(field: string, serializer: (value: any) => any): Logger {
    return new TuixLogger(this.config, this.contextPath, this.metadata, {
      ...this.serializers,
      [field]: serializer,
    })
  }

  level(): LogLevel {
    return this.config.level
  }

  level(level: LogLevel): void {
    this.config.level = level
    this.levelValue = LogLevels[level]
  }

  isLevelEnabled(level: LogLevel): boolean {
    return LogLevels[level] >= this.levelValue
  }

  private serializeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined

    const serialized: Record<string, any> = {}

    for (const [key, value] of Object.entries(metadata)) {
      if (key in this.serializers) {
        serialized[key] = this.serializers[key](value)
      } else {
        serialized[key] = value
      }
    }

    return serialized
  }

  private getSourceInfo(): LogEntry['src'] | undefined {
    // This would use stack trace to get source info
    // For now, returning undefined
    return undefined
  }
}

/**
 * Create a logger service layer
 */
export const makeLoggerLayer = (config: LoggerConfig): Layer.Layer<Logger, never, never> =>
  Layer.succeed(Logger, new TuixLogger(config))

/**
 * Logger queue for async processing
 */
export interface LoggerQueue {
  readonly queue: Queue.Queue<LogEntry>
  readonly processor: Fiber.RuntimeFiber<never, never>
}

export const LoggerQueue = Context.GenericTag<LoggerQueue>('tuix/LoggerQueue')

/**
 * Create a queued logger layer for high-performance async logging
 */
export const makeQueuedLoggerLayer = (
  config: LoggerConfig,
  queueSize: number = 1000
): Layer.Layer<Logger | LoggerQueue, never, never> =>
  Layer.effectDiscard(
    Effect.gen(function* (_) {
      const queue = yield* _(Queue.bounded<LogEntry>(queueSize))

      // Create a logger that writes to the queue
      const queuedLogger = new TuixLogger({
        ...config,
        transports: [
          {
            write: entry => Queue.offer(queue, entry),
          },
        ],
      })

      // Process queue in background
      const processor = yield* _(
        Stream.fromQueue(queue).pipe(
          Stream.tap(entry =>
            Effect.forEach(config.transports, transport => transport.write(entry)).pipe(
              Effect.asVoid
            )
          ),
          Stream.runDrain,
          Effect.fork
        )
      )

      yield* _(Layer.succeed(Logger, queuedLogger))
      yield* _(Layer.succeed(LoggerQueue, { queue, processor }))
    })
  )

/**
 * Global logger instance for convenience
 */
let globalLogger: Logger | null = null

export const setGlobalLogger = (logger: Logger) => {
  globalLogger = logger
}

export const getGlobalLogger = (): Logger => {
  if (!globalLogger) {
    throw new Error('Global logger not initialized. Call setGlobalLogger first.')
  }
  return globalLogger
}

/**
 * Convenience logging functions that use the global logger
 */
export const log = {
  trace: (message: string, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.trace(message, metadata)),

  debug: (message: string, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.debug(message, metadata)),

  info: (message: string, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.info(message, metadata)),

  warn: (message: string, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.warn(message, metadata)),

  error: (message: string, error?: Error, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.error(message, error, metadata)),

  fatal: (message: string, error?: Error, metadata?: Record<string, any>) =>
    Effect.flatMap(Logger, logger => logger.fatal(message, error, metadata)),
}

/**
 * Create a child logger with additional context
 */
export const withLoggerContext =
  (context: string | Record<string, any>) =>
  <R, E, A>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Logger> =>
    Effect.flatMap(Logger, logger =>
      Effect.provide(effect, Layer.succeed(Logger, logger.child(context)))
    )
