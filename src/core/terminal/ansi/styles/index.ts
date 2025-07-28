/**
 * Styling Module - Comprehensive styling system for TUIX
 *
 * This module provides a complete styling solution for terminal UI applications,
 * inspired by CSS and modern styling libraries like Lipgloss.
 *
 * ## Core Components:
 *
 * ### Style API
 * - `Style` class: Immutable, chainable styling with comprehensive properties
 * - `style()`: Create new styles with fluent API
 * - `Styles`: Pre-defined common styles
 *
 * ### Color System
 * - Multiple color formats: RGB, Hex, ANSI, ANSI256
 * - Adaptive colors for light/dark terminals
 * - Color manipulation: blend, lighten, darken
 * - Pre-defined color palette
 *
 * ### Border System
 * - Various border styles: normal, rounded, bold, double, ASCII
 * - Partial borders support
 * - Border merging and composition
 *
 * ### Layout & Typography
 * - Text alignment: horizontal and vertical
 * - Padding and margin support
 * - Text transformations
 * - Dimension constraints
 *
 * ### Advanced Effects
 * - Gradient support for text and backgrounds
 * - Pattern generation
 * - Shadow and glow effects
 * - Animation effects
 *
 * @example
 * ```typescript
 * import { style, Colors, Borders } from 'tuix/styling'
 *
 * const myStyle = style()
 *   .foreground(Colors.Blue)
 *   .background(Colors.White)
 *   .bold()
 *   .padding(2)
 *   .border(Borders.Rounded)
 * ```
 */

// =============================================================================
// Core Style API
// =============================================================================

export {
  Style, // Main style class
  style, // Style factory function
  styleFrom, // Create style from properties
  Styles, // Pre-defined style constants
} from './style'

// =============================================================================
// Rendering Functions
// =============================================================================

export {
  renderStyled, // Effect-based rendering
  renderStyledSync, // Synchronous rendering (deprecated)
} from './render'

// =============================================================================
// Color System
// =============================================================================

export {
  // Types
  type Color,
  ColorProfile,
  // Pre-defined colors
  Colors,
  // Color utilities
  toAnsiSequence,
  isVisible,
  blend,
  lighten,
  darken,
  gradient,
} from './color'

// =============================================================================
// Border System
// =============================================================================

export {
  // Types
  type Border,
  BorderSide,
  // Pre-defined borders
  Borders,
  // Border utilities
  hasSide,
  combineSides,
  createBorder,
  getBorderChar,
  renderBox,
  mergeBorders,
  borderFromPattern,
} from './borders'

// =============================================================================
// Type System
// =============================================================================

export {
  // Position types
  type Position,
  Position as PositionUtils, // Position factory and constants
  // Spacing types
  type Padding,
  type Margin,
  normalizeSpacing,
  // Style properties
  type StyleProps,
  type TextDecoration,
  type Dimensions,
  type TextTransform,
  // Alignment enums
  HorizontalAlign,
  VerticalAlign,
  // Style inheritance
  isInheritable,
  INHERITABLE_PROPS,
} from './types'

// =============================================================================
// Gradient System
// =============================================================================

export {
  // Types
  type GradientStop,
  type GradientConfig,
  type TextGradientOptions,
  type BackgroundGradientOptions,
  // Gradient functions
  textGradient,
  backgroundGradient,
  // Pre-defined gradients
  rainbowGradient,
  sunsetGradient,
  oceanGradient,
  // Gradient utilities
  createGradient,
  reverseGradient,
} from './gradients'

// =============================================================================
// Advanced Styling Effects
// =============================================================================

export {
  // Types
  type ShadowConfig,
  type GlowConfig,
  type PatternConfig,
  type BorderStyle,
  type LayerEffect,
  // Shadow and glow effects
  createDropShadow,
  createInnerShadow,
  createGlow,
  // Pattern generation
  generatePattern,
  applyPattern,
  // Border styling
  createStyledBorder,
  // Layer effects
  applyLayerEffect,
  // Animation effects
  createPulse,
  createShake,
  createBounce,
  createTypewriter,
  createWaveText,
  createRainbowText,
  // Special effects
  createNeonEffect,
  createMatrixEffect,
  createHologramEffect,
} from './advanced'
