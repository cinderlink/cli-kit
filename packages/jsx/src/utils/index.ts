/**
 * Utility functions and helpers for JSX runtime
 * Provides common utilities used across the JSX system
 */

export * from './debug'

/**
 * Normalize children array by flattening and filtering out invalid values
 */
export function normalizeChildren(children: unknown): any[] {
  if (!children) return []
  
  const flatten = (arr: unknown[]): unknown[] => {
    return arr.reduce((flat: unknown[], item: unknown) => {
      if (Array.isArray(item)) {
        return flat.concat(flatten(item))
      }
      if (item === null || item === undefined || item === false || item === true) {
        return flat
      }
      return flat.concat(item)
    }, [])
  }
  
  const normalized = Array.isArray(children) ? flatten(children) : [children]
  
  return normalized.filter(child => child !== null && child !== undefined && child !== false)
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>]
    }
  }
  
  return result
}

/**
 * Safe string conversion that handles various input types
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined || value === false || value === true) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.join('')
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object Object]'
    }
  }
  return String(value)
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}