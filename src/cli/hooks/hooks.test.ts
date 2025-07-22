/**
 * Hook System Tests
 * 
 * Tests for the hook system implementation
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import { EventBus } from "@core/model/events/eventBus"
import { createHooks, getGlobalHooks, resetGlobalHooks } from "./manager"
import { createHookEvent } from "./utils"
import type { Hooks, BeforeCommandEvent, AfterCommandEvent } from "./index"

describe("CLI Hooks", () => {
  let eventBus: EventBus
  let hooks: Hooks

  beforeEach(() => {
    resetGlobalHooks()
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

  describe("Lifecycle Hooks", () => {
    it("beforeCommand hook", async () => {
      let called = false
      let receivedEvent: BeforeCommandEvent | null = null

      hooks.beforeCommand.tap('test', (event) => {
        called = true
        receivedEvent = event
        return Effect.void
      })

      await Effect.runPromise(
        hooks.emit({
          type: 'hook:beforeCommand',
          command: ['test', 'command'],
          args: { foo: 'bar' }
        })
      )

      expect(called).toBe(true)
      expect(receivedEvent).toBeDefined()
      expect(receivedEvent?.command).toEqual(['test', 'command'])
      expect(receivedEvent?.args).toEqual({ foo: 'bar' })
    })

    it("afterCommand hook", async () => {
      let called = false
      let receivedEvent: AfterCommandEvent | null = null

      hooks.afterCommand.tap('test', (event) => {
        called = true
        receivedEvent = event
        return Effect.void
      })

      await Effect.runPromise(
        hooks.emit({
          type: 'hook:afterCommand',
          command: ['test'],
          args: {},
          result: 'success'
        })
      )

      expect(called).toBe(true)
      expect(receivedEvent?.result).toBe('success')
    })

    it("async hook handler", async () => {
      let called = false

      hooks.beforeCommand.tapAsync('test', async (event) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        called = true
      })

      await Effect.runPromise(
        hooks.emit({
          type: 'hook:beforeCommand',
          command: ['test'],
          args: {}
        })
      )

      expect(called).toBe(true)
    })
  })

  describe("Plugin Hooks", () => {
    it("onPluginLoad hook", async () => {
      let pluginName = ''
      let pluginVersion = ''

      hooks.onPluginLoad.tap('test', (event) => {
        pluginName = event.pluginName
        pluginVersion = event.pluginVersion
        return Effect.void
      })

      await Effect.runPromise(
        hooks.emit({
          type: 'hook:pluginLoad',
          pluginName: 'test-plugin',
          pluginVersion: '1.0.0'
        })
      )

      expect(pluginName).toBe('test-plugin')
      expect(pluginVersion).toBe('1.0.0')
    })

    it("onError hook", async () => {
      let errorMessage = ''

      hooks.onError.tap('test', (event) => {
        errorMessage = event.error.message
        return Effect.void
      })

      await Effect.runPromise(
        hooks.emit({
          type: 'hook:onError',
          error: new Error('Test error'),
          command: ['test'],
          args: {}
        })
      )

      expect(errorMessage).toBe('Test error')
    })
  })

  describe("Hook Management", () => {
    it("untap removes handler", async () => {
      let callCount = 0

      hooks.beforeCommand.tap('test', () => {
        callCount++
        return Effect.void
      })

      // First call should trigger
      await Effect.runPromise(
        hooks.emit({
          type: 'hook:beforeCommand',
          command: ['test'],
          args: {}
        })
      )

      expect(callCount).toBe(1)

      // Remove handler
      hooks.beforeCommand.untap('test')

      // Second call should not trigger
      await Effect.runPromise(
        hooks.emit({
          type: 'hook:beforeCommand',
          command: ['test'],
          args: {}
        })
      )

      expect(callCount).toBe(1)
    })

    it("unsubscribe removes handler", async () => {
      let callCount = 0

      const subscription = hooks.afterInit.tap('test', () => {
        callCount++
        return Effect.void
      })

      // First call should trigger
      await Effect.runPromise(
        hooks.emit({
          type: 'hook:afterInit',
          config: {}
        })
      )

      expect(callCount).toBe(1)

      // Unsubscribe
      subscription.unsubscribe()

      // Second call should not trigger
      await Effect.runPromise(
        hooks.emit({
          type: 'hook:afterInit',
          config: {}
        })
      )

      expect(callCount).toBe(1)
    })
  })
})