/**
 * Component Base - Common interfaces and utilities for all TUIX components
 * 
 * This module provides the foundational types and utilities for building interactive
 * terminal UI components in the TUIX framework. Inspired by the Bubbletea ecosystem,
 * it establishes consistent patterns for focus management, keyboard/mouse handling,
 * styling, and component lifecycle.
 * 
 * ## Key Features:
 * 
 * ### Component Architecture
 * - Standard UIComponent interface extending MVU pattern
 * - Focus management with keyboard navigation support
 * - Size constraints and responsive behavior
 * - Mouse event handling for interactive elements
 * 
 * ### State Management
 * - Focusable, Sized, and Disableable mixins
 * - Common message types for component communication
 * - Type-safe event handling with Effect integration
 * 
 * ### Keyboard Handling
 * - Flexible key binding system with help text
 * - Standard key map interface for navigation
 * - Pattern matching for complex key combinations
 * - Support for modifier keys (Ctrl, Alt, Shift, Meta)
 * 
 * ### Styling System
 * - Consistent style structure across components
 * - State-based styling (base, focused, disabled)
 * - Style composition and merging utilities
 * - Integration with TUIX styling system
 * 
 * @example
 * ```typescript
 * import { UIComponent, Focusable, createDefaultStyles } from './base'
 * 
 * interface ButtonModel extends Focusable {
 *   label: string
 *   focused: boolean
 * }
 * 
 * class Button implements UIComponent<ButtonModel, ButtonMsg> {
 *   readonly id = generateComponentId('button')
 *   readonly styles = createDefaultStyles({
 *     base: style().padding(1).border('rounded')
 *   })
 *   
 *   // Implement UIComponent methods...
 * }
 * ```
 * 
 * @module components/base
 */

import { Effect } from "effect"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "../core/types"
import { Style, style, Colors } from "../styling/index"

// =============================================================================
// Component Interfaces
// =============================================================================

/**
 * Base interface for all interactive components
 * 
 * Extends the standard Component interface with common UI functionality including
 * focus management, size constraints, event handling, and styling. All interactive
 * components in TUIX should implement this interface for consistency.
 * 
 * @template Model - The component's state type
 * @template Msg - The component's message type for updates
 */
export interface UIComponent<Model, Msg> {
  // Standard MVU methods
  init(): Effect.Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  update(msg: Msg, model: Model): Effect.Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  view(model: Model): View
  
  // Focus management
  focus(): Effect.Effect<Cmd<Msg>, never, never>
  blur(): Effect.Effect<Cmd<Msg>, never, never>
  focused(model: Model): boolean
  
  // Size management
  setSize(width: number, height?: number): Effect.Effect<void, never, never>
  getSize(model: Model): { width: number; height?: number }
  
  // Key handling
  handleKey?: (key: KeyEvent, model: Model) => Msg | null
  
  // Mouse handling
  handleMouse?: (mouse: MouseEvent, model: Model) => Msg | null
  
  // Component ID for hit testing
  readonly id: string
  
  // Styling
  styles?: ComponentStyles
}

/**
 * Standard component styles structure
 * 
 * Provides consistent styling across all components with predefined states
 * (base, focused, disabled) and extensibility for component-specific styles.
 * Components should use this structure to ensure visual consistency.
 */
export interface ComponentStyles {
  // Base styles
  readonly base: Style
  readonly focused: Style
  readonly disabled: Style
  
  // Component-specific styles
  [key: string]: Style
}

/**
 * Focus state mixin for component models
 * 
 * Add this to component models that need to track focus state.
 * Components implementing this can respond to focus/blur events
 * and adjust their rendering accordingly.
 */
export interface Focusable {
  readonly focused: boolean
}

/**
 * Size constraint mixin for component models
 * 
 * Add this to component models that need size awareness and constraints.
 * Supports both fixed dimensions and min/max constraints for responsive behavior.
 */
export interface Sized {
  readonly width: number
  readonly height?: number
  readonly minWidth?: number
  readonly maxWidth?: number
  readonly minHeight?: number
  readonly maxHeight?: number
}

/**
 * Disabled state mixin for component models
 */
export interface Disableable {
  readonly disabled: boolean
}

