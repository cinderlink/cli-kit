/**
 * Log Stream Manager - Handles real-time log streaming with buffer management
 * 
 * @module @tuix/components/display/log-stream
 */

import { Effect, Stream, Ref, Clock, Schedule } from "effect"
import type { LogEntry } from "./types"

/**
 * Configuration for log streaming
 */
export interface LogStreamConfig {
  maxBufferSize: number
  batchSize: number
  batchInterval: number // milliseconds
  maxMemoryUsage: number // bytes
  enableBackpressure: boolean
}

/**
 * Statistics about the log stream
 */
export interface LogStreamStats {
  totalLogs: number
  logsPerSecond: number
  memoryUsage: number
  droppedLogs: number
  bufferUtilization: number
}

/**
 * Circular buffer implementation for efficient log storage
 */
export class CircularLogBuffer {
  private items: LogEntry[] = []
  private writeIndex = 0
  private maxSize: number
  private droppedCount = 0

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  append(entry: LogEntry): boolean {
    if (this.items.length < this.maxSize) {
      this.items.push(entry)
      return true
    } else {
      this.items[this.writeIndex] = entry
      this.writeIndex = (this.writeIndex + 1) % this.maxSize
      this.droppedCount++
      return false
    }
  }

  appendBatch(entries: LogEntry[]): number {
    let appended = 0
    for (const entry of entries) {
      if (this.append(entry)) {
        appended++
      }
    }
    return appended
  }

  toArray(): LogEntry[] {
    if (this.items.length < this.maxSize) {
      return [...this.items]
    }
    
    // Reorder to get chronological order when buffer is full
    return [
      ...this.items.slice(this.writeIndex),
      ...this.items.slice(0, this.writeIndex)
    ]
  }

  getRecent(count: number): LogEntry[] {
    const all = this.toArray()
    return all.slice(-count)
  }

  clear(): void {
    this.items = []
    this.writeIndex = 0
    this.droppedCount = 0
  }

  get length(): number {
    return this.items.length
  }

  get dropped(): number {
    return this.droppedCount
  }

  get utilization(): number {
    return this.items.length / this.maxSize
  }

  last(): LogEntry | undefined {
    if (this.items.length === 0) return undefined
    
    if (this.items.length < this.maxSize) {
      return this.items[this.items.length - 1]
    }
    
    const lastIndex = this.writeIndex === 0 ? this.maxSize - 1 : this.writeIndex - 1
    return this.items[lastIndex]
  }
}

/**
 * Log rotation detection
 */
export class LogRotationDetector {
  private lastTimestamp?: Date
  private sequenceGaps = 0
  private readonly maxGaps = 5

  detectRotation(entry: LogEntry): boolean {
    if (!this.lastTimestamp) {
      this.lastTimestamp = entry.timestamp
      return false
    }

    // Check if timestamp goes backwards significantly
    const timeDiff = entry.timestamp.getTime() - this.lastTimestamp.getTime()
    if (timeDiff < -1000) { // More than 1 second backwards
      this.sequenceGaps++
      if (this.sequenceGaps >= this.maxGaps) {
        this.sequenceGaps = 0
        this.lastTimestamp = entry.timestamp
        return true
      }
    } else {
      this.sequenceGaps = 0
    }

    this.lastTimestamp = entry.timestamp
    return false
  }

  reset(): void {
    this.lastTimestamp = undefined
    this.sequenceGaps = 0
  }
}

/**
 * Backpressure controller for high-frequency streams
 */
export class BackpressureController {
  private readonly maxLogsPerSecond: number
  private readonly windowSize = 1000 // 1 second window
  private recentLogs: number[] = []

  constructor(maxLogsPerSecond: number = 1000) {
    this.maxLogsPerSecond = maxLogsPerSecond
  }

  shouldDrop(): boolean {
    const now = Date.now()
    
    // Remove old entries outside the window
    this.recentLogs = this.recentLogs.filter(timestamp => 
      now - timestamp < this.windowSize
    )

    // Check if we're over the limit
    if (this.recentLogs.length >= this.maxLogsPerSecond) {
      return true
    }

    this.recentLogs.push(now)
    return false
  }

