/**
 * Tests for View Cache System
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import {
  ViewCache,
  globalViewCache,
  memoizeRender,
  type CacheEntry
} from "@/core/view-cache"
import type { View } from "@/core/types"
import { RenderError } from "@/core/types"

// Mock view helpers
const createMockView = (content: string, width = 10, height = 1): View => ({
  render: () => Effect.succeed(content),
  width,
  height
})

const createAsyncMockView = (content: string, delay = 0): View => ({
  render: () => Effect.delay(Effect.succeed(content), `${delay} millis`),
  width: content.length,
  height: 1
})

describe("View Cache System", () => {
  describe("CacheEntry interface", () => {
    it("defines cache entry structure", () => {
      const entry: CacheEntry = {
        rendered: "test content",
        timestamp: Date.now(),
        accessCount: 1
      }
      
      expect(entry.rendered).toBe("test content")
      expect(typeof entry.timestamp).toBe("number")
      expect(entry.accessCount).toBe(1)
    })
  })

  describe("ViewCache class", () => {
    let cache: ViewCache

    beforeEach(() => {
      cache = new ViewCache()
    })

    describe("constructor", () => {
      it("creates cache with default options", () => {
        const cache = new ViewCache()
        expect(cache).toBeDefined()
      })

      it("accepts custom maxSize option", () => {
        const cache = new ViewCache({ maxSize: 500 })
        expect(cache).toBeDefined()
      })

      it("accepts custom maxAge option", () => {
        const cache = new ViewCache({ maxAge: 60000 })
        expect(cache).toBeDefined()
      })

      it("accepts both custom options", () => {
        const cache = new ViewCache({ maxSize: 200, maxAge: 15000 })
        expect(cache).toBeDefined()
      })
    })

    describe("renderCached", () => {
      it("renders and caches new view", async () => {
        const view = createMockView("test content")
        const key = "test-key"
        
        const result = await cache.renderCached(key, view)
        
        expect(result).toBe("test content")
      })

      it("returns cached result on second call", async () => {
        const view = createMockView("cached content")
        const key = "cache-test"
        
        // First call - should render and cache
        const result1 = await cache.renderCached(key, view)
        expect(result1).toBe("cached content")
        
        // Second call - should return cached
        const result2 = await cache.renderCached(key, view)
        expect(result2).toBe("cached content")
      })

      it("increments access count on cache hit", async () => {
        const view = createMockView("access test")
        const key = "access-key"
        
        // Multiple accesses
        await cache.renderCached(key, view)
        await cache.renderCached(key, view)
        await cache.renderCached(key, view)
        
        const stats = cache.getStats()
        expect(stats.totalAccess).toBeGreaterThanOrEqual(3)
      })

      it("handles async render functions", async () => {
        const view = createAsyncMockView("async content", 10)
        const key = "async-key"
        
        const result = await cache.renderCached(key, view)
        
        expect(result).toBe("async content")
      })

      it("renders different results for different keys", async () => {
        const view1 = createMockView("content 1")
        const view2 = createMockView("content 2")
        
        const result1 = await cache.renderCached("key1", view1)
        const result2 = await cache.renderCached("key2", view2)
        
        expect(result1).toBe("content 1")
        expect(result2).toBe("content 2")
      })

      it("overwrites expired cache entries", async () => {
        const shortCache = new ViewCache({ maxAge: 1 }) // 1ms expiry
        const view = createMockView("expires quickly")
        const key = "expire-test"
        
        // First render
        const result1 = await shortCache.renderCached(key, view)
        expect(result1).toBe("expires quickly")
        
        // Wait for expiry
        await new Promise(resolve => setTimeout(resolve, 5))
        
        // Should re-render (not return cached)
        const result2 = await shortCache.renderCached(key, view)
        expect(result2).toBe("expires quickly")
      })
    })

    describe("generateKey", () => {
      it("generates consistent keys for same view", () => {
        const view = createMockView("test")
        
        const key1 = cache.generateKey(view)
        const key2 = cache.generateKey(view)
        
        expect(key1).toBe(key2)
      })

      it("generates different keys for different views", () => {
        const view1 = createMockView("content 1", 10, 1)
        const view2 = createMockView("content 2", 15, 2)
        
        const key1 = cache.generateKey(view1)
        const key2 = cache.generateKey(view2)
        
        expect(key1).not.toBe(key2)
      })

      it("includes props in key generation", () => {
        const view = createMockView("test")
        
        const key1 = cache.generateKey(view, { prop: "value1" })
        const key2 = cache.generateKey(view, { prop: "value2" })
        
        expect(key1).not.toBe(key2)
      })

      it("handles views without props", () => {
        const view = createMockView("no props")
        
        const key = cache.generateKey(view)
        
        expect(typeof key).toBe("string")
        expect(key.length).toBeGreaterThan(0)
      })

      it("includes view dimensions in key", () => {
        const view1 = createMockView("test", 10, 1)
        const view2 = createMockView("test", 20, 2)
        
        const key1 = cache.generateKey(view1)
        const key2 = cache.generateKey(view2)
        
        expect(key1).not.toBe(key2)
      })

      it("handles views with type property", () => {
        const view = {
          ...createMockView("typed"),
          type: "custom-type"
        }
        
        const key = cache.generateKey(view)
        
        expect(typeof key).toBe("string")
        expect(key.length).toBeGreaterThan(0)
      })

      it("handles complex nested props", () => {
        const view = createMockView("complex")
        const complexProps = {
          nested: { level1: { level2: "deep" } },
          array: [1, 2, 3],
          mixed: { str: "value", num: 42, bool: true }
        }
        
        const key = cache.generateKey(view, complexProps)
        
        expect(typeof key).toBe("string")
        expect(key.length).toBeGreaterThan(0)
      })
    })

    describe("clear", () => {
      it("removes all cache entries", async () => {
        const view1 = createMockView("clear test 1")
        const view2 = createMockView("clear test 2")
        
        // Cache some entries
        await cache.renderCached("key1", view1)
        await cache.renderCached("key2", view2)
        
        let stats = cache.getStats()
        expect(stats.size).toBeGreaterThan(0)
        
        // Clear cache
        cache.clear()
        
        stats = cache.getStats()
        expect(stats.size).toBe(0)
      })
    })

    describe("getStats", () => {
      it("returns cache statistics", async () => {
        const view = createMockView("stats test")
        
        // Empty cache stats
        let stats = cache.getStats()
        expect(stats.size).toBe(0)
        expect(stats.totalAccess).toBe(0)
        expect(stats.avgAge).toBe(0)
        
        // Add some entries
        await cache.renderCached("stats1", view)
        await cache.renderCached("stats2", view)
        
        stats = cache.getStats()
        expect(stats.size).toBe(2)
        expect(stats.totalAccess).toBe(2)
        expect(stats.avgAge).toBeGreaterThanOrEqual(0)
      })

      it("calculates total access correctly", async () => {
        const view = createMockView("access stats")
        
        // Multiple accesses to same key
        await cache.renderCached("access-key", view)
        await cache.renderCached("access-key", view) // Cache hit
        await cache.renderCached("access-key", view) // Cache hit
        
        const stats = cache.getStats()
        expect(stats.totalAccess).toBe(3)
      })

      it("calculates average age", async () => {
        const view = createMockView("age test")
        
        await cache.renderCached("age-key", view)
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const stats = cache.getStats()
        expect(stats.avgAge).toBeGreaterThan(0)
      })
    })

    describe("cache eviction", () => {
      it("evicts expired entries", async () => {
        const shortCache = new ViewCache({ maxAge: 10 }) // 10ms
        const view = createMockView("eviction test")
        
        // Add entry
        await shortCache.renderCached("evict-key", view)
        
        let stats = shortCache.getStats()
        expect(stats.size).toBe(1)
        
        // Wait for expiry and trigger eviction
        await new Promise(resolve => setTimeout(resolve, 15))
        await shortCache.renderCached("trigger-eviction", view)
        
        stats = shortCache.getStats()
        expect(stats.size).toBe(1) // Only the new entry should remain
      })

      it("evicts least accessed entries when size limit exceeded", async () => {
        const smallCache = new ViewCache({ maxSize: 2 })
        
        // Add entries up to limit
        await smallCache.renderCached("key1", createMockView("content1"))
        await smallCache.renderCached("key2", createMockView("content2"))
        
        // Access key1 multiple times to make it more frequently used
        await smallCache.renderCached("key1", createMockView("content1"))
        await smallCache.renderCached("key1", createMockView("content1"))
        
        let stats = smallCache.getStats()
        expect(stats.size).toBe(2)
        
        // Add third entry (should evict least accessed)
        await smallCache.renderCached("key3", createMockView("content3"))
        
        stats = smallCache.getStats()
        expect(stats.size).toBe(2) // Should still be 2 after eviction
      })
    })
  })

  describe("globalViewCache", () => {
    it("provides global cache instance", () => {
      expect(globalViewCache).toBeDefined()
      expect(globalViewCache instanceof ViewCache).toBe(true)
    })

    it("can be used across modules", async () => {
      const view = createMockView("global test")
      const key = "global-key"
      
      const result = await globalViewCache.renderCached(key, view)
      
      expect(result).toBe("global test")
    })
  })

  describe("memoizeRender", () => {
    beforeEach(() => {
      globalViewCache.clear()
    })

    it("creates memoized render function", () => {
      const renderFn = (view: View) => view.render()
      const memoized = memoizeRender(renderFn)
      
      expect(typeof memoized).toBe("function")
    })

    it("caches render results", async () => {
      const view = createMockView("memoized content")
      
      const renderFn = (v: View) => v.render()
      const memoized = memoizeRender(renderFn)
      
      // First call
      const result1 = await Effect.runPromise(memoized(view))
      expect(result1).toBe("memoized content")
      
      // Second call should use cache
      const result2 = await Effect.runPromise(memoized(view))
      expect(result2).toBe("memoized content")
    })

    it("uses custom key function when provided", async () => {
      const view = createMockView("custom key test")
      
      const renderFn = (v: View) => v.render()
      const customKeyFn = (v: View) => `custom-${v.width}-${v.height}`
      const memoized = memoizeRender(renderFn, customKeyFn)
      
      const result = await Effect.runPromise(memoized(view))
      expect(result).toBe("custom key test")
    })

    it("handles render errors appropriately", async () => {
      const errorView: View = {
        render: () => Effect.fail(new RenderError({ 
          phase: "render",
          cause: "Render error" 
        })),
        width: 10,
        height: 1
      }
      
      const renderFn = (v: View) => v.render()
      const memoized = memoizeRender(renderFn)
      
      const effect = memoized(errorView)
      
      // Should propagate the error
      await expect(Effect.runPromise(effect)).rejects.toBeDefined()
    })

    it("works with async render functions", async () => {
      const asyncView = createAsyncMockView("async memoized", 5)
      
      const renderFn = (v: View) => v.render()
      const memoized = memoizeRender(renderFn)
      
      const result = await Effect.runPromise(memoized(asyncView))
      expect(result).toBe("async memoized")
    })
  })

  describe("integration scenarios", () => {
    beforeEach(() => {
      globalViewCache.clear()
    })

    it("handles high-frequency rendering", async () => {
      const cache = new ViewCache({ maxSize: 100 })
      const views = Array.from({ length: 50 }, (_, i) => 
        createMockView(`content-${i}`, 10, 1)
      )
      
      // Render all views multiple times
      const results = []
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < views.length; i++) {
          const view = views[i]
          if (view) {
            const result = await cache.renderCached(`key-${i}`, view)
            results.push(result)
          }
        }
      }
      
      expect(results).toHaveLength(150) // 50 views * 3 rounds
      
      const stats = cache.getStats()
      expect(stats.size).toBe(50)
      expect(stats.totalAccess).toBe(150)
    })

    it("maintains performance under memory pressure", async () => {
      const cache = new ViewCache({ maxSize: 10, maxAge: 50 })
      
      // Add many entries to trigger eviction
      for (let i = 0; i < 20; i++) {
        const view = createMockView(`pressure-${i}`)
        await cache.renderCached(`pressure-key-${i}`, view)
      }
      
      const stats = cache.getStats()
      expect(stats.size).toBeLessThanOrEqual(10) // Should respect max size
    })

    it("handles complex view hierarchies", async () => {
      const cache = new ViewCache()
      
      // Simulate nested/complex views
      const complexView: View = {
        render: () => Effect.succeed("complex-rendered"),
        width: 100,
        height: 20
      }
      
      const key = cache.generateKey(complexView, {
        nested: { component: "inner", props: { value: 42 } }
      })
      
      const result = await cache.renderCached(key, complexView)
      expect(result).toBe("complex-rendered")
      
      // Should cache and return same result
      const cachedResult = await cache.renderCached(key, complexView)
      expect(cachedResult).toBe("complex-rendered")
    })

    it("works with memoized render functions in real scenarios", async () => {
      const renderFn = (view: View) => Effect.delay(view.render(), "1 millis")
      const memoized = memoizeRender(renderFn)
      
      const views = [
        createMockView("header content", 10, 1),
        createMockView("body content", 15, 1),
        createMockView("footer content", 20, 1)
      ]
      
      // Render multiple times (simulating re-renders)
      const results = []
      for (let round = 0; round < 3; round++) {
        for (const view of views) {
          const result = await Effect.runPromise(memoized(view))
          results.push(result)
        }
      }
      
      expect(results).toContain("header content")
      expect(results).toContain("body content") 
      expect(results).toContain("footer content")
      expect(results).toHaveLength(9)
    })
  })

  describe("performance characteristics", () => {
    it("provides faster access for cached items", async () => {
      const cache = new ViewCache()
      const slowView: View = {
        render: () => Effect.delay(Effect.succeed("slow content"), "20 millis"),
        width: 10,
        height: 1
      }
      
      // First render (slow)
      const start1 = Date.now()
      const result1 = await cache.renderCached("slow-key", slowView)
      const time1 = Date.now() - start1
      
      // Second render (cached - should be faster)
      const start2 = Date.now()
      const result2 = await cache.renderCached("slow-key", slowView)
      const time2 = Date.now() - start2
      
      expect(result1).toBe("slow content")
      expect(result2).toBe("slow content")
      expect(time2).toBeLessThan(time1) // Cached should be faster
    })

    it("handles large cache sizes efficiently", async () => {
      const cache = new ViewCache({ maxSize: 1000 })
      
      // Add many entries
      for (let i = 0; i < 500; i++) {
        const view = createMockView(`large-cache-${i}`)
        await cache.renderCached(`large-key-${i}`, view)
      }
      
      const stats = cache.getStats()
      expect(stats.size).toBe(500)
      
      // Should still be performant for lookups
      const start = Date.now()
      await cache.renderCached("large-key-250", createMockView("lookup-test"))
      const lookupTime = Date.now() - start
      
      expect(lookupTime).toBeLessThan(10) // Should be fast
    })
  })
})