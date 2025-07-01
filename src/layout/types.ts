/**
 * Layout Types - Common types and interfaces for the layout system
 * 
 * This module defines the fundamental types for building flexible
 * layouts in TUI applications, inspired by CSS flexbox and grid.
 */

import type { View } from "@/core/types.ts"

// =============================================================================
// Flexbox Types
// =============================================================================

/**
 * Flex direction controls the main axis
 */
export enum FlexDirection {
  Row = "row",
  Column = "column",
  RowReverse = "row-reverse",
  ColumnReverse = "column-reverse"
}

/**
 * Justify content aligns items along the main axis
 */
export enum JustifyContent {
  Start = "start",
  End = "end",
  Center = "center",
  SpaceBetween = "space-between",
  SpaceAround = "space-around",
  SpaceEvenly = "space-evenly"
}

/**
 * Align items controls alignment on the cross axis
 */
export enum AlignItems {
  Start = "start",
  End = "end",
  Center = "center",
  Stretch = "stretch",
  Baseline = "baseline"
}

/**
 * Flex wrap controls whether items wrap to new lines
 */
export enum FlexWrap {
  NoWrap = "nowrap",
  Wrap = "wrap",
  WrapReverse = "wrap-reverse"
}

/**
 * Flex item properties
 */
export interface FlexItem {
  readonly view: View
  readonly flex?: number
  readonly grow?: number
  readonly shrink?: number
  readonly basis?: number | "auto"
  readonly alignSelf?: AlignItems
  readonly order?: number
}

/**
 * Flexbox container properties
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
 * Grid template definition
 */
export interface GridTemplate {
  readonly columns: ReadonlyArray<GridTrack>
  readonly rows: ReadonlyArray<GridTrack>
}

/**
 * Grid track sizing
 */
export type GridTrack =
  | { type: "fixed"; size: number }
  | { type: "fraction"; fraction: number }
  | { type: "auto" }
  | { type: "min-content" }
  | { type: "max-content" }

/**
 * Grid item placement
 */
export interface GridPlacement {
  readonly column?: number | { start: number; end: number }
  readonly row?: number | { start: number; end: number }
  readonly columnSpan?: number
  readonly rowSpan?: number
}

/**
 * Grid item properties
 */
export interface GridItem {
  readonly view: View
  readonly placement?: GridPlacement
  readonly justifySelf?: JustifyContent
  readonly alignSelf?: AlignItems
  readonly order?: number
}

/**
 * Grid container properties
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
  readonly autoFlow?: "row" | "column" | "row-dense" | "column-dense"
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
 * Calculated layout for a view
 */
export interface LayoutRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Size constraints for layout calculations
 */
export interface SizeConstraints {
  readonly minWidth?: number
  readonly maxWidth?: number
  readonly minHeight?: number
  readonly maxHeight?: number
}

/**
 * Layout calculation result
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
 * Spacer properties
 */
export interface SpacerProps {
  readonly size?: number
  readonly flex?: number
}

/**
 * Divider orientation
 */
export enum DividerOrientation {
  Horizontal = "horizontal",
  Vertical = "vertical"
}

/**
 * Divider properties
 */
export interface DividerProps {
  readonly orientation?: DividerOrientation
  readonly char?: string
  readonly style?: any // Style type from styling module
}