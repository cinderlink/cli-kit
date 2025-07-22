/**
 * Advanced Styling Utilities - Extended styling capabilities
 * 
 * Provides advanced styling effects for terminal UI applications including
 * shadows, glows, patterns, and special text effects. These utilities
 * complement the core styling system with visual enhancements.
 * 
 * Key features:
 * - Shadow effects (drop shadow, inner shadow)
 * - Glow and highlight effects
 * - Pattern generation (dots, stripes, checkerboard)
 * - Complex border styles
 * - Special text effects
 */

import { type Color, Colors } from "./color"
import { type Style, style } from "./style"
import { type GradientConfig, textGradient } from "./gradients"

// =============================================================================
// Types
// =============================================================================

/**
 * Shadow configuration
 * 
 * @example
 * ```typescript
 * const shadow: ShadowConfig = {
 *   offset: { x: 2, y: 1 },
 *   blur: 0,
 *   color: Colors.Black,
 *   opacity: 0.5
 * }
 * ```
 */
export interface ShadowConfig {
  readonly offset: { x: number; y: number }
  readonly blur: number
  readonly color: Color
  readonly opacity: number
}

/**
 * Glow configuration
 * 
 * @example
 * ```typescript
 * const glow: GlowConfig = {
 *   radius: 2,
 *   color: Colors.Blue,
 *   intensity: 0.8
 * }
 * ```
 */
export interface GlowConfig {
  readonly radius: number
  readonly color: Color
  readonly intensity: number
}

/**
 * Pattern configuration for fills
 */
export interface PatternConfig {
  readonly type: 'dots' | 'stripes' | 'checkerboard' | 'diagonal' | 'cross' | 'wave'
  readonly foreground: Color
  readonly background: Color
  readonly scale: number
}

/**
 * Complex border style configuration
 */
export interface BorderStyle {
  readonly type: 'solid' | 'dashed' | 'dotted' | 'double' | 'gradient' | 'pattern'
  readonly width: number
  readonly color?: Color
  readonly gradient?: GradientConfig
  readonly pattern?: PatternConfig
}

/**
 * Layer effect for compositing
 */
export interface LayerEffect {
  readonly type: 'overlay' | 'multiply' | 'screen' | 'color-dodge' | 'color-burn'
  readonly opacity: number
}

// =============================================================================
// Shadow Effects
// =============================================================================

/**
 * Create a drop shadow effect
 * 
 * Simulates depth by rendering shadow characters offset from content.
 * Works best with block characters for the shadow.
 * 
 * @param content - Array of text lines
 * @param config - Shadow configuration
 * @returns Array of lines with shadow applied
 * 
 * @example
 * ```typescript
 * const shadowed = createDropShadow(
 *   ["Hello", "World"],
 *   { offset: { x: 2, y: 1 }, blur: 0, color: Colors.Gray, opacity: 0.5 }
 * )
 * ```
 */
export const createDropShadow = (
  content: string[],
  config: ShadowConfig
): string[] => {
  const { offset } = config
  const result: string[] = []
  const maxWidth = Math.max(...content.map(line => line.length))
  
  // Create shadow lines
  const shadowLines = content.map(line => {
    const paddedLine = line.padEnd(maxWidth)
    return paddedLine.split('').map(char => char === ' ' ? ' ' : '░').join('')
  })
  
  // Apply offset
  if (offset.y > 0) {
    // Shadow below content
    result.push(...content)
    for (let i = 0; i < offset.y && i < shadowLines.length; i++) {
      result.push(' '.repeat(offset.x) + (shadowLines[i] ?? ''))
    }
  } else if (offset.y < 0) {
    // Shadow above content
    for (let i = 0; i < -offset.y && i < shadowLines.length; i++) {
      result.push(shadowLines[i] ?? '')
    }
    result.push(...content)
  } else {
    // No vertical offset
    result.push(...content)
  }
  
  return result
}

