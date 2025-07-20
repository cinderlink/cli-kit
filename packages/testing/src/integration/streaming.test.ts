/**
 * Streaming Integration Tests - Test stream composition, error handling
 * 
 * This module tests the TUIX streaming system integration including:
 * - Stream composition patterns
 * - Backpressure handling
 * - Error propagation in streams
 * - Resource cleanup
 * - Stream performance
 * 
 * Tests follow the requirements from task 3A.4 with comprehensive coverage
 * of stream interaction scenarios.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Stream, Queue, Ref, Fiber, Schedule, Exit } from "effect"
import { createMockAppServices, withMockServices } from "../test-utils"
import { ComponentError } from "@tuix/core"

// =============================================================================
// Test Stream Utilities
// =============================================================================

/**
 * Create a test stream that emits values at regular intervals
 */
const createTestStream = <T>(values: T[], intervalMs: number = 10): Stream.Stream<T, never, never> =>
  Stream.fromIterable(values).pipe(
    Stream.schedule(Schedule.fixed(intervalMs))
  )

/**
 * Create a stream that fails after emitting some values
 */
const createFailingStream = <T>(values: T[], failAfter: number, error: Error): Stream.Stream<T, Error, never> =>
  Stream.fromIterable(values).pipe(
    Stream.mapWithIndex((value, index) => {
      if (index >= failAfter) {
        throw error
      }
      return value
    })
  )

/**
 * Create a backpressure-inducing stream
 */
const createSlowStream = <T>(values: T[], delayMs: number = 100): Stream.Stream<T, never, never> =>
  Stream.fromIterable(values).pipe(
    Stream.schedule(Schedule.fixed(delayMs))
  )

/**
 * Create a high-frequency stream
 */
const createHighFrequencyStream = (count: number): Stream.Stream<number, never, never> =>
  Stream.iterate(0, n => n + 1).pipe(
    Stream.take(count)
  )

// =============================================================================
// Multi-Source Stream Merging Tests
// =============================================================================

