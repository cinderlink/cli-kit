/**
 * Box Layout - Container components with borders and styling
 *
 * Provides styled container components that can wrap other views
 * with borders, padding, and other visual treatments.
 */

import { Effect } from 'effect'
import { stringWidth } from '@core/terminal/output/string/width'
import type { View } from '@core/types'
import * as ViewUtils from '@core/view/primitives/view'
import {
  style,
  type Style,
  type Border,
  Borders,
  renderBox,
  BorderSide,
} from '@core/terminal/ansi/styles'
import { joinVertical, Center } from './join'

/**
 * Box properties
 */
export interface BoxProps {
  readonly border?: Border
  readonly borderSides?: BorderSide
  readonly padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  readonly minWidth?: number
  readonly minHeight?: number
  readonly style?: Style
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize padding to individual values
 */
const normalizePadding = (
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
) => {
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding }
  }
  return {
    top: padding?.top || 0,
    right: padding?.right || 0,
    bottom: padding?.bottom || 0,
    left: padding?.left || 0,
  }
}

/**
 * Calculate content dimensions from lines
 */
const getContentDimensions = (lines: string[]) => ({
  width: Math.max(...lines.map(line => stringWidth(line)), 0),
  height: lines.length,
})

/**
 * Create padded lines with consistent width
 */
const createPaddedLines = (
  contentLines: string[],
  contentWidth: number,
  padding: { top: number; right: number; bottom: number; left: number }
): string[] => {
  const paddedWidth = contentWidth + padding.left + padding.right
  const paddedLines: string[] = []

  // Top padding
  paddedLines.push(...Array(padding.top).fill(' '.repeat(paddedWidth)))

  // Content with horizontal padding
  for (const line of contentLines) {
    const padded = ' '.repeat(padding.left) + line.padEnd(contentWidth) + ' '.repeat(padding.right)
    paddedLines.push(padded)
  }

  // Bottom padding
  paddedLines.push(...Array(padding.bottom).fill(' '.repeat(paddedWidth)))

  return paddedLines
}

/**
 * Adjust lines to final width if needed
 */
const adjustToFinalWidth = (
  lines: string[],
  currentWidth: number,
  finalWidth: number
): string[] => {
  if (finalWidth <= currentWidth) return lines

  const extraPadding = finalWidth - currentWidth
  return lines.map(line => line + ' '.repeat(extraPadding))
}

// =============================================================================
// Box Components
// =============================================================================

/**
 * Create a styled box around content
 */
export const styledBox = (content: View | View[], props: BoxProps = {}): View => {
  const contents = Array.isArray(content) ? content : [content]

  // If multiple views, join them vertically
  const innerView = contents.length === 1 ? contents[0] : joinVertical(Center, ...contents)

  // Calculate padding with helper
  const padding = normalizePadding(props.padding)

  return {
    render: () =>
      Effect.gen(function* (_) {
        // First render the inner content
        const innerContent = yield* _(innerView.render())
        const innerLines = innerContent.split('\n')

        // Calculate inner dimensions using helper
        const { width: innerWidth } = getContentDimensions(innerLines)

        // Create padded content using helper
        const paddedLines = createPaddedLines(innerLines, innerWidth, padding)
        const paddedWidth = innerWidth + padding.left + padding.right

        // Apply min width and adjust if needed
        const finalWidth = Math.max(paddedWidth, props.minWidth || 0)
        const adjustedLines = adjustToFinalWidth(paddedLines, paddedWidth, finalWidth)

        // Apply border if specified
        if (props.border) {
          const bordered = renderBox(
            adjustedLines,
            props.border,
            props.borderSides || BorderSide.All,
            finalWidth
          )
          return bordered.join('\n')
        }

        return adjustedLines.join('\n')
      }),
    width: Math.max(
      (innerView.width || 0) + padding.left + padding.right + (props.border ? 2 : 0),
      (props.minWidth || 0) + (props.border ? 2 : 0)
    ),
    height: Math.max(
      (innerView.height || 0) + padding.top + padding.bottom + (props.border ? 2 : 0),
      (props.minHeight || 0) + (props.border ? 2 : 0)
    ),
  }
}

/**
 * Create a panel with rounded border and padding
 */
export const panel = (
  content: View | View[],
  props: Omit<BoxProps, 'border'> & { title?: string } = {}
): View => {
  return styledBox(content, {
    ...props,
    border: Borders.Rounded,
    padding: props.padding || 2,
  })
}

/**
 * Horizontal box layout - alias for ViewUtils.hstack
 */
export const hbox = ViewUtils.hstack

/**
 * Vertical box layout - alias for ViewUtils.vstack
 */
export const vbox = ViewUtils.vstack
