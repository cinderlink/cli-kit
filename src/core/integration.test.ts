/**
 * Core Module Integration Tests
 * 
 * Tests module boundaries and integration between core subsystems
 * according to STANDARDS.md requirements.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect } from "effect"
import { getGlobalEventBus, resetGlobalEventBus } from "./model/events/eventBus.js"
import { resetGlobalRegistry } from "./runtime/module/registry.js"
import { bootstrapWithModules, type BootstrapResult } from "./runtime/bootstrap.js"

describe("Core Module Integration", () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe("Runtime Bootstrap Integration", () => {
    test("should initialize all core subsystems", async () => {
      const result = await Effect.runPromise(
        bootstrapWithModules({
          enableServices: true,
          enableEventSystem: true,
          enableStyling: true
        })
      ) as BootstrapResult

      expect(result.modules).toBeDefined()
      expect(result.modules.jsx).toBeDefined()
      expect(result.modules.cli).toBeDefined()
      expect(result.status).toBe('initialized')
    })

    test("should handle bootstrap failures gracefully", async () => {
      const result = await Effect.runPromise(
        bootstrapWithModules({
          enableServices: true,
          forceError: true  // Trigger bootstrap failure
        }).pipe(
          Effect.catchAll(() => Effect.succeed({ status: 'failed' as const }))
        )
      )

      expect(result.status).toBe('failed')
    })
  })

  describe("Event System Integration", () => {
    test("should coordinate events between subsystems", async () => {
      const eventBus = getGlobalEventBus()
      const events: any[] = []
      
      // Subscribe to events - must run the Effect
      await Effect.runPromise(
        eventBus.subscribe('test:integration', (event) => 
          Effect.sync(() => events.push(event))
        )
      )

      // Emit events from different subsystems
      await Effect.runPromise(
        eventBus.emit('test:integration', {
          id: 'test-1',
          type: 'test:integration',
          source: 'view-system',
          timestamp: Date.now(),
          data: { component: 'Button' }
        })
      )

      await Effect.runPromise(
        eventBus.emit('test:integration', {
          id: 'test-2', 
          type: 'test:integration',
          source: 'terminal-system',
          timestamp: Date.now(),
          data: { output: 'Hello World' }
        })
      )

      expect(events).toHaveLength(2)
      expect(events[0].source).toBe('view-system')
      expect(events[1].source).toBe('terminal-system')
    })

    test("should handle event subscription lifecycle", async () => {
      const eventBus = getGlobalEventBus()
      let eventCount = 0
      
      const unsubscribe = await Effect.runPromise(
        eventBus.subscribe('lifecycle:test', () => 
          Effect.sync(() => eventCount++)
        )
      )

      // Emit before unsubscribe
      await Effect.runPromise(
        eventBus.emit('lifecycle:test', {
          id: 'test',
          type: 'lifecycle:test',
          source: 'test',
          timestamp: Date.now()
        })
      )

      expect(eventCount).toBe(1)

      // Unsubscribe and emit again
      await Effect.runPromise(unsubscribe())
      
      await Effect.runPromise(
        eventBus.emit('lifecycle:test', {
          id: 'test2',
          type: 'lifecycle:test', 
          source: 'test',
          timestamp: Date.now()
        })
      )

      expect(eventCount).toBe(1) // Should not increment
    })
  })

  describe("Service Layer Integration", () => {
    test("should integrate services with event system", async () => {
      const result = await Effect.runPromise(
        bootstrapWithModules({
          enableServices: true,
          enableEventSystem: true
        })
      ) as BootstrapResult

      const eventBus = getGlobalEventBus()
      const serviceEvents: any[] = []

      await Effect.runPromise(
        eventBus.subscribe('service:test', (event) => 
          Effect.sync(() => serviceEvents.push(event))
        )
      )

      // Simulate service event
      await Effect.runPromise(
        eventBus.emit('service:test', {
          id: 'service-1',
          type: 'service:test',
          source: 'terminal-service',
          timestamp: Date.now(),
          data: { status: 'ready' }
        })
      )

      expect(serviceEvents).toHaveLength(1)
      expect(serviceEvents[0].source).toBe('terminal-service')
    })
  })

  describe("Module Boundary Validation", () => {
    test("should enforce clean module APIs", async () => {
      // Test that core module only exports what it should
      const coreExports = await import('./index.js')
      
      // Core should export these categories
      expect(coreExports.View).toBeDefined()
      expect(coreExports.Runtime).toBeDefined() 
      expect(coreExports.Effect).toBeDefined()
      expect(coreExports.EventBus).toBeDefined()
      
      // Core should not expose internal implementation
      expect((coreExports as any).bootstrap).toBeUndefined()
      expect((coreExports as any).internal).toBeUndefined()
    })

    test("should validate type safety at module boundaries", async () => {
      const result = await Effect.runPromise(
        bootstrapWithModules({})
      ) as BootstrapResult

      // Module results should be properly typed
      expect(typeof result.modules).toBe('object')
      expect(result.status).toMatch(/^(initialized|partial|failed)$/)
      
      if (result.modules.jsx) {
        expect(typeof result.modules.jsx).toBe('object')
      }
      
      if (result.modules.cli) {
        expect(typeof result.modules.cli).toBe('object')
      }
    })
  })

  describe("Error Propagation Integration", () => {
    test("should propagate errors across module boundaries", async () => {
      const eventBus = getGlobalEventBus()
      const errors: any[] = []

      await Effect.runPromise(
        eventBus.subscribe('error:test', (event) => 
          Effect.sync(() => errors.push(event))
        )
      )

      // Simulate error from view system
      await Effect.runPromise(
        eventBus.emit('error:test', {
          id: 'error-1',
          type: 'error:test',
          source: 'view-system',
          timestamp: Date.now(),
          error: {
            _tag: 'ViewError',
            message: 'Component render failed'
          }
        })
      )

      expect(errors).toHaveLength(1)
      expect(errors[0].error._tag).toBe('ViewError')
    })

    test("should handle error recovery patterns", async () => {
      const eventBus = getGlobalEventBus()
      let recoveryAttempted = false

      await Effect.runPromise(
        eventBus.subscribe('error:recovery', () => 
          Effect.sync(() => { recoveryAttempted = true })
        )
      )

      // Simulate error and recovery
      await Effect.runPromise(
        eventBus.emit('error:recovery', {
          id: 'recovery-1',
          type: 'error:recovery',
          source: 'error-handler',
          timestamp: Date.now(),
          action: 'retry'
        })
      )

      expect(recoveryAttempted).toBe(true)
    })
  })

  describe("Performance Integration", () => {
    test("should maintain performance across module integration", async () => {
      const start = Date.now()
      
      const result = await Effect.runPromise(
        bootstrapWithModules({
          enableServices: true,
          enableEventSystem: true,
          enableStyling: true
        })
      )

      const initTime = Date.now() - start
      
      // Should initialize within 100ms per STANDARDS.md
      expect(initTime).toBeLessThan(100)
      expect(result).toBeDefined()
    })

    test("should handle high-frequency events efficiently", async () => {
      const eventBus = getGlobalEventBus()
      let eventCount = 0

      await Effect.runPromise(
        eventBus.subscribe('perf:test', () => 
          Effect.sync(() => eventCount++)
        )
      )

      const start = Date.now()
      
      // Emit 1000 events
      for (let i = 0; i < 1000; i++) {
        await Effect.runPromise(
          eventBus.emit('perf:test', {
            id: `perf-${i}`,
            type: 'perf:test',
            source: 'perf-test',
            timestamp: Date.now(),
            data: { iteration: i }
          })
        )
      }

      const duration = Date.now() - start
      
      expect(eventCount).toBe(1000)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})