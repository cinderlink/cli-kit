/**
 * Comprehensive tests for Advanced Styling - Additional edge cases and complete coverage
 */

import { describe, it, expect } from "bun:test"
import {
  createDropShadow,
  createInnerShadow,
  createGlow,
  generatePattern,
  applyPattern,
  createStyledBorder,
  applyLayerEffect,
  createPulse,
  createShake,
  createBounce,
  createTypewriter,
  createWaveText,
  createRainbowText,
  createNeonEffect,
  createMatrixEffect,
  createHologramEffect,
  type ShadowConfig,
  type GlowConfig,
  type PatternConfig,
  type BorderStyle,
  type LayerEffect
} from "@/styling/advanced"
import { Colors } from "@/styling/color"
import { style } from "@/styling/style"

describe("Advanced Styling - Comprehensive Coverage", () => {
  describe("Shadow Effects - Additional Edge Cases", () => {
    it("handles mixed positive/negative offsets", () => {
      const content = ["Test", "Line"]
      const config: ShadowConfig = {
        offset: { x: 2, y: -1 },
        blur: 1,
        color: Colors.gray,
        opacity: 0.7
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain("Test")
      expect(result).toContain("Line")
    })

    it("handles content with empty lines", () => {
      const content = ["First", "", "Third"]
      const config: ShadowConfig = {
        offset: { x: 1, y: 1 },
        blur: 0,
        color: Colors.black,
        opacity: 1
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
      expect(result).toContain("First")
      expect(result).toContain("Third")
    })

    it("handles single character content", () => {
      const content = ["A"]
      const config: ShadowConfig = {
        offset: { x: 5, y: 5 },
        blur: 2,
        color: Colors.red,
        opacity: 0.8
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBeGreaterThan(1)
      expect(result[0]).toBe("A")
    })

    it("handles negative x offset larger than content", () => {
      const content = ["Hi"]
      const config: ShadowConfig = {
        offset: { x: -5, y: 0 },
        blur: 0,
        color: Colors.blue,
        opacity: 1
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it("handles negative x offset exactly matching content length", () => {
      const content = ["Test"]
      const config: ShadowConfig = {
        offset: { x: -2, y: 0 }, // Will trigger line 79 (substring)
        blur: 0,
        color: Colors.gray,
        opacity: 1
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBe(1)
      expect(result[0]).toBe("Test") // Original content is returned, shadow is substring
    })

    it("handles inner shadow with single character", () => {
      const content = ["X"]
      const config: ShadowConfig = {
        offset: { x: 0, y: 0 },
        blur: 1,
        color: Colors.black,
        opacity: 0.5
      }
      
      const result = createInnerShadow(content, config)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe("▓")
    })

    it("handles inner shadow with empty lines", () => {
      const content = ["ABC", "", "DEF"]
      const config: ShadowConfig = {
        offset: { x: 0, y: 0 },
        blur: 0,
        color: Colors.gray,
        opacity: 1
      }
      
      const result = createInnerShadow(content, config)
      expect(result).toHaveLength(3)
      expect(result[0]).toBe("▓▓▓")
      expect(result[1]).toBe("") // Empty line stays empty
      expect(result[2]).toBe("▓▓▓")
    })
  })

  describe("Glow Effects - Additional Edge Cases", () => {
    it("handles zero radius glow", () => {
      const content = ["Glow"]
      const config: GlowConfig = {
        radius: 0,
        color: Colors.yellow,
        intensity: 1
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(0)
    })

    it("handles fractional radius", () => {
      const content = ["Test"]
      const config: GlowConfig = {
        radius: 1.5,
        color: Colors.green,
        intensity: 0.8
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
    })

    it("handles very high intensity", () => {
      const content = ["Bright"]
      const config: GlowConfig = {
        radius: 1,
        color: Colors.white,
        intensity: 2.0
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
      const joined = result.join("")
      expect(joined.includes("▓")).toBe(true)
    })

    it("handles zero intensity", () => {
      const content = ["Dim"]
      const config: GlowConfig = {
        radius: 2,
        color: Colors.blue,
        intensity: 0
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
      // Should be mostly spaces with zero intensity
      const joined = result.join("")
      expect(joined.includes(" ")).toBe(true)
    })

    it("handles content with different line lengths", () => {
      const content = ["A", "BB", "CCC"]
      const config: GlowConfig = {
        radius: 1,
        color: Colors.magenta,
        intensity: 1
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
    })

    it("handles content with spaces", () => {
      const content = ["A B", "C D"]
      const config: GlowConfig = {
        radius: 1,
        color: Colors.cyan,
        intensity: 0.5
      }
      
      const result = createGlow(content, config)
      expect(result.length).toBeGreaterThan(content.length)
    })
  })

  describe("Pattern Effects - Additional Edge Cases", () => {
    it("handles fractional scale", () => {
      const config: PatternConfig = {
        type: 'checkerboard',
        foreground: Colors.white,
        background: Colors.black,
        scale: 0.5
      }
      
      const result = generatePattern(4, 4, config)
      expect(result).toHaveLength(4)
      expect(result[0]).toHaveLength(4)
    })

    it("handles very large scale", () => {
      const config: PatternConfig = {
        type: 'stripes',
        foreground: Colors.red,
        background: Colors.blue,
        scale: 100
      }
      
      const result = generatePattern(10, 10, config)
      expect(result).toHaveLength(10)
      expect(result[0]).toHaveLength(10)
    })

    it("handles pattern with dimension 1", () => {
      const config: PatternConfig = {
        type: 'dots',
        foreground: Colors.yellow,
        background: Colors.black,
        scale: 1
      }
      
      const result = generatePattern(1, 1, config)
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(1)
    })

    it("applies pattern to content with varying line lengths", () => {
      const content = ["A", "BB", "CCC", "DDDD"]
      const config: PatternConfig = {
        type: 'cross',
        foreground: Colors.white,
        background: Colors.black,
        scale: 2
      }
      
      const result = applyPattern(content, config)
      expect(result).toHaveLength(4)
      expect(result[0]).toHaveLength(1)
      expect(result[1]).toHaveLength(2)
      expect(result[2]).toHaveLength(3)
      expect(result[3]).toHaveLength(4)
    })

    it("applies pattern to content with only spaces", () => {
      const content = ["   ", "  ", " "]
      const config: PatternConfig = {
        type: 'wave',
        foreground: Colors.green,
        background: Colors.red,
        scale: 1
      }
      
      const result = applyPattern(content, config)
      expect(result).toHaveLength(3)
      expect(result[0]).not.toBe("   ") // Should be replaced with pattern
    })

    it("applies pattern to mixed content", () => {
      const content = ["A B C", "D E F"]
      const config: PatternConfig = {
        type: 'diagonal',
        foreground: Colors.blue,
        background: Colors.yellow,
        scale: 1
      }
      
      const result = applyPattern(content, config)
      expect(result).toHaveLength(2)
      expect(result[0]?.[0]).toBe("A") // Non-space preserved
      expect(result[0]?.[2]).toBe("B") // Non-space preserved
      expect(result[0]?.[1]).toMatch(/[█░]/) // Space replaced with pattern
    })
  })

  describe("Border Styles - Additional Edge Cases", () => {
    it("handles gradient border type", () => {
      const borderStyle: BorderStyle = {
        type: 'gradient',
        width: 2,
        gradient: {
          colors: [Colors.red, Colors.blue],
          direction: 'horizontal'
        }
      }
      
      const result = createStyledBorder(10, 5, borderStyle)
      expect(result.top).toHaveLength(8)
      expect(result.left).toHaveLength(1)
      expect(result.right).toHaveLength(1)
    })

    it("handles pattern border type", () => {
      const borderStyle: BorderStyle = {
        type: 'pattern',
        width: 1,
        pattern: {
          type: 'dots',
          foreground: Colors.white,
          background: Colors.black,
          scale: 1
        }
      }
      
      const result = createStyledBorder(8, 4, borderStyle)
      expect(result.top).toHaveLength(6)
      expect(result.corners.tl).toBeDefined()
    })

    it("handles very wide border", () => {
      const borderStyle: BorderStyle = {
        type: 'solid',
        width: 10,
        color: Colors.red
      }
      
      const result = createStyledBorder(20, 10, borderStyle)
      expect(result.top).toHaveLength(18)
      expect(result.bottom).toHaveLength(18)
    })

    it("handles border with zero width", () => {
      const borderStyle: BorderStyle = {
        type: 'solid',
        width: 0,
        color: Colors.black
      }
      
      const result = createStyledBorder(5, 5, borderStyle)
      expect(result.top).toHaveLength(3)
      expect(result.corners.tl).toBeDefined()
    })

    it("handles all border types explicitly", () => {
      const types: Array<BorderStyle['type']> = ['solid', 'dashed', 'dotted', 'double', 'gradient', 'pattern']
      
      types.forEach(type => {
        const borderStyle: BorderStyle = {
          type,
          width: 1,
          color: Colors.white
        }
        
        const result = createStyledBorder(6, 4, borderStyle)
        expect(result.top).toHaveLength(4)
        expect(result.left).toHaveLength(1)
        expect(result.right).toHaveLength(1)
        expect(result.corners.tl).toBeDefined()
        expect(result.corners.tr).toBeDefined()
        expect(result.corners.bl).toBeDefined()
        expect(result.corners.br).toBeDefined()
      })
    })
  })

  describe("Layer Effects - Additional Edge Cases", () => {
    it("handles color-dodge with zero denominator", () => {
      const baseColor = { _tag: "RGB" as const, r: 100, g: 100, b: 100 }
      const effect: LayerEffect = {
        type: 'color-dodge',
        color: { _tag: "RGB", r: 255, g: 255, b: 255 }, // Will cause division by zero
        opacity: 1
      }
      
      const result = applyLayerEffect(baseColor, effect)
      expect(result._tag).toBe("RGB")
      if (result._tag === "RGB") {
        expect(result.r).toBeLessThanOrEqual(255)
        expect(result.g).toBeLessThanOrEqual(255)
        expect(result.b).toBeLessThanOrEqual(255)
      }
    })

    it("handles color-burn with zero denominator", () => {
      const baseColor = { _tag: "RGB" as const, r: 100, g: 100, b: 100 }
      const effect: LayerEffect = {
        type: 'color-burn',
        color: { _tag: "RGB", r: 0, g: 0, b: 0 }, // Will cause division by zero
        opacity: 1
      }
      
      const result = applyLayerEffect(baseColor, effect)
      expect(result._tag).toBe("RGB")
      if (result._tag === "RGB") {
        expect(result.r).toBeGreaterThanOrEqual(0)
        expect(result.g).toBeGreaterThanOrEqual(0)
        expect(result.b).toBeGreaterThanOrEqual(0)
      }
    })

    it("handles extreme RGB values", () => {
      const baseColor = { _tag: "RGB" as const, r: 300, g: -50, b: 1000 }
      const effect: LayerEffect = {
        type: 'overlay',
        color: { _tag: "RGB", r: -100, g: 500, b: 50 },
        opacity: 0.5
      }
      
      const result = applyLayerEffect(baseColor, effect)
      if (result._tag === "RGB") {
        expect(result.r).toBeGreaterThanOrEqual(0)
        expect(result.r).toBeLessThanOrEqual(255)
        expect(result.g).toBeGreaterThanOrEqual(0)
        expect(result.g).toBeLessThanOrEqual(255)
        expect(result.b).toBeGreaterThanOrEqual(0)
        expect(result.b).toBeLessThanOrEqual(255)
      }
    })

    it("handles ANSI color with unknown code", () => {
      const ansiColor = { _tag: "ANSI" as const, code: 999 } // Unknown code
      const effect: LayerEffect = {
        type: 'multiply',
        color: Colors.red,
        opacity: 0.7
      }
      
      const result = applyLayerEffect(ansiColor, effect)
      expect(result._tag).toBe("RGB")
    })

    it("handles unknown color type", () => {
      const unknownColor = { _tag: "UNKNOWN" as any, value: "test" }
      const effect: LayerEffect = {
        type: 'screen',
        color: Colors.blue,
        opacity: 0.5
      }
      
      const result = applyLayerEffect(unknownColor, effect)
      expect(result._tag).toBe("RGB")
    })
  })

  describe("Animation Helpers - Additional Edge Cases", () => {
    it("handles createShake with zero amplitude", () => {
      const baseOffset = { x: 10, y: 20 }
      const result = createShake(baseOffset, 5, 0, 2)
      
      expect(result.x).toBe(10) // No shake with zero amplitude
      expect(result.y).toBe(20)
    })

    it("handles createShake with negative amplitude", () => {
      const baseOffset = { x: 0, y: 0 }
      const result = createShake(baseOffset, Math.PI/2, -3, 1)
      
      expect(typeof result.x).toBe("number")
      expect(typeof result.y).toBe("number")
    })

    it("handles createBounce with zero height", () => {
      const result = createBounce(0.5, 0, 1)
      expect(result).toBe(0)
    })

    it("handles createBounce with negative height", () => {
      const result = createBounce(0.25, -5, 1)
      expect(result).toBeLessThanOrEqual(0)
    })

    it("handles createBounce with zero duration", () => {
      const result = createBounce(0.5, 5, 0)
      expect(typeof result).toBe("number")
    })

    it("handles createBounce with very large time", () => {
      const result = createBounce(1000, 3, 2)
      expect(typeof result).toBe("number")
    })
  })

  describe("Text Effects - Additional Edge Cases", () => {
    it("handles createTypewriter with zero speed", () => {
      const text = "Hello World"
      const result = createTypewriter(text, 5, 0)
      
      expect(result).toBe("") // No characters revealed with zero speed
    })

    it("handles createTypewriter with negative speed", () => {
      const text = "Test"
      const result = createTypewriter(text, 2, -1)
      
      expect(result).toBe("") // Negative speed should show no characters
    })

    it("handles createTypewriter with fractional speed", () => {
      const text = "Fractional"
      const result = createTypewriter(text, 3.7, 2.5)
      
      expect(result).toHaveLength(Math.floor(3.7 * 2.5))
    })

    it("handles createWaveText with zero amplitude", () => {
      const text = "Wave"
      const result = createWaveText(text, 1, 0, 1)
      
      expect(result).toHaveLength(4)
      result.forEach(item => {
        expect(item.offset).toBeCloseTo(0, 5) // Use toBeCloseTo for floating point comparison
      })
    })

    it("handles createWaveText with negative amplitude", () => {
      const text = "Negative"
      const result = createWaveText(text, 0, -2, 0.5)
      
      expect(result).toHaveLength(8)
      result.forEach(item => {
        expect(item.offset).toBeLessThanOrEqual(2) // Math.abs() of negative amplitude
      })
    })

    it("handles createWaveText with zero frequency", () => {
      const text = "Zero"
      const result = createWaveText(text, 5, 3, 0)
      
      expect(result).toHaveLength(4)
      result.forEach(item => {
        expect(typeof item.offset).toBe("number")
      })
    })

    it("handles createRainbowText with zero speed", () => {
      const text = "Rainbow"
      const result = createRainbowText(text, 10, 0)
      
      expect(result).toHaveLength(7)
      result.forEach(style => {
        expect(style).toBeDefined()
      })
    })

    it("handles createRainbowText with negative speed", () => {
      const text = "Negative"
      const result = createRainbowText(text, 5, -1)
      
      expect(result).toHaveLength(8)
      result.forEach(style => {
        expect(style).toBeDefined()
      })
    })

    it("handles createRainbowText with single character", () => {
      const text = "A"
      const result = createRainbowText(text, 0, 1)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()
    })

    it("handles createRainbowText with very long text", () => {
      const text = "A".repeat(100)
      const result = createRainbowText(text, 0, 1)
      
      expect(result).toHaveLength(100)
      result.forEach(style => {
        expect(style).toBeDefined()
      })
    })
  })

  describe("Composite Effects - Additional Edge Cases", () => {
    it("handles createNeonEffect with zero time", () => {
      const result = createNeonEffect("NEON", Colors.cyan, 0)
      
      expect(result.flickerIntensity).toBeGreaterThan(0.8)
      expect(result.flickerIntensity).toBeLessThanOrEqual(1.0)
    })

    it("handles createNeonEffect with negative time", () => {
      const result = createNeonEffect("NEON", Colors.red, -5)
      
      expect(typeof result.flickerIntensity).toBe("number")
      expect(result.flickerIntensity).toBeGreaterThan(0)
    })

    it("handles createNeonEffect with very large time", () => {
      const result = createNeonEffect("NEON", Colors.yellow, 1000)
      
      expect(typeof result.flickerIntensity).toBe("number")
      expect(result.flickerIntensity).toBeGreaterThan(0)
    })

    it("handles createMatrixEffect with zero density", () => {
      const result = createMatrixEffect(10, 10, 1, 0)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0) // No drops with zero density
    })

    it("handles createMatrixEffect with density > 1", () => {
      const result = createMatrixEffect(5, 5, 0, 2)
      
      expect(Array.isArray(result)).toBe(true)
      // Should still work with density > 1
    })

    it("handles createMatrixEffect with dimension 1", () => {
      const result = createMatrixEffect(1, 1, 0, 0.5)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(1)
    })

    it("handles createHologramEffect with zero speed", () => {
      const result = createHologramEffect(5, 0)
      
      expect(result.scanlinePosition).toBe(0)
      expect(typeof result.interference).toBe("number")
      expect(typeof result.flicker).toBe("boolean")
    })

    it("handles createHologramEffect with negative speed", () => {
      const result = createHologramEffect(2, -1)
      
      expect(typeof result.scanlinePosition).toBe("number")
      expect(result.scanlinePosition).toBeGreaterThanOrEqual(0)
      expect(result.scanlinePosition).toBeLessThanOrEqual(1)
    })

    it("handles createHologramEffect with very large speed", () => {
      const result = createHologramEffect(1, 100)
      
      expect(typeof result.scanlinePosition).toBe("number")
      expect(result.scanlinePosition).toBeGreaterThanOrEqual(0)
      expect(result.scanlinePosition).toBeLessThanOrEqual(1)
    })
  })

  describe("Stress Tests", () => {
    it("handles extremely large patterns", () => {
      const config: PatternConfig = {
        type: 'checkerboard',
        foreground: Colors.white,
        background: Colors.black,
        scale: 1
      }
      
      const startTime = Date.now()
      const result = generatePattern(200, 200, config)
      const endTime = Date.now()
      
      expect(result).toHaveLength(200)
      expect(result[0]).toHaveLength(200)
      expect(endTime - startTime).toBeLessThan(200) // Should complete in reasonable time
    })

    it("handles very complex glow calculation", () => {
      const content = Array(20).fill("X".repeat(20))
      const config: GlowConfig = {
        radius: 5,
        color: Colors.blue,
        intensity: 1
      }
      
      const startTime = Date.now()
      const result = createGlow(content, config)
      const endTime = Date.now()
      
      expect(result.length).toBeGreaterThan(content.length)
      expect(endTime - startTime).toBeLessThan(500) // Should complete in reasonable time
    })

    it("handles matrix effect with high density", () => {
      const startTime = Date.now()
      const result = createMatrixEffect(100, 100, 0, 0.8)
      const endTime = Date.now()
      
      expect(Array.isArray(result)).toBe(true)
      expect(endTime - startTime).toBeLessThan(200) // Should complete in reasonable time
    })
  })

  describe("Integration Tests", () => {
    it("combines multiple effects", () => {
      const content = ["Integration", "Test"]
      
      // Apply shadow
      const shadowConfig: ShadowConfig = {
        offset: { x: 1, y: 1 },
        blur: 0,
        color: Colors.black,
        opacity: 0.5
      }
      const withShadow = createDropShadow(content, shadowConfig)
      
      // Apply glow
      const glowConfig: GlowConfig = {
        radius: 1,
        color: Colors.cyan,
        intensity: 0.5
      }
      const withGlow = createGlow(withShadow, glowConfig)
      
      expect(withGlow.length).toBeGreaterThan(content.length)
    })

    it("applies pattern then border", () => {
      const content = ["Pattern", "Border"]
      
      const patternConfig: PatternConfig = {
        type: 'dots',
        foreground: Colors.white,
        background: Colors.black,
        scale: 2
      }
      const withPattern = applyPattern(content, patternConfig)
      
      const borderStyle: BorderStyle = {
        type: 'solid',
        width: 1,
        color: Colors.yellow
      }
      const withBorder = createStyledBorder(withPattern.length, withPattern[0]?.length || 0, borderStyle)
      
      expect(withBorder.top).toBeDefined()
      expect(withBorder.corners.tl).toBeDefined()
    })

    it("chains animation effects", () => {
      const baseStyle = style().bold().foreground(Colors.red)
      
      const pulsed = createPulse(baseStyle, 0.5, 0.3, 2)
      const shakeOffset = createShake({ x: 0, y: 0 }, 0.5, 2, 4)
      const bounceHeight = createBounce(0.5, 3, 1)
      
      expect(pulsed).toBeDefined()
      expect(typeof shakeOffset.x).toBe("number")
      expect(typeof shakeOffset.y).toBe("number")
      expect(typeof bounceHeight).toBe("number")
    })
  })

  describe("Error Handling", () => {
    it("handles invalid pattern type gracefully", () => {
      const config: PatternConfig = {
        type: 'invalid-type' as any,
        foreground: Colors.white,
        background: Colors.black,
        scale: 1
      }
      
      expect(() => generatePattern(5, 5, config)).not.toThrow()
      const result = generatePattern(5, 5, config)
      expect(result).toHaveLength(5)
    })

    it("handles undefined content gracefully", () => {
      const content = ["test", undefined as any, "more"]
      const config: ShadowConfig = {
        offset: { x: 1, y: 1 },
        blur: 0,
        color: Colors.black,
        opacity: 1
      }
      
      expect(() => createDropShadow(content, config)).not.toThrow()
    })

    it("handles NaN values in calculations", () => {
      const config: GlowConfig = {
        radius: NaN,
        color: Colors.red,
        intensity: NaN
      }
      
      expect(() => createGlow(["test"], config)).not.toThrow()
    })
  })
})