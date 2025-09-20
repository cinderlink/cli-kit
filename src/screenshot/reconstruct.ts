/**
 * Screenshot Reconstruction
 * 
 * Recreates Views from .cks screenshot files
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import type { TuixScreenshot, ComponentSnapshot } from "./types.ts"
import { text, styledText, hstack, vstack, box } from "@/core/view.ts"
import { spacer } from "@/layout/index.ts"
import { style, Colors } from "@/styling/index.ts"
import { Borders } from "@/styling/index.ts"

/**
 * Reconstruct a View from a screenshot
 */
export function reconstructView(screenshot: TuixScreenshot): Effect.Effect<View, Error> {
  return Effect.try({
    try: () => reconstructComponentTree(screenshot.components),
    catch: (error) => new Error(`Failed to reconstruct view: ${error}`)
  })
}

/**
 * Reconstruct a component tree
 */
function reconstructComponentTree(snapshot: ComponentSnapshot): View {
  switch (snapshot.type) {
    case 'text':
      return text(snapshot.content || '')
      
    case 'styledText':
      const textStyle = snapshot.props?.style ? reconstructStyle(snapshot.props.style) : style()
      return styledText(snapshot.content || '', textStyle)
      
    case 'hstack':
      const hChildren = snapshot.children?.map(reconstructComponentTree) || []
      return hstack(...hChildren)
      
    case 'vstack':
      const vChildren = snapshot.children?.map(reconstructComponentTree) || []
      return vstack(...vChildren)
      
    case 'box':
      const borderStyle = snapshot.props?.border || Borders.single
      const boxStyle = snapshot.props?.style ? reconstructStyle(snapshot.props.style) : undefined
      const child = snapshot.children?.[0] ? reconstructComponentTree(snapshot.children[0]) : text('')
      return box(child, borderStyle, boxStyle)
      
    case 'spacer':
      return spacer(snapshot.props?.size || 1)
      
    case 'custom':
      // For custom components, we'll need a registry or fallback
      return text('[Custom Component]')
      
    default:
      return text('[Unknown Component]')
  }
}

/**
 * Reconstruct a style object from serialized data
 */
function reconstructStyle(styleData: any) {
  let s = style()
  
  if (styleData.foreground) {
    // Map color names to Colors object
    const colorName = styleData.foreground
    const color = (Colors as any)[colorName]
    if (color) {
      s = s.foreground(color)
    }
  }
  
  if (styleData.background) {
    const colorName = styleData.background
    const color = (Colors as any)[colorName]
    if (color) {
      s = s.background(color)
    }
  }
  
  if (styleData.bold) s = s.bold()
  if (styleData.italic) s = s.italic()
  if (styleData.underline) s = s.underline()
  
  return s
}

/**
 * Create a visual-only view from screenshot (without component tree)
 */
export function createVisualView(screenshot: TuixScreenshot): View {
  const views: View[] = []
  
  screenshot.visual.lines.forEach((line, lineIndex) => {
    const styleMap = screenshot.visual.styles.find(s => s.line === lineIndex)
    
    if (!styleMap || styleMap.segments.length === 0) {
      // No styles, just plain text
      views.push(text(line))
    } else {
      // Build line with styled segments
      const segments: View[] = []
      let lastEnd = 0
      
      styleMap.segments.forEach(segment => {
        // Add unstyled text before this segment
        if (segment.start > lastEnd) {
          segments.push(text(line.substring(lastEnd, segment.start)))
        }
        
        // Add styled segment
        const segmentText = line.substring(segment.start, segment.end)
        const segmentStyle = segment.style ? reconstructStyle(segment.style) : style()
        segments.push(styledText(segmentText, segmentStyle))
        
        lastEnd = segment.end
      })
      
      // Add remaining unstyled text
      if (lastEnd < line.length) {
        segments.push(text(line.substring(lastEnd)))
      }
      
      views.push(hstack(...segments))
    }
  })
  
  return vstack(...views)
}
