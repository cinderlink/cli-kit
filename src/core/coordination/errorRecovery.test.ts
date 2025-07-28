/* Created for compliance with CONVENTIONS.md. See docs for details. */
/**
 * Error Recovery Tests
 *
 * Tests for error detection, pattern matching, and recovery strategies
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { getGlobalEventBus, resetGlobalEventBus } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { ErrorRecoveryManager } from './errorRecovery'
import type { ErrorPattern, RecoveryStrategy } from './types'

describe('Error Recovery', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Error Pattern Detection', () => {
    it('should detect registered error patterns', async () => {
      const eventBus = getGlobalEventBus()
      const errorRecovery = new ErrorRecoveryManager(eventBus)

      // Register an error pattern
      const pattern: ErrorPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        condition: error => error.message.includes('test'),
        recoveryStrategy: 'retry',
      }

      await Effect.runPromise(errorRecovery.registerErrorPattern(pattern))

      // Create a matching error
      const testError = new Error('This is a test error')

      // Detect the pattern
      const detected = await Effect.runPromise(errorRecovery.detectErrorPattern(testError))

      expect(detected).toBeDefined()
      expect(detected?.id).toBe('test-pattern')
    })
  })

  describe('Recovery Strategies', () => {
    it('should execute registered recovery strategies', async () => {
      const eventBus = getGlobalEventBus()
      const errorRecovery = new ErrorRecoveryManager(eventBus)

      // Register a recovery strategy
      const strategy: RecoveryStrategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        execute: error => Effect.succeed({ success: true, message: 'Recovered from error' }),
      }

      await Effect.runPromise(errorRecovery.registerRecoveryStrategy(strategy))

      // Create an error
      const testError = new Error('Recoverable error')

      // Execute recovery
      const result = await Effect.runPromise(
        errorRecovery.executeRecoveryStrategy('test-strategy', testError)
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Recovered from error')
    })
  })
})
