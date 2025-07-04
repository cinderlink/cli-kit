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
import type { View, AppServices } from "@/core/types.ts"
import { hstack, vstack, text, styledText } from "@/core/view.ts"
import { style, Colors, type Color } from "@/styling/index.ts"
import type { Style } from "@/styling/types.ts"

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

// Legacy handmade fonts (minimal fallback for extreme edge cases)
const SIMPLE_FALLBACK: Record<string, string[]> = {
  'A': ["█▀█", "█▀█", "▀ █"],
  ' ': ["   ", "   ", "   "],
  '-': ["   ", "███", "   "]
}







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

export const colorPalettes: Record<string, ColorPalette> = {
  gradBlue: {
    name: "Gradient Blue",
    colors: [
      { _tag: "RGB", r: 78, g: 168, b: 255 },
      { _tag: "RGB", r: 127, g: 136, b: 255 }
    ]
  },
  sunset: {
    name: "Sunset",
    colors: [
      { _tag: "RGB", r: 255, g: 153, b: 102 },
      { _tag: "RGB", r: 255, g: 94, b: 98 },
      { _tag: "RGB", r: 255, g: 163, b: 78 }
    ]
  },
  nebula: {
    name: "Nebula",
    colors: [
      { _tag: "RGB", r: 101, g: 78, b: 163 },
      { _tag: "RGB", r: 234, g: 175, b: 200 }
    ]
  },
  matrix: {
    name: "Matrix",
    colors: [
      { _tag: "RGB", r: 0, g: 128, b: 0 },
      { _tag: "RGB", r: 0, g: 255, b: 0 },
      { _tag: "RGB", r: 255, g: 255, b: 255 }
    ]
  },
  fire: {
    name: "Fire",
    colors: [
      { _tag: "RGB", r: 255, g: 69, b: 0 },
      { _tag: "RGB", r: 255, g: 140, b: 0 },
      { _tag: "RGB", r: 255, g: 255, b: 0 }
    ]
  },
  ocean: {
    name: "Ocean",
    colors: [
      { _tag: "RGB", r: 0, g: 119, b: 190 },
      { _tag: "RGB", r: 0, g: 180, b: 216 },
      { _tag: "RGB", r: 144, g: 224, b: 239 }
    ]
  },
  neon: {
    name: "Neon",
    colors: [
      { _tag: "RGB", r: 255, g: 0, b: 255 },
      { _tag: "RGB", r: 0, g: 255, b: 255 },
      { _tag: "RGB", r: 255, g: 255, b: 0 }
    ]
  },
  purple: {
    name: "Purple",
    colors: [
      { _tag: "RGB", r: 138, g: 43, b: 226 },
      { _tag: "RGB", r: 199, g: 21, b: 133 }
    ]
  },
  forest: {
    name: "Forest",
    colors: [
      { _tag: "RGB", r: 34, g: 139, b: 34 },
      { _tag: "RGB", r: 124, g: 252, b: 0 },
      { _tag: "RGB", r: 173, g: 255, b: 47 }
    ]
  },
  dawn: {
    name: "Dawn",
    colors: [
      { _tag: "RGB", r: 255, g: 94, b: 77 },
      { _tag: "RGB", r: 255, g: 154, b: 0 },
      { _tag: "RGB", r: 255, g: 206, b: 84 }
    ]
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate ASCII art using Figlet
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
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop()
    }
    
    return lines.map(line => [line])
  } catch (error) {
    console.warn(`Failed to generate figlet art with font ${fontStyle}, falling back to standard:`, error)
    // Fallback to standard font
    const asciiArt = figlet.textSync(text, { font: 'Standard' })
    const lines = asciiArt.split('\n')
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop()
    }
    return lines.map(line => [line])
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
    return {
      colors: colorPalettes.gradBlue.colors,
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
          const color = colors[colorIndex] || colors[0]
          
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
// Preset Gradients
// =============================================================================

export const gradientPresets = {
  rainbow: {
    colors: [
      Colors.red,
      Colors.yellow,
      Colors.green,
      Colors.cyan,
      Colors.blue,
      Colors.magenta
    ],
    direction: 'horizontal' as const
  },
  
  sunset: {
    colors: [
      Colors.red,
      Colors.yellow,
      { _tag: "RGB", r: 255, g: 140, b: 0 }, // Orange
      Colors.magenta
    ],
    direction: 'horizontal' as const
  },
  
  ocean: {
    colors: [
      { _tag: "RGB", r: 0, g: 119, b: 190 }, // Deep blue
      Colors.cyan,
      Colors.brightCyan,
      Colors.white
    ],
    direction: 'horizontal' as const
  },
  
  matrix: {
    colors: [
      Colors.black,
      Colors.green,
      Colors.brightGreen,
      Colors.white
    ],
    direction: 'vertical' as const
  },
  
  fire: {
    colors: [
      Colors.red,
      { _tag: "RGB", r: 255, g: 140, b: 0 }, // Orange
      Colors.yellow,
      Colors.white
    ],
    direction: 'vertical' as const
  },
  
  neon: {
    colors: [
      Colors.magenta,
      Colors.cyan,
      Colors.blue,
      Colors.magenta
    ],
    direction: 'diagonal' as const
  }
}