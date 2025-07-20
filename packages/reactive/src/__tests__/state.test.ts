/**
 * State Management System Tests
 * 
 * Comprehensive tests for the state management system including
 * StateContainer, Store, and composition utilities.
 */

import { test, expect } from "bun:test"
import { createState, createStore, combineStates, createPersistedState } from "../state"

test("StateContainer basic functionality", () => {
  const state = createState(10)
  
  expect(state.value).toBe(10)
  expect(state.hasChanged).toBe(false)
  expect(state.previousValue).toBeUndefined()
  
  state.set(20)
  expect(state.value).toBe(20)
  expect(state.hasChanged).toBe(true)
  expect(state.previousValue).toBe(10)
  
  state.update(val => val * 2)
  expect(state.value).toBe(40)
})

test("StateContainer validation", () => {
  const state = createState(0, value => value >= 0 || "Must be positive")
  
  expect(state.value).toBe(0)
  
  state.set(5)
  expect(state.value).toBe(5)
  
  // Invalid value should be rejected
  state.set(-1)
  expect(state.value).toBe(5) // Should remain unchanged
})

test("StateContainer reset functionality", () => {
  const state = createState(10)
  
  state.set(20)
  state.set(30)
  expect(state.value).toBe(30)
  expect(state.hasChanged).toBe(true)
  
  state.reset()
  expect(state.value).toBe(10)
  expect(state.hasChanged).toBe(false)
  expect(state.previousValue).toBeUndefined()
})

test("Store property management", () => {
  const store = createStore({
    user: { name: 'John', age: 30 },
    settings: { theme: 'dark', notifications: true }
  })
  
  expect(store.value.user.name).toBe('John')
  expect(store.getProperty('user').name).toBe('John')
  
  store.setProperty('user', { name: 'Jane', age: 25 })
  expect(store.value.user.name).toBe('Jane')
  expect(store.value.user.age).toBe(25)
  
  store.patch({
    settings: { theme: 'light', notifications: false }
  })
  expect(store.value.settings.theme).toBe('light')
  expect(store.value.settings.notifications).toBe(false)
})

test("Store nested property updates", () => {
  const store = createStore({
    user: { profile: { name: 'John', avatar: 'avatar.jpg' } },
    config: { ui: { theme: 'dark' } }
  })
  
  store.setNested('user.profile.name', 'Jane')
  expect(store.value.user.profile.name).toBe('Jane')
  
  store.setNested('config.ui.theme', 'light')
  expect(store.value.config.ui.theme).toBe('light')
})

test("combineStates functionality", () => {
  const firstName = createState('John')
  const lastName = createState('Doe')
  
  const fullName = combineStates(
    { first: firstName, last: lastName },
    ({ first, last }) => `${first} ${last}`
  )
  
  expect(fullName.value).toBe('John Doe')
  
  firstName.set('Jane')
  expect(fullName.value).toBe('Jane Doe')
  
  lastName.set('Smith')
  expect(fullName.value).toBe('Jane Smith')
})

test("State subscriptions and notifications", () => {
  const state = createState(0)
  const values: number[] = []
  
  const unsubscribe = state.subscribe(value => {
    values.push(value)
  })
  
  expect(values).toEqual([0]) // Immediate call
  
  state.set(1)
  state.set(2)
  state.set(3)
  
  expect(values).toEqual([0, 1, 2, 3])
  
  unsubscribe()
  state.set(4)
  
  expect(values).toEqual([0, 1, 2, 3]) // Should not update after unsubscribe
})

test("createPersistedState with mock storage", () => {
  const mockStorage = new Map()
  
  // Create persisted state
  const state = createPersistedState('test-key', 'initial', mockStorage as any)
  expect(state.value).toBe('initial')
  
  // Update should persist
  state.set('updated')
  expect(state.value).toBe('updated')
  expect(mockStorage.get('test-key')).toBe('"updated"')
  
  // Create new instance with existing storage
  const state2 = createPersistedState('test-key', 'default', mockStorage as any)
  expect(state2.value).toBe('updated') // Should load from storage
})