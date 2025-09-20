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
const interpolateGradientColors = (color1: Color, color2: Color, t: number): Color => {
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
      return interpolateGradientColors(stop1.color, stop2.color, easedT)
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

// =============================================================================
// High-level gradient helpers (string-based)
// =============================================================================

export interface GradientStopDefinition {
  readonly color: string
  readonly position: number
}

export interface LinearGradientDefinition {
  readonly type: 'linear'
  readonly angle: number
  readonly stops: GradientStopDefinition[]
}

export interface RadialGradientDefinition {
  readonly type: 'radial'
  readonly center: { readonly x: number; readonly y: number }
  readonly radius: number
  readonly stops: GradientStopDefinition[]
}

export type GradientDefinition = LinearGradientDefinition | RadialGradientDefinition

interface LinearGradientOptions {
  readonly angle?: number
  readonly stops: GradientStopDefinition[]
}

interface RadialGradientOptions {
  readonly center?: { readonly x: number; readonly y: number }
  readonly radius?: number
  readonly stops: GradientStopDefinition[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const clamp01 = (value: number) => clamp(value, 0, 1)

const normalizeAngle = (angle: number) => {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const normalizeStops = (stops: GradientStopDefinition[]): GradientStopDefinition[] => {
  if (stops.length === 0) {
    return [{ color: '#000000', position: 0 }]
  }

  const sanitized = stops.map((stop, index) => {
    const color = stop.color
    const position = isFinite(stop.position) ? clamp01(stop.position) : clamp01(index / Math.max(1, stops.length - 1))
    return { color, position }
  })

  return sanitized.sort((a, b) => a.position - b.position)
}

const colorNameMap: Record<string, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  black: '#000000',
  white: '#ffffff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080'
}

interface RgbColor {
  r: number
  g: number
  b: number
  a?: number
}

const parseColorString = (input: string): RgbColor => {
  const color = input.trim().toLowerCase()

  if (color.startsWith('#')) {
    const normalized = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color
    const value = normalized.replace('#', '')
    const r = parseInt(value.substring(0, 2), 16)
    const g = parseInt(value.substring(2, 4), 16)
    const b = parseInt(value.substring(4, 6), 16)
    return { r, g, b }
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/)
  if (rgbMatch) {
    const parts = rgbMatch[1]!.split(',').map(part => part.trim())
    const r = clamp(parseFloat(parts[0] ?? '0'), 0, 255)
    const g = clamp(parseFloat(parts[1] ?? '0'), 0, 255)
    const b = clamp(parseFloat(parts[2] ?? '0'), 0, 255)
    const a = parts[3] !== undefined ? clamp(parseFloat(parts[3]!), 0, 1) : undefined
    return { r, g, b, a }
  }

  const hex = colorNameMap[color]
  if (hex) {
    return parseColorString(hex)
  }

  // Fallback to white
  return { r: 255, g: 255, b: 255 }
}

const rgbToAnsi = ({ r, g, b }: RgbColor) => `\x1b[38;2;${Math.round(r)};${Math.round(g)};${Math.round(b)}m`

const rgbToHex = ({ r, g, b }: RgbColor) => {
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`
}

const getColorAtDefinition = (gradient: GradientDefinition, position: number): RgbColor => {
  const stops = normalizeStops(gradient.stops)
  if (stops.length === 1) {
    return parseColorString(stops[0]!.color)
  }

  const clamped = clamp01(position)
  if (clamped <= stops[0]!.position) {
    return parseColorString(stops[0]!.color)
  }
  if (clamped >= stops[stops.length - 1]!.position) {
    return parseColorString(stops[stops.length - 1]!.color)
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i]!
    const end = stops[i + 1]!
    if (clamped >= start.position && clamped <= end.position) {
      const localT = (clamped - start.position) / Math.max(1e-6, end.position - start.position)
      const startColor = parseColorString(start.color)
      const endColor = parseColorString(end.color)
      return interpolateColors(startColor, endColor, localT)
    }
  }

  return parseColorString(stops[0]!.color)
}

const distributeStops = (stops: GradientStopDefinition[]): GradientStopDefinition[] => {
  if (stops.length <= 1) {
    return stops
  }
  const defined = stops.some(stop => isFinite(stop.position))
  if (defined) {
    return stops
  }
  return stops.map((stop, index) => ({
    color: stop.color,
    position: clamp01(index / (stops.length - 1))
  }))
}

export const createLinearGradient = (options: LinearGradientOptions): LinearGradientDefinition => {
  const angle = normalizeAngle(options.angle ?? 0)
  const normalizedStops = normalizeStops(distributeStops(options.stops))
  return { type: 'linear', angle, stops: normalizedStops }
}

export const createRadialGradient = (options: RadialGradientOptions): RadialGradientDefinition => {
  const center = options.center ?? { x: 0.5, y: 0.5 }
  const radius = clamp(options.radius ?? 1, 0, 2)
  const normalizedStops = normalizeStops(distributeStops(options.stops))
  return {
    type: 'radial',
    center: { x: clamp01(center.x ?? 0.5), y: clamp01(center.y ?? 0.5) },
    radius,
    stops: normalizedStops
  }
}

const parseStopsFromString = (stopsPart: string): GradientStopDefinition[] => {
  const segments = stopsPart.split(',')
  const stops: GradientStopDefinition[] = []
  segments.forEach((segment, index) => {
    const trimmed = segment.trim()
    if (!trimmed) return
    const parts = trimmed.split(/\s+/)
    const color = parts[0]!
    let position: number | undefined
    if (parts[1]) {
      const numeric = parseFloat(parts[1]!.replace('%', ''))
      if (!Number.isNaN(numeric)) {
        position = clamp01(numeric / 100)
      }
    }
    stops.push({
      color,
      position: position ?? clamp01(stops.length === 1 ? 1 : index / Math.max(1, segments.length - 1))
    })
  })
  return normalizeStops(stops)
}

export const parseGradientString = (input: string): GradientDefinition | null => {
  if (typeof input !== 'string' || input.trim() === '') {
    return null
  }

  const value = input.trim()
  const linearMatch = value.match(/^linear-gradient\(([^,]+),(.*)\)$/i)
  if (linearMatch) {
    const anglePart = linearMatch[1]!.trim()
    const angleMatch = anglePart.match(/(-?\d+(?:\.\d+)?)deg/i)
    const angle = angleMatch ? parseFloat(angleMatch[1]!) : 0
    const stops = parseStopsFromString(linearMatch[2]!)
    return createLinearGradient({ angle, stops })
  }

  const radialMatch = value.match(/^radial-gradient\((.*)\)$/i)
  if (radialMatch) {
    const body = radialMatch[1]!
    const parts = body.split(',')
    let stopStartIndex = 0
    let center = { x: 0.5, y: 0.5 }
    let radius = 1

    if (parts[0]) {
      const descriptor = parts[0]!.trim()
      const atMatch = descriptor.match(/circle\s*(?:at\s+([^,]+))?/i)
      if (atMatch) {
        stopStartIndex = 1
        const position = (atMatch[1] ?? '').trim()
        if (position === '' || position.toLowerCase() === 'center') {
          center = { x: 0.5, y: 0.5 }
        } else {
          const coords = position.split(/\s+/)
          const xPercent = parseFloat(coords[0]?.replace('%', '') ?? '50')
          const yPercent = parseFloat(coords[1]?.replace('%', '') ?? String(xPercent))
          center = { x: clamp01((xPercent || 0) / 100), y: clamp01((yPercent || 0) / 100) }
        }
      }
    }

    const stopsPart = parts.slice(stopStartIndex).join(',')
    const stops = parseStopsFromString(stopsPart)
    return createRadialGradient({ center, radius, stops })
  }

  return null
}

export const interpolateColors = (color1: RgbColor, color2: RgbColor, t: number): RgbColor => {
  const clamped = clamp01(t)
  const lerpComponent = (a: number, b: number) => Math.round(a + (b - a) * clamped)
  const a = color1.a !== undefined || color2.a !== undefined
    ? (color1.a ?? 1) + ((color2.a ?? 1) - (color1.a ?? 1)) * clamped
    : undefined
  return {
    r: lerpComponent(color1.r, color2.r),
    g: lerpComponent(color1.g, color2.g),
    b: lerpComponent(color1.b, color2.b),
    ...(a !== undefined ? { a } : {})
  }
}

export const generateGradientStops = (gradient: GradientDefinition, width: number): string[] => {
  if (width <= 0) {
    return []
  }
  if (width === 1) {
    const color = getColorAtDefinition(gradient, 0)
    return [`rgb(${color.r}, ${color.g}, ${color.b})`]
  }
  const stops: string[] = []
  for (let i = 0; i < width; i++) {
    const position = i / (width - 1)
    const color = getColorAtDefinition(gradient, position)
    stops.push(`rgb(${color.r}, ${color.g}, ${color.b})`)
  }
  return stops
}

export const calculateGradientPosition = (
  gradient: GradientDefinition,
  x: number,
  y: number,
  width: number,
  height: number
): number => {
  const widthDen = Math.max(1, width)
  const heightDen = Math.max(1, height)

  if (gradient.type === 'linear') {
    const angleRad = (gradient.angle * Math.PI) / 180
    const nx = widthDen === 0 ? 0 : x / widthDen
    const ny = heightDen === 0 ? 0 : y / heightDen
    const value = nx * Math.cos(angleRad) + ny * Math.sin(angleRad)
    return clamp01(value)
  }

  // radial
  const nx = widthDen === 0 ? 0 : x / widthDen
  const ny = heightDen === 0 ? 0 : y / heightDen
  const dx = nx - gradient.center.x
  const dy = ny - gradient.center.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const radius = gradient.radius <= 0 ? 1 : gradient.radius
  return clamp01(distance / radius)
}

export const applyGradientToText = (text: string, gradient: GradientDefinition): string => {
  if (!text) {
    return ''
  }
  const stops = generateGradientStops(gradient, text.length)
  let colored = ''
  for (let i = 0; i < text.length; i++) {
    const rgbMatch = stops[i]!.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    const color = rgbMatch
      ? { r: parseInt(rgbMatch[1]!, 10), g: parseInt(rgbMatch[2]!, 10), b: parseInt(rgbMatch[3]!, 10) }
      : parseColorString('#ffffff')
    colored += `${rgbToAnsi(color)}${text[i]}`
  }
  return `${colored}\x1b[0m${text}`
}

export const validateGradientSyntax = (input: string): boolean => {
  if (typeof input !== 'string') {
    return false
  }
  return /^\s*(linear-gradient\([^)]*\)|radial-gradient\([^)]*\))\s*$/i.test(input)
}

export const getGradientColors = (gradient: GradientDefinition): string[] => {
  return gradient.stops.map(stop => stop.color)
}

const isLinearDefinition = (gradient: unknown): gradient is LinearGradientDefinition =>
  typeof gradient === 'object' && gradient !== null && (gradient as any).type === 'linear'

const isRadialDefinition = (gradient: unknown): gradient is RadialGradientDefinition =>
  typeof gradient === 'object' && gradient !== null && (gradient as any).type === 'radial'

export const reverseGradient = (
  gradient: GradientConfig | GradientDefinition
): GradientConfig | GradientDefinition => {
  if (isLinearDefinition(gradient) || isRadialDefinition(gradient)) {
    const stops = gradient.stops.slice().reverse()
    const recalculated = stops.map((stop, index) => ({
      color: stop.color,
      position: stops.length === 1 ? stop.position : clamp01(index / Math.max(1, stops.length - 1))
    }))
    if (isLinearDefinition(gradient)) {
      return { ...gradient, stops: recalculated }
    }
    return { ...gradient, stops: recalculated }
  }

  return {
    ...(gradient as GradientConfig),
    stops: (gradient as GradientConfig).stops.map(stop => ({
      ...stop,
      position: 1 - stop.position
    }))
  }
}

export const rotateGradient = (gradient: GradientDefinition, angle: number): GradientDefinition => {
  if (gradient.type === 'linear') {
    return { ...gradient, angle: normalizeAngle(gradient.angle + angle) }
  }
  return gradient
}

export const optimizeGradient = (gradient: GradientDefinition): GradientDefinition => {
  const optimizedStops = gradient.stops.filter((stop, index, array) => {
    if (index === 0) return true
    const prev = array[index - 1]!
    return prev.color.toLowerCase() !== stop.color.toLowerCase()
  })
  if (isLinearDefinition(gradient)) {
    return { ...gradient, stops: optimizedStops }
  }
  return { ...gradient, stops: optimizedStops }
}

export const blendGradients = (
  gradientA: LinearGradientDefinition,
  gradientB: LinearGradientDefinition,
  factor: number
): LinearGradientDefinition => {
  const positions = new Set<number>([0, 1])
  gradientA.stops.forEach(stop => positions.add(clamp01(stop.position)))
  gradientB.stops.forEach(stop => positions.add(clamp01(stop.position)))
  const sortedPositions = Array.from(positions).sort((a, b) => a - b)

  const stops = sortedPositions.map(position => {
    const colorA = getColorAtDefinition(gradientA, position)
    const colorB = getColorAtDefinition(gradientB, position)
    const blended = interpolateColors(colorA, colorB, factor)
    return { color: rgbToHex(blended), position }
  })

  return {
    type: 'linear',
    angle: normalizeAngle(gradientA.angle),
    stops
  }
}

export const convertGradientFormat = (gradient: GradientDefinition, format: 'css' | 'object' = 'css'): string | GradientDefinition => {
  if (format === 'object') {
    return gradient
  }

  if (gradient.type === 'linear') {
    const stops = gradient.stops
      .map(stop => `${stop.color} ${(stop.position * 100).toFixed(0)}%`)
      .join(', ')
    return `linear-gradient(${gradient.angle}deg, ${stops})`
  }

  const stops = gradient.stops
    .map(stop => `${stop.color} ${(stop.position * 100).toFixed(0)}%`)
    .join(', ')
  return `radial-gradient(circle at ${Math.round(gradient.center.x * 100)}% ${Math.round(gradient.center.y * 100)}%, ${stops})`
}
