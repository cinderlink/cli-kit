/**
 * Styling Types - Common types and interfaces for the styling system
 */

import { Brand } from "effect"
import type { Color } from "./color.ts"
import type { Border, BorderSide } from "./borders.ts"

// =============================================================================
// Position Types
// =============================================================================

/**
 * Position as a normalized value between 0.0 and 1.0
 * Used for alignment and relative positioning
 */
export type Position = number & Brand.Brand<"Position">

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
 */
export interface Padding {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * Margin configuration for all four sides
 */
export interface Margin {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * Helper to normalize spacing values (CSS-style)
 * - 1 value: all sides
 * - 2 values: vertical, horizontal
 * - 3 values: top, horizontal, bottom
 * - 4 values: top, right, bottom, left
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

export enum HorizontalAlign {
  Left = "left",
  Center = "center",
  Right = "right",
  Justify = "justify"
}

export enum VerticalAlign {
  Top = "top",
  Middle = "middle",
  Bottom = "bottom"
}

// =============================================================================
// Text Decoration
// =============================================================================

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
 * All possible style properties
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
 */
export const INHERITABLE_PROPS: ReadonlySet<keyof StyleProps> = new Set([
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
 */
export const isInheritable = (prop: keyof StyleProps): boolean =>
  INHERITABLE_PROPS.has(prop)