/**
 * Layout Types - Common types and interfaces for the layout system
 *
 * This module defines the fundamental types for building flexible
 * layouts in TUI applications, inspired by CSS flexbox and grid.
 */

import type { View } from '@core/types'

// =============================================================================
// Flexbox Types
// =============================================================================

/**
 * Flex direction controls the main axis of flexbox layout.
 * Determines whether items are laid out in rows or columns.
 */
export enum FlexDirection {
  Row = 'row',
  Column = 'column',
  RowReverse = 'row-reverse',
  ColumnReverse = 'column-reverse',
}

/**
 * Justify content aligns items along the main axis.
 * Controls how space is distributed between and around items.
 */
export enum JustifyContent {
  Start = 'start',
  End = 'end',
  Center = 'center',
  SpaceBetween = 'space-between',
  SpaceAround = 'space-around',
  SpaceEvenly = 'space-evenly',
}

/**
 * Align items controls alignment on the cross axis.
 * Determines how items are aligned perpendicular to the main axis.
 */
export enum AlignItems {
  Start = 'start',
  End = 'end',
  Center = 'center',
  Stretch = 'stretch',
  Baseline = 'baseline',
}

/**
 * Flex wrap controls whether items wrap to new lines.
 * Determines if items should wrap when they overflow the container.
 */
export enum FlexWrap {
  NoWrap = 'nowrap',
  Wrap = 'wrap',
  WrapReverse = 'wrap-reverse',
}

/**
 * Flex item properties for individual items within a flexbox container.
 * Controls how the item grows, shrinks, and aligns within the layout.
 */
export interface FlexItem {
  readonly view: View
  readonly flex?: number
  readonly grow?: number
  readonly shrink?: number
  readonly basis?: number | 'auto'
  readonly alignSelf?: AlignItems
  readonly order?: number
}

/**
 * Flexbox container properties that control the overall layout behavior.
 * Based on CSS flexbox model adapted for terminal interfaces.
 */
export interface FlexboxProps {
  readonly direction?: FlexDirection
  readonly justifyContent?: JustifyContent
  readonly alignItems?: AlignItems
  readonly wrap?: FlexWrap
  readonly gap?: number
  readonly rowGap?: number
  readonly columnGap?: number
  readonly padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

// =============================================================================
// Grid Types
// =============================================================================

/**
 * Grid template definition that specifies the columns and rows of a grid.
 * Defines the structure and sizing of the grid layout.
 */
export interface GridTemplate {
  readonly columns: ReadonlyArray<GridTrack>
  readonly rows: ReadonlyArray<GridTrack>
}

/**
 * Grid track sizing options for columns and rows.
 * Supports fixed sizes, fractions, and content-based sizing.
 */
export type GridTrack =
  | { type: 'fixed'; size: number }
  | { type: 'fraction'; fraction: number }
  | { type: 'auto' }
  | { type: 'min-content' }
  | { type: 'max-content' }

/**
 * Grid item placement controls where an item appears in the grid.
 * Allows precise positioning and spanning across multiple cells.
 */
export interface GridPlacement {
  readonly column?: number | { start: number; end: number }
  readonly row?: number | { start: number; end: number }
  readonly columnSpan?: number
  readonly rowSpan?: number
}

/**
 * Grid item properties for individual items within a grid container.
 * Controls placement, alignment, and ordering within the grid.
 */
export interface GridItem {
  readonly view: View
  readonly placement?: GridPlacement
  readonly justifySelf?: JustifyContent
  readonly alignSelf?: AlignItems
  readonly order?: number
}

/**
 * Grid container properties that control the overall grid layout behavior.
 * Based on CSS Grid Layout adapted for terminal interfaces.
 */
export interface GridProps {
  readonly template?: GridTemplate
  readonly gap?: number
  readonly rowGap?: number
  readonly columnGap?: number
  readonly justifyContent?: JustifyContent
  readonly alignContent?: AlignItems
  readonly justifyItems?: JustifyContent
  readonly alignItems?: AlignItems
  readonly autoColumns?: GridTrack
  readonly autoRows?: GridTrack
  readonly autoFlow?: 'row' | 'column' | 'row-dense' | 'column-dense'
  readonly padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

// =============================================================================
// Layout Calculation Types
// =============================================================================

/**
 * Calculated layout rectangle for a view after layout computation.
 * Represents the final position and dimensions in screen coordinates.
 */
export interface LayoutRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Size constraints for layout calculations.
 * Defines minimum and maximum bounds for width and height.
 */
export interface SizeConstraints {
  readonly minWidth?: number
  readonly maxWidth?: number
  readonly minHeight?: number
  readonly maxHeight?: number
}

/**
 * Layout calculation result containing computed positions for container and children.
 * Output of the layout engine after processing constraints and properties.
 */
export interface LayoutResult {
  readonly bounds: LayoutRect
  readonly children: ReadonlyArray<{
    view: View
    bounds: LayoutRect
  }>
}

// =============================================================================
// Spacing Types
// =============================================================================

/**
 * Spacer properties for creating flexible whitespace in layouts.
 * Can have fixed size or flex to fill available space.
 */
export interface SpacerProps {
  readonly size?: number
  readonly flex?: number
}

/**
 * Divider orientation determines whether the divider is horizontal or vertical.
 * Controls the direction of the visual separator line.
 */
export enum DividerOrientation {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

/**
 * Divider properties for creating visual separators between layout elements.
 * Supports custom characters and styling for the separator line.
 */
export interface DividerProps {
  readonly orientation?: DividerOrientation
  /** Character to use for the divider line (default: '-' for horizontal, '|' for vertical) */
  readonly char?: string
  /** Style properties for the divider appearance */
  readonly style?: Record<string, unknown>
}
