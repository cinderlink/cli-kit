/**
 * Simplified runes implementation without infinite recursion issues
 */

/**
 * Base interface for all runes
 */
export interface Rune<T> {
  (): T
  readonly $type: string
}

/**
 * State rune for reactive values
 */
export interface StateRune<T> extends Rune<T> {
  readonly $type: 'state'
  $set(value: T): void
  $update(fn: (current: T) => T): void
}

/**
 * Bindable rune for two-way data binding
 */
export interface BindableRune<T> extends StateRune<T> {
  readonly $type: 'bindable'
  readonly $bindable: true
  $validate?: (value: T) => boolean | string
  $transform?: (value: T) => T
}

/**
 * Derived rune for computed values
 */
export interface DerivedRune<T> extends Rune<T> {
  readonly $type: 'derived'
}

/**
 * Options for creating bindable runes
 */
export interface BindableOptions<T> {
  validate?: (value: T) => boolean | string
  transform?: (value: T) => T
}

/**
 * Creates a reactive state value
 */
export function $state<T>(initial: T): StateRune<T> {
  let value = initial
  
  const rune = (() => {
    return value
  }) as StateRune<T>
  
  rune.$type = 'state' as const
  
  rune.$set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue
    }
  }
  
  rune.$update = (fn: (current: T) => T) => {
    rune.$set(fn(value))
  }
  
  return rune
}

/**
 * Creates a bindable value with optional validation and transformation
 */
export function $bindable<T>(initial: T, options: BindableOptions<T> = {}): BindableRune<T> {
  let value = initial
  
  const rune = (() => {
    return value
  }) as BindableRune<T>
  
  rune.$type = 'bindable' as const
  rune.$bindable = true
  rune.$validate = options.validate
  rune.$transform = options.transform
  
  rune.$set = (newValue: T) => {
    let finalValue = newValue
    
    // Apply transformation
    if (options.transform) {
      finalValue = options.transform(finalValue)
    }
    
    // Validate
    if (options.validate) {
      const result = options.validate(finalValue)
      if (result === false) {
        return // Reject the change silently
      }
      if (typeof result === 'string') {
        console.error(`Validation error: ${result}`)
        return // Reject with error message
      }
    }
    
    if (value !== finalValue) {
      value = finalValue
    }
  }
  
  rune.$update = (fn: (current: T) => T) => {
    rune.$set(fn(value))
  }
  
  return rune
}

/**
 * Creates a simple derived value that recalculates on each access
 * This avoids the complexity of subscription management and infinite loops
 */
export function $derived<T>(fn: () => T): DerivedRune<T> {
  const rune = (() => {
    return fn()
  }) as DerivedRune<T>
  
  rune.$type = 'derived' as const
  
  return rune
}