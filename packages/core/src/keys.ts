/**
 * Key Types and Utilities - Comprehensive keyboard handling system
 * 
 * This module provides a complete keyboard input handling system inspired by
 * BubbleTea's proven approach to terminal input processing. It handles ANSI
 * escape sequences, modifier keys, and provides utilities for key matching
 * and binding.
 * 
 * ## Key Features:
 * 
 * ### Comprehensive Key Coverage
 * - Regular characters (letters, numbers, symbols)
 * - Special keys (arrows, function keys, navigation)
 * - Modifier combinations (Ctrl, Alt, Shift, Meta)
 * - ANSI escape sequence parsing
 * 
 * ### Cross-Platform Compatibility
 * - Handles various terminal emulator differences
 * - Consistent key naming across platforms
 * - Proper Unicode character support
 * 
 * ### Developer-Friendly API
 * - Simple key matching utilities
 * - Pre-defined common key bindings
 * - Normalized key event structure
 * - Easy-to-use binding helpers
 * 
 * ### Performance Optimized
 * - Fast ANSI sequence lookup with Map
 * - Efficient key name generation
 * - Minimal string allocations
 * 
 * @example
 * ```typescript
 * import { KeyUtils, KeyType, parseChar } from './keys'
 * 
 * // Key matching
 * if (KeyUtils.matches(event, 'ctrl+c', 'q')) {
 *   // Handle quit
 * }
 * 
 * // Create custom bindings
 * const saveBinding = KeyUtils.binding(['ctrl+s'], {
 *   key: 'ctrl+s',
 *   desc: 'save file'
 * })
 * 
 * // Parse character input
 * const keyEvent = parseChar('a', false, false, true) // Shift+A
 * ```
 * 
 * @module core/keys
 */

/**
 * Key types enumeration following BubbleTea's pattern
 * 
 * Defines all possible key types for comprehensive terminal input handling.
 * Regular character input uses the Runes type, while special keys have
 * dedicated types for precise handling.
 * 
 * @example
 * ```typescript
 * if (event.type === KeyType.Enter) {
 *   // Handle enter key
 * } else if (event.type === KeyType.Runes) {
 *   // Handle character input
 *   console.log('Character:', event.runes)
 * }
 * ```
 */
export enum KeyType {
  // Regular character input
  Runes = "runes",
  
  // Special keys
  Enter = "enter",
  Tab = "tab",
  Backspace = "backspace",
  Delete = "delete",
  Escape = "escape",
  Space = "space",
  
  // Navigation
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
  Home = "home",
  End = "end",
  PageUp = "pageup",
  PageDown = "pagedown",
  
  // Function keys
  F1 = "f1",
  F2 = "f2",
  F3 = "f3",
  F4 = "f4",
  F5 = "f5",
  F6 = "f6",
  F7 = "f7",
  F8 = "f8",
  F9 = "f9",
  F10 = "f10",
  F11 = "f11",
  F12 = "f12",
  
  // Control characters (following ASCII)
  CtrlA = "ctrl+a",
  CtrlB = "ctrl+b",
  CtrlC = "ctrl+c",
  CtrlD = "ctrl+d",
  CtrlE = "ctrl+e",
  CtrlF = "ctrl+f",
  CtrlG = "ctrl+g",
  CtrlH = "ctrl+h", // Backspace
  CtrlI = "ctrl+i", // Tab
  CtrlJ = "ctrl+j", // Enter
  CtrlK = "ctrl+k",
  CtrlL = "ctrl+l",
  CtrlM = "ctrl+m", // Enter
  CtrlN = "ctrl+n",
  CtrlO = "ctrl+o",
  CtrlP = "ctrl+p",
  CtrlQ = "ctrl+q",
  CtrlR = "ctrl+r",
  CtrlS = "ctrl+s",
  CtrlT = "ctrl+t",
  CtrlU = "ctrl+u",
  CtrlV = "ctrl+v",
  CtrlW = "ctrl+w",
  CtrlX = "ctrl+x",
  CtrlY = "ctrl+y",
  CtrlZ = "ctrl+z",
  
  // Modified navigation
  ShiftTab = "shift+tab",
  CtrlUp = "ctrl+up",
  CtrlDown = "ctrl+down",
  CtrlLeft = "ctrl+left",
  CtrlRight = "ctrl+right",
  ShiftUp = "shift+up",
  ShiftDown = "shift+down",
  ShiftLeft = "shift+left",
  ShiftRight = "shift+right",
  AltUp = "alt+up",
  AltDown = "alt+down",
  AltLeft = "alt+left",
  AltRight = "alt+right",
}

