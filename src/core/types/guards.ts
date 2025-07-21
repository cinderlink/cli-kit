/**
 * Type Guards for TUIX
 * 
 * Provides type guard functions for runtime type checking
 */

// =============================================================================
// Type Definitions for Guards
// =============================================================================

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

// =============================================================================
// Type Guard Functions
// =============================================================================

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