/**
 * Gradient and Advanced Styling Utilities - Lipgloss-inspired
 * 
 * Features:
 * - Linear gradients (horizontal, vertical, diagonal)
 * - Color interpolation and blending
 * - Text gradients with smooth color transitions
 * - Background gradients
 * - Rainbow and preset gradient effects
 * - Border gradients
 * - Performance-optimized gradient rendering
 */

import { type Color, Colors } from "./color.ts"
import { type Style, style } from "./style.ts"

// =============================================================================
// Types
// =============================================================================

export interface GradientStop {
  readonly position: number // 0.0 to 1.0
  readonly color: Color
}

export interface GradientConfig {
  readonly stops: GradientStop[]
  readonly direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up'
  readonly interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TextGradientOptions {
  readonly gradient: GradientConfig
  readonly text: string
  readonly preserveSpaces?: boolean
}

export interface BackgroundGradientOptions {
  readonly gradient: GradientConfig
  readonly width: number
  readonly height: number
  readonly char?: string
}

// =============================================================================
// Color Interpolation
// =============================================================================

/**
 * Convert color to RGB values for interpolation
 */
const colorToRgb = (color: Color): [number, number, number] => {
  switch (color._tag) {
    case "RGB":
      return [color.r, color.g, color.b]
    case "ANSI":
      // Convert common ANSI colors to approximate RGB values
      const ansiToRgb: Record<number, [number, number, number]> = {
        0: [0, 0, 0],       // black
        1: [128, 0, 0],     // red
        2: [0, 128, 0],     // green
        3: [128, 128, 0],   // yellow
        4: [0, 0, 128],     // blue
        5: [128, 0, 128],   // magenta
        6: [0, 128, 128],   // cyan
        7: [192, 192, 192], // white
        8: [128, 128, 128], // bright black
        9: [255, 0, 0],     // bright red
        10: [0, 255, 0],    // bright green
        11: [255, 255, 0],  // bright yellow
        12: [0, 0, 255],    // bright blue
        13: [255, 0, 255],  // bright magenta
        14: [0, 255, 255],  // bright cyan
        15: [255, 255, 255] // bright white
      }
      return ansiToRgb[color.code] ?? [128, 128, 128]
    case "Hex":
      // Parse hex color to RGB
      const hex = color.value.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return [r, g, b]
    case "ANSI256":
      // Simplified ANSI256 to RGB conversion
      const code = color.code
      if (code < 16) {
        // Use standard ANSI colors
        return colorToRgb({ _tag: "ANSI", code })
      } else if (code < 232) {
        // 216 color cube
        const n = code - 16
        const r = Math.floor(n / 36) * 51
        const g = Math.floor((n % 36) / 6) * 51
        const b = (n % 6) * 51
        return [r, g, b]
      } else {
        // Grayscale
        const gray = (code - 232) * 10 + 8
        return [gray, gray, gray]
      }
    case "NoColor":
      return [0, 0, 0]
    case "Adaptive":
      // For simplicity, use light mode color
      return colorToRgb(color.light)
    default:
      return [128, 128, 128]
  }
}

/**
 * Linear interpolation between two values
 */
const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t
}

/**
 * Apply easing function to interpolation factor
 */
const applyEasing = (t: number, easing: GradientConfig['interpolation']): number => {
  switch (easing) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t
    case 'ease-out':
      return 1 - (1 - t) * (1 - t)
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)
    default:
      return t
  }
}

/**
 * Interpolate between two colors
 */
const interpolateColors = (color1: Color, color2: Color, t: number): Color => {
  const [r1, g1, b1] = colorToRgb(color1)
  const [r2, g2, b2] = colorToRgb(color2)
  
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  
  return { _tag: "RGB", r, g, b }
}

/**
 * Get color at specific position in gradient
 */
const getGradientColor = (gradient: GradientConfig, position: number): Color => {
  position = Math.max(0, Math.min(1, position))
  
  // Find the two stops to interpolate between
  const sortedStops = gradient.stops.slice().sort((a, b) => a.position - b.position)
  
  if (sortedStops.length === 0) {
    return Colors.white
  }
  
  if (sortedStops.length === 1 || position <= sortedStops[0]!.position) {
    return sortedStops[0]!.color
  }
  
  if (position >= sortedStops[sortedStops.length - 1]!.position) {
    return sortedStops[sortedStops.length - 1]!.color
  }
  
  // Find the two stops to interpolate between
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const stop1 = sortedStops[i]!
    const stop2 = sortedStops[i + 1]!
    
    if (position >= stop1.position && position <= stop2.position) {
      const localT = (position - stop1.position) / (stop2.position - stop1.position)
      const easedT = applyEasing(localT, gradient.interpolation)
      return interpolateColors(stop1.color, stop2.color, easedT)
    }
  }
  
  return sortedStops[0]!.color
}

