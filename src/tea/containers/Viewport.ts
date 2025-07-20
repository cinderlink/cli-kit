/**
 * Viewport Component - Scrollable content area with scrollbars
 * 
 * Features:
 * - Vertical and horizontal scrolling
 * - Scroll indicators/scrollbars
 * - Mouse wheel support
 * - Keyboard navigation (arrow keys, page up/down)
 * - Content that can be larger than the viewport
 * - Smooth scrolling behavior
 */

import { Effect } from "effect"
import type { Component, View, Cmd, AppServices, KeyEvent, MouseEvent } from "../../core/types"
import { text, vstack, hstack, styledText } from "../../core/view"
import { style, Colors, Borders } from "../../styling/index"
import { styledBox } from "../../layout/box"
import { stringWidth } from "../../utils/string-width"

// =============================================================================
// Types
// =============================================================================

export interface ViewportConfig {
  readonly width: number
  readonly height: number
  readonly showScrollbars?: boolean
  readonly smoothScroll?: boolean
  readonly scrollStep?: number
  readonly pageSize?: number
}

export interface ViewportModel {
  readonly config: ViewportConfig
  readonly scrollX: number
  readonly scrollY: number
  readonly contentWidth: number
  readonly contentHeight: number
  readonly content: string[]  // Array of lines
  readonly isFocused: boolean
}

export type ViewportMsg =
  | { readonly _tag: "ScrollUp"; readonly amount?: number }
  | { readonly _tag: "ScrollDown"; readonly amount?: number }
  | { readonly _tag: "ScrollLeft"; readonly amount?: number }
  | { readonly _tag: "ScrollRight"; readonly amount?: number }
  | { readonly _tag: "ScrollToTop" }
  | { readonly _tag: "ScrollToBottom" }
  | { readonly _tag: "ScrollToPosition"; readonly x: number; readonly y: number }
  | { readonly _tag: "PageUp" }
  | { readonly _tag: "PageDown" }
  | { readonly _tag: "SetContent"; readonly content: string[] }
  | { readonly _tag: "Focus" }
  | { readonly _tag: "Blur" }
  | { readonly _tag: "MouseWheel"; readonly deltaX: number; readonly deltaY: number }

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Update scroll position with clamping and return new model
 */
const updateScroll = (
  model: ViewportModel,
  newScrollX: number,
  newScrollY: number,
  actualViewportWidth: number,
  actualViewportHeight: number
): [ViewportModel, Cmd<ViewportMsg>[]] => {
  const { scrollX, scrollY } = clampScroll(
    newScrollX,
    newScrollY,
    model.contentWidth,
    model.contentHeight,
    actualViewportWidth,
    actualViewportHeight
  )
  
  return [{ ...model, scrollX, scrollY }, []]
}

/**
 * Calculate content dimensions from lines
 */
const calculateContentDimensions = (content: string[]): { width: number; height: number } => {
  const height = content.length
  const width = content.reduce((max, line) => Math.max(max, stringWidth(line)), 0)
  return { width, height }
}

/**
 * Clamp scroll position to valid bounds
 */
