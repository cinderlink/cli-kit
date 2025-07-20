/**
 * Style Rendering - Apply styles to text content
 * 
 * This module handles the actual rendering of styled text,
 * converting Style objects into ANSI escape sequences and
 * handling layout properties like padding, borders, and alignment.
 */

import { Effect, pipe } from "effect"
import { stringWidth } from "@tuix/core"
import type { Style } from "./style"
import { type Color, ColorProfile, toAnsiSequence } from "./color"
import { type Border, BorderSide, renderBox, getBorderChar } from "./borders"
import { HorizontalAlign, VerticalAlign } from "./types"

// =============================================================================
// ANSI Escape Codes
// =============================================================================

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const FAINT = "\x1b[2m"
const ITALIC = "\x1b[3m"
const UNDERLINE = "\x1b[4m"
const BLINK = "\x1b[5m"
const INVERSE = "\x1b[7m"
const STRIKETHROUGH = "\x1b[9m"

// =============================================================================
// Text Transformation
// =============================================================================

/**
 * Apply text transformation based on style
 * 
 * @param text - The input text to transform
 * @param style - Style containing transform property
 * @returns Transformed text according to style.transform
 */
const applyTransform = (text: string, style: Style): string => {
  const transform = style.get("transform")
  if (!transform) return text
  
  switch (transform._tag) {
    case "none":
      return text
    case "uppercase":
      return text.toUpperCase()
    case "lowercase":
      return text.toLowerCase()
    case "capitalize":
      return text.replace(/\b\w/g, char => char.toUpperCase())
    case "custom":
      return transform.fn(text)
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Justify text by distributing spaces between words
 * 
 * @param line - Text line to justify
 * @param totalSpace - Total space to distribute
 * @returns Justified text
 */
const justifyText = (line: string, totalSpace: number): string => {
  const words = line.split(" ")
  if (words.length <= 1) return line
  
  const gaps = words.length - 1
  const spacePerGap = Math.floor(totalSpace / gaps)
  const extraSpaces = totalSpace % gaps
  
  let result = words[0] ?? ''
  for (let i = 1; i < words.length; i++) {
    const spaces = spacePerGap + (i <= extraSpaces ? 1 : 0)
    result += " ".repeat(spaces + 1) + (words[i] ?? '')
  }
  return result
}

/**
 * Create an array of empty lines
 * 
 * @param count - Number of lines to create
 * @param content - Content for each line (default: empty string)
 * @returns Array of lines
 */
const createEmptyLines = (count: number, content: string = ""): string[] => 
  count > 0 ? Array(count).fill(content) : []

// =============================================================================
// Text Alignment
// =============================================================================

/**
 * Apply horizontal alignment to a line of text
 * 
 * Aligns text within a fixed width using the specified alignment.
 * Supports left, right, center, and justify alignment.
 * 
 * @param line - The text line to align
 * @param width - Target width in characters
 * @param align - Alignment type
 * @returns Aligned text line
 */
const alignHorizontal = (
  line: string,
  width: number,
  align: HorizontalAlign
): string => {
  const lineWidth = stringWidth(line)
  if (lineWidth >= width) return line
  
  const space = width - lineWidth
  
  switch (align) {
    case HorizontalAlign.Left:
      return line + " ".repeat(space)
      
    case HorizontalAlign.Right:
      return " ".repeat(space) + line
      
    case HorizontalAlign.Center: {
      const left = Math.floor(space / 2)
      const right = space - left
      return " ".repeat(left) + line + " ".repeat(right)
    }
    
    case HorizontalAlign.Justify:
      return justifyText(line, space)
  }
}

/**
 * Apply vertical alignment to content
 * 
 * Aligns content within a fixed height by adding empty lines.
 * Supports top, middle, and bottom alignment.
 * 
 * @param lines - Array of text lines
 * @param height - Target height in lines
 * @param align - Vertical alignment type
 * @returns Array of aligned lines
 */
const alignVertical = (
  lines: string[],
  height: number,
  align: VerticalAlign
): string[] => {
  if (lines.length >= height) return lines.slice(0, height)
  
  const space = height - lines.length
  
  switch (align) {
    case VerticalAlign.Top:
      return [...lines, ...createEmptyLines(space)]
      
    case VerticalAlign.Bottom:
      return [...createEmptyLines(space), ...lines]
      
    case VerticalAlign.Middle: {
      const top = Math.floor(space / 2)
      const bottom = space - top
      return [
        ...createEmptyLines(top),
        ...lines,
        ...createEmptyLines(bottom)
      ]
    }
  }
}

// =============================================================================
// Padding Application
// =============================================================================

/**
 * Apply padding to content
 * 
 * Adds space around content based on padding configuration.
 * Horizontal padding adds spaces, vertical padding adds empty lines.
 * 
 * @param lines - Array of text lines
 * @param style - Style containing padding property
 * @returns Array of padded lines
 */
const applyPadding = (lines: string[], style: Style): string[] => {
  const padding = style.get("padding")
  if (!padding) return lines
  
  const { top, right, bottom, left } = padding
  
  // Add horizontal padding
  const paddedLines = lines.map(line => 
    " ".repeat(left) + line + " ".repeat(right)
  )
  
  // Add vertical padding
  const width = paddedLines[0]?.length || 0
  const emptyLine = " ".repeat(width)
  
  return [
    ...createEmptyLines(top, emptyLine),
    ...paddedLines,
    ...createEmptyLines(bottom, emptyLine)
  ]
}

// =============================================================================
// Border Application
// =============================================================================

/**
 * Apply border to content
 * 
 * Wraps content with a border using the specified border style.
 * Supports partial borders through borderSides property.
 * 
 * @param lines - Array of text lines
 * @param style - Style containing border properties
 * @returns Array of lines with border applied
 */
const applyBorder = (lines: string[], style: Style): string[] => {
  const border = style.get("border")
  const sides = style.get("borderSides") ?? BorderSide.All
  
  if (!border || sides === BorderSide.None) return lines
  
  return renderBox(lines, border, sides)
}

// =============================================================================
// Style Application
// =============================================================================

/**
 * Build ANSI escape sequence for text decoration
 * 
 * Creates a combined ANSI sequence for all text decorations
 * like bold, italic, underline, etc.
 * 
 * @param style - Style containing decoration properties
 * @returns ANSI escape sequence string
 */
const buildDecorationSequence = (style: Style): string => {
  let sequence = ""
  
  if (style.get("bold")) sequence += BOLD
  if (style.get("faint")) sequence += FAINT
  if (style.get("italic")) sequence += ITALIC
  if (style.get("underline")) sequence += UNDERLINE
  if (style.get("blink")) sequence += BLINK
  if (style.get("inverse")) sequence += INVERSE
  if (style.get("strikethrough")) sequence += STRIKETHROUGH
  
  return sequence
}

/**
 * Apply color and decoration to text
 * 
 * Applies foreground/background colors and text decorations
 * using ANSI escape sequences. Handles proper reset sequences.
 * 
 * @param text - The text to style
 * @param style - Style containing color and decoration properties
 * @param colorProfile - Color profile for ANSI sequence generation
 * @returns Text wrapped in ANSI escape sequences
 */
const applyColors = (
  text: string,
  style: Style,
  colorProfile: ColorProfile
): string => {
  let sequence = ""
  
  // Add foreground color
  const fg = style.get("foreground")
  if (fg) {
    sequence += toAnsiSequence(fg, colorProfile, false)
  }
  
  // Add background color
  const bg = style.get("background")
  if (bg) {
    sequence += toAnsiSequence(bg, colorProfile, true)
  }
  
  // Add text decorations
  sequence += buildDecorationSequence(style)
  
  if (!sequence) return text
  
  // Apply sequence and reset at the end
  return sequence + text + RESET
}

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render text with the given style
 * 
 * This is the main entry point for applying styles to text content.
 * It handles all style properties including colors, borders, padding,
 * alignment, and text transformations.
 */
export const renderStyled = (
  text: string,
  style: Style,
  options: {
    colorProfile?: ColorProfile
    width?: number
    height?: number
  } = {}
): Effect.Effect<string, never, never> =>
  Effect.gen(function* (_) {
    const colorProfile = options.colorProfile ?? ColorProfile.TrueColor
    
    // Apply text transformation
    const transformed = applyTransform(text, style)
    
    // Split into lines
    let lines = transformed.split("\n")
    
    // Apply width constraints and word wrapping if needed
    const styleWidth = style.get("width")
    const maxWidth = style.get("maxWidth")
    const effectiveWidth = options.width ?? styleWidth ?? maxWidth
    
    if (effectiveWidth) {
      lines = lines.flatMap(line => {
        if (stringWidth(line) <= effectiveWidth) return [line]
        
        // Simple word wrapping
        const words = line.split(" ")
        const wrapped: string[] = []
        let current = ""
        
        for (const word of words) {
          const test = current ? `${current} ${word}` : word
          if (stringWidth(test) <= effectiveWidth) {
            current = test
          } else {
            if (current) wrapped.push(current)
            current = word
          }
        }
        if (current) wrapped.push(current)
        
        return wrapped
      })
    }
    
    // Apply horizontal alignment
    const horizontalAlign = style.get("horizontalAlign")
    if (horizontalAlign && effectiveWidth) {
      lines = lines.map(line => 
        alignHorizontal(line, effectiveWidth, horizontalAlign)
      )
    }
    
    // Apply vertical alignment
    const styleHeight = style.get("height")
    const effectiveHeight = options.height ?? styleHeight
    const verticalAlign = style.get("verticalAlign")
    
    if (effectiveHeight && verticalAlign) {
      lines = alignVertical(lines, effectiveHeight, verticalAlign)
    }
    
    // Apply padding
    lines = applyPadding(lines, style)
    
    // Apply border
    lines = applyBorder(lines, style)
    
    // Apply colors and decorations to each line
    const styledLines = lines.map(line => 
      applyColors(line, style, colorProfile)
    )
    
    // Apply margin
    const margin = style.get("margin")
    if (margin) {
      const { top, bottom, left } = margin
      const marginLeft = " ".repeat(left)
      
      // Add left margin to each line
      const margined = styledLines.map(line => marginLeft + line)
      
      // Add vertical margins
      const result = [
        ...createEmptyLines(top),
        ...margined,
        ...createEmptyLines(bottom)
      ]
      
      return result.join("\n")
    }
    
    return styledLines.join("\n")
  })

/**
 * Render styled text synchronously (for simple cases)
 * 
 * @deprecated Use renderStyled with proper Effect handling instead
 * This function exists only for backward compatibility
 */
export const renderStyledSync = (
  text: string,
  style: Style,
  options: {
    colorProfile?: ColorProfile
    width?: number
    height?: number
  } = {}
): string => {
  // This is a simplified version that doesn't use Effect
  // For proper error handling, use renderStyled instead
  const colorProfile = options.colorProfile ?? ColorProfile.TrueColor
  
  // Apply text transformation
  const transformed = applyTransform(text, style)
  
  // For synchronous version, just apply basic styling
  let lines = transformed.split("\n")
  
  // Apply padding
  lines = applyPadding(lines, style)
  
  // Apply border
  lines = applyBorder(lines, style)
  
  // Apply colors to each line
  const styledLines = lines.map(line => 
    applyColors(line, style, colorProfile)
  )
  
  return styledLines.join("\n")
}