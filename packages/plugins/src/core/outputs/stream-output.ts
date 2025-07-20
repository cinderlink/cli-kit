/**
 * Stream Log Output
 * 
 * This module provides real-time streaming output for logs with filtering,
 * backpressure handling, and subscriber management.
 * 
 * @module plugins/core/outputs/stream-output
 */

import { Effect, Stream } from "effect"
import type { LogOutput, LogEntry, LoggerConfig, LogFilter, LogStreamInfo, StreamStats } from '../types'
import { StreamAnalyticsTracker } from '../stream-analytics'

/**
 * Individual log stream with filtering capabilities
 */
class LogStream {
  private subscribers: Set<(entry: LogEntry) => void> = new Set()
  private buffer: LogEntry[] = []
  private isActive = true
  private maxBufferSize: number
  private createdAt = new Date()
  private analytics: StreamAnalyticsTracker

  constructor(
    public readonly name: string,
    private filterFn?: LogFilter,
    bufferSize = 1000
  ) {
    this.maxBufferSize = bufferSize
    this.analytics = new StreamAnalyticsTracker(name)
  }

  /**
   * Emit log entry to subscribers
   */
  emit(entry: LogEntry): void {
    const startTime = performance.now()
    
    if (!this.isActive) {
      return
    }

    // Apply filter if configured
    if (this.filterFn && !this.filterFn(entry)) {
      return
    }

    // Update analytics
    this.analytics.updateSubscriberCount(this.subscribers.size)

    // Add to buffer if no active subscribers
    if (this.subscribers.size === 0) {
      this.addToBuffer(entry)
      this.analytics.recordEntry(entry, performance.now() - startTime)
      return
    }

    // Emit to all subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(entry)
      } catch (error) {
        console.error(`Stream ${this.name} subscriber error:`, error)
        this.analytics.recordDroppedEntry()
      }
    }
    
    // Record processing latency
    this.analytics.recordEntry(entry, performance.now() - startTime)
  }

  /**
   * Subscribe to stream
   */
  subscribe(callback: (entry: LogEntry) => void): () => void {
    if (!this.isActive) {
      throw new Error(`Stream ${this.name} is not active`)
    }

    // Send buffered entries to new subscriber
    for (const entry of this.buffer) {
      try {
        callback(entry)
      } catch (error) {
        console.error(`New subscriber callback error:`, error)
      }
    }
    
    // Clear buffer once delivered
    this.buffer = []
    
    this.subscribers.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    this.isActive = false
    this.subscribers.clear()
    this.buffer = []
  }

  /**
   * Check if stream matches filter
   */
  filter(entry: LogEntry): boolean {
    return !this.filterFn || this.filterFn(entry)
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry)
    
    // Maintain buffer size limit
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift() // Remove oldest entry
    }
  }

  /**
   * Get stream information
   */
  getInfo(): LogStreamInfo {
    return {
      name: this.name,
      filter: this.filterFn,
      subscriberCount: this.subscribers.size,
      isActive: this.isActive,
      createdAt: this.createdAt,
    }
  }
  
  /**
   * Get stream analytics
   */
  getAnalytics() {
    return this.analytics.getAnalytics()
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      name: this.name,
      isActive: this.isActive,
      subscriberCount: this.subscribers.size,
      bufferSize: this.buffer.length,
      maxBufferSize: this.maxBufferSize,
      createdAt: this.createdAt,
      hasFilter: !!this.filterFn,
    }
  }
}

/**
 * Stream output implementation for real-time log distribution
 */
export class StreamLogOutput implements LogOutput {
  private config: LoggerConfig
  private streams: Map<string, LogStream> = new Map()
  private globalSubscribers: Set<(entry: LogEntry) => void> = new Set()
  private isInitialized = false
  private messagesSent = 0
  private messagesBuffered = 0

  constructor(config: LoggerConfig) {
    this.config = config
  }

  /**
   * Initialize stream output
   */
  async initialize(): Promise<void> {
    this.isInitialized = true
  }

  /**
   * Write log entry to all streams
   */
  write(entry: LogEntry): void {
    if (!this.isInitialized) {
      return
    }

    try {
      // Emit to global subscribers
      for (const subscriber of this.globalSubscribers) {
        try {
          subscriber(entry)
          this.messagesSent++
        } catch (error) {
          console.error('Global subscriber error:', error)
        }
      }

      // Emit to filtered streams
      for (const stream of this.streams.values()) {
        if (stream.filter(entry)) {
          stream.emit(entry)
          this.messagesSent++
        }
      }
      
    } catch (error) {
      console.error('Stream output error:', error)
    }
  }

