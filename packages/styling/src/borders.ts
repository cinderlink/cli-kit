/**
 * Border System - Comprehensive border styles for terminal UI components
 * 
 * This module provides a complete border styling system inspired by Lipgloss,
 * offering flexible border rendering with support for:
 * 
 * - **Multiple border styles**: normal, rounded, thick, double, ASCII, and decorative variants
 * - **Partial borders**: render only specific sides using bitflag combinations
 * - **Custom border characters**: create borders from patterns or individual characters
 * - **Smart border logic**: automatic corner handling based on enabled sides
 * - **ANSI-aware rendering**: proper width calculation with escape sequences
 * - **Border composition**: merge and combine different border styles
 * 
 * Key features:
 * - Type-safe border side selection with bitflags
 * - Intelligent corner rendering based on adjacent sides
 * - Support for complex layouts with middle connectors
 * - Performance-optimized character lookup
 * - Comprehensive predefined styles for common use cases
 * 
 * @example
 * ```typescript
 * import { Borders, BorderSide, renderBox } from './borders'
 * 
 * const content = ['Hello', 'World']
 * const boxed = renderBox(content, Borders.Rounded, BorderSide.All)
 * // ╭─────╮
 * // │Hello│
 * // │World│
 * // ╰─────╯
 * ```
 * 
 * @module styling/borders
 */

import { stringWidth } from "@tuix/core"

// =============================================================================
// Border Types
// =============================================================================

/**
 * Border representation with all possible border characters
 * 
 * Defines the complete set of characters needed to render borders and
 * complex layouts with junction points. Each position corresponds to
 * a specific part of the border or connection point.
 * 
 * Core border characters (required):
 * - Sides: top, bottom, left, right
 * - Corners: topLeft, topRight, bottomLeft, bottomRight
 * 
 * Junction characters (optional, for complex layouts):
 * - Middle connectors: middleLeft, middleRight, middleTop, middleBottom
 * - Central junction: middle
 * 
 * @example
 * ```typescript
 * const border: Border = {
 *   top: '─', bottom: '─', left: '│', right: '│',
 *   topLeft: '┌', topRight: '┐',
 *   bottomLeft: '└', bottomRight: '┘',
 *   // Optional junction characters
 *   middleLeft: '├', middleRight: '┤',
 *   middleTop: '┬', middleBottom: '┴',
 *   middle: '┼'
 * }
 * ```
 */
export interface Border {
  readonly top: string
  readonly bottom: string
  readonly left: string
  readonly right: string
  readonly topLeft: string
  readonly topRight: string
  readonly bottomLeft: string
  readonly bottomRight: string
  
  // Optional middle characters for complex layouts
  readonly middleLeft?: string
  readonly middleRight?: string
  readonly middleTop?: string
  readonly middleBottom?: string
  readonly middle?: string
}

/**
 * Enum for specifying which sides of a border to render
 * 
 * Uses bitflags for efficient combination and testing of border sides.
 * Multiple sides can be combined using bitwise OR operations.
 * 
 * Values:
 * - None: No border sides (0)
 * - Top: Top border only (1)
 * - Right: Right border only (2) 
 * - Bottom: Bottom border only (4)
 * - Left: Left border only (8)
 * - All: All four sides (15)
 * 
 * @example
 * ```typescript
 * // Single sides
 * const topOnly = BorderSide.Top
 * 
 * // Combined sides
 * const topAndBottom = BorderSide.Top | BorderSide.Bottom
 * const leftAndRight = BorderSide.Left | BorderSide.Right
 * 
 * // Check if side is enabled
 * const hasTop = hasSide(sides, BorderSide.Top)
 * ```
 */
export enum BorderSide {
  None = 0,
  Top = 1 << 0,    // 1
  Right = 1 << 1,  // 2
  Bottom = 1 << 2, // 4
  Left = 1 << 3,   // 8
  All = Top | Right | Bottom | Left // 15
}

/**
 * Check if a specific border side is enabled
 * 
 * Uses bitwise AND to test if a side is present in the sides bitflag.
 * 
 * @param sides - Combined border sides to test
 * @param side - Specific side to check for
 * @returns True if the side is enabled
 * 
 * @example
 * ```typescript
 * const sides = BorderSide.Top | BorderSide.Bottom
 * hasSide(sides, BorderSide.Top) // true
 * hasSide(sides, BorderSide.Left) // false
 * ```
 */
export const hasSide = (sides: BorderSide, side: BorderSide): boolean =>
  (sides & side) === side

