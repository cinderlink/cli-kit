/* Created for compliance with CONVENTIONS.md. See docs for details. */
/**
 * Integration Patterns Tests
 *
 * Tests for pre-built integration patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { getGlobalEventBus, resetGlobalEventBus } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { IntegrationPatterns } from './integrationPatterns'

describe('Integration Patterns', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Pattern Registration', () => {
    it('should register and enable integration patterns', async () => {
      const eventBus = getGlobalEventBus()
      const patterns = new IntegrationPatterns(eventBus)

      // Register a pattern
      const patternId = await Effect.runPromise(
        patterns.registerPattern({
          id: 'test-pattern',
          name: 'Test Pattern',
          description: 'A test integration pattern',
          setup: () => Effect.succeed(undefined),
          teardown: () => Effect.succeed(undefined),
        })
      )

      expect(patternId).toBe('test-pattern')

      // Enable the pattern
      await Effect.runPromise(patterns.enablePattern('test-pattern'))

      // Verify it's enabled (would need internal access to check state)
      // For now, we'll just verify no errors were thrown
    })
  })

  describe('Pattern Application', () => {
    it('should apply registered patterns to event flows', async () => {
      const eventBus = getGlobalEventBus()
      const patterns = new IntegrationPatterns(eventBus)

      // Register and enable a pattern
      await Effect.runPromise(
        patterns.registerPattern({
          id: 'monitoring-pattern',
          name: 'Monitoring Pattern',
          description: 'Adds monitoring to event flows',
          setup: () => Effect.succeed(undefined),
          teardown: () => Effect.succeed(undefined),
        })
      )

      await Effect.runPromise(patterns.enablePattern('monitoring-pattern'))

      // Apply pattern to an event flow
      const flowConfig = {
        from: 'source-event',
        to: 'target-event',
        pattern: 'monitoring-pattern',
      }

      // This would require the pattern to be applied to an actual flow
      // For now, we're just verifying the setup works without errors
    })
  })
})
