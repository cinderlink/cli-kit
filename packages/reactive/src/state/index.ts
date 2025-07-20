/**
 * State Management System
 * 
 * Provides reactive state containers with change tracking, subscriptions,
 * and advanced state management features. This module builds on the core
 * rune system to provide higher-level state management abstractions.
 * 
 * Features:
 * - Immutable state updates
 * - Change tracking and diffing
 * - Nested state support
 * - State validation
 * - Performance optimizations
 * 
 * @example
 * ```typescript
 * import { createState, createStore } from '@tuix/reactive/state'
 * 
 * // Basic state container
 * const counter = createState(0)
 * counter.set(1)
 * 
 * // Complex state store
 * const store = createStore({
 *   user: { name: 'John', age: 30 },
 *   settings: { theme: 'dark' }
 * })
 * 
 * store.update(state => ({
 *   ...state,
 *   user: { ...state.user, age: 31 }
 * }))
 * ```
 */

import { $state, State, getValue } from '../runes'
import { Effect } from "effect"

// =============================================================================
// State Container Interface
// =============================================================================

/**
 * Advanced state container with additional utilities
 * 
 * StateContainer extends the basic State interface with additional
 * utilities for state management, including property updates,
 * change tracking, and validation.
 * 
 * @template T - The type of the stored value
 */
export interface StateContainer<T> extends State<T> {
  /**
   * Get the previous value (before last update)
   */
  readonly previousValue: T | undefined
  
  /**
   * Check if the state has changed since creation
   */
  readonly hasChanged: boolean
  
  /**
   * Reset the state to its initial value
   */
  reset(): void
  
  /**
   * Update the state only if the value passes validation
   * @param value - New value to set
   * @param validator - Optional validation function
   */
  setIfValid(value: T, validator?: (value: T) => boolean | string): boolean
  
  /**
   * Get change information for object states
   */
  getChanges(): Partial<T> | undefined
}

/**
 * Store interface for complex state objects
 * 
 * Stores provide utilities for working with object-based state,
 * including property-level updates and nested state management.
 * 
 * @template T - The type of the stored object (must be an object)
 */
export interface Store<T extends Record<string, any>> extends StateContainer<T> {
  /**
   * Update a specific property
   * @param key - Property key to update
   * @param value - New value for the property
   */
  setProperty<K extends keyof T>(key: K, value: T[K]): void
  
  /**
   * Update multiple properties at once
   * @param partial - Partial object with properties to update
   */
  patch(partial: Partial<T>): void
  
  /**
   * Update a nested property using a path
   * @param path - Property path (e.g., 'user.name')
   * @param value - New value
   */
  setNested(path: string, value: any): void
  
  /**
   * Get a property reactively
   * @param key - Property key
   */
  getProperty<K extends keyof T>(key: K): T[K]
}

// =============================================================================
// State Change Tracking
// =============================================================================

/**
 * Change tracking information
 */
interface ChangeInfo<T> {
  previous: T | undefined
  current: T
  timestamp: number
  changes?: Partial<T>
}

/**
 * Validation result type
 */
type ValidationResult = boolean | string

/**
 * Validator function type
 */
type Validator<T> = (value: T) => ValidationResult

// =============================================================================
// State Container Implementation
// =============================================================================

/**
 * Creates a state container with advanced features
 * 
 * StateContainer provides additional utilities beyond basic reactive state,
 * including change tracking, validation, and reset capabilities.
 * 
 * @param initial - Initial value for the state
 * @param validator - Optional validation function
 * @returns StateContainer with advanced features
 * 
 * @example
 * ```typescript
 * const counter = createState(0, value => value >= 0 || "Must be positive")
 * 
 * // Valid update
 * counter.set(5) // succeeds
 * 
 * // Invalid update
 * counter.set(-1) // fails validation, state unchanged
 * 
 * // Reset to initial
 * counter.reset() // back to 0
 * ```
 */