/**
 * Create an inner shadow effect
 * 
 * Darkens the edges of content to create an inset appearance.
 * 
 * @param content - Array of text lines
 * @param config - Shadow configuration
 * @returns Array of lines with inner shadow
 */
export const createInnerShadow = (
  content: string[],
  config: ShadowConfig
): string[] => {
  // Inner shadow darkens edges of content
  return content.map((line, y) => {
    return line.split('').map((char, x) => {
      const isEdge = x === 0 || x === line.length - 1 || y === 0 || y === content.length - 1
      return isEdge && char !== ' ' ? '▓' : char
    }).join('')
  })
}

// =============================================================================
// Glow Effects
// =============================================================================

/**
 * Create a glow effect around content
 * 
 * Adds a colored halo effect around text using gradient characters.
 * 
 * @param content - Array of text lines
 * @param config - Glow configuration
 * @returns Array of lines with glow effect
 */
export const createGlow = (
  content: string[],
  config: GlowConfig
): string[] => {
  const { radius, intensity } = config
  const glowChars = ['░', '▒', '▓']
  const glowChar = glowChars[Math.min(Math.floor(intensity * 3), 2)] ?? '░'
  
  const result: string[] = []
  const maxWidth = Math.max(...content.map(line => line.length))
  
  // Add glow around content
  const padding = Math.ceil(radius)
  
  // Top glow
  for (let i = 0; i < padding; i++) {
    result.push(glowChar.repeat(maxWidth + padding * 2))
  }
  
  // Content with side glow
  content.forEach(line => {
    result.push(
      glowChar.repeat(padding) + 
      line.padEnd(maxWidth) + 
      glowChar.repeat(padding)
    )
  })
  
  // Bottom glow
  for (let i = 0; i < padding; i++) {
    result.push(glowChar.repeat(maxWidth + padding * 2))
  }
  
  return result
}

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate a pattern fill
 * 
 * Creates various patterns for backgrounds or fills.
 * 
 * @param width - Pattern width
 * @param height - Pattern height  
 * @param config - Pattern configuration
 * @returns 2D array of pattern characters
 */
export const generatePattern = (
  width: number,
  height: number,
  config: PatternConfig
): string[][] => {
  const pattern: string[][] = []
  const { type, scale } = config
  
  for (let y = 0; y < height; y++) {
    const row: string[] = []
    for (let x = 0; x < width; x++) {
      let usePattern = false
      
      switch (type) {
        case 'dots':
          usePattern = x % scale === 0 && y % scale === 0
          break
        case 'stripes':
          usePattern = x % scale < scale / 2
          break
        case 'checkerboard':
          usePattern = (Math.floor(x / scale) + Math.floor(y / scale)) % 2 === 0
          break
        case 'diagonal':
          usePattern = (x + y) % scale < scale / 2
          break
        case 'cross':
          usePattern = x % scale === Math.floor(scale / 2) || y % scale === Math.floor(scale / 2)
          break
        case 'wave':
          usePattern = Math.sin(x / scale) * Math.cos(y / scale) > 0
          break
      }
      
      row.push(usePattern ? '█' : ' ')
    }
    pattern.push(row)
  }
  
  return pattern
}

/**
 * Apply a pattern to content
 * 
 * Overlays a pattern on existing content.
 * 
 * @param content - Array of text lines
 * @param config - Pattern configuration
 * @returns Array of lines with pattern applied
 */
export const applyPattern = (
  content: string[],
  config: PatternConfig
): string[] => {
  const maxWidth = Math.max(...content.map(line => line.length))
  const pattern = generatePattern(maxWidth, content.length, config)
  
  return content.map((line, y) => {
    return line.split('').map((char, x) => {
      const patternChar = pattern[y]?.[x]
      return (patternChar && patternChar !== ' ' && char === ' ') ? patternChar : char
    }).join('')
  })
}

// =============================================================================
// Complex Border Styles
// =============================================================================

