/**
 * Type Utilities for TUIX
 * 
 * Provides utility types to replace any types with proper generics
 */

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Represents unknown JSON-serializable data
 */
export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

/**
 * A record with string keys and unknown values
 */
export type UnknownRecord = Record<string, unknown>

/**
 * Function that takes unknown parameters and returns unknown
 */
export type UnknownFunction = (...args: unknown[]) => unknown

/**
 * Async function that takes unknown parameters and returns unknown
 */
export type UnknownAsyncFunction = (...args: unknown[]) => Promise<unknown>

/**
 * Event handler function
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>

/**
 * Generic event emitter interface
 */
export interface EventEmitter<T extends Record<string, unknown[]> = Record<string, unknown[]>> {
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this
  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this
  emit<K extends keyof T>(event: K, ...args: T[K]): boolean
}

/**
 * Safe property access with unknown objects
 */
export function hasProperty<T extends UnknownRecord, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj
}

/**
 * Type guard for checking if value is a function
 */
export function isFunction(value: unknown): value is UnknownFunction {
  return typeof value === 'function'
}

/**
 * Type guard for checking if value is an async function
 */
export function isAsyncFunction(value: unknown): value is UnknownAsyncFunction {
  return typeof value === 'function' && value.constructor.name === 'AsyncFunction'
}

/**
 * Type guard for checking if value is a plain object
 */
export function isPlainObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard for checking if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard for checking if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard for checking if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse(str: string): JSONValue | Error {
  try {
    return JSON.parse(str) as JSONValue
  } catch (error) {
    return error instanceof Error ? error : new Error('Unknown JSON parse error')
  }
}

/**
 * Safe property getter with default value
 */
export function getProperty<T>(
  obj: UnknownRecord,
  key: string,
  defaultValue: T
): T {
  if (hasProperty(obj, key)) {
    return obj[key] as T
  }
  return defaultValue
}

/**
 * Create a typed event emitter
 */
export function createEventEmitter<T extends Record<string, unknown[]>>(): EventEmitter<T> {
  const listeners = new Map<keyof T, Array<(...args: unknown[]) => void>>()

  return {
    on<K extends keyof T>(event: K, listener: (...args: T[K]) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)!.push(listener as (...args: unknown[]) => void)
      return this
    },

    off<K extends keyof T>(event: K, listener: (...args: T[K]) => void) {
      const eventListeners = listeners.get(event)
      if (eventListeners) {
        const index = eventListeners.indexOf(listener as (...args: unknown[]) => void)
        if (index !== -1) {
          eventListeners.splice(index, 1)
        }
      }
      return this
    },

    emit<K extends keyof T>(event: K, ...args: T[K]) {
      const eventListeners = listeners.get(event)
      if (eventListeners) {
        eventListeners.forEach(listener => listener(...args))
        return true
      }
      return false
    }
  }
}

// =============================================================================
// Generic Component Types
// =============================================================================

/**
 * Generic props interface for components
 */
export interface ComponentProps {
  children?: unknown
  className?: string
  style?: UnknownRecord
  [key: string]: unknown
}

/**
 * Generic ref interface
 */
export interface Ref<T> {
  current: T | null
}

/**
 * Create a ref object
 */
export function createRef<T>(initial: T | null = null): Ref<T> {
  return { current: initial }
}

/**
 * Memoization utility with proper typing
 */
export function memoize<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>()
  
  return (...args: TArgs): TReturn => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}