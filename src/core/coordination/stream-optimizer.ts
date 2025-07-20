/**
 * Event Stream Optimizer - Performance optimization for event streams
 * 
 * Provides stream optimization techniques including buffering, batching,
 * throttling, deduplication, and smart filtering for high-frequency events.
 */

import { Stream, Effect, Queue, Duration, Option, Chunk, Schedule } from 'effect'
import { EventBus, BaseEvent } from '../event-bus'

/**
 * Stream optimization error
 */
export class StreamOptimizationError {
  readonly _tag = 'StreamOptimizationError'
  constructor(
    readonly message: string,
    readonly channel?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * UI update event interface
 */
export interface UIUpdateEvent extends BaseEvent {
  readonly type: 'ui-update'
  readonly componentId?: string
  readonly updateType: 'state' | 'props' | 'style'
  readonly payload: unknown
}

/**
 * Relevance criteria for event filtering
 */
export interface RelevanceCriteria<T extends BaseEvent> {
  filter?: (event: T) => boolean
  maxAge?: Duration.Duration
  priority?: 'low' | 'medium' | 'high'
}

/**
 * Event Stream Optimizer implementation
 */
export class EventStreamOptimizer {
  private bufferSizes = new Map<string, number>()
  private rateLimits = new Map<string, number>()
  private lastEventCache = new Map<string, BaseEvent>()
  private eventBus: EventBus
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }
  
  /**
   * Subscribe to event channel and return stream
   */
  private subscribe<T extends BaseEvent>(channel: string): Stream<T, never> {
    return Stream.asyncEffect<T, never>((emit) => 
      this.eventBus.subscribe<T>(channel, (event) => 
        Effect.sync(() => emit(Effect.succeed(Chunk.of(event))))
      ).pipe(
        Effect.map(unsubscribe => () => Effect.runSync(unsubscribe()))
      )
    )
  }
  
  /**
   * Optimize high-frequency event streams (e.g., process output)
   */
  optimizeProcessOutputStreams(channel: string = 'process-output'): Stream<BaseEvent, never> {
    return this.subscribe<BaseEvent>(channel).pipe(
      // Buffer output events to reduce frequency
      Stream.buffer({ capacity: 50 }),
      
      // Batch by time window
      Stream.groupedWithin(100, Duration.millis(100)),
      
      // Flatten batched events
      Stream.flatMap(chunk => Stream.fromIterable(chunk)),
      
      // Rate limit to prevent overwhelming consumers
      Stream.throttle({ cost: 1, duration: Duration.millis(10), units: 1 })
    )
  }
  
  /**
   * Optimize CLI command events with deduplication
   */
  optimizeCLICommandStreams(channel: string = 'cli-command'): Stream<BaseEvent, never> {
    return this.subscribe<BaseEvent>(channel).pipe(
      // Debounce rapid successive events
      Stream.debounce(Duration.millis(50)),
      
      // Filter out redundant events
      Stream.filterMap(event => {
        if (this.isRedundantEvent(event)) {
          return Option.none()
        }
        this.lastEventCache.set(`${channel}:${event.type}`, event)
        return Option.some(event)
      })
    )
  }
  
  /**
   * Optimize UI update events with smart batching
   */
  optimizeUIUpdateStreams(channel: string = 'ui-update'): Stream<UIUpdateEvent, never> {
    return this.subscribe<UIUpdateEvent>(channel).pipe(
      // Group by component ID
      Stream.groupBy(event => event.componentId || 'global', { bufferSize: 100 }),
      
      // For each group, apply batching
      Stream.flatMap(([componentId, stream]) =>
        stream.pipe(
          // Batch updates within animation frame (16ms)
          Stream.groupedWithin(10, Duration.millis(16)),
          // Merge batched updates
          Stream.map(chunk => this.mergeBatchedUIUpdates(componentId, Array.from(chunk)))
        )
      )
    )
  }
  
  /**
   * Create relevance-filtered event stream
   */
  createRelevantEventStream<T extends BaseEvent>(
    channel: string,
    relevanceCriteria: RelevanceCriteria<T>
  ): Stream<T, never> {
    const maxAge = relevanceCriteria.maxAge || Duration.hours(1)
    
    return this.subscribe<T>(channel).pipe(
      // Filter by relevance
      Stream.filter(event => this.isEventRelevant(event, relevanceCriteria)),
      
      // Stop after max age
      Stream.takeUntil(
        Stream.fromEffect(
          Effect.sleep(maxAge)
        )
      )
    )
  }
  
  /**
   * Create windowed event stream for analytics
   */
  createWindowedEventStream<T extends BaseEvent>(
    channel: string,
    windowSize: Duration.Duration
  ): Stream<Chunk.Chunk<T>, never> {
    return this.subscribe<T>(channel).pipe(
      Stream.groupedWithin(1000, windowSize)
    )
  }
  
  /**
   * Create sampled event stream for monitoring
   */
  createSampledEventStream<T extends BaseEvent>(
    channel: string,
    sampleRate: number // 0.0 to 1.0
  ): Stream<T, never> {
    return this.subscribe<T>(channel).pipe(
      Stream.filter(() => Math.random() < sampleRate)
    )
  }
  
  /**
   * Create priority-filtered event stream
   */
  createPriorityEventStream<T extends BaseEvent>(
    channels: Array<{ channel: string; priority: number }>
  ): Stream<T, never> {
    // Higher priority channels get more throughput
    const streams = channels.map(({ channel, priority }) =>
      this.subscribe<T>(channel).pipe(
        Stream.throttle({ 
          cost: 1, 
          duration: Duration.millis(100 / priority), 
          units: priority 
        })
      )
    )
    
    return Stream.mergeAll(streams, { concurrency: channels.length })
  }
  
  /**
   * Memory-efficient event archiving stream
   */
  createArchivingStream(
    channel: string,
    archiveAfter: Duration.Duration = Duration.days(7)
  ): Stream<BaseEvent, never> {
    const cutoffTime = Date.now() - Duration.toMillis(archiveAfter)
    
    return this.subscribe<BaseEvent>(channel).pipe(
      Stream.tap(event => {
        if (event.timestamp.getTime() < cutoffTime) {
          return this.archiveEvent(event)
        }
        return Effect.void
      })
    )
  }
  
  /**
   * Create backpressure-aware stream
   */
  createBackpressureStream<T extends BaseEvent>(
    channel: string,
    maxBufferSize: number = 1000
  ): Stream<T, never> {
    return Stream.asyncScoped<T, never>((emit) =>
      Effect.gen(function* () {
        const queue = yield* Queue.bounded<T>(maxBufferSize)
        
        // Subscribe and enqueue events
        const unsubscribe = yield* this.eventBus.subscribe<T>(
          channel,
          (event) => Queue.offer(queue, event).pipe(
            Effect.catchTag('QueueOfferError', () => {
              // Drop event if queue is full (backpressure)
              console.warn(`Dropping event due to backpressure on channel: ${channel}`)
              return Effect.void
            })
          )
        )
        
        // Stream from queue
        yield* Stream.fromQueue(queue).pipe(
          Stream.tap(event => emit(Effect.succeed(Chunk.of(event)))),
          Stream.runDrain,
          Effect.fork
        )
        
        // Cleanup on scope close
        return Effect.addFinalizer(() => unsubscribe())
      })
    )
  }
  
  /**
   * Check if event is redundant
   */
  private isRedundantEvent(event: BaseEvent): boolean {
    const cacheKey = `${event.source}:${event.type}`
    const lastEvent = this.lastEventCache.get(cacheKey)
    
    if (!lastEvent) return false
    
    // Consider events redundant if they occur within 50ms
    const timeDiff = event.timestamp.getTime() - lastEvent.timestamp.getTime()
    if (timeDiff < 50) {
      // Check if event data is essentially the same
      return JSON.stringify(event) === JSON.stringify(lastEvent)
    }
    
    return false
  }
  
  /**
   * Merge batched UI updates
   */
  private mergeBatchedUIUpdates(componentId: string, batch: UIUpdateEvent[]): UIUpdateEvent {
    if (batch.length === 0) {
      throw new Error('Empty batch')
    }
    
    if (batch.length === 1) {
      return batch[0]
    }
    
    // Merge strategy: combine payloads, take latest timestamp
    const merged: UIUpdateEvent = {
      type: 'ui-update',
      source: batch[batch.length - 1].source,
      timestamp: batch[batch.length - 1].timestamp,
      id: batch[batch.length - 1].id,
      componentId,
      updateType: batch[batch.length - 1].updateType,
      payload: this.mergePayloads(batch.map(e => e.payload))
    }
    
    return merged
  }
  
  /**
   * Merge multiple payloads
   */
  private mergePayloads(payloads: unknown[]): unknown {
    // Simple merge strategy - could be made more sophisticated
    if (payloads.every(p => typeof p === 'object' && p !== null)) {
      return Object.assign({}, ...payloads as object[])
    }
    
    // For non-objects, take the last value
    return payloads[payloads.length - 1]
  }
  
  /**
   * Check if event passes relevance criteria
   */
  private isEventRelevant<T extends BaseEvent>(
    event: T,
    criteria: RelevanceCriteria<T>
  ): boolean {
    return criteria.filter ? criteria.filter(event) : true
  }
  
  /**
   * Archive old events
   */
  private archiveEvent(event: BaseEvent): Effect<void, never> {
    // In a real implementation, this would persist to storage
    return Effect.sync(() => {
      console.log(`Archiving old event: ${event.type} from ${event.timestamp}`)
    })
  }
  
  /**
   * Configure buffer size for a channel
   */
  configureBufferSize(channel: string, size: number): Effect<void, never> {
    return Effect.sync(() => {
      this.bufferSizes.set(channel, size)
    })
  }
  
  /**
   * Configure rate limit for a channel
   */
  configureRateLimit(channel: string, eventsPerSecond: number): Effect<void, never> {
    return Effect.sync(() => {
      this.rateLimits.set(channel, eventsPerSecond)
    })
  }
  
  /**
   * Get optimization statistics
   */
  getOptimizationStats(): Effect<OptimizationStats, never> {
    return Effect.sync(() => ({
      bufferSizes: new Map(this.bufferSizes),
      rateLimits: new Map(this.rateLimits),
      cachedEvents: this.lastEventCache.size,
      channels: Array.from(new Set([
        ...this.bufferSizes.keys(),
        ...this.rateLimits.keys()
      ]))
    }))
  }
}

/**
 * Optimization statistics
 */
export interface OptimizationStats {
  bufferSizes: Map<string, number>
  rateLimits: Map<string, number>
  cachedEvents: number
  channels: string[]
}