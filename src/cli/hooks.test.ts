/**
 * Hook System Tests
 * 
 * Tests for the event-driven hook system that replaces legacy CLIHooks,
 * CommandHooks, and PluginMiddleware interfaces.
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import { EventBus } from "../core/event-bus"
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
      expect(hooks.onBeforeCommand).toBeDefined()
      expect(hooks.onAfterCommand).toBeDefined()
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
        hooks.onBeforeCommand.subscribe((event) => {
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

      await Effect.runPromise(
        hooks.onBeforeCommand.subscribe(() => {
          count++
          return Effect.void
        })
      )

      await Effect.runPromise(
        hooks.onBeforeCommand.subscribe(() => {
          count++
          return Effect.void
        })
      )

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
        hooks.onBeforeCommand.subscribe((event) => {
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
        hooks.onBeforeCommand.subscribe(async (event) => {
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
    it("should filter events", async () => {
      let count = 0

      await Effect.runPromise(
        hooks.onBeforeCommand
          .filter(event => event.command[0] === 'test')
          .subscribe(() => {
            count++
            return Effect.void
          })
      )

      // Should trigger
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test', 'command'],
          args: {}
        }))
      )

      // Should not trigger
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['other', 'command'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })

    it("should support chained filters", async () => {
      let called = false

      await Effect.runPromise(
        hooks.onBeforeCommand
          .filter(event => event.command.length > 1)
          .filter(event => event.command[0] === 'test')
          .subscribe(() => {
            called = true
            return Effect.void
          })
      )

      // Should not trigger (only one command)
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(called).toBe(false)

      // Should trigger
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test', 'command'],
          args: {}
        }))
      )

      expect(called).toBe(true)
    })
  })

  describe("Once Subscription", () => {
    it("should only trigger once", async () => {
      let count = 0

      await Effect.runPromise(
        hooks.onBeforeCommand.once(() => {
          count++
          return Effect.void
        })
      )

      // First event
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      // Second event
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)
    })
  })

  describe("Error Handling", () => {
    it("should handle Effect failures in handlers", async () => {
      let errorLogged = false

      await Effect.runPromise(
        hooks.onBeforeCommand.subscribe(() => {
          // Return an Effect failure instead of throwing
          return Effect.fail(new Error("Handler error"))
        })
      )

      // Emit event and expect it to handle the failure gracefully
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        })).pipe(
          Effect.catchAll((error) => {
            errorLogged = true
            // The error should be caught and handled
            return Effect.void
          })
        )
      )

      // For now, errors are caught but not re-emitted as error events
      expect(errorLogged).toBe(false) // Errors are handled internally
    })
  })

  describe("Unsubscribe", () => {
    it("should unsubscribe handlers", async () => {
      let count = 0

      const subscription = await Effect.runPromise(
        hooks.onBeforeCommand.subscribe(() => {
          count++
          return Effect.void
        })
      )

      // First event
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1)

      // Unsubscribe
      await Effect.runPromise(subscription.unsubscribe())

      // Second event
      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:beforeCommand', {
          command: ['test'],
          args: {}
        }))
      )

      expect(count).toBe(1) // Should not increment
    })
  })

  describe("Custom Hooks", () => {
    it("should support custom event channels", async () => {
      let called = false

      interface CustomEvent extends BaseEvent {
        type: 'custom:myEvent'
        data: string
      }

      await Effect.runPromise(
        hooks.on<CustomEvent>('custom:myEvent').subscribe((event) => {
          called = true
          expect(event.data).toBe('test data')
          return Effect.void
        })
      )

      await Effect.runPromise(
        eventBus.emit('custom:myEvent', createHookEvent('custom:myEvent', {
          data: 'test data'
        }) as CustomEvent)
      )

      expect(called).toBe(true)
    })
  })

  describe("Plugin Lifecycle Hooks", () => {
    it("should emit plugin load events", async () => {
      let loaded = false

      await Effect.runPromise(
        hooks.onPluginLoad.subscribe((event) => {
          loaded = true
          expect(event.pluginName).toBe('test-plugin')
          expect(event.pluginVersion).toBe('1.0.0')
          return Effect.void
        })
      )

      await Effect.runPromise(
        hooks.emit(createHookEvent('hook:pluginLoad', {
          pluginName: 'test-plugin',
          pluginVersion: '1.0.0'
        }))
      )

      expect(loaded).toBe(true)
    })
  })

  describe("Command Lifecycle", () => {
    it("should emit full command lifecycle", async () => {
      const events: string[] = []

      // Subscribe to all lifecycle events
      await Effect.runPromise(Effect.all([
        hooks.onBeforeParse.subscribe(() => {
          events.push('beforeParse')
          return Effect.void
        }),
        hooks.onAfterParse.subscribe(() => {
          events.push('afterParse')
          return Effect.void
        }),
        hooks.onBeforeValidate.subscribe(() => {
          events.push('beforeValidate')
          return Effect.void
        }),
        hooks.onAfterValidate.subscribe(() => {
          events.push('afterValidate')
          return Effect.void
        }),
        hooks.onBeforeExecute.subscribe(() => {
          events.push('beforeExecute')
          return Effect.void
        }),
        hooks.onAfterExecute.subscribe(() => {
          events.push('afterExecute')
          return Effect.void
        })
      ]))

      // Emit lifecycle events in order
      await Effect.runPromise(Effect.all([
        hooks.emit(createHookEvent('hook:beforeParse', { argv: ['test'] })),
        hooks.emit(createHookEvent('hook:afterParse', { argv: ['test'], parsed: {} })),
        hooks.emit(createHookEvent('hook:beforeValidate', { args: {}, command: ['test'] })),
        hooks.emit(createHookEvent('hook:afterValidate', { args: {}, command: ['test'], valid: true })),
        hooks.emit(createHookEvent('hook:beforeExecute', { command: ['test'], args: {} })),
        hooks.emit(createHookEvent('hook:afterExecute', { command: ['test'], args: {}, result: 'done' }))
      ]))

      expect(events).toEqual([
        'beforeParse',
        'afterParse',
        'beforeValidate',
        'afterValidate',
        'beforeExecute',
        'afterExecute'
      ])
    })
  })
})