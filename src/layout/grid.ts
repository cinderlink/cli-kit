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
import type { View } from "../core/types"
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
} from "./types"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate auto sizing for grid tracks
 */
const calculateAutoSize = (
  availableSize: number,
  totalFractions: number,
  fractionSize: number
): number => {
  // Auto tracks should take up remaining space after fixed tracks
  // For now, treat as 1fr but with a minimum size
  return Math.max(fractionSize, 10)
}

/**
 * Calculate minimum content size for a track
 */
const calculateMinContentSize = (): number => {
  // In a real implementation, this would measure content
  // For now, use a reasonable minimum
  return 5
}

/**
 * Calculate maximum content size for a track
 */
const calculateMaxContentSize = (availableSize: number): number => {
  // In a real implementation, this would measure content
  // For now, use a fraction of available space
  return Math.floor(availableSize * 0.3)
}

/**
 * Generate auto rows based on item count and available height
 */
const generateAutoRows = (rowCount: number, availableHeight: number): GridTrack[] => {
  const rowHeight = Math.max(3, Math.floor(availableHeight / rowCount))
  return Array(rowCount).fill(0).map(() => ({ type: "fixed", size: rowHeight } as GridTrack))
}

/**
 * Calculate default cell sizes based on content
 */
const calculateDefaultCellSizes = (
  items: ReadonlyArray<{ view: View }>,
  template: GridTemplate
): { cellWidth: number; cellHeight: number } => {
  // In a real implementation, this would measure actual content
  // For now, use reasonable defaults based on grid structure
  const columnCount = template.columns.length
  const hasFixedColumns = template.columns.some(col => col.type === "fixed")
  
  return {
    cellWidth: hasFixedColumns ? 15 : 20,
    cellHeight: 3
  }
}

/**
 * Calculate item span dimensions
 */
const calculateSpanDimensions = (
  bounds: { colStart: number; colEnd: number; rowStart: number; rowEnd: number },
  columnSizes: number[],
  rowSizes: number[],
  columnGap: number,
  rowGap: number
): { width: number; height: number } => {
  let width = 0
  for (let col = bounds.colStart; col < bounds.colEnd && col < columnSizes.length; col++) {
    width += columnSizes[col] ?? 0
    if (col < bounds.colEnd - 1) {
      width += columnGap
    }
  }
  
  let height = 0
  for (let row = bounds.rowStart; row < bounds.rowEnd && row < rowSizes.length; row++) {
    height += rowSizes[row] ?? 0
    if (row < bounds.rowEnd - 1) {
      height += rowGap
    }
  }
  
  return { width, height }
}

/**
 * Render child view into grid buffer
 */
const renderChildToGridBuffer = (
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
        buffer[bufferY][bufferX] = chars[x] ?? ' '
      }
    }
  }
}

