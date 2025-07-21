/**
 * Flexbox Layout - Flexible box layout container
 * 
 * Implements a CSS flexbox-inspired layout system for TUI applications.
 * Supports:
 * - Row and column layouts
 * - Justify content (main axis alignment)
 * - Align items (cross axis alignment)
 * - Flex grow/shrink/basis
 * - Gap between items
 * - Wrapping
 */

import { Effect } from "effect"
import { stringWidth } from "../../../utils/string-width"
import type { View } from "../../types"
import {
  type FlexboxProps,
  type FlexItem,
  type LayoutRect,
  type LayoutResult,
  FlexDirection,
  JustifyContent,
  AlignItems,
  FlexWrap
} from "./types"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if direction is row-based (horizontal)
 */
const isRowDirection = (direction: FlexDirection): boolean =>
  direction === FlexDirection.Row || direction === FlexDirection.RowReverse

/**
 * Check if direction is reversed
 */
const isReverseDirection = (direction: FlexDirection): boolean =>
  direction === FlexDirection.RowReverse || direction === FlexDirection.ColumnReverse

/**
 * Get main axis dimension based on direction
 */
const getMainAxisDimension = (direction: FlexDirection, width: number, height: number): number =>
  isRowDirection(direction) ? width : height

/**
 * Get cross axis dimension based on direction
 */
const getCrossAxisDimension = (direction: FlexDirection, width: number, height: number): number =>
  isRowDirection(direction) ? height : width

/**
 * Get the size of a view
 */
const getViewSize = (view: View): { width: number; height: number } => {
  return {
    width: view.width || 0,
    height: view.height || 1
  }
}

/**
 * Calculate the main axis size for a flex item
 */
const getMainAxisSize = (
  item: { view: View },
  direction: FlexDirection
): number => {
  const size = getViewSize(item.view)
  return getMainAxisDimension(direction, size.width, size.height)
}

/**
 * Calculate the cross axis size for a flex item
 */
const getCrossAxisSize = (
  item: { view: View },
  direction: FlexDirection
): number => {
  const size = getViewSize(item.view)
  return getCrossAxisDimension(direction, size.width, size.height)
}

/**
 * Create bounds based on direction and dimensions
 */
const createBounds = (
  direction: FlexDirection,
  mainPos: number,
  crossPos: number,
  mainSize: number,
  crossSize: number
): LayoutRect => {
  return isRowDirection(direction)
    ? {
        x: mainPos,
        y: crossPos,
        width: mainSize,
        height: crossSize
      }
    : {
        x: crossPos,
        y: mainPos,
        width: crossSize,
        height: mainSize
      }
}

/**
 * Calculate flex basis for an item
 */
const calculateFlexBasis = (
  item: FlexItem,
  direction: FlexDirection
): number => {
  if (item.basis === "auto" || item.basis === undefined) {
    return getMainAxisSize(item, direction)
  }
  return item.basis
}

/**
 * Calculate initial position based on justify content and free space
 */
const calculateInitialPosition = (
  justifyContent: JustifyContent,
  freeSpace: number,
  itemCount: number
): number => {
  switch (justifyContent) {
    case JustifyContent.Center:
      return freeSpace / 2
    case JustifyContent.End:
      return freeSpace
    case JustifyContent.SpaceAround:
      return freeSpace / (itemCount * 2)
    case JustifyContent.SpaceEvenly:
      return freeSpace / (itemCount + 1)
    default:
      return 0
  }
}

/**
 * Calculate gap between items for justify content
 */
const calculateJustifyGap = (
  justifyContent: JustifyContent,
  freeSpace: number,
  itemCount: number
): number => {
  if (itemCount <= 1) return 0
  
  switch (justifyContent) {
    case JustifyContent.SpaceBetween:
      return freeSpace / (itemCount - 1)
    case JustifyContent.SpaceAround:
      return freeSpace / itemCount
    case JustifyContent.SpaceEvenly:
      return freeSpace / (itemCount + 1)
    default:
      return 0
  }
}

/**
 * Calculate total gap size
 */
const calculateTotalGap = (
  itemCount: number,
  gap: number,
  direction: FlexDirection,
  props: FlexboxProps
): number => {
  if (itemCount <= 1) return 0
  
  const effectiveGap = isRowDirection(direction)
    ? props.columnGap ?? gap
    : props.rowGap ?? gap
    
  return (itemCount - 1) * effectiveGap
}

// =============================================================================
// Layout Calculation
// =============================================================================

/**
 * Calculate flexbox layout
 */
