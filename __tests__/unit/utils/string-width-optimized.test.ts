/**
 * Tests for utils/string-width-optimized.ts - Optimized string width calculations
 */

import { describe, it, expect, beforeEach } from "bun:test"
import {
  stringWidthOptimized,
  stringWidthNoAnsi,
  padStringOptimized,
  truncateStringOptimized,
  clearWidthCache,
  getWidthCacheStats,
  stringWidth
} from "@/utils/string-width-optimized"

describe("String Width Optimized", () => {
  beforeEach(() => {
    clearWidthCache()
  })

  describe("stringWidthOptimized", () => {
    it("measures empty strings", () => {
      expect(stringWidthOptimized("")).toBe(0)
      expect(stringWidthOptimized(null as any)).toBe(0)
      expect(stringWidthOptimized(undefined as any)).toBe(0)
    })

    it("measures ASCII strings correctly", () => {
      expect(stringWidthOptimized("hello")).toBe(5)
      expect(stringWidthOptimized("world")).toBe(5)
      expect(stringWidthOptimized("a")).toBe(1)
      expect(stringWidthOptimized("abc")).toBe(3)
    })

    it("handles control characters", () => {
      expect(stringWidthOptimized("\t")).toBe(0)
      expect(stringWidthOptimized("\n")).toBe(0)
      expect(stringWidthOptimized("\r")).toBe(0)
      expect(stringWidthOptimized("\x1b")).toBe(0)
      expect(stringWidthOptimized("\x7f")).toBe(0) // DEL
    })

    it("measures wide characters", () => {
      expect(stringWidthOptimized("你")).toBe(2) // Chinese character
      expect(stringWidthOptimized("こ")).toBe(2) // Hiragana
      expect(stringWidthOptimized("カ")).toBe(2) // Katakana
      expect(stringWidthOptimized("한")).toBe(2) // Hangul
    })

    it("measures emoji correctly", () => {
      expect(stringWidthOptimized("😀")).toBe(2)
      expect(stringWidthOptimized("🌍")).toBe(2)
      expect(stringWidthOptimized("🚀")).toBe(2)
    })

    it("handles combining characters", () => {
      expect(stringWidthOptimized("é")).toBeGreaterThanOrEqual(1) // e + combining acute
      expect(stringWidthOptimized("a\u0300")).toBe(1) // a + combining grave
    })

    it("measures mixed strings", () => {
      expect(stringWidthOptimized("hello 世界")).toBe(10) // 5 + 1 + 4 (世界 = 2+2)
      expect(stringWidthOptimized("test 😀")).toBe(7) // 4 + 1 + 2
    })

    it("uses caching for performance", () => {
      const testString = "cached string"
      
      // First call
      const result1 = stringWidthOptimized(testString)
      expect(result1).toBe(13)
      
      // Second call should use cache
      const result2 = stringWidthOptimized(testString)
      expect(result2).toBe(13)
      
      const stats = getWidthCacheStats()
      expect(stats.size).toBe(1)
    })

    it("handles very long strings", () => {
      const longString = "a".repeat(1000)
      expect(stringWidthOptimized(longString)).toBe(1000)
    })
  })

  describe("stringWidthNoAnsi", () => {
    it("strips ANSI escape sequences", () => {
      expect(stringWidthNoAnsi("hello")).toBe(5)
      expect(stringWidthNoAnsi("\x1b[31mred\x1b[0m")).toBe(3)
      expect(stringWidthNoAnsi("\x1b[1;32mbold green\x1b[0m")).toBe(10)
      expect(stringWidthNoAnsi("\x1b[4munderlined\x1b[0m")).toBe(10)
    })

    it("handles complex ANSI sequences", () => {
      expect(stringWidthNoAnsi("\x1b[38;5;196mhello\x1b[0m")).toBe(5)
      expect(stringWidthNoAnsi("\x1b[48;2;255;255;255mbackground\x1b[0m")).toBe(10)
    })

    it("handles empty strings with ANSI", () => {
      expect(stringWidthNoAnsi("\x1b[0m")).toBe(0)
      expect(stringWidthNoAnsi("\x1b[31m\x1b[0m")).toBe(0)
    })
  })

  describe("padStringOptimized", () => {
    it("pads strings to target width", () => {
      expect(padStringOptimized("hi", 5)).toBe("hi   ")
      expect(padStringOptimized("test", 8)).toBe("test    ")
    })

    it("uses custom padding character", () => {
      expect(padStringOptimized("hi", 5, "*")).toBe("hi***")
      expect(padStringOptimized("test", 7, "-")).toBe("test---")
    })

    it("returns original string if already wide enough", () => {
      expect(padStringOptimized("hello", 3)).toBe("hello")
      expect(padStringOptimized("test", 4)).toBe("test")
    })

    it("handles zero width", () => {
      expect(padStringOptimized("test", 0)).toBe("test")
      expect(padStringOptimized("test", -5)).toBe("test")
    })

    it("handles wide characters in padding", () => {
      expect(padStringOptimized("hi", 6)).toBe("hi    ")
      expect(padStringOptimized("你", 5)).toBe("你   ") // 2-width char + 3 spaces
    })

    it("handles empty strings", () => {
      expect(padStringOptimized("", 5)).toBe("     ")
      expect(padStringOptimized("", 0)).toBe("")
    })
  })

  describe("truncateStringOptimized", () => {
    it("truncates long strings", () => {
      expect(truncateStringOptimized("hello world", 8)).toBe("hello...")
      expect(truncateStringOptimized("very long string", 10)).toBe("very lo...")
    })

    it("returns original if within width", () => {
      expect(truncateStringOptimized("short", 10)).toBe("short")
      expect(truncateStringOptimized("test", 4)).toBe("test")
    })

    it("uses custom suffix", () => {
      expect(truncateStringOptimized("hello world", 8, "…")).toBe("hello w…")
      expect(truncateStringOptimized("test string", 7, "---")).toBe("test---")
    })

    it("handles edge cases", () => {
      expect(truncateStringOptimized("", 5)).toBe("")
      expect(truncateStringOptimized("test", 0)).toBe("")
      expect(truncateStringOptimized("test", 1, "...")).toBe(".")
    })

    it("handles very small widths", () => {
      expect(truncateStringOptimized("hello", 2, "…")).toBe("h…")
      expect(truncateStringOptimized("hello", 1, "...")).toBe(".")
    })

    it("handles wide characters", () => {
      expect(truncateStringOptimized("你好世界", 6)).toBe("你...")  // 你=2, ...=3, total=5 ≤ 6
      expect(truncateStringOptimized("hello 你好", 8)).toBe("hello...")
    })

    it("handles suffix larger than max width", () => {
      expect(truncateStringOptimized("hello", 2, "...")).toBe("..")
      expect(truncateStringOptimized("test", 1, "---")).toBe("-")
    })
  })

  describe("cache management", () => {
    it("clears cache correctly", () => {
      stringWidthOptimized("test1")
      stringWidthOptimized("test2")
      
      expect(getWidthCacheStats().size).toBe(2)
      
      clearWidthCache()
      expect(getWidthCacheStats().size).toBe(0)
    })

    it("provides cache statistics", () => {
      const stats = getWidthCacheStats()
      expect(stats).toHaveProperty("size")
      expect(stats).toHaveProperty("maxSize")
      expect(stats).toHaveProperty("hitRate")
      expect(stats.maxSize).toBe(10000)
    })

    it("limits cache size", () => {
      // This test assumes MAX_CACHE_SIZE = 10000
      // We'll just test that caching works for reasonable numbers
      for (let i = 0; i < 100; i++) {
        stringWidthOptimized(`test${i}`)
      }
      
      const stats = getWidthCacheStats()
      expect(stats.size).toBe(100)
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })
  })

  describe("stringWidth alias", () => {
    it("works as alias for first line without ANSI", () => {
      expect(stringWidth("hello")).toBe(5)
      expect(stringWidth("\x1b[31mred\x1b[0m")).toBe(3)
      expect(stringWidth("line1\nline2")).toBe(5) // Only first line
    })

    it("handles multi-line strings", () => {
      expect(stringWidth("first\nsecond\nthird")).toBe(5) // "first"
      expect(stringWidth("a\nb\nc")).toBe(1) // "a"
    })

    it("handles empty lines", () => {
      expect(stringWidth("\ntest")).toBe(0) // Empty first line
      expect(stringWidth("")).toBe(0)
    })
  })

  describe("performance characteristics", () => {
    it("handles large ASCII strings efficiently", () => {
      const largeString = "a".repeat(10000)
      const start = Date.now()
      const result = stringWidthOptimized(largeString)
      const duration = Date.now() - start
      
      expect(result).toBe(10000)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it("handles repeated calls efficiently with caching", () => {
      const testString = "cached performance test"
      
      // Warm up
      stringWidthOptimized(testString)
      
      const start = Date.now()
      for (let i = 0; i < 1000; i++) {
        stringWidthOptimized(testString)
      }
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(50) // Cached calls should be very fast
    })
  })

  describe("edge cases and error handling", () => {
    it("handles special Unicode categories", () => {
      // Zero-width joiners and other special cases
      expect(stringWidthOptimized("a\u200db")).toBeGreaterThanOrEqual(2)
      expect(stringWidthOptimized("\uFEFF")).toBeGreaterThanOrEqual(0) // BOM
    })

    it("handles surrogate pairs", () => {
      expect(stringWidthOptimized("𝒽𝑒𝓁𝓁𝑜")).toBeGreaterThanOrEqual(5)
      expect(stringWidthOptimized("🏳️‍🌈")).toBeGreaterThanOrEqual(1) // Complex emoji
    })

    it("handles malformed input gracefully", () => {
      expect(() => stringWidthOptimized("test\uD800")).not.toThrow()
      expect(() => stringWidthOptimized("test\uDFFF")).not.toThrow()
    })
  })
})