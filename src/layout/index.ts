/**
 * Layout Module - Flexible layout system for CLI-Kit
 * 
 * Provides CSS-inspired layout containers and utilities:
 * - Flexbox layout
 * - Grid layout
 * - Spacing utilities
 * - Layout types and helpers
 */

// Layout types
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
} from "./types.ts"

// Flexbox layout
export {
  flexbox,
  hbox,
  vbox,
  center,
  spread
} from "./flexbox.ts"

// Grid layout
export {
  grid,
  columns,
  template,
  gridItem,
  span
} from "./grid.ts"

// Spacing utilities
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
} from "./spacer.ts"

// Box components
export {
  styledBox,
  panel,
  type BoxProps
} from "./box.ts"

// Join functions
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
} from "./join.ts"

// Dynamic layout system
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
} from "./dynamic-layout.ts"