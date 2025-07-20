/**
 * View System - Basic view primitives for rendering
 * 
 * This module provides fundamental view primitives for building terminal UI components.
 * Views are pure, composable units that can be combined, styled, and rendered to
 * create complex layouts. All view operations are Effect-based for composability.
 * 
 * ## Key Features:
 * 
 * ### Basic Views
 * - Text views for displaying content
 * - Empty views for spacing
 * - View composition and measurement
 * 
 * ### Layout Primitives
 * - Vertical stacking (vstack)
 * - Horizontal stacking (hstack) with multi-line support
 * - Centering within fixed widths
 * - Box drawing around content
 * 
 * ### Styling Support
 * - ANSI escape sequence styling
 * - Integration with the TUIX styling system
 * - Common text decorations (bold, italic, colors)
 * 
 * ### ANSI-Aware Operations
 * - Proper width calculation with escape sequences
 * - Multi-line text handling
 * - Consistent spacing and alignment
 * 
 * @example
 * ```typescript
 * import { text, vstack, hstack, box, center, bold, blue } from './view'
 * 
 * // Basic text view
 * const greeting = text('Hello, World!')
 * 
 * // Styled view
 * const styledGreeting = blue(bold(greeting))
 * 
 * // Complex layout
 * const layout = box(
 *   center(
 *     vstack(
 *       styledGreeting,
 *       text('Welcome to TUIX')
 *     ),
 *     40
 *   )
 * )
 * ```
 * 
 * @module core/view
 */

import { Effect } from "effect"
import { stringWidth } from "../utils/string-width"
import type { View, RenderError } from "./types"
import { style as createStyle, renderStyledSync, type Style } from "../styling/index"

/**
 * Create a simple text view
 * 
 * Creates a view from plain text content. The view automatically calculates
 * dimensions based on the content, handling multi-line text and ANSI escape
 * sequences correctly.
 * 
 * @param content - Text content to display
 * @returns View that renders the text content
 * 
 * @example
 * ```typescript
 * const hello = text('Hello, World!')
 * const multiline = text('Line 1\nLine 2\nLine 3')
 * const withAnsi = text('\x1b[31mRed text\x1b[0m')
 * ```
 */
export const text = (content: string): View => ({
  render: () => Effect.succeed(content),
  width: content.split('\n').reduce((max, line) => Math.max(max, stringWidth(line)), 0),
  height: content.split('\n').length
})

/**
 * Create an empty view
 * 
 * Useful for spacing and placeholder content in layouts.
 */
export const empty: View = text('')

/**
 * Alias for text() to match test expectations
 * 
 * @deprecated Use text() directly for better clarity
 */
export const createView = text

/**
 * Check if an object is a View
 * 
 * Type guard that safely determines if an unknown value implements
 * the View interface. Useful for runtime type checking.
 * 
 * @param obj - Object to check
 * @returns True if object is a View, false otherwise
 * 
 * @example
 * ```typescript
 * if (isView(unknownValue)) {
 *   // Now TypeScript knows it's a View
 *   const content = await Effect.runPromise(unknownValue.render())
 * }
 * ```
 */
export const isView = (obj: unknown): obj is View => {
  return obj !== null && typeof obj === 'object' && 'render' in obj && typeof (obj as Record<string, unknown>).render === 'function'
}

/**
 * Measure a view's dimensions
 * 
 * Returns the calculated dimensions of a view. If the view doesn't
 * specify dimensions, returns 0 for both width and height.
 * 
 * @param view - View to measure
 * @returns Effect containing the view's dimensions
 */
export const measureView = (view: View) => 
  Effect.succeed({
    width: view.width || 0,
    height: view.height || 0
  })

/**
 * Render a view to string
 * 
 * Convenience function that calls the view's render method.
 * 
 * @param view - View to render
 * @returns Effect containing the rendered string
 */
export const renderView = (view: View) => view.render()

