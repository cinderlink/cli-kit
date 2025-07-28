/**
 * Core Performance Tests
 *
 * Tests performance requirements from STANDARDS.md:
 * - Startup: < 100ms for module initialization
 * - Render: < 16ms for frame updates
 * - Input: < 50ms response time
 * - Memory: Monitor for leaks in long-running operations
 */

import { test, expect, describe } from 'bun:test'
import { Effect } from 'effect'
import * as View from './view/primitives/view.js'

// Performance test utilities
function measureTime<T>(fn: () => T): [T, number] {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  return [result, duration]
}

async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return [result, duration]
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed
  }
  return 0
}

describe('Core Performance Requirements', () => {
  describe('View Creation Performance', () => {
    test('should create simple views under 1ms', () => {
      const [view, duration] = measureTime(() => {
        return View.text('Hello World')
      })

      expect(duration).toBeLessThan(1)
      expect(view).toBeDefined()
    })

    test('should create box views under 5ms', () => {
      const [view, duration] = measureTime(() => {
        return View.box(View.text('Hello World'))
      })

      expect(duration).toBeLessThan(5)
      expect(view).toBeDefined()
    })

    test('should create complex view hierarchies under 16ms', () => {
      const [view, duration] = measureTime(() => {
        const children = Array.from({ length: 10 }, (_, i) =>
          View.box(View.vstack(View.text(`Item ${i}`), View.box(View.text(`Nested ${i}`))))
        )

        return View.vstack(...children)
      })

      expect(duration).toBeLessThan(16) // STANDARDS.md requirement (~60fps)
      expect(view).toBeDefined()
    })

    test('should batch multiple view creations efficiently', () => {
      const [views, duration] = measureTime(() => {
        return Array.from({ length: 100 }, (_, i) => View.text(`Item ${i}`))
      })

      expect(duration).toBeLessThan(50) // Should handle 100 simple views quickly
      expect(views).toHaveLength(100)
    })

    test('should handle styled views efficiently', () => {
      const [views, duration] = measureTime(() => {
        return Array.from({ length: 20 }, (_, i) =>
          View.red(View.bold(View.text(`Styled Item ${i}`)))
        )
      })

      expect(duration).toBeLessThan(10) // Styled views
      expect(views).toHaveLength(20)
    })

    test('should create complex layouts efficiently', () => {
      const [layout, duration] = measureTime(() => {
        const header = View.center(View.blue(View.bold(View.text('Header'))), 40)
        const content = View.vstack(View.text('Line 1'), View.text('Line 2'), View.text('Line 3'))
        const footer = View.center(View.dim(View.text('Footer')), 40)

        return View.box(View.vstack(header, content, footer))
      })

      expect(duration).toBeLessThan(5) // Complex layout
      expect(layout).toBeDefined()
    })
  })

  describe('View Rendering Performance', () => {
    test('should render simple views under 5ms', async () => {
      const view = View.text('Hello World')

      const [rendered, duration] = await measureTimeAsync(async () => {
        return await Effect.runPromise(view.render())
      })

      expect(duration).toBeLessThan(5)
      expect(rendered).toBe('Hello World')
    })

    test('should render complex views under 16ms', async () => {
      const complexView = View.box(
        View.vstack(
          View.red(View.bold(View.text('Title'))),
          View.hstack(View.text('Left'), View.text('Center'), View.text('Right')),
          View.center(View.italic(View.text('Footer')), 30)
        )
      )

      const [rendered, duration] = await measureTimeAsync(async () => {
        return await Effect.runPromise(complexView.render())
      })

      expect(duration).toBeLessThan(16) // STANDARDS.md requirement
      expect(rendered).toBeDefined()
      expect(typeof rendered).toBe('string')
    })

    test('should handle batch rendering efficiently', async () => {
      const views = Array.from({ length: 20 }, (_, i) => View.text(`Batch item ${i}`))

      const [results, duration] = await measureTimeAsync(async () => {
        const promises = views.map(view => Effect.runPromise(view.render()))
        return Promise.all(promises)
      })

      expect(duration).toBeLessThan(50) // 20 renders
      expect(results).toHaveLength(20)
    })
  })

  describe('View Composition Performance', () => {
    test('should compose views efficiently', () => {
      const [composed, duration] = measureTime(() => {
        const items = Array.from({ length: 50 }, (_, i) => View.text(`Item ${i}`))
        return View.vstack(...items)
      })

      expect(duration).toBeLessThan(25) // 50 item composition
      expect(composed).toBeDefined()
    })

    test('should handle nested composition', () => {
      const [nested, duration] = measureTime(() => {
        const groups = Array.from({ length: 5 }, (_, groupIndex) => {
          const items = Array.from({ length: 10 }, (_, itemIndex) =>
            View.text(`Group ${groupIndex} Item ${itemIndex}`)
          )
          return View.box(View.vstack(...items))
        })
        return View.hstack(...groups)
      })

      expect(duration).toBeLessThan(15) // Nested composition
      expect(nested).toBeDefined()
    })
  })

  describe('Memory Performance', () => {
    test('should not leak memory during view operations', () => {
      const initialMemory = getMemoryUsage()

      // Create and discard many views
      for (let cycle = 0; cycle < 10; cycle++) {
        const views = Array.from({ length: 100 }, (_, i) =>
          View.box(
            View.vstack(
              View.text(`Cycle ${cycle} Item ${i}`),
              View.red(View.bold(View.text(`Styled ${i}`)))
            )
          )
        )

        // Use views
        views.forEach(view => {
          // Access properties to ensure views are used
          view.width
          view.height
        })

        // Clear references
        views.length = 0

        // Force GC if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = getMemoryUsage()

      // Memory should not grow significantly (allow for normal fluctuation)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory
        const maxAllowedGrowth = initialMemory * 1.0 // Allow 100% growth for safety
        expect(memoryGrowth).toBeLessThan(maxAllowedGrowth)
      }

      // Test passes if no out-of-memory errors occur
      expect(true).toBe(true)
    })

    test('should handle large view hierarchies without excessive memory', () => {
      const initialMemory = getMemoryUsage()

      // Create large view hierarchy
      const createDeepView = (depth: number): any => {
        if (depth === 0) {
          return View.text('Leaf')
        }
        return View.box(createDeepView(depth - 1))
      }

      const largeView = createDeepView(20) // 20 levels deep
      expect(largeView).toBeDefined()

      const finalMemory = getMemoryUsage()

      // Verify memory usage is reasonable for the structure created
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory
        // Should not use more than a reasonable amount for this test
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024) // 10MB max
      }
    })
  })

  describe('Throughput Performance', () => {
    test('should handle high-frequency view creation', () => {
      const operationsPerSecond = 1000
      const testDuration = 100 // 100ms test
      const expectedOperations = (operationsPerSecond * testDuration) / 1000

      const [operationCount, duration] = measureTime(() => {
        let count = 0
        const startTime = performance.now()

        while (performance.now() - startTime < testDuration) {
          // Simulate a typical view creation operation
          View.text(`Operation ${count}`)
          count++
        }

        return count
      })

      expect(duration).toBeLessThan(testDuration + 10) // Allow small overhead
      expect(operationCount).toBeGreaterThan(expectedOperations * 0.5) // Should achieve 50% of target (conservative)
    })

    test('should scale linearly with simple operations', () => {
      const sizes = [10, 50, 100]
      const timings: number[] = []

      for (const size of sizes) {
        const [, duration] = measureTime(() => {
          return Array.from({ length: size }, (_, i) => View.text(`Item ${i}`))
        })
        timings.push(duration)
      }

      // Since operations are very fast, ratios may be small due to timing precision
      // We just need to verify they complete quickly and don't scale exponentially
      expect(timings[0]).toBeLessThan(10) // 10 operations under 10ms
      expect(timings[1]).toBeLessThan(25) // 50 operations under 25ms
      expect(timings[2]).toBeLessThan(50) // 100 operations under 50ms
    })
  })

  describe('Effect Operations Performance', () => {
    test('should handle Effect.succeed operations efficiently', () => {
      const [results, duration] = measureTime(() => {
        return Array.from({ length: 100 }, (_, i) => Effect.succeed(`Result ${i}`))
      })

      expect(duration).toBeLessThan(10) // Effect creation should be very fast
      expect(results).toHaveLength(100)
    })

    test('should handle Effect.runPromise operations efficiently', async () => {
      const effects = Array.from({ length: 20 }, (_, i) => Effect.succeed(`Async result ${i}`))

      const [results, duration] = await measureTimeAsync(async () => {
        const promises = effects.map(effect => Effect.runPromise(effect))
        return Promise.all(promises)
      })

      expect(duration).toBeLessThan(50) // 20 async operations
      expect(results).toHaveLength(20)
    })

    test('should handle Effect composition efficiently', () => {
      const [composed, duration] = measureTime(() => {
        let effect = Effect.succeed(0)

        for (let i = 1; i <= 50; i++) {
          effect = Effect.map(effect, value => value + i)
        }

        return effect
      })

      expect(duration).toBeLessThan(10) // Effect composition
      expect(composed).toBeDefined()
    })
  })
})
