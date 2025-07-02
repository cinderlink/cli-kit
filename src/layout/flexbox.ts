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
import { stringWidth } from "@/utils/string-width.ts"
import type { View } from "@/core/types.ts"
import {
  type FlexboxProps,
  type FlexItem,
  type LayoutRect,
  type LayoutResult,
  FlexDirection,
  JustifyContent,
  AlignItems,
  FlexWrap
} from "./types.ts"

// =============================================================================
// Helper Functions
// =============================================================================

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
  return direction === FlexDirection.Row || direction === FlexDirection.RowReverse
    ? size.width
    : size.height
}

/**
 * Calculate the cross axis size for a flex item
 */
const getCrossAxisSize = (
  item: { view: View },
  direction: FlexDirection
): number => {
  const size = getViewSize(item.view)
  return direction === FlexDirection.Row || direction === FlexDirection.RowReverse
    ? size.height
    : size.width
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
 * Calculate total gap size
 */
const calculateTotalGap = (
  itemCount: number,
  gap: number,
  direction: FlexDirection,
  props: FlexboxProps
): number => {
  if (itemCount <= 1) return 0
  
  const effectiveGap = direction === FlexDirection.Row || direction === FlexDirection.RowReverse
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
  const isRow = direction === FlexDirection.Row || direction === FlexDirection.RowReverse
  const mainAxisSize = isRow ? availableWidth : availableHeight
  const crossAxisSize = isRow ? availableHeight : availableWidth
  
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
    const basis = flexBases[index]
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
  let currentPos = padding.top ?? 0
  
  if (isRow) {
    currentPos = padding.left ?? 0
  }
  
  // Handle justify content
  const totalItemSize = finalSizes.reduce((sum, size) => sum + size, 0) + totalGap
  const freeSpace = mainAxisSize - totalItemSize
  
  switch (justifyContent) {
    case JustifyContent.Center:
      currentPos += freeSpace / 2
      break
    case JustifyContent.End:
      currentPos += freeSpace
      break
    case JustifyContent.SpaceAround:
      currentPos += freeSpace / (items.length * 2)
      break
    case JustifyContent.SpaceEvenly:
      currentPos += freeSpace / (items.length + 1)
      break
  }
  
  // Calculate positions for each item
  items.forEach((_, index) => {
    positions.push(currentPos)
    currentPos += finalSizes[index]
    
    // Add gap
    if (index < items.length - 1) {
      currentPos += gap
      
      // Add extra space for justify content
      switch (justifyContent) {
        case JustifyContent.SpaceBetween:
          if (items.length > 1) {
            currentPos += freeSpace / (items.length - 1)
          }
          break
        case JustifyContent.SpaceAround:
          currentPos += freeSpace / items.length
          break
        case JustifyContent.SpaceEvenly:
          currentPos += freeSpace / (items.length + 1)
          break
      }
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
    const mainPos = positions[index]
    const crossPos = crossPositions[index] + (isRow ? (padding.top ?? 0) : (padding.left ?? 0))
    const mainSize = finalSizes[index]
    const crossSize = item.alignSelf === AlignItems.Stretch || alignItems === AlignItems.Stretch
      ? crossAxisSize
      : getCrossAxisSize(item, direction)
    
    const bounds: LayoutRect = isRow
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
export const flexbox = (
  items: ReadonlyArray<FlexItem | View>,
  props: FlexboxProps = {}
): View => {
  // Normalize items to FlexItem
  const flexItems = items.map(item => 
    'view' in item ? item : { view: item }
  )
  
  // Calculate dimensions
  const padding = props.padding ?? {}
  const paddingH = (padding.left ?? 0) + (padding.right ?? 0)
  const paddingV = (padding.top ?? 0) + (padding.bottom ?? 0)
  
  // For now, use a simple size calculation
  // In a real implementation, this would be more sophisticated
  const isRow = props.direction === FlexDirection.Row || props.direction === FlexDirection.RowReverse
  
  let totalWidth = paddingH
  let totalHeight = paddingV
  
  if (isRow) {
    // Row layout
    totalWidth += flexItems.reduce((sum, item) => sum + getViewSize(item.view).width, 0)
    totalWidth += calculateTotalGap(flexItems.length, props.gap ?? 0, props.direction ?? FlexDirection.Row, props)
    totalHeight += Math.max(...flexItems.map(item => getViewSize(item.view).height))
  } else {
    // Column layout
    totalHeight += flexItems.reduce((sum, item) => sum + getViewSize(item.view).height, 0)
    totalHeight += calculateTotalGap(flexItems.length, props.gap ?? 0, props.direction ?? FlexDirection.Column, props)
    totalWidth += Math.max(...flexItems.map(item => getViewSize(item.view).width))
  }
  
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
        const lines = content.split('\n')
        
        for (let y = 0; y < lines.length && y < child.bounds.height; y++) {
          const line = lines[y]
          const chars = [...line]
          
          for (let x = 0; x < chars.length && x < child.bounds.width; x++) {
            const bufferY = child.bounds.y + y
            const bufferX = child.bounds.x + x
            
            if (bufferY >= 0 && bufferY < totalHeight && 
                bufferX >= 0 && bufferX < totalWidth) {
              buffer[bufferY][bufferX] = chars[x]
            }
          }
        }
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
  return flexbox([view], {
    justifyContent: JustifyContent.Center,
    alignItems: AlignItems.Center,
    minWidth: options?.width || 80,
    minHeight: options?.height || 24
  })
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