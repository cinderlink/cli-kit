/**
 * Viewport Store
 * 
 * Manages state for scrollable viewport components including:
 * - Scroll position and bounds
 * - Content dimensions
 * - Visible area calculations
 * - Smooth scrolling behavior
 * 
 * This store is designed to be instantiated per Viewport component,
 * not as a global singleton.
 */

import { $state, $derived } from '@core/update/reactivity/runes'
import type { StateRune } from '@core/update/reactivity/runes'
import { stringWidth } from '@core/terminal/output/string/width'

export interface ViewportStoreOptions {
  width: number
  height: number
  contentWidth?: number
  contentHeight?: number
  scrollStep?: number
  pageSize?: number
  smoothScroll?: boolean
  wrapContent?: boolean
}

export interface ScrollPosition {
  x: number
  y: number
}

export interface ViewportDimensions {
  width: number
  height: number
  contentWidth: number
  contentHeight: number
}

export interface ViewportStore {
  // Core state
  scrollX: StateRune<number>
  scrollY: StateRune<number>
  contentLines: StateRune<string[]>
  dimensions: StateRune<ViewportDimensions>
  
  // UI state
  isFocused: StateRune<boolean>
  isScrolling: StateRune<boolean>
  showScrollbars: StateRune<boolean>
  
  // Derived state
  maxScrollX: { value: number }
  maxScrollY: { value: number }
  visibleLines: { value: string[] }
  scrollPercentageX: { value: number }
  scrollPercentageY: { value: number }
  hasHorizontalScroll: { value: boolean }
  hasVerticalScroll: { value: boolean }
  verticalThumbSize: { value: number }
  verticalThumbPosition: { value: number }
  horizontalThumbSize: { value: number }
  horizontalThumbPosition: { value: number }
  
  // Methods
  setContent: (lines: string[]) => void
  scrollTo: (x: number, y: number) => void
  scrollBy: (dx: number, dy: number) => void
  scrollUp: (amount?: number) => void
  scrollDown: (amount?: number) => void
  scrollLeft: (amount?: number) => void
  scrollRight: (amount?: number) => void
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollToLeft: () => void
  scrollToRight: () => void
  pageUp: () => void
  pageDown: () => void
  ensureVisible: (line: number, column?: number) => void
  updateDimensions: (width: number, height: number) => void
  focus: () => void
  blur: () => void
}

/**
 * Create a new Viewport store instance
 */
