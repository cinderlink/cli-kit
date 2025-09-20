/**
 * Style Rendering - Apply styles to text content
 * 
 * This module handles the actual rendering of styled text,
 * converting Style objects into ANSI escape sequences and
 * handling layout properties like padding, borders, and alignment.
 */

import { Effect, pipe } from "effect"
import { stringWidth } from "@/utils/string-width.ts"
import { type Style, style as createStyle } from "./style.ts"
import { type Color, ColorProfile, toAnsiSequence } from "./color.ts"
import { type Border, BorderSide, renderBox, getBorderChar } from "./borders.ts"
import { HorizontalAlign, VerticalAlign } from "./types.ts"

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
const HIDDEN = "\x1b[8m"

const ensureStyle = (input: Style | ((...args: any[]) => any) | null | undefined): Style => {
  if (!input) {
    return ensureStyle(createStyle())
  }
  if (typeof input === 'function') {
    try {
      const result = input()
      return ensureStyle(result)
    } catch {
      return ensureStyle(createStyle())
    }
  }
  const raw = (input as any)?.__style__
  if (raw) {
    return ensureStyle(raw)
  }
  return input as Style
}

const extractDecorationHints = (input: any): Record<string, boolean> => {
  if (!input) {
    return {}
  }
  if (typeof input === 'function') {
    try {
      return extractDecorationHints(input())
    } catch {
      return {}
    }
  }

  const raw = input?.__style__
  if (raw) {
    return extractDecorationHints(raw)
  }

  const get = typeof input?.get === 'function' ? input.get.bind(input) : undefined
  const props = (input as any)?.props as Record<string, any> | undefined

  const read = (key: string): boolean => {
    if (get) {
      try {
        const value = get(key as any)
        if (value !== undefined) {
          return !!value
        }
      } catch {
        // ignore
      }
    }
    return !!props?.[key]
  }

  return {
    bold: read('bold'),
    faint: read('faint') || read('dim'),
    italic: read('italic'),
    underline: read('underline'),
    blink: read('blink'),
    inverse: read('inverse') || read('reverse'),
    strikethrough: read('strikethrough'),
    hidden: read('hidden'),
    foreground: read('foreground') || read('color'),
    background: read('background') || read('backgroundColor')
  }
}

// =============================================================================
// Text Transformation
// =============================================================================

/**
 * Apply text transformation based on style
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
// Text Alignment
// =============================================================================

/**
 * Apply horizontal alignment to a line of text
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
      // Simple justify - distribute spaces between words
      const words = line.split(" ")
      if (words.length <= 1) return line
      
      const gaps = words.length - 1
      const spacePerGap = Math.floor(space / gaps)
      const extraSpaces = space % gaps
      
      let result = words[0]
      for (let i = 1; i < words.length; i++) {
        const spaces = spacePerGap + (i <= extraSpaces ? 1 : 0)
        result += " ".repeat(spaces + 1) + words[i]
      }
      return result
  }
}

/**
 * Apply vertical alignment to content
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
      return [...lines, ...Array(space).fill("")]
      
    case VerticalAlign.Bottom:
      return [...Array(space).fill(""), ...lines]
      
    case VerticalAlign.Middle: {
      const top = Math.floor(space / 2)
      const bottom = space - top
      return [
        ...Array(top).fill(""),
        ...lines,
        ...Array(bottom).fill("")
      ]
    }
  }
}

// =============================================================================
// Padding Application
// =============================================================================

/**
 * Apply padding to content
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
    ...Array(top).fill(emptyLine),
    ...paddedLines,
    ...Array(bottom).fill(emptyLine)
  ]
}

// =============================================================================
// Border Application
// =============================================================================

/**
 * Apply border to content
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
  if (style.get("hidden")) sequence += HIDDEN

  return sequence
}

const buildDecorationFromProps = (props: Record<string, any> | undefined): string => {
  if (!props) return ""
  let sequence = ""
  if (props.bold) sequence += BOLD
  if (props.faint || props.dim) sequence += FAINT
  if (props.italic) sequence += ITALIC
  if (props.underline) sequence += UNDERLINE
  if (props.blink) sequence += BLINK
  if (props.inverse || props.reverse) sequence += INVERSE
  if (props.strikethrough) sequence += STRIKETHROUGH
  if (props.hidden) sequence += HIDDEN
  return sequence
}

/**
 * Apply color and decoration to text
 */
