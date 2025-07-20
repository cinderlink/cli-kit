/**
 * Large Text Components - ASCII art and gradient text for splash screens
 * 
 * Features:
 * - Figlet-powered ASCII art font rendering
 * - Gradient color support
 * - Animated gradient effects
 * - Multiple professional font styles
 * - oh-my-logo inspired functionality
 */

import { Effect, Stream } from "effect"
import figlet from "figlet"
import type { View, AppServices } from "../../core/types"
import { hstack, vstack, text, styledText } from "../../core/view"
import { style, Colors, type Color } from "../../styling/index"
import { Style } from "../../styling/style"

// =============================================================================
// Figlet Font Names
// =============================================================================

// Popular figlet fonts for different styles
export const FIGLET_FONTS = {
  standard: 'Standard',
  big: 'Big',
  ansiShadow: 'ANSI Shadow',
  slant: 'Slant',
  small: 'Small',
  block: 'Block',
  cyber: 'Cyberlarge',
  neon: 'Nancyj',
  graffiti: 'Graffiti',
  chunky: 'Chunky',
  '3d': '3D-ASCII',
  script: 'Script',
  rounded: 'Rounded',
  digital: 'Digital'
} as const

// Removed massive handmade fonts data structure - using figlet as sole provider

// =============================================================================
// Types
// =============================================================================

export type FontStyle = keyof typeof FIGLET_FONTS
export type RenderMode = 'outlined' | 'filled'

export interface LargeTextOptions {
  readonly text: string
  readonly font?: FontStyle
  readonly mode?: RenderMode // 'outlined' or 'filled'
  readonly style?: Style
  readonly spacing?: number // Space between characters
  readonly scale?: number // Scale multiplier (1 = normal, 2 = 2x, etc.)
}

export interface LargeGradientTextOptions extends LargeTextOptions {
  readonly gradient: GradientConfig
}

export interface LargeAnimatedGradientTextOptions extends LargeGradientTextOptions {
  readonly animationSpeed?: number // Speed of gradient animation
  readonly time: number // Current animation time
}

export interface GradientConfig {
  readonly colors: Color[]
  readonly direction?: 'horizontal' | 'vertical' | 'diagonal'
}

// Predefined palettes inspired by oh-my-logo
export interface ColorPalette {
  readonly name: string
  readonly colors: Color[]
}

// Simplified color palette structure - reduced duplication
export const colorPalettes: Record<string, ColorPalette> = {
  gradBlue: {
    name: "Gradient Blue",
    colors: [Colors.blue, Colors.brightBlue]
  },
  sunset: {
    name: "Sunset",
    colors: [Colors.red, Colors.yellow, Colors.magenta]
  },
  matrix: {
    name: "Matrix",
    colors: [Colors.green, Colors.brightGreen, Colors.white]
  },
  fire: {
    name: "Fire",
    colors: [Colors.red, Colors.yellow, Colors.white]
  },
  ocean: {
    name: "Ocean",
    colors: [Colors.blue, Colors.cyan, Colors.brightCyan]
  },
  neon: {
    name: "Neon",
    colors: [Colors.magenta, Colors.cyan, Colors.yellow]
  },
  purple: {
    name: "Purple",
    colors: [Colors.magenta, Colors.brightMagenta]
  },
  forest: {
    name: "Forest",
    colors: [Colors.green, Colors.brightGreen, Colors.yellow]
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate ASCII art using Figlet with proper error handling
 */
function generateFigletArt(text: string, fontStyle: FontStyle = 'standard'): string[][] {
  try {
    const figletFont = FIGLET_FONTS[fontStyle] as figlet.Fonts
    const asciiArt = figlet.textSync(text, {
      font: figletFont,
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 120,
      whitespaceBreak: true
    })
    
    // Convert the ASCII art string to our line format
    const lines = asciiArt.split('\n')
    // Filter out empty lines at the end
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1]
      if (lastLine && lastLine.trim() === '') {
        lines.pop()
      } else {
        break
      }
    }
    
    return lines.map(line => [line])
  } catch (primaryError) {
    console.warn(`Failed to generate figlet art with font ${fontStyle}:`, primaryError)
    
    // Try fallback to standard font
    try {
      const asciiArt = figlet.textSync(text, { font: 'Standard' })
      const lines = asciiArt.split('\n')
      while (lines.length > 0) {
        const lastLine = lines[lines.length - 1]
        if (lastLine && lastLine.trim() === '') {
          lines.pop()
        } else {
          break
        }
      }
      return lines.map(line => [line])
    } catch (fallbackError) {
      console.error('Failed to generate figlet art even with standard font:', fallbackError)
      // Ultimate fallback - return simple text representation
      return [[`[ ${text} ]`]]
    }
  }
}