/**
 * Parse grid track size to pixels based on track type and available space
 * 
 * @param track - The grid track definition (fixed, fraction, auto, etc.)
 * @param availableSize - Total available space for this axis
 * @param totalFractions - Sum of all fractional tracks
 * @param fractionSize - Size of one fraction unit
 * @returns The calculated track size in pixels
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
      return calculateAutoSize(availableSize, totalFractions, fractionSize)
    case "min-content":
      return calculateMinContentSize()
    case "max-content":
      return calculateMaxContentSize(availableSize)
  }
}

/**
 * Calculate track sizes for a grid axis (columns or rows)
 * 
 * Handles all track types:
 * - Fixed: Uses specified pixel size
 * - Fraction: Proportional sizing using available space
 * - Auto: Content-based sizing with fallback
 * - Min/Max content: Content measurement with reasonable defaults
 * 
 * @param tracks - Array of track definitions
 * @param availableSize - Total available space minus gaps
 * @param gap - Space between tracks
 * @returns Array of calculated track sizes in pixels
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
 * 
 * @param sizes - Array of track sizes
 * @param gap - Space between tracks
 * @returns Array of starting positions for each track
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
 * Get cell bounds from placement specification
 * 
 * Handles both auto-placement and explicit placement:
 * - Auto: Places items left-to-right, top-to-bottom
 * - Explicit: Uses specified column/row positions and spans
 * 
 * @param placement - Grid placement specification or undefined for auto
 * @param itemIndex - Index of item for auto-placement
 * @param columnCount - Number of columns in grid
 * @returns Cell bounds with start/end positions
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
 * Calculate grid layout for all items
 * 
 * Main grid layout algorithm:
 * 1. Parse grid template and apply padding
 * 2. Calculate column sizes and positions
 * 3. Generate or calculate row sizes
 * 4. Place each item according to placement rules
 * 5. Calculate final bounds for each item
 * 
 * @param items - Array of grid items to layout
 * @param containerWidth - Total container width
 * @param containerHeight - Total container height
 * @param props - Grid configuration properties
 * @returns Layout result with positioned children
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
  
  // Calculate row sizing based on template or auto-generate
  const rowCount = Math.ceil(items.length / template.columns.length)
  const rows = template.rows.length > 0 
    ? template.rows 
    : generateAutoRows(rowCount, availableHeight)
  
  const rowSizes = calculateTrackSizes(rows, availableHeight, rowGap)
  const rowPositions = calculateTrackPositions(rowSizes, rowGap)
  
  // Place items in grid
  const children = items.map((item, index) => {
    const bounds = getCellBounds(item.placement, index, template.columns.length)
    
    // Calculate position and size
    const x = (padding.left ?? 0) + (columnPositions[bounds.colStart] ?? 0)
    const y = (padding.top ?? 0) + (rowPositions[bounds.rowStart] ?? 0)
    
    // Calculate span dimensions using helper
    const { width, height } = calculateSpanDimensions(
      bounds,
      columnSizes,
      rowSizes,
      columnGap,
      rowGap
    )
    
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
 * 
 * Creates a CSS Grid-inspired layout system for TUI applications.
 * Supports:
 * - Fixed, fractional, and auto-sized tracks
 * - Item placement and spanning
 * - Gaps between cells
 * - Padding around container
 * 
 * @param items - Array of views or grid items to layout
 * @param props - Grid configuration options
 * @returns A view containing the grid layout
 * 
 * @example
 * ```typescript
 * const layout = grid([
 *   gridItem(view1, { column: 0, row: 0 }),
 *   span(view2, 2, 1), // Spans 2 columns
 *   view3 // Auto-placed
 * ], {
 *   template: template('1fr 2fr 1fr', 'auto auto'),
 *   gap: 1
 * })
 * ```
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
  
  // Calculate cell sizes based on content or defaults
  const { cellWidth, cellHeight } = calculateDefaultCellSizes(gridItems, template)
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
        renderChildToGridBuffer(buffer, content, child.bounds, totalWidth, totalHeight)
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
 * 
 * @param count - Number of equal-width columns
 * @returns Grid template with fractional columns
 * 
 * @example
 * ```typescript
 * const template = columns(3) // Creates 3 equal columns
 * ```
 */
export const columns = (count: number): GridTemplate => ({
  columns: Array(count).fill({ type: "fraction", fraction: 1 }),
  rows: [{ type: "auto" }]
})

/**
 * Create a grid template with specific column and row sizes
 * 
 * Parses CSS Grid-style template strings:
 * - "1fr 2fr 1fr" - Fractional units
 * - "100 auto 50" - Fixed pixels and auto sizing
 * - "1fr auto 2fr" - Mixed sizing
 * 
 * @param columnSpec - Column template string
 * @param rowSpec - Optional row template string
 * @returns Grid template with parsed tracks
 * 
 * @example
 * ```typescript
 * const template = template('1fr 200 1fr', 'auto 50 auto')
 * ```
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
 * Create a grid item with explicit placement
 * 
 * @param view - The view to place in the grid
 * @param placement - Grid placement specification
 * @returns Grid item with placement information
 * 
 * @example
 * ```typescript
 * const item = gridItem(myView, {
 *   column: { start: 0, end: 2 },
 *   row: 1
 * })
 * ```
 */
export const gridItem = (
  view: View,
  placement: GridPlacement
): GridItem => ({
  view,
  placement
})

/**
 * Create a grid item that spans multiple columns and/or rows
 * 
 * @param view - The view to place in the grid
 * @param columnSpan - Number of columns to span
 * @param rowSpan - Number of rows to span (default: 1)
 * @returns Grid item with span information
 * 
 * @example
 * ```typescript
 * const item = span(headerView, 3, 1) // Spans 3 columns, 1 row
 * ```
 */
export const span = (
  view: View,
  columnSpan: number,
  rowSpan: number = 1
): GridItem => ({
  view,
  placement: { columnSpan, rowSpan }
})