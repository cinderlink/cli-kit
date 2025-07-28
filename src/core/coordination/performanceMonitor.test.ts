/* Created for compliance with CONVENTIONS.md. See docs for details. */
/**
 * Performance Monitoring Tests
 *
 * Tests for performance metrics collection and reporting
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { getGlobalEventBus, resetGlobalEventBus } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { PerformanceMonitor } from './performanceMonitor'

describe('Performance Monitoring', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Metrics Collection', () => {
    it('should collect event throughput metrics', async () => {
      const eventBus = getGlobalEventBus()
      const monitor = new PerformanceMonitor(eventBus)

      // Start monitoring
      await Effect.runPromise(monitor.startMonitoring())

      // Send some events
      for (let i = 0; i < 10; i++) {
        await Effect.runPromise(eventBus.publish({ type: 'test-event', payload: { id: i } }))
      }

      // Get metrics
      const metrics = await Effect.runPromise(monitor.getMetrics())

      // Verify metrics were collected
      expect(metrics).toBeDefined()
      expect(metrics.throughput).toBeDefined()

      // Stop monitoring
      await Effect.runPromise(monitor.stopMonitoring())
    })
  })

  describe('Health Reporting', () => {
    it('should generate health reports', async () => {
      const eventBus = getGlobalEventBus()
      const monitor = new PerformanceMonitor(eventBus)

      // Start monitoring
      await Effect.runPromise(monitor.startMonitoring())

      // Send some events
      for (let i = 0; i < 5; i++) {
        await Effect.runPromise(eventBus.publish({ type: 'test-event', payload: { id: i } }))
      }

      // Generate health report
      const report = await Effect.runPromise(monitor.generateHealthReport())

      // Verify report structure
      expect(report).toBeDefined()
      expect(report.status).toBeDefined()
      expect(report.metrics).toBeDefined()

      // Stop monitoring
      await Effect.runPromise(monitor.stopMonitoring())
    })
  })
})
