/**
 * Color System - Comprehensive color handling for the CLI-Kit framework
 * 
 * Inspired by Lipgloss's color system with support for:
 * - ANSI colors (16 colors)
 * - ANSI256 colors (256 colors)
 * - RGB/Hex colors (true color)
 * - Adaptive colors (light/dark mode)
 * - No color (transparent)
 */

import { Data, Option, pipe } from "effect"
import type { RendererService } from "@/services/renderer.ts"

// =============================================================================
// Color Types
// =============================================================================

/**
 * Color representation as a discriminated union
 * Supporting multiple color formats for different terminal capabilities
 */
export type Color = 
  | { readonly _tag: "NoColor" }
  | { readonly _tag: "ANSI"; readonly code: number }
  | { readonly _tag: "ANSI256"; readonly code: number }
  | { readonly _tag: "Hex"; readonly value: string }
  | { readonly _tag: "RGB"; readonly r: number; readonly g: number; readonly b: number }
  | { readonly _tag: "Adaptive"; readonly light: Color; readonly dark: Color }

/**
 * Color constructors
 */
export const Color = {
  NoColor: (): Color => ({ _tag: "NoColor" }),
  ANSI: (code: number): Color => ({ _tag: "ANSI", code }),
  ANSI256: (code: number): Color => ({ _tag: "ANSI256", code }),
  Hex: (value: string): Color => ({ _tag: "Hex", value }),
  RGB: (r: number, g: number, b: number): Color => ({ _tag: "RGB", r, g, b }),
  Adaptive: (light: Color, dark: Color): Color => ({ _tag: "Adaptive", light, dark })
}

// =============================================================================
// Color Profile
// =============================================================================

/**
 * Terminal color capability detection
 */
export enum ColorProfile {
  /** No color support */
  NoColor = 0,
  /** 16 colors (standard ANSI) */
  ANSI = 1,
  /** 256 colors */
  ANSI256 = 2,
  /** True color (16.7M colors) */
  TrueColor = 3
}

// =============================================================================
// Color Constructors
// =============================================================================

/**
 * Smart constructors for creating colors with validation
 */
