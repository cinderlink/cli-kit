/**
 * Additional tests for runes to improve coverage
 */

import { describe, it, expect, jest } from "bun:test"
import { 
  $state, 
  $bindable, 
  $derived, 
  $effect,
  isStateRune,
  isBindableRune,
  isDerivedRune,
  isRune,
  getValue,
  toBindable
} from "@/reactivity/runes"

describe("Runes Coverage Tests", () => {
  describe("$effect", () => {
    it("runs effect immediately", () => {
      let executed = false
      const cleanup = $effect(() => {
        executed = true
      })
      
      expect(executed).toBe(true)
      expect(typeof cleanup).toBe('function')
    })

    it("calls cleanup function when returned", () => {
      let cleaned = false
      const cleanup = $effect(() => {
        return () => {
          cleaned = true
        }
      })
      
      cleanup()
      expect(cleaned).toBe(true)
    })

    it("handles effects without cleanup", () => {
      const cleanup = $effect(() => {
        // No cleanup
      })
      
      expect(() => cleanup()).not.toThrow()
    })
  })

  describe("Type Guards", () => {
    it("isStateRune identifies state runes", () => {
      const state = $state(5)
      const bindable = $bindable(5)
      const derived = $derived(() => 5)
      const regular = () => 5
      
      expect(isStateRune(state)).toBe(true)
      expect(isStateRune(bindable)).toBe(false) // bindable has its own type
      expect(isStateRune(derived)).toBe(false)
      expect(isStateRune(regular)).toBe(false)
      expect(isStateRune(null)).toBe(false)
      expect(isStateRune(undefined)).toBe(false)
    })

    it("isBindableRune identifies bindable runes", () => {
      const state = $state(5)
      const bindable = $bindable(5)
      const derived = $derived(() => 5)
      
      expect(isBindableRune(bindable)).toBe(true)
      expect(isBindableRune(state)).toBe(false)
      expect(isBindableRune(derived)).toBe(false)
      expect(isBindableRune(null)).toBe(false)
    })

    it("isDerivedRune identifies derived runes", () => {
      const state = $state(5)
      const bindable = $bindable(5)
      const derived = $derived(() => 5)
      
      expect(isDerivedRune(derived)).toBe(true)
      expect(isDerivedRune(state)).toBe(false)
      expect(isDerivedRune(bindable)).toBe(false)
      expect(isDerivedRune(null)).toBe(false)
    })

    it("isRune identifies any rune", () => {
      const state = $state(5)
      const bindable = $bindable(5)
      const derived = $derived(() => 5)
      const regular = () => 5
      
      expect(isRune(state)).toBe(true)
      expect(isRune(bindable)).toBe(true)
      expect(isRune(derived)).toBe(true)
      expect(isRune(regular)).toBe(false)
      expect(isRune(null)).toBe(false)
      expect(isRune({})).toBe(false)
    })
  })

  describe("Utility Functions", () => {
    it("getValue extracts value from runes", () => {
      const state = $state(10)
      const bindable = $bindable("hello")
      const derived = $derived(() => 42)
      
      expect(getValue(state)).toBe(10)
      expect(getValue(bindable)).toBe("hello")
      expect(getValue(derived)).toBe(42)
    })

    it("toBindable converts state to bindable", () => {
      const state = $state(5)
      const bindable = toBindable(state)
      
      expect(bindable()).toBe(5)
      expect(bindable.$bindable).toBe(true)
      
      bindable.$set(10)
      expect(bindable()).toBe(10)
      expect(state()).toBe(10) // Should update both
    })

    it("toBindable with validation options", () => {
      const state = $state(5)
      const bindable = toBindable(state, {
        validate: (v) => v > 0,
        transform: (v) => Math.round(v)
      })
      
      expect(bindable.$validate).toBeDefined()
      expect(bindable.$transform).toBeDefined()
      
      bindable.$set(3.7)
      expect(bindable()).toBe(4)
      expect(state()).toBe(3.7) // state gets raw value, bindable gets transformed
    })
  })

  describe("Bindable Validation Edge Cases", () => {
    it("rejects changes when validation returns false", () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      const value = $bindable(5, {
        validate: (v) => v > 0
      })
      
      value.$set(-1)
      expect(value()).toBe(5) // Should not change
      
      consoleError.mockRestore()
    })

    it("logs error when validation returns string", () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      const value = $bindable(5, {
        validate: (v) => v > 0 || "Must be positive"
      })
      
      value.$set(-1)
      expect(value()).toBe(5) // Should not change
      expect(consoleError).toHaveBeenCalledWith("Validation error: Must be positive")
      
      consoleError.mockRestore()
    })

    it("applies transformation before validation", () => {
      const value = $bindable("hello", {
        transform: (v) => v.trim(),
        validate: (v) => v.length > 0
      })
      
      value.$set("  world  ")
      expect(value()).toBe("world")
      
      value.$set("   ")
      expect(value()).toBe("world") // Should not change because trimmed is empty
    })

    it("handles validation without transformation", () => {
      const value = $bindable(10, {
        validate: (v) => v >= 0 && v <= 100
      })
      
      value.$set(50)
      expect(value()).toBe(50)
      
      value.$set(150)
      expect(value()).toBe(50) // Should not change
    })

    it("handles transformation without validation", () => {
      const value = $bindable("test", {
        transform: (v) => v.toUpperCase()
      })
      
      value.$set("hello")
      expect(value()).toBe("HELLO")
    })

    it("$update uses $set internally", () => {
      const value = $bindable(5, {
        validate: (v) => v > 0
      })
      
      value.$update(n => n + 5)
      expect(value()).toBe(10)
      
      value.$update(n => n - 20) // Would be -10, should fail validation
      expect(value()).toBe(10)
    })
  })
})