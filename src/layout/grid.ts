/**
 * Grid Layout - CSS Grid-inspired layout system
 * 
 * Implements a powerful grid layout system for TUI applications:
 * - Fixed and fractional column/row sizing
 * - Item placement and spanning
 * - Gap between cells
 * - Alignment control
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import {
  type GridProps,
  type GridItem,
  type GridTemplate,
  type GridTrack,
  type GridPlacement,
  type LayoutRect,
  type LayoutResult,
  JustifyContent,
  AlignItems
} from "./types.ts"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse grid track size to pixels
 */
const parseTrackSize = (
  track: GridTrack,
  availableSize: number,
  totalFractions: number,
  fractionSize: number
): number => {
  switch (track.type) {
    case "fixed":
      return track.size
    case "fraction":
      return Math.floor(track.fraction * fractionSize)
    case "auto":
      // Auto sizing would need content measurement
      // For now, treat as 1fr
      return fractionSize
    case "min-content":
    case "max-content":
      // Content-based sizing would need measurement
      // For now, use a default
      return 10
  }
}

/**
 * Calculate track sizes for a grid axis
 */
const calculateTrackSizes = (
  tracks: ReadonlyArray<GridTrack>,
  availableSize: number,
  gap: number
): number[] => {
  const totalGap = Math.max(0, (tracks.length - 1) * gap)
  const availableForTracks = availableSize - totalGap
  
  // Calculate fixed sizes and total fractions
  let fixedSize = 0
  let totalFractions = 0
  
  tracks.forEach(track => {
    if (track.type === "fixed") {
      fixedSize += track.size
    } else if (track.type === "fraction") {
      totalFractions += track.fraction
    } else if (track.type === "auto") {
      totalFractions += 1 // Treat auto as 1fr
    }
  })
  
  // Calculate fraction unit size
  const remainingSize = Math.max(0, availableForTracks - fixedSize)
  const fractionSize = totalFractions > 0 ? remainingSize / totalFractions : 0
  
  // Calculate final track sizes
  return tracks.map(track => 
    parseTrackSize(track, availableSize, totalFractions, fractionSize)
  )
}

/**
 * Calculate track positions (including gaps)
 */
const calculateTrackPositions = (
  sizes: number[],
  gap: number
): number[] => {
  const positions: number[] = []
  let currentPos = 0
  
  sizes.forEach((size, index) => {
    positions.push(currentPos)
    currentPos += size
    if (index < sizes.length - 1) {
      currentPos += gap
    }
  })
  
  return positions
}

/**
 * Get cell bounds from placement
 */
const getCellBounds = (
  placement: GridPlacement | undefined,
  itemIndex: number,
  columnCount: number
): { colStart: number; colEnd: number; rowStart: number; rowEnd: number } => {
  if (!placement) {
    // Auto placement - simple left-to-right, top-to-bottom
    const row = Math.floor(itemIndex / columnCount)
    const col = itemIndex % columnCount
    return {
      colStart: col,
      colEnd: col + 1,
      rowStart: row,
      rowEnd: row + 1
    }
  }
  
  // Handle explicit placement
  let colStart = 0
  let colEnd = 1
  let rowStart = 0
  let rowEnd = 1
  
  if (placement.column !== undefined) {
    if (typeof placement.column === "number") {
      colStart = placement.column
      colEnd = colStart + (placement.columnSpan ?? 1)
    } else {
      colStart = placement.column.start
      colEnd = placement.column.end
    }
  }
  
  if (placement.row !== undefined) {
    if (typeof placement.row === "number") {
      rowStart = placement.row
      rowEnd = rowStart + (placement.rowSpan ?? 1)
    } else {
      rowStart = placement.row.start
      rowEnd = placement.row.end
    }
  }
  
  return { colStart, colEnd, rowStart, rowEnd }
}

// =============================================================================
// Grid Layout Calculation
// =============================================================================

/**
 * Calculate grid layout
 */