export function createState<T>(
  initial: T, 
  validator?: Validator<T>
): StateContainer<T> {
  const baseState = $state(initial)
  let previousValue: T | undefined
  let changeHistory: ChangeInfo<T>[] = []
  
  // Define the set function that can be reused
  const setValue = (value: T): void => {
    if (validator) {
      const result = validator(value)
      if (result !== true) {
        if (typeof result === 'string') {
          console.warn(`State validation failed: ${result}`)
        }
        return
      }
    }
    
    const oldValue = baseState.value
    if (oldValue !== value) {
      previousValue = oldValue
      baseState.set(value)
      
      // Track change
      const change: ChangeInfo<T> = {
        previous: oldValue,
        current: value,
        timestamp: Date.now(),
        changes: isObject(value) && isObject(oldValue) 
          ? getObjectChanges(oldValue, value) 
          : undefined
      }
      
      changeHistory.push(change)
      
      // Keep only recent changes (last 10)
      if (changeHistory.length > 10) {
        changeHistory = changeHistory.slice(-10)
      }
    }
  }
  
  const container: StateContainer<T> = {
    $reactive: true,
    $type: 'state',
    
    get value(): T {
      return baseState.value
    },
    
    get previousValue(): T | undefined {
      return previousValue
    },
    
    get hasChanged(): boolean {
      return changeHistory.length > 0
    },
    
    set: setValue,
    
    update(fn: (value: T) => T): void {
      const newValue = fn(baseState.value)
      setValue(newValue)
    },
    
    subscribe(fn: (value: T) => void): () => void {
      return baseState.subscribe(fn)
    },
    
    reset(): void {
      setValue(initial)
      changeHistory = []
      previousValue = undefined
    },
    
    setIfValid(value: T, customValidator?: Validator<T>): boolean {
      const validatorToUse = customValidator || validator
      if (validatorToUse) {
        const result = validatorToUse(value)
        if (result === true) {
          setValue(value)
          return true
        }
        return false
      }
      setValue(value)
      return true
    },
    
    getChanges(): Partial<T> | undefined {
      const latest = changeHistory[changeHistory.length - 1]
      return latest?.changes as Partial<T>
    }
  }
  
  return container
}

/**
 * Creates a store for complex object state
 * 
 * Stores provide specialized utilities for managing object-based state,
 * including property-level updates and nested property access.
 * 
 * @param initial - Initial object state
 * @param validator - Optional validation function
 * @returns Store with object state utilities
 * 
 * @example
 * ```typescript
 * const userStore = createStore({
 *   profile: { name: 'John', age: 30 },
 *   settings: { theme: 'dark', notifications: true }
 * })
 * 
 * // Update a property
 * userStore.setProperty('profile', { ...userStore.value.profile, age: 31 })
 * 
 * // Patch multiple properties
 * userStore.patch({
 *   settings: { ...userStore.value.settings, theme: 'light' }
 * })
 * 
 * // Update nested property
 * userStore.setNested('profile.name', 'Jane')
 * ```
 */
export function createStore<T extends Record<string, any>>(
  initial: T,
  validator?: Validator<T>
): Store<T> {
  const container = createState(initial, validator)
  
  const store: Store<T> = {
    // Copy all properties from container
    $reactive: container.$reactive,
    $type: container.$type,
    get value() { return container.value },
    get previousValue() { return container.previousValue },
    get hasChanged() { return container.hasChanged },
    set: container.set.bind(container),
    update: container.update.bind(container),
    subscribe: container.subscribe.bind(container),
    reset: container.reset.bind(container),
    setIfValid: container.setIfValid.bind(container),
    getChanges: container.getChanges.bind(container),
    
    setProperty<K extends keyof T>(key: K, value: T[K]): void {
      container.update(state => ({
        ...state,
        [key]: value
      } as T))
    },
    
    patch(partial: Partial<T>): void {
      container.update(state => ({
        ...state,
        ...partial
      } as T))
    },
    
    setNested(path: string, value: any): void {
      const pathParts = path.split('.')
      container.update(state => {
        const newState = deepClone(state)
        setNestedValue(newState, pathParts, value)
        return newState
      })
    },
    
    getProperty<K extends keyof T>(key: K): T[K] {
      return container.value[key]
    }
  }
  
  return store
}

