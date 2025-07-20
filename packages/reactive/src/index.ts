/**
 * Reactivity System Exports
 * 
 * Svelte 5 compatible reactive system for TUIX
 */

// Core runes
export {
  $state,
  $derived,
  $effect,
  
  // Types
  type State,
  type Derived,
  type ReactiveValue,
  type EffectFunction,
  type EffectCleanup,
  
  // Type guards
  isReactive,
  isState,
  isDerived,
  
  // Utilities
  getValue,
  batch,
  untrack
} from './runes'

// State management
export {
  createState,
  createStore,
  combineStates,
  createPersistedState,
  
  // Types
  type StateContainer,
  type Store
} from './state'

// Advanced derived values
export {
  createMemoized,
  createAsyncDerived,
  createSelector,
  combineLatest,
  createDebounced,
  createThrottled,
  createDefined,
  createSafe,
  
  // Types
  type MemoizedDerived,
  type AsyncDerived,
  type SelectorDerived
} from './derived'

// Advanced effects
export {
  createEffect,
  createScheduledEffect,
  createAsyncEffect,
  createScheduler,
  createConditionalEffect,
  createDebouncedEffect,
  createThrottledEffect,
  createEffectGroup,
  onCleanup,
  onMount,
  onUnmount,
  afterUpdate,
  getEffectStats,
  disposeAllEffects,
  
  // Types
  type EffectHandle,
  type ScheduledEffect,
  type AsyncEffectHandle,
  type EffectScheduler,
  type LifecyclePhase
} from './effects'

// Component integration
export {
  ReactiveComponent,
  useReactiveState,
  useReactiveDerived,
  useReactiveEffect,
  createReactiveIntegration,
  withReactive,
  createComponentStore,
  ReactiveSystemAPI,
  
  // Types
  type ReactiveComponentIntegration,
  type ComponentReactiveContext,
  type ReactiveLifecycleHooks
} from './components'

// Legacy compatibility exports
import { $state as stateImport, isReactive, isState, isDerived } from './runes'
export const $bindable = stateImport
export type StateRune<T> = State<T>
export type BindableRune<T> = State<T>
export type DerivedRune<T> = Derived<T>
export type Rune<T> = State<T> | Derived<T>

export const isRune = isReactive
export const isStateRune = isState
export const isBindableRune = isState  
export const isDerivedRune = isDerived

// Legacy toBindable function
export function toBindable<T>(state: State<T>): State<T> {
  return state // In the new system, states are already bindable
}

// Legacy BindableOptions type
export interface BindableOptions<T> {
  validate?: (value: T) => boolean | string
  transform?: (value: T) => T
}