// =============================================================================
// Gradient Functions
// =============================================================================

/**
 * Create a text gradient effect
 */
export const textGradient = (options: TextGradientOptions): Style[] => {
  const { gradient, text, preserveSpaces = false } = options
  const characters = text.split('')
  const styles: Style[] = []
  
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    
    // Skip spaces if not preserving them
    if (!preserveSpaces && char === ' ') {
      styles.push(style())
      continue
    }
    
    let position: number
    
    switch (gradient.direction) {
      case 'horizontal':
        position = characters.length > 1 ? i / (characters.length - 1) : 0
        break
      case 'vertical':
        // For single line text, treat as horizontal
        position = characters.length > 1 ? i / (characters.length - 1) : 0
        break
      case 'diagonal-down':
      case 'diagonal-up':
        position = characters.length > 1 ? i / (characters.length - 1) : 0
        break
      default:
        position = 0
    }
    
    const color = getGradientColor(gradient, position)
    styles.push(style().foreground(color))
  }
  
  return styles
}

/**
 * Create a background gradient pattern
 */
export const backgroundGradient = (options: BackgroundGradientOptions): string[] => {
  const { gradient, width, height, char = '█' } = options
  const lines: string[] = []
  
  for (let y = 0; y < height; y++) {
    let line = ''
    
    for (let x = 0; x < width; x++) {
      let position: number
      
      switch (gradient.direction) {
        case 'horizontal':
          position = width > 1 ? x / (width - 1) : 0
          break
        case 'vertical':
          position = height > 1 ? y / (height - 1) : 0
          break
        case 'diagonal-down':
          position = width + height > 2 ? (x + y) / (width + height - 2) : 0
          break
        case 'diagonal-up':
          position = width + height > 2 ? (x + (height - 1 - y)) / (width + height - 2) : 0
          break
        default:
          position = 0
      }
      
      // For now, return just the character - styling would be applied separately
      line += char
    }
    
    lines.push(line)
  }
  
  return lines
}

/**
 * Apply gradient to border characters
 */
export const borderGradient = (
  borderChars: string,
  gradient: GradientConfig
): Style[] => {
  const characters = borderChars.split('')
  const styles: Style[] = []
  
  for (let i = 0; i < characters.length; i++) {
    const position = characters.length > 1 ? i / (characters.length - 1) : 0
    const color = getGradientColor(gradient, position)
    styles.push(style().foreground(color))
  }
  
  return styles
}

// =============================================================================
// Preset Gradients
// =============================================================================

/**
 * Create a rainbow gradient
 */
export const rainbowGradient = (direction: GradientConfig['direction'] = 'horizontal'): GradientConfig => ({
  direction,
  interpolation: 'linear',
  stops: [
    { position: 0.0, color: Colors.red },
    { position: 0.16, color: Colors.yellow },
    { position: 0.33, color: Colors.green },
    { position: 0.5, color: Colors.cyan },
    { position: 0.66, color: Colors.blue },
    { position: 0.83, color: Colors.magenta },
    { position: 1.0, color: Colors.red }
  ]
})

/**
 * Create a sunset gradient
 */
export const sunsetGradient = (direction: GradientConfig['direction'] = 'horizontal'): GradientConfig => ({
  direction,
  interpolation: 'ease-in-out',
  stops: [
    { position: 0.0, color: { _tag: "RGB", r: 255, g: 94, b: 77 } },   // red-orange
    { position: 0.5, color: { _tag: "RGB", r: 255, g: 154, b: 0 } },   // orange
    { position: 1.0, color: { _tag: "RGB", r: 255, g: 206, b: 84 } }   // yellow
  ]
})

/**
 * Create an ocean gradient
 */
export const oceanGradient = (direction: GradientConfig['direction'] = 'vertical'): GradientConfig => ({
  direction,
  interpolation: 'ease-in-out',
  stops: [
    { position: 0.0, color: { _tag: "RGB", r: 64, g: 224, b: 208 } },   // turquoise
    { position: 0.5, color: { _tag: "RGB", r: 70, g: 130, b: 180 } },   // steel blue
    { position: 1.0, color: { _tag: "RGB", r: 25, g: 25, b: 112 } }     // midnight blue
  ]
})

/**
 * Create a forest gradient
 */
export const forestGradient = (direction: GradientConfig['direction'] = 'vertical'): GradientConfig => ({
  direction,
  interpolation: 'linear',
  stops: [
    { position: 0.0, color: { _tag: "RGB", r: 34, g: 139, b: 34 } },    // forest green
    { position: 0.5, color: { _tag: "RGB", r: 0, g: 100, b: 0 } },      // dark green
    { position: 1.0, color: { _tag: "RGB", r: 85, g: 107, b: 47 } }     // dark olive green
  ]
})

