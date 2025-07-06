/**
 * Optimized String Width Calculation
 * 
 * Fast string width calculation with caching for terminal rendering
 */

// Cache for width calculations
const WIDTH_CACHE = new Map<string, number>()
const MAX_CACHE_SIZE = 10000

// Pre-computed width tables for common characters
const ASCII_WIDTHS = new Array(128).fill(1)
// Control characters have width 0
for (let i = 0; i < 32; i++) ASCII_WIDTHS[i] = 0
ASCII_WIDTHS[127] = 0 // DEL

// Common emoji and unicode character widths (simplified)
const WIDE_CHAR_RANGES = [
  [0x1100, 0x115F], // Hangul Jamo
  [0x2E80, 0x2EFF], // CJK Radicals Supplement
  [0x2F00, 0x2FDF], // Kangxi Radicals
  [0x3000, 0x303E], // CJK Symbols and Punctuation
  [0x3041, 0x3096], // Hiragana
  [0x30A1, 0x30FA], // Katakana
  [0x3105, 0x312D], // Bopomofo
  [0x3131, 0x318E], // Hangul Compatibility Jamo
  [0x3190, 0x31BA], // Kanbun
  [0x31C0, 0x31E3], // CJK Strokes
  [0x31F0, 0x321E], // Katakana Phonetic Extensions
  [0x3220, 0x3247], // Enclosed CJK Letters and Months
  [0x3250, 0x32FE], // Enclosed CJK Letters and Months
  [0x3300, 0x4DBF], // CJK Compatibility
  [0x4E00, 0x9FFF], // CJK Unified Ideographs
  [0xA960, 0xA97F], // Hangul Jamo Extended-A
  [0xAC00, 0xD7A3], // Hangul Syllables
  [0xF900, 0xFAFF], // CJK Compatibility Ideographs
  [0xFE10, 0xFE19], // Vertical Forms
  [0xFE30, 0xFE6F], // CJK Compatibility Forms
  [0xFF00, 0xFF60], // Fullwidth Forms
  [0xFFE0, 0xFFE6], // Fullwidth Forms
  [0x1F300, 0x1F5FF], // Miscellaneous Symbols and Pictographs
  [0x1F600, 0x1F64F], // Emoticons
  [0x1F680, 0x1F6FF], // Transport and Map Symbols
  [0x1F700, 0x1F77F], // Alchemical Symbols
  [0x1F780, 0x1F7FF], // Geometric Shapes Extended
  [0x1F800, 0x1F8FF], // Supplemental Arrows-C
  [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
]

/**
 * Check if a character code is in wide character ranges
 */
function isWideCharCode(code: number): boolean {
  for (const [start, end] of WIDE_CHAR_RANGES) {
    if (code >= start && code <= end) {
      return true
    }
  }
  return false
}

/**
 * Fast character width calculation
 */
function getCharWidth(char: string): number {
  const code = char.codePointAt(0) || 0
  
  // Fast path for ASCII
  if (code < 128) {
    return ASCII_WIDTHS[code]
  }
  
  // Check for zero-width characters
  if (
    (code >= 0x0300 && code <= 0x036F) || // Combining Diacritical Marks
    (code >= 0x1AB0 && code <= 0x1AFF) || // Combining Diacritical Marks Extended
    (code >= 0x1DC0 && code <= 0x1DFF) || // Combining Diacritical Marks Supplement
    (code >= 0x20D0 && code <= 0x20FF) || // Combining Diacritical Marks for Symbols
    (code >= 0xFE20 && code <= 0xFE2F)    // Combining Half Marks
  ) {
    return 0
  }
  
  // Check for wide characters
  if (isWideCharCode(code)) {
    return 2
  }
  
  // Default to width 1
  return 1
}

/**
 * Calculate string width with caching
 */
export function stringWidthOptimized(str: string): number {
  if (!str) return 0
  
  // Check cache first
  const cached = WIDTH_CACHE.get(str)
  if (cached !== undefined) {
    return cached
  }
  
  let width = 0
  
  // Fast path for ASCII-only strings
  if (/^[\x00-\x7F]*$/.test(str)) {
    for (let i = 0; i < str.length; i++) {
      width += ASCII_WIDTHS[str.charCodeAt(i)]
    }
  } else {
    // Handle Unicode strings
    for (const char of str) {
      width += getCharWidth(char)
    }
  }
  
  // Cache the result
  if (WIDTH_CACHE.size < MAX_CACHE_SIZE) {
    WIDTH_CACHE.set(str, width)
  }
  
  return width
}

/**
 * Calculate width without ANSI escape sequences
 */
export function stringWidthNoAnsi(str: string): number {
  if (!str) return 0
  
  // Remove ANSI escape sequences
  const cleaned = str.replace(/\x1b\[[0-9;]*m/g, '')
  
  return stringWidthOptimized(cleaned)
}

/**
 * Pad string to specific width (optimized)
 */
export function padStringOptimized(str: string, width: number, char = ' '): string {
  const currentWidth = stringWidthOptimized(str)
  const padding = width - currentWidth
  
  if (padding <= 0) return str
  
  return str + char.repeat(padding)
}

/**
 * Truncate string to specific width (optimized)
 */
export function truncateStringOptimized(str: string, maxWidth: number, suffix = '...'): string {
  if (!str) return ''
  
  const currentWidth = stringWidthOptimized(str)
  if (currentWidth <= maxWidth) return str
  
  const suffixWidth = stringWidthOptimized(suffix)
  const targetWidth = maxWidth - suffixWidth
  
  if (targetWidth <= 0) return maxWidth <= 0 ? '' : suffix.slice(0, maxWidth)
  
  let width = 0
  let result = ''
  
  for (const char of str) {
    const charWidth = getCharWidth(char)
    if (width + charWidth > targetWidth) break
    
    result += char
    width += charWidth
  }
  
  return result + suffix
}

/**
 * Clear the width cache
 */
export function clearWidthCache(): void {
  WIDTH_CACHE.clear()
}

/**
 * Get cache statistics
 */
export function getWidthCacheStats() {
  return {
    size: WIDTH_CACHE.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: WIDTH_CACHE.size > 0 ? 'N/A' : 'No data'
  }
}

/**
 * Alias for stringWidthOptimized to match test expectations
 * This version strips ANSI and only measures the first line
 */
export const stringWidth = (str: string): number => {
  // Take only the first line
  const firstLine = str.split('\n')[0] || ''
  // Use the no-ANSI version
  return stringWidthNoAnsi(firstLine)
}