  /**
   * Check if entry should be streamed
   */
  shouldLog(entry: LogEntry): boolean {
    // Only log if there are active streams or subscribers
    return this.globalSubscribers.size > 0 || this.streams.size > 0
  }

  /**
   * Cleanup stream output
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    // Close all streams
    for (const stream of this.streams.values()) {
      stream.close()
    }
    this.streams.clear()
    
    // Clear global subscribers
    this.globalSubscribers.clear()
    
    this.isInitialized = false
  }

  // =============================================================================
  // Stream Management
  // =============================================================================

  /**
   * Create a named stream with optional filter
   */
  createStream(name: string, filter?: LogFilter): Stream.Stream<LogEntry> {
    if (this.streams.has(name)) {
      throw new Error(`Stream '${name}' already exists`)
    }

    const bufferSize = this.config.stream?.bufferSize ?? 1000
    const logStream = new LogStream(name, filter, bufferSize)
    this.streams.set(name, logStream)

    return Stream.async<LogEntry>((emit) => {
      const unsubscribe = logStream.subscribe((entry) => {
        emit.single(entry)
      })

      return Effect.sync(() => {
        unsubscribe()
      })
    })
  }

  /**
   * Remove a named stream
   */
  removeStream(name: string): void {
    const stream = this.streams.get(name)
    if (stream) {
      stream.close()
      this.streams.delete(name)
    }
  }

  /**
   * Get global stream (all log entries)
   */
  getGlobalStream(): Stream.Stream<LogEntry> {
    return Stream.async<LogEntry>((emit) => {
      const subscriber = (entry: LogEntry) => {
        emit.single(entry)
      }

      this.globalSubscribers.add(subscriber)

      return Effect.sync(() => {
        this.globalSubscribers.delete(subscriber)
      })
    })
  }

  /**
   * Subscribe to all logs with optional filter
   */
  subscribeToLogs(filter?: LogFilter): Stream.Stream<LogEntry> {
    return Stream.async<LogEntry>((emit) => {
      const subscriber = (entry: LogEntry) => {
        if (!filter || filter(entry)) {
          emit.single(entry)
        }
      }

      this.globalSubscribers.add(subscriber)

      return Effect.sync(() => {
        this.globalSubscribers.delete(subscriber)
      })
    })
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Get stream by name
   */
  getStream(name: string): LogStream | undefined {
    return this.streams.get(name)
  }

  /**
   * Get all stream names
   */
  getStreamNames(): string[] {
    return Array.from(this.streams.keys())
  }

  /**
   * Get stream statistics
   */
  getStreamStats(): StreamStats {
    const totalSubscribers = Array.from(this.streams.values())
      .reduce((total, stream) => total + stream.getStats().subscriberCount, 0)
      + this.globalSubscribers.size

    return {
      activeStreams: this.streams.size,
      streamNames: Array.from(this.streams.keys()),
      totalSubscribers,
      messagesSent: this.messagesSent,
      messagesBuffered: this.messagesBuffered,
    }
  }

  /**
   * Get detailed stream information
   */
  getStreamsInfo(): LogStreamInfo[] {
    return Array.from(this.streams.values()).map(stream => stream.getInfo())
  }

  /**
   * Create convenience streams
   */
  createLevelStream(level: string): Stream.Stream<LogEntry> {
    return this.createStream(`level-${level}`, entry => entry.level === level)
  }

  createErrorStream(): Stream.Stream<LogEntry> {
    return this.createStream('errors', entry => 
      entry.level === 'error' || entry.level === 'fatal'
    )
  }

  createComponentStream(component: string): Stream.Stream<LogEntry> {
    return this.createStream(`component-${component}`, entry => 
      entry.metadata?.component === component
    )
  }

  /**
   * Create buffered stream with backpressure handling
   */
  createBufferedStream(name: string, bufferSize = 1000): Stream.Stream<LogEntry> {
    const baseStream = this.getGlobalStream()
    
    return Stream.buffer(baseStream, {
      capacity: bufferSize,
      strategy: "dropping" // Drop oldest when buffer is full
    })
  }

  /**
   * Get output statistics
   */
  getStats() {
    return {
      type: 'stream',
      isInitialized: this.isInitialized,
      activeStreams: this.streams.size,
      globalSubscribers: this.globalSubscribers.size,
      messagesSent: this.messagesSent,
      messagesBuffered: this.messagesBuffered,
      streamStats: this.getStreamStats(),
      streamsInfo: this.getStreamsInfo(),
    }
  }
}