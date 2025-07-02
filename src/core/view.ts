/**
 * View System - Basic view primitives for rendering
 */

import { Effect } from "effect"
import { stringWidth } from "@/utils/string-width.ts"
import type { View, RenderError } from "@/core/types.ts"
import { RendererService } from "@/services/index.ts"
import { style as createStyle, renderStyledSync, type Style } from "@/styling/index.ts"

/**
 * Create a simple text view
 */
export const text = (content: string): View => ({
  render: () => Effect.succeed(content),
  width: content.split('\n').reduce((max, line) => Math.max(max, stringWidth(line)), 0),
  height: content.split('\n').length
})

/**
 * Create an empty view
 */
export const empty: View = text('')

/**
 * Combine multiple views vertically
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
 * Note: For advanced alignment options, use joinHorizontal from @/layout/join.ts
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
        const line = aligned.map(lines => lines[i] || '').join('')
        result.push(line)
      }
      
      return result.join('\n')
    }),
  width: views.reduce((sum, v) => sum + (v.width || 0), 0),
  height: Math.max(...views.map(v => v.height || 1))
})

/**
 * Create a box around a view
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

// Common styles
export const bold = (view: View) => styled(view, '\x1b[1m')
export const dim = (view: View) => styled(view, '\x1b[2m')
export const italic = (view: View) => styled(view, '\x1b[3m')
export const underline = (view: View) => styled(view, '\x1b[4m')

// Colors
export const red = (view: View) => styled(view, '\x1b[31m')
export const green = (view: View) => styled(view, '\x1b[32m')
export const yellow = (view: View) => styled(view, '\x1b[33m')
export const blue = (view: View) => styled(view, '\x1b[34m')
export const magenta = (view: View) => styled(view, '\x1b[35m')
export const cyan = (view: View) => styled(view, '\x1b[36m')
export const white = (view: View) => styled(view, '\x1b[37m')

/**
 * Create a styled text view using the new styling system
 */
export const styledText = (content: string, style: Style): View => ({
  render: () => Effect.succeed(renderStyledSync(content, style)),
  width: style.get("width") || content.split('\n').reduce((max, line) => Math.max(max, stringWidth(line)), 0),
  height: style.get("height") || content.split('\n').length
})