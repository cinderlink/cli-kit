/**
 * Screenshot Capture Implementation
 * 
 * Captures CLI-KIT views into the .cks format
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import type { CliKitScreenshot, ComponentSnapshot, ScreenshotOptions, StyleMap } from "./types.ts"
import { renderStyledSync } from "@/styling/render.ts"
import type { RendererService } from "@/services/renderer.ts"

/**
 * Capture a screenshot of a View
 */
export function captureScreenshot(
  view: View,
  options: ScreenshotOptions
): Effect.Effect<CliKitScreenshot, Error, RendererService> {
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
    const screenshot: CliKitScreenshot = {
      metadata: {
        version: "1.0.0", // TODO: Get from package.json
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
        style: viewAny.style // TODO: Serialize style properly
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