/**
 * Convert text to ASCII art using specified font (legacy fallback)
 */
function textToAsciiArt(text: string, fontStyle: FontStyle = 'standard'): string[][] {
  // Use Figlet for modern fonts
  return generateFigletArt(text, fontStyle)
}

/**
 * Scale ASCII art intelligently, preserving directional characters and structure
 */
function scaleAsciiArt(lines: string[][], scale: number): string[][] {
  if (scale <= 1) return lines
  
  const scaledLines: string[][] = []
  
  // Directional characters that should not be horizontally repeated
  const directionalChars = new Set(['/', '\\', '|', '<', '>', '^', 'v', '╔', '╗', '╚', '╝'])
  
  // Characters that can be safely repeated horizontally
  const horizontalRepeatChars = new Set(['_', '-', '=', '*', '#', '█', '▀', '▄', '▌', '▐', '║', '═'])
  
  for (const line of lines) {
    const fullLine = line.join('')
    
    // Smart horizontal scaling
    const scaledLine = fullLine.split('').map(char => {
      if (char === ' ') {
        // Spaces can be repeated to maintain proportions
        return char.repeat(scale)
      } else if (horizontalRepeatChars.has(char)) {
        // Horizontal line characters can be repeated
        return char.repeat(scale)
      } else if (directionalChars.has(char)) {
        // Directional characters should not be repeated horizontally
        // Instead, add spaces around them to maintain visual spacing
        if (scale === 2) {
          return char + ' '
        } else if (scale === 3) {
          return ' ' + char + ' '
        } else {
          // For higher scales, center the character
          const padding = Math.floor((scale - 1) / 2)
          return ' '.repeat(padding) + char + ' '.repeat(scale - 1 - padding)
        }
      } else {
        // For other characters (letters, numbers, symbols), add strategic spacing
        if (scale === 2) {
          return char + ' '
        } else {
          // For scale 3+, add minimal spacing to prevent crowding
          return char + ' '.repeat(Math.min(scale - 1, 2))
        }
      }
    }).join('')
    
    // Vertical scaling - duplicate lines
    for (let i = 0; i < scale; i++) {
      scaledLines.push([scaledLine])
    }
  }
  
  return scaledLines
}

/**
 * Convert outlined ASCII art to filled blocks
 */
function createFilledBlocks(lines: string[][], char: string = '█'): string[][] {
  return lines.map(line => {
    const fullLine = line.join('')
    // Replace any non-space character with the fill character
    const filledLine = fullLine.replace(/[^\s]/g, char)
    return [filledLine]
  })
}

/**
 * Resolve color palette by name or return custom gradient
 */
function resolveGradient(paletteNameOrGradient: string | GradientConfig): GradientConfig {
  if (typeof paletteNameOrGradient === 'string') {
    const palette = colorPalettes[paletteNameOrGradient]
    if (palette) {
      return {
        colors: palette.colors,
        direction: 'horizontal'
      }
    }
    // Fallback to grad-blue if palette not found
    const defaultPalette = colorPalettes.gradBlue
    return {
      colors: defaultPalette ? defaultPalette.colors : [Colors.blue, Colors.cyan],
      direction: 'horizontal'
    }
  }
  return paletteNameOrGradient
}

/**
 * Apply gradient colors to ASCII art
 */
function applyGradient(
  lines: string[][], 
  gradient: GradientConfig,
  time: number = 0
): View {
  const colors = gradient.colors
  if (lines.length === 0 || lines[0] === undefined) {
    return text('') // Empty view if no lines
  }
  const totalChars = lines[0].join('').length
  
  return vstack(
    ...lines.map((line, lineIndex) => {
      const fullLine = line.join('')
      const chars = fullLine.split('')
      
      return hstack(
        ...chars.map((char, charIndex) => {
          if (char === ' ') return text(' ')
          
          // Calculate gradient position
          let gradientPos = 0
          if (gradient.direction === 'horizontal') {
            gradientPos = (charIndex / totalChars + time) % 1
          } else if (gradient.direction === 'vertical') {
            gradientPos = (lineIndex / lines.length + time) % 1
          } else {
            // Diagonal
            gradientPos = ((charIndex + lineIndex) / (totalChars + lines.length) + time) % 1
          }
          
          // Interpolate color
          const colorIndex = Math.floor(gradientPos * (colors.length - 1))
          const color = colors[colorIndex] || colors[0] || Colors.white
          
          return styledText(char, style().foreground(color))
        })
      )
    })
  )
}

// =============================================================================
// Components
// =============================================================================

/**
 * Large text with single color
 */
