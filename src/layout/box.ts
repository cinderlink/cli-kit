/**
 * Box Layout - Container components with borders and styling
 * 
 * Provides styled container components that can wrap other views
 * with borders, padding, and other visual treatments.
 */

import { Effect } from "effect"
import { stringWidth } from "@/utils/string-width.ts"
import type { View } from "@/core/types.ts"
import * as ViewUtils from "@/core/view.ts"
import { style, type Style, type Border, Borders, renderBox, BorderSide } from "@/styling/index.ts"
import { joinVertical, Center } from "./join.ts"

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

/**
 * Create a styled box around content
 */
export const styledBox = (
  content: View | View[],
  props: BoxProps = {}
): View => {
  const contents = Array.isArray(content) ? content : [content]
  
  // If multiple views, join them vertically
  const innerView = contents.length === 1 
    ? contents[0] 
    : joinVertical(Center, ...contents)
  
  // Calculate padding
  const padding = props.padding || 0
  const padTop = typeof padding === "number" ? padding : (padding.top || 0)
  const padRight = typeof padding === "number" ? padding : (padding.right || 0)
  const padBottom = typeof padding === "number" ? padding : (padding.bottom || 0)
  const padLeft = typeof padding === "number" ? padding : (padding.left || 0)
  
  return {
    render: () => Effect.gen(function* (_) {
      // First render the inner content
      const innerContent = yield* _(innerView.render())
      const innerLines = innerContent.split('\n')
      
      // Calculate inner dimensions
      const innerWidth = Math.max(...innerLines.map(line => stringWidth(line)))
      const innerHeight = innerLines.length
      
      // Apply padding
      const paddedWidth = innerWidth + padLeft + padRight
      const paddedLines: string[] = []
      
      // Top padding
      for (let i = 0; i < padTop; i++) {
        paddedLines.push(' '.repeat(paddedWidth))
      }
      
      // Content with horizontal padding
      for (const line of innerLines) {
        const padded = ' '.repeat(padLeft) + line.padEnd(innerWidth) + ' '.repeat(padRight)
        paddedLines.push(padded)
      }
      
      // Bottom padding
      for (let i = 0; i < padBottom; i++) {
        paddedLines.push(' '.repeat(paddedWidth))
      }
      
      // Apply min width if specified
      const finalWidth = Math.max(paddedWidth, props.minWidth || 0)
      
      // Pad lines to final width if needed
      if (finalWidth > paddedWidth) {
        const extraPadding = finalWidth - paddedWidth
        for (let i = 0; i < paddedLines.length; i++) {
          paddedLines[i] = paddedLines[i] + ' '.repeat(extraPadding)
        }
      }
      
      // Apply border if specified
      if (props.border) {
        const bordered = renderBox(
          paddedLines,
          props.border,
          props.borderSides || BorderSide.All,
          finalWidth
        )
        return bordered.join('\n')
      }
      
      return paddedLines.join('\n')
    }),
    width: Math.max(
      (innerView.width || 0) + padLeft + padRight + (props.border ? 2 : 0),
      (props.minWidth || 0) + (props.border ? 2 : 0)
    ),
    height: Math.max(
      (innerView.height || 0) + padTop + padBottom + (props.border ? 2 : 0),
      (props.minHeight || 0) + (props.border ? 2 : 0)
    )
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
    padding: props.padding || 2
  })
}