// =============================================================================
// Key Binding Helpers
// =============================================================================

/**
 * Key binding definition for components
 * 
 * Defines a keyboard shortcut that triggers a message, including
 * help text for user documentation and optional disabled state.
 * 
 * @template Msg - The message type triggered by this binding
 */
export interface KeyBinding<Msg> {
  readonly keys: string[]
  readonly help: { key: string; desc: string }
  readonly msg: Msg
  readonly disabled?: boolean
}

/**
 * Create a key binding helper
 * 
 * Convenience function for creating key bindings with a more concise syntax.
 * 
 * @param keys - Array of key patterns that trigger this binding
 * @param help - Tuple of [key display, description] for help text
 * @param msg - Message to send when key is pressed
 * @param disabled - Whether the binding is currently disabled
 * @returns Complete key binding object
 * 
 * @example
 * ```typescript
 * const enterBinding = keyBinding(
 *   ['enter', 'return'],
 *   ['⏎', 'select item'],
 *   { _tag: 'Select' }
 * )
 * ```
 */
export const keyBinding = <Msg>(
  keys: string[],
  help: [string, string],
  msg: Msg,
  disabled = false
): KeyBinding<Msg> => ({
  keys,
  help: { key: help[0], desc: help[1] },
  msg,
  disabled
})

/**
 * Standard key map interface for components
 * 
 * Provides a consistent structure for keyboard navigation and actions
 * across all components. Components can extend this with custom bindings
 * while maintaining standard navigation patterns.
 * 
 * @template Msg - The component's message type
 */
export interface KeyMap<Msg> {
  // Navigation
  readonly up?: KeyBinding<Msg>
  readonly down?: KeyBinding<Msg>
  readonly left?: KeyBinding<Msg>
  readonly right?: KeyBinding<Msg>
  readonly home?: KeyBinding<Msg>
  readonly end?: KeyBinding<Msg>
  readonly pageUp?: KeyBinding<Msg>
  readonly pageDown?: KeyBinding<Msg>
  
  // Actions
  readonly select?: KeyBinding<Msg>
  readonly cancel?: KeyBinding<Msg>
  readonly delete?: KeyBinding<Msg>
  readonly clear?: KeyBinding<Msg>
  
  // Component-specific bindings
  [key: string]: KeyBinding<Msg> | undefined
}

/**
 * Check if a key matches a binding key pattern
 * 
 * Supports simple key matching (e.g., 'a', 'enter') and composite
 * patterns with modifiers (e.g., 'ctrl+s', 'alt+shift+f').
 * 
 * @param key - Key event to test
 * @param pattern - Pattern to match against
 * @returns True if the key matches the pattern
 * 
 * @internal
 */
const matchesKeyPattern = (key: KeyEvent, pattern: string): boolean => {
  // Simple key match
  if (key.key === pattern || key.runes === pattern) {
    return true
  }
  
  // Composite key match (e.g., "ctrl+s")
  if (pattern.includes('+')) {
    const parts = pattern.split('+')
    const mainKey = parts[parts.length - 1]
    const modifiers = parts.slice(0, -1)
    
    const keyMatches = key.key === mainKey || key.runes === mainKey
    const ctrlMatches = modifiers.includes('ctrl') === Boolean(key.ctrl)
    const altMatches = modifiers.includes('alt') === Boolean(key.alt)
    const shiftMatches = modifiers.includes('shift') === Boolean(key.shift)
    const metaMatches = modifiers.includes('meta') === Boolean(key.meta)
    
    return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches
  }
  
  return false
}

/**
 * Check if a key event matches any binding in the key map
 * 
 * Iterates through all bindings in the key map and returns the message
 * for the first matching binding, or null if no match is found.
 * 
 * @param key - Key event to match
 * @param keyMap - Map of key bindings to check
 * @returns Message for the matched binding, or null
 * 
 * @example
 * ```typescript
 * const msg = matchKeyBinding(keyEvent, component.keyMap)
 * if (msg) {
 *   return update(msg, model)
 * }
 * ```
 */
