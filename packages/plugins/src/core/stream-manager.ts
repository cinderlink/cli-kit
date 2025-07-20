/**
 * Log Stream Manager
 * 
 * This module provides centralized management of log streams with filtering,
 * subscription management, and performance optimization.
 * 
 * @module plugins/core/stream-manager
 */

import { Effect, Stream } from "effect"
import type { LoggingEngine } from './logging-engine'
import type { LogEntry, LogFilter, LogStreamInfo, StreamStats } from './types'
import { StreamLogOutput } from './outputs/stream-output'

/**
 * Centralized log stream manager
 */
export class LogStreamManager {
  private engine: LoggingEngine
  private streamOutput: StreamLogOutput
  private streams: Map<string, Stream.Stream<LogEntry>> = new Map()
  private isInitialized = false
  private streamIdCounter = 0

  constructor(engine: LoggingEngine) {
    this.engine = engine
    this.streamOutput = new StreamLogOutput(engine.getConfig())
  }

  /**
   * Initialize stream manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize stream output
      await this.streamOutput.initialize()
      
      // Add stream output to engine
      await this.engine.addOutput('stream', this.streamOutput)
      
      this.isInitialized = true
      
    } catch (error) {
      throw new Error(`Failed to initialize stream manager: ${error}`)
    }
  }

  /**
   * Destroy stream manager
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // Remove stream output from engine
      await this.engine.removeOutput('stream')
      
      // Destroy stream output
      await this.streamOutput.destroy()
      
      // Clear managed streams
      this.streams.clear()
      
      this.isInitialized = false
      
    } catch (error) {
      throw new Error(`Failed to destroy stream manager: ${error}`)
    }
  }

  // =============================================================================
  // Stream Creation Methods
  // =============================================================================

  /**
   * Create a filtered log stream
   */
  createLogStream(name: string, filter?: LogFilter): Stream.Stream<LogEntry> {
    if (!this.isInitialized) {
      throw new Error('Stream manager not initialized')
    }

    if (this.streams.has(name)) {
      throw new Error(`Stream '${name}' already exists`)
    }

    const stream = this.streamOutput.createStream(name, filter)
    this.streams.set(name, stream)
    
    return stream
  }

  /**
   * Subscribe to logs with optional filtering
   */
  subscribeToLogs(filter?: LogFilter): Stream.Stream<LogEntry> {
    if (!this.isInitialized) {
      throw new Error('Stream manager not initialized')
    }

    return this.streamOutput.subscribeToLogs(filter)
  }

  /**
   * Get global log stream (all entries)
   */
  getGlobalStream(): Stream.Stream<LogEntry> {
    if (!this.isInitialized) {
      throw new Error('Stream manager not initialized')
    }

    return this.streamOutput.getGlobalStream()
  }

  // =============================================================================
  // Convenience Stream Methods
  // =============================================================================

  /**
   * Create stream for specific log level
   */
  createLevelStream(level: string): Stream.Stream<LogEntry> {
    const streamName = `level-${level}`
    return this.createLogStream(streamName, entry => entry.level === level)
  }

  /**
   * Create stream for component logs
   */
  createComponentStream(component: string): Stream.Stream<LogEntry> {
    const streamName = `component-${component}`
    return this.createLogStream(streamName, entry => 
      entry.metadata?.component === component
    )
  }

  /**
   * Create error-only stream
   */
  createErrorStream(): Stream.Stream<LogEntry> {
    return this.createLogStream('errors', entry => 
      entry.level === 'error' || entry.level === 'fatal'
    )
  }

  /**
   * Create debug stream
   */
  createDebugStream(): Stream.Stream<LogEntry> {
    return this.createLevelStream('debug')
  }

  /**
   * Create filtered stream by message content
   */
  createMessageFilterStream(searchTerm: string): Stream.Stream<LogEntry> {
    const streamName = `message-filter-${this.generateStreamId()}`
    const filter = (entry: LogEntry) => 
      entry.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    return this.createLogStream(streamName, filter)
  }

  /**
   * Create filtered stream by metadata
   */
  createMetadataFilterStream(key: string, value: unknown): Stream.Stream<LogEntry> {
    const streamName = `metadata-filter-${this.generateStreamId()}`
    const filter = (entry: LogEntry) => entry.metadata[key] === value
    
    return this.createLogStream(streamName, filter)
  }