export function largeText(options: LargeTextOptions): View {
  let lines = textToAsciiArt(options.text, options.font || 'block')
  
  // Apply filled mode if specified
  if (options.mode === 'filled') {
    lines = createFilledBlocks(lines)
  }
  
  // Apply scaling
  if (options.scale && options.scale > 1) {
    lines = scaleAsciiArt(lines, options.scale)
  }
  
  const spacing = ' '.repeat(options.spacing || 1)
  
  return vstack(
    ...lines.map(line => {
      const fullLine = line.join(spacing)
      return options.style 
        ? styledText(fullLine, options.style)
        : text(fullLine)
    })
  )
}

/**
 * Large text with gradient colors
 */
export function largeGradientText(options: LargeGradientTextOptions): View {
  let lines = textToAsciiArt(options.text, options.font || 'block')
  
  // Apply filled mode if specified
  if (options.mode === 'filled') {
    lines = createFilledBlocks(lines)
  }
  
  // Apply scaling
  if (options.scale && options.scale > 1) {
    lines = scaleAsciiArt(lines, options.scale)
  }
  
  const spacedLines = lines.map(line => {
    const spacing = ' '.repeat(options.spacing || 1)
    return line.map((char, i) => i === line.length - 1 ? char : char + spacing)
  })
  
  // Resolve gradient (support both palette names and gradient configs)
  const gradient = typeof options.gradient === 'string' 
    ? resolveGradient(options.gradient)
    : options.gradient
  
  return applyGradient(spacedLines, gradient)
}

/**
 * Large text with animated gradient
 */
export function largeAnimatedGradientText(options: LargeAnimatedGradientTextOptions): View {
  let lines = textToAsciiArt(options.text, options.font || 'block')
  
  // Apply filled mode if specified
  if (options.mode === 'filled') {
    lines = createFilledBlocks(lines)
  }
  
  // Apply scaling
  if (options.scale && options.scale > 1) {
    lines = scaleAsciiArt(lines, options.scale)
  }
  
  const spacedLines = lines.map(line => {
    const spacing = ' '.repeat(options.spacing || 1)
    return line.map((char, i) => i === line.length - 1 ? char : char + spacing)
  })
  
  // Resolve gradient (support both palette names and gradient configs)
  const gradient = typeof options.gradient === 'string' 
    ? resolveGradient(options.gradient)
    : options.gradient
  
  const animationOffset = options.time * (options.animationSpeed || 0.1)
  return applyGradient(spacedLines, gradient, animationOffset)
}

/**
 * Create a large text with a named palette (oh-my-logo style)
 */
export function largeTextWithPalette(
  text: string, 
  paletteName: keyof typeof colorPalettes,
  options?: Partial<LargeTextOptions>
): View {
  const palette = colorPalettes[paletteName]
  if (!palette) {
    // Fallback to default palette
    return largeText({ text, ...options })
  }
  const gradient: GradientConfig = {
    colors: palette.colors,
    direction: 'horizontal'
  }
  
  return largeGradientText({
    text,
    gradient,
    font: 'block',
    mode: 'outlined',
    ...options
  })
}

/**
 * Create animated large text with a named palette
 */
export function largeAnimatedTextWithPalette(
  text: string,
  paletteName: keyof typeof colorPalettes,
  time: number,
  options?: Partial<LargeAnimatedGradientTextOptions>
): View {
  const palette = colorPalettes[paletteName]
  if (!palette) {
    // Fallback to default animated text
    return largeAnimatedGradientText({ text, time, ...options })
  }
  const gradient: GradientConfig = {
    colors: palette.colors,
    direction: 'horizontal'
  }
  
  return largeAnimatedGradientText({
    text,
    gradient,
    time,
    font: 'block',
    mode: 'outlined',
    animationSpeed: 0.05,
    ...options
  })
}

// =============================================================================
// Preset Gradients - Use existing color palettes where possible
// =============================================================================

export const gradientPresets = {
  rainbow: {
    colors: [Colors.red, Colors.yellow, Colors.green, Colors.cyan, Colors.blue, Colors.magenta],
    direction: 'horizontal' as const
  },
  
  // Use color palette definitions to reduce duplication
  sunset: {
    colors: colorPalettes.sunset.colors,
    direction: 'horizontal' as const
  },
  
  ocean: {
    colors: colorPalettes.ocean.colors,
    direction: 'horizontal' as const
  },
  
  matrix: {
    colors: colorPalettes.matrix.colors,
    direction: 'vertical' as const
  },
  
  fire: {
    colors: colorPalettes.fire.colors,
    direction: 'vertical' as const
  },
  
  neon: {
    colors: colorPalettes.neon.colors,
    direction: 'diagonal' as const
  }
}