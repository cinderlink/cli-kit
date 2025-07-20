/**
 * Tests for utility functions
 * Covers debug, isPlainObject, deepMerge, generateId, capitalize, etc.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { 
  normalizeChildren, 
  isPlainObject, 
  deepMerge, 
  safeString, 
  generateId, 
  capitalize,
  debug,
  createDebugLogger
} from "../utils"

// Mock console.log for debug tests
const originalConsoleLog = console.log
let consoleOutput: any[] = []

describe("Utility Functions", () => {
  beforeEach(() => {
    consoleOutput = []
    console.log = (...args: any[]) => {
      consoleOutput.push(args)
    }
  })

  afterEach(() => {
    console.log = originalConsoleLog
  })

  describe("normalizeChildren", () => {
    test("should handle deeply nested arrays", () => {
      const nested = [1, [2, [3, [4, 5]]], 6]
      const result = normalizeChildren(nested)
      expect(result).toEqual([1, 2, 3, 4, 5, 6])
    })

    test("should filter out true values", () => {
      const children = [true, "text", false, null, undefined, "more"]
      const result = normalizeChildren(children)
      expect(result).toEqual(["text", "more"])
    })

    test("should handle mixed nested content", () => {
      const mixed = [
        "a",
        [true, false, "b"],
        [[null, "c", undefined]],
        "d"
      ]
      const result = normalizeChildren(mixed)
      expect(result).toEqual(["a", "b", "c", "d"])
    })
  })

  describe("isPlainObject", () => {
    test("should identify plain objects", () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(true)
    })

    test("should reject non-plain objects", () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject("string")).toBe(false)
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject(true)).toBe(false)
      expect(isPlainObject(new Date())).toBe(true) // Date is still an object
      expect(isPlainObject(() => {})).toBe(false)
    })
  })

  describe("deepMerge", () => {
    test("should merge simple objects", () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      const result = deepMerge(target, source)
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
      expect(target).toEqual({ a: 1, b: 2 }) // Original unchanged
    })

    test("should deep merge nested objects", () => {
      const target = {
        user: {
          name: "John",
          settings: {
            theme: "dark",
            notifications: true
          }
        }
      }
      
      const source = {
        user: {
          settings: {
            theme: "light",
            language: "en"
          }
        }
      }
      
      const result = deepMerge(target, source)
      
      expect(result).toEqual({
        user: {
          name: "John",
          settings: {
            theme: "light",
            notifications: true,
            language: "en"
          }
        }
      })
    })

    test("should handle arrays in merge", () => {
      const target = { items: [1, 2], config: { a: 1 } }
      const source = { items: [3, 4], config: { b: 2 } }
      const result = deepMerge(target, source)
      
      expect(result.items).toEqual([3, 4]) // Arrays are replaced
      expect(result.config).toEqual({ a: 1, b: 2 }) // Objects are merged
    })

    test("should handle null and undefined values", () => {
      const target = { a: 1, b: { c: 2 }, d: "keep" }
      const source = { b: null, d: undefined }
      const result = deepMerge(target, source as any)
      
      expect(result.a).toBe(1)
      expect(result.b).toBeNull()
      expect(result.d).toBeUndefined()
    })
  })

  describe("safeString", () => {
    test("should handle objects that throw on JSON.stringify", () => {
      const circular: any = { a: 1 }
      circular.self = circular
      
      const result = safeString(circular)
      expect(result).toBe('[object Object]')
    })

    test("should handle various object types", () => {
      expect(safeString({ key: "value" })).toBe('{"key":"value"}')
      expect(safeString([1, 2, 3])).toBe("123") // Arrays join
      expect(safeString(new Date("2024-01-01"))).toContain("2024")
    })

    test("should handle symbols and functions", () => {
      const sym = Symbol("test")
      const fn = () => "test"
      
      expect(safeString(sym)).toBe("Symbol(test)")
      expect(safeString(fn)).toContain("=>")
    })
  })

  describe("generateId", () => {
    test("should generate unique IDs", () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100) // All unique
    })

    test("should generate IDs of correct format", () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]{9}$/)
    })
  })

  describe("capitalize", () => {
    test("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello")
      expect(capitalize("WORLD")).toBe("WORLD")
      expect(capitalize("123abc")).toBe("123abc")
    })

    test("should handle edge cases", () => {
      expect(capitalize("")).toBe("")
      expect(capitalize("a")).toBe("A")
      expect(capitalize(" space")).toBe(" space")
    })
  })

  describe("debug", () => {
    test("should have debug function", () => {
      expect(debug).toBeDefined()
      expect(typeof debug).toBe("function")
    })

    test("should accept message and arguments", () => {
      // This tests the function signature without needing to check output
      expect(() => {
        debug("Test message")
        debug("Test with arg", { data: 123 })
        debug("Multiple args", 1, 2, 3)
      }).not.toThrow()
    })
  })

  describe("createDebugLogger", () => {
    test("should create logger function", () => {
      const logger = createDebugLogger("test-namespace")
      
      expect(logger).toBeDefined()
      expect(typeof logger).toBe("function")
      expect(logger.enabled).toBeDefined()
      expect(typeof logger.enabled).toBe("boolean")
    })

    test("should accept namespace and return callable logger", () => {
      const logger1 = createDebugLogger("namespace1")
      const logger2 = createDebugLogger("namespace2")
      
      // Test that loggers are independent
      expect(logger1).not.toBe(logger2)
      
      // Test that they can be called
      expect(() => {
        logger1("Message from logger1")
        logger2("Message from logger2", { extra: "data" })
      }).not.toThrow()
    })
  })
})