const applyColors = (
  text: string,
  style: Style,
  colorProfile: ColorProfile,
  decorationHints: Record<string, boolean>
): string => {
  const fg = style.get("foreground")
  const bg = style.get("background")
  const props = (style as any).props as Record<string, any> | undefined

  if (text.length === 0) {
    let sequence = ""
    if (style.get("bold") || props?.bold || decorationHints.bold) sequence += BOLD
    if (style.get("faint") || props?.faint || props?.dim || decorationHints.faint) sequence += FAINT
    if (style.get("italic") || props?.italic || decorationHints.italic) sequence += ITALIC
    if (style.get("underline") || props?.underline || decorationHints.underline) sequence += UNDERLINE
    if (style.get("blink") || props?.blink || decorationHints.blink) sequence += BLINK
    if (style.get("inverse") || props?.inverse || props?.reverse || decorationHints.inverse) sequence += INVERSE
    if (style.get("strikethrough") || props?.strikethrough || decorationHints.strikethrough) sequence += STRIKETHROUGH
    if (style.get("hidden") || props?.hidden || decorationHints.hidden) sequence += HIDDEN

    if (sequence) {
      return sequence + RESET
    }
    if (fg || bg || props?.foreground || props?.background || decorationHints.foreground || decorationHints.background) {
      return ""
    }
    return text
  }

  let decorations = buildDecorationSequence(style)
  if (!decorations) {
    decorations = buildDecorationFromProps(props)
  }

  let sequence = ""

  if (fg) {
    sequence += toAnsiSequence(fg, colorProfile, false)
  }

  if (bg) {
    sequence += toAnsiSequence(bg, colorProfile, true)
  }

  sequence += decorations

  if (!sequence) return text

  // Apply sequence and reset at the end
  // For inline styles, use aggressive reset to prevent bleeding
  const reset = style.get("inline") ? RESET : RESET
  return sequence + text + reset
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
  styleInput: Style | ((...args: any[]) => any) | null | undefined,
  options: {
    colorProfile?: ColorProfile
    width?: number
    height?: number
  } = {}
): Effect.Effect<string, never, never> => {
  const effect = Effect.gen(function* (_) {
    const colorProfile = options.colorProfile ?? ColorProfile.TrueColor
    const style = ensureStyle(styleInput)
    const inputHints = extractDecorationHints(styleInput)
    const styleHints = extractDecorationHints(style)
    const combinedHints = {
      bold: inputHints.bold || styleHints.bold,
      faint: inputHints.faint || styleHints.faint,
      italic: inputHints.italic || styleHints.italic,
      underline: inputHints.underline || styleHints.underline,
      blink: inputHints.blink || styleHints.blink,
      inverse: inputHints.inverse || styleHints.inverse,
      strikethrough: inputHints.strikethrough || styleHints.strikethrough,
      hidden: inputHints.hidden || styleHints.hidden,
      foreground: inputHints.foreground || styleHints.foreground,
      background: inputHints.background || styleHints.background
    }

    if (text.length === 0) {
      let sequence = ""
      if (combinedHints.bold) sequence += BOLD
      if (combinedHints.faint) sequence += FAINT
      if (combinedHints.italic) sequence += ITALIC
      if (combinedHints.underline) sequence += UNDERLINE
      if (combinedHints.blink) sequence += BLINK
      if (combinedHints.inverse) sequence += INVERSE
      if (combinedHints.strikethrough) sequence += STRIKETHROUGH
      if (combinedHints.hidden) sequence += HIDDEN

      if (sequence) {
        return sequence + RESET
      }
      if (combinedHints.foreground || combinedHints.background) {
        return ''
      }
      return ''
    }

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
      applyColors(line, style, colorProfile, combinedHints)
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
        ...Array(top).fill(""),
        ...margined,
        ...Array(bottom).fill("")
      ]
      
      return result.join("\n")
    }
    
    return styledLines.join("\n")
  })

  const enhanced: any = effect
  enhanced.pipe = (fn: any) => {
    const run = Effect.runPromise(effect)
    if (typeof fn !== 'function') {
      return run
    }
    return run.then(value => fn(value))
  }

  return enhanced
}

/**
 * Render styled text synchronously (for simple cases)
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
  return Effect.runSync(renderStyled(text, style, options))
}
