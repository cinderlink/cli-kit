/**
 * Hook System Tests
 * 
 * Tests for the event-driven hook system that replaces legacy CLIHooks,
 * CommandHooks, and PluginMiddleware interfaces.
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import { EventBus } from "@core/model/events/eventBus"
import {
  createHooks,
  createHookEvent,
  getGlobalHooks,
  type Hooks,
  type BeforeCommandEvent,
  type AfterCommandEvent,
  type OnErrorEvent
} from "./hooks"

describe("Hook System", () => {
  let eventBus: EventBus
  let hooks: Hooks

  beforeEach(() => {
    eventBus = new EventBus()
    hooks = createHooks(eventBus, "test")
  })

  describe("Hook Creation", () => {
    it("should create hooks with event bus", () => {
      expect(hooks).toBeDefined()
      expect(hooks.beforeCommand).toBeDefined()
      expect(hooks.afterCommand).toBeDefined()
      expect(hooks.onError).toBeDefined()
    })

    it("should get global hooks singleton", () => {
      const globalHooks = getGlobalHooks(eventBus)
      expect(globalHooks).toBeDefined()
      
      // Should return same instance
      const globalHooks2 = getGlobalHooks()
      expect(globalHooks2).toBe(globalHooks)
    })
  })

  describe("Event Subscription", () => {
    it("should subscribe to beforeCommand events", async () => {
      let called = false
      let receivedEvent: BeforeCommandEvent | null = null

      await Effect.runPromise(
        hooks.beforeCommand.tap('test', (event) => {
          called = true
          receivedEvent = event
          return Effect.void
        })
      )

      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test', 'command'],
          args: { foo: 'bar' }
        }))
      )

      expect(called).toBe(true)
      expect(receivedEvent).toBeDefined()
      expect(receivedEvent?.command).toEqual(['test', 'command'])
      expect(receivedEvent?.args).toEqual({ foo: 'bar' })
    })

    it("should support multiple subscribers", async () => {
      let count = 0

      // Subscribe first handler
      await Effect.runPromise(
        hooks.beforeCommand.tap('test1', () => {
          count++
          return Effect.void
        })
      )

      // Subscribe second handler
      await Effect.runPromise(
        hooks.beforeCommand.tap('test2', () => {
          count++
          return Effect.void
        })
      )

      // Emit event
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(2)
    })

    it("should support sync handlers", async () => {
      let called = false

      await Effect.runPromise(
        hooks.beforeCommand.tap('test', (event) => {
          called = true
          // Sync handler - no Effect
        })
      )

      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(called).toBe(true)
    })

    it("should support async handlers", async () => {
      let called = false

      await Effect.runPromise(
        hooks.beforeCommand.tapAsync('test', async (event) => {
          await new Promise(resolve => setTimeout(resolve, 1))
          called = true
        })
      )

      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(called).toBe(true)
    })
  })

  describe("Hook Filtering", () => {
    it("should filter events manually", async () => {
      let count = 0

      await Effect.runPromise(
        hooks.beforeCommand.tap('test', (event) => {
          // Manual filtering
          if (event.command[0] === 'test') {
            count++
          }
          return Effect.void
        })
      )

      // Should count
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      // Should not count
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['other'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })

    it("should support conditional execution", async () => {
      let called = false

      await Effect.runPromise(
        hooks.beforeCommand.tap('test', (event) => {
          if (event.command.length > 1 && event.command[0] === 'test') {
            called = true
          }
          return Effect.void
        })
      )

      // Should not call - only one command part
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(called).toBe(false)

      // Should call - two command parts with 'test' first
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test', 'sub'],
          args: {}
        }))
      )

      expect(called).toBe(true)
    })
  })

  describe("Error Handling", () => {
    it("should handle errors in handlers", async () => {
      await Effect.runPromise(
        hooks.onError.tap('error-handler', (event) => {
          expect(event.error).toBeDefined()
          expect(event.error.message).toContain('test error')
          return Effect.void
        })
      )

      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:onError', {
          error: new Error('test error'),
          phase: 'command'
        }))
      )
    })

    it("should not break other handlers if one fails", async () => {
      let successCount = 0

      await Effect.runPromise(
        hooks.beforeCommand.tap('failing', () => {
          throw new Error('Handler failed')
        })
      )

      await Effect.runPromise(
        hooks.beforeCommand.tap('success', () => {
          successCount++
          return Effect.void
        })
      )

      // The failing handler should not prevent the success handler from running
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        })).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )

      expect(successCount).toBe(1)
    })
  })

  describe("Once Subscription", () => {
    it("should allow manual one-time subscriptions", async () => {
      let count = 0
      let subscription: { unsubscribe: () => void } | null = null

      subscription = await Effect.runPromise(
        hooks.beforeCommand.tap('once', (event) => {
          count++
          // Unsubscribe after first call
          if (subscription) {
            subscription.unsubscribe()
          }
          return Effect.void
        })
      )

      // First call
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      // Second call (should not increment)
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })
  })

  describe("Unsubscribe", () => {
    it("should unsubscribe from events", async () => {
      let count = 0

      const subscription = await Effect.runPromise(
        hooks.beforeCommand.tap('test', () => {
          count++
          return Effect.void
        })
      )

      // First call
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)

      // Unsubscribe
      subscription.unsubscribe()

      // Second call (should not increment)
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })

    it("should untap by name", async () => {
      let count = 0

      await Effect.runPromise(
        hooks.beforeCommand.tap('removable', () => {
          count++
          return Effect.void
        })
      )

      // First call
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)

      // Untap by name
      hooks.beforeCommand.untap('removable')

      // Second call (should not increment)
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })
  })

  describe("Lifecycle Hooks", () => {
    it("should support all lifecycle hooks", async () => {
      const calls: string[] = []

      await Effect.runPromise(
        Effect.all([
          hooks.beforeInit.tap('test', () => {
            calls.push('beforeInit')
            return Effect.void
          }),
          hooks.afterInit.tap('test', () => {
            calls.push('afterInit')
            return Effect.void
          }),
          hooks.beforeExecute.tap('test', () => {
            calls.push('beforeExecute')
            return Effect.void
          }),
          hooks.afterExecute.tap('test', () => {
            calls.push('afterExecute')
            return Effect.void
          })
        ])
      )

      await Effect.runPromise(
        Effect.all([
          hooks.emit(createHookEvent('hook:beforeInit', { config: {} })),
          hooks.emit(createHookEvent('hook:afterInit', { config: {} })),
          hooks.emit(createHookEvent('hook:beforeExecute', { 
            command: ['test'], 
            args: {},
            handler: () => Effect.void
          })),
          hooks.emit(createHookEvent('hook:afterExecute', { 
            command: ['test'], 
            args: {},
            result: 'success'
          }))
        ])
      )

      expect(calls).toContain('beforeInit')
      expect(calls).toContain('afterInit')
      expect(calls).toContain('beforeExecute')
      expect(calls).toContain('afterExecute')
    })
  })
})