const clampScroll = (
  scrollX: number,
  scrollY: number,
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { scrollX: number; scrollY: number } => {
  const maxScrollX = Math.max(0, contentWidth - viewportWidth)
  const maxScrollY = Math.max(0, contentHeight - viewportHeight)
  
  return {
    scrollX: Math.max(0, Math.min(scrollX, maxScrollX)),
    scrollY: Math.max(0, Math.min(scrollY, maxScrollY))
  }
}

/**
 * Extract visible portion of content
 */
const getVisibleContent = (
  content: string[],
  scrollX: number,
  scrollY: number,
  viewportWidth: number,
  viewportHeight: number
): string[] => {
  const visibleLines = content.slice(scrollY, scrollY + viewportHeight)
  
  return visibleLines.map(line => {
    if (scrollX >= stringWidth(line)) {
      return ''
    }
    
    // Handle multibyte characters properly
    let charCount = 0
    let bytePos = 0
    
    // Skip to scrollX position
    while (bytePos < line.length && charCount < scrollX) {
      const char = line[bytePos]
      charCount += stringWidth(char!)
      bytePos++
    }
    
    const startPos = bytePos
    
    // Take viewportWidth characters
    let visibleWidth = 0
    let endPos = startPos
    
    while (endPos < line.length && visibleWidth < viewportWidth) {
      const char = line[endPos]
      const charWidth = stringWidth(char!)
      
      if (visibleWidth + charWidth > viewportWidth) {
        break
      }
      
      visibleWidth += charWidth
      endPos++
    }
    
    const visiblePart = line.substring(startPos, endPos)
    
    // Pad to full viewport width if needed
    const paddingNeeded = viewportWidth - stringWidth(visiblePart)
    return visiblePart + ' '.repeat(Math.max(0, paddingNeeded))
  })
}

/**
 * Create vertical scrollbar
 */
const createVerticalScrollbar = (
  scrollY: number,
  contentHeight: number,
  viewportHeight: number
): string[] => {
  if (contentHeight <= viewportHeight) {
    return Array(viewportHeight).fill('│')
  }
  
  const scrollbarHeight = viewportHeight
  const thumbHeight = Math.max(1, Math.floor((viewportHeight / contentHeight) * scrollbarHeight))
  const thumbPosition = Math.floor((scrollY / (contentHeight - viewportHeight)) * (scrollbarHeight - thumbHeight))
  
  const scrollbar: string[] = []
  
  for (let i = 0; i < scrollbarHeight; i++) {
    if (i >= thumbPosition && i < thumbPosition + thumbHeight) {
      scrollbar.push('█')  // Thumb
    } else {
      scrollbar.push('│')  // Track
    }
  }
  
  return scrollbar
}

/**
 * Create horizontal scrollbar
 */
const createHorizontalScrollbar = (
  scrollX: number,
  contentWidth: number,
  viewportWidth: number
): string => {
  if (contentWidth <= viewportWidth) {
    return '─'.repeat(viewportWidth)
  }
  
  const scrollbarWidth = viewportWidth
  const thumbWidth = Math.max(1, Math.floor((viewportWidth / contentWidth) * scrollbarWidth))
  const thumbPosition = Math.floor((scrollX / (contentWidth - viewportWidth)) * (scrollbarWidth - thumbWidth))
  
  let scrollbar = ''
  
  for (let i = 0; i < scrollbarWidth; i++) {
    if (i >= thumbPosition && i < thumbPosition + thumbWidth) {
      scrollbar += '█'  // Thumb
    } else {
      scrollbar += '─'  // Track
    }
  }
  
  return scrollbar
}

// =============================================================================
// Component
// =============================================================================

export const viewport = (config: ViewportConfig): Component<ViewportModel, ViewportMsg> => ({
  init: Effect.succeed([
    {
      config: {
        showScrollbars: true,
        smoothScroll: false,
        scrollStep: 1,
        pageSize: Math.floor(config.height * 0.8),
        ...config
      },
      scrollX: 0,
      scrollY: 0,
      contentWidth: 0,
      contentHeight: 0,
      content: [],
      isFocused: false
    },
    []
  ]),
  
  update(msg: ViewportMsg, model: ViewportModel) {
    const { config } = model
    const actualViewportWidth = config.showScrollbars ? config.width - 1 : config.width
    const actualViewportHeight = config.showScrollbars ? config.height - 1 : config.height
    
    switch (msg._tag) {
      case "ScrollUp": {
        const amount = msg.amount ?? config.scrollStep ?? 1
        return Effect.succeed(updateScroll(model, model.scrollX, model.scrollY - amount, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollDown": {
        const amount = msg.amount ?? config.scrollStep ?? 1
        return Effect.succeed(updateScroll(model, model.scrollX, model.scrollY + amount, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollLeft": {
        const amount = msg.amount ?? config.scrollStep ?? 1
        return Effect.succeed(updateScroll(model, model.scrollX - amount, model.scrollY, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollRight": {
        const amount = msg.amount ?? config.scrollStep ?? 1
        return Effect.succeed(updateScroll(model, model.scrollX + amount, model.scrollY, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollToTop": {
        return Effect.succeed(updateScroll(model, model.scrollX, 0, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollToBottom": {
        return Effect.succeed(updateScroll(model, model.scrollX, model.contentHeight, actualViewportWidth, actualViewportHeight))
      }
      
      case "ScrollToPosition": {
        return Effect.succeed(updateScroll(model, msg.x, msg.y, actualViewportWidth, actualViewportHeight))
      }
      
      case "PageUp": {
        const amount = config.pageSize ?? Math.floor(actualViewportHeight * 0.8)
        return Effect.succeed(updateScroll(model, model.scrollX, model.scrollY - amount, actualViewportWidth, actualViewportHeight))
      }
      
      case "PageDown": {
        const amount = config.pageSize ?? Math.floor(actualViewportHeight * 0.8)
        return Effect.succeed(updateScroll(model, model.scrollX, model.scrollY + amount, actualViewportWidth, actualViewportHeight))
      }
      
      case "SetContent": {
        const { width: contentWidth, height: contentHeight } = calculateContentDimensions(msg.content)
        const { scrollX, scrollY } = clampScroll(
          model.scrollX,
          model.scrollY,
          contentWidth,
          contentHeight,
          actualViewportWidth,
          actualViewportHeight
        )
        
        return Effect.succeed([
          {
            ...model,
            content: msg.content,
            contentWidth,
            contentHeight,
            scrollX,
            scrollY
          },
          []
        ])
      }
      
      case "Focus": {
        return Effect.succeed([{ ...model, isFocused: true }, []])
      }
      
      case "Blur": {
        return Effect.succeed([{ ...model, isFocused: false }, []])
      }
      
      case "MouseWheel": {
        const scrollAmount = config.scrollStep ?? 1
        const newScrollX = model.scrollX + (msg.deltaX * scrollAmount)
        const newScrollY = model.scrollY + (msg.deltaY * scrollAmount)
        return Effect.succeed(updateScroll(model, newScrollX, newScrollY, actualViewportWidth, actualViewportHeight))
      }
    }
  },
  
  view(model: ViewportModel): View {
    const { config } = model
    const actualViewportWidth = config.showScrollbars ? config.width - 1 : config.width
    const actualViewportHeight = config.showScrollbars ? config.height - 1 : config.height
    
    // Get visible content
    const visibleContent = getVisibleContent(
      model.content,
      model.scrollX,
      model.scrollY,
      actualViewportWidth,
      actualViewportHeight
    )
    
    // Pad content to fill viewport height
    while (visibleContent.length < actualViewportHeight) {
      visibleContent.push(' '.repeat(actualViewportWidth))
    }
    
    // Create content views
    const contentViews = visibleContent.map(line => 
      styledText(line, style())
    )
    
    if (!config.showScrollbars) {
      // Return content without scrollbars
      return vstack(...contentViews)
    }
    
    // Create scrollbars
    const verticalScrollbar = createVerticalScrollbar(
      model.scrollY,
      model.contentHeight,
      actualViewportHeight
    )
    
    const horizontalScrollbar = createHorizontalScrollbar(
      model.scrollX,
      model.contentWidth,
      actualViewportWidth
    )
    
    // Create scrollbar views
    const scrollbarViews = verticalScrollbar.map(char =>
      styledText(char, style(Colors.gray))
    )
    
    // Combine content with vertical scrollbar
    const contentWithVerticalScrollbar = contentViews.map((contentView, index) =>
      hstack(
        contentView,
        scrollbarViews[index] || styledText('│', style(Colors.gray))
      )
    )
    
    // Add horizontal scrollbar at bottom
    const horizontalScrollbarView = hstack(
      styledText(horizontalScrollbar, style(Colors.gray)),
      styledText('┘', style(Colors.gray))  // Corner piece
    )
    
    // Add focus indicator if focused
    const borderStyle = model.isFocused 
      ? style(Colors.brightBlue)
      : style(Colors.gray)
    
    const viewport = vstack(
      ...contentWithVerticalScrollbar,
      horizontalScrollbarView
    )
    
    return styledBox(viewport, { border: Borders.Rounded, style: borderStyle })
  }
})

// Handle keyboard input when focused
function handleViewportKey(key: KeyEvent, model: ViewportModel): ViewportMsg | null {
    if (!model.isFocused) {
      return null
    }
    
    switch (key.key) {
      case 'up':
      case 'k':
        return { _tag: "ScrollUp" }
      case 'down':
      case 'j':
        return { _tag: "ScrollDown" }
      case 'left':
      case 'h':
        return { _tag: "ScrollLeft" }
      case 'right':
      case 'l':
        return { _tag: "ScrollRight" }
      case 'pageup':
        return { _tag: "PageUp" }
      case 'pagedown':
        return { _tag: "PageDown" }
      case 'home':
        return { _tag: "ScrollToTop" }
      case 'end':
        return { _tag: "ScrollToBottom" }
      default:
        return null
    }
}

// =============================================================================
// Helper Functions for Creating Content
// =============================================================================

/**
 * Create text content from a string with line wrapping
 */
export const createTextContent = (
  text: string, 
  maxWidth?: number
): string[] => {
  const lines = text.split('\n')
  
  if (!maxWidth) {
    return lines
  }
  
  const wrappedLines: string[] = []
  
  for (const line of lines) {
    if (stringWidth(line) <= maxWidth) {
      wrappedLines.push(line)
    } else {
      // Wrap long lines
      let currentLine = ''
      const words = line.split(' ')
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        
        if (stringWidth(testLine) <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine)
            currentLine = word
          } else {
            // Word is longer than maxWidth, break it
            wrappedLines.push(word.substring(0, maxWidth))
            currentLine = word.substring(maxWidth)
          }
        }
      }
      
      if (currentLine) {
        wrappedLines.push(currentLine)
      }
    }
  }
  
  return wrappedLines
}

/**
 * Create grid content (useful for tables, logs, etc.)
 */
export const createGridContent = (
  data: string[][],
  columnWidths: number[],
  separator: string = ' | '
): string[] => {
  return data.map(row => {
    const paddedCells = row.map((cell, index) => {
      const width = columnWidths[index] || 10
      const cellWidth = stringWidth(cell)
      
      if (cellWidth >= width) {
        return cell.substring(0, width)
      } else {
        return cell + ' '.repeat(width - cellWidth)
      }
    })
    
    return paddedCells.join(separator)
  })
}

/**
 * Create numbered line content (useful for code/logs)
 */
export const createNumberedContent = (
  lines: string[],
  startNumber: number = 1,
  numberWidth: number = 4
): string[] => {
  return lines.map((line, index) => {
    const lineNumber = startNumber + index
    const paddedNumber = lineNumber.toString().padStart(numberWidth, ' ')
    return `${paddedNumber}: ${line}`
  })
}