const calculateFlexLayout = (
  items: ReadonlyArray<FlexItem>,
  containerWidth: number,
  containerHeight: number,
  props: FlexboxProps
): LayoutResult => {
  const direction = props.direction ?? FlexDirection.Row
  const justifyContent = props.justifyContent ?? JustifyContent.Start
  const alignItems = props.alignItems ?? AlignItems.Start
  const wrap = props.wrap ?? FlexWrap.NoWrap
  const gap = props.gap ?? 0
  const padding = props.padding ?? {}
  
  // Apply padding to container dimensions
  const availableWidth = containerWidth - (padding.left ?? 0) - (padding.right ?? 0)
  const availableHeight = containerHeight - (padding.top ?? 0) - (padding.bottom ?? 0)
  
  // Determine main and cross axis sizes
  const mainAxisSize = getMainAxisDimension(direction, availableWidth, availableHeight)
  const crossAxisSize = getCrossAxisDimension(direction, availableWidth, availableHeight)
  
  // Calculate flex basis for each item
  const flexBases = items.map(item => calculateFlexBasis(item, direction))
  
  // Calculate total flex grow and shrink
  const totalFlexGrow = items.reduce((sum, item) => sum + (item.grow ?? 0), 0)
  const totalFlexShrink = items.reduce((sum, item) => sum + (item.shrink ?? 1), 0)
  
  // Calculate total gap
  const totalGap = calculateTotalGap(items.length, gap, direction, props)
  
  // Calculate total basis size
  const totalBasisSize = flexBases.reduce((sum, basis) => sum + basis, 0) + totalGap
  
  // Calculate remaining space
  const remainingSpace = mainAxisSize - totalBasisSize
  
  // Distribute space based on flex properties
  const finalSizes = items.map((item, index) => {
    const basis = flexBases[index] ?? 0
    let size = basis
    
    if (remainingSpace > 0 && totalFlexGrow > 0) {
      // Distribute positive space based on flex-grow
      const grow = item.grow ?? 0
      size += (remainingSpace * grow) / totalFlexGrow
    } else if (remainingSpace < 0 && totalFlexShrink > 0) {
      // Distribute negative space based on flex-shrink
      const shrink = item.shrink ?? 1
      size += (remainingSpace * shrink) / totalFlexShrink
    }
    
    return Math.max(0, Math.floor(size))
  })
  
  // Calculate positions based on justify content
  const positions: number[] = []
  
  // Initialize position based on direction and padding
  let currentPos = isRowDirection(direction) 
    ? (padding.left ?? 0) 
    : (padding.top ?? 0)
  
  // Calculate free space and initial position
  const totalItemSize = finalSizes.reduce((sum, size) => sum + size, 0) + totalGap
  const freeSpace = mainAxisSize - totalItemSize
  
  // Apply initial position based on justify content
  currentPos += calculateInitialPosition(justifyContent, freeSpace, items.length)
  
  // Calculate positions for each item
  const justifyGap = calculateJustifyGap(justifyContent, freeSpace, items.length)
  
  items.forEach((_, index) => {
    positions.push(currentPos)
    currentPos += finalSizes[index] ?? 0
    
    // Add gap between items
    if (index < items.length - 1) {
      currentPos += gap + justifyGap
    }
  })
  
  // Calculate cross axis positions based on align items
  const crossPositions = items.map((item, index) => {
    const itemCrossSize = getCrossAxisSize(item, direction)
    const alignSelf = item.alignSelf ?? alignItems
    
    switch (alignSelf) {
      case AlignItems.Center:
        return (crossAxisSize - itemCrossSize) / 2
      case AlignItems.End:
        return crossAxisSize - itemCrossSize
      case AlignItems.Stretch:
        // Stretch doesn't change position, just size
        return 0
      default:
        return 0
    }
  })
  
  // Create layout result
  const children = items.map((item, index) => {
    const mainPos = positions[index] ?? 0
    const crossPos = (crossPositions[index] ?? 0) + 
      (isRowDirection(direction) ? (padding.top ?? 0) : (padding.left ?? 0))
    const mainSize = finalSizes[index] ?? 0
    const crossSize = item.alignSelf === AlignItems.Stretch || alignItems === AlignItems.Stretch
      ? crossAxisSize
      : getCrossAxisSize(item, direction)
    
    const bounds: LayoutRect = createBounds(
      direction,
      mainPos,
      crossPos,
      mainSize,
      crossSize
    )
    
    return { view: item.view, bounds }
  })
  
  return {
    bounds: {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight
    },
    children
  }
}

// =============================================================================
// Flexbox View Creation
// =============================================================================

/**
 * Create a flexbox container view
 */
/**
 * Calculate total dimensions for flexbox container
 */
