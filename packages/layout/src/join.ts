/**
 * Join Layout Functions - Similar to Lipgloss JoinHorizontal/JoinVertical
 * 
 * Provides functions to join multiple views together with proper alignment
 */

import { Effect } from "effect"
import { stringWidth } from "../utils/string-width"
import type { View } from "@tuix/core"

/**
 * Position for alignment (0.0 to 1.0)
 */
export type Position = number

export const Top: Position = 0.0
export const Left: Position = 0.0
export const Center: Position = 0.5
export const Bottom: Position = 1.0
export const Right: Position = 1.0

/**
 * Join views horizontally with vertical alignment
 * 
 * Combines multiple views side-by-side with configurable alignment and spacing.
 * Views are aligned vertically according to the specified position.
 * 
 * @param position - Vertical alignment position (0.0 = top, 0.5 = center, 1.0 = bottom)
 * @param views - Array of views to join horizontally
 * @returns A view containing the horizontally joined content
 * 
 * @example
 * ```typescript
 * const combined = joinHorizontal(Center, view1, view2, view3)
 * ```
 */
export const joinHorizontal = (
  position: Position,
  ...views: View[]
): View => {
  // No spacing in the simplified API - use the legacy function if needed
  const spacing = 0
  
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      // Render all views
      const rendered = yield* _(
        Effect.forEach(views, v => v.render())
      )
      
      // Split each into lines
      const viewLines = rendered.map(content => content.split('\n'))
      
      // Find max height
      const maxHeight = Math.max(...viewLines.map(lines => lines.length))
      
      // Align each view vertically
      const aligned = viewLines.map(lines => {
        const height = lines.length
        if (height >= maxHeight) return lines
        
        const diff = maxHeight - height
        const top = Math.floor(diff * position)
        const bottom = diff - top
        
        return [
          ...Array(top).fill(''),
          ...lines,
          ...Array(bottom).fill('')
        ]
      })
      
      // Join lines horizontally
      const result: string[] = []
      for (let i = 0; i < maxHeight; i++) {
        const lineParts = aligned.map((lines, viewIndex) => {
          const line = lines[i] || ''
          const viewWidth = views[viewIndex]?.width || 0
          // Pad to view width
          return line.padEnd(viewWidth)
        })
        const spacer = ' '.repeat(spacing)
        result.push(lineParts.join(spacer))
      }
      
      return result.join('\n')
    }),
    width: views.reduce((sum, v) => sum + (v.width || 0), 0) + spacing * (views.length - 1),
    height: Math.max(...views.map(v => v.height || 0))
  }
}

/**
 * Join views vertically with horizontal alignment
 * 
 * Combines multiple views top-to-bottom with configurable alignment.
 * Views are aligned horizontally according to the specified position.
 * 
 * @param position - Horizontal alignment position (0.0 = left, 0.5 = center, 1.0 = right)
 * @param views - Array of views to join vertically
 * @returns A view containing the vertically joined content
 * 
 * @example
 * ```typescript
 * const combined = joinVertical(Left, header, content, footer)
 * ```
 */
export const joinVertical = (
  position: Position,
  ...views: View[]
): View => {
  // No spacing in the simplified API - use the legacy function if needed
  const spacing = 0
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      // Render all views
      const rendered = yield* _(
        Effect.forEach(views, v => v.render())
      )
      
      // Find max width
      const maxWidth = Math.max(...views.map(v => v.width || 0))
      
      // Align each view horizontally
      const aligned = rendered.map((content, index) => {
        const lines = content.split('\n')
        const viewWidth = views[index]?.width || 0
        
        if (viewWidth >= maxWidth) return lines
        
        const diff = maxWidth - viewWidth
        const left = Math.floor(diff * position)
        const right = diff - left
        
        return lines.map(line => 
          ' '.repeat(left) + line + ' '.repeat(right)
        )
      })
      
      // Join all views with spacing
      if (spacing > 0) {
        const spacerLines = Array(spacing).fill(' '.repeat(maxWidth))
        const result: string[] = []
        aligned.forEach((lines, i) => {
          result.push(...lines)
          if (i < aligned.length - 1) {
            result.push(...spacerLines)
          }
        })
        return result.join('\n')
      }
      
      return aligned.flat().join('\n')
    }),
    width: Math.max(...views.map(v => v.width || 0)),
    height: views.reduce((sum, v) => sum + (v.height || 0), 0) + spacing * (views.length - 1)
  }
}

/**
 * Place a view in a box with specific dimensions and alignment
 * 
 * Centers or aligns a view within a container of specified dimensions.
 * Useful for creating fixed-size containers with positioned content.
 * 
 * @param width - Container width in characters
 * @param height - Container height in lines
 * @param hPos - Horizontal alignment position (0.0 = left, 0.5 = center, 1.0 = right)
 * @param vPos - Vertical alignment position (0.0 = top, 0.5 = center, 1.0 = bottom)
 * @param view - The view to place in the container
 * @returns A view containing the positioned content
 * 
 * @example
 * ```typescript
 * const centered = place(80, 24, Center, Center, content)
 * const topLeft = place(40, 10, Left, Top, menu)
 * ```
 */