describe("Multi-Source Stream Merging", () => {
  test("should merge multiple streams correctly", async () => {
    const results: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const stream1 = createTestStream([1, 2, 3], 10)
        const stream2 = createTestStream([4, 5, 6], 15)
        const stream3 = createTestStream([7, 8, 9], 20)
        
        // Merge streams
        const merged = Stream.mergeAll([stream1, stream2, stream3])
        
        // Collect results
        yield* _(
          merged.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        // All values should be present (order may vary due to timing)
        expect(results.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle concurrent stream processing", async () => {
    const processedValues: string[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const stream1 = createTestStream(["a", "b", "c"], 5)
        const stream2 = createTestStream(["x", "y", "z"], 8)
        
        // Process streams concurrently
        const fiber1 = yield* _(
          stream1.pipe(
            Stream.tap(value => Effect.sync(() => {
              processedValues.push(`stream1:${value}`)
            })),
            Stream.runDrain
          ).pipe(Effect.fork)
        )
        
        const fiber2 = yield* _(
          stream2.pipe(
            Stream.tap(value => Effect.sync(() => {
              processedValues.push(`stream2:${value}`)
            })),
            Stream.runDrain
          ).pipe(Effect.fork)
        )
        
        // Wait for both streams to complete
        yield* _(Fiber.join(fiber1))
        yield* _(Fiber.join(fiber2))
        
        // Verify all values were processed
        expect(processedValues).toHaveLength(6)
        expect(processedValues.filter(v => v.startsWith("stream1:"))).toHaveLength(3)
        expect(processedValues.filter(v => v.startsWith("stream2:"))).toHaveLength(3)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream synchronization", async () => {
    const syncedResults: [number, string][] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const numberStream = createTestStream([1, 2, 3], 10)
        const stringStream = createTestStream(["a", "b", "c"], 10)
        
        // Zip streams together
        const zipped = Stream.zip(numberStream, stringStream)
        
        yield* _(
          zipped.pipe(
            Stream.tap(([num, str]) => Effect.sync(() => {
              syncedResults.push([num, str])
            })),
            Stream.runDrain
          )
        )
        
        expect(syncedResults).toEqual([
          [1, "a"],
          [2, "b"],
          [3, "c"]
        ])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream racing", async () => {
    const winner = Ref.unsafeMake<string | null>(null)
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const fastStream = createTestStream(["fast"], 5)
        const slowStream = createTestStream(["slow"], 50)
        
        // Race streams - first to emit wins
        const raced = Stream.mergeAll([
          fastStream.pipe(Stream.take(1)),
          slowStream.pipe(Stream.take(1))
        ])
        
        yield* _(
          raced.pipe(
            Stream.tap(value => Ref.set(winner, value)),
            Stream.take(1),
            Stream.runDrain
          )
        )
        
        const result = yield* _(Ref.get(winner))
        expect(result).toBe("fast")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Stream Transformation Pipeline Tests
// =============================================================================

describe("Stream Transformation Pipelines", () => {
  test("should chain multiple transformations", async () => {
    const results: string[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const sourceStream = createTestStream([1, 2, 3, 4, 5], 5)
        
        // Create transformation pipeline
        const pipeline = sourceStream.pipe(
          Stream.filter(n => n % 2 === 0), // Keep even numbers
          Stream.map(n => n * 2),          // Double them
          Stream.map(n => `value:${n}`),   // Convert to string
          Stream.take(3)                   // Take first 3
        )
        
        yield* _(
          pipeline.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        expect(results).toEqual(["value:4", "value:8"])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle complex transformations", async () => {
    const results: { original: number; processed: string }[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const sourceStream = createTestStream([1, 2, 3, 4, 5], 5)
        
        // Complex transformation with Effect
        const pipeline = sourceStream.pipe(
          Stream.mapEffect(n => 
            Effect.gen(function* (_) {
              // Simulate async transformation
              yield* _(Effect.sleep(1))
              return {
                original: n,
                processed: `processed-${n * n}`
              }
            })
          )
        )
        
        yield* _(
          pipeline.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        expect(results).toEqual([
          { original: 1, processed: "processed-1" },
          { original: 2, processed: "processed-4" },
          { original: 3, processed: "processed-9" },
          { original: 4, processed: "processed-16" },
          { original: 5, processed: "processed-25" }
        ])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream buffering", async () => {
    const batchSizes: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const sourceStream = createTestStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 1)
        
        // Group into batches of 3
        const batched = sourceStream.pipe(
          Stream.groupedWithin(3, 100) // Max 3 items or 100ms timeout
        )
        
        yield* _(
          batched.pipe(
            Stream.tap(batch => Effect.sync(() => {
              batchSizes.push(batch.length)
            })),
            Stream.runDrain
          )
        )
        
        expect(batchSizes).toEqual([3, 3, 3])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream debouncing", async () => {
    const debouncedValues: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Create a stream with rapid emissions followed by pause
        const sourceStream = Stream.fromIterable([1, 2, 3]).pipe(
          Stream.concat(
            Stream.fromIterable([4, 5]).pipe(
              Stream.schedule(Schedule.fixed(200)) // Longer delay
            )
          )
        )
        
        // Debounce with 100ms threshold
        const debounced = sourceStream.pipe(
          Stream.debounce(100)
        )
        
        yield* _(
          debounced.pipe(
            Stream.tap(value => Effect.sync(() => {
              debouncedValues.push(value)
            })),
            Stream.runDrain
          )
        )
        
        // Should only emit the last value from rapid sequence and final values
        expect(debouncedValues.length).toBeLessThan(5)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Error Recovery Strategy Tests
// =============================================================================

describe("Stream Error Recovery", () => {
  test("should recover from stream errors", async () => {
    const results: number[] = []
    const errors: Error[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const failingStream = createFailingStream([1, 2, 3, 4, 5], 2, new Error("Stream error"))
        
        // Recover from errors
        const recovered = failingStream.pipe(
          Stream.catchAll(error => {
            errors.push(error)
            return createTestStream([999]) // Recovery value
          })
        )
        
        yield* _(
          recovered.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        // Should have initial values plus recovery value
        expect(results).toEqual([1, 2, 999])
        expect(errors).toHaveLength(1)
        expect(errors[0].message).toBe("Stream error")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should retry failed stream operations", async () => {
    let attemptCount = 0
    const results: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const retryingStream = Stream.fromEffect(
          Effect.gen(function* (_) {
            attemptCount++
            if (attemptCount < 3) {
              return yield* _(Effect.fail(new Error("Retry me")))
            }
            return 42
          })
        )
        
        const withRetry = retryingStream.pipe(
          Stream.retry(Schedule.recurs(5).pipe(Schedule.and(Schedule.fixed(10))))
        )
        
        yield* _(
          withRetry.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        expect(results).toEqual([42])
        expect(attemptCount).toBe(3)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle partial stream failures", async () => {
    const results: string[] = []
    const errors: string[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const sourceStream = createTestStream([1, 2, 3, 4, 5], 5)
        
        // Transform with potential failures
        const pipeline = sourceStream.pipe(
          Stream.mapEffect(n => 
            Effect.gen(function* (_) {
              if (n === 3) {
                return yield* _(Effect.fail(new Error(`Failed on ${n}`)))
              }
              return `success-${n}`
            })
          ),
          Stream.catchAll(error => {
            errors.push(error.message)
            return Stream.empty // Continue with empty stream
          })
        )
        
        yield* _(
          pipeline.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        expect(results).toEqual(["success-1", "success-2", "success-4", "success-5"])
        expect(errors).toEqual(["Failed on 3"])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream timeouts", async () => {
    const results: string[] = []
    const timeouts: string[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const slowStream = createSlowStream(["slow1", "slow2", "slow3"], 200)
        
        // Apply timeout
        const withTimeout = slowStream.pipe(
          Stream.timeout(150), // Timeout after 150ms
          Stream.catchAll(error => {
            timeouts.push(error.message)
            return Stream.empty
          })
        )
        
        yield* _(
          withTimeout.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        // Should timeout before getting all values
        expect(results.length).toBeLessThan(3)
        expect(timeouts.length).toBeGreaterThan(0)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Memory Leak Prevention Tests
// =============================================================================

describe("Stream Memory Management", () => {
  test("should cleanup stream resources", async () => {
    const cleanupCount = Ref.unsafeMake(0)
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const resourceStream = Stream.acquireRelease(
          Effect.gen(function* (_) {
            return "resource"
          }),
          (_resource) => Ref.update(cleanupCount, n => n + 1)
        )
        
        const results: string[] = []
        
        yield* _(
          resourceStream.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.take(1), // Take only one value
            Stream.runDrain
          )
        )
        
        // Verify cleanup happened
        const cleanups = yield* _(Ref.get(cleanupCount))
        expect(cleanups).toBe(1)
        expect(results).toEqual(["resource"])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream interruption", async () => {
    const processed: number[] = []
    const interrupted = Ref.unsafeMake(false)
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const longStream = createTestStream([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)
        
        // Start processing stream
        const fiber = yield* _(
          longStream.pipe(
            Stream.tap(value => Effect.sync(() => {
              processed.push(value)
            })),
            Stream.onInterrupt(() => Ref.set(interrupted, true)),
            Stream.runDrain
          ).pipe(Effect.fork)
        )
        
        // Let it process some values
        yield* _(Effect.sleep(150))
        
        // Interrupt the stream
        yield* _(Effect.interrupt(fiber))
        
        // Verify interruption
        const wasInterrupted = yield* _(Ref.get(interrupted))
        expect(wasInterrupted).toBe(true)
        expect(processed.length).toBeLessThan(10)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle bounded stream queues", async () => {
    const results: number[] = []
    const droppedCount = Ref.unsafeMake(0)
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Create a high-frequency stream
        const fastStream = createHighFrequencyStream(100)
        
        // Process with bounded queue
        const bounded = fastStream.pipe(
          Stream.buffer(10), // Buffer up to 10 items
          Stream.tap(value => Effect.sync(() => {
            results.push(value)
          })),
          Stream.take(20) // Take first 20 processed items
        )
        
        yield* _(
          bounded.pipe(
            Stream.runDrain
          )
        )
        
        // Should process some items without memory issues
        expect(results.length).toBe(20)
        expect(results[0]).toBe(0)
        expect(results[19]).toBe(19)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// High-Frequency Stream Handling Tests
// =============================================================================

describe("High-Frequency Stream Performance", () => {
  test("should handle high-frequency emissions", async () => {
    const itemCount = 10000
    const results: number[] = []
    
    const startTime = performance.now()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const highFreqStream = createHighFrequencyStream(itemCount)
        
        yield* _(
          highFreqStream.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Should process all items efficiently
        expect(results.length).toBe(itemCount)
        expect(results[0]).toBe(0)
        expect(results[itemCount - 1]).toBe(itemCount - 1)
        
        // Should complete within reasonable time
        expect(duration).toBeLessThan(2000) // 2 seconds
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle backpressure gracefully", async () => {
    const processed: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const fastProducer = createHighFrequencyStream(1000)
        const slowConsumer = fastProducer.pipe(
          Stream.mapEffect(value => 
            Effect.gen(function* (_) {
              // Simulate slow processing
              yield* _(Effect.sleep(1))
              return value
            })
          ),
          Stream.buffer(50), // Buffer to handle backpressure
          Stream.take(100)   // Take first 100 items
        )
        
        const startTime = performance.now()
        
        yield* _(
          slowConsumer.pipe(
            Stream.tap(value => Effect.sync(() => {
              processed.push(value)
            })),
            Stream.runDrain
          )
        )
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Should process requested items
        expect(processed.length).toBe(100)
        expect(processed[0]).toBe(0)
        expect(processed[99]).toBe(99)
        
        // Should complete within reasonable time considering processing delay
        expect(duration).toBeLessThan(5000) // 5 seconds
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream switching", async () => {
    const results: string[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const stream1 = createTestStream(["a", "b", "c"], 10)
        const stream2 = createTestStream(["x", "y", "z"], 10)
        
        // Switch between streams
        const switchingStream = Stream.fromIterable([stream1, stream2]).pipe(
          Stream.switch
        )
        
        yield* _(
          switchingStream.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        // Should get values from both streams
        expect(results.length).toBeGreaterThan(0)
        expect(results.some(v => ["a", "b", "c"].includes(v))).toBe(true)
        expect(results.some(v => ["x", "y", "z"].includes(v))).toBe(true)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle stream concurrency limits", async () => {
    const concurrencyLimit = 3
    const activeCount = Ref.unsafeMake(0)
    const maxActive = Ref.unsafeMake(0)
    const results: number[] = []
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const sourceStream = createTestStream([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)
        
        // Process with concurrency limit
        const limitedStream = sourceStream.pipe(
          Stream.mapEffect(value => 
            Effect.gen(function* (_) {
              // Track active operations
              const current = yield* _(Ref.updateAndGet(activeCount, n => n + 1))
              yield* _(Ref.update(maxActive, max => Math.max(max, current)))
              
              // Simulate work
              yield* _(Effect.sleep(50))
              
              yield* _(Ref.update(activeCount, n => n - 1))
              return value
            })
          ),
          Stream.withParallelism(concurrencyLimit)
        )
        
        yield* _(
          limitedStream.pipe(
            Stream.tap(value => Effect.sync(() => {
              results.push(value)
            })),
            Stream.runDrain
          )
        )
        
        const finalMaxActive = yield* _(Ref.get(maxActive))
        
        // Should process all items
        expect(results.length).toBe(10)
        
        // Should respect concurrency limit
        expect(finalMaxActive).toBeLessThanOrEqual(concurrencyLimit)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})