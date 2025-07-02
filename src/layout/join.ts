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
  position: Position,
  ...views: View[]
): View => {
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
        result.push(lineParts.join(''))
      }
      
      return result.join('\n')
    }),
    width: views.reduce((sum, v) => sum + (v.width || 0), 0),
    height: Math.max(...views.map(v => v.height || 0))
  }
}

/**
 * Join views vertically with horizontal alignment
 */
export const joinVertical = (
  position: Position,
  ...views: View[]
): View => {
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
      
      // Join all lines
      return aligned.flat().join('\n')
    }),
    width: Math.max(...views.map(v => v.width || 0)),
    height: views.reduce((sum, v) => sum + (v.height || 0), 0)
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