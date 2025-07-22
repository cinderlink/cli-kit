/**
 * Simplified runes implementation without infinite recursion issues
 */

import { Effect } from 'effect'
import { getGlobalEventBus } from '../../model/events/eventBus'
import { getGlobalRegistry } from '@core/runtime/module/registry'
import { ReactivityModule } from './reactivityModule'
import { ReactivityEventChannels } from './events'

// Global reactivity module reference
let reactivityModule: ReactivityModule | null = null

// Initialize reactivity module
function getReactivityModule(): ReactivityModule | null {
  if (!reactivityModule) {
    try {
      const registry = getGlobalRegistry()
      reactivityModule = registry.getModule<ReactivityModule>('reactivity')
      
      if (!reactivityModule) {
        // Create and register reactivity module
        const eventBus = getGlobalEventBus()
        reactivityModule = new ReactivityModule(eventBus)
        Effect.runSync(registry.register(reactivityModule))
        Effect.runSync(reactivityModule.initialize())
      }
    } catch (error) {
      // Continue without event support
    }
  }
  return reactivityModule
}

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
  $subscribe(listener: (value: T) => void): () => void
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
  const listeners = new Set<(value: T) => void>()
  const runeId = `state_${Date.now()}_${Math.random()}`
  
  // Emit rune created event
  const module = getReactivityModule()
  if (module) {
    Effect.runSync(module.emitStateChange(runeId, initial, 'user'))
  }
  
  const rune = (() => {
    return value
  }) as StateRune<T>
  
  rune.$type = 'state' as const
  
  rune.$set = (newValue: T) => {
    if (value !== newValue) {
      const previousValue = value
      value = newValue
      
      // Emit state change event
      if (module) {
        Effect.runSync(module.emitStateChange(runeId, newValue, 'user'))
      }
      
      // Notify all listeners
      listeners.forEach(listener => listener(value))
    }
  }
  
  rune.$update = (fn: (current: T) => T) => {
    rune.$set(fn(value))
  }
  
  rune.$subscribe = (listener: (value: T) => void) => {
    listeners.add(listener)
    // Call listener immediately with current value
    listener(value)
    // Return unsubscribe function
    return () => {
      listeners.delete(listener)
    }
  }
  
  return rune
}

/**
 * Creates a bindable value with optional validation and transformation
 */
export function $bindable<T>(initial: T, options: BindableOptions<T> = {}): BindableRune<T> {
  let value = initial
  const listeners = new Set<(value: T) => void>()
  const runeId = `bindable_${Date.now()}_${Math.random()}`
  
  // Emit rune created event
  const module = getReactivityModule()
  if (module) {
    Effect.runSync(module.emitStateChange(runeId, initial, 'user'))
  }
  
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
      const previousValue = value
      value = finalValue
      
      // Emit state change event
      if (module) {
        Effect.runSync(module.emitStateChange(runeId, finalValue, 'user'))
      }
      
      // Notify all listeners
      listeners.forEach(listener => listener(value))
    }
  }
  
  rune.$update = (fn: (current: T) => T) => {
    rune.$set(fn(value))
  }
  
  rune.$subscribe = (listener: (value: T) => void) => {
    listeners.add(listener)
    // Call listener immediately with current value
    listener(value)
    // Return unsubscribe function
    return () => {
      listeners.delete(listener)
    }
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

/**
 * Creates an effect that runs immediately and whenever dependencies change
 * For now, this is a simple implementation that just runs the function once
 */
// Re-export lifecycle-aware $effect and other lifecycle hooks
export { 
  $effect,
  onMount,
  onDestroy,
  beforeUpdate,
  afterUpdate,
  tick,
  untrack
} from './jsxLifecycle'

/**
 * Type guard to check if a value is a state rune
 */
export function isStateRune<T>(value: any): value is StateRune<T> {
  return !!(value && typeof value === 'function' && value.$type === 'state')
}

/**
 * Type guard to check if a value is a bindable rune
 */
export function isBindableRune<T>(value: any): value is BindableRune<T> {
  return !!(value && typeof value === 'function' && value.$type === 'bindable' && value.$bindable === true)
}

/**
 * Type guard to check if a value is a derived rune
 */
export function isDerivedRune<T>(value: any): value is DerivedRune<T> {
  return !!(value && typeof value === 'function' && value.$type === 'derived')
}

/**
 * Type guard to check if a value is any type of rune
 */
export function isRune<T>(value: any): value is Rune<T> {
  return !!(value && typeof value === 'function' && typeof value.$type === 'string')
}

/**
 * Gets the current value from a rune
 */
export function getValue<T>(rune: Rune<T>): T {
  return rune()
}

/**
 * Converts a state rune to a bindable rune
 */
export function toBindable<T>(state: StateRune<T>, options: BindableOptions<T> = {}): BindableRune<T> {
  // Create a bindable with the same initial value
  const bindable = $bindable(state(), options)
  const runeId = `toBindable_${Date.now()}_${Math.random()}`
  
  // Get reactivity module for event emission
  const module = getReactivityModule()
  
  // Override the set method to update both runes
  const originalSet = bindable.$set
  bindable.$set = (value: T) => {
    originalSet(value)
    state.$set(value)
    
    // Emit state sync event
    if (module) {
      Effect.runSync(module.emitStateChange(runeId, value, 'sync'))
    }
  }
  
  // Subscribe to state changes to keep bindable in sync
  state.$subscribe((value) => {
    originalSet(value)
    
    // Emit state sync event
    if (module) {
      Effect.runSync(module.emitStateChange(runeId, value, 'sync'))
    }
  })
  
  return bindable
}