/**
 * Combine multiple views vertically
 * 
 * Stacks views on top of each other, joining their rendered output
 * with newlines. The resulting view's width is the maximum of all
 * child widths, and height is the sum of all child heights.
 * 
 * @param views - Views to stack vertically
 * @returns Combined view with vertical layout
 * 
 * @example
 * ```typescript
 * const header = text('Header')
 * const content = text('Content goes here')
 * const footer = text('Footer')
 * 
 * const page = vstack(header, content, footer)
 * // Renders as:
 * // Header
 * // Content goes here  
 * // Footer
 * ```
 */
export const vstack = (...views: View[]): View => ({
  render: () =>
    Effect.gen(function* (_) {
      const rendered = yield* _(
        Effect.forEach(views, v => v.render())
      )
      return rendered.join('\n')
    }),
  width: Math.max(...views.map(v => v.width || 0)),
  height: views.reduce((sum, v) => sum + (v.height || 1), 0)
})

/**
 * Combine multiple views horizontally with proper multi-line support
 * 
 * Places views side by side, handling multi-line content correctly.
 * Each view is padded to its full width and height to ensure proper
 * alignment. The resulting view's width is the sum of all child widths.
 * 
 * @param views - Views to arrange horizontally
 * @returns Combined view with horizontal layout
 * 
 * @example
 * ```typescript
 * const left = text('Left\nPanel')
 * const right = text('Right\nSide\nContent')
 * 
 * const columns = hstack(left, right)
 * // Renders as:
 * // Left Right
 * // Panel Side 
 * //       Content
 * ```
 * 
 * @note For advanced alignment options, use joinHorizontal from layout/join
 */
export const hstack = (...views: View[]): View => ({
  render: () =>
    Effect.gen(function* (_) {
      // Render all views
      const renderedViews = yield* _(
        Effect.forEach(views, (v, index) => 
          Effect.gen(function* (_) {
            const content = yield* _(v.render())
            return { content, width: v.width || 0, index }
          })
        )
      )
      
      // Split each into lines
      const viewData = renderedViews.map(({ content, width }) => {
        const lines = content.split('\n')
        return { lines, width }
      })
      
      // Find max height
      const maxHeight = Math.max(...viewData.map(({ lines }) => lines.length))
      
      // Pad shorter views to max height and ensure each line is full width
      const aligned = viewData.map(({ lines, width }) => {
        // Pad each line to the view's width
        const paddedLines = lines.map(line => {
          const lineWidth = stringWidth(line)
          if (lineWidth < width) {
            return line + ' '.repeat(width - lineWidth)
          }
          return line
        })
        
        // Add empty lines if needed
        const height = paddedLines.length
        if (height < maxHeight) {
          const emptyLine = ' '.repeat(width)
          const padding = maxHeight - height
          return [...paddedLines, ...Array(padding).fill(emptyLine)]
        }
        
        return paddedLines
      })
      
      // Join horizontally line by line
      const result: string[] = []
      for (let i = 0; i < maxHeight; i++) {
        const line = aligned.map(lines => lines[i] ?? '').join('')
        result.push(line)
      }
      
      return result.join('\n')
    }),
  width: views.reduce((sum, v) => sum + (v.width || 0), 0),
  height: Math.max(...views.map(v => v.height || 1))
})

/**
 * Create a box around a view using Unicode box-drawing characters
 * 
 * Wraps the view content in a rectangular border using Unicode
 * box-drawing characters. Adds padding and increases dimensions.
 * 
 * @param view - View to wrap with a box
 * @returns Boxed view with border and padding
 * 
 * @example
 * ```typescript
 * const content = text('Hello\nWorld')
 * const boxed = box(content)
 * // Renders as:
 * // ┌───────┐
 * // │ Hello │
 * // │ World │
 * // └───────┘
 * ```
 */
export const box = (view: View): View => ({
  render: () =>
    Effect.gen(function* (_) {
      const content = yield* _(view.render())
      const lines = content.split('\n')
      const width = Math.max(...lines.map(l => stringWidth(l)))
      
      const top = '┌' + '─'.repeat(width + 2) + '┐'
      const bottom = '└' + '─'.repeat(width + 2) + '┘'
      
      const boxedLines = lines.map(line => {
        const lineWidth = stringWidth(line)
        const padding = width - lineWidth
        return '│ ' + line + ' '.repeat(padding) + ' │'
      })
      
      return [top, ...boxedLines, bottom].join('\n')
    }),
  width: (view.width || 0) + 4,
  height: (view.height || 0) + 2
})

