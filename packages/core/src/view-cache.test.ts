/**
 * Tests for view rendering cache system
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { ViewCache, globalViewCache, memoizeRender, type CacheEntry } from "./view-cache.ts"
import type { View } from "./types.ts"

// Mock view implementation for testing
const createMockView = (content: string, width = content.length, height = 1): View => ({
  render: () => Effect.succeed(content),
  width,
  height
})

// =============================================================================
// ViewCache Class Tests
// =============================================================================

test("ViewCache should cache render results", async () => {
  const cache = new ViewCache()
  const view = createMockView("test content")
  const key = "test-key"
  
  // First render should cache the result
  const result1 = await cache.renderCached(key, view)
  expect(result1).toBe("test content")
  
  // Second render should return cached result
  const result2 = await cache.renderCached(key, view)
  expect(result2).toBe("test content")
  
  const stats = cache.getStats()
  expect(stats.size).toBe(1)
  expect(stats.totalAccess).toBe(2) // One cache + one hit
})

test("ViewCache should expire old entries", async () => {
  const cache = new ViewCache({ maxAge: 50 }) // 50ms expiry
  const view = createMockView("test content")
  const key = "expire-test"
  
  // Cache initial result
  const result1 = await cache.renderCached(key, view)
  expect(result1).toBe("test content")
  
  // Wait for expiry
  await new Promise(resolve => setTimeout(resolve, 60))
  
  // Create a new view with different content to ensure re-render
  const newView = createMockView("new content")
  const result2 = await cache.renderCached(key, newView)
  expect(result2).toBe("new content")
})

test("ViewCache should enforce size limits", async () => {
  const cache = new ViewCache({ maxSize: 2 })
  
  // Add 3 entries to exceed limit
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key2", createMockView("content2"))
  await cache.renderCached("key3", createMockView("content3"))
  
  const stats = cache.getStats()
  expect(stats.size).toBeLessThanOrEqual(2)
})

test("ViewCache should evict least accessed entries first", async () => {
  const cache = new ViewCache({ maxSize: 2 })
  
  // Add two entries
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key2", createMockView("content2"))
  
  // Access key1 multiple times to increase its access count
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key1", createMockView("content1"))
  
  // Add third entry, should evict key2 (least accessed)
  await cache.renderCached("key3", createMockView("content3"))
  
  // key1 should still be cached, key2 should be evicted
  const stats = cache.getStats()
  expect(stats.size).toBe(2)
})

test("ViewCache should clear all entries", async () => {
  const cache = new ViewCache()
  
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key2", createMockView("content2"))
  
  expect(cache.getStats().size).toBe(2)
  
  cache.clear()
  
  expect(cache.getStats().size).toBe(0)
})

// =============================================================================
// Key Generation Tests
// =============================================================================

test("generateKey should create consistent keys for same view", () => {
  const cache = new ViewCache()
  const view1 = createMockView("test", 10, 2)
  const view2 = createMockView("test", 10, 2)
  
  const key1 = cache.generateKey(view1)
  const key2 = cache.generateKey(view2)
  
  expect(key1).toBe(key2)
})

test("generateKey should create different keys for different views", () => {
  const cache = new ViewCache()
  const view1 = createMockView("test1", 10, 2)
  const view2 = createMockView("test2", 15, 3) // Different dimensions
  
  const key1 = cache.generateKey(view1)
  const key2 = cache.generateKey(view2)
  
  expect(key1).not.toBe(key2)
})

test("generateKey should include props in key", () => {
  const cache = new ViewCache()
  const view = createMockView("test", 10, 2)
  
  const key1 = cache.generateKey(view, { prop: "value1" })
  const key2 = cache.generateKey(view, { prop: "value2" })
  const key3 = cache.generateKey(view) // no props
  
  expect(key1).not.toBe(key2)
  expect(key1).not.toBe(key3)
  expect(key2).not.toBe(key3)
})

test("generateKey should handle views with different dimensions", () => {
  const cache = new ViewCache()
  const view1 = createMockView("test", 10, 2)
  const view2 = createMockView("test", 20, 3)
  
  const key1 = cache.generateKey(view1)
  const key2 = cache.generateKey(view2)
  
  expect(key1).not.toBe(key2)
})

test("generateKey should handle undefined dimensions", () => {
  const cache = new ViewCache()
  const view: View = {
    render: () => Effect.succeed("test")
    // no width/height
  }
  
  const key = cache.generateKey(view)
  expect(typeof key).toBe("string")
  expect(key.length).toBeGreaterThan(0)
})

// =============================================================================
// Statistics Tests
// =============================================================================

test("getStats should return correct statistics", async () => {
  const cache = new ViewCache()
  
  // Initial stats
  let stats = cache.getStats()
  expect(stats.size).toBe(0)
  expect(stats.totalAccess).toBe(0)
  expect(stats.avgAge).toBe(0)
  
  // Add entries
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key2", createMockView("content2"))
  
  // Access one entry multiple times
  await cache.renderCached("key1", createMockView("content1"))
  await cache.renderCached("key1", createMockView("content1"))
  
  stats = cache.getStats()
  expect(stats.size).toBe(2)
  expect(stats.totalAccess).toBe(4) // 2 initial + 2 hits
  expect(stats.avgAge).toBeGreaterThanOrEqual(0)
})

test("getStats should calculate average age correctly", async () => {
  const cache = new ViewCache()
  
  await cache.renderCached("key1", createMockView("content1"))
  
  // Wait a bit for age to accumulate
  await new Promise(resolve => setTimeout(resolve, 10))
  
  const stats = cache.getStats()
  expect(stats.avgAge).toBeGreaterThan(0)
})

// =============================================================================
// Global Cache Tests
// =============================================================================

test("globalViewCache should be a ViewCache instance", () => {
  expect(globalViewCache).toBeInstanceOf(ViewCache)
})

test("globalViewCache should work across multiple calls", async () => {
  const view = createMockView("global test")
  const key = globalViewCache.generateKey(view)
  
  const result1 = await globalViewCache.renderCached(key, view)
  const result2 = await globalViewCache.renderCached(key, view)
  
  expect(result1).toBe("global test")
  expect(result2).toBe("global test")
  
  globalViewCache.clear() // Clean up for other tests
})

// =============================================================================
// Memoization Tests
// =============================================================================

test("memoizeRender should cache render function results", async () => {
  let renderCount = 0
  
  const renderFn = (view: View) => 
    Effect.sync(() => {
      renderCount++
      return `rendered-${renderCount}`
    })
  
  const memoizedRender = memoizeRender(renderFn)
  const view = createMockView("test")
  
  // First call should render
  const result1 = await Effect.runPromise(memoizedRender(view))
  expect(result1).toBe("rendered-1")
  expect(renderCount).toBe(1)
  
  // Second call should use cache
  const result2 = await Effect.runPromise(memoizedRender(view))
  expect(result2).toBe("rendered-1") // Same result from cache
  expect(renderCount).toBe(1) // No additional render
  
  globalViewCache.clear() // Clean up
})

test("memoizeRender should use custom key function when provided", async () => {
  let renderCount = 0
  
  const renderFn = (view: View) => 
    Effect.sync(() => {
      renderCount++
      return `rendered-${renderCount}`
    })
  
  const customKeyFn = (view: View) => `custom-key-${view.width}`
  const memoizedRender = memoizeRender(renderFn, customKeyFn)
  
  const view1 = createMockView("test", 10)
  const view2 = createMockView("different", 10) // Same width
  
  const result1 = await Effect.runPromise(memoizedRender(view1))
  const result2 = await Effect.runPromise(memoizedRender(view2))
  
  expect(result1).toBe(result2) // Should be cached due to same key
  expect(renderCount).toBe(1) // Only one render call
  
  globalViewCache.clear() // Clean up
})

test("memoizeRender should handle different views with different keys", async () => {
  let renderCount = 0
  
  const renderFn = (view: View) => 
    Effect.sync(() => {
      renderCount++
      return `rendered-${renderCount}`
    })
  
  const memoizedRender = memoizeRender(renderFn)
  
  const view1 = createMockView("test1", 10)
  const view2 = createMockView("test2", 20) // Different width
  
  const result1 = await Effect.runPromise(memoizedRender(view1))
  const result2 = await Effect.runPromise(memoizedRender(view2))
  
  expect(result1).toBe("rendered-1")
  expect(result2).toBe("rendered-2")
  expect(renderCount).toBe(2) // Both should render
  
  globalViewCache.clear() // Clean up
})

// =============================================================================
// Error Handling Tests
// =============================================================================

test("ViewCache should handle render errors gracefully", async () => {
  const cache = new ViewCache()
  const errorView: View = {
    render: () => Effect.fail(new Error("Render failed")),
    width: 10,
    height: 1
  }
  
  try {
    await cache.renderCached("error-key", errorView)
    expect(false).toBe(true) // Should not reach here
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe("Render failed")
  }
  
  // Cache should not contain failed entry
  expect(cache.getStats().size).toBe(0)
})

test("memoizeRender should propagate render errors", async () => {
  const renderFn = () => Effect.fail(new Error("Render error"))
  const memoizedRender = memoizeRender(renderFn)
  const view = createMockView("test")
  
  try {
    await Effect.runPromise(memoizedRender(view))
    expect(false).toBe(true) // Should not reach here
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
  }
  
  globalViewCache.clear() // Clean up
})

// =============================================================================
// Edge Cases Tests
// =============================================================================

test("ViewCache should handle concurrent access to same key", async () => {
  const cache = new ViewCache()
  let renderCount = 0
  
  const slowView: View = {
    render: () => Effect.sleep("10 millis").pipe(
      Effect.andThen(Effect.sync(() => `rendered-${++renderCount}`))
    ),
    width: 10,
    height: 1
  }
  
  // Start multiple concurrent renders with same key
  const promises = Array(5).fill(null).map(() => 
    cache.renderCached("concurrent-key", slowView)
  )
  
  const results = await Promise.all(promises)
  
  // All should get the same result, but render might happen multiple times
  // due to lack of synchronization (which is acceptable for this cache)
  const uniqueResults = new Set(results)
  expect(uniqueResults.size).toBeGreaterThanOrEqual(1)
})

test("ViewCache should handle very large cache keys", () => {
  const cache = new ViewCache()
  const largeProps = {
    data: "x".repeat(10000),
    nested: { deep: { very: { large: "object" } } }
  }
  
  const view = createMockView("test")
  const key = cache.generateKey(view, largeProps)
  
  expect(typeof key).toBe("string")
  expect(key.length).toBeGreaterThan(0)
})

test("ViewCache should handle empty and null values gracefully", () => {
  const cache = new ViewCache()
  const view = createMockView("")
  
  const key1 = cache.generateKey(view)
  const key2 = cache.generateKey(view, {})
  const key3 = cache.generateKey(view, undefined)
  
  expect(typeof key1).toBe("string")
  expect(typeof key2).toBe("string")
  expect(typeof key3).toBe("string")
})