export const place = (
  width: number,
  height: number,
  hPos: Position,
  vPos: Position,
  view: View
): View => {
  return {
    render: () => Effect.gen(function* (_) {
      const content = yield* _(view.render())
      const lines = content.split('\n')
      
      // Horizontal alignment
      const alignedLines = lines.map(line => {
        const lineWidth = stringWidth(line)
        if (lineWidth >= width) return line.slice(0, width)
        
        const space = width - lineWidth
        const left = Math.floor(space * hPos)
        const right = space - left
        
        return ' '.repeat(left) + line + ' '.repeat(right)
      })
      
      // Vertical alignment
      const currentHeight = alignedLines.length
      if (currentHeight >= height) {
        return alignedLines.slice(0, height).join('\n')
      }
      
      const vSpace = height - currentHeight
      const top = Math.floor(vSpace * vPos)
      const bottom = vSpace - top
      
      const emptyLine = ' '.repeat(width)
      const result = [
        ...Array(top).fill(emptyLine),
        ...alignedLines,
        ...Array(bottom).fill(emptyLine)
      ]
      
      return result.join('\n')
    }),
    width,
    height
  }
}

/**
 * Options for joining views (legacy API)
 */
export interface JoinOptions {
  spacing?: number
  align?: Position | 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right'
}

/**
 * Legacy horizontal join function with options (for backward compatibility)
 * 
 * @deprecated Use joinHorizontal(position, ...views) instead
 */
export const joinHorizontalWithOptions = (
  views: View[],
  options: JoinOptions = {}
): View => {
  const position = parseAlignmentOption(options.align, Center)
  
  if (options.spacing && options.spacing > 0) {
    return joinHorizontalWithSpacing(position, views, options.spacing)
  }
  
  return joinHorizontal(position, ...views)
}

/**
 * Legacy vertical join function with options (for backward compatibility)
 * 
 * @deprecated Use joinVertical(position, ...views) instead
 */
export const joinVerticalWithOptions = (
  views: View[],
  options: JoinOptions = {}
): View => {
  const position = parseAlignmentOption(options.align, Center)
  
  if (options.spacing && options.spacing > 0) {
    return joinVerticalWithSpacing(position, views, options.spacing)
  }
  
  return joinVertical(position, ...views)
}

/**
 * Parse alignment option string to position value
 */
const parseAlignmentOption = (
  align: Position | string | undefined,
  defaultPos: Position
): Position => {
  if (typeof align === 'number') return align
  
  switch (align) {
    case 'top': case 'left': return 0.0
    case 'middle': case 'center': return 0.5
    case 'bottom': case 'right': return 1.0
    default: return defaultPos
  }
}

/**
 * Join views horizontally with spacing
 */
const joinHorizontalWithSpacing = (
  position: Position,
  views: View[],
  spacing: number
): View => {
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  // Add spacer views between content views
  const spacedViews: View[] = []
  views.forEach((view, i) => {
    spacedViews.push(view)
    if (i < views.length - 1) {
      spacedViews.push({
        render: () => Effect.succeed(' '.repeat(spacing)),
        width: spacing,
        height: 1
      })
    }
  })
  
  return joinHorizontal(position, ...spacedViews)
}

/**
 * Join views vertically with spacing
 */
const joinVerticalWithSpacing = (
  position: Position,
  views: View[],
  spacing: number
): View => {
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  const maxWidth = Math.max(...views.map(v => v.width || 0))
  
  return {
    render: () => Effect.gen(function* (_) {
      const rendered = yield* _(Effect.forEach(views, v => v.render()))
      
      const aligned = rendered.map((content, index) => {
        const lines = content.split('\n')
        const viewWidth = views[index]?.width || 0
        
        if (viewWidth >= maxWidth) return lines
        
        const diff = maxWidth - viewWidth
        const left = Math.floor(diff * position)
        const right = diff - left
        
        return lines.map(line => 
          ' '.repeat(left) + line + ' '.repeat(right)
        )
      })
      
      const spacerLines = Array(spacing).fill(' '.repeat(maxWidth))
      const result: string[] = []
      aligned.forEach((lines, i) => {
        result.push(...lines)
        if (i < aligned.length - 1) {
          result.push(...spacerLines)
        }
      })
      
      return result.join('\n')
    }),
    width: maxWidth,
    height: views.reduce((sum, v) => sum + (v.height || 0), 0) + spacing * (views.length - 1)
  }
}

/**
 * Join views in a grid layout
 * 
 * Creates a 2D grid of views with consistent spacing and alignment.
 * Each row is joined horizontally, then all rows are joined vertically.
 * 
 * @param views - 2D array of views (rows x columns)
 * @param options - Join options including spacing and alignment
 * @returns A view containing the grid layout
 * 
 * @example
 * ```typescript
 * const grid = joinGrid([
 *   [header1, header2, header3],
 *   [cell1, cell2, cell3],
 *   [footer1, footer2, footer3]
 * ], { spacing: 1, align: Center })
 * ```
 */
export const joinGrid = (
  views: View[][],
  options: JoinOptions = {}
): View => {
  const { spacing = 0, align = Center } = options
  
  if (views.length === 0 || views[0]?.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      // First, create horizontal rows
      const rows = yield* _(
        Effect.forEach(views, row => {
          // Add spacing views between columns
          const spacedRow: View[] = []
          row.forEach((view, i) => {
            spacedRow.push(view)
            if (i < row.length - 1 && spacing > 0) {
              spacedRow.push({
                render: () => Effect.succeed(' '.repeat(spacing)),
                width: spacing,
                height: 1
              })
            }
          })
          return joinHorizontal(typeof align === 'number' ? align : Center, ...spacedRow).render()
        })
      )
      
      // Then join rows vertically with spacing
      if (spacing > 0) {
        const spacedRows: string[] = []
        rows.forEach((row, i) => {
          spacedRows.push(row)
          if (i < rows.length - 1) {
            spacedRows.push('') // Empty line for vertical spacing
          }
        })
        return spacedRows.join('\n')
      }
      
      return rows.join('\n')
    }),
    width: 0, // Calculated dynamically
    height: 0 // Calculated dynamically
  }
}