const calculateContainerDimensions = (
  flexItems: FlexItem[],
  props: FlexboxProps
): { width: number; height: number } => {
  const padding = props.padding ?? {}
  const paddingH = (padding.left ?? 0) + (padding.right ?? 0)
  const paddingV = (padding.top ?? 0) + (padding.bottom ?? 0)
  const direction = props.direction ?? FlexDirection.Row
  const gap = props.gap ?? 0
  
  if (isRowDirection(direction)) {
    // Row layout
    const contentWidth = flexItems.reduce((sum, item) => sum + getViewSize(item.view).width, 0)
    const totalGap = calculateTotalGap(flexItems.length, gap, direction, props)
    const contentHeight = Math.max(...flexItems.map(item => getViewSize(item.view).height), 0)
    
    return {
      width: paddingH + contentWidth + totalGap,
      height: paddingV + contentHeight
    }
  } else {
    // Column layout  
    const contentHeight = flexItems.reduce((sum, item) => sum + getViewSize(item.view).height, 0)
    const totalGap = calculateTotalGap(flexItems.length, gap, direction, props)
    const contentWidth = Math.max(...flexItems.map(item => getViewSize(item.view).width), 0)
    
    return {
      width: paddingH + contentWidth,
      height: paddingV + contentHeight + totalGap
    }
  }
}

/**
 * Render child view into 2D buffer
 */
const renderChildToBuffer = (
  buffer: string[][],
  content: string,
  bounds: LayoutRect,
  bufferWidth: number,
  bufferHeight: number
): void => {
  const lines = content.split('\n')
  
  for (let y = 0; y < lines.length && y < bounds.height; y++) {
    const line = lines[y] ?? ''
    const chars = [...line]
    
    for (let x = 0; x < chars.length && x < bounds.width; x++) {
      const bufferY = bounds.y + y
      const bufferX = bounds.x + x
      
      if (bufferY >= 0 && bufferY < bufferHeight && 
          bufferX >= 0 && bufferX < bufferWidth &&
          buffer[bufferY] && chars[x]) {
        buffer[bufferY][bufferX] = chars[x]
      }
    }
  }
}

export const flexbox = (
  items: ReadonlyArray<FlexItem | View>,
  props: FlexboxProps = {}
): View => {
  // Normalize items to FlexItem
  const flexItems = items.map(item => 
    'view' in item ? item : { view: item }
  )
  
  // Calculate container dimensions
  const { width: totalWidth, height: totalHeight } = calculateContainerDimensions(flexItems, props)
  
  return {
    render: () => Effect.gen(function* (_) {
      const layout = calculateFlexLayout(flexItems, totalWidth, totalHeight, props)
      
      // Create a 2D buffer for rendering
      const buffer: string[][] = Array(totalHeight).fill(null).map(() => 
        Array(totalWidth).fill(' ')
      )
      
      // Render each child into the buffer
      for (const child of layout.children) {
        const content = yield* _(child.view.render())
        renderChildToBuffer(buffer, content, child.bounds, totalWidth, totalHeight)
      }
      
      // Convert buffer to string
      return buffer.map(row => row.join('')).join('\n')
    }),
    width: totalWidth,
    height: totalHeight
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a horizontal flexbox (row)
 */
export const hbox = (
  items: ReadonlyArray<FlexItem | View>,
  props: Omit<FlexboxProps, 'direction'> = {}
): View => {
  return flexbox(items, { ...props, direction: FlexDirection.Row })
}

/**
 * Create a vertical flexbox (column)
 */
export const vbox = (
  items: ReadonlyArray<FlexItem | View>,
  props: Omit<FlexboxProps, 'direction'> = {}
): View => {
  return flexbox(items, { ...props, direction: FlexDirection.Column })
}

/**
 * Center a view both horizontally and vertically
 */
export const center = (view: View, options?: { width?: number; height?: number }): View => {
  const width = options?.width || 80
  const height = options?.height || 24
  
  return {
    render: () => Effect.gen(function* (_) {
      const content = yield* _(view.render())
      const lines = content.split('\n')
      const contentHeight = lines.length
      const contentWidth = Math.max(...lines.map(line => stringWidth(line)), 0)
      
      // Calculate centering offsets
      const topPadding = Math.max(0, Math.floor((height - contentHeight) / 2))
      const leftPadding = Math.max(0, Math.floor((width - contentWidth) / 2))
      
      // Create centered content
      const centeredLines: string[] = []
      
      // Add top padding
      for (let i = 0; i < topPadding; i++) {
        centeredLines.push(' '.repeat(width))
      }
      
      // Add content with horizontal centering
      for (const line of lines) {
        const lineWidth = stringWidth(line)
        const linePadding = Math.max(0, Math.floor((width - lineWidth) / 2))
        const paddedLine = ' '.repeat(linePadding) + line
        centeredLines.push(paddedLine.padEnd(width))
      }
      
      // Add bottom padding to reach target height
      while (centeredLines.length < height) {
        centeredLines.push(' '.repeat(width))
      }
      
      return centeredLines.slice(0, height).join('\n')
    }),
    width,
    height
  }
}

/**
 * Create a flexbox with items spaced evenly
 */
export const spread = (
  items: ReadonlyArray<FlexItem | View>,
  props: Omit<FlexboxProps, 'justifyContent'> = {}
): View => {
  return flexbox(items, { 
    ...props, 
    justifyContent: JustifyContent.SpaceBetween 
  })
}