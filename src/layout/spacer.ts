/**
 * Spacer and Divider - Layout utilities for spacing and separation
 * 
 * Provides:
 * - Fixed and flexible spacers
 * - Horizontal and vertical dividers
 * - Custom divider styles
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import { style, type Style, renderStyledSync } from "@/styling/index.ts"
import {
  type SpacerProps,
  type DividerProps,
  DividerOrientation
} from "./types.ts"

// =============================================================================
// Spacer
// =============================================================================

/**
 * Create a spacer view that takes up space but renders nothing
 */
export const spacer = (props: SpacerProps = {}): View => {
  const size = props.size ?? 1
  const flex = props.flex ?? 0
  
  return {
    render: () => Effect.succeed(" ".repeat(size)),
    width: size,
    height: 1,
    // Store flex property for layout containers
    flex
  } as View & { flex?: number }
}

/**
 * Create a horizontal spacer (fixed width)
 */
export const hspace = (width: number): View => {
  return {
    render: () => Effect.succeed(" ".repeat(width)),
    width,
    height: 1
  }
}

/**
 * Create a vertical spacer (fixed height)
 */
export const vspace = (height: number): View => {
  return {
    render: () => Effect.succeed(Array(height).fill("").join("\n")),
    width: 1,
    height
  }
}

/**
 * Create a flexible spacer that expands to fill available space
 */
export const flexSpacer = (flex: number = 1): View => {
  return spacer({ flex })
}

// =============================================================================
// Divider
// =============================================================================

/**
 * Create a divider view
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

/**
 * Create a horizontal divider
 */
export const hdivider = (char?: string, dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Horizontal, 
    char,
    style: dividerStyle
  })
}

/**
 * Create a vertical divider
 */
export const vdivider = (char?: string, dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Vertical, 
    char,
    style: dividerStyle
  })
}

/**
 * Create a dotted horizontal divider
 */
export const dottedDivider = (dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Horizontal, 
    char: "·",
    style: dividerStyle
  })
}

/**
 * Create a dashed horizontal divider
 */
export const dashedDivider = (dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Horizontal, 
    char: "╌",
    style: dividerStyle
  })
}

/**
 * Create a double horizontal divider
 */
export const doubleDivider = (dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Horizontal, 
    char: "═",
    style: dividerStyle
  })
}

/**
 * Create a thick horizontal divider
 */
export const thickDivider = (dividerStyle?: Style): View => {
  return divider({ 
    orientation: DividerOrientation.Horizontal, 
    char: "━",
    style: dividerStyle
  })
}

// =============================================================================
// Layout Helpers
// =============================================================================

/**
 * Add spacing between views
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
 * Add dividers between views
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