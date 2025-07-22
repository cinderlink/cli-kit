/**
 * Style Builder - Fluent API for style creation
 * 
 * Provides chainable methods for building styles
 */

import { Data } from "effect"
import type { Color } from "@core/terminal/ansi/styles/color"
import type { Border } from "@core/terminal/ansi/styles/borders"
import { BorderSide } from "@core/terminal/ansi/styles/borders"
import type { StyleProps, HorizontalAlign, VerticalAlign, StyleTransform } from "./types"

/**
 * The main Style class with immutable, chainable API
 * 
 * @example
 * ```typescript
 * const myStyle = new Style({})
 *   .foreground(Colors.blue)
 *   .bold()
 *   .padding(2)
 * ```
 */
export class Style extends Data.Class<{
  props: StyleProps
}> {
  // ===========================================================================
  // Color Methods
  // ===========================================================================
  
  /**
   * Set the foreground (text) color
   */
  foreground(color: Color): Style {
    return new Style({
      ...this,
      props: { ...this.props, foreground: color }
    })
  }
  
  /**
   * Set the background color
   */
  background(color: Color): Style {
    return new Style({
      ...this,
      props: { ...this.props, background: color }
    })
  }
  
  // ===========================================================================
  // Border Methods
  // ===========================================================================
  
  /**
   * Set the border style
   */
  border(border: Border, sides: BorderSide = BorderSide.All): Style {
    return new Style({
      ...this,
      props: { 
        ...this.props, 
        border,
        borderSides: sides
      }
    })
  }
  
  /**
   * Set which border sides to render
   */
  borderSides(sides: BorderSide): Style {
    return new Style({
      ...this,
      props: { ...this.props, borderSides: sides }
    })
  }
  
  /**
   * Enable/disable top border
   */
  borderTop(enable = true): Style {
    const current = this.props.borderSides || BorderSide.All
    const newSides = enable 
      ? current | BorderSide.Top
      : current & ~BorderSide.Top
    return this.borderSides(newSides)
  }
  
  /**
   * Enable/disable right border
   */
  borderRight(enable = true): Style {
    const current = this.props.borderSides || BorderSide.All
    const newSides = enable 
      ? current | BorderSide.Right
      : current & ~BorderSide.Right
    return this.borderSides(newSides)
  }
  
  /**
   * Enable/disable bottom border
   */
  borderBottom(enable = true): Style {
    const current = this.props.borderSides || BorderSide.All
    const newSides = enable 
      ? current | BorderSide.Bottom
      : current & ~BorderSide.Bottom
    return this.borderSides(newSides)
  }
  
  /**
   * Enable/disable left border
   */
  borderLeft(enable = true): Style {
    const current = this.props.borderSides || BorderSide.All
    const newSides = enable 
      ? current | BorderSide.Left
      : current & ~BorderSide.Left
    return this.borderSides(newSides)
  }
  
  /**
   * Set the border foreground color
   */
  borderForeground(color: Color): Style {
    return new Style({
      ...this,
      props: { ...this.props, borderForeground: color }
    })
  }
  
  /**
   * Set the border background color
   */
  borderBackground(color: Color): Style {
    return new Style({
      ...this,
      props: { ...this.props, borderBackground: color }
    })
  }
  
  // ===========================================================================
  // Typography Methods
  // ===========================================================================
  
  /**
   * Make text bold
   */
  bold(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, bold: enable }
    })
  }
  
  /**
   * Make text italic
   */
  italic(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, italic: enable }
    })
  }
  
  /**
   * Underline text
   */
  underline(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, underline: enable }
    })
  }
  
  /**
   * Strike through text
   */
  strikethrough(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, strikethrough: enable }
    })
  }
  
  /**
   * Make text faint/dim
   */
  faint(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, faint: enable }
    })
  }
  
  /**
   * Make text blink
   */
  blink(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, blink: enable }
    })
  }
  
  /**
   * Reverse colors (swap foreground/background)
   */
  reverse(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, reverse: enable }
    })
  }
  
  /**
   * Make text invisible (but still take up space)
   */
  invisible(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, invisible: enable }
    })
  }
  
  // ===========================================================================
  // Layout Methods
  // ===========================================================================
  
  /**
   * Set padding on all sides
   */
  padding(value: number): Style
  padding(vertical: number, horizontal: number): Style
  padding(top: number, right: number, bottom: number, left: number): Style
  padding(...args: number[]): Style {
    if (args.length === 1) {
      const [value] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          paddingTop: value,
          paddingRight: value,
          paddingBottom: value,
          paddingLeft: value
        }
      })
    } else if (args.length === 2) {
      const [vertical, horizontal] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          paddingTop: vertical,
          paddingRight: horizontal,
          paddingBottom: vertical,
          paddingLeft: horizontal
        }
      })
    } else {
      const [top, right, bottom, left] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          paddingTop: top,
          paddingRight: right,
          paddingBottom: bottom,
          paddingLeft: left
        }
      })
    }
  }
  
  /**
   * Set padding for specific sides
   */
  paddingTop(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, paddingTop: value }
    })
  }
  
  paddingRight(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, paddingRight: value }
    })
  }
  
  paddingBottom(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, paddingBottom: value }
    })
  }
  
  paddingLeft(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, paddingLeft: value }
    })
  }
  
  /**
   * Set margin on all sides
   */
  margin(value: number): Style
  margin(vertical: number, horizontal: number): Style
  margin(top: number, right: number, bottom: number, left: number): Style
  margin(...args: number[]): Style {
    if (args.length === 1) {
      const [value] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          marginTop: value,
          marginRight: value,
          marginBottom: value,
          marginLeft: value
        }
      })
    } else if (args.length === 2) {
      const [vertical, horizontal] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          marginTop: vertical,
          marginRight: horizontal,
          marginBottom: vertical,
          marginLeft: horizontal
        }
      })
    } else {
      const [top, right, bottom, left] = args
      return new Style({
        ...this,
        props: {
          ...this.props,
          marginTop: top,
          marginRight: right,
          marginBottom: bottom,
          marginLeft: left
        }
      })
    }
  }
  
  /**
   * Set margin for specific sides
   */
  marginTop(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, marginTop: value }
    })
  }
  
  marginRight(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, marginRight: value }
    })
  }
  
  marginBottom(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, marginBottom: value }
    })
  }
  
  marginLeft(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, marginLeft: value }
    })
  }
  
  // ===========================================================================
  // Dimension Methods
  // ===========================================================================
  
  /**
   * Set fixed width
   */
  width(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, width: value }
    })
  }
  
  /**
   * Set fixed height
   */
  height(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, height: value }
    })
  }
  
  /**
   * Set maximum width
   */
  maxWidth(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, maxWidth: value }
    })
  }
  
  /**
   * Set maximum height
   */
  maxHeight(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, maxHeight: value }
    })
  }
  
  /**
   * Set minimum width
   */
  minWidth(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, minWidth: value }
    })
  }
  
  /**
   * Set minimum height
   */
  minHeight(value: number): Style {
    return new Style({
      ...this,
      props: { ...this.props, minHeight: value }
    })
  }
  
  // ===========================================================================
  // Alignment Methods
  // ===========================================================================
  
  /**
   * Set horizontal alignment
   */
  align(value: HorizontalAlign): Style {
    return new Style({
      ...this,
      props: { ...this.props, align: value }
    })
  }
  
  /**
   * Set vertical alignment
   */
  valign(value: VerticalAlign): Style {
    return new Style({
      ...this,
      props: { ...this.props, valign: value }
    })
  }
  
  // ===========================================================================
  // Transform Methods
  // ===========================================================================
  
  /**
   * Set a text transform function
   */
  transform(fn: StyleTransform): Style {
    return new Style({
      ...this,
      props: { ...this.props, transform: fn }
    })
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Set whether this is an inline style (doesn't break lines)
   */
  inline(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, inline: enable }
    })
  }
  
  /**
   * Set whether this style inherits from parent
   */
  inherit(enable = true): Style {
    return new Style({
      ...this,
      props: { ...this.props, inherit: enable }
    })
  }
  
  /**
   * Merge another style into this one
   * Properties from the other style override this one
   */
  merge(other: Style): Style {
    return new Style({
      props: { ...this.props, ...other.props }
    })
  }
  
  /**
   * Create a copy of this style with specific props
   */
  copy(props: Partial<StyleProps>): Style {
    return new Style({
      props: { ...this.props, ...props }
    })
  }
}