/**
 * Enhanced key event structure based on BubbleTea
 * 
 * Represents a complete keyboard input event with all relevant information
 * for proper key handling. The structure is designed to be comprehensive
 * yet easy to use for common input scenarios.
 * 
 * @example
 * ```typescript
 * const handleKey = (event: KeyEvent) => {
 *   // Check for specific key
 *   if (event.key === 'ctrl+c') {
 *     return 'quit'
 *   }
 *   
 *   // Check modifiers
 *   if (event.ctrl && event.runes === 's') {
 *     return 'save'
 *   }
 *   
 *   // Handle regular text input
 *   if (event.type === KeyType.Runes && event.runes) {
 *     return { type: 'input', text: event.runes }
 *   }
 * }
 * ```
 */
export interface KeyEvent {
  // Core identification
  readonly type?: KeyType     // Special key type (optional for compatibility)
  readonly runes?: string     // Unicode text (for regular characters)
  readonly key: string        // Normalized key name for matching ("ctrl+a", "enter", etc.)
  readonly code?: string      // DOM KeyboardEvent code for compatibility
  
  // Modifiers (explicit for clarity)
  readonly ctrl: boolean
  readonly alt: boolean
  readonly shift: boolean
  readonly meta: boolean      // Command key on macOS
  
  // Additional context
  readonly paste?: boolean    // Was this pasted?
  readonly sequence?: string  // Raw ANSI sequence for debugging
}

/**
 * ANSI sequence to key event mapping (comprehensive like BubbleTea)
 * 
 * Maps raw ANSI escape sequences to key event objects. This lookup table
 * handles the complex world of terminal escape sequences across different
 * terminal emulators and operating systems.
 * 
 * The mapping covers:
 * - Arrow keys (standard and VT sequences)
 * - Modified arrow keys (with Shift, Alt, Ctrl)
 * - Function keys (F1-F12)
 * - Navigation keys (Home, End, Page Up/Down)
 * - Special characters and control sequences
 * 
 * @example
 * ```typescript
 * const sequence = '\x1b[A' // Up arrow ANSI sequence
 * const keyEvent = ANSI_SEQUENCES.get(sequence)
 * if (keyEvent) {
 *   console.log('Up arrow pressed')
 * }
 * ```
 */
