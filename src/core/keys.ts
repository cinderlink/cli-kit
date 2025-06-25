/**
 * Key Types and Utilities - Based on BubbleTea's proven keyboard handling
 */

/**
 * Key types enumeration following BubbleTea's pattern
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
 */
export interface KeyEvent {
  // Core identification
  readonly type: KeyType      // Special key type
  readonly runes?: string     // Unicode text (for regular characters)
  readonly key: string        // Normalized key name for matching ("ctrl+a", "enter", etc.)
  
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
 */
export const ANSI_SEQUENCES = new Map<string, Partial<KeyEvent>>([
  // Basic arrow keys
  ["\x1b[A", { type: KeyType.Up, key: "up" }],
  ["\x1b[B", { type: KeyType.Down, key: "down" }],
  ["\x1b[C", { type: KeyType.Right, key: "right" }],
  ["\x1b[D", { type: KeyType.Left, key: "left" }],
  
  // VT sequences
  ["\x1bOA", { type: KeyType.Up, key: "up" }],
  ["\x1bOB", { type: KeyType.Down, key: "down" }],
  ["\x1bOC", { type: KeyType.Right, key: "right" }],
  ["\x1bOD", { type: KeyType.Left, key: "left" }],
  
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
  ["\x1b[3~", { type: KeyType.Delete, key: "delete" }],
  
  // Tab variations
  ["\x1b[Z", { type: KeyType.ShiftTab, key: "shift+tab", shift: true }],
  
  // Special sequences
  ["\x1b", { type: KeyType.Escape, key: "escape" }],
  ["\r", { type: KeyType.Enter, key: "enter" }],
  ["\n", { type: KeyType.Enter, key: "enter" }],
  ["\t", { type: KeyType.Tab, key: "tab" }],
  ["\x7f", { type: KeyType.Backspace, key: "backspace" }],
  ["\x08", { type: KeyType.Backspace, key: "backspace" }],
  [" ", { type: KeyType.Space, key: "space" }],
])

/**
 * Generate a normalized key name from an event
 */
export function getKeyName(event: KeyEvent): string {
  // For special keys, return the key directly
  if (event.type !== KeyType.Runes) {
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
 * Parse a character into a KeyEvent
 */
export function parseChar(char: string, ctrl = false, alt = false, shift = false): KeyEvent {
  const code = char.charCodeAt(0)
  
  // Control characters (0-31)
  if (code < 32) {
    const ctrlChar = String.fromCharCode(code + 96) // Convert to letter
    const type = `ctrl+${ctrlChar}` as KeyType
    return {
      type: type in KeyType ? type : KeyType.Runes,
      key: `ctrl+${ctrlChar}`,
      runes: type === KeyType.Runes ? char : undefined,
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
    runes: char,
    ctrl,
    alt,
    shift,
    meta: false,
  }
}

/**
 * Key matching utilities (BubbleTea style)
 */
export const KeyUtils = {
  /**
   * Check if a key event matches any of the given patterns
   */
  matches: (event: KeyEvent, ...patterns: string[]): boolean => {
    return patterns.includes(event.key)
  },
  
  /**
   * Create a key binding
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