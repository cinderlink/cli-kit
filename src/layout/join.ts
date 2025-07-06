/**
 * Join Layout Functions - Similar to Lipgloss JoinHorizontal/JoinVertical
 * 
 * Provides functions to join multiple views together with proper alignment
 */

import { Effect } from "effect"
import { stringWidth } from "@/utils/string-width.ts"
import type { View } from "@/core/types.ts"

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
 */
export const joinHorizontal = (
  views: View[],
  options: JoinOptions = {}
): View => {
  const spacing = options.spacing ?? 0
  let position = Center
  
  // Handle string alignment values
  if (typeof options.align === 'string') {
    switch (options.align) {
      case 'top': position = Top; break
      case 'middle': position = Center; break
      case 'bottom': position = Bottom; break
      case 'center': position = Center; break
      default: position = Center
    }
  } else if (typeof options.align === 'number') {
    position = options.align
  } else {
    position = Center
  }
  
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
          const viewWidth = views[viewIndex].width || 0
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
 */
export const joinVertical = (
  views: View[],
  options: JoinOptions = {}
): View => {
  const spacing = options.spacing ?? 0
  let position = Center
  
  // Handle string alignment values
  if (typeof options.align === 'string') {
    switch (options.align) {
      case 'left': position = Left; break
      case 'center': position = Center; break
      case 'right': position = Right; break
      default: position = Center
    }
  } else if (typeof options.align === 'number') {
    position = options.align
  }
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
        const viewWidth = views[index].width || 0
        
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
 * Options for joining views
 */
export interface JoinOptions {
  spacing?: number
  align?: Position | 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right'
}

/**
 * Join views in a grid layout
 */
export const joinGrid = (
  views: View[][],
  options: JoinOptions = {}
): View => {
  const { spacing = 0, align = Center } = options
  
  if (views.length === 0 || views[0].length === 0) {
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
          return joinHorizontal(spacedRow, { align: typeof align === 'number' ? align : 'center' }).render()
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