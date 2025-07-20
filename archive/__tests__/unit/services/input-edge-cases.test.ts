/**
 * Tests for input service edge cases that matter
 * Focused on real-world scenarios that could break the system
 */

import { describe, it, expect } from "bun:test"
import { parseChar, KeyType } from "@/core/keys"

describe("Input Edge Cases", () => {
  describe("Character Parsing Edge Cases", () => {
    it("handles empty input", () => {
      const result = parseChar("")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("")
      expect(result.runes).toBe("")
    })

    it("handles null bytes", () => {
      const result = parseChar("\0")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("ctrl+`")
    })

    it("handles Unicode characters correctly", () => {
      const result = parseChar("🌟")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("🌟")
      expect(result.runes).toBe("🌟")
    })

    it("handles control characters consistently", () => {
      const results = [
        parseChar("\x01"), // Ctrl+A
        parseChar("\x03"), // Ctrl+C
        parseChar("\x1a"), // Ctrl+Z
      ]
      
      results.forEach(result => {
        expect(result.type).toBe(KeyType.Runes)
        expect(result.ctrl).toBe(true)
        expect(typeof result.key).toBe("string")
      })
    })

    it("maintains consistent structure for all inputs", () => {
      const testCases = ["a", "", "\0", "🌟", "\x03"]
      
      testCases.forEach(input => {
        const result = parseChar(input)
        
        expect(typeof result.type).toBe("string")
        expect(typeof result.key).toBe("string")
        expect(typeof result.ctrl).toBe("boolean")
        expect(typeof result.alt).toBe("boolean")
        expect(typeof result.shift).toBe("boolean")
        expect(typeof result.meta).toBe("boolean")
      })
    })
  })
})