const calculateGridLayout = (
  items: ReadonlyArray<GridItem>,
  containerWidth: number,
  containerHeight: number,
  props: GridProps
): LayoutResult => {
  const template = props.template ?? {
    columns: [{ type: "fraction", fraction: 1 }],
    rows: [{ type: "auto" }]
  }
  const gap = props.gap ?? 0
  const columnGap = props.columnGap ?? gap
  const rowGap = props.rowGap ?? gap
  const padding = props.padding ?? {}
  
  // Apply padding
  const availableWidth = containerWidth - (padding.left ?? 0) - (padding.right ?? 0)
  const availableHeight = containerHeight - (padding.top ?? 0) - (padding.bottom ?? 0)
  
  // Calculate column sizes and positions
  const columnSizes = calculateTrackSizes(template.columns, availableWidth, columnGap)
  const columnPositions = calculateTrackPositions(columnSizes, columnGap)
  
  // For rows, we need to handle auto sizing
  // For simplicity, we'll use fixed row sizing for now
  const rowCount = Math.ceil(items.length / template.columns.length)
  const rows = Array(rowCount).fill({ type: "fixed", size: 3 } as GridTrack)
  
  const rowSizes = calculateTrackSizes(rows, availableHeight, rowGap)
  const rowPositions = calculateTrackPositions(rowSizes, rowGap)
  
  // Place items in grid
  const children = items.map((item, index) => {
    const bounds = getCellBounds(item.placement, index, template.columns.length)
    
    // Calculate position and size
    const x = (padding.left ?? 0) + columnPositions[bounds.colStart]
    const y = (padding.top ?? 0) + rowPositions[bounds.rowStart]
    
    let width = 0
    for (let col = bounds.colStart; col < bounds.colEnd && col < columnSizes.length; col++) {
      width += columnSizes[col]
      if (col < bounds.colEnd - 1) {
        width += columnGap
      }
    }
    
    let height = 0
    for (let row = bounds.rowStart; row < bounds.rowEnd && row < rowSizes.length; row++) {
      height += rowSizes[row]
      if (row < bounds.rowEnd - 1) {
        height += rowGap
      }
    }
    
    const cellBounds: LayoutRect = { x, y, width, height }
    
    return { view: item.view, bounds: cellBounds }
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
// Grid View Creation
// =============================================================================

/**
 * Create a grid container view
 */
export const grid = (
  items: ReadonlyArray<GridItem | View>,
  props: GridProps = {}
): View => {
  // Normalize items to GridItem
  const gridItems = items.map(item =>
    'view' in item && 'placement' in item ? item : { view: item as View }
  )
  
  // Calculate dimensions
  const template = props.template ?? {
    columns: [{ type: "fraction", fraction: 1 }],
    rows: [{ type: "auto" }]
  }
  
  const padding = props.padding ?? {}
  const paddingH = (padding.left ?? 0) + (padding.right ?? 0)
  const paddingV = (padding.top ?? 0) + (padding.bottom ?? 0)
  
  // Simple size calculation for now
  const columnCount = template.columns.length
  const rowCount = Math.ceil(gridItems.length / columnCount)
  
  // Estimate sizes
  const cellWidth = 20 // Default cell width
  const cellHeight = 3 // Default cell height
  const gap = props.gap ?? 0
  
  const totalWidth = paddingH + (cellWidth * columnCount) + (gap * (columnCount - 1))
  const totalHeight = paddingV + (cellHeight * rowCount) + (gap * (rowCount - 1))
  
  return {
    render: () => Effect.gen(function* (_) {
      const layout = calculateGridLayout(gridItems, totalWidth, totalHeight, props)
      
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
// Grid Template Helpers
// =============================================================================

/**
 * Create a grid template with equal columns
 */
export const columns = (count: number): GridTemplate => ({
  columns: Array(count).fill({ type: "fraction", fraction: 1 }),
  rows: [{ type: "auto" }]
})

/**
 * Create a grid template with specific column sizes
 */
export const template = (
  columnSpec: string,
  rowSpec?: string
): GridTemplate => {
  const parseSpec = (spec: string): GridTrack[] => {
    return spec.split(/\s+/).map(part => {
      if (part.endsWith('fr')) {
        const fraction = parseFloat(part)
        return { type: "fraction", fraction } as GridTrack
      } else if (part === 'auto') {
        return { type: "auto" } as GridTrack
      } else {
        const size = parseInt(part)
        return { type: "fixed", size } as GridTrack
      }
    })
  }
  
  return {
    columns: parseSpec(columnSpec),
    rows: rowSpec ? parseSpec(rowSpec) : [{ type: "auto" }]
  }
}

/**
 * Create a grid item with placement
 */
export const gridItem = (
  view: View,
  placement: GridPlacement
): GridItem => ({
  view,
  placement
})

/**
 * Create a grid item that spans multiple columns
 */
export const span = (
  view: View,
  columnSpan: number,
  rowSpan: number = 1
): GridItem => ({
  view,
  placement: { columnSpan, rowSpan }
})