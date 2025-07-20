/**
 * Runes - Svelte-inspired Reactive State Management
 * 
 * This is the new runes system with $bindable support.
 * Import from '@cli-kit/runes' to use these instead of the legacy reactivity system.
 */

export {
  // Core runes
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
} from './reactivity/runes'