/**
 * Combine multiple border sides using bitwise OR
 * 
 * @param sides - Border sides to combine
 * @returns Combined border sides
 * 
 * @example
 * ```typescript
 * const topAndBottom = combineSides(BorderSide.Top, BorderSide.Bottom)
 * const allSides = combineSides(BorderSide.Top, BorderSide.Right, BorderSide.Bottom, BorderSide.Left)
 * ```
 */
export const combineSides = (...sides: BorderSide[]): BorderSide =>
  sides.reduce((acc, side) => acc | side, BorderSide.None)

// =============================================================================
// Border Factory
// =============================================================================

/**
 * Create a border with the same character for all positions
 * 
 * Useful for simple borders like blocks or basic decorative elements.
 * 
 * @param char - Character to use for all border positions
 * @returns Border with uniform character
 * 
 * @internal
 */
const createUniformBorder = (char: string): Border => ({
  top: char,
  bottom: char,
  left: char,
  right: char,
  topLeft: char,
  topRight: char,
  bottomLeft: char,
  bottomRight: char
})

/**
 * Create a custom border with specified characters
 * 
 * Allows creation of custom borders by specifying individual characters
 * for each position. Missing characters default to spaces.
 * 
 * @param chars - Partial border specification
 * @returns Complete border with defaults filled in
 * 
 * @example
 * ```typescript
 * const customBorder = createBorder({
 *   top: '-', bottom: '-',
 *   left: '|', right: '|',
 *   topLeft: '+', topRight: '+',
 *   bottomLeft: '+', bottomRight: '+'
 * })
 * ```
 */
export const createBorder = (chars: Partial<Border>): Border => ({
  top: chars.top ?? " ",
  bottom: chars.bottom ?? " ",
  left: chars.left ?? " ",
  right: chars.right ?? " ",
  topLeft: chars.topLeft ?? " ",
  topRight: chars.topRight ?? " ",
  bottomLeft: chars.bottomLeft ?? " ",
  bottomRight: chars.bottomRight ?? " ",
  middleLeft: chars.middleLeft,
  middleRight: chars.middleRight,
  middleTop: chars.middleTop,
  middleBottom: chars.middleBottom,
  middle: chars.middle
})

// =============================================================================
// Predefined Borders
// =============================================================================

/**
 * Collection of predefined border styles
 * 
 * Provides common border styles for immediate use, covering the most
 * frequent terminal UI needs. Each style is optimized for readability
 * and terminal compatibility.
 * 
 * Available styles:
 * - **None**: Invisible border (spacing only)
 * - **Normal**: Standard box-drawing characters
 * - **Rounded**: Rounded corners for modern appearance
 * - **Thick**: Bold/thick border for emphasis
 * - **Double**: Double-line border for strong separation
 * - **ASCII**: ASCII-only border for compatibility
 * - **Block**: Solid block border for strong visual impact
 * - **Minimal**: Corner-only border for subtle framing
 * 
 * @example
 * ```typescript
 * const content = ['Hello', 'World']
 * const normalBox = renderBox(content, Borders.Normal)
 * const roundedBox = renderBox(content, Borders.Rounded)
 * ```
 */
export const Borders = {
  /**
   * No visible border (spaces)
   */
  None: createUniformBorder(" "),
  
  /**
   * Standard box-drawing border
   * ┌─┐
   * │ │
   * └─┘
   */
  Normal: {
    top: "─",
    bottom: "─",
    left: "│",
    right: "│",
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    middleLeft: "├",
    middleRight: "┤",
    middleTop: "┬",
    middleBottom: "┴",
    middle: "┼"
  },
  
  /**
   * Rounded corner border
   * ╭─╮
   * │ │
   * ╰─╯
   */
  Rounded: {
    top: "─",
    bottom: "─",
    left: "│",
    right: "│",
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    middleLeft: "├",
    middleRight: "┤",
    middleTop: "┬",
    middleBottom: "┴",
    middle: "┼"
  },
  
  /**
   * Thick/bold border
   * ┏━┓
   * ┃ ┃
   * ┗━┛
   */
  Thick: {
    top: "━",
    bottom: "━",
    left: "┃",
    right: "┃",
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    middleLeft: "┣",
    middleRight: "┫",
    middleTop: "┳",
    middleBottom: "┻",
    middle: "╋"
  },
  
  /**
   * Double-line border
   * ╔═╗
   * ║ ║
   * ╚═╝
   */
  Double: {
    top: "═",
    bottom: "═",
    left: "║",
    right: "║",
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    middleLeft: "╠",
    middleRight: "╣",
    middleTop: "╦",
    middleBottom: "╩",
    middle: "╬"
  },
  
  /**
   * Classic ASCII border
   * +-+
   * | |
   * +-+
   */
  ASCII: {
    top: "-",
    bottom: "-",
    left: "|",
    right: "|",
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    middleLeft: "+",
    middleRight: "+",
    middleTop: "+",
    middleBottom: "+",
    middle: "+"
  },
  
  
  /**
   * Block border (solid blocks)
   * ███
   * █ █
   * ███
   */
  Block: {
    top: "█",
    bottom: "█",
    left: "█",
    right: "█",
    topLeft: "█",
    topRight: "█",
    bottomLeft: "█",
    bottomRight: "█"
  },
  
  /**
   * Minimal border (only corners)
   * ┌ ┐
   *    
   * └ ┘
   */
  Minimal: {
    top: " ",
    bottom: " ",
    left: " ",
    right: " ",
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘"
  },
  
} as const

