/**
 * Unit tests for the EventBus
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { EventBus, type BaseEvent, type EventBusStats } from './event-bus'

type Unsubscribe = () => Effect.Effect<void>

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  afterEach(async () => {
    await Effect.runPromise(eventBus.shutdown())
  })

  test('should publish and subscribe to events', async () => {
    let receivedEvent: BaseEvent | null = null

    const unsubscribe = (await Effect.runPromise(
      eventBus.subscribe('test-channel', (event: BaseEvent) => {
        receivedEvent = event
        return Effect.void
      })
    )) as Unsubscribe

    await Effect.runPromise(
      eventBus.publish('test-channel', {
        id: 'test-id-1',
        type: 'test-event',
        timestamp: new Date(),
        source: 'test',
      })
    )

    // Give time for event to propagate
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent!.type).toBe('test-event')

    await Effect.runPromise(unsubscribe())
  })

  test('should support multiple subscribers', async () => {
    const received: { subscriber: number; event: BaseEvent }[] = []

    const unsub1 = (await Effect.runPromise(
      eventBus.subscribe('multi-channel', (event: BaseEvent) => {
        received.push({ subscriber: 1, event })
        return Effect.void
      })
    )) as Unsubscribe

    const unsub2 = (await Effect.runPromise(
      eventBus.subscribe('multi-channel', (event: BaseEvent) => {
        received.push({ subscriber: 2, event })
        return Effect.void
      })
    )) as Unsubscribe

    await Effect.runPromise(
      eventBus.publish('multi-channel', {
        id: 'test-id-2',
        type: 'multi-event',
        timestamp: new Date(),
        source: 'test',
      })
    )

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(received).toHaveLength(2)
    expect(received[0]!.subscriber).toBe(1)
    expect(received[1]!.subscriber).toBe(2)

    await Effect.runPromise(unsub1())
    await Effect.runPromise(unsub2())
  })

  test('should get event bus statistics', async () => {
    await Effect.runPromise(eventBus.subscribe('stats-channel', () => Effect.void))

    const stats = (await Effect.runPromise(eventBus.getStats())) as EventBusStats

    expect(stats.totalChannels).toBe(1)
    expect(stats.totalSubscriptions).toBe(1)
  })
})
