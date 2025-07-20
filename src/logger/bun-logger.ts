/**
 * Bun-native Logger with Effect.ts integration
 * 
 * High-performance logging using Bun's native capabilities and Effect patterns
 */

import { Effect, Stream, Queue, Layer, Context, Ref } from "effect"
import type { LogEntry, LogLevel, LogTransport } from "./types"
import { LogLevels } from "./types"
import { createBunTransport } from "./bun-transports"

// Logger service interface
export interface BunLogger {
  readonly debug: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void>
  readonly info: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void>
  readonly warn: (message: string, metadata?: Record<string, unknown>) => Effect.Effect<void>
  readonly error: (message: string, error?: Error, metadata?: Record<string, unknown>) => Effect.Effect<void>
  readonly child: (namespace: string) => BunLogger
  readonly addTransport: (transport: LogTransport) => Effect.Effect<void>
  readonly removeTransport: (transport: LogTransport) => Effect.Effect<void>
  readonly setLevel: (level: LogLevel) => Effect.Effect<void>
  readonly flush: () => Effect.Effect<void>
  readonly close: () => Effect.Effect<void>
}

// Logger context tag
export const BunLogger = Context.GenericTag<BunLogger>("@tuix/logger/BunLogger")

// Internal logger state
interface LoggerState {
  transports: Set<LogTransport>
  level: LogLevel
  namespace?: string
  queue: Queue.Queue<LogEntry>
  isProcessing: boolean
}

// Create logger implementation
const createBunLoggerImpl = (
  initialTransports: LogTransport[] = [],
  initialLevel: LogLevel = 'info',
  namespace?: string
): Effect.Effect<BunLogger> =>
  Effect.gen(function* (_) {
    // Initialize logger state
    const queue = yield* _(Queue.bounded<LogEntry>(10000))
    const stateRef = yield* _(Ref.make<LoggerState>({
      transports: new Set(initialTransports),
      level: initialLevel,
      namespace,
      queue,
      isProcessing: false
    }))

    // Start log processor
    yield* _(startLogProcessor(stateRef))

    // Logger implementation
    const logger: BunLogger = {
      debug: (message: string, metadata?: Record<string, unknown>) =>
        log('debug', message, undefined, metadata, stateRef),
      
      info: (message: string, metadata?: Record<string, unknown>) =>
        log('info', message, undefined, metadata, stateRef),
      
      warn: (message: string, metadata?: Record<string, unknown>) =>
        log('warn', message, undefined, metadata, stateRef),
      
      error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
        log('error', message, error, metadata, stateRef),
      
      child: (childNamespace: string) => {
        const fullNamespace = namespace ? `${namespace}:${childNamespace}` : childNamespace
        return Effect.runSync(createBunLoggerImpl(initialTransports, initialLevel, fullNamespace))
      },
      
      addTransport: (transport: LogTransport) =>
        Ref.update(stateRef, state => ({
          ...state,
          transports: new Set([...state.transports, transport])
        })),
      
      removeTransport: (transport: LogTransport) =>
        Ref.update(stateRef, state => {
          const newTransports = new Set(state.transports)
          newTransports.delete(transport)
          return { ...state, transports: newTransports }
        }),
      
      setLevel: (level: LogLevel) =>
        Ref.update(stateRef, state => ({ ...state, level })),
      
      flush: () => flushLogs(stateRef),
      
      close: () => closeLogs(stateRef)
    }

    return logger
  })

// Log processing with Effect streams
const startLogProcessor = (stateRef: Ref.Ref<LoggerState>): Effect.Effect<void> =>
  Effect.gen(function* (_) {
    const state = yield* _(Ref.get(stateRef))
    
    // Only start processor once
    if (state.isProcessing) return
    
    yield* _(Ref.update(stateRef, s => ({ ...s, isProcessing: true })))
    
    // Create log stream from queue
    const logStream = Stream.fromQueue(state.queue)
    
    // Process logs in batches for better performance
    const batchedStream = Stream.chunks(
      Stream.buffer(logStream, { capacity: 100, strategy: 'dropping' })
    )
    
    // Start processing fiber
    yield* _(Effect.fork(
      Stream.runForEach(batchedStream, (chunk) =>
        Effect.gen(function* (_) {
          const currentState = yield* _(Ref.get(stateRef))
          const entries = chunk.toArray()
          
          // Send to all transports in parallel
          yield* _(Effect.all(
            Array.from(currentState.transports).map(transport =>
              Effect.all(
                entries.map(entry => Effect.promise(() => transport.write(entry))),
                { concurrency: 'unbounded' }
              )
            ),
            { concurrency: 'unbounded' }
          ))
        })
      )
    ))
  })

