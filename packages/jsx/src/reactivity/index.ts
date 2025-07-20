/**
 * Reactivity integration for JSX runtime
 * Provides basic rune support and reactive prop processing
 */

import { debug } from '../utils/debug'
import { capitalize } from '../utils'
import type { BindableRune, StateRune } from '../types'

/**
 * Check if a value is a bindable rune
 * Simplified implementation - in real app would import from src/reactivity/runes
 */
export function isBindableRune(value: unknown): value is BindableRune<unknown> {
  return (
    typeof value === 'function' &&
    typeof (value as any).$set === 'function'
  )
}

/**
 * Check if a value is a state rune
 * Simplified implementation - in real app would import from src/reactivity/runes
 */
export function isStateRune(value: unknown): value is StateRune<unknown> {
  return (
    typeof value === 'function' &&
    typeof (value as any).$set === 'function'
  )
}

/**
 * Check if a value is any type of rune
 */
export function isRune(value: unknown): value is BindableRune<unknown> | StateRune<unknown> {
  return isBindableRune(value) || isStateRune(value)
}

/**
 * Process bind: props for two-way data binding
 */
export function processBindProps(props: Record<string, unknown>): Record<string, unknown> {
  if (!props) return props
  
  debug(`[REACTIVITY] Processing bind props`)
  
  const processed = { ...props }
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('bind:')) {
      const bindProp = key.slice(5) // Remove 'bind:' prefix
      const capitalizedProp = capitalize(bindProp)
      delete processed[key]
      
      if (isBindableRune(value) || isStateRune(value)) {
        // It's a rune - set up two-way binding
        processed[bindProp] = value() // Current value
        processed[`on${capitalizedProp}Change`] = (newValue: unknown) => {
          value.$set(newValue)
        }
        
        // If it's bindable, we can also pass the rune itself for advanced use
        if (isBindableRune(value)) {
          processed[`${bindProp}Rune`] = value
        }
      } else {
        // It's a regular variable - just pass the value
        // (can't do two-way binding without a rune)
        processed[bindProp] = value
      }
    }
  }
  
  return processed
}

/**
 * Create a reactive property descriptor for JSX props
 */
export function createReactiveProperty<T>(
  rune: BindableRune<T> | StateRune<T>,
  propName: string
): { [key: string]: any } {
  const capitalizedProp = capitalize(propName)
  
  return {
    [propName]: rune(),
    [`on${capitalizedProp}Change`]: (newValue: T) => {
      try {
        rune.$set(newValue)
        debug(`[REACTIVITY] Updated ${propName} with new value`)
      } catch (error) {
        debug(`[REACTIVITY] Failed to update ${propName}: ${error.message}`)
      }
    },
    [`${propName}Rune`]: isBindableRune(rune) ? rune : undefined
  }
}

/**
 * Validate reactive props
 */
export function validateReactiveProps(props: Record<string, unknown>, context: string = 'unknown'): void {
  if (!props) return
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('bind:')) {
      const propName = key.slice(5)
      
      if (!propName) {
        throw new Error(`Invalid bind prop in ${context}: empty property name`)
      }
      
      if (value !== null && value !== undefined && !isBindableRune(value) && !isStateRune(value)) {
        debug(`[REACTIVITY] Warning: bind:${propName} in ${context} is not a rune, two-way binding disabled`)
      }
    }
  }
}

// Re-export types
export type { BindableRune, StateRune } from '../types'