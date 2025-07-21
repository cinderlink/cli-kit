/**
 * Value Utilities for TUIX
 * 
 * Provides utility types and functions for working with values
 */

import { UnknownRecord } from './guards'

// =============================================================================
// Value Types
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

// =============================================================================
// Value Utility Functions
// =============================================================================

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
  if (obj && typeof obj === 'object' && key in obj) {
    return obj[key] as T
  }
  return defaultValue
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