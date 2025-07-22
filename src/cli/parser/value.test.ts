/**
 * Value Parsing Tests
 */

import { describe, it, expect } from "bun:test"
import { parseValue, addOptionValue } from "./value"

describe("Value Parsing", () => {
  describe("parseValue", () => {
    it("should parse integers", () => {
      expect(parseValue("123")).toBe(123)
      expect(parseValue("-456")).toBe(-456)
      expect(parseValue("0")).toBe(0)
    })

    it("should parse floats", () => {
      expect(parseValue("123.45")).toBe(123.45)
      expect(parseValue("-123.45")).toBe(-123.45)
      expect(parseValue("0.0")).toBe(0.0)
      expect(parseValue(".5")).toBe(0.5)
    })

    it("should parse booleans", () => {
      expect(parseValue("true")).toBe(true)
      expect(parseValue("false")).toBe(false)
    })

    it("should return strings for non-numeric/boolean values", () => {
      expect(parseValue("hello")).toBe("hello")
      expect(parseValue("123abc")).toBe("123abc")
      expect(parseValue("")).toBe("")
      expect(parseValue("True")).toBe("True") // Case sensitive
    })
  })

  describe("addOptionValue", () => {
    it("should add single value", () => {
      const options: Record<string, unknown> = {}
      
      addOptionValue(options, "verbose", true)
      
      expect(options.verbose).toBe(true)
    })

    it("should convert to array on second value", () => {
      const options: Record<string, unknown> = {}
      
      addOptionValue(options, "file", "a.txt")
      addOptionValue(options, "file", "b.txt")
      
      expect(options.file).toEqual(["a.txt", "b.txt"])
    })

    it("should append to existing array", () => {
      const options: Record<string, unknown> = {
        file: ["a.txt", "b.txt"]
      }
      
      addOptionValue(options, "file", "c.txt")
      
      expect(options.file).toEqual(["a.txt", "b.txt", "c.txt"])
    })

    it("should handle mixed types in array", () => {
      const options: Record<string, unknown> = {}
      
      addOptionValue(options, "value", "text")
      addOptionValue(options, "value", 123)
      addOptionValue(options, "value", true)
      
      expect(options.value).toEqual(["text", 123, true])
    })
  })
})