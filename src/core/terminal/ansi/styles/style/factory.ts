/**
 * Style Factory Functions
 * 
 * Convenience functions for creating and composing styles
 */

import { Style } from "./builder"
import type { StyleProps } from "./types"
import { Colors } from "@core/terminal/ansi/styles/color"
import { Borders } from "@core/terminal/ansi/styles/borders"

/**
 * Create a new empty style
 * 
 * @example
 * ```typescript
 * const myStyle = style()
 *   .foreground(Colors.blue)
 *   .bold()
 * ```
 */
export const style = (): Style => 
  new Style({ props: {} })

/**
 * Create a style from properties
 * 
 * @example
 * ```typescript
 * const myStyle = styleFrom({
 *   foreground: Colors.blue,
 *   bold: true
 * })
 * ```
 */
export const styleFrom = (props: StyleProps): Style =>
  new Style({ props })

/**
 * Pre-defined styles for common use cases
 */
export const Styles = {
  /**
   * No styling applied
   */
  None: style(),
  
  /**
   * Bold text
   */
  Bold: style().bold(),
  
  /**
   * Italic text
   */
  Italic: style().italic(),
  
  /**
   * Underlined text
   */
  Underline: style().underline(),
  
  /**
   * Faint/dim text
   */
  Faint: style().faint(),
  
  /**
   * Strikethrough text
   */
  Strikethrough: style().strikethrough(),
  
  /**
   * Primary accent color
   */
  Primary: style().foreground(Colors.blue),
  
  /**
   * Secondary accent color
   */
  Secondary: style().foreground(Colors.cyan),
  
  /**
   * Success/positive color
   */
  Success: style().foreground(Colors.green),
  
  /**
   * Warning color
   */
  Warning: style().foreground(Colors.yellow),
  
  /**
   * Error/danger color
   */
  Error: style().foreground(Colors.red),
  
  /**
   * Muted/disabled text
   */
  Muted: style().foreground(Colors.gray).faint(),
  
  /**
   * Code/monospace styling
   */
  Code: style()
    .foreground(Colors.cyan)
    .background(Colors.rgb(40, 40, 40)),
  
  /**
   * Highlighted text
   */
  Highlight: style()
    .foreground(Colors.black)
    .background(Colors.yellow),
  
  /**
   * Simple box with rounded borders
   */
  Box: style()
    .border(Borders.Rounded)
    .padding(1, 2),
  
  /**
   * Title/header styling
   */
  Title: style()
    .bold()
    .foreground(Colors.white)
    .marginBottom(1),
  
  /**
   * Subtitle styling
   */
  Subtitle: style()
    .foreground(Colors.gray)
    .marginBottom(1),
  
  /**
   * List item with bullet
   */
  ListItem: style()
    .paddingLeft(2),
  
  /**
   * Table cell
   */
  TableCell: style()
    .padding(0, 1),
  
  /**
   * Centered content
   */
  Center: style()
    .align('center'),
  
  /**
   * Right-aligned content
   */
  Right: style()
    .align('right'),
  
  /**
   * Full-width block
   */
  Block: style()
    .width(100)
    .maxWidth(100)
} as const