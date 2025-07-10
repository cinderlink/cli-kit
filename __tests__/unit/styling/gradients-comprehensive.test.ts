/**
 * Comprehensive tests for gradients module
 */

import { describe, it, expect } from "bun:test"
import {
  createLinearGradient,
  createRadialGradient,
  parseGradientString,
  interpolateColors,
  applyGradientToText,
  generateGradientStops,
  calculateGradientPosition,
  blendGradients,
  optimizeGradient,
  convertGradientFormat,
  validateGradientSyntax,
  getGradientColors,
  reverseGradient,
  rotateGradient
} from "@/styling/gradients"

describe("Gradients Module", () => {
  describe("createLinearGradient function", () => {
    it("creates basic linear gradient", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      expect(gradient).toBeDefined()
      expect(gradient.type).toBe("linear")
      expect(gradient.angle).toBe(0)
      expect(gradient.stops).toHaveLength(2)
    })

    it("creates gradient with multiple stops", () => {
      const gradient = createLinearGradient({
        angle: 45,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#00ff00", position: 0.5 },
          { color: "#0000ff", position: 1 }
        ]
      })
      expect(gradient.stops).toHaveLength(3)
      expect(gradient.angle).toBe(45)
    })

    it("handles default angle", () => {
      const gradient = createLinearGradient({
        stops: [
          { color: "#ffffff", position: 0 },
          { color: "#000000", position: 1 }
        ]
      })
      expect(gradient.angle).toBe(0)
    })

    it("normalizes angles", () => {
      const gradient = createLinearGradient({
        angle: 450, // Should normalize to 90
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      expect(gradient.angle).toBe(90)
    })

    it("sorts stops by position", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#0000ff", position: 1 },
          { color: "#ff0000", position: 0 },
          { color: "#00ff00", position: 0.5 }
        ]
      })
      expect(gradient.stops[0].position).toBe(0)
      expect(gradient.stops[1].position).toBe(0.5)
      expect(gradient.stops[2].position).toBe(1)
    })
  })

  describe("createRadialGradient function", () => {
    it("creates basic radial gradient", () => {
      const gradient = createRadialGradient({
        center: { x: 0.5, y: 0.5 },
        radius: 1,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      expect(gradient).toBeDefined()
      expect(gradient.type).toBe("radial")
      expect(gradient.center).toEqual({ x: 0.5, y: 0.5 })
      expect(gradient.radius).toBe(1)
    })

    it("handles default center", () => {
      const gradient = createRadialGradient({
        radius: 0.8,
        stops: [
          { color: "#ffffff", position: 0 },
          { color: "#000000", position: 1 }
        ]
      })
      expect(gradient.center).toEqual({ x: 0.5, y: 0.5 })
    })

    it("clamps radius to valid range", () => {
      const gradient1 = createRadialGradient({
        radius: -1, // Should clamp to 0
        stops: [{ color: "#ffffff", position: 0 }]
      })
      expect(gradient1.radius).toBe(0)

      const gradient2 = createRadialGradient({
        radius: 5, // Should clamp to some maximum
        stops: [{ color: "#ffffff", position: 0 }]
      })
      expect(gradient2.radius).toBeLessThanOrEqual(2)
    })
  })

  describe("parseGradientString function", () => {
    it("parses linear gradient string", () => {
      const gradientStr = "linear-gradient(45deg, #ff0000 0%, #0000ff 100%)"
      const gradient = parseGradientString(gradientStr)
      expect(gradient).toBeDefined()
      expect(gradient.type).toBe("linear")
      expect(gradient.angle).toBe(45)
      expect(gradient.stops).toHaveLength(2)
    })

    it("parses radial gradient string", () => {
      const gradientStr = "radial-gradient(circle at center, #ff0000 0%, #0000ff 100%)"
      const gradient = parseGradientString(gradientStr)
      expect(gradient).toBeDefined()
      expect(gradient.type).toBe("radial")
    })

    it("handles color names", () => {
      const gradientStr = "linear-gradient(0deg, red 0%, blue 100%)"
      const gradient = parseGradientString(gradientStr)
      expect(gradient.stops[0].color).toBe("red")
      expect(gradient.stops[1].color).toBe("blue")
    })

    it("handles multiple stops", () => {
      const gradientStr = "linear-gradient(90deg, red 0%, green 50%, blue 100%)"
      const gradient = parseGradientString(gradientStr)
      expect(gradient.stops).toHaveLength(3)
      expect(gradient.stops[1].position).toBe(0.5)
    })

    it("handles invalid strings gracefully", () => {
      const invalidStr = "not-a-gradient"
      const gradient = parseGradientString(invalidStr)
      expect(gradient).toBeNull()
    })

    it("handles missing percentages", () => {
      const gradientStr = "linear-gradient(0deg, red, blue)"
      const gradient = parseGradientString(gradientStr)
      expect(gradient.stops[0].position).toBe(0)
      expect(gradient.stops[1].position).toBe(1)
    })
  })

  describe("interpolateColors function", () => {
    it("interpolates between two colors", () => {
      const color1 = { r: 255, g: 0, b: 0 } // Red
      const color2 = { r: 0, g: 0, b: 255 } // Blue
      const interpolated = interpolateColors(color1, color2, 0.5)
      expect(interpolated.r).toBe(128) // Halfway between 255 and 0
      expect(interpolated.g).toBe(0)
      expect(interpolated.b).toBe(128) // Halfway between 0 and 255
    })

    it("returns first color at t=0", () => {
      const color1 = { r: 255, g: 100, b: 50 }
      const color2 = { r: 0, g: 200, b: 150 }
      const interpolated = interpolateColors(color1, color2, 0)
      expect(interpolated).toEqual(color1)
    })

    it("returns second color at t=1", () => {
      const color1 = { r: 255, g: 100, b: 50 }
      const color2 = { r: 0, g: 200, b: 150 }
      const interpolated = interpolateColors(color1, color2, 1)
      expect(interpolated).toEqual(color2)
    })

    it("handles alpha channel", () => {
      const color1 = { r: 255, g: 0, b: 0, a: 1 }
      const color2 = { r: 0, g: 0, b: 255, a: 0 }
      const interpolated = interpolateColors(color1, color2, 0.5)
      expect(interpolated.a).toBe(0.5)
    })

    it("clamps t value", () => {
      const color1 = { r: 100, g: 100, b: 100 }
      const color2 = { r: 200, g: 200, b: 200 }
      
      const underflow = interpolateColors(color1, color2, -0.5)
      expect(underflow).toEqual(color1)
      
      const overflow = interpolateColors(color1, color2, 1.5)
      expect(overflow).toEqual(color2)
    })
  })

  describe("generateGradientStops function", () => {
    it("generates stops for given width", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const stops = generateGradientStops(gradient, 10)
      expect(stops).toHaveLength(10)
      expect(stops[0]).toContain("255") // Red component
      expect(stops[9]).toContain("255") // Blue component (different position)
    })

    it("handles single stop", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const stops = generateGradientStops(gradient, 5)
      expect(stops).toHaveLength(5)
      stops.forEach(stop => {
        expect(stop).toContain("255") // All should be red
      })
    })

    it("handles zero width", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const stops = generateGradientStops(gradient, 0)
      expect(stops).toHaveLength(0)
    })
  })

  describe("calculateGradientPosition function", () => {
    it("calculates position for linear gradient", () => {
      const gradient = createLinearGradient({
        angle: 0, // Horizontal
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const pos1 = calculateGradientPosition(gradient, 0, 0, 10, 1)
      const pos2 = calculateGradientPosition(gradient, 5, 0, 10, 1)
      const pos3 = calculateGradientPosition(gradient, 9, 0, 10, 1)
      
      expect(pos1).toBe(0)
      expect(pos2).toBe(0.5)
      expect(pos3).toBe(0.9)
    })

    it("calculates position for vertical gradient", () => {
      const gradient = createLinearGradient({
        angle: 90, // Vertical
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const pos1 = calculateGradientPosition(gradient, 0, 0, 1, 10)
      const pos2 = calculateGradientPosition(gradient, 0, 5, 1, 10)
      
      expect(pos1).toBe(0)
      expect(pos2).toBe(0.5)
    })

    it("calculates position for radial gradient", () => {
      const gradient = createRadialGradient({
        center: { x: 0.5, y: 0.5 },
        radius: 1,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const centerPos = calculateGradientPosition(gradient, 5, 5, 10, 10)
      const edgePos = calculateGradientPosition(gradient, 0, 0, 10, 10)
      
      expect(centerPos).toBe(0) // At center
      expect(edgePos).toBeGreaterThan(centerPos) // Away from center
    })
  })

  describe("applyGradientToText function", () => {
    it("applies gradient to text", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const styled = applyGradientToText("Hello", gradient)
      expect(styled).toContain("\x1b[") // ANSI escape codes
      expect(styled).toContain("Hello")
    })

    it("handles empty text", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const styled = applyGradientToText("", gradient)
      expect(styled).toBe("")
    })

    it("applies different colors to different characters", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const styled = applyGradientToText("AB", gradient)
      // Should contain different color codes for each character
      const escapeSequences = styled.match(/\x1b\[[0-9;]+m/g) || []
      expect(escapeSequences.length).toBeGreaterThan(1)
    })
  })

  describe("utility functions", () => {
    it("validates gradient syntax", () => {
      expect(validateGradientSyntax("linear-gradient(0deg, red, blue)")).toBe(true)
      expect(validateGradientSyntax("radial-gradient(circle, red, blue)")).toBe(true)
      expect(validateGradientSyntax("invalid-gradient")).toBe(false)
      expect(validateGradientSyntax("")).toBe(false)
    })

    it("extracts gradient colors", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#00ff00", position: 0.5 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const colors = getGradientColors(gradient)
      expect(colors).toEqual(["#ff0000", "#00ff00", "#0000ff"])
    })

    it("reverses gradient", () => {
      const gradient = createLinearGradient({
        angle: 45,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const reversed = reverseGradient(gradient)
      expect(reversed.stops[0].color).toBe("#0000ff")
      expect(reversed.stops[1].color).toBe("#ff0000")
      expect(reversed.stops[0].position).toBe(0)
      expect(reversed.stops[1].position).toBe(1)
    })

    it("rotates gradient", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const rotated = rotateGradient(gradient, 90)
      expect(rotated.angle).toBe(90)
    })

    it("optimizes gradient by removing redundant stops", () => {
      const gradient = createLinearGradient({
        angle: 0,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#ff0000", position: 0.5 }, // Redundant
          { color: "#0000ff", position: 1 }
        ]
      })
      const optimized = optimizeGradient(gradient)
      expect(optimized.stops.length).toBeLessThan(gradient.stops.length)
    })

    it("blends two gradients", () => {
      const gradient1 = createLinearGradient({
        angle: 0,
        stops: [{ color: "#ff0000", position: 0 }]
      })
      const gradient2 = createLinearGradient({
        angle: 0,
        stops: [{ color: "#0000ff", position: 0 }]
      })
      const blended = blendGradients(gradient1, gradient2, 0.5)
      expect(blended.stops).toHaveLength(2)
    })

    it("converts gradient formats", () => {
      const gradient = createLinearGradient({
        angle: 45,
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 }
        ]
      })
      const cssString = convertGradientFormat(gradient, "css")
      expect(cssString).toContain("linear-gradient")
      expect(cssString).toContain("45deg")
      expect(cssString).toContain("#ff0000")
    })
  })
})