/**
 * Create a styled border
 * 
 * Creates complex borders with gradients or patterns.
 * 
 * @param content - Array of text lines
 * @param style - Border style configuration
 * @returns Array of lines with styled border
 */
export const createStyledBorder = (
  content: string[],
  borderStyle: BorderStyle
): string[] => {
  const { type, width } = borderStyle
  const maxWidth = Math.max(...content.map(line => line.length))
  const result: string[] = []
  
  // Border characters based on type
  const getBorderChar = () => {
    switch (type) {
      case 'solid': return '█'
      case 'dashed': return '─'
      case 'dotted': return '·'
      case 'double': return '═'
      default: return '█'
    }
  }
  
  const borderChar = getBorderChar()
  
  // Top border
  for (let i = 0; i < width; i++) {
    result.push(borderChar.repeat(maxWidth + width * 2))
  }
  
  // Content with side borders
  content.forEach(line => {
    result.push(
      borderChar.repeat(width) + 
      line.padEnd(maxWidth) + 
      borderChar.repeat(width)
    )
  })
  
  // Bottom border
  for (let i = 0; i < width; i++) {
    result.push(borderChar.repeat(maxWidth + width * 2))
  }
  
  return result
}

// =============================================================================
// Layer Effects
// =============================================================================

/**
 * Apply a layer effect
 * 
 * Simulates layer blending modes for terminal output.
 * Note: Terminal limitations mean these are approximations.
 * 
 * @param base - Base layer content
 * @param overlay - Overlay layer content
 * @param effect - Layer effect configuration
 * @returns Blended content
 */
export const applyLayerEffect = (
  base: string[],
  overlay: string[],
  effect: LayerEffect
): string[] => {
  const { type, opacity } = effect
  
  return base.map((baseLine, y) => {
    const overlayLine = overlay[y] || ''
    
    return baseLine.split('').map((baseChar, x) => {
      const overlayChar = overlayLine[x] || ' '
      
      // Simple blending based on opacity
      if (overlayChar === ' ' || Math.random() > opacity) {
        return baseChar
      }
      
      // For terminal, we can only approximate blend modes
      switch (type) {
        case 'overlay':
          return overlayChar
        case 'multiply':
          return baseChar !== ' ' && overlayChar !== ' ' ? '▓' : ' '
        case 'screen':
          return baseChar !== ' ' || overlayChar !== ' ' ? overlayChar : ' '
        default:
          return overlayChar
      }
    }).join('')
  })
}

// =============================================================================
// Special Text Effects
// =============================================================================

/**
 * Create a pulse animation frame
 * 
 * Generates text that appears to pulse by varying intensity.
 * 
 * @param text - Text to animate
 * @param phase - Animation phase (0-1)
 * @returns Styled text for current phase
 */
export const createPulse = (
  text: string,
  phase: number
): Style => {
  const intensity = (Math.sin(phase * Math.PI * 2) + 1) / 2
  const color = {
    _tag: "RGB" as const,
    r: Math.floor(255 * intensity),
    g: Math.floor(255 * intensity),
    b: Math.floor(255 * intensity)
  }
  
  return style().foreground(color)
}

/**
 * Create a shake effect
 * 
 * Randomly offsets characters to create a shaking appearance.
 * 
 * @param text - Text to shake
 * @param intensity - Shake intensity (0-1)
 * @returns Text with random offsets
 */
export const createShake = (
  text: string,
  intensity: number
): string => {
  return text.split('').map(char => {
    if (char === ' ' || Math.random() > intensity) return char
    
    const offset = Math.random() > 0.5 ? ' ' : ''
    return offset + char
  }).join('')
}

/**
 * Create a typewriter effect
 * 
 * Reveals text progressively like a typewriter.
 * 
 * @param text - Full text
 * @param progress - Reveal progress (0-1)
 * @returns Partially revealed text
 */
