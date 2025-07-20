/**
 * Integration Tests
 * 
 * Tests for the complete reactive system integration including
 * coordination between runes, state, effects, and components.
 */

import { test, expect } from "bun:test"
import { $state, $derived, $effect } from "../runes"
import { createState } from "../state"
import { createMemoized, createAsyncDerived } from "../derived"
import { createEffect } from "../effects"
import { ReactiveComponent, useReactiveState, ReactiveSystemAPI } from "../components"
import { Effect } from "effect"

test("Complete reactive workflow", () => {
  // Create reactive state
  const counter = $state({ count: 0, multiplier: 2 })
  
  // Create derived value
  const doubled = $derived(() => counter.value.count * counter.value.multiplier)
  
  // Track effect calls
  let effectCallCount = 0
  let lastDoubledValue: number | undefined
  
  // Create effect
  const dispose = $effect(() => {
    effectCallCount++
    lastDoubledValue = doubled.value
  })
  
  // Initial state
  expect(counter.value.count).toBe(0)
  expect(doubled.value).toBe(0)
  expect(effectCallCount).toBe(1)
  expect(lastDoubledValue).toBe(0)
  
  // Update counter
  counter.set({ count: 5, multiplier: 2 })
  expect(doubled.value).toBe(10)
  expect(effectCallCount).toBe(2)
  expect(lastDoubledValue).toBe(10)
  
  // Update multiplier
  counter.update(state => ({ ...state, multiplier: 3 }))
  expect(doubled.value).toBe(15)
  expect(effectCallCount).toBe(3)
  expect(lastDoubledValue).toBe(15)
  
  dispose()
})

test("Memoized derived integration", () => {
  const state = createState(5)
  let computeCount = 0
  
  const expensive = createMemoized(() => {
    computeCount++
    return state.value * state.value
  })
  
  // First access should compute
  expect(expensive.value).toBe(25)
  expect(computeCount).toBe(1)
  
  // Second access should use cache
  expect(expensive.value).toBe(25)
  expect(computeCount).toBe(1)
  
  // Change state should recompute
  state.set(6)
  expect(expensive.value).toBe(36)
  expect(computeCount).toBe(2)
  
  // Cache stats
  const stats = expensive.getCacheStats()
  expect(stats.hits).toBeGreaterThan(0)
  expect(stats.misses).toBeGreaterThan(0)
})

test("Async derived integration", async () => {
  const userId = createState(1)
  
  const userData = createAsyncDerived(() => 
    Effect.gen(function*() {
      // Simulate async operation
      yield* Effect.sleep("10 millis")
      return { id: userId.value, name: `User ${userId.value}` }
    })
  )
  
  // Initial state
  expect(userData.loading).toBe(true)
  expect(userData.value).toBeUndefined()
  
  // Wait for async completion
  await new Promise(resolve => setTimeout(resolve, 50))
  
  expect(userData.loading).toBe(false)
  expect(userData.value).toEqual({ id: 1, name: 'User 1' })
  
  // Update user ID should trigger new fetch
  userId.set(2)
  expect(userData.loading).toBe(true)
  
  await new Promise(resolve => setTimeout(resolve, 50))
  
  expect(userData.loading).toBe(false)
  expect(userData.value).toEqual({ id: 2, name: 'User 2' })
})

test("Reactive component integration", () => {
  class TestComponent extends ReactiveComponent {
    private counter = this.useState({ count: 0 })
    private doubled = this.useDerived(() => this.counter.value.count * 2)
    private effectCallCount = 0
    
    onMount() {
      this.useEffect(() => {
        this.effectCallCount++
      })
    }
    
    increment() {
      this.counter.update(state => ({ count: state.count + 1 }))
    }
    
    getCount() {
      return this.counter.value.count
    }
    
    getDoubled() {
      return this.doubled.value
    }
    
    getEffectCallCount() {
      return this.effectCallCount
    }
  }
  
  const component = new TestComponent()
  component.mount()
  
  expect(component.getCount()).toBe(0)
  expect(component.getDoubled()).toBe(0)
  expect(component.getEffectCallCount()).toBe(1)
  
  component.increment()
  expect(component.getCount()).toBe(1)
  expect(component.getDoubled()).toBe(2)
  expect(component.getEffectCallCount()).toBe(2)
  
  component.unmount()
  expect(component.isDisposed).toBe(true)
})

test("Kitchen-sink demo patterns", () => {
  // Replicate exact patterns from kitchen-sink demo
  const appState = $state({
    user: { name: 'John', age: 30 },
    ui: { theme: 'dark', loading: false }
  })
  
  const userName = $derived(() => appState.value.user.name)
  const isAdult = $derived(() => appState.value.user.age >= 18)
  const themeClass = $derived(() => `theme-${appState.value.ui.theme}`)
  
  let logMessages: string[] = []
  $effect(() => {
    logMessages.push(`User: ${userName.value}, Theme: ${themeClass.value}`)
  })
  
  // Initial state
  expect(userName.value).toBe('John')
  expect(isAdult.value).toBe(true)
  expect(themeClass.value).toBe('theme-dark')
  expect(logMessages).toHaveLength(1)
  
  // Update user
  appState.update(state => ({
    ...state,
    user: { ...state.user, name: 'Jane' }
  }))
  
  expect(userName.value).toBe('Jane')
  expect(logMessages).toHaveLength(2)
  expect(logMessages[1]).toBe('User: Jane, Theme: theme-dark')
  
  // Update theme
  appState.update(state => ({
    ...state,
    ui: { ...state.ui, theme: 'light' }
  }))
  
  expect(themeClass.value).toBe('theme-light')
  expect(logMessages).toHaveLength(3)
  expect(logMessages[2]).toBe('User: Jane, Theme: theme-light')
})

test("ReactiveSystemAPI integration", () => {
  const integration = ReactiveSystemAPI.createIntegration()
  
  // Test component state initialization
  const state = integration.initializeReactiveState({ count: 0 })
  expect(state.value.count).toBe(0)
  
  // Test derived creation
  const doubled = integration.createComponentDerived(() => state.value.count * 2)
  expect(doubled.value).toBe(0)
  
  // Test effect registration
  let effectCalled = false
  const effect = integration.registerComponentEffect(() => {
    effectCalled = true
  })
  
  expect(effectCalled).toBe(true)
  expect(effect.disposed).toBe(false)
  
  // Test cleanup
  integration.cleanupComponent('test-component')
  // Should not throw
})

test("Context management for components", () => {
  const { context } = ReactiveSystemAPI
  
  // Create context
  const ctx = context.create('test-component')
  expect(ctx.componentId).toBe('test-component')
  expect(ctx.mounted).toBe(false)
  
  // Set as active
  context.setActive(ctx)
  
  // Use hooks should add to context
  const state = useReactiveState({ value: 10 })
  expect(ctx.states.has(state)).toBe(true)
  
  // Cleanup should clear resources
  context.cleanup('test-component')
  expect(context.get('test-component')).toBeUndefined()
})