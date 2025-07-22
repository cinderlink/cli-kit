/**
 * Styling Types - Common types and interfaces for the styling system
 * 
 * This module defines the core type system for TUIX styling, providing:
 * 
 * - **Position Types**: Normalized positioning with branded types for type safety
 * - **Spacing Types**: Padding and margin interfaces with CSS-style normalization
 * - **Text Alignment**: Horizontal and vertical alignment enums
 * - **Text Decoration**: Formatting options for terminal text styling
 * - **Dimensions**: Size constraints and layout dimensions
 * - **Text Transformation**: Content transformation utilities
 * - **Style Properties**: Complete interface for all styling capabilities
 * - **Style Inheritance**: Property cascading system
 * 
 * The type system is designed to be comprehensive yet practical for terminal UI applications,
 * providing familiar CSS-like concepts adapted for character-based displays.
 */

import { Brand } from "effect"
import type { Color } from "./color"
import type { Border, BorderSide } from "./borders"

// =============================================================================
// Position Types
// =============================================================================

/**
 * Position as a normalized value between 0.0 and 1.0
 * 
 * Used for alignment and relative positioning within containers.
 * Provides type-safe positioning with validation and common presets.
 * 
 * Values:
 * - 0.0: Start/Left/Top position
 * - 0.5: Center/Middle position  
 * - 1.0: End/Right/Bottom position
 * 
 * @example
 * ```typescript
 * const centerPos = Position.Center // 0.5
 * const customPos = Position.of(0.25) // 25% position
 * const invalid = Position.of(1.5) // null (out of range)
 * ```
 */
export type Position = number & Brand.Brand<"Position">

/**
 * Position factory and constants
 * 
 * Provides validated Position creation and common position presets.
 */
export const Position = {
  /**
   * Create a Position from a number with validation
   */
  of: (n: number): Position | null =>
    n >= 0 && n <= 1 ? (n as Position) : null,
  
  /**
   * Predefined positions
   */
  Start: 0.0 as Position,
  Center: 0.5 as Position,
  End: 1.0 as Position,
  
  // Aliases
  Left: 0.0 as Position,
  Top: 0.0 as Position,
  Middle: 0.5 as Position,
  Right: 1.0 as Position,
  Bottom: 1.0 as Position,
}

// =============================================================================
// Spacing Types
// =============================================================================

/**
 * Padding configuration for all four sides
 * 
 * Defines inner spacing within an element, measured in character units.
 * Each side can be configured independently for flexible layout control.
 * 
 * @example
 * ```typescript
 * const padding: Padding = {
 *   top: 1,
 *   right: 2,
 *   bottom: 1,
 *   left: 2
 * }
 * ```
 */
