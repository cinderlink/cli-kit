/**
 * Core Input Module
 *
 * Provides comprehensive input handling for terminal applications, including
 * keyboard focus management, mouse interaction, and keyboard event processing.
 *
 * @module core/input
 */

// =============================================================================
// Public API Exports
// =============================================================================

// Types
export type {
  // Mouse types
  MouseEvent,
  MouseEventType,
  MouseButton,
  ComponentBounds,
  HitTestResult,
  MouseRegion,
  ComponentMouseHandler,
  MouseRoutingResult,
  // Keyboard types
  KeyEvent,
  KeyEventType,
  // Focus types
  FocusableComponent,
  FocusEventType,
  FocusDirection,
  FocusTrapMode,
  // State types
  InputState,
} from './types'

// Errors
export {
  // Focus errors
  ComponentNotFoundError,
  ComponentNotFocusableError,
  FocusTrapError,
  // Mouse errors
  InvalidMouseCoordinatesError,
  HitTestError,
  // Keyboard errors
  KeyEventParseError,
  ShortcutConflictError,
  // General errors
  InputValidationError,
  InputStateError,
} from './errors'

// Constants
export * from './constants'

// =============================================================================
// Focus Management
// =============================================================================

export {
  FocusService,
  FocusServiceLive,
  focusable,
  withFocus,
} from './focus/manager'

// =============================================================================
// Mouse Handling
// =============================================================================

export {
  HitTestService,
  HitTestServiceLive,
  createBounds,
  mouseEventHitsComponent,
  createHitTestService,
} from './mouse/hitTest'

export {
  MouseRouterService,
  MouseRouterServiceLive,
  clickHandler,
  pressReleaseHandler,
  coordinateHandler,
} from './mouse/router'

// =============================================================================
// Module Documentation
// =============================================================================

/**
 * The input module provides three main subsystems:
 *
 * 1. **Focus Management** - Tab order, focus trapping, and keyboard navigation
 * 2. **Mouse Handling** - Click detection, hover states, and hit testing
 * 3. **Keyboard Processing** - Key event parsing and shortcut handling
 *
 * ## Usage Example
 *
 * ```typescript
 * import { FocusService, HitTestService, MouseRouterService } from '@core/input'
 * import { Effect, Layer } from 'effect'
 *
 * const program = Effect.gen(function* (_) {
 *   const focus = yield* _(FocusService)
 *   const hitTest = yield* _(HitTestService)
 *   const router = yield* _(MouseRouterService)
 *
 *   // Register a focusable component
 *   yield* _(focus.register({
 *     id: 'my-button',
 *     tabIndex: 0,
 *     focusable: true
 *   }))
 *
 *   // Register component bounds for mouse handling
 *   yield* _(hitTest.registerComponent({
 *     componentId: 'my-button',
 *     x: 10,
 *     y: 5,
 *     width: 20,
 *     height: 3,
 *     zIndex: 1
 *   }))
 * })
 *
 * const MainLayer = Layer.mergeAll(
 *   FocusServiceLive,
 *   HitTestServiceLive,
 *   MouseRouterServiceLive
 * )
 *
 * const runnable = Effect.provide(program, MainLayer)
 * ```
 */