// Core logging function
const log = (
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: Record<string, unknown>,
  stateRef?: Ref.Ref<LoggerState>
): Effect.Effect<void> =>
  Effect.gen(function* (_) {
    if (!stateRef) return
    
    const state = yield* _(Ref.get(stateRef))
    
    // Check if we should log this level
    if (LogLevels[level] < LogLevels[state.level]) return
    
    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      namespace: state.namespace,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      metadata: metadata || {},
      pid: process.pid
    }
    
    // Add to queue
    yield* _(Queue.offer(state.queue, entry))
  })

// Flush all pending logs
const flushLogs = (stateRef: Ref.Ref<LoggerState>): Effect.Effect<void> =>
  Effect.gen(function* (_) {
    const state = yield* _(Ref.get(stateRef))
    
    // Process remaining items in queue
    const remaining = yield* _(Queue.takeAll(state.queue))
    
    if (remaining.length === 0) return
    
    // Send to all transports
    yield* _(Effect.all(
      Array.from(state.transports).map(transport =>
        Effect.all(
          remaining.map(entry => Effect.promise(() => transport.write(entry))),
          { concurrency: 'unbounded' }
        )
      ),
      { concurrency: 'unbounded' }
    ))
  })

// Close logger and cleanup resources
const closeLogs = (stateRef: Ref.Ref<LoggerState>): Effect.Effect<void> =>
  Effect.gen(function* (_) {
    // Flush remaining logs
    yield* _(flushLogs(stateRef))
    
    const state = yield* _(Ref.get(stateRef))
    
    // Close all transports that support it
    yield* _(Effect.all(
      Array.from(state.transports).map(transport => {
        if ('close' in transport && typeof transport.close === 'function') {
          return Effect.promise(() => transport.close())
        }
        return Effect.void
      }),
      { concurrency: 'unbounded' }
    ))
    
    // Mark as not processing
    yield* _(Ref.update(stateRef, s => ({ ...s, isProcessing: false })))
  })

// Create development logger with Bun-optimized defaults
export const createBunDevelopmentLogger = (
  namespace?: string,
  level: LogLevel = 'info'
): Layer.Layer<BunLogger> =>
  Layer.effect(
    BunLogger,
    Effect.gen(function* (_) {
      const consoleTransport = createBunTransport('console', {
        colorize: true,
        showEmoji: true,
        prettyPrint: true
      })
      
      const fileTransport = createBunTransport('file', {
        filename: `${namespace || 'app'}.log`,
        dirname: '.tuix/logs',
        maxSize: 10, // 10MB
        maxFiles: 5,
        compress: true
      })
      
      return yield* _(createBunLoggerImpl([consoleTransport, fileTransport], level, namespace))
    })
  )

// Create production logger with optimized settings
export const createBunProductionLogger = (
  namespace?: string,
  level: LogLevel = 'warn'
): Layer.Layer<BunLogger> =>
  Layer.effect(
    BunLogger,
    Effect.gen(function* (_) {
      const fileTransport = createBunTransport('file', {
        filename: `${namespace || 'app'}.log`,
        dirname: '/var/log/tuix',
        maxSize: 50, // 50MB
        maxFiles: 10,
        compress: true
      })
      
      return yield* _(createBunLoggerImpl([fileTransport], level, namespace))
    })
  )

// Create console-only logger for testing
export const createBunConsoleLogger = (
  namespace?: string,
  level: LogLevel = 'debug'
): Layer.Layer<BunLogger> =>
  Layer.effect(
    BunLogger,
    Effect.gen(function* (_) {
      const consoleTransport = createBunTransport('console', {
        colorize: true,
        showEmoji: true,
        prettyPrint: true
      })
      
      return yield* _(createBunLoggerImpl([consoleTransport], level, namespace))
    })
  )