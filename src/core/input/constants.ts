/**
 * Input Module Constants
 *
 * Shared constants for keyboard, mouse, and focus management.
 */

// =============================================================================
// Focus Constants
// =============================================================================

/**
 * Default tab index for focusable components
 */
export const DEFAULT_TAB_INDEX = 0

/**
 * Tab index for components that should be focusable programmatically but not via tab
 */
export const PROGRAMMATIC_FOCUS_TAB_INDEX = -1

/**
 * Maximum depth for focus trap nesting
 */
export const MAX_FOCUS_TRAP_DEPTH = 10

/**
 * Delay in milliseconds before focus changes are announced
 */
export const FOCUS_ANNOUNCEMENT_DELAY = 100

// =============================================================================
// Mouse Constants
// =============================================================================

/**
 * Double-click threshold in milliseconds
 */
export const DOUBLE_CLICK_THRESHOLD = 300

/**
 * Drag threshold in pixels
 */
export const DRAG_THRESHOLD = 5

/**
 * Mouse wheel delta multiplier
 */
export const WHEEL_DELTA_MULTIPLIER = 10

/**
 * Default z-index for components
 */
export const DEFAULT_Z_INDEX = 0

// =============================================================================
// Keyboard Constants
// =============================================================================

/**
 * Key repeat initial delay in milliseconds
 */
export const KEY_REPEAT_INITIAL_DELAY = 500

/**
 * Key repeat interval in milliseconds
 */
export const KEY_REPEAT_INTERVAL = 30

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  FOCUS_NEXT: 'Tab',
  FOCUS_PREVIOUS: 'Shift+Tab',

  // Actions
  ACTIVATE: 'Enter',
  CANCEL: 'Escape',

  // Movement
  MOVE_UP: 'ArrowUp',
  MOVE_DOWN: 'ArrowDown',
  MOVE_LEFT: 'ArrowLeft',
  MOVE_RIGHT: 'ArrowRight',

  // Selection
  SELECT_ALL: 'Ctrl+A',
  SELECT_ALL_MAC: 'Cmd+A',
} as const

/**
 * Special key codes
 */
export const SPECIAL_KEYS = {
  BACKSPACE: 'Backspace',
  TAB: 'Tab',
  ENTER: 'Enter',
  SHIFT: 'Shift',
  CTRL: 'Control',
  ALT: 'Alt',
  META: 'Meta',
  ESCAPE: 'Escape',
  SPACE: ' ',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  END: 'End',
  HOME: 'Home',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_UP: 'ArrowUp',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_DOWN: 'ArrowDown',
  DELETE: 'Delete',
} as const

// =============================================================================
// Input State Constants
// =============================================================================

/**
 * Maximum number of tracked mouse positions for gesture detection
 */
export const MAX_MOUSE_HISTORY = 10

/**
 * Maximum number of keys that can be pressed simultaneously
 */
export const MAX_PRESSED_KEYS = 10

/**
 * Input event queue size
 */
export const INPUT_EVENT_QUEUE_SIZE = 100

// =============================================================================
// Performance Constants
// =============================================================================

/**
 * Throttle delay for mouse move events in milliseconds
 */
export const MOUSE_MOVE_THROTTLE = 16 // ~60fps

/**
 * Debounce delay for resize events in milliseconds
 */
export const RESIZE_DEBOUNCE = 150

/**
 * Maximum time to spend processing input per frame in milliseconds
 */
export const INPUT_PROCESSING_BUDGET = 8