// =============================================================================
// State Composition Utilities
// =============================================================================

/**
 * Combine multiple states into a single derived state
 * 
 * @param states - Object with state containers
 * @returns Derived state that updates when any input state changes
 * 
 * @example
 * ```typescript
 * const firstName = createState('John')
 * const lastName = createState('Doe')
 * 
 * const fullName = combineStates({
 *   first: firstName,
 *   last: lastName
 * }, ({ first, last }) => `${first} ${last}`)
 * ```
 */
export function combineStates<
  TStates extends Record<string, State<any>>,
  TResult
>(
  states: TStates,
  combiner: (values: { [K in keyof TStates]: TStates[K] extends State<infer U> ? U : never }) => TResult
): State<TResult> {
  // Extract values from states
  const getValues = () => {
    const values = {} as any
    for (const [key, state] of Object.entries(states)) {
      values[key] = getValue(state)
    }
    return values
  }
  
  // Create derived state
  const combinedState = $state(combiner(getValues()))
  
  // Subscribe to all input states
  const subscriptions = Object.values(states).map(state => {
    return state.subscribe(() => {
      combinedState.set(combiner(getValues()))
    })
  })
  
  // Return state with cleanup
  return {
    $reactive: combinedState.$reactive,
    $type: combinedState.$type,
    get value() { return combinedState.value },
    set: combinedState.set.bind(combinedState),
    update: combinedState.update.bind(combinedState),
    subscribe(fn: (value: TResult) => void): () => void {
      const unsubscribe = combinedState.subscribe(fn)
      return () => {
        unsubscribe()
        // Clean up input subscriptions when last subscriber leaves
        // This is a simplified cleanup - in production, reference counting would be better
      }
    }
  }
}

/**
 * Create a state that persists to storage
 * 
 * @param key - Storage key
 * @param initial - Initial value (used if no stored value)
 * @param storage - Storage interface (defaults to localStorage-like)
 * @returns Persistent state container
 */
export function createPersistedState<T>(
  key: string,
  initial: T,
  storage: Storage | Map<string, string> = typeof localStorage !== 'undefined' ? localStorage : new Map()
): StateContainer<T> {
  // Normalize storage interface
  const normalizedStorage = {
    getItem: (k: string) => {
      if (storage instanceof Map) {
        return storage.get(k) || null
      }
      return storage.getItem(k)
    },
    setItem: (k: string, v: string) => {
      if (storage instanceof Map) {
        storage.set(k, v)
      } else {
        storage.setItem(k, v)
      }
    }
  }
  
  // Try to load initial value from storage
  let initialValue = initial
  try {
    const stored = normalizedStorage.getItem(key)
    if (stored !== null) {
      initialValue = JSON.parse(stored)
    }
  } catch (error) {
    console.warn(`Failed to load persisted state for key "${key}":`, error)
  }
  
  const state = createState(initialValue)
  
  // Subscribe to changes and persist
  state.subscribe(value => {
    try {
      normalizedStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Failed to persist state for key "${key}":`, error)
    }
  })
  
  return state
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a value is an object
 */
function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Get changes between two objects
 */
function getObjectChanges<T extends Record<string, any>>(
  oldObj: T, 
  newObj: T
): Partial<T> {
  const changes: Partial<T> = {}
  
  // Check for changed/added properties
  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      changes[key] = newObj[key]
    }
  }
  
  // Check for removed properties
  for (const key in oldObj) {
    if (!(key in newObj)) {
      changes[key] = undefined as any
    }
  }
  
  return changes
}

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any
  }
  
  const cloned = {} as any
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

/**
 * Set a nested value in an object using a path
 */
function setNestedValue(obj: any, path: string[], value: any): void {
  let current = obj
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in current) || !isObject(current[key])) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[path[path.length - 1]] = value
}