export const ANSI_SEQUENCES = new Map<string, Partial<KeyEvent>>([
  // Basic arrow keys
  ["\x1b[A", { type: KeyType.Up, key: "up", code: "ArrowUp" }],
  ["\x1b[B", { type: KeyType.Down, key: "down", code: "ArrowDown" }],
  ["\x1b[C", { type: KeyType.Right, key: "right", code: "ArrowRight" }],
  ["\x1b[D", { type: KeyType.Left, key: "left", code: "ArrowLeft" }],
  
  // VT sequences
  ["\x1bOA", { type: KeyType.Up, key: "up", code: "ArrowUp" }],
  ["\x1bOB", { type: KeyType.Down, key: "down", code: "ArrowDown" }],
  ["\x1bOC", { type: KeyType.Right, key: "right", code: "ArrowRight" }],
  ["\x1bOD", { type: KeyType.Left, key: "left", code: "ArrowLeft" }],
  
  // Modified arrows (shift)
  ["\x1b[1;2A", { type: KeyType.ShiftUp, key: "shift+up", shift: true }],
  ["\x1b[1;2B", { type: KeyType.ShiftDown, key: "shift+down", shift: true }],
  ["\x1b[1;2C", { type: KeyType.ShiftRight, key: "shift+right", shift: true }],
  ["\x1b[1;2D", { type: KeyType.ShiftLeft, key: "shift+left", shift: true }],
  
  // Modified arrows (alt)
  ["\x1b[1;3A", { type: KeyType.AltUp, key: "alt+up", alt: true }],
  ["\x1b[1;3B", { type: KeyType.AltDown, key: "alt+down", alt: true }],
  ["\x1b[1;3C", { type: KeyType.AltRight, key: "alt+right", alt: true }],
  ["\x1b[1;3D", { type: KeyType.AltLeft, key: "alt+left", alt: true }],
  
  // Modified arrows (ctrl)
  ["\x1b[1;5A", { type: KeyType.CtrlUp, key: "ctrl+up", ctrl: true }],
  ["\x1b[1;5B", { type: KeyType.CtrlDown, key: "ctrl+down", ctrl: true }],
  ["\x1b[1;5C", { type: KeyType.CtrlRight, key: "ctrl+right", ctrl: true }],
  ["\x1b[1;5D", { type: KeyType.CtrlLeft, key: "ctrl+left", ctrl: true }],
  
  // Function keys
  ["\x1bOP", { type: KeyType.F1, key: "f1" }],
  ["\x1bOQ", { type: KeyType.F2, key: "f2" }],
  ["\x1bOR", { type: KeyType.F3, key: "f3" }],
  ["\x1bOS", { type: KeyType.F4, key: "f4" }],
  ["\x1b[15~", { type: KeyType.F5, key: "f5" }],
  ["\x1b[17~", { type: KeyType.F6, key: "f6" }],
  ["\x1b[18~", { type: KeyType.F7, key: "f7" }],
  ["\x1b[19~", { type: KeyType.F8, key: "f8" }],
  ["\x1b[20~", { type: KeyType.F9, key: "f9" }],
  ["\x1b[21~", { type: KeyType.F10, key: "f10" }],
  ["\x1b[23~", { type: KeyType.F11, key: "f11" }],
  ["\x1b[24~", { type: KeyType.F12, key: "f12" }],
  
  // Navigation keys
  ["\x1b[H", { type: KeyType.Home, key: "home" }],
  ["\x1b[F", { type: KeyType.End, key: "end" }],
  ["\x1b[5~", { type: KeyType.PageUp, key: "pageup" }],
  ["\x1b[6~", { type: KeyType.PageDown, key: "pagedown" }],
  ["\x1b[2~", { type: KeyType.Runes, key: "insert" }], // Insert often acts as runes
  ["\x1b[3~", { type: KeyType.Delete, key: "delete", code: "Delete" }],
  
  // Tab variations
  ["\x1b[Z", { type: KeyType.ShiftTab, key: "shift+tab", shift: true }],
  
  // Special sequences
  ["\x1b", { type: KeyType.Escape, key: "escape", code: "Escape" }],
  ["\r", { type: KeyType.Enter, key: "enter", code: "Enter" }],
  ["\n", { type: KeyType.Enter, key: "enter", code: "Enter" }],
  ["\t", { type: KeyType.Tab, key: "tab", code: "Tab" }],
  ["\x7f", { type: KeyType.Backspace, key: "backspace", code: "Backspace" }],
  ["\x08", { type: KeyType.Backspace, key: "backspace", code: "Backspace" }],
  [" ", { type: KeyType.Space, key: "space", code: "Space" }],
])

/**
 * Generate a normalized key name from an event
 * 
 * Creates a consistent, normalized string representation of a key event
 * that can be used for key matching and binding. The format follows
 * the pattern: modifier+modifier+key (e.g., "ctrl+shift+a").
 * 
 * @param event - Key event to generate name for
 * @returns Normalized key name string
 * 
 * @example
 * ```typescript
 * const event = {
 *   type: KeyType.Runes,
 *   runes: 'a',
 *   ctrl: true,
 *   alt: false,
 *   shift: false,
 *   meta: false,
 *   key: ''
 * }
 * const name = getKeyName(event) // Returns: "ctrl+a"
 * ```
 */
export function getKeyName(event: KeyEvent): string {
  // For special keys, return the key directly
  if (event.type && event.type !== KeyType.Runes) {
    return event.key
  }
  
  // For runes, build the key name with modifiers
  const parts: string[] = []
  
  // Order: ctrl, alt, shift, meta, key
  if (event.ctrl) parts.push('ctrl')
  if (event.alt) parts.push('alt')
  if (event.shift && event.runes && event.runes !== event.runes.toLowerCase()) {
    parts.push('shift')
  }
  if (event.meta) parts.push('meta')
  
  if (event.runes) {
    parts.push(event.runes.toLowerCase())
  }
  
  return parts.join('+')
}

/**
 * Generate a proper KeyboardEvent code for a character
 * 
 * Creates DOM-compatible key codes for characters, useful for compatibility
 * with web-based terminal emulators and cross-platform development.
 * 
 * @param char - Character to generate code for
 * @returns DOM KeyboardEvent code or undefined if not mappable
 * 
 * @internal
 */
function generateKeyCode(char: string): string | undefined {
  // Letters
  if (char.match(/[a-zA-Z]/)) {
    return `Key${char.toUpperCase()}`
  }
  
  // Numbers 
  if (char.match(/[0-9]/)) {
    return `Digit${char}`
  }
  
  // Common special characters
  const specialCodes: Record<string, string> = {
    ' ': 'Space',
    '-': 'Minus',
    '=': 'Equal',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '\\': 'Backslash',
    ';': 'Semicolon',
    "'": 'Quote',
    '`': 'Backquote',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash'
  }
  
  return specialCodes[char]
}