export const Colors = {
  /**
   * Create a no-color (transparent) value
   */
  none: (): Color => Color.NoColor(),
  
  /**
   * Create a hex color with validation
   */
  hex: (value: string): Option.Option<Color> => {
    // Normalize hex value
    const normalized = value.startsWith("#") ? value : `#${value}`
    
    // Validate hex format
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      return Option.some(Color.Hex(normalized))
    }
    return Option.none()
  },
  
  /**
   * Create an RGB color with validation
   */
  rgb: (r: number, g: number, b: number): Option.Option<Color> => {
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      return Option.some(Color.RGB(r, g, b))
    }
    return Option.none()
  },
  
  /**
   * Create an ANSI color (0-15)
   */
  ansi: (code: number): Option.Option<Color> => {
    if (code >= 0 && code <= 15) {
      return Option.some(Color.ANSI(code))
    }
    return Option.none()
  },
  
  /**
   * Create an ANSI256 color (0-255)
   */
  ansi256: (code: number): Option.Option<Color> => {
    if (code >= 0 && code <= 255) {
      return Option.some(Color.ANSI256(code))
    }
    return Option.none()
  },
  
  /**
   * Create an adaptive color that changes based on terminal background
   */
  adaptive: (light: Color, dark: Color): Color => 
    Color.Adaptive(light, dark),
  
  // ==========================================================================
  // Predefined ANSI Colors
  // ==========================================================================
  
  // Standard colors (30-37)
  black: Color.ANSI(0),
  red: Color.ANSI(1),
  green: Color.ANSI(2),
  yellow: Color.ANSI(3),
  blue: Color.ANSI(4),
  magenta: Color.ANSI(5),
  cyan: Color.ANSI(6),
  white: Color.ANSI(7),
  
  // Bright colors (90-97)
  brightBlack: Color.ANSI(8),
  brightRed: Color.ANSI(9),
  brightGreen: Color.ANSI(10),
  brightYellow: Color.ANSI(11),
  brightBlue: Color.ANSI(12),
  brightMagenta: Color.ANSI(13),
  brightCyan: Color.ANSI(14),
  brightWhite: Color.ANSI(15),
  
  // Aliases
  gray: Color.ANSI(8),
  grey: Color.ANSI(8),
  
  // ==========================================================================
  // Extended RGB Color Palette
  // ==========================================================================
  
  // Orange shades
  orange: Color.RGB(255, 140, 0),
  deepOrange: Color.RGB(255, 87, 34),
  lightOrange: Color.RGB(255, 183, 77),
  darkOrange: Color.RGB(230, 81, 0),
  
  // Purple shades
  purple: Color.RGB(128, 0, 128),
  deepPurple: Color.RGB(103, 58, 183),
  lightPurple: Color.RGB(186, 104, 200),
  darkPurple: Color.RGB(74, 20, 140),
  indigo: Color.RGB(63, 81, 181),
  violet: Color.RGB(238, 130, 238),
  
  // Pink shades
  pink: Color.RGB(233, 30, 99),
  lightPink: Color.RGB(244, 143, 177),
  deepPink: Color.RGB(255, 20, 147),
  hotPink: Color.RGB(255, 105, 180),
  
  // Teal and cyan variants
  teal: Color.RGB(0, 150, 136),
  lightTeal: Color.RGB(77, 182, 172),
  darkTeal: Color.RGB(0, 77, 64),
  aqua: Color.RGB(0, 255, 255),
  turquoise: Color.RGB(64, 224, 208),
  
  // Brown shades
  brown: Color.RGB(121, 85, 72),
  lightBrown: Color.RGB(161, 136, 127),
  darkBrown: Color.RGB(62, 39, 35),
  
  // Green variants
  lime: Color.RGB(205, 220, 57),
  lightGreen: Color.RGB(139, 195, 74),
  darkGreen: Color.RGB(27, 94, 32),
  forest: Color.RGB(34, 139, 34),
  mint: Color.RGB(152, 251, 152),
  olive: Color.RGB(128, 128, 0),
  
  // Blue variants
  lightBlue: Color.RGB(3, 169, 244),
  darkBlue: Color.RGB(13, 71, 161),
  navy: Color.RGB(0, 0, 128),
  royal: Color.RGB(65, 105, 225),
  sky: Color.RGB(135, 206, 235),
  steel: Color.RGB(70, 130, 180),
  
  // Red variants
  crimson: Color.RGB(220, 20, 60),
  scarlet: Color.RGB(255, 36, 0),
  maroon: Color.RGB(128, 0, 0),
  coral: Color.RGB(255, 127, 80),
  
  // Yellow variants
  gold: Color.RGB(255, 215, 0),
  amber: Color.RGB(255, 193, 7),
  lemon: Color.RGB(255, 244, 67),
  
  // Gray variants
  lightGray: Color.RGB(189, 189, 189),
  darkGray: Color.RGB(66, 66, 66),
  silver: Color.RGB(192, 192, 192),
  charcoal: Color.RGB(54, 69, 79),
  
  // Neon colors
  neonGreen: Color.RGB(57, 255, 20),
  neonBlue: Color.RGB(0, 149, 255),
  neonPink: Color.RGB(255, 16, 240),
  neonYellow: Color.RGB(255, 255, 0),
  neonOrange: Color.RGB(255, 128, 0),
  neonPurple: Color.RGB(177, 3, 252),
  
  // Pastel colors
  pastelPink: Color.RGB(255, 209, 220),
  pastelBlue: Color.RGB(174, 198, 207),
  pastelGreen: Color.RGB(162, 210, 162),
  pastelYellow: Color.RGB(255, 254, 162),
  pastelPurple: Color.RGB(221, 160, 221),
  pastelOrange: Color.RGB(255, 179, 71),
} as const

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert hex to RGB
 */
const hexToRgb = (hex: string): Option.Option<{ r: number; g: number; b: number }> => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return Option.some({
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    })
  }
  return Option.none()
}

/**
 * Convert RGB to ANSI256
 */
const rgbToAnsi256 = (r: number, g: number, b: number): number => {
  // Gray scale check
  if (r === g && g === b) {
    if (r < 8) return 16
    if (r > 248) return 231
    return Math.round(((r - 8) / 247) * 24) + 232
  }
  
  // Color cube
  const ansi = 16 +
    (36 * Math.round(r / 255 * 5)) +
    (6 * Math.round(g / 255 * 5)) +
    Math.round(b / 255 * 5)
  
  return ansi
}

/**
 * Convert RGB to nearest ANSI color (16 colors)
 */
const rgbToAnsi = (r: number, g: number, b: number): number => {
  const colors = [
    { r: 0, g: 0, b: 0 },       // black
    { r: 205, g: 0, b: 0 },     // red
    { r: 0, g: 205, b: 0 },     // green
    { r: 205, g: 205, b: 0 },   // yellow
    { r: 0, g: 0, b: 238 },     // blue
    { r: 205, g: 0, b: 205 },   // magenta
    { r: 0, g: 205, b: 205 },   // cyan
    { r: 229, g: 229, b: 229 }, // white
    { r: 127, g: 127, b: 127 }, // bright black (gray)
    { r: 255, g: 0, b: 0 },     // bright red
    { r: 0, g: 255, b: 0 },     // bright green
    { r: 255, g: 255, b: 0 },   // bright yellow
    { r: 92, g: 92, b: 255 },   // bright blue
    { r: 255, g: 0, b: 255 },   // bright magenta
    { r: 0, g: 255, b: 255 },   // bright cyan
    { r: 255, g: 255, b: 255 }  // bright white
  ]
  
  let minDistance = Infinity
  let closestIndex = 0
  
  for (let i = 0; i < colors.length; i++) {
    const distance = Math.sqrt(
      Math.pow(r - colors[i].r, 2) +
      Math.pow(g - colors[i].g, 2) +
      Math.pow(b - colors[i].b, 2)
    )
    
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
    }
  }
  
  return closestIndex
}

