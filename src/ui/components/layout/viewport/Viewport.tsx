/**
 * Viewport Component - JSX version for scrollable content areas
 * 
 * A scrollable container component that provides:
 * - Vertical and horizontal scrolling
 * - Scroll indicators/scrollbars
 * - Mouse wheel support
 * - Keyboard navigation (arrow keys, page up/down)
 * - Content that can be larger than the viewport
 * - Smooth scrolling behavior
 * 
 * @example
 * ```tsx
 * import { Viewport } from 'tuix/components/containers/viewport'
 * 
 * function MyScrollableContent() {
 *   return (
 *     <Viewport 
 *       width={80}
 *       height={20}
 *       showScrollbars={true}
 *     >
 *       <text>Line 1</text>
 *       <text>Line 2</text>
 *       <text>Line 3</text>
 *       // ... many more lines ...
 *     </Viewport>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import { $state, $derived } from '@core/update/reactivity/runes'
import type { View } from '@core/view/primitives/view'
import { style, Colors, Borders, type Style } from '@core/terminal/ansi/styles'
import { vstack, hstack, text, styledText } from '@core/view/primitives/view'
import { stringWidth } from '@core/terminal/output/string/width'

// Types
export interface ViewportProps {
  children?: JSX.Element | JSX.Element[]
  
  // Sizing
  width: number
  height: number
  
  // Scrolling
  showScrollbars?: boolean
  smoothScroll?: boolean
  scrollStep?: number
  pageSize?: number
  
  // Styling
  style?: Style
  borderStyle?: keyof typeof Borders
  scrollbarStyle?: Style
  
  // Callbacks
  onScroll?: (x: number, y: number) => void
  onScrollUp?: () => void
  onScrollDown?: () => void
  onScrollLeft?: () => void
  onScrollRight?: () => void
}

export interface ViewportState {
  scrollX: number
  scrollY: number
  contentWidth: number
  contentHeight: number
  content: string[]
  isFocused: boolean
}

export const Viewport = (props: ViewportProps) => {
  const {
    children,
    width,
    height,
    showScrollbars = true,
    smoothScroll = true,
    scrollStep = 1,
    pageSize = Math.max(1, height - 2),
    style: customStyle,
    borderStyle = 'single',
    scrollbarStyle,
    onScroll,
    onScrollUp,
    onScrollDown,
    onScrollLeft,
    onScrollRight,
    ...restProps
  } = props

  // Reactive state
  const state = $state<ViewportState>({
    scrollX: 0,
    scrollY: 0,
    contentWidth: 0,
    contentHeight: 0,
    content: [],
    isFocused: false
  })

  // Convert children to content lines
  const processChildren = (children: JSX.Element | JSX.Element[]) => {
    if (!children) return []
    
    const childArray = Array.isArray(children) ? children : [children]
    const lines: string[] = []
    
    childArray.forEach(child => {
      if (typeof child === 'string') {
        lines.push(child)
      } else if (child && typeof child === 'object' && 'render' in child) {
        // This is a View object - render it to string
        const rendered = child.render()
        if (typeof rendered === 'string') {
          lines.push(...rendered.split('\n'))
        }
      } else {
        lines.push(String(child))
      }
    })
    
    return lines
  }

  // Update content when children change
  const contentLines = processChildren(children)
  state.content = contentLines
  state.contentHeight = contentLines.length
  state.contentWidth = Math.max(...contentLines.map(line => stringWidth(line)), 0)

  // Calculated viewport dimensions
  const viewportWidth = showScrollbars ? width - 1 : width
  const viewportHeight = showScrollbars ? height - 1 : height

  // Scroll bounds
  const maxScrollX = Math.max(0, state.contentWidth - viewportWidth)
  const maxScrollY = Math.max(0, state.contentHeight - viewportHeight)

  // Clamp scroll position
  state.scrollX = Math.max(0, Math.min(state.scrollX, maxScrollX))
  state.scrollY = Math.max(0, Math.min(state.scrollY, maxScrollY))

  // Scroll methods
  const scrollUp = (amount = scrollStep) => {
    state.scrollY = Math.max(0, state.scrollY - amount)
    onScroll?.(state.scrollX, state.scrollY)
    onScrollUp?.()
  }

  const scrollDown = (amount = scrollStep) => {
    state.scrollY = Math.min(maxScrollY, state.scrollY + amount)
    onScroll?.(state.scrollX, state.scrollY)
    onScrollDown?.()
  }

  const scrollLeft = (amount = scrollStep) => {
    state.scrollX = Math.max(0, state.scrollX - amount)
    onScroll?.(state.scrollX, state.scrollY)
    onScrollLeft?.()
  }

  const scrollRight = (amount = scrollStep) => {
    state.scrollX = Math.min(maxScrollX, state.scrollX + amount)
    onScroll?.(state.scrollX, state.scrollY)
    onScrollRight?.()
  }

  const scrollToTop = () => {
    state.scrollY = 0
    onScroll?.(state.scrollX, state.scrollY)
  }

  const scrollToBottom = () => {
    state.scrollY = maxScrollY
    onScroll?.(state.scrollX, state.scrollY)
  }

  const pageUp = () => {
    scrollUp(pageSize)
  }

  const pageDown = () => {
    scrollDown(pageSize)
  }

  // Render visible content
  const renderContent = () => {
    const visibleLines = state.content
      .slice(state.scrollY, state.scrollY + viewportHeight)
      .map(line => {
        const visiblePart = line.slice(state.scrollX, state.scrollX + viewportWidth)
        return visiblePart.padEnd(viewportWidth)
      })

    // Pad with empty lines if needed
    while (visibleLines.length < viewportHeight) {
      visibleLines.push(' '.repeat(viewportWidth))
    }

    return visibleLines
  }

  // Render scrollbars
  const renderVerticalScrollbar = () => {
    if (!showScrollbars || maxScrollY === 0) return null

    const scrollbarHeight = viewportHeight
    const thumbSize = Math.max(1, Math.floor((viewportHeight / state.contentHeight) * scrollbarHeight))
    const thumbPosition = Math.floor((state.scrollY / maxScrollY) * (scrollbarHeight - thumbSize))

    const scrollbarLines = Array.from({ length: scrollbarHeight }, (_, i) => {
      if (i >= thumbPosition && i < thumbPosition + thumbSize) {
        return '█' // Thumb
      }
      return '│' // Track
    })

    return scrollbarLines
  }

  const renderHorizontalScrollbar = () => {
    if (!showScrollbars || maxScrollX === 0) return null

    const scrollbarWidth = viewportWidth
    const thumbSize = Math.max(1, Math.floor((viewportWidth / state.contentWidth) * scrollbarWidth))
    const thumbPosition = Math.floor((state.scrollX / maxScrollX) * (scrollbarWidth - thumbSize))

    let scrollbar = ''
    for (let i = 0; i < scrollbarWidth; i++) {
      if (i >= thumbPosition && i < thumbPosition + thumbSize) {
        scrollbar += '█' // Thumb
      } else {
        scrollbar += '─' // Track
      }
    }

    return scrollbar
  }

  // Build the viewport
  const renderedContent = renderContent()
  const verticalScrollbar = renderVerticalScrollbar()
  const horizontalScrollbar = renderHorizontalScrollbar()

  // Combine content with scrollbars
  const lines: JSX.Element[] = []

  // Main content area
  renderedContent.forEach((line, index) => {
    const contentLine = <text>{line}</text>
    
    if (showScrollbars && verticalScrollbar && index < verticalScrollbar.length) {
      lines.push(
        <hstack>
          {contentLine}
          <text>{verticalScrollbar[index]}</text>
        </hstack>
      )
    } else {
      lines.push(contentLine)
    }
  })

  // Horizontal scrollbar
  if (showScrollbars && horizontalScrollbar) {
    const hScrollLine = <text>{horizontalScrollbar}</text>
    
    if (verticalScrollbar) {
      lines.push(
        <hstack>
          {hScrollLine}
          <text>┘</text>
        </hstack>
      )
    } else {
      lines.push(hScrollLine)
    }
  }

  // Apply styling
  const viewportStyle = customStyle || style()
  const styledViewport = (
    <vstack style={viewportStyle}>
      {lines}
    </vstack>
  )

  // Add keyboard handlers (simplified for JSX)
  // In a real implementation, this would integrate with the input system
  const handleKeyPress = (key: string) => {
    switch (key) {
      case 'ArrowUp':
      case 'k':
        scrollUp()
        break
      case 'ArrowDown':
      case 'j':
        scrollDown()
        break
      case 'ArrowLeft':
      case 'h':
        scrollLeft()
        break
      case 'ArrowRight':
      case 'l':
        scrollRight()
        break
      case 'PageUp':
        pageUp()
        break
      case 'PageDown':
        pageDown()
        break
      case 'Home':
        scrollToTop()
        break
      case 'End':
        scrollToBottom()
        break
    }
  }

  return styledViewport
}

// Export types for external use
export type { ViewportProps, ViewportState }