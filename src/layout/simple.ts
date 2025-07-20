/**
 * Simple Layout Functions - Basic positioning and arrangement utilities
 * 
 * Provides simple layout functions for basic positioning and layering
 * without the complexity of flexbox or grid systems.
 */

import { Effect } from "effect"
import { stringWidth } from "../utils/string-width"
import type { View } from "../core/types"

/**
 * Create a simple layout with basic positioning
 * 
 * Provides a minimal layout system for simple view positioning
 * without advanced features like flexbox or grid alignment.
 * 
 * @param content - The main content view
 * @param options - Layout options
 * @returns A view with simple layout applied
 * 
 * @example
 * ```typescript
 * const layout = simpleLayout(content, {
 *   padding: 2,
 *   width: 80,
 *   height: 24
 * })
 * ```
 */
export const simpleLayout = (
  content: View,
  options: {
    padding?: number
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  } = {}
): View => {
  const { padding = 0, width, height, align = 'left' } = options
  
  return {
    render: () => Effect.gen(function* (_) {
      const rendered = yield* _(content.render())
      const lines = rendered.split('\n')
      
      // Apply padding
      if (padding > 0) {
        const paddedLines = lines.map(line => 
          ' '.repeat(padding) + line + ' '.repeat(padding)
        )
        const emptyLine = ' '.repeat((content.width || 0) + padding * 2)
        
        return [
          ...Array(padding).fill(emptyLine),
          ...paddedLines,
          ...Array(padding).fill(emptyLine)
        ].join('\n')
      }
      
      // Apply width/alignment if specified
      if (width && width > (content.width || 0)) {
        const alignedLines = lines.map(line => {
          const lineWidth = stringWidth(line)
          const space = width - lineWidth
          
          switch (align) {
            case 'center':
              const leftPad = Math.floor(space / 2)
              const rightPad = space - leftPad
              return ' '.repeat(leftPad) + line + ' '.repeat(rightPad)
            case 'right':
              return ' '.repeat(space) + line
            default:
              return line + ' '.repeat(space)
          }
        })
        
        return alignedLines.join('\n')
      }
      
      return rendered
    }),
    width: width || (content.width || 0) + padding * 2,
    height: height || (content.height || 0) + padding * 2
  }
}

/**
 * Layer multiple views on top of each other
 * 
 * Renders multiple views in layers, with later views appearing
 * on top of earlier ones. Views maintain their positioning.
 * 
 * @param layers - Array of views to layer (bottom to top order)
 * @param width - Container width
 * @param height - Container height
 * @returns A view containing the layered content
 * 
 * @example
 * ```typescript
 * const layeredView = layered([
 *   backgroundView,
 *   contentView,
 *   overlayView
 * ], 80, 24)
 * ```
 */
export const layered = (
  layers: View[],
  width: number,
  height: number
): View => {
  if (layers.length === 0) {
    return { render: () => Effect.succeed(''), width, height }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      // Create base buffer
      const buffer: string[][] = Array(height).fill(null).map(() => 
        Array(width).fill(' ')
      )
      
      // Render each layer into the buffer
      for (const layer of layers) {
        const content = yield* _(layer.render())
        const lines = content.split('\n')
        
        for (let y = 0; y < lines.length && y < height; y++) {
          const line = lines[y] ?? ''
          const chars = [...line]
          
          for (let x = 0; x < chars.length && x < width; x++) {
            const char = chars[x]
            if (char && char !== ' ' && buffer[y]) {
              buffer[y][x] = char
            }
          }
        }
      }
      
      // Convert buffer to string
      return buffer.map(row => row.join('')).join('\n')
    }),
    width,
    height
  }
}

// =============================================================================
// Re-export simple layout functions from other modules
// =============================================================================

/**
 * @deprecated Use flexbox-simple module functions directly
 * Re-exported for backward compatibility
 */
// Re-export simple layout utilities from main flexbox
// These are convenience aliases for backward compatibility
export { hbox as simpleHBox, vbox as simpleVBox } from "./flexbox"