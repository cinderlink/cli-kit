/**
 * Layout Module - Comprehensive layout system for terminal user interfaces
 * 
 * This module provides CSS-inspired layout containers and utilities adapted for
 * text-based interfaces. It includes flexbox and grid layout systems, spacing
 * utilities, and dynamic layout helpers for building responsive TUI applications.
 * 
 * @module Layout
 * 
 * Key Features:
 * - **Flexbox Layout**: CSS-style flexible box layouts with direction, alignment, and wrapping
 * - **Grid Layout**: Two-dimensional grid system with template-based positioning
 * - **Spacing Utilities**: Spacers, dividers, and layout helpers for consistent spacing
 * - **Box Components**: Styled containers with borders, padding, and backgrounds
 * - **Dynamic Layouts**: Responsive and conditional layout components
 * - **Join Operations**: Utilities for combining and positioning views
 */

// =============================================================================
// Layout Types and Enums
// =============================================================================

/**
 * Core layout types, interfaces, and enums for building layouts
 */
export {
  // Flexbox types
  type FlexboxProps,
  type FlexItem,
  FlexDirection,
  JustifyContent,
  AlignItems,
  FlexWrap,
  
  // Grid types
  type GridProps,
  type GridItem,
  type GridTemplate,
  type GridTrack,
  type GridPlacement,
  
  // Common types
  type LayoutRect,
  type LayoutResult,
  type SizeConstraints,
  
  // Spacer types
  type SpacerProps,
  type DividerProps,
  DividerOrientation
} from "./types"

// =============================================================================
// Flexbox Layout System
// =============================================================================

/**
 * CSS-inspired flexbox layout containers for flexible, responsive layouts
 */
export {
  flexbox,
  hbox,
  vbox,
  center,
  spread
} from "./flexbox"

// =============================================================================
// Grid Layout System
// =============================================================================

/**
 * Two-dimensional grid layout system with precise control over positioning
 */
export {
  grid,
  columns,
  template,
  gridItem,
  span
} from "./grid"

// =============================================================================
// Spacing and Divider Utilities
// =============================================================================

/**
 * Spacers, dividers, and layout utilities for consistent spacing and separation
 */
export {
  spacer,
  hspace,
  vspace,
  flexSpacer,
  divider,
  hdivider,
  vdivider,
  dottedDivider,
  dashedDivider,
  doubleDivider,
  thickDivider,
  spaced,
  separated
} from "./spacer"

// =============================================================================
// Box and Panel Components
// =============================================================================

/**
 * Styled containers with borders, backgrounds, and padding
 */
export {
  styledBox,
  panel,
  type BoxProps
} from "./box"

// =============================================================================
// View Composition and Positioning
// =============================================================================

/**
 * Utilities for combining and positioning views in complex layouts
 */
export {
  joinHorizontal,
  joinVertical,
  place,
  type Position,
  Top,
  Left,
  Center,
  Bottom,
  Right
} from "./join"

// =============================================================================
// Dynamic and Responsive Layout System
// =============================================================================

/**
 * Advanced layout components with responsive behavior and conditional rendering
 */
export {
  dynamicVBox,
  dynamicSpacer,
  fixedSpacer,
  conditionalSpacer,
  formField,
  formSection,
  heightAwareContainer,
  paddedContainer,
  responsiveLayout,
  scrollableView,
  type DynamicViewProps,
  type SpacerOptions,
  type ConditionalSpacerOptions
} from "./dynamic-layout"

// =============================================================================
// Simple Layout Utilities  
// =============================================================================

/**
 * Basic layout utilities for simple positioning and arrangement
 */
export {
  simpleLayout,
  layered
} from "./simple"