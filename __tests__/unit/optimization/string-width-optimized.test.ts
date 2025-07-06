/**
 * String Width Optimization Tests
 */

import { test, describe, expect, beforeEach } from "bun:test"
import { 
  stringWidthOptimized, 
  stringWidthNoAnsi, 
  padStringOptimized, 
  truncateStringOptimized,
  clearWidthCache,
  getWidthCacheStats
} from "../../../src/utils/string-width-optimized"

describe("String Width Optimization", () => {
  beforeEach(() => {
    clearWidthCache()
  })

  describe("stringWidthOptimized", () => {
    test("handles ASCII strings", () => {
      expect(stringWidthOptimized("hello")).toBe(5)
      expect(stringWidthOptimized("")).toBe(0)
      expect(stringWidthOptimized("a")).toBe(1)
    })

    test("handles Unicode strings", () => {
      expect(stringWidthOptimized("世界")).toBe(4) // Wide characters
      expect(stringWidthOptimized("🎨")).toBe(2) // Emoji
      expect(stringWidthOptimized("café")).toBe(4) // Latin with accent
    })

    test("handles mixed content", () => {
      // Note: The exact width may depend on emoji handling
      expect(stringWidthOptimized("Hello 世界 🎨")).toBeGreaterThan(8)
      expect(stringWidthOptimized("Test 测试 ✅")).toBeGreaterThan(6)
    })

    test("handles control characters", () => {
      expect(stringWidthOptimized("hello\x00world")).toBe(10) // Null character
      expect(stringWidthOptimized("hello\tworld")).toBe(10) // Tab
      expect(stringWidthOptimized("hello\nworld")).toBe(10) // Newline
    })

    test("caches results", () => {
      const testString = "expensive calculation"
      
      // First call
      const result1 = stringWidthOptimized(testString)
      
      // Second call should be cached
      const result2 = stringWidthOptimized(testString)
      
      expect(result1).toBe(result2)
      expect(result1).toBe(21)
      
      const stats = getWidthCacheStats()
      expect(stats.size).toBe(1)
    })
  })

  describe("stringWidthNoAnsi", () => {
    test("removes ANSI escape sequences", () => {
      expect(stringWidthNoAnsi("\x1b[31mHello\x1b[0m")).toBe(5)
      expect(stringWidthNoAnsi("\x1b[1;32mWorld\x1b[0m")).toBe(5)
      expect(stringWidthNoAnsi("Plain text")).toBe(10)
    })

    test("handles complex ANSI sequences", () => {
      const complexAnsi = "\x1b[38;5;196m\x1b[48;5;21m\x1b[1mTest\x1b[0m"
      expect(stringWidthNoAnsi(complexAnsi)).toBe(4)
    })
  })

  describe("padStringOptimized", () => {
    test("pads strings to width", () => {
      expect(padStringOptimized("test", 8)).toBe("test    ")
      expect(padStringOptimized("longer", 4)).toBe("longer")
      expect(padStringOptimized("", 3)).toBe("   ")
    })

    test("handles Unicode content", () => {
      expect(padStringOptimized("世界", 6)).toBe("世界  ")
      expect(padStringOptimized("🎨", 4)).toBe("🎨  ")
    })

    test("uses custom padding character", () => {
      expect(padStringOptimized("test", 8, "-")).toBe("test----")
      expect(padStringOptimized("x", 3, "0")).toBe("x00")
    })
  })

  describe("truncateStringOptimized", () => {
    test("truncates long strings", () => {
      expect(truncateStringOptimized("hello world", 8)).toBe("hello...")
      expect(truncateStringOptimized("short", 10)).toBe("short")
      expect(truncateStringOptimized("exact", 5)).toBe("exact")
    })

    test("handles Unicode truncation", () => {
      const result1 = truncateStringOptimized("世界测试", 5)
      const result2 = truncateStringOptimized("🎨🌟✨", 4)
      
      expect(result1).toContain("...")
      expect(result2).toContain("...")
      expect(stringWidthOptimized(result1)).toBeLessThanOrEqual(5)
      expect(stringWidthOptimized(result2)).toBeLessThanOrEqual(4)
    })

    test("uses custom suffix", () => {
      expect(truncateStringOptimized("hello world", 8, ">>")).toBe("hello >>")
      expect(truncateStringOptimized("test", 6, " more")).toBe("test")
    })

    test("handles edge cases", () => {
      expect(truncateStringOptimized("", 5)).toBe("")
      
      // When maxWidth is 0, return empty string
      expect(truncateStringOptimized("test", 0, "...")).toBe("")
      
      // When maxWidth is small, should return appropriate result
      const result = truncateStringOptimized("test", 3, "...")
      expect(stringWidthOptimized(result)).toBeLessThanOrEqual(3)
      // Could be "..." if no room for content, or truncated content
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("cache management", () => {
    test("clears cache", () => {
      stringWidthOptimized("test1")
      stringWidthOptimized("test2")
      
      let stats = getWidthCacheStats()
      expect(stats.size).toBe(2)
      
      clearWidthCache()
      
      stats = getWidthCacheStats()
      expect(stats.size).toBe(0)
    })

    test("respects cache size limits", () => {
      // Generate many unique strings to test cache limits
      for (let i = 0; i < 15000; i++) {
        stringWidthOptimized(`test-string-${i}`)
      }
      
      const stats = getWidthCacheStats()
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })
  })

  describe("performance characteristics", () => {
    test("ASCII fast path", () => {
      const asciiString = "Simple ASCII text"
      
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        stringWidthOptimized(asciiString)
      }
      const end = performance.now()
      
      // Should be very fast due to caching
      expect(end - start).toBeLessThan(10)
    })

    test("Unicode handling", () => {
      const unicodeString = "复杂的Unicode字符串 🎨✨🌟"
      
      const start = performance.now()
      stringWidthOptimized(unicodeString)
      const end = performance.now()
      
      // Should complete reasonably quickly
      expect(end - start).toBeLessThan(5)
    })
  })
})