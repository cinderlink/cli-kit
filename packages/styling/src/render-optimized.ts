/**
 * Optimized Style Rendering - Performance-optimized rendering with caching
 * 
 * This module provides a high-performance alternative to the standard rendering
 * system by implementing aggressive caching and pre-computed ANSI codes.
 * 
 * Key optimizations:
 * - ANSI code caching with string-based keys
 * - Pre-computed common style codes
 * - Fast RGB to ANSI256 conversion
 * - Minimal object allocations
 * 
 * @module styling/render-optimized
 */

import type { StyleProps } from "./types"
import type { Color } from "./color"
import { toAnsiSequence, ColorProfile } from "./color"

/**
 * Cache for rendered ANSI codes
 * 
 * @internal
 */
const ansiCache = new Map<string, string>()

/**
 * Pre-computed ANSI codes for text decorations
 * 
 * These codes are used frequently and pre-computing them
 * avoids string concatenation overhead.
 * 
 * @internal
 */
const ANSI_CODES = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  faint: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  strikethrough: '\x1b[9m',
} as const

/**
 * Fast style key generation for caching
 * 
 * Generates a unique string key for a style configuration to enable
 * efficient cache lookups. The key format is optimized for string
 * comparison performance.
 * 
 * @param style - Style properties to generate key for
 * @returns Cache key string
 * 
 * @internal
 */
function generateStyleKey(style: StyleProps): string {
  const parts: string[] = []
  
  if (style.foreground) {
    const color = style.foreground
    if (color._tag === 'RGB') {
      parts.push(`fg:rgb(${color.r},${color.g},${color.b})`)
    } else if (color._tag === 'Hex') {
      parts.push(`fg:${color.value}`)
    } else if (color._tag === 'ANSI') {
      parts.push(`fg:ansi${color.code}`)
    } else if (color._tag === 'ANSI256') {
      parts.push(`fg:ansi256-${color.code}`)
    }
  }
  if (style.background) {
    const color = style.background
    if (color._tag === 'RGB') {
      parts.push(`bg:rgb(${color.r},${color.g},${color.b})`)
    } else if (color._tag === 'Hex') {
      parts.push(`bg:${color.value}`)
    } else if (color._tag === 'ANSI') {
      parts.push(`bg:ansi${color.code}`)
    } else if (color._tag === 'ANSI256') {
      parts.push(`bg:ansi256-${color.code}`)
    }
  }
  if (style.bold) parts.push('bold')
  if (style.faint) parts.push('faint')
  if (style.italic) parts.push('italic')
  if (style.underline) parts.push('underline')
  if (style.inverse) parts.push('inverse')
  if (style.strikethrough) parts.push('strike')
  
  return parts.join('|')
}


/**
 * Fast ANSI code generation with caching
 * 
 * Generates ANSI escape sequences for a style configuration with
 * aggressive caching to minimize redundant computations.
 * 
 * @param style - Style properties to render
 * @returns ANSI escape sequence string
 * 
 * @example
 * ```typescript
 * const codes = renderStyleOptimized({
 *   foreground: Colors.red,
 *   bold: true
 * })
 * // Returns: "\x1b[31m\x1b[1m"
 * ```
 */
export function renderStyleOptimized(style: StyleProps): string {
  if (!style || Object.keys(style).length === 0) {
    return ''
  }
  
  const key = generateStyleKey(style)
  
  // Check cache first
  const cached = ansiCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  
  const codes: string[] = []
  
  // Foreground color
  if (style.foreground) {
    const ansiSeq = toAnsiSequence(style.foreground, ColorProfile.ANSI256, false)
    if (ansiSeq) {
      codes.push(ansiSeq)
    }
  }
  
  // Background color
  if (style.background) {
    const ansiSeq = toAnsiSequence(style.background, ColorProfile.ANSI256, true)
    if (ansiSeq) {
      codes.push(ansiSeq)
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
  ansiCache.set(key, result)
  
  return result
}

/**
 * Optimized text styling that minimizes ANSI code generation
 * 
 * Applies style to text with minimal overhead by leveraging the
 * optimized rendering pipeline and caching.
 * 
 * @param text - Text content to style
 * @param style - Style properties to apply
 * @returns Styled text with ANSI escape sequences
 * 
 * @example
 * ```typescript
 * const styled = styledTextOptimized("Hello", {
 *   foreground: Colors.blue,
 *   bold: true
 * })
 * // Returns: "\x1b[34m\x1b[1mHello\x1b[0m"
 * ```
 */
export function styledTextOptimized(text: string, style: StyleProps): string {
  if (!text) return ''
  if (!style || Object.keys(style).length === 0) return text
  
  const openCodes = renderStyleOptimized(style)
  if (!openCodes) return text
  
  return `${openCodes}${text}${ANSI_CODES.reset}`
}

/**
 * Clear the ANSI cache (useful for memory management)
 * 
 * Removes all cached ANSI sequences. This should be called when:
 * - Memory usage needs to be reduced
 * - Cache size grows too large
 * - Application is shutting down
 * 
 * @example
 * ```typescript
 * // Clear cache when it gets too large
 * if (getStyleCacheStats().size > 10000) {
 *   clearStyleCache()
 * }
 * ```
 */
export function clearStyleCache(): void {
  ansiCache.clear()
}

/**
 * Get cache statistics
 * 
 * Returns information about the current state of the style cache.
 * Useful for monitoring performance and debugging cache behavior.
 * 
 * @returns Object containing cache size and entry keys
 * 
 * @example
 * ```typescript
 * const stats = getStyleCacheStats()
 * console.log(`Cache size: ${stats.size} entries`)
 * ```
 */
export function getStyleCacheStats() {
  return {
    size: ansiCache.size,
    entries: Array.from(ansiCache.keys())
  }
}