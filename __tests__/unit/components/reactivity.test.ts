/**
 * Tests for Reactivity System
 */

import { describe, it, expect, beforeEach, mock } from "bun:test"
import { Effect } from "effect"
import {
  $state,
  $derived,
  $effect,
  $memo,
  $throttled,
  $debounced,
  batch,
  type Signal,
  type ReadonlySignal
} from "@/components/reactivity"

describe("Reactivity System", () => {
  describe("$state", () => {
    it("creates a reactive signal with initial value", () => {
      const count = $state(0)
      expect(count()).toBe(0)
    })

    it("updates value with set", () => {
      const count = $state(0)
      count.set(5)
      expect(count()).toBe(5)
    })

    it("updates value with update function", () => {
      const count = $state(10)
      count.update(n => n + 5)
      expect(count()).toBe(15)
    })

    it("notifies subscribers on change", () => {
      const count = $state(0)
      const callback = mock((value: number) => {})
      
      const unsubscribe = count.subscribe(callback)
      
      count.set(1)
      expect(callback).toHaveBeenCalledWith(1)
      
      count.set(2)
      expect(callback).toHaveBeenCalledWith(2)
      
      unsubscribe()
      count.set(3)
      expect(callback).toHaveBeenCalledTimes(2) // Not called after unsubscribe
    })

    it("supports multiple subscribers", () => {
      const count = $state(0)
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})
      
      count.subscribe(callback1)
      count.subscribe(callback2)
      
      count.set(1)
      
      expect(callback1).toHaveBeenCalledWith(1)
      expect(callback2).toHaveBeenCalledWith(1)
    })

    it("works with complex objects", () => {
      const user = $state({ name: "John", age: 30 })
      
      expect(user().name).toBe("John")
      expect(user().age).toBe(30)
      
      user.set({ name: "Jane", age: 25 })
      expect(user().name).toBe("Jane")
      expect(user().age).toBe(25)
      
      user.update(u => ({ ...u, age: u.age + 1 }))
      expect(user().age).toBe(26)
    })

    it("handles arrays", () => {
      const items = $state<string[]>([])
      
      items.update(arr => [...arr, "item1"])
      expect(items()).toEqual(["item1"])
      
      items.update(arr => [...arr, "item2"])
      expect(items()).toEqual(["item1", "item2"])
    })
  })

  describe("$derived", () => {
    it("creates computed value from signal", () => {
      const count = $state(10)
      const doubled = $derived(() => count() * 2)
      
      expect(doubled()).toBe(20)
      
      count.set(15)
      expect(doubled()).toBe(30)
    })

    it("tracks multiple dependencies", () => {
      const firstName = $state("John")
      const lastName = $state("Doe")
      const fullName = $derived(() => `${firstName()} ${lastName()}`)
      
      expect(fullName()).toBe("John Doe")
      
      firstName.set("Jane")
      expect(fullName()).toBe("Jane Doe")
      
      lastName.set("Smith")
      expect(fullName()).toBe("Jane Smith")
    })

    it("chains derived values", () => {
      const count = $state(2)
      const doubled = $derived(() => count() * 2)
      const quadrupled = $derived(() => doubled() * 2)
      
      expect(quadrupled()).toBe(8)
      
      count.set(3)
      expect(doubled()).toBe(6)
      expect(quadrupled()).toBe(12)
    })

    it("notifies subscribers when dependencies change", () => {
      const count = $state(0)
      const doubled = $derived(() => count() * 2)
      const callback = mock(() => {})
      
      doubled.subscribe(callback)
      
      count.set(5)
      expect(callback).toHaveBeenCalledWith(10)
    })

    it("handles conditional dependencies", () => {
      const useFirst = $state(true)
      const first = $state("first")
      const second = $state("second")
      const result = $derived(() => useFirst() ? first() : second())
      
      expect(result()).toBe("first")
      
      first.set("FIRST")
      expect(result()).toBe("FIRST")
      
      useFirst.set(false)
      expect(result()).toBe("second")
      
      // Changing first should not trigger update when not used
      first.set("ignored")
      expect(result()).toBe("second")
      
      second.set("SECOND")
      expect(result()).toBe("SECOND")
    })
  })

  describe("$effect", () => {
    it("runs effect when dependencies change", async () => {
      const count = $state(0)
      const effectFn = mock(() => {})
      
      const cleanup = await Effect.runPromise(
        $effect(() => {
          effectFn(count())
        })
      )
      
      // Initial run
      expect(effectFn).toHaveBeenCalledWith(0)
      
      count.set(1)
      // Allow microtask to process
      await new Promise(resolve => setImmediate(resolve))
      expect(effectFn).toHaveBeenCalledWith(1)
      
      count.set(2)
      await new Promise(resolve => setImmediate(resolve))
      expect(effectFn).toHaveBeenCalledWith(2)
      
      cleanup()
      
      count.set(3)
      await new Promise(resolve => setImmediate(resolve))
      // Should not run after cleanup
      expect(effectFn).toHaveBeenCalledTimes(3)
    })

    it("supports cleanup function", async () => {
      const count = $state(0)
      const cleanupFn = mock(() => {})
      
      const cleanup = await Effect.runPromise(
        $effect(() => {
          count() // Track dependency
          return cleanupFn
        })
      )
      
      count.set(1)
      await new Promise(resolve => setImmediate(resolve))
      // Cleanup should be called before re-running
      expect(cleanupFn).toHaveBeenCalledTimes(1)
      
      count.set(2)
      await new Promise(resolve => setImmediate(resolve))
      expect(cleanupFn).toHaveBeenCalledTimes(2)
      
      cleanup()
      expect(cleanupFn).toHaveBeenCalledTimes(3)
    })

    it("tracks multiple dependencies", async () => {
      const x = $state(1)
      const y = $state(2)
      const effectFn = mock(() => {})
      
      const cleanup = await Effect.runPromise(
        $effect(() => {
          effectFn(x() + y())
        })
      )
      
      expect(effectFn).toHaveBeenCalledWith(3)
      
      x.set(2)
      await new Promise(resolve => setImmediate(resolve))
      expect(effectFn).toHaveBeenCalledWith(4)
      
      y.set(3)
      await new Promise(resolve => setImmediate(resolve))
      expect(effectFn).toHaveBeenCalledWith(5)
      
      cleanup()
    })

    it("handles errors in effects", async () => {
      const count = $state(0)
      const errorFn = mock(() => {
        if (count() > 0) throw new Error("Effect error")
      })
      
      // Effect should handle errors gracefully
      const cleanup = await Effect.runPromise(
        $effect(() => {
          errorFn()
        })
      )
      
      count.set(1)
      await new Promise(resolve => setImmediate(resolve))
      
      // Should have attempted to run
      expect(errorFn).toHaveBeenCalledTimes(2)
      
      cleanup()
    })
  })

  describe("$memo", () => {
    it("memoizes expensive computations", () => {
      let computeCount = 0
      const input = $state(10)
      
      const expensive = $memo(() => {
        computeCount++
        return input() * input()
      })
      
      expect(expensive()).toBe(100)
      expect(computeCount).toBe(1)
      
      // Multiple reads don't recompute
      expect(expensive()).toBe(100)
      expect(expensive()).toBe(100)
      expect(computeCount).toBe(1)
      
      // Only recomputes when dependency changes
      input.set(20)
      expect(expensive()).toBe(400)
      expect(computeCount).toBe(2)
    })

    it("works with multiple dependencies", () => {
      let computeCount = 0
      const x = $state(2)
      const y = $state(3)
      
      const product = $memo(() => {
        computeCount++
        return x() * y()
      })
      
      expect(product()).toBe(6)
      expect(computeCount).toBe(1)
      
      x.set(4)
      expect(product()).toBe(12)
      expect(computeCount).toBe(2)
      
      y.set(5)
      expect(product()).toBe(20)
      expect(computeCount).toBe(3)
    })
  })

  describe("$throttled", () => {
    it("throttles rapid updates", async () => {
      const count = $state(0)
      const throttled = $throttled(count, 50)
      const callback = mock(() => {})
      
      throttled.subscribe(callback)
      
      // Rapid updates
      count.set(1)
      count.set(2)
      count.set(3)
      
      // Should only see first update immediately
      expect(throttled()).toBe(1)
      expect(callback).toHaveBeenCalledTimes(1)
      
      // Wait for throttle period
      await new Promise(resolve => setTimeout(resolve, 60))
      
      count.set(4)
      expect(throttled()).toBe(4)
    })

    it("respects throttle delay", async () => {
      const value = $state("initial")
      const throttled = $throttled(value, 100)
      
      value.set("update1")
      expect(throttled()).toBe("update1")
      
      // Immediate update should be ignored
      value.set("update2")
      expect(throttled()).toBe("update1")
      
      // After delay, update should work
      await new Promise(resolve => setTimeout(resolve, 110))
      value.set("update3")
      expect(throttled()).toBe("update3")
    })
  })

  describe("$debounced", () => {
    it("debounces rapid updates", async () => {
      const count = $state(0)
      const debounced = $debounced(count, 50)
      const callback = mock(() => {})
      
      debounced.subscribe(callback)
      
      // Rapid updates
      count.set(1)
      count.set(2)
      count.set(3)
      
      // Should not update immediately
      expect(debounced()).toBe(0)
      expect(callback).not.toHaveBeenCalled()
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 60))
      
      // Should see final value
      expect(debounced()).toBe(3)
      expect(callback).toHaveBeenCalledWith(3)
    })

    it("resets timer on each update", async () => {
      const value = $state("initial")
      const debounced = $debounced(value, 50)
      
      value.set("update1")
      await new Promise(resolve => setTimeout(resolve, 30))
      
      value.set("update2")
      await new Promise(resolve => setTimeout(resolve, 30))
      
      // Still shouldn't have updated
      expect(debounced()).toBe("initial")
      
      // Wait for full debounce period after last update
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(debounced()).toBe("update2")
    })
  })

  describe("batch", () => {
    it("batches multiple updates", () => {
      const count = $state(0)
      const doubled = $derived(() => count() * 2)
      const callback = mock(() => {})
      
      doubled.subscribe(callback)
      
      batch(() => {
        count.set(1)
        count.set(2)
        count.set(3)
      })
      
      // Should only notify once with final value
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(6)
    })

    it("batches updates across multiple signals", () => {
      const x = $state(1)
      const y = $state(2)
      const sum = $derived(() => x() + y())
      const callback = mock(() => {})
      
      sum.subscribe(callback)
      
      batch(() => {
        x.set(10)
        y.set(20)
      })
      
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(30)
    })

    it("returns value from batch function", () => {
      const count = $state(0)
      
      const result = batch(() => {
        count.set(5)
        return count() * 2
      })
      
      expect(result).toBe(10)
    })
  })

  describe("edge cases", () => {
    it("handles circular dependencies gracefully", () => {
      const a = $state(1)
      
      // This should not cause infinite loop
      const b = $derived(() => {
        const val = a()
        if (val < 5) {
          a.set(val + 1) // Side effect in derived
        }
        return val
      })
      
      expect(() => b()).not.toThrow()
    })

    it("handles rapid updates", () => {
      const count = $state(0)
      const callback = mock(() => {})
      
      count.subscribe(callback)
      
      // Rapid fire updates
      for (let i = 1; i <= 100; i++) {
        count.set(i)
      }
      
      expect(callback).toHaveBeenCalledTimes(100)
      expect(count()).toBe(100)
    })

    it("handles null and undefined values", () => {
      const nullable = $state<string | null>("initial")
      const optional = $state<number | undefined>(42)
      
      nullable.set(null)
      expect(nullable()).toBeNull()
      
      optional.set(undefined)
      expect(optional()).toBeUndefined()
    })

    it("preserves referential equality when appropriate", () => {
      const obj = { id: 1, name: "test" }
      const state = $state(obj)
      
      const ref1 = state()
      const ref2 = state()
      
      expect(ref1).toBe(ref2) // Same reference
      
      state.set({ ...obj, name: "changed" })
      const ref3 = state()
      
      expect(ref3).not.toBe(ref1) // Different reference after change
    })
  })
})