export interface Padding {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * Margin configuration for all four sides
 * 
 * Defines outer spacing around an element, measured in character units.
 * Creates space between adjacent elements in the layout.
 * 
 * @example
 * ```typescript
 * const margin: Margin = {
 *   top: 0,
 *   right: 1,
 *   bottom: 0,
 *   left: 1
 * }
 * ```
 */
export interface Margin {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * Helper to normalize spacing values (CSS-style)
 * 
 * Converts shorthand spacing notation to explicit four-value format:
 * - 1 value: all sides equal
 * - 2 values: vertical, horizontal
 * - 3 values: top, horizontal, bottom
 * - 4 values: top, right, bottom, left
 * 
 * @param top - Top spacing or all sides if only value provided
 * @param right - Right spacing or horizontal if only 2 values
 * @param bottom - Bottom spacing
 * @param left - Left spacing
 * @returns Tuple of [top, right, bottom, left] values
 * 
 * @example
 * ```typescript
 * normalizeSpacing(2) // [2, 2, 2, 2]
 * normalizeSpacing(1, 2) // [1, 2, 1, 2]
 * normalizeSpacing(1, 2, 3) // [1, 2, 3, 2]
 * normalizeSpacing(1, 2, 3, 4) // [1, 2, 3, 4]
 * ```
 */
export const normalizeSpacing = (
  top: number,
  right?: number,
  bottom?: number,
  left?: number
): [number, number, number, number] => {
  if (right === undefined) {
    // All sides same
    return [top, top, top, top]
  } else if (bottom === undefined) {
    // Vertical, horizontal
    return [top, right, top, right]
  } else if (left === undefined) {
    // Top, horizontal, bottom
    return [top, right, bottom, right]
  } else {
    // All four specified
    return [top, right, bottom, left]
  }
}

// =============================================================================
// Text Alignment
// =============================================================================

/**
 * Horizontal text alignment options
 * 
 * Controls how text is aligned within its container horizontally.
 * Similar to CSS text-align property for terminal applications.
 */
export enum HorizontalAlign {
  Left = "left",
  Center = "center",
  Right = "right",
  Justify = "justify"
}

/**
 * Vertical text alignment options
 * 
 * Controls how text is aligned within its container vertically.
 * Useful for centering content in fixed-height containers.
 */
export enum VerticalAlign {
  Top = "top",
  Middle = "middle",
  Bottom = "bottom"
}

// =============================================================================
// Text Decoration
// =============================================================================

/**
 * Text decoration and formatting options
 * 
 * Controls various text styling effects available in terminal applications.
 * These correspond to ANSI escape sequence capabilities.
 * 
 * @example
 * ```typescript
 * const decoration: TextDecoration = {
 *   bold: true,
 *   italic: false,
 *   underline: true
 * }
 * ```
 */
export interface TextDecoration {
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly inverse?: boolean
  readonly blink?: boolean
  readonly faint?: boolean
}

// =============================================================================
// Dimensions
// =============================================================================

/**
 * Dimension constraints for layout elements
 * 
 * Defines size constraints for views, measured in character units.
 * Supports both exact sizing and flexible min/max constraints.
 * 
 * @example
 * ```typescript
 * const dimensions: Dimensions = {
 *   width: 80,
 *   minHeight: 10,
 *   maxHeight: 50
 * }
 * ```
 */
export interface Dimensions {
  readonly width?: number
  readonly height?: number
  readonly minWidth?: number
  readonly minHeight?: number
  readonly maxWidth?: number
  readonly maxHeight?: number
}

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Text transformation options
 * 
 * Defines how text content should be transformed before display.
 * Supports common transformations and custom transformation functions.
 * 
 * @example
 * ```typescript
 * const upper: TextTransform = { _tag: "uppercase" }
 * const custom: TextTransform = { 
 *   _tag: "custom", 
 *   fn: (text) => text.replace(/\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
 * }
 * ```
 */
export type TextTransform = 
  | { _tag: "none" }
  | { _tag: "uppercase" }
  | { _tag: "lowercase" }
  | { _tag: "capitalize" }
  | { _tag: "custom"; fn: (text: string) => string }

// =============================================================================
// Complete Style Properties
// =============================================================================

/**
 * Complete style properties interface
 * 
 * Defines all possible styling properties that can be applied to text and layout elements.
 * This is the comprehensive interface used throughout the styling system.
 * 
 * Properties are organized into logical groups:
 * - Colors: foreground, background
 * - Borders: border styling and colors
 * - Spacing: padding and margin
 * - Text decoration: bold, italic, underline, etc.
 * - Dimensions: width, height, min/max constraints
 * - Alignment: horizontal and vertical positioning
 * - Transform: text transformation functions
 * - Overflow: text overflow handling
 * - Performance: caching hints
 * 
 * @example
 * ```typescript
 * const style: StyleProps = {
 *   foreground: Color.rgb(255, 255, 255),
 *   background: Color.rgb(0, 0, 0),
 *   bold: true,
 *   padding: { top: 1, right: 2, bottom: 1, left: 2 },
 *   border: Borders.Rounded,
 *   width: 40,
 *   horizontalAlign: HorizontalAlign.Center
 * }
 * ```
 */
export interface StyleProps {
  // Colors
  readonly foreground?: Color
  readonly background?: Color
  
  // Borders
  readonly border?: Border
  readonly borderSides?: BorderSide
  readonly borderForeground?: Color
  readonly borderBackground?: Color
  
  // Spacing
  readonly padding?: Padding
  readonly margin?: Margin
  
  // Text decoration
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly inverse?: boolean
  readonly blink?: boolean
  readonly faint?: boolean
  readonly inline?: boolean  // Prevents style bleeding to subsequent text
  
  // Dimensions
  readonly width?: number
  readonly height?: number
  readonly minWidth?: number
  readonly minHeight?: number
  readonly maxWidth?: number
  readonly maxHeight?: number
  
  // Alignment
  readonly horizontalAlign?: HorizontalAlign
  readonly verticalAlign?: VerticalAlign
  
  // Transform
  readonly transform?: TextTransform
  
  // Overflow
  readonly overflow?: "visible" | "hidden" | "wrap" | "ellipsis"
  readonly wordBreak?: "normal" | "break-all" | "keep-all"
  
  // Performance hints
  readonly cached?: boolean
}

// =============================================================================
// Style Inheritance
// =============================================================================

/**
 * Properties that can be inherited from parent styles
 * 
 * Defines which style properties cascade from parent to child elements.
 * Similar to CSS inheritance, but adapted for terminal UI constraints.
 * 
 * Inheritable properties typically affect text appearance and behavior,
 * while layout properties (padding, margins, dimensions) are not inherited.
 */
export const INHERITABLE_PROPS = new Set([
  "foreground",
  "background",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "inverse",
  "blink",
  "faint",
  "transform",
  "wordBreak"
])

/**
 * Check if a property is inheritable
 * 
 * Determines whether a given style property should be inherited
 * from parent to child elements in the styling hierarchy.
 * 
 * @param prop - The style property name to check
 * @returns True if the property is inheritable, false otherwise
 * 
 * @example
 * ```typescript
 * isInheritable('foreground') // true
 * isInheritable('padding') // false
 * isInheritable('bold') // true
 * ```
 */
export const isInheritable = (prop: keyof StyleProps): boolean =>
  INHERITABLE_PROPS.has(prop)