export const createTypewriter = (
  text: string,
  progress: number
): string => {
  const revealLength = Math.floor(text.length * progress)
  return text.substring(0, revealLength) + '█'.repeat(progress < 1 ? 1 : 0)
}

/**
 * Create rainbow text
 * 
 * Applies rainbow gradient to text.
 * 
 * @param text - Text to colorize
 * @returns Rainbow-colored text
 */
export const createRainbowText = (
  text: string
): Style[] => {
  const colors = [
    Colors.red,
    Colors.yellow,
    Colors.green,
    Colors.cyan,
    Colors.blue,
    Colors.magenta
  ]
  
  return text.split('').map((char, i) => {
    const colorIndex = i % colors.length
    return style().foreground(colors[colorIndex]!)
  })
}

// =============================================================================
// Complex Effects
// =============================================================================

/**
 * Create a bounce effect for characters
 * 
 * Makes characters appear to bounce by varying vertical position.
 * 
 * @param text - Text to animate
 * @param phase - Animation phase (0-1)
 * @param height - Bounce height in lines
 * @returns Array of lines with bouncing text
 */
export const createBounce = (
  text: string,
  phase: number,
  height: number = 3
): string[] => {
  const lines: string[] = Array(height).fill('')
  const bounce = Math.abs(Math.sin(phase * Math.PI))
  const yPos = Math.floor(bounce * (height - 1))
  
  lines[yPos] = text
  return lines
}

/**
 * Create a wave text effect
 * 
 * Makes text appear to wave by varying character positions.
 * 
 * @param text - Text to wave
 * @param phase - Animation phase (0-1) 
 * @param amplitude - Wave amplitude
 * @returns Array of lines with waving text
 */
export const createWaveText = (
  text: string,
  phase: number,
  amplitude: number = 2
): string[] => {
  const lines: string[] = Array(amplitude * 2 + 1).fill('')
  
  text.split('').forEach((char, i) => {
    const offset = Math.sin((i / text.length + phase) * Math.PI * 2) * amplitude
    const yPos = Math.floor(amplitude + offset)
    
    if (!lines[yPos]) lines[yPos] = ' '.repeat(i)
    lines[yPos] += char
  })
  
  return lines.filter(line => line.trim())
}

/**
 * Create a neon glow effect
 * 
 * Simulates neon lighting with colored glow.
 * 
 * @param text - Text to style
 * @param color - Neon color
 * @returns Styled text with neon effect
 */
export const createNeonEffect = (
  text: string,
  color: Color
): Style => {
  return style()
    .foreground(color)
    .bold()
    .background(Colors.black)
}

/**
 * Create a matrix-style effect
 * 
 * Creates falling character effect like in The Matrix.
 * 
 * @param width - Effect width
 * @param height - Effect height
 * @param density - Character density (0-1)
 * @returns Matrix effect pattern
 */
export const createMatrixEffect = (
  width: number,
  height: number,
  density: number = 0.1
): string[] => {
  const chars = '01'
  const lines: string[] = []
  
  for (let y = 0; y < height; y++) {
    let line = ''
    for (let x = 0; x < width; x++) {
      if (Math.random() < density) {
        line += chars[Math.floor(Math.random() * chars.length)]
      } else {
        line += ' '
      }
    }
    lines.push(line)
  }
  
  return lines
}

/**
 * Create a hologram effect
 * 
 * Simulates holographic appearance with scan lines.
 * 
 * @param content - Content to apply effect to
 * @param phase - Animation phase for scan lines
 * @returns Content with hologram effect
 */
export const createHologramEffect = (
  content: string[],
  phase: number
): string[] => {
  const scanLineY = Math.floor(phase * content.length)
  
  return content.map((line, y) => {
    if (y === scanLineY || y === scanLineY - 1) {
      // Scan line effect
      return line.split('').map(char => char === ' ' ? ' ' : '▓').join('')
    }
    return line
  })
}