export const matchKeyBinding = <Msg>(
  key: KeyEvent,
  keyMap: KeyMap<Msg>
): Msg | null => {
  for (const binding of Object.values(keyMap)) {
    if (!binding || binding.disabled) continue
    
    for (const pattern of binding.keys) {
      if (matchesKeyPattern(key, pattern)) {
        return binding.msg
      }
    }
  }
  
  return null
}

// =============================================================================
// Component ID Management
// =============================================================================

/**
 * Generate a unique component ID
 * 
 * Uses crypto.randomUUID when available for true randomness,
 * falls back to timestamp-based ID for environments without crypto API.
 * Component IDs are used for hit testing and debugging.
 * 
 * @param prefix - Component type prefix (e.g., 'button', 'input')
 * @returns Unique component identifier
 * 
 * @example
 * ```typescript
 * class MyComponent {
 *   readonly id = generateComponentId('my-component')
 * }
 * ```
 */
export const generateComponentId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  // Fallback for environments without crypto.randomUUID
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// Common Component Messages
// =============================================================================

/**
 * Base message types that many components share
 * 
 * These messages handle common component operations like focus management,
 * sizing, and enable/disable state. Components can extend this type with
 * their specific messages.
 */
export type CommonMsg =
  | { _tag: "Focus" }
  | { _tag: "Blur" }
  | { _tag: "SetSize"; width: number; height?: number }
  | { _tag: "SetDisabled"; disabled: boolean }

// =============================================================================
// Component Factory Helpers
// =============================================================================

/**
 * Options for creating components
 * 
 * Common configuration options that can be passed to component constructors
 * for initial setup. All properties are optional with sensible defaults.
 */
export interface ComponentOptions {
  readonly id?: string
  readonly width?: number
  readonly height?: number
  readonly disabled?: boolean
  readonly styles?: Partial<ComponentStyles>
}

/**
 * Create default component styles with optional overrides
 * 
 * Provides a consistent base styling for all components with standard
 * states (base, focused, disabled). Components can override specific
 * styles while maintaining the default structure.
 * 
 * @param overrides - Partial styles to merge with defaults
 * @returns Complete component styles object
 * 
 * @example
 * ```typescript
 * const buttonStyles = createDefaultStyles({
 *   base: style().padding(1).border('rounded'),
 *   focused: style().bold().foreground(Colors.cyan)
 * })
 * ```
 */
export const createDefaultStyles = (overrides?: Partial<ComponentStyles>): ComponentStyles => {
  const defaults: ComponentStyles = {
    base: style(),
    focused: style()
      .bold()
      .foreground(Colors.white)
      .background(Colors.blue),
    disabled: style().faint(),
    ...overrides
  }
  
  return defaults
}

/**
 * Merge multiple component styles with proper precedence
 * 
 * Later styles override earlier ones, allowing for style composition
 * and inheritance. Undefined styles are safely ignored.
 * 
 * @param styles - Array of style objects to merge
 * @returns Merged component styles
 * 
 * @example
 * ```typescript
 * const finalStyles = mergeStyles(
 *   defaultStyles,
 *   themeStyles,
 *   componentStyles,
 *   userStyles
 * )
 * ```
 */
export const mergeStyles = (...styles: (ComponentStyles | undefined)[]): ComponentStyles => {
  return styles.reduce((merged, style) => ({
    ...merged,
    ...style
  }), createDefaultStyles())
}

/**
 * Create a key map from an array of key bindings
 * 
 * Converts an array of key bindings into a map structure for efficient
 * lookup. Uses the help key as the map key for consistency.
 * 
 * @param bindings - Array of key bindings to convert
 * @returns Key map object for component use
 * 
 * @example
 * ```typescript
 * const keyMap = createKeyMap([
 *   keyBinding(['up', 'k'], ['↑', 'move up'], { _tag: 'MoveUp' }),
 *   keyBinding(['down', 'j'], ['↓', 'move down'], { _tag: 'MoveDown' })
 * ])
 * ```
 */
export const createKeyMap = <Msg>(bindings: KeyBinding<Msg>[]): KeyMap<Msg> => {
  const map: KeyMap<Msg> = {}
  bindings?.forEach(binding => {
    // Use help.key as the map key since that's the primary identifier
    map[binding.help.key.toLowerCase()] = binding
  })
  return map
}