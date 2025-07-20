/**
 * Tests for runes reactivity system
 * Focused on stable state and bindable functionality
 */

import { describe, it, expect } from "bun:test"
import { $state, $bindable, $derived } from "@/reactivity/runes"

describe("Runes Reactivity System", () => {
  describe("State Runes", () => {
    it("creates and updates state", () => {
      const count = $state(0)
      
      expect(count()).toBe(0)
      expect(count.$type).toBe('state')
      
      count.$set(5)
      expect(count()).toBe(5)
      
      count.$update(n => n * 2)
      expect(count()).toBe(10)
    })

    it("handles different value types", () => {
      const str = $state("hello")
      const obj = $state({ name: "test" })
      const arr = $state([1, 2, 3])
      
      expect(str()).toBe("hello")
      expect(obj().name).toBe("test")
      expect(arr()).toEqual([1, 2, 3])
      
      str.$set("world")
      obj.$set({ name: "updated" })
      arr.$update(a => [...a, 4])
      
      expect(str()).toBe("world")
      expect(obj().name).toBe("updated")
      expect(arr()).toEqual([1, 2, 3, 4])
    })
  })

  describe("Bindable Runes", () => {
    it("creates bindable values", () => {
      const name = $bindable('test')
      
      expect(name()).toBe('test')
      expect(name.$type).toBe('bindable')
      expect(name.$bindable).toBe(true)
      
      name.$set('hello')
      expect(name()).toBe('hello')
    })

    it("supports validation", () => {
      const email = $bindable('test@example.com', {
        validate: (value) => value.includes('@') || 'Must be valid email'
      })
      
      expect(email()).toBe('test@example.com')
      expect(email.$validate?.('invalid')).toBe('Must be valid email')
      expect(email.$validate?.('valid@test.com')).toBe(true)
    })

    it("supports transformation", () => {
      const text = $bindable('hello', {
        transform: (value) => value.toUpperCase()
      })
      
      text.$set('world')
      expect(text()).toBe('WORLD')
    })
  })

  describe("Derived Runes", () => {
    it("computes simple derived values", () => {
      const base = $state(5)
      const double = $derived(() => base() * 2)
      
      expect(double()).toBe(10)
      expect(double.$type).toBe('derived')
      
      base.$set(10)
      expect(double()).toBe(20)
    })

    it("chains derived computations", () => {
      const base = $state(2)
      const double = $derived(() => base() * 2)
      const quadruple = $derived(() => double() * 2)
      
      expect(quadruple()).toBe(8)
      
      base.$set(3)
      expect(quadruple()).toBe(12)
    })

    it("recalculates on each access (simple approach)", () => {
      const base = $state(1)
      const derived = $derived(() => base() * 10)
      
      expect(derived()).toBe(10)
      
      base.$set(5)
      expect(derived()).toBe(50) // Should recalculate immediately
    })
  })

  describe("Integration Tests", () => {
    it("combines state, derived, and bindable runes", () => {
      const firstName = $bindable('John')
      const lastName = $bindable('Doe')
      const fullName = $derived(() => `${firstName()} ${lastName()}`)
      
      expect(fullName()).toBe('John Doe')
      
      firstName.$set('Jane')
      expect(fullName()).toBe('Jane Doe')
      
      lastName.$set('Smith')
      expect(fullName()).toBe('Jane Smith')
    })

    it("handles complex reactive chains", () => {
      const items = $state([1, 2, 3])
      const total = $derived(() => items().reduce((sum, n) => sum + n, 0))
      const average = $derived(() => total() / items().length)
      
      expect(total()).toBe(6)
      expect(average()).toBe(2)
      
      items.$update(arr => [...arr, 4, 5])
      expect(total()).toBe(15)
      expect(average()).toBe(3)
    })
  })
})