  /**
   * Create time-windowed stream
   */
  createTimeWindowStream(startTime: Date, endTime?: Date): Stream.Stream<LogEntry> {
    const streamName = `time-window-${this.generateStreamId()}`
    const filter = (entry: LogEntry) => {
      const entryTime = entry.timestamp.getTime()
      const start = startTime.getTime()
      const end = endTime ? endTime.getTime() : Date.now()
      return entryTime >= start && entryTime <= end
    }
    
    return this.createLogStream(streamName, filter)
  }

  // =============================================================================
  // Advanced Stream Operations
  // =============================================================================

  /**
   * Create buffered stream with backpressure handling
   */
  createBufferedStream(name: string, bufferSize = 1000): Stream.Stream<LogEntry> {
    const baseStream = this.getGlobalStream()
    
    return Stream.buffer(baseStream, {
      capacity: bufferSize,
      strategy: "dropping"
    })
  }

  /**
   * Create throttled stream
   */
  createThrottledStream(name: string, intervalMs = 1000): Stream.Stream<LogEntry> {
    const baseStream = this.getGlobalStream()
    
    return Stream.throttle(baseStream, {
      cost: () => 1,
      maximum: 1,
      duration: `${intervalMs} millis`
    })
  }

  /**
   * Create debounced stream
   */
  createDebouncedStream(name: string, delayMs = 500): Stream.Stream<LogEntry> {
    const baseStream = this.getGlobalStream()
    
    return Stream.debounce(baseStream, `${delayMs} millis`)
  }

  /**
   * Create aggregated stream (collect entries over time window)
   */
  createAggregatedStream(name: string, windowMs = 5000): Stream.Stream<LogEntry[]> {
    const baseStream = this.getGlobalStream()
    
    return Stream.groupedWithin(baseStream, 100, `${windowMs} millis`)
  }

  // =============================================================================
  // Stream Management
  // =============================================================================

  /**
   * Remove a managed stream
   */
  removeStream(name: string): void {
    this.streams.delete(name)
    this.streamOutput.removeStream(name)
  }

  /**
   * Get stream by name
   */
  getStream(name: string): Stream.Stream<LogEntry> | undefined {
    return this.streams.get(name)
  }

  /**
   * Get all managed stream names
   */
  getStreamNames(): string[] {
    return Array.from(this.streams.keys())
  }

  /**
   * Check if stream exists
   */
  hasStream(name: string): boolean {
    return this.streams.has(name)
  }

  /**
   * Clear all managed streams
   */
  clearStreams(): void {
    for (const name of this.streams.keys()) {
      this.removeStream(name)
    }
  }

  // =============================================================================
  // Statistics and Monitoring
  // =============================================================================

  /**
   * Get stream statistics
   */
  getStreamStats(): StreamStats {
    return this.streamOutput.getStreamStats()
  }

  /**
   * Get detailed stream information
   */
  getStreamsInfo(): LogStreamInfo[] {
    return this.streamOutput.getStreamsInfo()
  }

  /**
   * Get manager statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      managedStreams: this.streams.size,
      streamNames: Array.from(this.streams.keys()),
      outputStats: this.streamOutput.getStats(),
      streamStats: this.getStreamStats(),
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Generate unique stream ID
   */
  private generateStreamId(): string {
    return `${++this.streamIdCounter}-${Date.now()}`
  }

  /**
   * Create composite filter from multiple filters
   */
  createCompositeFilter(...filters: LogFilter[]): LogFilter {
    return (entry: LogEntry) => filters.every(filter => filter(entry))
  }

  /**
   * Create OR filter from multiple filters
   */
  createOrFilter(...filters: LogFilter[]): LogFilter {
    return (entry: LogEntry) => filters.some(filter => filter(entry))
  }

  /**
   * Create NOT filter (inverts filter result)
   */
  createNotFilter(filter: LogFilter): LogFilter {
    return (entry: LogEntry) => !filter(entry)
  }

  /**
   * Get engine configuration
   */
  private getEngineConfig() {
    return this.engine.getStats()
  }
}