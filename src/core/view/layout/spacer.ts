/**
 * Spacer and Divider - Layout utilities for spacing and separation
 * 
 * Provides:
 * - Fixed and flexible spacers
 * - Horizontal and vertical dividers
 * - Custom divider styles
 */

import { Effect } from "effect"
import type { View } from "@core/types"
import { style, type Style, renderStyledSync } from "@core/terminal/ansi/styles"
import {
  type SpacerProps,
  type DividerProps,
  DividerOrientation
} from "./types"

// =============================================================================
// Spacer
// =============================================================================

/**
 * Extended view interface that includes flex properties for layout containers.
 */
interface FlexView extends View {
  readonly flex?: number
}

/**
 * Create a spacer view that takes up space but renders nothing.
 * Can be fixed size or flexible to fill available space.
 */
export const spacer = (props: SpacerProps = {}): FlexView => {
  const size = props.size ?? 1
  const flex = props.flex ?? 0
  
  return {
    render: () => Effect.succeed(" ".repeat(size)),
    width: size,
    height: 1,
    flex
  }
}

/**
 * Create a horizontal spacer with fixed width.
 * Renders as empty space that takes up the specified width.
 */
export const hspace = (width: number): View => {
  return {
    render: () => Effect.succeed(" ".repeat(width)),
    width,
    height: 1
  }
}

/**
 * Create a vertical spacer with fixed height.
 * Renders as empty lines that take up the specified height.
 */
export const vspace = (height: number): View => {
  return {
    render: () => Effect.succeed(Array(height).fill("").join("\n")),
    width: 1,
    height
  }
}

/**
 * Create a flexible spacer that expands to fill available space.
 * Uses flex layout properties to grow and shrink as needed.
 */
export const flexSpacer = (flex: number = 1): View => {
  return spacer({ flex })
}

// =============================================================================
// Divider
// =============================================================================

/**
 * Create a divider view with customizable orientation, character, and style.
 * Renders as a line that separates content sections.
 */
export const divider = (props: DividerProps = {}): View => {
  const orientation = props.orientation ?? DividerOrientation.Horizontal
  const char = props.char ?? (orientation === DividerOrientation.Horizontal ? "─" : "│")
  const dividerStyle = props.style ?? style()
  
  if (orientation === DividerOrientation.Horizontal) {
    return {
      render: () => Effect.gen(function* (_) {
        // For horizontal divider, we need to know the width
        // This is a simplified version - in practice, the layout system
        // would provide the actual width
        const width = 40 // Default width
        const line = char.repeat(width)
        return renderStyledSync(line, dividerStyle)
      }),
      width: 40, // This would be determined by the container
      height: 1
    }
  } else {
    return {
      render: () => Effect.gen(function* (_) {
        // For vertical divider, create multiple lines
        const height = 10 // Default height
        const lines = Array(height).fill(char)
        return lines.map(line => renderStyledSync(line, dividerStyle)).join("\n")
      }),
      width: 1,
      height: 10 // This would be determined by the container
    }
  }
}

// =============================================================================
// Divider Presets
// =============================================================================

/**
 * Divider style presets with their respective characters
 */
const DIVIDER_STYLES = {
  solid: { horizontal: "─", vertical: "│" },
  dotted: { horizontal: "·", vertical: "⋮" },
  dashed: { horizontal: "╌", vertical: "┊" },
  double: { horizontal: "═", vertical: "║" },
  thick: { horizontal: "━", vertical: "┃" }
} as const

/**
 * Create a styled divider with predefined character sets
 */
const createStyledDivider = (
  styleType: keyof typeof DIVIDER_STYLES,
  orientation: DividerOrientation = DividerOrientation.Horizontal,
  style?: Style
): View => {
  const chars = DIVIDER_STYLES[styleType]
  const char = orientation === DividerOrientation.Horizontal ? chars.horizontal : chars.vertical
  return divider({ orientation, char, style })
}

/**
 * Create a horizontal divider with optional character and style
 */
export const hdivider = (char?: string, style?: Style): View => 
  divider({ orientation: DividerOrientation.Horizontal, char, style })

/**
 * Create a vertical divider with optional character and style
 */
export const vdivider = (char?: string, style?: Style): View => 
  divider({ orientation: DividerOrientation.Vertical, char, style })

/**
 * Create a dotted divider (horizontal by default)
 */
export const dottedDivider = (style?: Style, orientation?: DividerOrientation): View => 
  createStyledDivider("dotted", orientation, style)

/**
 * Create a dashed divider (horizontal by default)
 */
export const dashedDivider = (style?: Style, orientation?: DividerOrientation): View => 
  createStyledDivider("dashed", orientation, style)

/**
 * Create a double-line divider (horizontal by default)
 */
export const doubleDivider = (style?: Style, orientation?: DividerOrientation): View => 
  createStyledDivider("double", orientation, style)

/**
 * Create a thick divider (horizontal by default)
 */
export const thickDivider = (style?: Style, orientation?: DividerOrientation): View => 
  createStyledDivider("thick", orientation, style)

// =============================================================================
// Layout Helpers
// =============================================================================

/**
 * Add consistent spacing between a collection of views.
 * Inserts spacer views between each pair of adjacent views.
 */
export const spaced = (
  views: ReadonlyArray<View>,
  spacing: number,
  orientation: "horizontal" | "vertical" = "vertical"
): ReadonlyArray<View> => {
  if (views.length <= 1) return views
  
  const spacerView = orientation === "horizontal" 
    ? hspace(spacing)
    : vspace(spacing)
  
  const result: View[] = []
  views.forEach((view, index) => {
    result.push(view)
    if (index < views.length - 1) {
      result.push(spacerView)
    }
  })
  
  return result
}

/**
 * Add visual dividers between a collection of views.
 * Inserts divider views between each pair of adjacent views.
 */
export const separated = (
  views: ReadonlyArray<View>,
  dividerView: View = hdivider()
): ReadonlyArray<View> => {
  if (views.length <= 1) return views
  
  const result: View[] = []
  views.forEach((view, index) => {
    result.push(view)
    if (index < views.length - 1) {
      result.push(dividerView)
    }
  })
  
  return result
}