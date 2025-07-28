/**
 * Subscription Manager
 *
 * Manages continuous event streams and subscriptions
 */

import { Effect, Stream, Queue, Fiber } from 'effect'
import type { Subscription } from '../../../types'
import type { SystemMsg } from './types'

/**
 * Manages active subscriptions
 */
export class SubscriptionManager<Model, Msg> {
  private subscriptions = new Map<string, Fiber.RuntimeFiber<void>>()
  private messageQueue: Queue.Queue<SystemMsg<Msg>>

  constructor(messageQueue: Queue.Queue<SystemMsg<Msg>>) {
    this.messageQueue = messageQueue
  }

  /**
   * Start subscriptions
   */
  start(
    subscriptionsFn: (model: Model) => ReadonlyArray<Subscription<Msg>>,
    getModel: () => Effect<Model>
  ): Effect<void> {
    return Effect.gen(
      function* (_) {
        const model = yield* _(getModel())
        const subscriptions = subscriptionsFn(model)

        for (const sub of subscriptions) {
          yield* _(this.addSubscription(sub))
        }
      }.bind(this)
    )
  }

  /**
   * Add a single subscription
   */
  private addSubscription(sub: Subscription<Msg>): Effect<void> {
    return Effect.gen(
      function* (_) {
        // Cancel existing subscription with same ID
        yield* _(this.removeSubscription(sub.id))

        const fiber = yield* _(
          Stream.runForEach(sub.stream, msg =>
            Queue.offer(this.messageQueue, {
              _tag: 'UserMsg',
              msg,
            })
          ).pipe(Effect.fork)
        )

        this.subscriptions.set(sub.id, fiber)
      }.bind(this)
    )
  }

  /**
   * Remove a subscription
   */
  removeSubscription(id: string): Effect<void> {
    return Effect.gen(
      function* (_) {
        const fiber = this.subscriptions.get(id)
        if (fiber) {
          yield* _(Fiber.interrupt(fiber))
          this.subscriptions.delete(id)
        }
      }.bind(this)
    )
  }

  /**
   * Update subscriptions based on new model
   */
  update(
    subscriptionsFn: (model: Model) => ReadonlyArray<Subscription<Msg>>,
    getModel: () => Effect<Model>
  ): Effect<void> {
    return Effect.gen(
      function* (_) {
        const model = yield* _(getModel())
        const newSubs = subscriptionsFn(model)
        const newIds = new Set(newSubs.map(s => s.id))

        // Remove old subscriptions
        for (const [id] of this.subscriptions) {
          if (!newIds.has(id)) {
            yield* _(this.removeSubscription(id))
          }
        }

        // Add new subscriptions
        for (const sub of newSubs) {
          if (!this.subscriptions.has(sub.id)) {
            yield* _(this.addSubscription(sub))
          }
        }
      }.bind(this)
    )
  }

  /**
   * Stop all subscriptions
   */
  stop(): Effect<void> {
    return Effect.gen(
      function* (_) {
        const fibers = Array.from(this.subscriptions.values())
        yield* _(Effect.all(fibers.map(f => Fiber.interrupt(f))))
        this.subscriptions.clear()
      }.bind(this)
    )
  }
}