  getRate(): number {
    const now = Date.now()
    const recentCount = this.recentLogs.filter(timestamp => 
      now - timestamp < this.windowSize
    ).length
    
    return recentCount
  }
}

/**
 * Log stream manager that handles real-time streaming with efficient buffering
 */
export class LogStreamManager {
  private buffer: CircularLogBuffer
  private config: LogStreamConfig
  private rotationDetector: LogRotationDetector
  private backpressureController: BackpressureController
  private stats: Ref.Ref<LogStreamStats>
  private statsUpdateSchedule: Schedule.Schedule<void, never, never>

  constructor(config: Partial<LogStreamConfig> = {}) {
    this.config = {
      maxBufferSize: 10000,
      batchSize: 100,
      batchInterval: 100,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      enableBackpressure: true,
      ...config
    }

    this.buffer = new CircularLogBuffer(this.config.maxBufferSize)
    this.rotationDetector = new LogRotationDetector()
    this.backpressureController = new BackpressureController()
    
    this.stats = Ref.unsafeMake({
      totalLogs: 0,
      logsPerSecond: 0,
      memoryUsage: 0,
      droppedLogs: 0,
      bufferUtilization: 0
    })

    // Update stats every second
    this.statsUpdateSchedule = Schedule.fixed(1000)
  }

  /**
   * Connect to a log stream and process entries
   */
  connectStream<E, R>(
    stream: Stream.Stream<LogEntry[], E, R>,
    onUpdate?: (logs: LogEntry[]) => void
  ): Effect.Effect<void, E, R> {
    return Effect.gen(this, function* () {
      const statsEffect = this.startStatsUpdater()
      
      const streamEffect = Stream.runForEach(stream, (logBatch) =>
        Effect.gen(this, function* () {
          const processedLogs = yield* this.processBatch(logBatch)
          
          if (onUpdate && processedLogs.length > 0) {
            onUpdate(processedLogs)
          }
        })
      )

      // Run both effects concurrently
      yield* Effect.race(statsEffect, streamEffect)
    })
  }

  /**
   * Process a batch of log entries
   */
  private processBatch(entries: LogEntry[]): Effect.Effect<LogEntry[], never, never> {
    return Effect.gen(this, function* () {
      const processedEntries: LogEntry[] = []

      for (const entry of entries) {
        // Check for log rotation
        if (this.rotationDetector.detectRotation(entry)) {
          yield* Effect.log("Log rotation detected, clearing buffer")
          this.buffer.clear()
        }

        // Apply backpressure if enabled
        if (this.config.enableBackpressure && this.backpressureController.shouldDrop()) {
          yield* this.updateStats(stats => ({
            ...stats,
            droppedLogs: stats.droppedLogs + 1
          }))
          continue
        }

        // Check memory usage
        const memoryUsage = yield* this.estimateMemoryUsage()
        if (memoryUsage > this.config.maxMemoryUsage) {
          yield* Effect.log(`Memory usage ${memoryUsage} exceeds limit ${this.config.maxMemoryUsage}, dropping log`)
          yield* this.updateStats(stats => ({
            ...stats,
            droppedLogs: stats.droppedLogs + 1
          }))
          continue
        }

        // Add to buffer
        const added = this.buffer.append(entry)
        if (added) {
          processedEntries.push(entry)
        }

        // Update stats
        yield* this.updateStats(stats => ({
          ...stats,
          totalLogs: stats.totalLogs + 1,
          bufferUtilization: this.buffer.utilization
        }))
      }

      return processedEntries
    })
  }

  /**
   * Get all logs from buffer
   */
  getAllLogs(): Effect.Effect<LogEntry[], never, never> {
    return Effect.succeed(this.buffer.toArray())
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number): Effect.Effect<LogEntry[], never, never> {
    return Effect.succeed(this.buffer.getRecent(count))
  }