export function createViewportStore(options: ViewportStoreOptions): ViewportStore {
  const {
    width,
    height,
    contentWidth = 0,
    contentHeight = 0,
    scrollStep = 1,
    pageSize = Math.max(1, height - 2),
    smoothScroll = true,
    wrapContent = false
  } = options
  
  // Core state
  const scrollX = $state(0)
  const scrollY = $state(0)
  const contentLines = $state<string[]>([])
  const dimensions = $state<ViewportDimensions>({
    width,
    height,
    contentWidth,
    contentHeight
  })
  
  // UI state
  const isFocused = $state(false)
  const isScrolling = $state(false)
  const showScrollbars = $state(true)
  
  // Derived state
  const maxScrollX = $derived(() => {
    const viewportWidth = showScrollbars.value ? dimensions.value.width - 1 : dimensions.value.width
    return Math.max(0, dimensions.value.contentWidth - viewportWidth)
  })
  
  const maxScrollY = $derived(() => {
    const viewportHeight = showScrollbars.value ? dimensions.value.height - 1 : dimensions.value.height
    return Math.max(0, dimensions.value.contentHeight - viewportHeight)
  })
  
  const visibleLines = $derived(() => {
    const viewportWidth = showScrollbars.value ? dimensions.value.width - 1 : dimensions.value.width
    const viewportHeight = showScrollbars.value ? dimensions.value.height - 1 : dimensions.value.height
    
    // Get the visible portion of content
    const visibleContent = contentLines.value
      .slice(scrollY.value, scrollY.value + viewportHeight)
      .map(line => {
        if (wrapContent) {
          // Handle line wrapping
          return wrapLine(line, viewportWidth, scrollX.value)
        } else {
          // Simple horizontal scrolling
          const visiblePart = line.slice(scrollX.value, scrollX.value + viewportWidth)
          return visiblePart.padEnd(viewportWidth)
        }
      })
    
    // Pad with empty lines if needed
    while (visibleContent.length < viewportHeight) {
      visibleContent.push(' '.repeat(viewportWidth))
    }
    
    return visibleContent
  })
  
  const scrollPercentageX = $derived(() => {
    return maxScrollX.value > 0 ? (scrollX.value / maxScrollX.value) * 100 : 0
  })
  
  const scrollPercentageY = $derived(() => {
    return maxScrollY.value > 0 ? (scrollY.value / maxScrollY.value) * 100 : 0
  })
  
  const hasHorizontalScroll = $derived(() => {
    return maxScrollX.value > 0
  })
  
  const hasVerticalScroll = $derived(() => {
    return maxScrollY.value > 0
  })
  
  const verticalThumbSize = $derived(() => {
    if (!hasVerticalScroll.value) return 0
    const viewportHeight = showScrollbars.value ? dimensions.value.height - 1 : dimensions.value.height
    return Math.max(1, Math.floor((viewportHeight / dimensions.value.contentHeight) * viewportHeight))
  })
  
  const verticalThumbPosition = $derived(() => {
    if (!hasVerticalScroll.value) return 0
    const viewportHeight = showScrollbars.value ? dimensions.value.height - 1 : dimensions.value.height
    const availableSpace = viewportHeight - verticalThumbSize.value
    return Math.floor((scrollY.value / maxScrollY.value) * availableSpace)
  })
  
  const horizontalThumbSize = $derived(() => {
    if (!hasHorizontalScroll.value) return 0
    const viewportWidth = showScrollbars.value ? dimensions.value.width - 1 : dimensions.value.width
    return Math.max(1, Math.floor((viewportWidth / dimensions.value.contentWidth) * viewportWidth))
  })
  
  const horizontalThumbPosition = $derived(() => {
    if (!hasHorizontalScroll.value) return 0
    const viewportWidth = showScrollbars.value ? dimensions.value.width - 1 : dimensions.value.width
    const availableSpace = viewportWidth - horizontalThumbSize.value
    return Math.floor((scrollX.value / maxScrollX.value) * availableSpace)
  })
  
  // Helper function for line wrapping
  function wrapLine(line: string, width: number, offset: number): string {
    if (stringWidth(line) <= width) {
      return line.padEnd(width)
    }
    
    // Find the portion that fits
    let result = ''
    let currentWidth = 0
    let startIndex = 0
    
    // Skip to offset
    for (let i = 0; i < line.length && currentWidth < offset; i++) {
      currentWidth += stringWidth(line[i])
      startIndex = i + 1
    }
    
    // Build visible portion
    currentWidth = 0
    for (let i = startIndex; i < line.length && currentWidth < width; i++) {
      const charWidth = stringWidth(line[i])
      if (currentWidth + charWidth > width) break
      result += line[i]
      currentWidth += charWidth
    }
    
    return result.padEnd(width)
  }
  
  // Methods
  const setContent = (lines: string[]) => {
    contentLines.value = lines
    dimensions.value = {
      ...dimensions.value,
      contentHeight: lines.length,
      contentWidth: Math.max(...lines.map(line => stringWidth(line)), 0)
    }
    
    // Ensure scroll position is still valid
    scrollX.value = Math.max(0, Math.min(scrollX.value, maxScrollX.value))
    scrollY.value = Math.max(0, Math.min(scrollY.value, maxScrollY.value))
  }
  
  const scrollTo = (x: number, y: number) => {
    scrollX.value = Math.max(0, Math.min(x, maxScrollX.value))
    scrollY.value = Math.max(0, Math.min(y, maxScrollY.value))
    
    if (smoothScroll) {
      isScrolling.value = true
      setTimeout(() => {
        isScrolling.value = false
      }, 100)
    }
  }
  
  const scrollBy = (dx: number, dy: number) => {
    scrollTo(scrollX.value + dx, scrollY.value + dy)
  }
  
  const scrollUp = (amount = scrollStep) => {
    scrollBy(0, -amount)
  }
  
  const scrollDown = (amount = scrollStep) => {
    scrollBy(0, amount)
  }
  
  const scrollLeft = (amount = scrollStep) => {
    scrollBy(-amount, 0)
  }
  
  const scrollRight = (amount = scrollStep) => {
    scrollBy(amount, 0)
  }
  
  const scrollToTop = () => {
    scrollTo(scrollX.value, 0)
  }
  
  const scrollToBottom = () => {
    scrollTo(scrollX.value, maxScrollY.value)
  }
  
  const scrollToLeft = () => {
    scrollTo(0, scrollY.value)
  }
  
  const scrollToRight = () => {
    scrollTo(maxScrollX.value, scrollY.value)
  }
  
  const pageUp = () => {
    scrollUp(pageSize)
  }
  
  const pageDown = () => {
    scrollDown(pageSize)
  }
  
  const ensureVisible = (line: number, column = 0) => {
    const viewportHeight = showScrollbars.value ? dimensions.value.height - 1 : dimensions.value.height
    const viewportWidth = showScrollbars.value ? dimensions.value.width - 1 : dimensions.value.width
    
    // Ensure line is visible vertically
    if (line < scrollY.value) {
      scrollY.value = line
    } else if (line >= scrollY.value + viewportHeight) {
      scrollY.value = line - viewportHeight + 1
    }
    
    // Ensure column is visible horizontally
    if (column < scrollX.value) {
      scrollX.value = column
    } else if (column >= scrollX.value + viewportWidth) {
      scrollX.value = column - viewportWidth + 1
    }
  }
  
  const updateDimensions = (width: number, height: number) => {
    dimensions.value = {
      ...dimensions.value,
      width,
      height
    }
    
    // Ensure scroll position is still valid
    scrollX.value = Math.max(0, Math.min(scrollX.value, maxScrollX.value))
    scrollY.value = Math.max(0, Math.min(scrollY.value, maxScrollY.value))
  }
  
  const focus = () => {
    isFocused.value = true
  }
  
  const blur = () => {
    isFocused.value = false
  }
  
  return {
    // State
    scrollX,
    scrollY,
    contentLines,
    dimensions,
    isFocused,
    isScrolling,
    showScrollbars,
    
    // Derived
    maxScrollX,
    maxScrollY,
    visibleLines,
    scrollPercentageX,
    scrollPercentageY,
    hasHorizontalScroll,
    hasVerticalScroll,
    verticalThumbSize,
    verticalThumbPosition,
    horizontalThumbSize,
    horizontalThumbPosition,
    
    // Methods
    setContent,
    scrollTo,
    scrollBy,
    scrollUp,
    scrollDown,
    scrollLeft,
    scrollRight,
    scrollToTop,
    scrollToBottom,
    scrollToLeft,
    scrollToRight,
    pageUp,
    pageDown,
    ensureVisible,
    updateDimensions,
    focus,
    blur
  }
}

/**
 * Scroll behavior configurations
 */
export const scrollBehaviors = {
  instant: { smoothScroll: false },
  smooth: { smoothScroll: true },
  
  // Common configurations
  editor: {
    scrollStep: 1,
    pageSize: 20,
    smoothScroll: false,
    wrapContent: false
  },
  
  terminal: {
    scrollStep: 1,
    pageSize: 10,
    smoothScroll: true,
    wrapContent: false
  },
  
  document: {
    scrollStep: 3,
    pageSize: 20,
    smoothScroll: true,
    wrapContent: true
  }
}