/**
 * Simple unit tests for input buffer functionality
 * Tests the core parsing logic without complex stream integration
 */

import { describe, it, expect } from "bun:test"
import { parseChar, KeyType } from "@/core/keys"

describe("Input Buffer Parsing", () => {
  describe("Character Parsing", () => {
    it("parses regular characters", () => {
      const result = parseChar("a")
      
      // Test what parseChar actually returns
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("a")
      expect(result.runes).toBe("a")
      expect(result.ctrl).toBe(false)
      expect(result.alt).toBe(false)
      expect(result.shift).toBe(false)
      expect(result.meta).toBe(false)
    })

    it("parses numbers", () => {
      const result = parseChar("5")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("5")
      expect(result.runes).toBe("5")
      expect(result.ctrl).toBe(false)
    })

    it("parses special characters", () => {
      const result = parseChar("@")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("@")
      expect(result.runes).toBe("@")
      expect(result.ctrl).toBe(false)
    })

    it("parses Unicode characters", () => {
      const result = parseChar("é")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("é")
      expect(result.runes).toBe("é")
      expect(result.ctrl).toBe(false)
    })

    it("handles control characters", () => {
      const result = parseChar("\x03") // Ctrl+C
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("ctrl+c")
      expect(result.ctrl).toBe(true)
    })

    it("handles other control characters", () => {
      const result = parseChar("\x01") // Ctrl+A
      
      expect(result.type).toBe(KeyType.Runes) 
      expect(result.key).toBe("ctrl+a")
      expect(result.ctrl).toBe(true)
    })
  })

  describe("Edge Cases", () => {
    it("handles empty string", () => {
      const result = parseChar("")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe("")
      expect(result.runes).toBe("")
      expect(result.ctrl).toBe(false)
    })

    it("handles whitespace", () => {
      const result = parseChar(" ")
      
      expect(result.type).toBe(KeyType.Runes)
      expect(result.key).toBe(" ")
      expect(result.runes).toBe(" ")
      expect(result.ctrl).toBe(false)
    })

    it("returns consistent structure", () => {
      const result = parseChar("x")
      
      // Ensure all expected properties exist
      expect(typeof result.type).toBe("string")
      expect(typeof result.key).toBe("string")
      expect(typeof result.ctrl).toBe("boolean")
      expect(typeof result.alt).toBe("boolean") 
      expect(typeof result.shift).toBe("boolean")
      expect(typeof result.meta).toBe("boolean")
    })
  })
})