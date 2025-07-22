/**
 * Runtime Scheduler
 * 
 * Manages event scheduling, timers, and frame rate control
 */

import { Effect, Schedule, Duration, Queue, Fiber, FiberRef } from "effect"
import type { SystemMsg } from "./types"

/**
 * Frame scheduler for controlling render rate
 */
export class FrameScheduler<Msg> {
  private frameInterval: Duration.Duration
  private lastFrameTime = 0

  constructor(fps: number) {
    this.frameInterval = Duration.millis(1000 / fps)
  }

  /**
   * Wait for next frame if needed
   */
  waitForNextFrame(): Effect<void> {
    return Effect.gen(function* (_) {
      const now = Date.now()
      const elapsed = now - this.lastFrameTime
      const remaining = Duration.toMillis(this.frameInterval) - elapsed

      if (remaining > 0) {
        yield* _(Effect.sleep(Duration.millis(remaining)))
      }

      this.lastFrameTime = Date.now()
    }.bind(this))
  }

  /**
   * Create a frame-limited schedule
   */
  createSchedule(): Schedule.Schedule<void, void> {
    return Schedule.spaced(this.frameInterval)
  }
}

/**
 * Timer manager for delayed and recurring events
 */
export class TimerManager<Msg> {
  private timers = new Map<string, Fiber.RuntimeFiber<void>>()
  private messageQueue: Queue.Queue<SystemMsg<Msg>>

  constructor(messageQueue: Queue.Queue<SystemMsg<Msg>>) {
    this.messageQueue = messageQueue
  }

  /**
   * Schedule a one-time timer
   */
  setTimeout(
    id: string,
    delay: Duration.Duration
  ): Effect<void> {
    return Effect.gen(function* (_) {
      // Cancel existing timer with same ID
      yield* _(this.cancel(id))

      const fiber = yield* _(
        Effect.gen(function* (_) {
          yield* _(Effect.sleep(delay))
          yield* _(Queue.offer(this.messageQueue, {
            _tag: "Timer",
            id
          }))
        }.bind(this)).pipe(
          Effect.fork
        )
      )

      this.timers.set(id, fiber)
    }.bind(this))
  }

  /**
   * Schedule a recurring timer
   */
  setInterval(
    id: string,
    interval: Duration.Duration
  ): Effect<void> {
    return Effect.gen(function* (_) {
      // Cancel existing timer with same ID
      yield* _(this.cancel(id))

      const fiber = yield* _(
        Effect.gen(function* (_) {
          yield* _(
            Effect.repeat(
              Queue.offer(this.messageQueue, {
                _tag: "Timer",
                id
              }),
              Schedule.spaced(interval)
            )
          )
        }.bind(this)).pipe(
          Effect.fork
        )
      )

      this.timers.set(id, fiber)
    }.bind(this))
  }

  /**
   * Cancel a timer
   */
  cancel(id: string): Effect<void> {
    return Effect.gen(function* (_) {
      const fiber = this.timers.get(id)
      if (fiber) {
        yield* _(Fiber.interrupt(fiber))
        this.timers.delete(id)
      }
    }.bind(this))
  }

  /**
   * Cancel all timers
   */
  cancelAll(): Effect<void> {
    return Effect.gen(function* (_) {
      const fibers = Array.from(this.timers.values())
      yield* _(Effect.all(fibers.map(f => Fiber.interrupt(f))))
      this.timers.clear()
    }.bind(this))
  }
}

/**
 * Command scheduler for managing concurrent effects
 */
export class CommandScheduler<Msg> {
  private activeCommands = new Map<string, Fiber.RuntimeFiber<void>>()
  private commandCount = 0
  private readonly maxConcurrent: number
  private messageQueue: Queue.Queue<SystemMsg<Msg>>

  constructor(
    messageQueue: Queue.Queue<SystemMsg<Msg>>,
    maxConcurrent = 10
  ) {
    this.messageQueue = messageQueue
    this.maxConcurrent = maxConcurrent
  }

  /**
   * Execute a command effect
   */
  execute<E, A>(
    effect: Effect<A, E>,
    onComplete?: (result: A) => Msg,
    onError?: (error: E) => Msg
  ): Effect<void> {
    return Effect.gen(function* (_) {
      const id = `cmd-${++this.commandCount}`

      // Wait if at max capacity
      while (this.activeCommands.size >= this.maxConcurrent) {
        yield* _(Effect.sleep(Duration.millis(10)))
      }

      const fiber = yield* _(
        Effect.gen(function* (_) {
          try {
            const result = yield* _(effect)
            
            if (onComplete) {
              yield* _(Queue.offer(this.messageQueue, {
                _tag: "UserMsg",
                msg: onComplete(result)
              }))
            } else {
              yield* _(Queue.offer(this.messageQueue, {
                _tag: "CommandComplete",
                id,
                result
              }))
            }
          } catch (error) {
            if (onError && error instanceof Error) {
              yield* _(Queue.offer(this.messageQueue, {
                _tag: "UserMsg",
                msg: onError(error as E)
              }))
            } else {
              yield* _(Queue.offer(this.messageQueue, {
                _tag: "CommandError",
                id,
                error
              }))
            }
          } finally {
            this.activeCommands.delete(id)
          }
        }.bind(this)).pipe(
          Effect.fork
        )
      )

      this.activeCommands.set(id, fiber)
    }.bind(this))
  }

  /**
   * Cancel all active commands
   */
  cancelAll(): Effect<void> {
    return Effect.gen(function* (_) {
      const fibers = Array.from(this.activeCommands.values())
      yield* _(Effect.all(fibers.map(f => Fiber.interrupt(f))))
      this.activeCommands.clear()
    }.bind(this))
  }

  /**
   * Get number of active commands
   */
  getActiveCount(): number {
    return this.activeCommands.size
  }
}