/**
 * Basic Reactive System Tests
 * 
 * These tests verify the core reactive system functionality
 * works as expected for kitchen-sink demo patterns.
 */

import { test, expect } from "bun:test"
import { $state, $derived, $effect, createState, createStore } from "../index"

test("$state basic functionality", () => {
  const state = $state({ count: 0 })
  
  expect(state.value.count).toBe(0)
  
  state.set({ count: 1 })
  expect(state.value.count).toBe(1)
  
  state.update(s => ({ count: s.count + 1 }))
  expect(state.value.count).toBe(2)
})

test("$state subscriptions", () => {
  const state = $state(10)
  let lastValue: number | undefined
  
  const unsubscribe = state.subscribe(value => {
    lastValue = value
  })
  
  expect(lastValue).toBe(10) // Immediate call
  
  state.set(20)
  expect(lastValue).toBe(20)
  
  unsubscribe()
  state.set(30)
  expect(lastValue).toBe(20) // Should not update after unsubscribe
})

test("$derived basic functionality", () => {
  const state = $state({ count: 5 })
  const doubled = $derived(() => state.value.count * 2)
  
  expect(doubled.value).toBe(10)
  
  state.set({ count: 10 })
  expect(doubled.value).toBe(20)
})

test("$derived chaining", () => {
  const state = $state({ count: 2 })
  const doubled = $derived(() => state.value.count * 2)
  const tripled = $derived(() => doubled.value * 1.5)
  
  expect(tripled.value).toBe(6) // 2 * 2 * 1.5
  
  state.set({ count: 4 })
  expect(tripled.value).toBe(12) // 4 * 2 * 1.5
})

test("$effect basic functionality", () => {
  const state = $state({ count: 0 })
  let effectCount = 0
  
  const dispose = $effect(() => {
    effectCount = state.value.count
  })
  
  expect(effectCount).toBe(0)
  
  state.set({ count: 5 })
  // Give effect time to run
  expect(effectCount).toBe(5)
  
  dispose()
})

test("$effect with cleanup", () => {
  const state = $state(true)
  let cleanupCalled = false
  
  const dispose = $effect(() => {
    if (state.value) {
      return () => {
        cleanupCalled = true
      }
    }
  })
  
  state.set(false)
  // Cleanup should be called when effect re-runs
  
  dispose()
  expect(cleanupCalled).toBe(true)
})

test("createState with validation", () => {
  const state = createState(0, value => value >= 0 || "Must be positive")
  
  expect(state.value).toBe(0)
  
  state.set(5)
  expect(state.value).toBe(5)
  
  // Invalid value should be rejected
  state.set(-1)
  expect(state.value).toBe(5) // Should remain unchanged
})

test("createStore basic functionality", () => {
  const store = createStore({
    user: { name: 'John', age: 30 },
    settings: { theme: 'dark', notifications: true }
  })
  
  expect(store.value.user.name).toBe('John')
  
  store.setProperty('user', { name: 'Jane', age: 25 })
  expect(store.value.user.name).toBe('Jane')
  expect(store.value.user.age).toBe(25)
  
  store.patch({
    settings: { theme: 'light', notifications: false }
  })
  expect(store.value.settings.theme).toBe('light')
})

test("kitchen-sink demo patterns", () => {
  // Test the exact patterns from kitchen-sink demo
  const state = $state({ count: 0 })
  
  const doubled = $derived(() => state.value.count * 2)
  
  let loggedValue: number | undefined
  $effect(() => {
    loggedValue = state.value.count
  })
  
  expect(state.value.count).toBe(0)
  expect(doubled.value).toBe(0)
  expect(loggedValue).toBe(0)
  
  state.update(s => ({ count: s.count + 1 }))
  
  expect(state.value.count).toBe(1)
  expect(doubled.value).toBe(2)
  expect(loggedValue).toBe(1)
})