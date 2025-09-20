/**
 * Screenshot Capture Implementation
 * 
 * Captures TUIX views into the .cks format
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import type { TuixScreenshot, ComponentSnapshot, ScreenshotOptions, StyleMap } from "./types.ts"
import { renderStyledSync } from "@/styling/render.ts"
import { version } from "../../package.json" with { type: "json" }
import type { RendererService } from "@/services/renderer.ts"
import type { StyleProps } from "@/styling/types.ts"

/**
 * Serialize style properties for screenshot storage
 */
function serializeStyle(style?: StyleProps): Record<string, any> | undefined {
  if (!style) return undefined
  
  const serialized: Record<string, any> = {}
  
  // Colors
  if (style.foreground) serialized.foreground = style.foreground
  if (style.background) serialized.background = style.background
  
  // Text decoration
  if (style.bold) serialized.bold = style.bold
  if (style.italic) serialized.italic = style.italic
  if (style.underline) serialized.underline = style.underline
  if (style.strikethrough) serialized.strikethrough = style.strikethrough
  if (style.inverse) serialized.inverse = style.inverse
  if (style.blink) serialized.blink = style.blink
  if (style.faint) serialized.faint = style.faint
  
  // Borders
  if (style.border) serialized.border = style.border
  if (style.borderTop) serialized.borderTop = style.borderTop
  if (style.borderRight) serialized.borderRight = style.borderRight
  if (style.borderBottom) serialized.borderBottom = style.borderBottom
  if (style.borderLeft) serialized.borderLeft = style.borderLeft
  
  // Spacing
  if (style.padding) serialized.padding = style.padding
  if (style.margin) serialized.margin = style.margin
  
  // Alignment
  if (style.horizontalAlign) serialized.horizontalAlign = style.horizontalAlign
  if (style.verticalAlign) serialized.verticalAlign = style.verticalAlign
  
  // Dimensions
  if (style.width !== undefined) serialized.width = style.width
  if (style.height !== undefined) serialized.height = style.height
  if (style.minWidth !== undefined) serialized.minWidth = style.minWidth
  if (style.minHeight !== undefined) serialized.minHeight = style.minHeight
  if (style.maxWidth !== undefined) serialized.maxWidth = style.maxWidth
  if (style.maxHeight !== undefined) serialized.maxHeight = style.maxHeight
  
  // Other
  if (style.wordBreak) serialized.wordBreak = style.wordBreak
  if (style.overflow) serialized.overflow = style.overflow
  
  return Object.keys(serialized).length > 0 ? serialized : undefined
}

/**
 * Capture a screenshot of a View
 */
export function captureScreenshot(
  view: View,
  options: ScreenshotOptions
): Effect.Effect<TuixScreenshot, Error, RendererService> {
  return Effect.gen(function* (_) {
    const renderer = yield* _(RendererService)
    
    // Render the view to get visual output
    const rendered = renderStyledSync(view, renderer)
    
    // Parse the rendered output into lines and styles
    const { lines, styles } = parseRenderedOutput(rendered)
    
    // Extract component tree
    const components = extractComponentTree(view)
    
    // Get terminal dimensions
    const dimensions = {
      width: renderer.width,
      height: renderer.height
    }
    
    // Create screenshot
    const screenshot: TuixScreenshot = {
      metadata: {
        version,
        timestamp: new Date().toISOString(),
        name: options.name,
        description: options.description,
        dimensions
      },
      visual: {
        lines,
        styles
      },
      components,
      raw: options.includeRaw ? { ansiCodes: rendered } : undefined
    }
    
    return screenshot
  })
}

/**
 * Parse rendered output into lines and extract style information
 */
function parseRenderedOutput(rendered: string): { lines: string[], styles: StyleMap[] } {
  // Remove ANSI codes and track positions
  const lines: string[] = []
  const styles: StyleMap[] = []
  
  // Split by newlines
  const rawLines = rendered.split('\n')
  
  rawLines.forEach((line, lineIndex) => {
    // Track styles in this line
    const segments: StyleMap['segments'] = []
    let cleanLine = ''
    let position = 0
    
    // Simple ANSI code parser (this is a simplified version)
    // In production, use a proper ANSI parser
    const ansiRegex = /\x1b\[([0-9;]+)m/g
    let lastIndex = 0
    let currentStyle: any = {}
    
    let match
    while ((match = ansiRegex.exec(line)) !== null) {
      // Add text before this ANSI code
      const text = line.substring(lastIndex, match.index)
      if (text) {
        const start = position
        cleanLine += text
        position += text.length
        
        // Add segment if we have active styles
        if (Object.keys(currentStyle).length > 0) {
          segments.push({
            start,
            end: position,
            style: { ...currentStyle }
          })
        }
      }
      
      // Parse ANSI codes (simplified)
      const codes = match[1].split(';').map(Number)
      codes.forEach(code => {
        if (code === 0) currentStyle = {} // Reset
        else if (code === 1) currentStyle.bold = true
        else if (code === 3) currentStyle.italic = true
        else if (code === 4) currentStyle.underline = true
        else if (code >= 30 && code <= 37) {
          // Foreground colors
          const colorMap = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
          currentStyle.foreground = colorMap[code - 30]
        }
        else if (code >= 90 && code <= 97) {
          // Bright foreground colors
          const colorMap = ['brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
          currentStyle.foreground = colorMap[code - 90]
        }
      })
      
      lastIndex = ansiRegex.lastIndex
    }
    
    // Add remaining text
    const remainingText = line.substring(lastIndex)
    if (remainingText) {
      cleanLine += remainingText
    }
    
    lines.push(cleanLine)
    
    if (segments.length > 0) {
      styles.push({
        line: lineIndex,
        segments
      })
    }
  })
  
  return { lines, styles }
}

/**
 * Extract component tree from a View
 */
function extractComponentTree(view: View): ComponentSnapshot {
  // This is a simplified version - in production, we'd need to handle all view types
  const viewAny = view as any
  
  if (viewAny._tag === 'Text') {
    return {
      type: 'text',
      content: viewAny.content
    }
  } else if (viewAny._tag === 'StyledText') {
    return {
      type: 'styledText',
      content: viewAny.content,
      props: {
        style: serializeStyle(viewAny.style)
      }
    }
  } else if (viewAny._tag === 'HStack') {
    return {
      type: 'hstack',
      children: viewAny.children.map(extractComponentTree)
    }
  } else if (viewAny._tag === 'VStack') {
    return {
      type: 'vstack',
      children: viewAny.children.map(extractComponentTree)
    }
  } else if (viewAny._tag === 'Box') {
    return {
      type: 'box',
      props: {
        border: viewAny.border,
        style: viewAny.style
      },
      children: viewAny.child ? [extractComponentTree(viewAny.child)] : []
    }
  } else if (viewAny._tag === 'Spacer') {
    return {
      type: 'spacer',
      props: {
        size: viewAny.size
      }
    }
  } else {
    return {
      type: 'custom',
      props: viewAny
    }
  }
}
