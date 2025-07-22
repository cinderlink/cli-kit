/**
 * Style Types and Interfaces
 * 
 * Core type definitions for the style system
 */

import type { Color } from "@core/terminal/ansi/styles/color"
import type { Border, BorderSide } from "@core/terminal/ansi/styles/borders"

/**
 * Style transform function type
 */
export type StyleTransform = (str: string) => string

/**
 * Horizontal alignment options
 */
export type HorizontalAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * Vertical alignment options
 */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/**
 * Properties that can be applied to a style
 * All properties are optional and immutable
 */
export interface StyleProps {
  // Colors
  readonly foreground?: Color
  readonly background?: Color
  
  // Typography
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly faint?: boolean
  readonly blink?: boolean
  readonly reverse?: boolean
  readonly invisible?: boolean
  
  // Layout
  readonly paddingTop?: number
  readonly paddingRight?: number
  readonly paddingBottom?: number
  readonly paddingLeft?: number
  readonly marginTop?: number
  readonly marginRight?: number
  readonly marginBottom?: number
  readonly marginLeft?: number
  
  // Dimensions
  readonly width?: number
  readonly height?: number
  readonly maxWidth?: number
  readonly maxHeight?: number
  readonly minWidth?: number
  readonly minHeight?: number
  
  // Borders
  readonly border?: Border
  readonly borderSides?: BorderSide
  readonly borderForeground?: Color
  readonly borderBackground?: Color
  
  // Alignment
  readonly align?: HorizontalAlign
  readonly valign?: VerticalAlign
  
  // Transform
  readonly transform?: StyleTransform
  
  // Internal
  readonly inline?: boolean
  readonly inherit?: boolean
}