// =============================================================================
// Border Utilities
// =============================================================================

/**
 * Get the character for a specific position considering which sides are enabled
 * 
 * This function handles the complex logic of determining which character to use
 * at each border position based on which sides are enabled. It intelligently
 * handles corner cases where only some adjacent sides are enabled.
 * 
 * @param border - Border style to use
 * @param position - Position within the border (e.g., 'topLeft', 'top')
 * @param sides - Which border sides are enabled
 * @returns Appropriate character for the position, or space if not applicable
 * 
 * @example
 * ```typescript
 * // Get top-left corner when only top side is enabled
 * const char = getBorderChar(Borders.Normal, 'topLeft', BorderSide.Top)
 * // Returns the top character since left side is not enabled
 * ```
 */
export const getBorderChar = (
  border: Border,
  position: keyof Border,
  sides: BorderSide
): string => {
  // If no sides are enabled, return empty
  if (sides === BorderSide.None) return " "
  
  // Handle corners based on which sides are enabled
  switch (position) {
    case "topLeft":
      if (!hasSide(sides, BorderSide.Top) && !hasSide(sides, BorderSide.Left)) return " "
      if (!hasSide(sides, BorderSide.Top)) return border.left
      if (!hasSide(sides, BorderSide.Left)) return border.top
      return border.topLeft
      
    case "topRight":
      if (!hasSide(sides, BorderSide.Top) && !hasSide(sides, BorderSide.Right)) return " "
      if (!hasSide(sides, BorderSide.Top)) return border.right
      if (!hasSide(sides, BorderSide.Right)) return border.top
      return border.topRight
      
    case "bottomLeft":
      if (!hasSide(sides, BorderSide.Bottom) && !hasSide(sides, BorderSide.Left)) return " "
      if (!hasSide(sides, BorderSide.Bottom)) return border.left
      if (!hasSide(sides, BorderSide.Left)) return border.bottom
      return border.bottomLeft
      
    case "bottomRight":
      if (!hasSide(sides, BorderSide.Bottom) && !hasSide(sides, BorderSide.Right)) return " "
      if (!hasSide(sides, BorderSide.Bottom)) return border.right
      if (!hasSide(sides, BorderSide.Right)) return border.bottom
      return border.bottomRight
      
    case "top":
      return hasSide(sides, BorderSide.Top) ? border.top : " "
      
    case "bottom":
      return hasSide(sides, BorderSide.Bottom) ? border.bottom : " "
      
    case "left":
      return hasSide(sides, BorderSide.Left) ? border.left : " "
      
    case "right":
      return hasSide(sides, BorderSide.Right) ? border.right : " "
      
    default:
      return border[position] ?? " "
  }
}

/**
 * Render a box with the specified border around content
 * 
 * Creates a bordered box around the provided content lines, with intelligent
 * width calculation and ANSI escape sequence support. The function handles
 * content padding and alignment automatically.
 * 
 * @param content - Array of content lines to border
 * @param border - Border style to use
 * @param sides - Which sides to render (defaults to all)
 * @param width - Fixed width for the box (auto-calculated if not provided)
 * @returns Array of lines with border applied
 * 
 * @example
 * ```typescript
 * const content = ['Hello', 'World']
 * const boxed = renderBox(content, Borders.Rounded)
 * // ╭─────╮
 * // │Hello│
 * // │World│
 * // ╰─────╯
 * 
 * // Only top and bottom borders
 * const partial = renderBox(content, Borders.Normal, BorderSide.Top | BorderSide.Bottom)
 * // ┌─────┐
 * // Hello
 * // World
 * // └─────┘
 * ```
 */
