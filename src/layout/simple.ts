/**
 * Simple layout functions that properly compose views
 */

import { Effect } from "effect"
import stringWidth from "string-width"
import type { View } from "@/core/types.ts"

/**
 * Simple vertical box that stacks views
 */
export const simpleVBox = (views: View[]): View => {
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      const rendered: string[] = []
      
      for (const view of views) {
        const content = yield* _(view.render())
        rendered.push(content)
      }
      
      return rendered.join('\n')
    }),
    width: Math.max(...views.map(v => v.width || 0)),
    height: views.reduce((sum, v) => sum + (v.height || 0), 0)
  }
}

/**
 * Simple horizontal box that joins views side by side
 */
export const simpleHBox = (views: View[]): View => {
  if (views.length === 0) {
    return { render: () => Effect.succeed(""), width: 0, height: 0 }
  }
  
  return {
    render: () => Effect.gen(function* (_) {
      // Render all views
      const rendered: string[][] = []
      for (const view of views) {
        const content = yield* _(view.render())
        rendered.push(content.split('\n'))
      }
      
      // Find max height
      const maxHeight = Math.max(...rendered.map(lines => lines.length))
      
      // Pad all to same height
      for (let i = 0; i < rendered.length; i++) {
        while (rendered[i].length < maxHeight) {
          rendered[i].push('')
        }
      }
      
      // Join horizontally
      const result: string[] = []
      for (let row = 0; row < maxHeight; row++) {
        const parts: string[] = []
        for (let col = 0; col < rendered.length; col++) {
          const line = rendered[col][row] || ''
          const width = views[col].width || stringWidth(line)
          parts.push(line.padEnd(width))
        }
        result.push(parts.join(''))
      }
      
      return result.join('\n')
    }),
    width: views.reduce((sum, v) => sum + (v.width || 0), 0),
    height: Math.max(...views.map(v => v.height || 0))
  }
}