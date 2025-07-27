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
import { $effect } from '@core/update/reactivity/runes'
import type { View } from '@core/view/primitives/view'
import { style, Colors, Borders, type Style } from '@core/terminal/ansi/styles'
import { vstack, hstack, text, styledText } from '@core/view/primitives/view'
import { createViewportStore, type ViewportStore } from '@ui/stores/viewportStore'

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

// ViewportState type is now managed by the store

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

  // Create viewport store
  const store = createViewportStore({
    width,
    height,
    scrollStep,
    pageSize,
    smoothScroll,
    wrapContent: false
  })
  
  // Update store settings for scrollbars
  store.showScrollbars.value = showScrollbars

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
  $effect(() => {
    const contentLines = processChildren(children)
    store.setContent(contentLines)
  })
  
  // Handle dimension changes
  $effect(() => {
    store.updateDimensions(width, height)
  })

  // Hook up scroll callbacks
  $effect(() => {
    // When scroll position changes, call callbacks
    if (onScroll) {
      onScroll(store.scrollX.value, store.scrollY.value)
    }
  })
  
  // Scroll method wrappers that include callbacks
  const scrollUp = (amount?: number) => {
    store.scrollUp(amount)
    onScrollUp?.()
  }

  const scrollDown = (amount?: number) => {
    store.scrollDown(amount)
    onScrollDown?.()
  }

  const scrollLeft = (amount?: number) => {
    store.scrollLeft(amount)
    onScrollLeft?.()
  }

  const scrollRight = (amount?: number) => {
    store.scrollRight(amount)
    onScrollRight?.()
  }

  // Get visible content from store
  const visibleLines = store.visibleLines.value

  // Render scrollbars
  const renderVerticalScrollbar = () => {
    if (!showScrollbars || !store.hasVerticalScroll.value) return null

    const viewportHeight = showScrollbars ? height - 1 : height
    const thumbSize = store.verticalThumbSize.value
    const thumbPosition = store.verticalThumbPosition.value

    const scrollbarLines = Array.from({ length: viewportHeight }, (_, i) => {
      if (i >= thumbPosition && i < thumbPosition + thumbSize) {
        return '█' // Thumb
      }
      return '│' // Track
    })

    return scrollbarLines
  }

  const renderHorizontalScrollbar = () => {
    if (!showScrollbars || !store.hasHorizontalScroll.value) return null

    const viewportWidth = showScrollbars ? width - 1 : width
    const thumbSize = store.horizontalThumbSize.value
    const thumbPosition = store.horizontalThumbPosition.value

    let scrollbar = ''
    for (let i = 0; i < viewportWidth; i++) {
      if (i >= thumbPosition && i < thumbPosition + thumbSize) {
        scrollbar += '█' // Thumb
      } else {
        scrollbar += '─' // Track
      }
    }

    return scrollbar
  }

  // Build the viewport
  const verticalScrollbar = renderVerticalScrollbar()
  const horizontalScrollbar = renderHorizontalScrollbar()

  // Combine content with scrollbars
  const lines: JSX.Element[] = []

  // Main content area
  visibleLines.forEach((line, index) => {
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
        store.pageUp()
        break
      case 'PageDown':
        store.pageDown()
        break
      case 'Home':
        store.scrollToTop()
        break
      case 'End':
        store.scrollToBottom()
        break
    }
  }

  return styledViewport
}

// Export types for external use
export type { ViewportProps }