/**
 * Create a fire gradient
 */
export const fireGradient = (direction: GradientConfig['direction'] = 'vertical'): GradientConfig => ({
  direction,
  interpolation: 'ease-out',
  stops: [
    { position: 0.0, color: { _tag: "RGB", r: 255, g: 255, b: 0 } },    // yellow
    { position: 0.4, color: { _tag: "RGB", r: 255, g: 165, b: 0 } },    // orange
    { position: 0.7, color: { _tag: "RGB", r: 255, g: 69, b: 0 } },     // red-orange
    { position: 1.0, color: { _tag: "RGB", r: 139, g: 0, b: 0 } }       // dark red
  ]
})

/**
 * Create a pastel gradient
 */
export const pastelGradient = (direction: GradientConfig['direction'] = 'horizontal'): GradientConfig => ({
  direction,
  interpolation: 'ease-in-out',
  stops: [
    { position: 0.0, color: { _tag: "RGB", r: 255, g: 182, b: 193 } },  // light pink
    { position: 0.25, color: { _tag: "RGB", r: 221, g: 160, b: 221 } }, // plum
    { position: 0.5, color: { _tag: "RGB", r: 173, g: 216, b: 230 } },  // light blue
    { position: 0.75, color: { _tag: "RGB", r: 144, g: 238, b: 144 } }, // light green
    { position: 1.0, color: { _tag: "RGB", r: 255, g: 255, b: 224 } }   // light yellow
  ]
})

/**
 * Create a monochrome gradient
 */
export const monochromeGradient = (
  startColor: Color,
  endColor: Color,
  direction: GradientConfig['direction'] = 'horizontal'
): GradientConfig => ({
  direction,
  interpolation: 'linear',
  stops: [
    { position: 0.0, color: startColor },
    { position: 1.0, color: endColor }
  ]
})

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a custom gradient with evenly spaced colors
 */
export const createGradient = (
  colors: Color[],
  direction: GradientConfig['direction'] = 'horizontal',
  interpolation: GradientConfig['interpolation'] = 'linear'
): GradientConfig => {
  if (colors.length === 0) {
    return {
      direction,
      interpolation,
      stops: [{ position: 0, color: Colors.white }]
    }
  }
  
  if (colors.length === 1) {
    return {
      direction,
      interpolation,
      stops: [{ position: 0, color: colors[0] }]
    }
  }
  
  const stops: GradientStop[] = colors.map((color, index) => ({
    position: index / (colors.length - 1),
    color
  }))
  
  return {
    direction,
    interpolation,
    stops
  }
}

/**
 * Reverse a gradient
 */
export const reverseGradient = (gradient: GradientConfig): GradientConfig => ({
  ...gradient,
  stops: gradient.stops.map(stop => ({
    ...stop,
    position: 1 - stop.position
  }))
})

/**
 * Shift gradient positions
 */
export const shiftGradient = (gradient: GradientConfig, offset: number): GradientConfig => ({
  ...gradient,
  stops: gradient.stops.map(stop => ({
    ...stop,
    position: Math.max(0, Math.min(1, stop.position + offset))
  }))
})

/**
 * Scale gradient to fit specific range
 */
export const scaleGradient = (
  gradient: GradientConfig,
  start: number,
  end: number
): GradientConfig => {
  const range = end - start
  return {
    ...gradient,
    stops: gradient.stops.map(stop => ({
      ...stop,
      position: start + stop.position * range
    }))
  }
}

// =============================================================================
// Animation Helpers
// =============================================================================

/**
 * Create animated gradient by shifting over time
 */
export const animatedGradient = (
  baseGradient: GradientConfig,
  time: number,
  speed: number = 1
): GradientConfig => {
  const offset = (time * speed) % 1
  return shiftGradient(baseGradient, offset)
}

/**
 * Create pulsing gradient effect
 */
export const pulsingGradient = (
  baseGradient: GradientConfig,
  time: number,
  intensity: number = 0.3
): GradientConfig => {
  const pulse = Math.sin(time) * intensity + 1
  
  return {
    ...baseGradient,
    stops: baseGradient.stops.map(stop => {
      const [r, g, b] = colorToRgb(stop.color)
      return {
        ...stop,
        color: {
          _tag: "RGB" as const,
          r: Math.min(255, Math.round(r * pulse)),
          g: Math.min(255, Math.round(g * pulse)),
          b: Math.min(255, Math.round(b * pulse))
        }
      }
    })
  }
}