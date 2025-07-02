/**
 * Border System - Comprehensive border styles for UI components
 * 
 * Inspired by Lipgloss's border system with support for:
 * - Multiple border styles (normal, rounded, thick, double, etc.)
 * - Partial borders (only specific sides)
 * - Custom border characters
 * - Border inheritance and composition
 */

import { stringWidth } from "@/utils/string-width.ts"

import { Data } from "effect"

// =============================================================================
// Border Types
// =============================================================================

/**
 * Border representation with all possible border characters
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
 * Uses bitflags for efficient combination
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
 * Helper to check if a side is enabled
 */
export const hasSide = (sides: BorderSide, side: BorderSide): boolean =>
  (sides & side) === side

/**
 * Helper to combine border sides
 */
export const combineSides = (...sides: BorderSide[]): BorderSide =>
  sides.reduce((acc, side) => acc | side, BorderSide.None)

// =============================================================================
// Border Factory
// =============================================================================

/**
 * Create a border with the same character for all positions
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
   * Dotted border
   * ·─·
   * │ │
   * ·─·
   */
  Dotted: {
    top: "─",
    bottom: "─",
    left: "│",
    right: "│",
    topLeft: "·",
    topRight: "·",
    bottomLeft: "·",
    bottomRight: "·"
  },
  
  /**
   * Dashed border
   * ┌╌┐
   * ╎ ╎
   * └╌┘
   */
  Dashed: {
    top: "╌",
    bottom: "╌",
    left: "╎",
    right: "╎",
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘"
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
  
  /**
   * Hidden border (no characters, but preserves spacing)
   * Useful for alignment without visible borders
   */
  Hidden: createUniformBorder("\x00")
} as const

// =============================================================================
// Border Utilities
// =============================================================================

/**
 * Get the character for a specific position considering which sides are enabled
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
 * Render a box with the specified border
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
 * Merge two borders, with the second border taking precedence for non-empty values
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
 * Useful for quick custom borders
 * 
 * @example
 * borderFromPattern("╭─╮│ │╰─╯") creates a rounded border
 */
export const borderFromPattern = (pattern: string): Border => {
  if (pattern.length < 8) {
    throw new Error("Border pattern must have at least 8 characters")
  }
  
  return {
    topLeft: pattern[0],
    top: pattern[1],
    topRight: pattern[2],
    left: pattern[3],
    right: pattern[4],
    bottomLeft: pattern[5],
    bottom: pattern[6],
    bottomRight: pattern[7]
  }
}