  /**
   * Clear the buffer
   */
  clear(): Effect.Effect<void, never, never> {
    return Effect.gen(this, function* () {
      this.buffer.clear()
      this.rotationDetector.reset()
      
      yield* this.updateStats(stats => ({
        ...stats,
        totalLogs: 0,
        bufferUtilization: 0
      }))
    })
  }

  /**
   * Get current statistics
   */
  getStats(): Effect.Effect<LogStreamStats, never, never> {
    return Ref.get(this.stats)
  }

  /**
   * Estimate memory usage of the buffer
   */
  private estimateMemoryUsage(): Effect.Effect<number, never, never> {
    return Effect.gen(this, function* () {
      // Rough estimation: each log entry ~200 bytes on average
      const avgLogSize = 200
      const estimatedSize = this.buffer.length * avgLogSize
      
      yield* this.updateStats(stats => ({
        ...stats,
        memoryUsage: estimatedSize
      }))
      
      return estimatedSize
    })
  }

  /**
   * Update statistics
   */
  private updateStats(
    fn: (stats: LogStreamStats) => LogStreamStats
  ): Effect.Effect<void, never, never> {
    return Ref.update(this.stats, fn)
  }

  /**
   * Start the statistics updater
   */
  private startStatsUpdater(): Effect.Effect<void, never, never> {
    return Effect.gen(this, function* () {
      yield* Effect.schedule(
        Effect.gen(this, function* () {
          const logsPerSecond = this.backpressureController.getRate()
          
          yield* this.updateStats(stats => ({
            ...stats,
            logsPerSecond
          }))
        }),
        this.statsUpdateSchedule
      )
    })
  }

  /**
   * Create a stream from a file (tail -f like behavior)
   */
  static fromFile(filePath: string): Stream.Stream<LogEntry[], Error, never> {
    return Stream.async<LogEntry[], Error>((emit) => {
      // This would be implemented with file watching
      // For now, we'll return an empty stream
      return Effect.gen(function* () {
        yield* Effect.log(`Watching file: ${filePath}`)
        // Implementation would use file system watchers
        // and parse log lines into LogEntry objects
      })
    })
  }

  /**
   * Create a stream from a WebSocket
   */
  static fromWebSocket(url: string): Stream.Stream<LogEntry[], Error, never> {
    return Stream.async<LogEntry[], Error>((emit) => {
      return Effect.gen(function* () {
        yield* Effect.log(`Connecting to WebSocket: ${url}`)
        // Implementation would connect to WebSocket
        // and parse incoming messages into LogEntry objects
      })
    })
  }

  /**
   * Create a test stream with generated log entries
   */
  static createTestStream(
    entriesPerSecond: number = 10,
    duration: number = 60000
  ): Stream.Stream<LogEntry[], never, never> {
    const interval = 1000 / entriesPerSecond
    
    return Stream.takeUntil(
      Stream.repeatEffectWithSchedule(
        Effect.gen(function* () {
          const levels = ['trace', 'debug', 'info', 'warn', 'error'] as const
          const messages = [
            'Application started successfully',
            'Processing user request',
            'Database connection established',
            'Cache miss for key: user_123',
            'API request completed',
            'Background job scheduled',
            'Memory usage: 75%',
            'File uploaded successfully',
            'User authentication failed',
            'Service health check passed'
          ]

          const entry: LogEntry = {
            level: levels[Math.floor(Math.random() * levels.length)],
            message: messages[Math.floor(Math.random() * messages.length)],
            timestamp: new Date(),
            metadata: {
              requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
              userId: Math.floor(Math.random() * 1000)
            }
          }

          return [entry]
        }),
        Schedule.fixed(interval)
      ),
      Clock.currentTimeMillis.pipe(
        Effect.map(start => 
          Clock.currentTimeMillis.pipe(
            Effect.map(now => now - start > duration)
          )
        ),
        Effect.flatten
      )
    )
  }
}

/**
 * Create a log stream manager with default configuration
 */
export function createLogStreamManager(config?: Partial<LogStreamConfig>): LogStreamManager {
  return new LogStreamManager(config)
}