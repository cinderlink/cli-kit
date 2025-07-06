/**
 * Tests for styling/advanced.ts - Advanced styling utilities
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

describe("Advanced Styling", () => {
  describe("Shadow Effects", () => {
    describe("createDropShadow", () => {
      const shadowConfig: ShadowConfig = {
        offset: { x: 2, y: 1 },
        blur: 1,
        color: Colors.black,
        opacity: 0.5
      }

      it("creates drop shadow with positive offset", () => {
        const content = ["Hello", "World"]
        const result = createDropShadow(content, shadowConfig)
        
        expect(result).toHaveLength(3) // original + 1 line for y offset
        expect(result[0]).toBe("Hello")
        expect(result[1]).toBe("World")
        expect(result[2]).toContain("▓") // shadow character
      })

      it("creates drop shadow with negative x offset", () => {
        const config: ShadowConfig = {
          ...shadowConfig,
          offset: { x: -1, y: 0 }
        }
        const content = ["Test"]
        const result = createDropShadow(content, config)
        
        expect(result).toHaveLength(1)
        expect(result[0]).toBe("Test")
      })

      it("creates drop shadow with negative y offset", () => {
        const config: ShadowConfig = {
          ...shadowConfig,
          offset: { x: 0, y: -1 }
        }
        const content = ["Line1", "Line2"]
        const result = createDropShadow(content, config)
        
        expect(result).toHaveLength(3)
        expect(result).toContain("Line1")
        expect(result).toContain("Line2")
      })

      it("handles zero offset", () => {
        const config: ShadowConfig = {
          ...shadowConfig,
          offset: { x: 0, y: 0 }
        }
        const content = ["Test"]
        const result = createDropShadow(content, config)
        
        expect(result).toHaveLength(1)
        expect(result[0]).toBe("Test")
      })

      it("handles empty content", () => {
        const result = createDropShadow([], shadowConfig)
        expect(result).toHaveLength(0)
      })
    })

    describe("createInnerShadow", () => {
      it("creates inner shadow on edges", () => {
        const content = ["ABCD", "EFGH", "IJKL"]
        const shadowConfig: ShadowConfig = {
          offset: { x: 1, y: 1 },
          blur: 1,
          color: Colors.black,
          opacity: 0.3
        }
        
        const result = createInnerShadow(content, shadowConfig)
        
        expect(result).toHaveLength(3)
        expect(result[0]).toBe("▓▓▓▓") // Top edge
        expect(result[1]).toBe("▓FG▓") // Middle with edge chars
        expect(result[2]).toBe("▓▓▓▓") // Bottom edge
      })

      it("handles single line", () => {
        const content = ["Test"]
        const shadowConfig: ShadowConfig = {
          offset: { x: 0, y: 0 },
          blur: 1,
          color: Colors.black,
          opacity: 0.5
        }
        
        const result = createInnerShadow(content, shadowConfig)
        expect(result).toHaveLength(1)
        expect(result[0]).toBe("▓▓▓▓") // All characters are edges
      })

      it("handles empty content", () => {
        const shadowConfig: ShadowConfig = {
          offset: { x: 1, y: 1 },
          blur: 1,
          color: Colors.black,
          opacity: 0.3
        }
        
        const result = createInnerShadow([], shadowConfig)
        expect(result).toHaveLength(0)
      })
    })
  })

  describe("Glow Effects", () => {
    describe("createGlow", () => {
      const glowConfig: GlowConfig = {
        radius: 2,
        color: Colors.blue,
        intensity: 1
      }

      it("creates glow around content", () => {
        const content = ["A"]
        const result = createGlow(content, glowConfig)
        
        expect(result.length).toBeGreaterThan(1) // Should expand beyond original
        expect(result.some(line => line.includes("▓"))).toBe(true) // Should contain glow chars
      })

      it("handles empty content", () => {
        const result = createGlow([], glowConfig)
        expect(result).toHaveLength(4) // 2 * padding
      })

      it("adjusts glow based on radius", () => {
        const smallGlow: GlowConfig = { ...glowConfig, radius: 1 }
        const largeGlow: GlowConfig = { ...glowConfig, radius: 3 }
        
        const content = ["X"]
        const smallResult = createGlow(content, smallGlow)
        const largeResult = createGlow(content, largeGlow)
        
        expect(largeResult.length).toBeGreaterThan(smallResult.length)
      })

      it("handles different intensity levels", () => {
        const content = ["Test"]
        const result = createGlow(content, glowConfig)
        
        // Check that different glow characters are used (▓, ▒, ░)
        const allChars = result.join("")
        expect(allChars.includes("▓") || allChars.includes("▒") || allChars.includes("░")).toBe(true)
      })
    })
  })

  describe("Pattern Effects", () => {
    describe("generatePattern", () => {
      const patternConfig: PatternConfig = {
        type: 'checkerboard',
        foreground: Colors.white,
        background: Colors.black,
        scale: 2
      }

      it("generates checkerboard pattern", () => {
        const result = generatePattern(4, 4, patternConfig)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(4)
        expect(result[0]).toMatch(/[█░]+/)
      })

      it("generates stripe pattern", () => {
        const config: PatternConfig = { ...patternConfig, type: 'stripes' }
        const result = generatePattern(3, 4, config)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(3)
      })

      it("generates dots pattern", () => {
        const config: PatternConfig = { ...patternConfig, type: 'dots' }
        const result = generatePattern(4, 4, config)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(4)
      })

      it("generates diagonal pattern", () => {
        const config: PatternConfig = { ...patternConfig, type: 'diagonal' }
        const result = generatePattern(4, 4, config)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(4)
      })

      it("generates cross pattern", () => {
        const config: PatternConfig = { ...patternConfig, type: 'cross' }
        const result = generatePattern(4, 4, config)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(4)
      })

      it("generates wave pattern", () => {
        const config: PatternConfig = { ...patternConfig, type: 'wave' }
        const result = generatePattern(4, 4, config)
        
        expect(result).toHaveLength(4)
        expect(result[0]).toHaveLength(4)
      })

      it("handles invalid pattern type", () => {
        const config: PatternConfig = { ...patternConfig, type: 'invalid' as any }
        const result = generatePattern(2, 2, config)
        
        expect(result).toHaveLength(2)
        expect(result[0]).toBe("░░") // Should default to background
      })

      it("handles zero dimensions", () => {
        const result = generatePattern(0, 0, patternConfig)
        expect(result).toHaveLength(0)
      })
    })

    describe("applyPattern", () => {
      const patternConfig: PatternConfig = {
        type: 'checkerboard',
        foreground: Colors.white,
        background: Colors.black,
        scale: 1
      }

      it("applies pattern to content spaces", () => {
        const content = ["A B", "C D"]
        const result = applyPattern(content, patternConfig)
        
        expect(result).toHaveLength(2)
        expect(result[0]).toHaveLength(3)
        expect(result[0][0]).toBe("A") // Original character preserved
        expect(result[0][1]).toMatch(/[█░]/) // Space replaced with pattern
        expect(result[0][2]).toBe("B") // Original character preserved
      })

      it("preserves non-space characters", () => {
        const content = ["XYZ"]
        const result = applyPattern(content, patternConfig)
        
        expect(result[0]).toBe("XYZ") // No spaces, so no changes
      })

      it("handles empty content", () => {
        const result = applyPattern([], patternConfig)
        expect(result).toHaveLength(0)
      })
    })
  })

  describe("Border Styles", () => {
    describe("createStyledBorder", () => {
      it("creates solid border", () => {
        const borderStyle: BorderStyle = {
          type: 'solid',
          width: 1,
          color: Colors.white
        }
        
        const result = createStyledBorder(10, 5, borderStyle)
        
        expect(result.top).toBe("─".repeat(8))
        expect(result.bottom).toBe("─".repeat(8))
        expect(result.left).toBe("│")
        expect(result.right).toBe("│")
        expect(result.corners.tl).toBe("┌")
        expect(result.corners.tr).toBe("┐")
        expect(result.corners.bl).toBe("└")
        expect(result.corners.br).toBe("┘")
      })

      it("creates dashed border", () => {
        const borderStyle: BorderStyle = {
          type: 'dashed',
          width: 1
        }
        
        const result = createStyledBorder(6, 4, borderStyle)
        
        expect(result.top).toBe("┄".repeat(4))
        expect(result.left).toBe("┆")
        expect(result.right).toBe("┆")
      })

      it("creates dotted border", () => {
        const borderStyle: BorderStyle = {
          type: 'dotted',
          width: 1
        }
        
        const result = createStyledBorder(6, 4, borderStyle)
        
        expect(result.top).toBe("┈".repeat(4))
        expect(result.left).toBe("┊")
        expect(result.right).toBe("┊")
      })

      it("creates double border", () => {
        const borderStyle: BorderStyle = {
          type: 'double',
          width: 2
        }
        
        const result = createStyledBorder(8, 4, borderStyle)
        
        expect(result.top).toBe("═".repeat(6))
        expect(result.left).toBe("║")
        expect(result.corners.tl).toBe("╔")
        expect(result.corners.br).toBe("╝")
      })

      it("handles minimum dimensions", () => {
        const borderStyle: BorderStyle = {
          type: 'solid',
          width: 1
        }
        
        const result = createStyledBorder(2, 2, borderStyle)
        
        expect(result.top).toBe("") // width - 2 = 0
        expect(result.bottom).toBe("")
      })
    })
  })

  describe("Layer Effects", () => {
    describe("applyLayerEffect", () => {
      const baseColor = { _tag: "RGB" as const, r: 100, g: 100, b: 100 }
      const effectColor = { _tag: "RGB" as const, r: 200, g: 50, b: 50 }

      it("applies overlay effect", () => {
        const effect: LayerEffect = {
          type: 'overlay',
          color: effectColor,
          opacity: 0.5
        }
        
        const result = applyLayerEffect(baseColor, effect)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBe(150) // (100 * 0.5) + (200 * 0.5)
          expect(result.g).toBe(75)  // (100 * 0.5) + (50 * 0.5)
          expect(result.b).toBe(75)  // (100 * 0.5) + (50 * 0.5)
        }
      })

      it("applies multiply effect", () => {
        const effect: LayerEffect = {
          type: 'multiply',
          color: effectColor,
          opacity: 1
        }
        
        const result = applyLayerEffect(baseColor, effect)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBe(Math.round(100 * 200 / 255)) // multiply blend
        }
      })

      it("applies screen effect", () => {
        const effect: LayerEffect = {
          type: 'screen',
          color: effectColor,
          opacity: 1
        }
        
        const result = applyLayerEffect(baseColor, effect)
        
        expect(result._tag).toBe("RGB")
        // Screen blend: 255 - (255 - base) * (255 - effect) / 255
      })

      it("applies color-dodge effect", () => {
        const effect: LayerEffect = {
          type: 'color-dodge',
          color: { _tag: "RGB", r: 100, g: 100, b: 100 },
          opacity: 1
        }
        
        const result = applyLayerEffect(baseColor, effect)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBeGreaterThanOrEqual(0)
          expect(result.r).toBeLessThanOrEqual(255)
        }
      })

      it("applies color-burn effect", () => {
        const effect: LayerEffect = {
          type: 'color-burn',
          color: { _tag: "RGB", r: 200, g: 200, b: 200 },
          opacity: 1
        }
        
        const result = applyLayerEffect(baseColor, effect)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBeGreaterThanOrEqual(0)
          expect(result.r).toBeLessThanOrEqual(255)
        }
      })

      it("handles unknown effect type", () => {
        const effect: LayerEffect = {
          type: 'unknown' as any,
          color: effectColor,
          opacity: 0.5
        }
        
        const result = applyLayerEffect(baseColor, effect)
        expect(result).toEqual(baseColor) // Should return original color
      })

      it("works with ANSI colors", () => {
        const ansiColor = { _tag: "ANSI" as const, code: 1 } // red
        const effect: LayerEffect = {
          type: 'overlay',
          color: Colors.blue,
          opacity: 0.5
        }
        
        const result = applyLayerEffect(ansiColor, effect)
        expect(result._tag).toBe("RGB")
      })

      it("clamps RGB values to valid range", () => {
        const brightColor = { _tag: "RGB" as const, r: 255, g: 255, b: 255 }
        const effect: LayerEffect = {
          type: 'color-dodge',
          color: { _tag: "RGB", r: 200, g: 200, b: 200 },
          opacity: 1
        }
        
        const result = applyLayerEffect(brightColor, effect)
        
        if (result._tag === "RGB") {
          expect(result.r).toBeLessThanOrEqual(255)
          expect(result.g).toBeLessThanOrEqual(255)
          expect(result.b).toBeLessThanOrEqual(255)
        }
      })
    })
  })

  describe("Animation Helpers", () => {
    describe("createPulse", () => {
      it("creates pulse effect", () => {
        const baseStyle = style().bold()
        const result = createPulse(baseStyle, 0, 0.5, 2)
        
        expect(result).toBeDefined()
        // Note: Current implementation just returns baseStyle
        expect(result).toBe(baseStyle)
      })
    })

    describe("createShake", () => {
      it("creates shake effect", () => {
        const baseOffset = { x: 10, y: 5 }
        const result = createShake(baseOffset, Math.PI / 2, 3, 4)
        
        // sin(π/2 * 4) = sin(2π) ≈ 0, so shake ≈ 0
        expect(result.x).toBeCloseTo(10, 1) // 10 + sin(2π) * 3 ≈ 10
        expect(result.y).toBe(5) // y unchanged
      })

      it("oscillates around base position", () => {
        const baseOffset = { x: 0, y: 0 }
        const result1 = createShake(baseOffset, 0, 2, 1)
        const result2 = createShake(baseOffset, Math.PI, 2, 1)
        
        expect(result1.x).toBeCloseTo(0, 1) // sin(0) = 0
        expect(result2.x).toBeCloseTo(0, 1) // sin(π) ≈ 0
      })
    })

    describe("createBounce", () => {
      it("creates bounce effect", () => {
        const result1 = createBounce(0, 4, 1)
        const result2 = createBounce(0.5, 4, 1) // Half duration
        
        expect(result1).toBe(0) // sin(0) = 0
        expect(result2).toBe(4) // sin(π/2) = 1, so 1 * 4 = 4
      })

      it("repeats after duration", () => {
        const result1 = createBounce(0, 3, 2)
        const result2 = createBounce(2, 3, 2) // One full duration later
        
        expect(result1).toBeCloseTo(result2, 1)
      })
    })
  })

  describe("Text Effects", () => {
    describe("createTypewriter", () => {
      it("reveals text progressively", () => {
        const text = "Hello World"
        
        const result1 = createTypewriter(text, 0, 5)
        const result2 = createTypewriter(text, 1, 5)
        const result3 = createTypewriter(text, 2, 5)
        
        expect(result1).toBe("") // 0 characters
        expect(result2).toBe("Hello") // 5 characters
        expect(result3).toBe("Hello Worl") // 10 characters
      })

      it("handles text longer than visible", () => {
        const text = "Short"
        const result = createTypewriter(text, 10, 1)
        
        expect(result).toBe("Short") // Full text
      })

      it("handles empty text", () => {
        const result = createTypewriter("", 5, 10)
        expect(result).toBe("")
      })
    })

    describe("createWaveText", () => {
      it("creates wave offsets for each character", () => {
        const text = "Wave"
        const result = createWaveText(text, 0, 2, 1)
        
        expect(result).toHaveLength(4)
        expect(result[0]!.char).toBe("W")
        expect(result[1]!.char).toBe("a")
        expect(result[2]!.char).toBe("v")
        expect(result[3]!.char).toBe("e")
        
        // Check that offsets are numbers
        result.forEach(item => {
          expect(typeof item.offset).toBe("number")
          expect(Math.abs(item.offset)).toBeLessThanOrEqual(2) // Within amplitude
        })
      })

      it("handles empty text", () => {
        const result = createWaveText("", 0, 1, 1)
        expect(result).toHaveLength(0)
      })
    })

    describe("createRainbowText", () => {
      it("assigns colors to each character", () => {
        const text = "Rainbow"
        const result = createRainbowText(text, 0, 1)
        
        expect(result).toHaveLength(7)
        result.forEach(style => {
          expect(style).toBeDefined()
        })
      })

      it("cycles through colors", () => {
        const text = "A".repeat(10)
        const result = createRainbowText(text, 0, 1)
        
        expect(result).toHaveLength(10)
        // Colors should cycle (6 rainbow colors)
      })

      it("handles empty text", () => {
        const result = createRainbowText("", 0, 1)
        expect(result).toHaveLength(0)
      })
    })
  })

  describe("Composite Effects", () => {
    describe("createNeonEffect", () => {
      it("creates neon sign effect", () => {
        const result = createNeonEffect("NEON", Colors.cyan, 0)
        
        expect(result.mainStyle).toBeDefined()
        expect(result.glowStyle).toBeDefined()
        expect(typeof result.flickerIntensity).toBe("number")
        expect(result.flickerIntensity).toBeGreaterThanOrEqual(0.8)
        expect(result.flickerIntensity).toBeLessThanOrEqual(1.0)
      })

      it("flicker intensity varies with time", () => {
        const result1 = createNeonEffect("Test", Colors.red, 0)
        const result2 = createNeonEffect("Test", Colors.red, Math.PI / 2) // Use π/2 for clearer difference
        
        // Flicker should be different at different times
        // sin(0*13) = 0, sin(π/2*13) ≠ 0, so results should differ
        expect(result1.flickerIntensity).not.toBe(result2.flickerIntensity)
      })
    })

    describe("createMatrixEffect", () => {
      it("creates matrix rain drops", () => {
        const result = createMatrixEffect(10, 20, 1, 0.5)
        
        expect(Array.isArray(result)).toBe(true)
        result.forEach(drop => {
          expect(drop.x).toBeGreaterThanOrEqual(0)
          expect(drop.x).toBeLessThan(10)
          expect(drop.y).toBeGreaterThanOrEqual(0)
          expect(drop.y).toBeLessThan(20)
          expect(typeof drop.char).toBe("string")
          expect(drop.char).toMatch(/[0-9A-F]/)
          expect(drop.intensity).toBeGreaterThanOrEqual(0)
          expect(drop.intensity).toBeLessThanOrEqual(1)
        })
      })

      it("density affects number of drops", () => {
        const sparse = createMatrixEffect(10, 10, 0, 0.1)
        const dense = createMatrixEffect(10, 10, 0, 0.9)
        
        // Dense should generally have more drops (though random)
        expect(dense.length).toBeGreaterThanOrEqual(sparse.length)
      })

      it("handles zero dimensions", () => {
        const result = createMatrixEffect(0, 0, 1, 0.5)
        expect(result).toHaveLength(0)
      })
    })

    describe("createHologramEffect", () => {
      it("creates hologram effects", () => {
        const result = createHologramEffect(1, 2)
        
        expect(typeof result.scanlinePosition).toBe("number")
        expect(result.scanlinePosition).toBeGreaterThanOrEqual(0)
        expect(result.scanlinePosition).toBeLessThanOrEqual(1)
        expect(typeof result.interference).toBe("number")
        expect(typeof result.flicker).toBe("boolean")
      })

      it("scanline moves with time", () => {
        const result1 = createHologramEffect(0, 1)
        const result2 = createHologramEffect(0.5, 1)
        
        expect(result1.scanlinePosition).not.toBe(result2.scanlinePosition)
      })
    })
  })

  describe("Edge Cases", () => {
    it("handles very large dimensions", () => {
      const pattern = generatePattern(100, 100, {
        type: 'checkerboard',
        foreground: Colors.white,
        background: Colors.black,
        scale: 5
      })
      
      expect(pattern).toHaveLength(100)
      expect(pattern[0]).toHaveLength(100)
    })

    it("handles extreme shadow offsets", () => {
      const content = ["Test"]
      const config: ShadowConfig = {
        offset: { x: 1000, y: -1000 },
        blur: 1,
        color: Colors.black,
        opacity: 1
      }
      
      const result = createDropShadow(content, config)
      expect(result.length).toBeGreaterThan(0)
    })

    it("handles extreme layer effect values", () => {
      const baseColor = { _tag: "RGB" as const, r: 0, g: 0, b: 0 }
      const effect: LayerEffect = {
        type: 'color-dodge',
        color: { _tag: "RGB", r: 0, g: 0, b: 0 },
        opacity: 1
      }
      
      // Should not throw and should return valid color
      expect(() => applyLayerEffect(baseColor, effect)).not.toThrow()
    })
  })

  describe("Performance", () => {
    it("handles large text efficiently", () => {
      const largeText = "A".repeat(1000)
      const start = Date.now()
      
      const result = createRainbowText(largeText, 0, 1)
      
      const duration = Date.now() - start
      expect(result).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it("handles large matrix effect efficiently", () => {
      const start = Date.now()
      
      const result = createMatrixEffect(50, 50, 1, 0.5)
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(100) // Should be fast
      expect(Array.isArray(result)).toBe(true)
    })
  })
})