/**
 * Color System Tests
 *
 * Tests for ANSI color handling, conversion, and profiles
 */

import { describe, it, expect } from 'bun:test'
import { Colors, ColorProfile, toAnsiSequence, hexToRgb, rgbToAnsi256, parseColor } from './color'

describe('Color System', () => {
  describe('Basic colors', () => {
    it('should provide standard ANSI colors', () => {
      expect(Colors.red).toEqual({ type: 'ansi', value: 31 })
      expect(Colors.green).toEqual({ type: 'ansi', value: 32 })
      expect(Colors.blue).toEqual({ type: 'ansi', value: 34 })
      expect(Colors.yellow).toEqual({ type: 'ansi', value: 33 })
      expect(Colors.magenta).toEqual({ type: 'ansi', value: 35 })
      expect(Colors.cyan).toEqual({ type: 'ansi', value: 36 })
      expect(Colors.white).toEqual({ type: 'ansi', value: 37 })
      expect(Colors.black).toEqual({ type: 'ansi', value: 30 })
    })

    it('should provide bright ANSI colors', () => {
      expect(Colors.brightRed).toEqual({ type: 'ansi', value: 91 })
      expect(Colors.brightGreen).toEqual({ type: 'ansi', value: 92 })
      expect(Colors.brightBlue).toEqual({ type: 'ansi', value: 94 })
      expect(Colors.brightYellow).toEqual({ type: 'ansi', value: 93 })
    })

    it('should provide dark colors', () => {
      expect(Colors.darkRed).toEqual({ type: 'ansi', value: 31 }) // Same as red
      expect(Colors.darkGreen).toEqual({ type: 'ansi', value: 32 })
      expect(Colors.darkBlue).toEqual({ type: 'ansi', value: 34 })
    })

    it('should provide gray scale colors', () => {
      expect(Colors.gray).toEqual({ type: 'ansi256', value: 244 })
      expect(Colors.darkGray).toEqual({ type: 'ansi256', value: 238 })
      expect(Colors.lightGray).toEqual({ type: 'ansi256', value: 250 })
    })
  })

  describe('ANSI sequence generation', () => {
    it('should generate correct ANSI sequences for basic colors', () => {
      expect(toAnsiSequence(Colors.red, ColorProfile.ANSI)).toBe('\x1b[31m')
      expect(toAnsiSequence(Colors.green, ColorProfile.ANSI)).toBe('\x1b[32m')
      expect(toAnsiSequence(Colors.blue, ColorProfile.ANSI)).toBe('\x1b[34m')
    })

    it('should generate correct ANSI sequences for bright colors', () => {
      expect(toAnsiSequence(Colors.brightRed, ColorProfile.ANSI)).toBe('\x1b[91m')
      expect(toAnsiSequence(Colors.brightGreen, ColorProfile.ANSI)).toBe('\x1b[92m')
    })

    it('should generate ANSI256 sequences', () => {
      const color256 = { type: 'ansi256' as const, value: 196 }
      expect(toAnsiSequence(color256, ColorProfile.ANSI256)).toBe('\x1b[38;5;196m')
    })

    it('should generate RGB sequences', () => {
      const rgbColor = { type: 'rgb' as const, r: 255, g: 128, b: 64 }
      expect(toAnsiSequence(rgbColor, ColorProfile.TRUECOLOR)).toBe('\x1b[38;2;255;128;64m')
    })

    it('should generate hex color sequences', () => {
      const hexColor = { type: 'hex' as const, value: '#ff8040' }
      expect(toAnsiSequence(hexColor, ColorProfile.TRUECOLOR)).toBe('\x1b[38;2;255;128;64m')
    })

    it('should fallback to lower color profiles', () => {
      const rgbColor = { type: 'rgb' as const, r: 255, g: 0, b: 0 }

      // Should fallback to ANSI256 when requested profile is lower
      const ansi256 = toAnsiSequence(rgbColor, ColorProfile.ANSI256)
      expect(ansi256).toMatch(/\x1b\[38;5;\d+m/)

      // Should fallback to basic ANSI
      const ansi = toAnsiSequence(rgbColor, ColorProfile.ANSI)
      expect(ansi).toMatch(/\x1b\[3\dm/)
    })
  })

  describe('Color conversion', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should handle short hex format', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 })
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should handle hex without hash', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('f00')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should convert RGB to ANSI256', () => {
      expect(rgbToAnsi256({ r: 255, g: 0, b: 0 })).toBe(196) // Bright red
      expect(rgbToAnsi256({ r: 0, g: 255, b: 0 })).toBe(46) // Bright green
      expect(rgbToAnsi256({ r: 0, g: 0, b: 255 })).toBe(21) // Bright blue
      expect(rgbToAnsi256({ r: 0, g: 0, b: 0 })).toBe(16) // Black
      expect(rgbToAnsi256({ r: 255, g: 255, b: 255 })).toBe(231) // White
    })

    it('should convert gray scale to ANSI256', () => {
      expect(rgbToAnsi256({ r: 128, g: 128, b: 128 })).toBeGreaterThan(231) // Gray scale
      expect(rgbToAnsi256({ r: 64, g: 64, b: 64 })).toBeGreaterThan(231)
    })
  })

  describe('Color parsing', () => {
    it('should parse named colors', () => {
      expect(parseColor('red')).toEqual(Colors.red)
      expect(parseColor('green')).toEqual(Colors.green)
      expect(parseColor('blue')).toEqual(Colors.blue)
    })

    it('should parse hex colors', () => {
      const parsed = parseColor('#ff0000')
      expect(parsed).toEqual({ type: 'hex', value: '#ff0000' })
    })

    it('should parse RGB colors', () => {
      const parsed = parseColor('rgb(255, 0, 0)')
      expect(parsed).toEqual({ type: 'rgb', r: 255, g: 0, b: 0 })
    })

    it('should parse ANSI color codes', () => {
      const parsed = parseColor('31')
      expect(parsed).toEqual({ type: 'ansi', value: 31 })
    })

    it('should parse ANSI256 color codes', () => {
      const parsed = parseColor('196')
      expect(parsed).toEqual({ type: 'ansi256', value: 196 })
    })

    it('should handle invalid colors gracefully', () => {
      expect(() => parseColor('invalid')).toThrow()
      expect(() => parseColor('#zzz')).toThrow()
      expect(() => parseColor('rgb(300, 0, 0)')).toThrow()
    })
  })

  describe('Color profiles', () => {
    it('should respect NONE profile', () => {
      const sequence = toAnsiSequence(Colors.red, ColorProfile.NONE)
      expect(sequence).toBe('')
    })

    it('should limit to ANSI profile', () => {
      const rgbColor = { type: 'rgb' as const, r: 255, g: 128, b: 64 }
      const sequence = toAnsiSequence(rgbColor, ColorProfile.ANSI)

      // Should be converted to basic ANSI (30-37 or 90-97)
      expect(sequence).toMatch(/\x1b\[(3|9)\dm/)
    })

    it('should support ANSI256 profile', () => {
      const color256 = { type: 'ansi256' as const, value: 196 }
      const sequence = toAnsiSequence(color256, ColorProfile.ANSI256)

      expect(sequence).toBe('\x1b[38;5;196m')
    })

    it('should support TRUECOLOR profile', () => {
      const rgbColor = { type: 'rgb' as const, r: 255, g: 128, b: 64 }
      const sequence = toAnsiSequence(rgbColor, ColorProfile.TRUECOLOR)

      expect(sequence).toBe('\x1b[38;2;255;128;64m')
    })
  })

  describe('Background colors', () => {
    it('should generate background color sequences', () => {
      const bgRed = toAnsiSequence(Colors.red, ColorProfile.ANSI, true)
      expect(bgRed).toBe('\x1b[41m') // 40 + 1 for background red
    })

    it('should generate 256-color background sequences', () => {
      const color256 = { type: 'ansi256' as const, value: 196 }
      const bg256 = toAnsiSequence(color256, ColorProfile.ANSI256, true)
      expect(bg256).toBe('\x1b[48;5;196m')
    })

    it('should generate RGB background sequences', () => {
      const rgbColor = { type: 'rgb' as const, r: 255, g: 128, b: 64 }
      const bgRgb = toAnsiSequence(rgbColor, ColorProfile.TRUECOLOR, true)
      expect(bgRgb).toBe('\x1b[48;2;255;128;64m')
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid hex values', () => {
      expect(() => hexToRgb('#')).toThrow()
      expect(() => hexToRgb('#gg0000')).toThrow()
    })

    it('should clamp RGB values', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should handle edge ANSI256 values', () => {
      expect(rgbToAnsi256({ r: 0, g: 0, b: 0 })).toBe(16) // First color
      expect(rgbToAnsi256({ r: 255, g: 255, b: 255 })).toBe(231) // Last standard color
    })
  })

  describe('Performance', () => {
    it('should convert colors efficiently', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        const hex = `#${i.toString(16).padStart(6, '0')}`
        hexToRgb(hex)
      }

      const endTime = performance.now()
      const conversionTime = endTime - startTime

      expect(conversionTime).toBeLessThan(100) // Should be fast
    })

    it('should generate ANSI sequences efficiently', () => {
      const colors = [Colors.red, Colors.green, Colors.blue]
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        for (const color of colors) {
          toAnsiSequence(color, ColorProfile.TRUECOLOR)
        }
      }

      const endTime = performance.now()
      const generationTime = endTime - startTime

      expect(generationTime).toBeLessThan(100) // Should be fast
    })
  })
})
