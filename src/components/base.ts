/**
 * Component Base - Common interfaces and utilities for all components
 * 
 * Based on patterns from the Bubbletea ecosystem, this module provides
 * standard interfaces that all interactive components should implement.
 */

import { Effect } from "effect"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "@/core/types.ts"
import { Style, style, Colors } from "@/styling/index.ts"

// =============================================================================
// Component Interfaces
// =============================================================================

/**
 * Base interface for all interactive components
 * Extends the standard Component interface with common UI functionality
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
 * Provides consistent styling across all components
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
 */
export interface Focusable {
  readonly focused: boolean
}

/**
 * Size constraint mixin for component models
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
 */
export interface KeyBinding<Msg> {
  readonly keys: string[]
  readonly help: { key: string; desc: string }
  readonly msg: Msg
  readonly disabled?: boolean
}

/**
 * Create a key binding
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
 * Check if a key event matches any binding in the key map
 */
export const matchKeyBinding = <Msg>(
  key: KeyEvent,
  keyMap: KeyMap<Msg>
): Msg | null => {
  for (const binding of Object.values(keyMap)) {
    if (!binding || binding.disabled) continue
    
    for (const k of binding.keys) {
      // Check exact key match
      if (key.key === k) {
        return binding.msg
      }
      // Check runes match (for single character keys)
      if (key.runes && key.runes === k) {
        return binding.msg
      }
      // Check composite key match (e.g., ctrl+s matches "s" with ctrl=true)
      if (k.includes('+')) {
        const parts = k.split('+')
        const mainKey = parts[parts.length - 1]
        const hasCtrl = parts.includes('ctrl')
        const hasAlt = parts.includes('alt')
        const hasShift = parts.includes('shift')
        const hasMeta = parts.includes('meta')
        
        if ((key.key === mainKey || key.runes === mainKey) &&
            key.ctrl === hasCtrl &&
            key.alt === hasAlt &&
            key.shift === hasShift &&
            key.meta === hasMeta) {
          return binding.msg
        }
      }
    }
  }
  
  return null
}

// =============================================================================
// Component ID Management
// =============================================================================

let componentIdCounter = 0

/**
 * Generate a unique component ID
 */
export const generateComponentId = (prefix: string): string => {
  return `${prefix}-${++componentIdCounter}`
}

// =============================================================================
// Common Component Messages
// =============================================================================

/**
 * Base message types that many components share
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
 */
export interface ComponentOptions {
  readonly id?: string
  readonly width?: number
  readonly height?: number
  readonly disabled?: boolean
  readonly styles?: Partial<ComponentStyles>
}

/**
 * Create default component styles
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
 * Merge multiple component styles
 */
export const mergeStyles = (...styles: (ComponentStyles | undefined)[]): ComponentStyles => {
  return styles.reduce((merged, style) => ({
    ...merged,
    ...style
  }), createDefaultStyles())
}

/**
 * Create a key map from an array of key bindings
 */
export const createKeyMap = <Msg>(bindings: KeyBinding<Msg>[]): KeyMap<Msg> => {
  const map: KeyMap<Msg> = {}
  bindings?.forEach(binding => {
    // Use help.key as the map key since that's the primary identifier
    map[binding.help.key.toLowerCase()] = binding
  })
  return map
}