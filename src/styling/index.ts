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

// Gradient and advanced styling
export {
  type GradientStop,
  type GradientConfig,
  type TextGradientOptions,
  type BackgroundGradientOptions,
  textGradient,
  backgroundGradient,
  borderGradient,
  rainbowGradient,
  sunsetGradient,
  oceanGradient,
  forestGradient,
  fireGradient,
  pastelGradient,
  monochromeGradient,
  createGradient,
  reverseGradient,
  shiftGradient,
  scaleGradient,
  animatedGradient,
  pulsingGradient
} from "./gradients.ts"

export {
  type ShadowConfig,
  type GlowConfig,
  type PatternConfig,
  type BorderStyle,
  type LayerEffect,
  createDropShadow,
  createInnerShadow,
  createGlow,
  generatePattern,
  applyPattern,
  createStyledBorder,
  applyLayerEffect,
  createPulse,
  createShake,
  createBounce,
  createTypewriter,
  createWaveText,
  createRainbowText,
  createNeonEffect,
  createMatrixEffect,
  createHologramEffect
} from "./advanced.ts"

// Convenience exports for test compatibility
export const rgb = (r: number, g: number, b: number): string => 
  `rgb(${r}, ${g}, ${b})`

export const hex = (value: string): string => 
  value.startsWith("#") ? value : `#${value}`

export const hsl = (h: number, s: number, l: number): string =>
  `hsl(${h}, ${s}%, ${l}%)`