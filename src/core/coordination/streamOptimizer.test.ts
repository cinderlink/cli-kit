/* Created for compliance with CONVENTIONS.md. See docs for details. */
/**
 * Event Stream Optimization Tests
 *
 * Tests for event stream optimization techniques
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect, Queue } from 'effect'
import { getGlobalEventBus, resetGlobalEventBus, BaseEvent } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { EventStreamOptimizer } from './streamOptimizer'

describe('Event Stream Optimization', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Buffering', () => {
    it('should buffer events and flush when threshold is reached', async () => {
      const eventBus = getGlobalEventBus()
      const optimizer = new EventStreamOptimizer(eventBus)

      // Configure buffering
      optimizer.configureBuffering('test-channel', 3)

      // Create a queue to capture flushed events
      const flushedEvents: BaseEvent[] = []
      const queue = await Effect.runPromise(Queue.bounded<BaseEvent>(100))

      // Subscribe to flushed events
      const subscription = await Effect.runPromise(
        eventBus.subscribe('test-channel', event =>
          Effect.sync(() => {
            flushedEvents.push(event)
          })
        )
      )

      // Send events below threshold
      await Effect.runPromise(
        eventBus.publish({ type: 'test-channel', payload: { id: 1 } } as BaseEvent)
      )
      await Effect.runPromise(
        eventBus.publish({ type: 'test-channel', payload: { id: 2 } } as BaseEvent)
      )

      // Events should not be flushed yet
      expect(flushedEvents.length).toBe(0)

      // Send event that reaches threshold
      await Effect.runPromise(
        eventBus.publish({ type: 'test-channel', payload: { id: 3 } } as BaseEvent)
      )

      // Events should now be flushed
      expect(flushedEvents.length).toBe(3)

      // Cleanup
      await Effect.runPromise(subscription.unsubscribe())
    })
  })

  describe('Throttling', () => {
    it('should throttle events to specified rate limit', async () => {
      const eventBus = getGlobalEventBus()
      const optimizer = new EventStreamOptimizer(eventBus)

      // Configure throttling
      optimizer.configureRateLimit('throttle-channel', 2) // 2 events per second

      // Create a queue to capture events
      const events: BaseEvent[] = []
      const queue = await Effect.runPromise(Queue.bounded<BaseEvent>(100))

      // Subscribe to events
      const subscription = await Effect.runPromise(
        eventBus.subscribe('throttle-channel', event =>
          Effect.sync(() => {
            events.push(event)
          })
        )
      )

      // Send events rapidly
      for (let i = 0; i < 5; i++) {
        await Effect.runPromise(
          eventBus.publish({ type: 'throttle-channel', payload: { id: i } } as BaseEvent)
        )
      }

      // Wait a bit for throttling to take effect
      await Effect.runPromise(Effect.sleep(100))

      // Should have been throttled (exact number depends on implementation)
      expect(events.length).toBeLessThan(5)

      // Cleanup
      await Effect.runPromise(subscription.unsubscribe())
    })
  })
})