// =============================================================================
// Color Rendering
// =============================================================================

/**
 * Convert a color to its ANSI escape sequence based on color profile
 */
export const toAnsiSequence = (
  color: Color,
  profile: ColorProfile,
  background: boolean = false
): string => {
  const base = background ? 40 : 30
  const brightBase = background ? 100 : 90
  
  switch (color._tag) {
    case "NoColor":
      return ""
      
    case "ANSI": {
      const { code } = color
      if (code < 8) {
        return `\x1b[${base + code}m`
      } else {
        return `\x1b[${brightBase + (code - 8)}m`
      }
    }
    
    case "ANSI256": {
      if (profile < ColorProfile.ANSI256) {
        // Downgrade to ANSI
        const { code } = color
        if (code < 16) {
          return toAnsiSequence(Color.ANSI(code), profile, background)
        }
        // Convert to nearest ANSI color
        // This is a simplified conversion
        const ansiCode = code < 8 ? 0 : code < 16 ? code - 8 + 90 : 7
        return `\x1b[${ansiCode}m`
      }
      return `\x1b[${background ? 48 : 38};5;${color.code}m`
    }
    
    case "Hex": {
      const rgb = hexToRgb(color.value)
      if (Option.isNone(rgb)) return ""
      
      const { r, g, b } = rgb.value
      return toAnsiSequence(Color.RGB(r, g, b), profile, background)
    }
    
    case "RGB": {
      const { r, g, b } = color
      
      if (profile === ColorProfile.TrueColor) {
        return `\x1b[${background ? 48 : 38};2;${r};${g};${b}m`
      } else if (profile === ColorProfile.ANSI256) {
        const code = rgbToAnsi256(r, g, b)
        return toAnsiSequence(Color.ANSI256(code), profile, background)
      } else if (profile === ColorProfile.ANSI) {
        const code = rgbToAnsi(r, g, b)
        return toAnsiSequence(Color.ANSI({ code }), profile, background)
      }
      return ""
    }
    
    case "Adaptive":
      // This requires runtime detection of terminal background
      // For now, default to dark mode
      // In a real implementation, this would check the terminal background
      return toAnsiSequence(color.dark, profile, background)
  }
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Check if a color has any visible effect
 */
export const isVisible = (color: Color): boolean => 
  color._tag !== "NoColor"

/**
 * Blend two colors together
 */
export const blend = (fg: Color, bg: Color, alpha: number): Color => {
  // Simple alpha blending for RGB colors
  if (fg._tag === "RGB" && bg._tag === "RGB") {
    const a = Math.max(0, Math.min(1, alpha))
    return Color.RGB(
      Math.round(fg.r * a + bg.r * (1 - a)),
      Math.round(fg.g * a + bg.g * (1 - a)),
      Math.round(fg.b * a + bg.b * (1 - a))
    )
  }
  // For other color types, return the foreground if alpha > 0.5
  return alpha > 0.5 ? fg : bg
}

/**
 * Lighten a color by a percentage (0-1)
 */
export const lighten = (color: Color, amount: number): Color => {
  if (color._tag === "RGB") {
    const factor = 1 + Math.max(0, Math.min(1, amount))
    return Color.RGB(
      Math.min(255, Math.round(color.r * factor)),
      Math.min(255, Math.round(color.g * factor)),
      Math.min(255, Math.round(color.b * factor))
    )
  }
  return color
}

/**
 * Darken a color by a percentage (0-1)
 */
export const darken = (color: Color, amount: number): Color => {
  if (color._tag === "RGB") {
    const factor = 1 - Math.max(0, Math.min(1, amount))
    return Color.RGB(
      Math.round(color.r * factor),
      Math.round(color.g * factor),
      Math.round(color.b * factor)
    )
  }
  return color
}

/**
 * Create a gradient between two colors
 */
export const gradient = (start: Color, end: Color, steps: number): ReadonlyArray<Color> => {
  if (steps <= 1) return [start]
  if (steps === 2) return [start, end]
  
  // Only works with RGB colors
  if (start._tag !== "RGB" || end._tag !== "RGB") {
    return Array(steps).fill(start)
  }
  
  const result: Color[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    result.push(Color.RGB(
      Math.round(start.r + (end.r - start.r) * t),
      Math.round(start.g + (end.g - start.g) * t),
      Math.round(start.b + (end.b - start.b) * t)
    ))
  }
  
  return result
}