/**
 * Focus Service - Manages focus state and keyboard navigation
 * 
 * Provides:
 * - Focus tracking across components
 * - Tab order management
 * - Focus trapping for modals/dialogs
 * - Keyboard shortcut registry
 * - Focus restoration
 */

import { Context, Effect, Option, Ref, pipe } from "effect"

// =============================================================================
// Focus Service Interface
// =============================================================================

/**
 * Focus information for a component
 */
export interface FocusableComponent {
  readonly id: string
  readonly tabIndex: number
  readonly focusable: boolean
  readonly trapped?: boolean
  readonly onFocus?: () => Effect.Effect<void, never, never>
  readonly onBlur?: () => Effect.Effect<void, never, never>
}

/**
 * Focus service interface
 */
export interface FocusService {
  /**
   * Register a focusable component
   */
  readonly register: (component: FocusableComponent) => Effect.Effect<void, never, never>
  
  /**
   * Unregister a component
   */
  readonly unregister: (id: string) => Effect.Effect<void, never, never>
  
  /**
   * Get the currently focused component
   */
  readonly getCurrentFocus: () => Effect.Effect<Option.Option<string>, never, never>
  
  /**
   * Set focus to a specific component
   */
  readonly setFocus: (id: string) => Effect.Effect<boolean, never, never>
  
  /**
   * Clear focus from all components
   */
  readonly clearFocus: () => Effect.Effect<void, never, never>
  
  /**
   * Move focus to the next component in tab order
   */
  readonly focusNext: () => Effect.Effect<Option.Option<string>, never, never>
  
  /**
   * Move focus to the previous component in tab order
   */
  readonly focusPrevious: () => Effect.Effect<Option.Option<string>, never, never>
  
  /**
   * Trap focus within a specific component (e.g., modal)
   */
  readonly trapFocus: (containerId: string) => Effect.Effect<void, never, never>
  
  /**
   * Release focus trap
   */
  readonly releaseTrap: () => Effect.Effect<void, never, never>
  
  /**
   * Save current focus state
   */
  readonly saveFocusState: () => Effect.Effect<void, never, never>
  
  /**
   * Restore previously saved focus state
   */
  readonly restoreFocusState: () => Effect.Effect<void, never, never>
  
  /**
   * Get all registered components in tab order
   */
  readonly getTabOrder: () => Effect.Effect<ReadonlyArray<FocusableComponent>, never, never>
  
  /**
   * Check if a component has focus
   */
  readonly hasFocus: (id: string) => Effect.Effect<boolean, never, never>
}

/**
 * Focus service tag
 */
export const FocusService = Context.GenericTag<FocusService>("@app/FocusService")

// =============================================================================
// Focus State
// =============================================================================

interface FocusState {
  readonly components: Map<string, FocusableComponent>
  readonly currentFocus: Option.Option<string>
  readonly focusTrap: Option.Option<string>
  readonly savedFocus: Option.Option<string>
}

