/**
 * Dynamic Layout System - Flexible layout components for adaptive UIs
 * 
 * Provides:
 * - Dynamic spacing that adapts to content height
 * - Conditional spacers
 * - Flexible containers
 * - Height-aware layouts
 */

import { Effect } from "effect"
import type { View, AppServices } from "@/core/types.ts"
import { View as ViewCore } from "@/core/view.ts"

// =============================================================================
// Types
// =============================================================================

export interface DynamicViewProps {
  readonly minHeight?: number
  readonly maxHeight?: number
  readonly padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

export interface SpacerOptions {
  readonly height: number
  readonly char?: string
}

export interface ConditionalSpacerOptions extends SpacerOptions {
  readonly condition: boolean
}

// =============================================================================
// Dynamic Spacers
// =============================================================================

/**
 * Create a fixed-height spacer
 */
export const fixedSpacer = (options: SpacerOptions | number): View => {
  const height = typeof options === 'number' ? options : options.height
  const char = typeof options === 'object' ? options.char || ' ' : ' '
  
  const lines = Array(height).fill(char)
  
  return {
    render: () => Effect.succeed(lines.join('\n')),
    width: 1,
    height
  }
}

/**
 * Create a conditional spacer that only renders if condition is true
 */
export const conditionalSpacer = (options: ConditionalSpacerOptions): View => {
  if (!options.condition) {
    return {
      render: () => Effect.succeed(''),
      width: 0,
      height: 0
    }
  }
  
  return fixedSpacer({ height: options.height, char: options.char })
}

/**
 * Create a dynamic spacer that adapts based on available space
 */
export const dynamicSpacer = (minHeight: number = 1, maxHeight: number = 5): View => {
  // In practice, this would calculate based on terminal height
  // For now, we'll use a middle value
  const height = Math.floor((minHeight + maxHeight) / 2)
  
  return fixedSpacer(height)
}

// =============================================================================
// Dynamic Containers
// =============================================================================

/**
 * Create a dynamic vertical box that handles variable-height children
 */
export const dynamicVBox = (
  children: ReadonlyArray<View>,
  options?: {
    gap?: number
    align?: 'left' | 'center' | 'right'
    minHeight?: number
    maxHeight?: number
  }
): View => {
  const gap = options?.gap ?? 0
  const align = options?.align ?? 'left'
  const minHeight = options?.minHeight ?? 0
  const maxHeight = options?.maxHeight ?? Infinity
  
  return {
    render: () => Effect.gen(function* (_) {
      const renderedChildren: string[] = []
      let totalHeight = 0
      let maxWidth = 0
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const rendered = yield* _(child.render())
        
        if (rendered) {
          const lines = rendered.split('\n')
          renderedChildren.push(...lines)
          totalHeight += lines.length
          
          for (const line of lines) {
            maxWidth = Math.max(maxWidth, line.length)
          }
          
          // Add gap after each child except the last
          if (i < children.length - 1 && gap > 0) {
            for (let j = 0; j < gap; j++) {
              renderedChildren.push('')
              totalHeight++
            }
          }
        }
      }
      
      // Apply min/max height constraints
      if (totalHeight < minHeight) {
        const padding = minHeight - totalHeight
        for (let i = 0; i < padding; i++) {
          renderedChildren.push('')
        }
        totalHeight = minHeight
      } else if (totalHeight > maxHeight) {
        renderedChildren.splice(maxHeight)
        totalHeight = maxHeight
      }
      
      // Apply alignment
      const alignedChildren = renderedChildren.map(line => {
        const padding = maxWidth - line.length
        switch (align) {
          case 'center':
            const leftPad = Math.floor(padding / 2)
            const rightPad = padding - leftPad
            return ' '.repeat(leftPad) + line + ' '.repeat(rightPad)
          case 'right':
            return ' '.repeat(padding) + line
          default:
            return line + ' '.repeat(padding)
        }
      })
      
      return alignedChildren.join('\n')
    }),
    width: 0, // Dynamic width
    height: 0 // Dynamic height
  }
}

