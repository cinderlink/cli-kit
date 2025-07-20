/**
 * Style Rendering Optimization Tests
 */

import { test, describe, expect, beforeEach } from "bun:test"
import { 
  renderStyleOptimized, 
  styledTextOptimized,
  clearStyleCache,
  getStyleCacheStats
} from "../../../src/styling/render-optimized"

describe("Style Rendering Optimization", () => {
  beforeEach(() => {
    clearStyleCache()
  })

  describe("renderStyleOptimized", () => {
    test("handles empty style", () => {
      expect(renderStyleOptimized({})).toBe("")
    })

    test("renders basic text decorations", () => {
      expect(renderStyleOptimized({ bold: true })).toContain("\x1b[1m")
      expect(renderStyleOptimized({ italic: true })).toContain("\x1b[3m")
      expect(renderStyleOptimized({ underline: true })).toContain("\x1b[4m")
      expect(renderStyleOptimized({ faint: true })).toContain("\x1b[2m")
    })

    test("renders named colors", () => {
      expect(renderStyleOptimized({ foreground: "red" })).toContain("\x1b[31m")
      expect(renderStyleOptimized({ foreground: "blue" })).toContain("\x1b[34m")
      expect(renderStyleOptimized({ foreground: "green" })).toContain("\x1b[32m")
    })

    test("renders background colors", () => {
      expect(renderStyleOptimized({ background: "red" })).toContain("\x1b[41m")
      expect(renderStyleOptimized({ background: "blue" })).toContain("\x1b[44m")
    })

    test("handles hex colors", () => {
      const result = renderStyleOptimized({ foreground: "#ff0000" })
      expect(result).toContain("\x1b[38;5;")
    })

    test("handles rgb colors", () => {
      const result = renderStyleOptimized({ foreground: "rgb(255, 0, 0)" })
      expect(result).toContain("\x1b[38;5;")
    })

    test("combines multiple styles", () => {
      const result = renderStyleOptimized({
        foreground: "blue",
        background: "white",
        bold: true,
        underline: true
      })
      
      expect(result).toContain("\x1b[34m") // blue
      expect(result).toContain("\x1b[47m") // white background
      expect(result).toContain("\x1b[1m")  // bold
      expect(result).toContain("\x1b[4m")  // underline
    })

    test("caches style calculations", () => {
      const style = { foreground: "blue", bold: true }
      
      // First call
      const result1 = renderStyleOptimized(style)
      
      // Second call should be cached
      const result2 = renderStyleOptimized(style)
      
      expect(result1).toBe(result2)
      
      const stats = getStyleCacheStats()
      expect(stats.size).toBe(1)
    })
  })

  describe("styledTextOptimized", () => {
    test("returns plain text for empty style", () => {
      expect(styledTextOptimized("hello", {})).toBe("hello")
    })

    test("returns empty string for empty text", () => {
      expect(styledTextOptimized("", { bold: true })).toBe("")
    })

    test("wraps text with style codes", () => {
      const result = styledTextOptimized("hello", { bold: true })
      expect(result).toBe("\x1b[1mhello\x1b[0m")
    })

    test("handles complex styling", () => {
      const result = styledTextOptimized("test", {
        foreground: "red",
        background: "white", 
        bold: true,
        underline: true
      })
      
      expect(result).toMatch(/^\x1b\[.*mtest\x1b\[0m$/)
      expect(result).toContain("test")
      expect(result).toContain("\x1b[0m") // Reset at end
    })

    test("handles Unicode text", () => {
      const result = styledTextOptimized("世界 🎨", { bold: true })
      expect(result).toBe("\x1b[1m世界 🎨\x1b[0m")
    })
  })

  describe("cache management", () => {
    test("clears style cache", () => {
      renderStyleOptimized({ bold: true })
      renderStyleOptimized({ italic: true })
      
      let stats = getStyleCacheStats()
      expect(stats.size).toBe(2)
      
      clearStyleCache()
      
      stats = getStyleCacheStats()
      expect(stats.size).toBe(0)
    })

    test("provides cache statistics", () => {
      renderStyleOptimized({ bold: true })
      renderStyleOptimized({ italic: true })
      renderStyleOptimized({ underline: true })
      
      const stats = getStyleCacheStats()
      expect(stats.size).toBe(3)
      expect(Array.isArray(stats.entries)).toBe(true)
      expect(stats.entries.length).toBe(3)
    })
  })

  describe("performance characteristics", () => {
    test("fast style rendering", () => {
      const style = { foreground: "blue", bold: true, underline: true }
      
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        renderStyleOptimized(style)
      }
      const end = performance.now()
      
      // Should be very fast due to caching
      expect(end - start).toBeLessThan(10)
    })

    test("fast text styling", () => {
      const style = { foreground: "red", bold: true }
      
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        styledTextOptimized("test text", style)
      }
      const end = performance.now()
      
      // Should be fast
      expect(end - start).toBeLessThan(20)
    })
  })

  describe("edge cases", () => {
    test("handles invalid color names gracefully", () => {
      const result = renderStyleOptimized({ foreground: "invalidcolor" })
      // Should not crash, may return empty string
      expect(typeof result).toBe("string")
    })

    test("handles malformed hex colors", () => {
      const result = renderStyleOptimized({ foreground: "#gggggg" })
      expect(typeof result).toBe("string")
    })

    test("handles malformed rgb colors", () => {
      const result = renderStyleOptimized({ foreground: "rgb(invalid)" })
      expect(typeof result).toBe("string")
    })

    test("handles null/undefined styles", () => {
      expect(renderStyleOptimized(null as any)).toBe("")
      expect(renderStyleOptimized(undefined as any)).toBe("")
    })
  })
})