/**
 * Styling Module - Comprehensive styling system for CLI-Kit
 * 
 * Exports:
 * - Style class and factory functions
 * - Color system with predefined colors
 * - Border system with various styles
 * - Common types and utilities
 * - Rendering functions
 */

// Core style API
export { 
  Style, 
  style, 
  styleFrom,
  Styles 
} from "./style.ts"

// Rendering
export {
  renderStyled,
  renderStyledSync
} from "./render.ts"

// Color system
export {
  type Color,
  ColorProfile,
  Colors,
  toAnsiSequence,
  isVisible,
  blend,
  lighten,
  darken,
  gradient
} from "./color.ts"

// Border system
export {
  type Border,
  BorderSide,
  Borders,
  hasSide,
  combineSides,
  createBorder,
  getBorderChar,
  renderBox,
  mergeBorders,
  borderFromPattern
} from "./borders.ts"

// Types
export {
  type Position,
  type Padding,
  type Margin,
  type StyleProps,
  type TextDecoration,
  type Dimensions,
  type TextTransform,
  HorizontalAlign,
  VerticalAlign,
  normalizeSpacing,
  isInheritable,
  INHERITABLE_PROPS
} from "./types.ts"