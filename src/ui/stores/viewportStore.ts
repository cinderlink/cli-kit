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
  maxScrollX: () => number
  maxScrollY: () => number
  visibleLines: () => string[]
  scrollPercentageX: () => number
  scrollPercentageY: () => number
  hasHorizontalScroll: () => boolean
  hasVerticalScroll: () => boolean
  verticalThumbSize: () => number
  verticalThumbPosition: () => number
  horizontalThumbSize: () => number
  horizontalThumbPosition: () => number

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
    wrapContent = false,
  } = options

  // Core state
  const scrollX = $state(0)
  const scrollY = $state(0)
  const contentLines = $state<string[]>([])
  const dimensions = $state<ViewportDimensions>({
    width,
    height,
    contentWidth,
    contentHeight,
  })

  // UI state
  const isFocused = $state(false)
  const isScrolling = $state(false)
  const showScrollbars = $state(true)

  // Derived state
  const maxScrollX = $derived(() => {
    const viewportWidth = showScrollbars() ? dimensions().width - 1 : dimensions().width
    return Math.max(0, dimensions().contentWidth - viewportWidth)
  })

  const maxScrollY = $derived(() => {
    const viewportHeight = showScrollbars() ? dimensions().height - 1 : dimensions().height
    return Math.max(0, dimensions().contentHeight - viewportHeight)
  })

  const visibleLines = $derived(() => {
    const viewportWidth = showScrollbars() ? dimensions().width - 1 : dimensions().width
    const viewportHeight = showScrollbars() ? dimensions().height - 1 : dimensions().height

    // Get the visible portion of content
    const visibleContent = contentLines()
      .slice(scrollY(), scrollY() + viewportHeight)
      .map(line => {
        if (wrapContent) {
          // Handle line wrapping
          return wrapLine(line, viewportWidth, scrollX())
        } else {
          // Simple horizontal scrolling
          const visiblePart = line.slice(scrollX(), scrollX() + viewportWidth)
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
    return maxScrollX() > 0 ? (scrollX() / maxScrollX()) * 100 : 0
  })

  const scrollPercentageY = $derived(() => {
    return maxScrollY() > 0 ? (scrollY() / maxScrollY()) * 100 : 0
  })

  const hasHorizontalScroll = $derived(() => {
    return maxScrollX() > 0
  })

  const hasVerticalScroll = $derived(() => {
    return maxScrollY() > 0
  })

  const verticalThumbSize = $derived(() => {
    if (!hasVerticalScroll()) return 0
    const viewportHeight = showScrollbars() ? dimensions().height - 1 : dimensions().height
    return Math.max(1, Math.floor((viewportHeight / dimensions().contentHeight) * viewportHeight))
  })

  const verticalThumbPosition = $derived(() => {
    if (!hasVerticalScroll()) return 0
    const viewportHeight = showScrollbars() ? dimensions().height - 1 : dimensions().height
    const availableSpace = viewportHeight - verticalThumbSize()
    return Math.floor((scrollY() / maxScrollY()) * availableSpace)
  })

  const horizontalThumbSize = $derived(() => {
    if (!hasHorizontalScroll()) return 0
    const viewportWidth = showScrollbars() ? dimensions().width - 1 : dimensions().width
    return Math.max(1, Math.floor((viewportWidth / dimensions().contentWidth) * viewportWidth))
  })

  const horizontalThumbPosition = $derived(() => {
    if (!hasHorizontalScroll()) return 0
    const viewportWidth = showScrollbars() ? dimensions().width - 1 : dimensions().width
    const availableSpace = viewportWidth - horizontalThumbSize()
    return Math.floor((scrollX() / maxScrollX()) * availableSpace)
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
      const char = line[i]
      if (char) {
        currentWidth += stringWidth(char)
      }
      startIndex = i + 1
    }

    // Build visible portion
    currentWidth = 0
    for (let i = startIndex; i < line.length && currentWidth < width; i++) {
      const char = line[i]
      if (!char) continue
      const charWidth = stringWidth(char)
      if (currentWidth + charWidth > width) break
      result += char
      currentWidth += charWidth
    }

    return result.padEnd(width)
  }

  // Methods
  const setContent = (lines: string[]) => {
    contentLines.$set(lines)
    dimensions.$set({
      ...dimensions(),
      contentHeight: lines.length,
      contentWidth: Math.max(...lines.map(line => stringWidth(line)), 0),
    })

    // Ensure scroll position is still valid
    scrollX.$set(Math.max(0, Math.min(scrollX(), maxScrollX())))
    scrollY.$set(Math.max(0, Math.min(scrollY(), maxScrollY())))
  }

  const scrollTo = (x: number, y: number) => {
    scrollX.$set(Math.max(0, Math.min(x, maxScrollX())))
    scrollY.$set(Math.max(0, Math.min(y, maxScrollY())))

    if (smoothScroll) {
      isScrolling.$set(true)
      setTimeout(() => {
        isScrolling.$set(false)
      }, 100)
    }
  }

  const scrollBy = (dx: number, dy: number) => {
    scrollTo(scrollX() + dx, scrollY() + dy)
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
    scrollTo(scrollX(), 0)
  }

  const scrollToBottom = () => {
    scrollTo(scrollX(), maxScrollY())
  }

  const scrollToLeft = () => {
    scrollTo(0, scrollY())
  }

  const scrollToRight = () => {
    scrollTo(maxScrollX(), scrollY())
  }

  const pageUp = () => {
    scrollUp(pageSize)
  }

  const pageDown = () => {
    scrollDown(pageSize)
  }

  const ensureVisible = (line: number, column = 0) => {
    const viewportHeight = showScrollbars() ? dimensions().height - 1 : dimensions().height
    const viewportWidth = showScrollbars() ? dimensions().width - 1 : dimensions().width

    // Ensure line is visible vertically
    if (line < scrollY()) {
      scrollY.$set(line)
    } else if (line >= scrollY() + viewportHeight) {
      scrollY.$set(line - viewportHeight + 1)
    }

    // Ensure column is visible horizontally
    if (column < scrollX()) {
      scrollX.$set(column)
    } else if (column >= scrollX() + viewportWidth) {
      scrollX.$set(column - viewportWidth + 1)
    }
  }

  const updateDimensions = (width: number, height: number) => {
    dimensions.$set({
      ...dimensions(),
      width,
      height,
    })

    // Ensure scroll position is still valid
    scrollX.$set(Math.max(0, Math.min(scrollX(), maxScrollX())))
    scrollY.$set(Math.max(0, Math.min(scrollY(), maxScrollY())))
  }

  const focus = () => {
    isFocused.$set(true)
  }

  const blur = () => {
    isFocused.$set(false)
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
    blur,
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
    wrapContent: false,
  },

  terminal: {
    scrollStep: 1,
    pageSize: 10,
    smoothScroll: true,
    wrapContent: false,
  },

  document: {
    scrollStep: 3,
    pageSize: 20,
    smoothScroll: true,
    wrapContent: true,
  },
}
