/**
 * Advanced Styling Utilities - Extended styling capabilities
 * 
 * Features:
 * - Shadow effects and depth
 * - Glow and highlight effects
 * - Pattern fills and textures
 * - Complex border styles
 * - Layer blending and composition
 * - Animation and transition helpers
 */

import { type Color, Colors } from "./color.ts"
import { type Style, style } from "./style.ts"
import { type GradientConfig, textGradient } from "./gradients.ts"

// =============================================================================
// Types
// =============================================================================

export interface ShadowConfig {
  readonly offset: { x: number; y: number }
  readonly blur: number
  readonly color: Color
  readonly opacity: number
}

export interface GlowConfig {
  readonly radius: number
  readonly color: Color
  readonly intensity: number
}

export interface PatternConfig {
  readonly type: 'dots' | 'stripes' | 'checkerboard' | 'diagonal' | 'cross' | 'wave'
  readonly foreground: Color
  readonly background: Color
  readonly scale: number
}

export interface BorderStyle {
  readonly type: 'solid' | 'dashed' | 'dotted' | 'double' | 'gradient' | 'pattern'
  readonly width: number
  readonly color?: Color
  readonly gradient?: GradientConfig
  readonly pattern?: PatternConfig
}

export interface LayerEffect {
  readonly type: 'overlay' | 'multiply' | 'screen' | 'color-dodge' | 'color-burn'
  readonly color: Color
  readonly opacity: number
}

// =============================================================================
// Shadow Effects
// =============================================================================

/**
 * Create drop shadow effect using box-drawing characters
 */
export const createDropShadow = (
  content: string[],
  config: ShadowConfig
): string[] => {
  const { offset, color } = config
  const shadowLines: string[] = []
  
  // Create shadow by offsetting content
  for (let i = 0; i < content.length; i++) {
    const line = content[i] || ''
    let shadowLine = ''
    
    // Add horizontal offset
    if (offset.x > 0) {
      shadowLine = ' '.repeat(offset.x) + line.replace(/./g, '▓')
    } else if (offset.x < 0) {
      shadowLine = line.substring(-offset.x).replace(/./g, '▓')
    } else {
      shadowLine = line.replace(/./g, '▓')
    }
    
    shadowLines.push(shadowLine)
  }
  
  // Add vertical offset
  const result: string[] = []
  
  if (offset.y > 0) {
    // Shadow appears below
    result.push(...content)
    for (let i = 0; i < offset.y; i++) {
      if (i < shadowLines.length) {
        result.push(shadowLines[i]!)
      }
    }
  } else if (offset.y < 0) {
    // Shadow appears above
    for (let i = -offset.y; i < shadowLines.length; i++) {
      result.push(shadowLines[i]!)
    }
    result.push(...content)
  } else {
    // No vertical offset
    result.push(...content)
  }
  
  return result
}

/**
 * Create inner shadow effect
 */
export const createInnerShadow = (
  content: string[],
  config: ShadowConfig
): string[] => {
  // Inner shadow darkens edges of content
  return content.map((line, y) => {
    return line.split('').map((char, x) => {
      const isEdge = x === 0 || x === line.length - 1 || y === 0 || y === content.length - 1
      return isEdge ? '▓' : char
    }).join('')
  })
}

// =============================================================================
// Glow Effects
// =============================================================================

/**
 * Create glow effect around content
 */
