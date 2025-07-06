/**
 * Optimized Style Rendering
 * 
 * Performance-optimized version of style rendering with caching
 */

import type { StyleDefinition } from "./types"

// Cache for rendered ANSI codes
const ANSI_CACHE = new Map<string, string>()

// Pre-computed ANSI codes for common styles
const ANSI_CODES = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  faint: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  strikethrough: '\x1b[9m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Background colors  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const

/**
 * Fast style key generation for caching
 */
function generateStyleKey(style: StyleDefinition): string {
  const parts: string[] = []
  
  if (style.foreground) parts.push(`fg:${style.foreground}`)
  if (style.background) parts.push(`bg:${style.background}`)
  if (style.bold) parts.push('bold')
  if (style.faint) parts.push('faint')
  if (style.italic) parts.push('italic')
  if (style.underline) parts.push('underline')
  if (style.inverse) parts.push('inverse')
  if (style.strikethrough) parts.push('strike')
  
  return parts.join('|')
}

/**
 * Convert RGB to ANSI 256-color code
 */
function rgbToAnsi256(r: number, g: number, b: number): number {
  // Convert to 6x6x6 color cube
  const rIndex = Math.round((r / 255) * 5)
  const gIndex = Math.round((g / 255) * 5)
  const bIndex = Math.round((b / 255) * 5)
  
  return 16 + (36 * rIndex) + (6 * gIndex) + bIndex
}

/**
 * Fast ANSI code generation with caching
 */
export function renderStyleOptimized(style: StyleDefinition): string {
  if (!style || Object.keys(style).length === 0) {
    return ''
  }
  
  const key = generateStyleKey(style)
  
  // Check cache first
  const cached = ANSI_CACHE.get(key)
  if (cached !== undefined) {
    return cached
  }
  
  const codes: string[] = []
  
  // Foreground color
  if (style.foreground) {
    const fgColor = String(style.foreground)
    if (fgColor.startsWith('#')) {
      // RGB hex color
      const r = parseInt(fgColor.slice(1, 3), 16)
      const g = parseInt(fgColor.slice(3, 5), 16)
      const b = parseInt(fgColor.slice(5, 7), 16)
      const colorCode = rgbToAnsi256(r, g, b)
      codes.push(`\x1b[38;5;${colorCode}m`)
    } else if (fgColor.startsWith('rgb(')) {
      // RGB function
      const match = fgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match
        const colorCode = rgbToAnsi256(parseInt(r), parseInt(g), parseInt(b))
        codes.push(`\x1b[38;5;${colorCode}m`)
      }
    } else {
      // Named color
      const ansiCode = ANSI_CODES[fgColor as keyof typeof ANSI_CODES]
      if (ansiCode) {
        codes.push(ansiCode)
      }
    }
  }
  
  // Background color
  if (style.background) {
    const bgColor = String(style.background)
    if (bgColor.startsWith('#')) {
      // RGB hex color
      const r = parseInt(bgColor.slice(1, 3), 16)
      const g = parseInt(bgColor.slice(3, 5), 16)
      const b = parseInt(bgColor.slice(5, 7), 16)
      const colorCode = rgbToAnsi256(r, g, b)
      codes.push(`\x1b[48;5;${colorCode}m`)
    } else if (bgColor.startsWith('rgb(')) {
      // RGB function
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match
        const colorCode = rgbToAnsi256(parseInt(r), parseInt(g), parseInt(b))
        codes.push(`\x1b[48;5;${colorCode}m`)
      }
    } else {
      // Named background color
      const bgColorName = `bg${bgColor.charAt(0).toUpperCase()}${bgColor.slice(1)}`
      const ansiCode = ANSI_CODES[bgColorName as keyof typeof ANSI_CODES]
      if (ansiCode) {
        codes.push(ansiCode)
      }
    }
  }
  
  // Text decorations
  if (style.bold) codes.push(ANSI_CODES.bold)
  if (style.faint) codes.push(ANSI_CODES.faint)
  if (style.italic) codes.push(ANSI_CODES.italic)
  if (style.underline) codes.push(ANSI_CODES.underline)
  if (style.inverse) codes.push(ANSI_CODES.inverse)
  if (style.strikethrough) codes.push(ANSI_CODES.strikethrough)
  
  const result = codes.join('')
  
  // Cache the result
  ANSI_CACHE.set(key, result)
  
  return result
}

/**
 * Optimized text styling that minimizes ANSI code generation
 */
export function styledTextOptimized(text: string, style: StyleDefinition): string {
  if (!text) return ''
  if (!style || Object.keys(style).length === 0) return text
  
  const openCodes = renderStyleOptimized(style)
  if (!openCodes) return text
  
  return `${openCodes}${text}${ANSI_CODES.reset}`
}

/**
 * Clear the ANSI cache (useful for memory management)
 */
export function clearStyleCache(): void {
  ANSI_CACHE.clear()
}

/**
 * Get cache statistics
 */
export function getStyleCacheStats() {
  return {
    size: ANSI_CACHE.size,
    entries: Array.from(ANSI_CACHE.keys())
  }
}