/**
 * Parse a character into a KeyEvent
 * 
 * Converts a raw character into a complete KeyEvent object with proper
 * type classification and modifier handling. Handles control characters
 * and Unicode input correctly.
 * 
 * @param char - Character to parse
 * @param ctrl - Whether Ctrl modifier is active
 * @param alt - Whether Alt modifier is active  
 * @param shift - Whether Shift modifier is active
 * @returns Complete KeyEvent object
 * 
 * @example
 * ```typescript
 * // Regular character
 * const a = parseChar('a') // { type: KeyType.Runes, runes: 'a', ... }
 * 
 * // Control character
 * const ctrlC = parseChar('\x03', true) // { key: 'ctrl+c', ctrl: true, ... }
 * 
 * // Modified character
 * const shiftA = parseChar('A', false, false, true)
 * ```
 */
export function parseChar(char: string, ctrl = false, alt = false, shift = false): KeyEvent {
  const code = char.charCodeAt(0)
  
  // Control characters (0-31)
  if (code < 32) {
    const ctrlChar = String.fromCharCode(code + 96) // Convert to letter
    const keyName = `ctrl+${ctrlChar}`
    
    // Map common control characters to proper KeyType values
    let keyType: KeyType
    switch (char) {
      case '\t': keyType = KeyType.Tab; break
      case '\r':
      case '\n': keyType = KeyType.Enter; break
      case '\x1b': keyType = KeyType.Escape; break
      case ' ': keyType = KeyType.Space; break
      case '\x7f': keyType = KeyType.Delete; break
      case '\b': keyType = KeyType.Backspace; break
      default: keyType = KeyType.Runes; break
    }
    
    return {
      type: keyType,
      key: keyName,
      code: `Key${ctrlChar.toUpperCase()}`,
      runes: keyType === KeyType.Runes ? char : undefined,
      ctrl: true,
      alt,
      shift,
      meta: false,
    }
  }
  
  // Regular characters
  return {
    type: KeyType.Runes,
    key: getKeyName({
      type: KeyType.Runes,
      runes: char,
      ctrl,
      alt,
      shift,
      meta: false,
      key: ''
    }),
    code: generateKeyCode(char),
    runes: char,
    ctrl,
    alt,
    shift,
    meta: false,
  }
}

/**
 * Key matching utilities (BubbleTea style)
 * 
 * Provides convenient utilities for key matching, binding creation,
 * and common key combinations. Designed to make keyboard handling
 * simple and consistent across applications.
 * 
 * @example
 * ```typescript
 * // Simple key matching
 * if (KeyUtils.matches(event, 'ctrl+c', 'q')) {
 *   // Handle quit keys
 * }
 * 
 * // Use pre-defined bindings
 * if (KeyUtils.bindings.quit.matches(event)) {
 *   // Handle quit using common binding
 * }
 * 
 * // Create custom binding
 * const saveBinding = KeyUtils.binding(['ctrl+s', 'meta+s'], {
 *   key: 'ctrl+s',
 *   desc: 'save file'
 * })
 * ```
 */
export const KeyUtils = {
  /**
   * Check if a key event matches any of the given patterns
   * 
   * @param event - Key event to test
   * @param patterns - Key patterns to match against
   * @returns True if event matches any pattern
   */
  matches: (event: KeyEvent, ...patterns: string[]): boolean => {
    return patterns.includes(event.key)
  },
  
  /**
   * Create a key binding with optional help text
   * 
   * @param keys - Array of key patterns for this binding
   * @param help - Optional help information for display
   * @returns Binding object with matches method
   */
  binding: (keys: string[], help?: { key: string; desc: string }) => ({
    keys,
    help,
    matches: (event: KeyEvent) => keys.includes(event.key)
  }),
  
  /**
   * Common key bindings
   */
  bindings: {
    quit: { keys: ['ctrl+c', 'q'], help: { key: 'q', desc: 'quit' } },
    help: { keys: ['?', 'h'], help: { key: '?', desc: 'help' } },
    up: { keys: ['up', 'k'], help: { key: '↑/k', desc: 'up' } },
    down: { keys: ['down', 'j'], help: { key: '↓/j', desc: 'down' } },
    left: { keys: ['left', 'h'], help: { key: '←/h', desc: 'left' } },
    right: { keys: ['right', 'l'], help: { key: '→/l', desc: 'right' } },
    confirm: { keys: ['enter', 'y'], help: { key: 'enter', desc: 'confirm' } },
    cancel: { keys: ['escape', 'n'], help: { key: 'esc', desc: 'cancel' } },
  }
}