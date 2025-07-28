/**
 * Input Module Error Definitions
 *
 * Error types and factories for the input module.
 */

import { Data } from 'effect'

// =============================================================================
// Focus Errors
// =============================================================================

/**
 * Error thrown when trying to focus a non-existent component
 */
export class ComponentNotFoundError extends Data.TaggedError('ComponentNotFoundError')<{
  readonly componentId: string
  readonly operation: string
}> {}

/**
 * Error thrown when trying to focus a non-focusable component
 */
export class ComponentNotFocusableError extends Data.TaggedError('ComponentNotFocusableError')<{
  readonly componentId: string
}> {}

/**
 * Error thrown when focus trap operations fail
 */
export class FocusTrapError extends Data.TaggedError('FocusTrapError')<{
  readonly trapId: string
  readonly reason: string
}> {}

// =============================================================================
// Mouse Errors
// =============================================================================

/**
 * Error thrown when mouse coordinates are invalid
 */
export class InvalidMouseCoordinatesError extends Data.TaggedError('InvalidMouseCoordinatesError')<{
  readonly x: number
  readonly y: number
  readonly reason: string
}> {}

/**
 * Error thrown when hit testing fails
 */
export class HitTestError extends Data.TaggedError('HitTestError')<{
  readonly x: number
  readonly y: number
  readonly reason: string
}> {}

// =============================================================================
// Keyboard Errors
// =============================================================================

/**
 * Error thrown when key event parsing fails
 */
export class KeyEventParseError extends Data.TaggedError('KeyEventParseError')<{
  readonly input: unknown
  readonly reason: string
}> {}

/**
 * Error thrown when keyboard shortcut conflicts
 */
export class ShortcutConflictError extends Data.TaggedError('ShortcutConflictError')<{
  readonly shortcut: string
  readonly existingHandler: string
  readonly newHandler: string
}> {}

// =============================================================================
// General Input Errors
// =============================================================================

/**
 * Error thrown when input validation fails
 */
export class InputValidationError extends Data.TaggedError('InputValidationError')<{
  readonly input: unknown
  readonly expected: string
  readonly reason: string
}> {}

/**
 * Error thrown when input state is corrupted
 */
export class InputStateError extends Data.TaggedError('InputStateError')<{
  readonly state: string
  readonly reason: string
}> {}

// =============================================================================
// Error Union Types
// =============================================================================

/**
 * All focus-related errors
 */
export type FocusError = ComponentNotFoundError | ComponentNotFocusableError | FocusTrapError

/**
 * All mouse-related errors
 */
export type MouseError = InvalidMouseCoordinatesError | HitTestError

/**
 * All keyboard-related errors
 */
export type KeyboardError = KeyEventParseError | ShortcutConflictError

/**
 * All input module errors
 */
export type InputError =
  | FocusError
  | MouseError
  | KeyboardError
  | InputValidationError
  | InputStateError
