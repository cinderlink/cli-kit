/**
 * Runes - Svelte-inspired Reactive State Management
 * 
 * This is the new runes system with $bindable support.
 * Import from '@cli-kit/runes' to use these instead of the legacy reactivity system.
 */

// Re-export from runes module for legacy compatibility
export {
  $state,
  $derived, 
  $effect,
  type State,
  type Derived,
  type ReactiveValue,
  isState,
  isDerived,
  getValue,
  batch,
  untrack,
  isReactive
} from './runes/index'

// Legacy aliases - define them here to avoid circular references
import { $state } from './runes/index'
export const $bindable = $state
export type { State as Rune } from './runes/index'
export type { State as StateRune } from './runes/index'
export type { State as BindableRune } from './runes/index'
export type { Derived as DerivedRune } from './runes/index'
export { isState as isRune } from './runes/index'
export { isState as isStateRune } from './runes/index'
export { isState as isBindableRune } from './runes/index'
export { isDerived as isDerivedRune } from './runes/index'
// Legacy toBindable implemented as identity function
export function toBindable<T>(state: any): any {
  return state
}

// Legacy options type
export interface BindableOptions<T> {
  validate?: (value: T) => boolean | string
  transform?: (value: T) => T
}

// JSX runtime exports would be added here when jsx-runtime is implemented