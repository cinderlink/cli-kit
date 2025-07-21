/**
 * Reactivity System Exports
 * 
 * Svelte-inspired runes for reactive state management
 */

export {
  // Runes
  $state,
  $bindable,
  $derived,
  $effect,
  
  // Types
  type Rune,
  type StateRune,
  type BindableRune,
  type DerivedRune,
  type BindableOptions,
  
  // Type guards
  isRune,
  isStateRune,
  isBindableRune,
  isDerivedRune,
  
  // Utilities
  getValue,
  toBindable
} from '../core/update/reactivity/runes'

// Export JSX lifecycle hooks
export * from '../core/update/reactivity/jsx-lifecycle'