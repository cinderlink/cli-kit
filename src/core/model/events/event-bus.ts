/**
 * Event Bus - Core infrastructure for domain event communication
 *
 * Provides a typed, Effect-based event bus for inter-module communication
 * without direct coupling between domains.
 */

import { Effect } from 'effect'

/**
 * Base event interface that all domain events must extend
 */
export interface BaseEvent {
  readonly type: string
  readonly timestamp: Date
  readonly source: string
  readonly id: string
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Event handler function type
 */
export type EventHandler<T extends BaseEvent> = (event: T) => Effect<void, never>

/**
 * Event Bus implementation using simple pub/sub
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler<BaseEvent>>> = new Map()

  constructor() {}

  /**
   * Publish an event to a channel
   */
  publish<T extends BaseEvent>(channel: string, event: T): Effect<void, never> {
    return Effect.gen(
      function* () {
        const channelHandlers = this.handlers.get(channel)
        if (channelHandlers) {
          // Execute all handlers
          yield* Effect.all(
            Array.from(channelHandlers).map(handler =>
              handler(event).pipe(
                Effect.catchAll(() => Effect.void) // Ignore handler errors
              )
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Subscribe to events on a channel
   */
  subscribe<T extends BaseEvent>(
    channel: string,
    handler: EventHandler<T>
  ): Effect<() => Effect<void, never>, never> {
    return Effect.sync(() => {
      // Get or create handler set for channel
      let channelHandlers = this.handlers.get(channel)
      if (!channelHandlers) {
        channelHandlers = new Set()
        this.handlers.set(channel, channelHandlers)
      }

      // Add handler
      channelHandlers.add(handler as EventHandler<BaseEvent>)

      // Return unsubscribe function
      return () =>
        Effect.sync(() => {
          const handlers = this.handlers.get(channel)
          if (handlers) {
            handlers.delete(handler as EventHandler<BaseEvent>)
            if (handlers.size === 0) {
              this.handlers.delete(channel)
            }
          }
        })
    })
  }

  /**
   * Emit an event (alias for publish)
   */
  emit<T extends BaseEvent>(channel: string, event: T): Effect<void, never> {
    return this.publish(channel, event)
  }

  /**
   * Subscribe to a pattern of channels
   */
  subscribePattern<T extends BaseEvent>(
    pattern: RegExp,
    handler: EventHandler<T>
  ): Effect<() => Effect<void, never>, never> {
    return Effect.gen(
      function* () {
        const unsubscribers: Array<() => Effect<void, never>> = []

        // Subscribe to existing channels that match
        for (const channel of this.handlers.keys()) {
          if (pattern.test(channel)) {
            const unsub = yield* this.subscribe(channel, handler)
            unsubscribers.push(unsub)
          }
        }

        // Return function to unsubscribe from all
        return () => Effect.all(unsubscribers.map(fn => fn())).pipe(Effect.asVoid)
      }.bind(this)
    )
  }

  /**
   * Clear all subscriptions and channels
   */
  shutdown(): Effect<void, never> {
    return Effect.sync(() => {
      // Clear all handlers
      this.handlers.clear()
    })
  }

  /**
   * Get statistics about the event bus
   */
  getStats(): Effect<EventBusStats, never> {
    return Effect.sync(() => {
      const channelStats = new Map<string, number>()
      let totalSubscriptions = 0

      for (const [channel, handlers] of this.handlers) {
        channelStats.set(channel, handlers.size)
        totalSubscriptions += handlers.size
      }

      return {
        totalChannels: this.handlers.size,
        totalSubscriptions,
        channelQueueSizes: channelStats,
      }
    })
  }
}

/**
 * Event bus statistics
 */
export interface EventBusStats {
  totalChannels: number
  totalSubscriptions: number
  channelQueueSizes: Map<string, number>
}

/**
 * Create a typed event channel
 */
export function createEventChannel<T extends BaseEvent>(name: string) {
  return {
    name,
    publish: (bus: EventBus, event: T) => bus.publish(name, event),
    subscribe: (bus: EventBus, handler: EventHandler<T>) => bus.subscribe(name, handler),
  }
}

/**
 * Global event bus instance (singleton)
 */
let globalEventBus: EventBus | null = null

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus()
  }
  return globalEventBus
}

export function resetGlobalEventBus(): Effect<void, never> {
  if (globalEventBus) {
    return globalEventBus.shutdown().pipe(
      Effect.tap(() => {
        globalEventBus = null
      })
    )
  }
  return Effect.void
}
