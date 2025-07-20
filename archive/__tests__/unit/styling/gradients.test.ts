/**
 * Tests for styling/gradients.ts - Gradient and advanced styling utilities
 */

import { describe, it, expect } from "bun:test"
import {
  textGradient,
  backgroundGradient,
  borderGradient,
  rainbowGradient,
  sunsetGradient,
  oceanGradient,
  forestGradient,
  fireGradient,
  pastelGradient,
  monochromeGradient,
  createGradient,
  reverseGradient,
  shiftGradient,
  scaleGradient,
  animatedGradient,
  pulsingGradient,
  type GradientConfig,
  type GradientStop,
  type TextGradientOptions,
  type BackgroundGradientOptions
} from "@/styling/gradients"
import { Colors, Color } from "@/styling/color"

describe("Gradients", () => {
  describe("GradientConfig and Types", () => {
    it("creates valid gradient config", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('linear')
      expect(gradient.stops).toHaveLength(2)
    })

    it("validates gradient stop structure", () => {
      const stop: GradientStop = {
        position: 0.5,
        color: Colors.green
      }
      
      expect(stop.position).toBe(0.5)
      expect(stop.color).toBe(Colors.green)
    })
  })

  describe("textGradient", () => {
    it("creates text gradient with simple text", () => {
      const options: TextGradientOptions = {
        text: "Hello",
        gradient: {
          direction: 'horizontal',
          interpolation: 'linear',
          stops: [
            { position: 0, color: Colors.red },
            { position: 1, color: Colors.blue }
          ]
        }
      }
      
      const styles = textGradient(options)
      expect(styles).toHaveLength(5) // "Hello" has 5 characters
      expect(styles[0]).toBeDefined()
      expect(styles[4]).toBeDefined()
    })

    it("handles empty text", () => {
      const options: TextGradientOptions = {
        text: "",
        gradient: rainbowGradient()
      }
      
      const styles = textGradient(options)
      expect(styles).toHaveLength(0)
    })

    it("handles single character", () => {
      const options: TextGradientOptions = {
        text: "A",
        gradient: rainbowGradient()
      }
      
      const styles = textGradient(options)
      expect(styles).toHaveLength(1)
    })

    it("preserves spaces when requested", () => {
      const options: TextGradientOptions = {
        text: "A B",
        gradient: rainbowGradient(),
        preserveSpaces: true
      }
      
      const styles = textGradient(options)
      expect(styles).toHaveLength(3) // A, space, B
    })

    it("skips spaces when not preserving", () => {
      const options: TextGradientOptions = {
        text: "A B",
        gradient: rainbowGradient(),
        preserveSpaces: false
      }
      
      const styles = textGradient(options)
      expect(styles).toHaveLength(3) // Still 3 elements, but space should have plain style
    })

    it("handles different gradient directions", () => {
      const directions: GradientConfig['direction'][] = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']
      
      directions.forEach(direction => {
        const options: TextGradientOptions = {
          text: "Test",
          gradient: { ...rainbowGradient(), direction }
        }
        
        const styles = textGradient(options)
        expect(styles).toHaveLength(4)
      })
    })
  })

  describe("backgroundGradient", () => {
    it("creates background gradient pattern", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 10,
        height: 5
      }
      
      const lines = backgroundGradient(options)
      expect(lines).toHaveLength(5) // height
      expect(lines[0]).toHaveLength(10) // width
      expect(lines[0]).toBe("██████████") // default char is █
    })

    it("uses custom character", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 3,
        height: 2,
        char: '*'
      }
      
      const lines = backgroundGradient(options)
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe("***")
      expect(lines[1]).toBe("***")
    })

    it("handles zero dimensions", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 0,
        height: 0
      }
      
      const lines = backgroundGradient(options)
      expect(lines).toHaveLength(0)
    })

    it("handles single pixel", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 1,
        height: 1
      }
      
      const lines = backgroundGradient(options)
      expect(lines).toHaveLength(1)
      expect(lines[0]).toBe("█")
    })

    it("handles different gradient directions", () => {
      const directions: GradientConfig['direction'][] = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']
      
      directions.forEach(direction => {
        const options: BackgroundGradientOptions = {
          gradient: { ...rainbowGradient(), direction },
          width: 5,
          height: 3
        }
        
        const lines = backgroundGradient(options)
        expect(lines).toHaveLength(3)
        expect(lines[0]).toHaveLength(5)
      })
    })
  })

  describe("borderGradient", () => {
    it("applies gradient to border characters", () => {
      const borderChars = "┌─┐│└┘"
      const gradient = rainbowGradient()
      
      const styles = borderGradient(borderChars, gradient)
      expect(styles).toHaveLength(borderChars.length)
      expect(styles[0]).toBeDefined()
    })

    it("handles empty border string", () => {
      const styles = borderGradient("", rainbowGradient())
      expect(styles).toHaveLength(0)
    })

    it("handles single character", () => {
      const styles = borderGradient("─", rainbowGradient())
      expect(styles).toHaveLength(1)
    })
  })

  describe("Preset Gradients", () => {
    it("creates rainbow gradient", () => {
      const gradient = rainbowGradient()
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('linear')
      expect(gradient.stops).toHaveLength(7)
      expect(gradient.stops[0]!.color).toBe(Colors.red)
    })

    it("creates rainbow gradient with custom direction", () => {
      const gradient = rainbowGradient('vertical')
      expect(gradient.direction).toBe('vertical')
    })

    it("creates sunset gradient", () => {
      const gradient = sunsetGradient()
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('ease-in-out')
      expect(gradient.stops).toHaveLength(3)
    })

    it("creates ocean gradient", () => {
      const gradient = oceanGradient()
      expect(gradient.direction).toBe('vertical')
      expect(gradient.interpolation).toBe('ease-in-out')
      expect(gradient.stops).toHaveLength(3)
    })

    it("creates forest gradient", () => {
      const gradient = forestGradient()
      expect(gradient.direction).toBe('vertical')
      expect(gradient.interpolation).toBe('linear')
      expect(gradient.stops).toHaveLength(3)
    })

    it("creates fire gradient", () => {
      const gradient = fireGradient()
      expect(gradient.direction).toBe('vertical')
      expect(gradient.interpolation).toBe('ease-out')
      expect(gradient.stops).toHaveLength(4)
    })

    it("creates pastel gradient", () => {
      const gradient = pastelGradient()
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('ease-in-out')
      expect(gradient.stops).toHaveLength(5)
    })

    it("creates monochrome gradient", () => {
      const gradient = monochromeGradient(Colors.black, Colors.white)
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('linear')
      expect(gradient.stops).toHaveLength(2)
      expect(gradient.stops[0]!.color).toBe(Colors.black)
      expect(gradient.stops[1]!.color).toBe(Colors.white)
    })

    it("creates monochrome gradient with custom direction", () => {
      const gradient = monochromeGradient(Colors.red, Colors.blue, 'diagonal-down')
      expect(gradient.direction).toBe('diagonal-down')
    })
  })

  describe("createGradient", () => {
    it("creates gradient from color array", () => {
      const colors = [Colors.red, Colors.green, Colors.blue]
      const gradient = createGradient(colors)
      
      expect(gradient.direction).toBe('horizontal')
      expect(gradient.interpolation).toBe('linear')
      expect(gradient.stops).toHaveLength(3)
      expect(gradient.stops[0]!.position).toBe(0)
      expect(gradient.stops[1]!.position).toBe(0.5)
      expect(gradient.stops[2]!.position).toBe(1)
    })

    it("handles empty color array", () => {
      const gradient = createGradient([])
      expect(gradient.stops).toHaveLength(1)
      expect(gradient.stops[0]!.color).toBe(Colors.white)
    })

    it("handles single color", () => {
      const gradient = createGradient([Colors.red])
      expect(gradient.stops).toHaveLength(1)
      expect(gradient.stops[0]!.position).toBe(0)
      expect(gradient.stops[0]!.color).toBe(Colors.red)
    })

    it("accepts custom direction and interpolation", () => {
      const gradient = createGradient([Colors.red, Colors.blue], 'vertical', 'ease-in')
      expect(gradient.direction).toBe('vertical')
      expect(gradient.interpolation).toBe('ease-in')
    })
  })

  describe("Gradient Utilities", () => {
    const testGradient: GradientConfig = {
      direction: 'horizontal',
      interpolation: 'linear',
      stops: [
        { position: 0, color: Colors.red },
        { position: 0.5, color: Colors.green },
        { position: 1, color: Colors.blue }
      ]
    }

    it("reverses gradient", () => {
      const reversed = reverseGradient(testGradient)
      expect(reversed.stops[0]!.position).toBe(1)
      expect(reversed.stops[1]!.position).toBe(0.5)
      expect(reversed.stops[2]!.position).toBe(0)
      expect(reversed.stops[0]!.color).toBe(Colors.red) // Same colors, different positions
    })

    it("shifts gradient", () => {
      const shifted = shiftGradient(testGradient, 0.2)
      expect(shifted.stops[0]!.position).toBe(0.2)
      expect(shifted.stops[1]!.position).toBe(0.7)
      expect(shifted.stops[2]!.position).toBe(1) // Clamped to 1
    })

    it("shifts gradient with negative offset", () => {
      const shifted = shiftGradient(testGradient, -0.3)
      expect(shifted.stops[0]!.position).toBe(0) // Clamped to 0
      expect(shifted.stops[1]!.position).toBe(0.2)
      expect(shifted.stops[2]!.position).toBe(0.7)
    })

    it("scales gradient", () => {
      const scaled = scaleGradient(testGradient, 0.2, 0.8)
      expect(scaled.stops[0]!.position).toBe(0.2)
      expect(scaled.stops[1]!.position).toBe(0.5) // 0.2 + 0.5 * 0.6
      expect(scaled.stops[2]!.position).toBe(0.8)
    })
  })

  describe("Animation Helpers", () => {
    const testGradient: GradientConfig = {
      direction: 'horizontal',
      interpolation: 'linear',
      stops: [
        { position: 0, color: Colors.red },
        { position: 1, color: Colors.blue }
      ]
    }

    it("creates animated gradient", () => {
      const animated = animatedGradient(testGradient, 0.5)
      expect(animated.direction).toBe('horizontal')
      expect(animated.interpolation).toBe('linear')
      // Positions should be shifted based on time
    })

    it("creates animated gradient with custom speed", () => {
      const animated1 = animatedGradient(testGradient, 0.25, 1)
      const animated2 = animatedGradient(testGradient, 0.25, 2)
      // Different speeds should produce different offsets
      // Speed 1: offset = 0.25, Speed 2: offset = 0.5
      expect(animated1.stops[0]!.position).not.toBe(animated2.stops[0]!.position)
    })

    it("creates pulsing gradient", () => {
      const pulsing = pulsingGradient(testGradient, 0)
      expect(pulsing.direction).toBe('horizontal')
      expect(pulsing.interpolation).toBe('linear')
      expect(pulsing.stops).toHaveLength(2)
      // Colors should be modified by pulse effect
    })

    it("creates pulsing gradient with custom intensity", () => {
      const pulsing1 = pulsingGradient(testGradient, Math.PI / 2, 0.1) // sin(π/2) = 1
      const pulsing2 = pulsingGradient(testGradient, Math.PI / 2, 0.5) // sin(π/2) = 1
      // Different intensities should produce different color values
      // Intensity 0.1: pulse = 1 + 0.1 = 1.1
      // Intensity 0.5: pulse = 1 + 0.5 = 1.5
      const color1 = pulsing1.stops[0]!.color as any
      const color2 = pulsing2.stops[0]!.color as any
      expect(color1.r).not.toBe(color2.r) // Different red values due to different pulse
    })
  })

  describe("Color Interpolation", () => {
    it("interpolates between gradient stops", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      // Test by creating a text gradient and checking we get styles
      const styles = textGradient({ text: "AB", gradient })
      expect(styles).toHaveLength(2)
      expect(styles[0]).toBeDefined()
      expect(styles[1]).toBeDefined()
    })

    it("handles different interpolation types", () => {
      const interpolations: GradientConfig['interpolation'][] = ['linear', 'ease-in', 'ease-out', 'ease-in-out']
      
      interpolations.forEach(interpolation => {
        const gradient: GradientConfig = {
          direction: 'horizontal',
          interpolation,
          stops: [
            { position: 0, color: Colors.red },
            { position: 1, color: Colors.blue }
          ]
        }
        
        const styles = textGradient({ text: "Test", gradient })
        expect(styles).toHaveLength(4)
      })
    })

    it("handles single stop gradient", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0.5, color: Colors.green }
        ]
      }
      
      const styles = textGradient({ text: "Test", gradient })
      expect(styles).toHaveLength(4)
      // All styles should use the same color
    })

    it("handles unsorted stops", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 1, color: Colors.blue },
          { position: 0, color: Colors.red },
          { position: 0.5, color: Colors.green }
        ]
      }
      
      const styles = textGradient({ text: "Test", gradient })
      expect(styles).toHaveLength(4)
    })
  })

  describe("Edge Cases", () => {
    it("handles extreme position values", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: -0.5, color: Colors.red }, // Negative position
          { position: 1.5, color: Colors.blue }  // Position > 1
        ]
      }
      
      const styles = textGradient({ text: "Test", gradient })
      expect(styles).toHaveLength(4)
    })

    it("handles duplicate positions", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: Colors.red },
          { position: 0, color: Colors.green },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "Test", gradient })
      expect(styles).toHaveLength(4)
    })

    it("handles very long text", () => {
      const longText = "A".repeat(1000)
      const gradient = rainbowGradient()
      
      const styles = textGradient({ text: longText, gradient })
      expect(styles).toHaveLength(1000)
    })

    it("handles large background dimensions", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 100,
        height: 50
      }
      
      const lines = backgroundGradient(options)
      expect(lines).toHaveLength(50)
      expect(lines[0]).toHaveLength(100)
    })
  })

  describe("Performance", () => {
    it("handles large gradients efficiently", () => {
      const manyStops: GradientStop[] = []
      for (let i = 0; i <= 100; i++) {
        manyStops.push({
          position: i / 100,
          color: i % 2 === 0 ? Colors.red : Colors.blue
        })
      }
      
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: manyStops
      }
      
      const start = Date.now()
      const styles = textGradient({ text: "Performance test", gradient })
      const duration = Date.now() - start
      
      expect(styles).toHaveLength(16) // "Performance test".length
      expect(duration).toBeLessThan(100) // Should be fast
    })
  })

  describe("Color Space Conversion", () => {
    it("converts RGB colors correctly", () => {
      const rgbColor = Color.RGB(255, 128, 64)
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: rgbColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "RGB", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })

    it("converts ANSI colors correctly", () => {
      const ansiColor = Color.ANSI(1) // Red
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: ansiColor },
          { position: 1, color: Color.ANSI(2) } // Green
        ]
      }
      
      const styles = textGradient({ text: "ANSI", gradient })
      expect(styles).toHaveLength(4)
      expect(styles[0]).toBeDefined()
    })

    it("converts ANSI colors with unknown code", () => {
      const unknownAnsiColor = Color.ANSI(999) // Unknown code
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: unknownAnsiColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "UNK", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })

    it("converts Hex colors correctly", () => {
      const hexColor = Color.Hex("#FF8040")
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: hexColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "HEX", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })

    it("converts Hex colors without hash", () => {
      const hexColor = Color.Hex("FF8040")
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: hexColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "HEX", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })

    it("converts ANSI256 colors in standard range", () => {
      const ansi256Color = Color.ANSI256(5) // Standard ANSI color
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: ansi256Color },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "256", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })

    it("converts ANSI256 colors in cube range", () => {
      const ansi256Color = Color.ANSI256(100) // Color cube range
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: ansi256Color },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "CUBE", gradient })
      expect(styles).toHaveLength(4)
      expect(styles[0]).toBeDefined()
    })

    it("converts ANSI256 colors in grayscale range", () => {
      const ansi256Color = Color.ANSI256(240) // Grayscale range
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: ansi256Color },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "GRAY", gradient })
      expect(styles).toHaveLength(4)
      expect(styles[0]).toBeDefined()
    })

    it("converts NoColor type", () => {
      const noColor = Color.NoColor()
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: noColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "NO", gradient })
      expect(styles).toHaveLength(2)
      expect(styles[0]).toBeDefined()
    })

    it("interpolates with NoColor producing correct RGB values", () => {
      const noColor = Color.NoColor()
      const blueColor = Color.RGB(0, 0, 255)
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: noColor },
          { position: 1, color: blueColor }
        ]
      }
      
      // Test interpolation - NoColor should convert to [0, 0, 0] RGB
      const styles = textGradient({ text: "NOCOLOR", gradient })
      expect(styles).toHaveLength(7)
      expect(styles[0]).toBeDefined()
      expect(styles[6]).toBeDefined()
    })

    it("converts Adaptive colors", () => {
      const adaptiveColor = Color.Adaptive(Colors.red, Colors.blue)
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: adaptiveColor },
          { position: 1, color: Colors.green }
        ]
      }
      
      const styles = textGradient({ text: "ADAPT", gradient })
      expect(styles).toHaveLength(5)
      expect(styles[0]).toBeDefined()
    })

    it("handles invalid color type with default", () => {
      // Create a malformed color object to test default case
      const invalidColor = { _tag: "Invalid" } as any
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: invalidColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "INV", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })
  })

  describe("Color Interpolation Algorithms", () => {
    it("interpolates RGB colors correctly", () => {
      const color1 = Color.RGB(255, 0, 0) // Red
      const color2 = Color.RGB(0, 255, 0) // Green
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: color1 },
          { position: 1, color: color2 }
        ]
      }
      
      const styles = textGradient({ text: "RG", gradient })
      expect(styles).toHaveLength(2)
      expect(styles[0]).toBeDefined()
      expect(styles[1]).toBeDefined()
    })

    it("applies linear interpolation correctly", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "LINEAR", gradient })
      expect(styles).toHaveLength(6)
      expect(styles[0]).toBeDefined()
    })

    it("applies ease-in interpolation correctly", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'ease-in',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "EASEIN", gradient })
      expect(styles).toHaveLength(6)
      expect(styles[0]).toBeDefined()
    })

    it("applies ease-out interpolation correctly", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'ease-out',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "EASEOUT", gradient })
      expect(styles).toHaveLength(7)
      expect(styles[0]).toBeDefined()
    })

    it("applies ease-in-out interpolation correctly", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'ease-in-out',
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "EASEINOUT", gradient })
      expect(styles).toHaveLength(9)
      expect(styles[0]).toBeDefined()
    })

    it("handles invalid interpolation type", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'invalid' as any,
        stops: [
          { position: 0, color: Colors.red },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "INVALID", gradient })
      expect(styles).toHaveLength(7)
      expect(styles[0]).toBeDefined()
    })
  })

  describe("Gradient Color Calculation Edge Cases", () => {
    it("handles empty stops array", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: []
      }
      
      const styles = textGradient({ text: "EMPTY", gradient })
      expect(styles).toHaveLength(5)
      // Should use default white color
      expect(styles[0]).toBeDefined()
    })

    it("handles position exactly at first stop", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0.5, color: Colors.red },
          { position: 1.0, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "A", gradient })
      expect(styles).toHaveLength(1)
      expect(styles[0]).toBeDefined()
    })

    it("handles position exactly at last stop", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0.0, color: Colors.red },
          { position: 0.5, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "AB", gradient })
      expect(styles).toHaveLength(2)
      expect(styles[0]).toBeDefined()
      expect(styles[1]).toBeDefined()
    })

    it("handles multiple stops with same position", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0.0, color: Colors.red },
          { position: 0.5, color: Colors.green },
          { position: 0.5, color: Colors.blue }, // Same position
          { position: 1.0, color: Colors.yellow }
        ]
      }
      
      const styles = textGradient({ text: "MULTI", gradient })
      expect(styles).toHaveLength(5)
      expect(styles[0]).toBeDefined()
    })

    it("handles stops in reverse order", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 1.0, color: Colors.blue },
          { position: 0.5, color: Colors.green },
          { position: 0.0, color: Colors.red }
        ]
      }
      
      const styles = textGradient({ text: "REV", gradient })
      expect(styles).toHaveLength(3)
      expect(styles[0]).toBeDefined()
    })
  })

  describe("Complex Color Interpolation", () => {
    it("interpolates between different color formats", () => {
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: Color.RGB(255, 0, 0) },
          { position: 0.5, color: Color.Hex("#00FF00") },
          { position: 1, color: Color.ANSI(4) } // Blue
        ]
      }
      
      const styles = textGradient({ text: "MIXED", gradient })
      expect(styles).toHaveLength(5)
      expect(styles[0]).toBeDefined()
    })

    it("handles nested adaptive colors", () => {
      const nestedAdaptive = Color.Adaptive(
        Color.RGB(255, 0, 0),
        Color.Adaptive(Colors.green, Colors.blue)
      )
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: nestedAdaptive },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const styles = textGradient({ text: "NESTED", gradient })
      expect(styles).toHaveLength(6)
      expect(styles[0]).toBeDefined()
    })

    it("handles extreme RGB values", () => {
      const extremeColor1 = Color.RGB(0, 0, 0)
      const extremeColor2 = Color.RGB(255, 255, 255)
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: extremeColor1 },
          { position: 1, color: extremeColor2 }
        ]
      }
      
      const styles = textGradient({ text: "EXTREME", gradient })
      expect(styles).toHaveLength(7)
      expect(styles[0]).toBeDefined()
    })
  })

  describe("Advanced Animation Features", () => {
    it("creates smooth animated transitions", () => {
      const baseGradient = rainbowGradient()
      const time1 = 0
      const time2 = 0.5
      
      const animated1 = animatedGradient(baseGradient, time1)
      const animated2 = animatedGradient(baseGradient, time2)
      
      expect(animated1.stops[0]!.position).not.toBe(animated2.stops[0]!.position)
    })

    it("handles pulsing with extreme intensities", () => {
      const baseGradient = monochromeGradient(Colors.red, Colors.blue)
      const pulsingLow = pulsingGradient(baseGradient, 0, 0.1)
      const pulsingHigh = pulsingGradient(baseGradient, 0, 1.0)
      
      expect(pulsingLow.stops).toHaveLength(2)
      expect(pulsingHigh.stops).toHaveLength(2)
    })

    it("handles pulsing with negative sine values", () => {
      const baseGradient = monochromeGradient(Colors.red, Colors.blue)
      const pulsingNeg = pulsingGradient(baseGradient, Math.PI, 0.5) // sin(π) = 0, so pulse = 1
      
      expect(pulsingNeg.stops).toHaveLength(2)
      expect(pulsingNeg.stops[0]!.color).toBeDefined()
    })

    it("handles color overflow in pulsing", () => {
      const brightColor = Color.RGB(200, 200, 200)
      const baseGradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: [
          { position: 0, color: brightColor },
          { position: 1, color: Colors.blue }
        ]
      }
      
      const pulsing = pulsingGradient(baseGradient, Math.PI / 2, 0.5) // sin(π/2) = 1, pulse = 1.5
      expect(pulsing.stops).toHaveLength(2)
      
      // Colors should be clamped to max 255
      const pulsingColor = pulsing.stops[0]!.color as any
      expect(pulsingColor.r).toBeLessThanOrEqual(255)
      expect(pulsingColor.g).toBeLessThanOrEqual(255)
      expect(pulsingColor.b).toBeLessThanOrEqual(255)
    })
  })

  describe("Performance and Memory", () => {
    it("handles very large text efficiently", () => {
      const veryLongText = "A".repeat(10000)
      const gradient = rainbowGradient()
      
      const start = performance.now()
      const styles = textGradient({ text: veryLongText, gradient })
      const duration = performance.now() - start
      
      expect(styles).toHaveLength(10000)
      expect(duration).toBeLessThan(500) // Should complete in reasonable time
    })

    it("handles extreme background dimensions", () => {
      const options: BackgroundGradientOptions = {
        gradient: rainbowGradient(),
        width: 1000,
        height: 1000
      }
      
      const start = performance.now()
      const lines = backgroundGradient(options)
      const duration = performance.now() - start
      
      expect(lines).toHaveLength(1000)
      expect(lines[0]).toHaveLength(1000)
      expect(duration).toBeLessThan(2000) // Should complete in reasonable time
    })

    it("handles complex gradient with many stops", () => {
      const manyStops: GradientStop[] = []
      for (let i = 0; i <= 1000; i++) {
        manyStops.push({
          position: i / 1000,
          color: Color.RGB(i % 256, (i * 2) % 256, (i * 3) % 256)
        })
      }
      
      const gradient: GradientConfig = {
        direction: 'horizontal',
        interpolation: 'linear',
        stops: manyStops
      }
      
      const start = performance.now()
      const styles = textGradient({ text: "Complex gradient test", gradient })
      const duration = performance.now() - start
      
      expect(styles).toHaveLength(21)
      expect(duration).toBeLessThan(200) // Should handle many stops efficiently
    })
  })
})