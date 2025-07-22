/**
 * Reactivity Domain Event System
 * 
 * Defines events for Svelte 5 runes and reactive state management.
 * These events track state changes, lifecycle hooks, and reactive dependencies.
 */

/**
 * Base event interface for all reactivity events
 */
export interface BaseReactivityEvent {
  readonly timestamp: Date
  readonly source: 'reactivity'
}

/**
 * Rune lifecycle events
 */
export interface RuneEvent extends BaseReactivityEvent {
  readonly type: 'rune-created' | 'rune-updated' | 'rune-destroyed'
  readonly runeId: string
  readonly runeName: string
  readonly value?: unknown
  readonly previousValue?: unknown
}

/**
 * Component lifecycle events
 */
export interface LifecycleEvent extends BaseReactivityEvent {
  readonly type: 'lifecycle-mount' | 'lifecycle-unmount' | 'lifecycle-update'
  readonly componentId: string
  readonly hookName?: string
  readonly dependencies?: unknown[]
}

/**
 * State change events
 */
export interface StateEvent extends BaseReactivityEvent {
  readonly type: 'state-change' | 'state-invalidation'
  readonly stateId: string
  readonly value: unknown
  readonly source: 'user' | 'effect' | 'prop' | 'sync'
}

/**
 * Effect execution events
 */
export interface EffectEvent extends BaseReactivityEvent {
  readonly type: 'effect-scheduled' | 'effect-executed' | 'effect-cleanup'
  readonly effectId: string
  readonly dependencies?: unknown[]
  readonly error?: Error
}

/**
 * Derived state events
 */
export interface DerivedEvent extends BaseReactivityEvent {
  readonly type: 'derived-computed' | 'derived-invalidated'
  readonly derivedId: string
  readonly value?: unknown
  readonly dependencies?: string[]
}

/**
 * All reactivity event types
 */
export type ReactivityEvent = 
  | RuneEvent
  | LifecycleEvent
  | StateEvent
  | EffectEvent
  | DerivedEvent

/**
 * Reactivity event channel names
 */
export const ReactivityEventChannels = {
  RUNE: 'reactivity-rune',
  LIFECYCLE: 'reactivity-lifecycle',
  STATE: 'reactivity-state',
  EFFECT: 'reactivity-effect',
  DERIVED: 'reactivity-derived'
} as const

export type ReactivityEventChannel = typeof ReactivityEventChannels[keyof typeof ReactivityEventChannels]

/**
 * Rune handle interface for type-safe reactive values
 */
export interface RuneHandle<T> {
  readonly id: string
  readonly name: string
  get value(): T
  set value(newValue: T)
  subscribe(callback: (value: T) => void): () => void
  destroy(): void
}