const initialState: FocusState = {
  components: new Map(),
  currentFocus: Option.none(),
  focusTrap: Option.none(),
  savedFocus: Option.none()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get components sorted by tab order
 */
const getSortedComponents = (
  components: Map<string, FocusableComponent>,
  trapId?: string
): FocusableComponent[] => {
  let comps = Array.from(components.values())
    .filter(c => c.focusable)
    .sort((a, b) => a.tabIndex - b.tabIndex)
  
  // If focus is trapped, only include components within the trap
  if (trapId) {
    // In a real implementation, we'd check component hierarchy
    // For now, we'll only focus the trap component
    comps = comps.filter(c => c.id === trapId || c.trapped)
  }
  
  return comps
}

/**
 * Find the next focusable component
 */
const findNextComponent = (
  components: FocusableComponent[],
  currentId: Option.Option<string>
): Option.Option<FocusableComponent> => {
  if (components.length === 0) return Option.none()
  
  if (Option.isNone(currentId)) {
    return Option.some(components[0])
  }
  
  const currentIndex = components.findIndex(c => c.id === currentId.value)
  if (currentIndex === -1) {
    return Option.some(components[0])
  }
  
  const nextIndex = (currentIndex + 1) % components.length
  return Option.some(components[nextIndex])
}

/**
 * Find the previous focusable component
 */
const findPreviousComponent = (
  components: FocusableComponent[],
  currentId: Option.Option<string>
): Option.Option<FocusableComponent> => {
  if (components.length === 0) return Option.none()
  
  if (Option.isNone(currentId)) {
    return Option.some(components[components.length - 1])
  }
  
  const currentIndex = components.findIndex(c => c.id === currentId.value)
  if (currentIndex === -1) {
    return Option.some(components[components.length - 1])
  }
  
  const prevIndex = currentIndex === 0 ? components.length - 1 : currentIndex - 1
  return Option.some(components[prevIndex])
}

// =============================================================================
// Focus Service Implementation
// =============================================================================

/**
 * Create a live focus service
 */
export const FocusServiceLive = Effect.gen(function* (_) {
  const stateRef = yield* _(Ref.make(initialState))
  
  const register = (component: FocusableComponent) =>
    Ref.update(stateRef, state => ({
      ...state,
      components: new Map(state.components).set(component.id, component)
    }))
  
  const unregister = (id: string) =>
    Ref.update(stateRef, state => {
      const components = new Map(state.components)
      components.delete(id)
      return {
        ...state,
        components,
        currentFocus: Option.filter(state.currentFocus, focusId => focusId !== id)
      }
    })
  
  const getCurrentFocus = () =>
    Ref.get(stateRef).pipe(
      Effect.map(state => state.currentFocus)
    )
  
  const setFocus = (id: string) =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      const component = state.components.get(id)
      
      if (!component || !component.focusable) {
        return false
      }
      
      // Blur current component
      if (Option.isSome(state.currentFocus)) {
        const current = state.components.get(state.currentFocus.value)
        if (current?.onBlur) {
          yield* _(current.onBlur())
        }
      }
      
      // Update state
      yield* _(Ref.update(stateRef, s => ({
        ...s,
        currentFocus: Option.some(id)
      })))
      
      // Focus new component
      if (component.onFocus) {
        yield* _(component.onFocus())
      }
      
      return true
    })
  
  const clearFocus = () =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      
      // Blur current component
      if (Option.isSome(state.currentFocus)) {
        const current = state.components.get(state.currentFocus.value)
        if (current?.onBlur) {
          yield* _(current.onBlur())
        }
      }
      
      yield* _(Ref.update(stateRef, s => ({
        ...s,
        currentFocus: Option.none()
      })))
    })
  
  const focusNext = () =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      const trapId = Option.getOrNull(state.focusTrap)
      const components = getSortedComponents(state.components, trapId)
      const next = findNextComponent(components, state.currentFocus)
      
      if (Option.isSome(next)) {
        yield* _(setFocus(next.value.id))
        return Option.some(next.value.id)
      }
      
      return Option.none()
    })
  
  const focusPrevious = () =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      const trapId = Option.getOrNull(state.focusTrap)
      const components = getSortedComponents(state.components, trapId)
      const prev = findPreviousComponent(components, state.currentFocus)
      
      if (Option.isSome(prev)) {
        yield* _(setFocus(prev.value.id))
        return Option.some(prev.value.id)
      }
      
      return Option.none()
    })
  
  const trapFocus = (containerId: string) =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      
      // Save current focus before trapping
      yield* _(Ref.update(stateRef, s => ({
        ...s,
        focusTrap: Option.some(containerId),
        savedFocus: s.currentFocus
      })))
      
      // Focus the trap container or first focusable element within
      const component = state.components.get(containerId)
      if (component && component.focusable) {
        yield* _(setFocus(containerId))
      }
    })
  
  const releaseTrap = () =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      
      yield* _(Ref.update(stateRef, s => ({
        ...s,
        focusTrap: Option.none()
      })))
      
      // Restore saved focus if any
      if (Option.isSome(state.savedFocus)) {
        yield* _(setFocus(state.savedFocus.value))
      }
    })
  
  const saveFocusState = () =>
    Ref.update(stateRef, state => ({
      ...state,
      savedFocus: state.currentFocus
    }))
  
  const restoreFocusState = () =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.get(stateRef))
      
      if (Option.isSome(state.savedFocus)) {
        yield* _(setFocus(state.savedFocus.value))
      }
    })
  
  const getTabOrder = () =>
    Ref.get(stateRef).pipe(
      Effect.map(state => {
        const trapId = Option.getOrNull(state.focusTrap)
        return getSortedComponents(state.components, trapId)
      })
    )
  
  const hasFocus = (id: string) =>
    Ref.get(stateRef).pipe(
      Effect.map(state => 
        Option.isSome(state.currentFocus) && state.currentFocus.value === id
      )
    )
  
  return FocusService.of({
    register,
    unregister,
    getCurrentFocus,
    setFocus,
    clearFocus,
    focusNext,
    focusPrevious,
    trapFocus,
    releaseTrap,
    saveFocusState,
    restoreFocusState,
    getTabOrder,
    hasFocus
  })
})

// =============================================================================
// Focus Utilities
// =============================================================================

/**
 * Create a focusable component registration
 */
export const focusable = (
  id: string,
  tabIndex: number = 0,
  options: {
    focusable?: boolean
    trapped?: boolean
    onFocus?: () => Effect.Effect<void, never, never>
    onBlur?: () => Effect.Effect<void, never, never>
  } = {}
): FocusableComponent => ({
  id,
  tabIndex,
  focusable: options.focusable ?? true,
  trapped: options.trapped,
  onFocus: options.onFocus,
  onBlur: options.onBlur
})

/**
 * Effect to register a component and unregister on cleanup
 */
export const withFocus = (component: FocusableComponent) =>
  Effect.acquireRelease(
    FocusService.pipe(
      Effect.flatMap(service => service.register(component)),
      Effect.as(component)
    ),
    () => FocusService.pipe(
      Effect.flatMap(service => service.unregister(component.id))
    )
  )