export const renderBox = (
  content: string[],
  border: Border,
  sides: BorderSide = BorderSide.All,
  width?: number
): string[] => {
  if (content.length === 0) return []
  
  // Calculate the maximum content width using stringWidth for ANSI support
  const contentWidth = width ?? Math.max(...content.map(line => stringWidth(line)))
  
  const result: string[] = []
  
  // Top border
  if (hasSide(sides, BorderSide.Top)) {
    const topLine = 
      getBorderChar(border, "topLeft", sides) +
      getBorderChar(border, "top", sides).repeat(contentWidth) +
      getBorderChar(border, "topRight", sides)
    result.push(topLine)
  }
  
  // Content with side borders
  for (const line of content) {
    // Pad to visual width, accounting for ANSI escape sequences
    const currentWidth = stringWidth(line)
    const padding = Math.max(0, contentWidth - currentWidth)
    const paddedLine = line + ' '.repeat(padding)
    
    const contentLine =
      getBorderChar(border, "left", sides) +
      paddedLine +
      getBorderChar(border, "right", sides)
    result.push(contentLine)
  }
  
  // Bottom border
  if (hasSide(sides, BorderSide.Bottom)) {
    const bottomLine =
      getBorderChar(border, "bottomLeft", sides) +
      getBorderChar(border, "bottom", sides).repeat(contentWidth) +
      getBorderChar(border, "bottomRight", sides)
    result.push(bottomLine)
  }
  
  return result
}

/**
 * Merge two borders with overlay taking precedence
 * 
 * Combines two border styles, with the overlay border's non-undefined
 * values taking precedence over the base border. Useful for creating
 * variations of existing borders or applying selective modifications.
 * 
 * @param base - Base border style
 * @param overlay - Border modifications to apply
 * @returns Merged border with overlay values taking precedence
 * 
 * @example
 * ```typescript
 * // Create a normal border with custom corners
 * const customBorder = mergeBorders(Borders.Normal, {
 *   topLeft: '*',
 *   topRight: '*',
 *   bottomLeft: '*',
 *   bottomRight: '*'
 * })
 * ```
 */
export const mergeBorders = (base: Border, overlay: Partial<Border>): Border => ({
  top: overlay.top ?? base.top,
  bottom: overlay.bottom ?? base.bottom,
  left: overlay.left ?? base.left,
  right: overlay.right ?? base.right,
  topLeft: overlay.topLeft ?? base.topLeft,
  topRight: overlay.topRight ?? base.topRight,
  bottomLeft: overlay.bottomLeft ?? base.bottomLeft,
  bottomRight: overlay.bottomRight ?? base.bottomRight,
  middleLeft: overlay.middleLeft ?? base.middleLeft,
  middleRight: overlay.middleRight ?? base.middleRight,
  middleTop: overlay.middleTop ?? base.middleTop,
  middleBottom: overlay.middleBottom ?? base.middleBottom,
  middle: overlay.middle ?? base.middle
})

/**
 * Create a border from a string pattern
 * 
 * Parses a string pattern to create a border. The pattern should contain
 * exactly 8 characters representing border positions in a specific order:
 * topLeft, top, topRight, left, right, bottomLeft, bottom, bottomRight.
 * 
 * @param pattern - 8-character string defining border positions
 * @returns Border created from the pattern
 * @throws Error if pattern is less than 8 characters
 * 
 * @example
 * ```typescript
 * // Create a rounded border: ╭─╮│ │╰─╯
 * const rounded = borderFromPattern('╭─╮│ │╰─╯')
 * //                                ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑
 * //                                1 2 3 4 5 6 7 8
 * 
 * // Create ASCII border: +-+| |+-+
 * const ascii = borderFromPattern('+-+| |+-+')
 * ```
 */
export const borderFromPattern = (pattern: string): Border => {
  if (pattern.length < 8) {
    throw new Error("Border pattern must have at least 8 characters")
  }
  
  return {
    topLeft: pattern[0] ?? '',
    top: pattern[1] ?? '',
    topRight: pattern[2] ?? '',
    left: pattern[3] ?? '',
    right: pattern[4] ?? '',
    bottomLeft: pattern[5] ?? '',
    bottom: pattern[6] ?? '',
    bottomRight: pattern[7] ?? ''
  }
}