/**
 * Create a height-aware container that reports its actual height
 */
export const heightAwareContainer = (
  content: View,
  onHeightChange?: (height: number) => void
): View => {
  return {
    render: () => Effect.gen(function* (_) {
      const rendered = yield* _(content.render())
      const lines = rendered.split('\n')
      const actualHeight = lines.length
      
      if (onHeightChange) {
        onHeightChange(actualHeight)
      }
      
      return rendered
    }),
    width: content.width,
    height: content.height
  }
}

/**
 * Create a padded container with dynamic padding
 */
export const paddedContainer = (
  content: View,
  padding: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
): View => {
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding
  
  return {
    render: () => Effect.gen(function* (_) {
      const rendered = yield* _(content.render())
      const lines = rendered.split('\n')
      
      // Add left/right padding to each line
      const paddedLines = lines.map(line => {
        const leftPad = ' '.repeat(left)
        const rightPad = ' '.repeat(right)
        return leftPad + line + rightPad
      })
      
      // Add top padding
      const topPadding = Array(top).fill(' '.repeat(left + content.width + right))
      
      // Add bottom padding
      const bottomPadding = Array(bottom).fill(' '.repeat(left + content.width + right))
      
      return [...topPadding, ...paddedLines, ...bottomPadding].join('\n')
    }),
    width: content.width + left + right,
    height: content.height + top + bottom
  }
}

// =============================================================================
// Layout Helpers
// =============================================================================

/**
 * Create a responsive layout that adapts to terminal size
 */
export const responsiveLayout = (
  narrow: View,
  wide: View,
  breakpoint: number = 80
): View => {
  return {
    render: () => Effect.gen(function* (_) {
      // In a real implementation, we'd check terminal width
      const terminalWidth = process.stdout.columns || 80
      
      if (terminalWidth < breakpoint) {
        return yield* _(narrow.render())
      } else {
        return yield* _(wide.render())
      }
    }),
    width: 0, // Dynamic
    height: 0 // Dynamic
  }
}

/**
 * Create a scrollable view with viewport
 */
export const scrollableView = (
  content: View,
  viewportHeight: number,
  scrollOffset: number = 0
): View => {
  return {
    render: () => Effect.gen(function* (_) {
      const rendered = yield* _(content.render())
      const lines = rendered.split('\n')
      
      // Extract viewport
      const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight)
      
      // Pad if necessary
      while (visibleLines.length < viewportHeight) {
        visibleLines.push('')
      }
      
      return visibleLines.join('\n')
    }),
    width: content.width,
    height: viewportHeight
  }
}

// =============================================================================
// Form-specific Layouts
// =============================================================================

/**
 * Create a form field layout with label and optional error
 */
export const formField = (
  label: View,
  input: View,
  error?: View | null,
  options?: {
    labelGap?: number
    errorGap?: number
  }
): View => {
  const labelGap = options?.labelGap ?? 0
  const errorGap = options?.errorGap ?? 0
  
  const views: View[] = [label]
  
  if (labelGap > 0) {
    views.push(fixedSpacer(labelGap))
  }
  
  views.push(input)
  
  if (error) {
    if (errorGap > 0) {
      views.push(fixedSpacer(errorGap))
    }
    views.push(error)
  }
  
  return dynamicVBox(views)
}

/**
 * Create a form section with consistent spacing
 */
export const formSection = (
  fields: ReadonlyArray<View>,
  options?: {
    gap?: number
    title?: View
    titleGap?: number
  }
): View => {
  const gap = options?.gap ?? 1
  const titleGap = options?.titleGap ?? 2
  
  const views: View[] = []
  
  if (options?.title) {
    views.push(options.title)
    if (titleGap > 0) {
      views.push(fixedSpacer(titleGap))
    }
  }
  
  for (let i = 0; i < fields.length; i++) {
    views.push(fields[i])
    if (i < fields.length - 1 && gap > 0) {
      views.push(fixedSpacer(gap))
    }
  }
  
  return dynamicVBox(views)
}