export const createGlow = (
  content: string[],
  config: GlowConfig
): string[] => {
  const { radius, intensity } = config
  const glowLines: string[] = []
  
  // Expand content area for glow
  const padding = Math.ceil(radius)
  const maxWidth = Math.max(...content.map(line => line.length))
  
  for (let y = -padding; y < content.length + padding; y++) {
    let glowLine = ''
    
    for (let x = -padding; x < maxWidth + padding; x++) {
      // Calculate distance from nearest content
      let minDistance = Infinity
      
      for (let cy = 0; cy < content.length; cy++) {
        const line = content[cy] || ''
        for (let cx = 0; cx < line.length; cx++) {
          if (line[cx] && line[cx] !== ' ') {
            const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
      
      // Add glow based on distance
      if (minDistance <= radius) {
        const glowIntensity = Math.max(0, 1 - minDistance / radius) * intensity
        if (glowIntensity > 0.7) {
          glowLine += '▓'
        } else if (glowIntensity > 0.4) {
          glowLine += '▒'
        } else if (glowIntensity > 0.1) {
          glowLine += '░'
        } else {
          glowLine += ' '
        }
      } else {
        glowLine += ' '
      }
    }
    
    glowLines.push(glowLine)
  }
  
  return glowLines
}

// =============================================================================
// Pattern Effects
// =============================================================================

/**
 * Generate pattern based on configuration
 */
export const generatePattern = (
  width: number,
  height: number,
  config: PatternConfig
): string[] => {
  const { type, scale } = config
  const lines: string[] = []
  
  for (let y = 0; y < height; y++) {
    let line = ''
    
    for (let x = 0; x < width; x++) {
      let usePattern = false
      
      switch (type) {
        case 'dots':
          usePattern = (Math.floor(x / scale) + Math.floor(y / scale)) % 2 === 0
          break
        case 'stripes':
          usePattern = Math.floor(y / scale) % 2 === 0
          break
        case 'checkerboard':
          usePattern = (Math.floor(x / scale) + Math.floor(y / scale)) % 2 === 0
          break
        case 'diagonal':
          usePattern = (x + y) % (scale * 2) < scale
          break
        case 'cross':
          usePattern = x % scale === 0 || y % scale === 0
          break
        case 'wave':
          usePattern = Math.sin(x / scale) * Math.sin(y / scale) > 0
          break
        default:
          usePattern = false
      }
      
      line += usePattern ? '█' : '░'
    }
    
    lines.push(line)
  }
  
  return lines
}

/**
 * Apply pattern to existing content
 */
export const applyPattern = (
  content: string[],
  config: PatternConfig
): string[] => {
  const maxWidth = Math.max(...content.map(line => line.length))
  const pattern = generatePattern(maxWidth, content.length, config)
  
  return content.map((line, y) => {
    const patternLine = pattern[y] || ''
    return line.split('').map((char, x) => {
      if (char === ' ') {
        return patternLine[x] || ' '
      }
      return char
    }).join('')
  })
}

// =============================================================================
// Advanced Border Styles
// =============================================================================

/**
 * Create styled border characters
 */
export const createStyledBorder = (
  width: number,
  height: number,
  borderStyle: BorderStyle
): {
  top: string
  bottom: string
  left: string
  right: string
  corners: { tl: string; tr: string; bl: string; br: string }
} => {
  const { type, width: borderWidth } = borderStyle
  
  let chars = {
    horizontal: '─',
    vertical: '│',
    tl: '┌',
    tr: '┐',
    bl: '└',
    br: '┘'
  }
  
  // Modify based on border type
  switch (type) {
    case 'dashed':
      chars = {
        horizontal: '┄',
        vertical: '┆',
        tl: '┌',
        tr: '┐',
        bl: '└',
        br: '┘'
      }
      break
    case 'dotted':
      chars = {
        horizontal: '┈',
        vertical: '┊',
        tl: '┌',
        tr: '┐',
        bl: '└',
        br: '┘'
      }
      break
    case 'double':
      chars = {
        horizontal: '═',
        vertical: '║',
        tl: '╔',
        tr: '╗',
        bl: '╚',
        br: '╝'
      }
      break
  }
  
  // Create border lines
  const top = chars.horizontal.repeat(width - 2)
  const bottom = chars.horizontal.repeat(width - 2)
  const left = chars.vertical
  const right = chars.vertical
  
  return {
    top,
    bottom,
    left,
    right,
    corners: {
      tl: chars.tl,
      tr: chars.tr,
      bl: chars.bl,
      br: chars.br
    }
  }
}

// =============================================================================
// Layer Effects
// =============================================================================

/**
 * Apply layer blending effect
 */
export const applyLayerEffect = (
  baseColor: Color,
  effect: LayerEffect
): Color => {
  const [baseR, baseG, baseB] = colorToRgb(baseColor)
  const [effectR, effectG, effectB] = colorToRgb(effect.color)
  const { opacity, type } = effect
  
  let resultR: number, resultG: number, resultB: number
  
  switch (type) {
    case 'overlay':
      resultR = Math.round(baseR * (1 - opacity) + effectR * opacity)
      resultG = Math.round(baseG * (1 - opacity) + effectG * opacity)
      resultB = Math.round(baseB * (1 - opacity) + effectB * opacity)
      break
    case 'multiply':
      resultR = Math.round(baseR * effectR / 255 * opacity + baseR * (1 - opacity))
      resultG = Math.round(baseG * effectG / 255 * opacity + baseG * (1 - opacity))
      resultB = Math.round(baseB * effectB / 255 * opacity + baseB * (1 - opacity))
      break
    case 'screen':
      resultR = Math.round(255 - (255 - baseR) * (255 - effectR) / 255 * opacity + baseR * (1 - opacity))
      resultG = Math.round(255 - (255 - baseG) * (255 - effectG) / 255 * opacity + baseG * (1 - opacity))
      resultB = Math.round(255 - (255 - baseB) * (255 - effectB) / 255 * opacity + baseB * (1 - opacity))
      break
    case 'color-dodge':
      resultR = Math.min(255, Math.round(baseR / (1 - effectR / 255) * opacity + baseR * (1 - opacity)))
      resultG = Math.min(255, Math.round(baseG / (1 - effectG / 255) * opacity + baseG * (1 - opacity)))
      resultB = Math.min(255, Math.round(baseB / (1 - effectB / 255) * opacity + baseB * (1 - opacity)))
      break
    case 'color-burn':
      resultR = Math.max(0, Math.round(255 - (255 - baseR) / (effectR / 255) * opacity + baseR * (1 - opacity)))
      resultG = Math.max(0, Math.round(255 - (255 - baseG) / (effectG / 255) * opacity + baseG * (1 - opacity)))
      resultB = Math.max(0, Math.round(255 - (255 - baseB) / (effectB / 255) * opacity + baseB * (1 - opacity)))
      break
    default:
      return baseColor
  }
  
  return {
    _tag: "RGB",
    r: Math.max(0, Math.min(255, resultR)),
    g: Math.max(0, Math.min(255, resultG)),
    b: Math.max(0, Math.min(255, resultB))
  }
}

// Helper function to convert color to RGB (reused from gradients.ts concept)
const colorToRgb = (color: Color): [number, number, number] => {
  if (color._tag === "RGB") {
    return [color.r, color.g, color.b]
  } else if (color._tag === "ANSI") {
    const ansiToRgb: Record<number, [number, number, number]> = {
      0: [0, 0, 0], 1: [128, 0, 0], 2: [0, 128, 0], 3: [128, 128, 0],
      4: [0, 0, 128], 5: [128, 0, 128], 6: [0, 128, 128], 7: [192, 192, 192],
      8: [128, 128, 128], 9: [255, 0, 0], 10: [0, 255, 0], 11: [255, 255, 0],
      12: [0, 0, 255], 13: [255, 0, 255], 14: [0, 255, 255], 15: [255, 255, 255]
    }
    return ansiToRgb[color.code] ?? [128, 128, 128]
  }
  return [128, 128, 128]
}

// =============================================================================
// Animation Helpers
// =============================================================================

/**
 * Create pulsing effect
 */
export const createPulse = (
  baseStyle: Style,
  time: number,
  intensity: number = 0.3,
  speed: number = 1
): Style => {
  const pulse = (Math.sin(time * speed) + 1) / 2 // 0 to 1
  const factor = 1 + pulse * intensity
  
  // This is a simplified implementation - in a real system you'd apply the pulse
  // to brightness or opacity
  return baseStyle
}

/**
 * Create shake effect for error states
 */
export const createShake = (
  baseOffset: { x: number; y: number },
  time: number,
  amplitude: number = 2,
  frequency: number = 8
): { x: number; y: number } => {
  const shake = Math.sin(time * frequency) * amplitude
  return {
    x: baseOffset.x + shake,
    y: baseOffset.y
  }
}

/**
 * Create bounce effect
 */
export const createBounce = (
  time: number,
  height: number = 4,
  duration: number = 1
): number => {
  const t = (time % duration) / duration
  const bounce = Math.abs(Math.sin(t * Math.PI)) * height
  return bounce
}

// =============================================================================
// Text Effects
// =============================================================================

/**
 * Create typewriter effect
 */
export const createTypewriter = (
  text: string,
  time: number,
  speed: number = 10
): string => {
  const charactersToShow = Math.floor(time * speed)
  return text.substring(0, charactersToShow)
}

/**
 * Create wave text effect
 */
export const createWaveText = (
  text: string,
  time: number,
  amplitude: number = 2,
  frequency: number = 0.5
): Array<{ char: string; offset: number }> => {
  return text.split('').map((char, index) => ({
    char,
    offset: Math.sin(time + index * frequency) * amplitude
  }))
}

/**
 * Create rainbow text effect
 */
export const createRainbowText = (
  text: string,
  time: number = 0,
  speed: number = 1
): Style[] => {
  const rainbowColors = [
    Colors.red, Colors.yellow, Colors.green, 
    Colors.cyan, Colors.blue, Colors.magenta
  ]
  
  return text.split('').map((char, index) => {
    const colorIndex = Math.floor((index + time * speed) % rainbowColors.length)
    const color = rainbowColors[colorIndex] ?? Colors.white
    return style().foreground(color)
  })
}

// =============================================================================
// Composite Effects
// =============================================================================

/**
 * Create neon sign effect
 */
export const createNeonEffect = (
  text: string,
  color: Color,
  time: number = 0
): {
  mainStyle: Style
  glowStyle: Style
  flickerIntensity: number
} => {
  const flicker = Math.sin(time * 13) * 0.1 + 0.9 // 0.8 to 1.0
  const glow = Math.sin(time * 3) * 0.2 + 0.8 // 0.6 to 1.0
  
  return {
    mainStyle: style().foreground(color).bold(),
    glowStyle: style().foreground(color), // Would apply glow effect
    flickerIntensity: flicker
  }
}

/**
 * Create matrix-style digital rain effect
 */
export const createMatrixEffect = (
  width: number,
  height: number,
  time: number,
  density: number = 0.1
): Array<{ x: number; y: number; char: string; intensity: number }> => {
  const drops: Array<{ x: number; y: number; char: string; intensity: number }> = []
  
  for (let x = 0; x < width; x++) {
    if (Math.random() < density) {
      const chars = '0123456789ABCDEF'
      const char = chars[Math.floor(Math.random() * chars.length)] ?? '0'
      const y = Math.floor((time + x) * 5) % height
      const intensity = Math.random()
      
      drops.push({ x, y, char, intensity })
    }
  }
  
  return drops
}

/**
 * Create hologram effect
 */
export const createHologramEffect = (
  time: number,
  scanlineSpeed: number = 2
): {
  scanlinePosition: number
  interference: number
  flicker: boolean
} => {
  const scanline = (time * scanlineSpeed) % 1
  const interference = Math.sin(time * 7) * 0.1
  const flicker = Math.random() < 0.05 // 5% chance to flicker
  
  return {
    scanlinePosition: scanline,
    interference,
    flicker
  }
}