/**
 * Center a view within a given width
 * 
 * Centers the view content within the specified total width by adding
 * equal padding on both sides. If the content is wider than the total
 * width, no padding is added.
 * 
 * @param view - View to center
 * @param totalWidth - Total width to center within
 * @returns Centered view with the specified width
 * 
 * @example
 * ```typescript
 * const hello = text('Hello')
 * const centered = center(hello, 20)
 * // Renders as: "       Hello        " (centered in 20 characters)
 * ```
 */
export const center = (view: View, totalWidth: number): View => ({
  render: () =>
    Effect.gen(function* (_) {
      const content = yield* _(view.render())
      const lines = content.split('\n')
      
      return lines.map(line => {
        const lineWidth = stringWidth(line)
        const padding = Math.max(0, totalWidth - lineWidth)
        const leftPad = Math.floor(padding / 2)
        const rightPad = padding - leftPad
        return ' '.repeat(leftPad) + line + ' '.repeat(rightPad)
      }).join('\n')
    }),
  width: totalWidth,
  height: view.height
})

/**
 * Apply ANSI styling to a view
 * 
 * Wraps the view content with ANSI escape sequences for styling.
 * Automatically adds a reset sequence at the end to prevent style bleed.
 * 
 * @param view - View to style
 * @param style - ANSI escape sequence for styling
 * @returns Styled view
 * 
 * @example
 * ```typescript
 * const redText = styled(text('Error'), '\x1b[31m') // Red text
 * const boldText = styled(text('Important'), '\x1b[1m') // Bold text
 * ```
 */
export const styled = (view: View, style: string): View => ({
  render: () =>
    Effect.gen(function* (_) {
      const content = yield* _(view.render())
      return `${style}${content}\x1b[0m`
    }),
  width: view.width,
  height: view.height
})

// =============================================================================
// Common Styling Functions
// =============================================================================

/** Apply bold styling to a view */
export const bold = (view: View) => styled(view, '\x1b[1m')

/** Apply dim/faint styling to a view */
export const dim = (view: View) => styled(view, '\x1b[2m')

/** Apply italic styling to a view */
export const italic = (view: View) => styled(view, '\x1b[3m')

/** Apply underline styling to a view */
export const underline = (view: View) => styled(view, '\x1b[4m')

// =============================================================================
// Color Functions
// =============================================================================

/** Apply red foreground color to a view */
export const red = (view: View) => styled(view, '\x1b[31m')

/** Apply green foreground color to a view */
export const green = (view: View) => styled(view, '\x1b[32m')

/** Apply yellow foreground color to a view */
export const yellow = (view: View) => styled(view, '\x1b[33m')

/** Apply blue foreground color to a view */
export const blue = (view: View) => styled(view, '\x1b[34m')

/** Apply magenta foreground color to a view */
export const magenta = (view: View) => styled(view, '\x1b[35m')

/** Apply cyan foreground color to a view */
export const cyan = (view: View) => styled(view, '\x1b[36m')

/** Apply white foreground color to a view */
export const white = (view: View) => styled(view, '\x1b[37m')

/**
 * Create a styled text view using the TUIX styling system
 * 
 * Creates a text view with styling applied using the comprehensive
 * TUIX styling system. This provides more advanced styling capabilities
 * than the basic ANSI styling functions.
 * 
 * @param content - Text content to style
 * @param style - TUIX style object
 * @returns Styled text view
 * 
 * @example
 * ```typescript
 * import { style, Colors } from '../styling'
 * 
 * const fancyText = styledText('Fancy Text', 
 *   style()
 *     .foreground(Colors.blue)
 *     .bold()
 *     .padding(1)
 * )
 * ```
 */
export const styledText = (content: string, style: Style): View => ({
  render: () => Effect.succeed(renderStyledSync(content, style)),
  width: style.get("width") || content.split('\n').reduce((max, line) => Math.max(max, stringWidth(line)), 0),
  height: style.get("height") || content.split('\n').length
})