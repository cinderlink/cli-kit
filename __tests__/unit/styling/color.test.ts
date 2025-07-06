/**
 * Tests for Color System
 */

import { describe, it, expect } from "bun:test"
import {
  Colors,
  color,
  rgb,
  hsl,
  hex,
  parseColor,
  isValidColor,
  toHex,
  toRgb,
  toHsl,
  darken,
  lighten,
  saturate,
  desaturate,
  rotate,
  mix,
  contrast,
  complement,
  analogous,
  triadic,
  tetradic,
  gradient,
  palette,
  adaptiveColor,
  colorScheme,
  type Color,
  type RGB,
  type HSL
} from "@/styling/color"

describe("Color System", () => {
  describe("Basic Colors", () => {
    it("provides standard color constants", () => {
      expect(Colors.red).toBe("red")
      expect(Colors.green).toBe("green")
      expect(Colors.blue).toBe("blue")
      expect(Colors.black).toBe("black")
      expect(Colors.white).toBe("white")
      expect(Colors.gray).toBe("gray")
      expect(Colors.cyan).toBe("cyan")
      expect(Colors.magenta).toBe("magenta")
      expect(Colors.yellow).toBe("yellow")
    })
  })

  describe("color function", () => {
    it("creates color from name", () => {
      const red = color("red")
      expect(red).toBe("red")
    })

    it("creates color from hex", () => {
      const hexColor = color("#ff0000")
      expect(hexColor).toBe("#ff0000")
    })

    it("creates color from rgb", () => {
      const rgbColor = color("rgb(255, 0, 0)")
      expect(rgbColor).toBe("rgb(255, 0, 0)")
    })
  })

  describe("rgb function", () => {
    it("creates RGB color", () => {
      const red = rgb(255, 0, 0)
      expect(red).toBe("rgb(255, 0, 0)")
    })

    it("clamps values to valid range", () => {
      const clamped = rgb(300, -50, 128)
      expect(clamped).toBe("rgb(255, 0, 128)")
    })

    it("handles decimals", () => {
      const decimal = rgb(127.5, 63.7, 191.2)
      expect(decimal).toBe("rgb(128, 64, 191)")
    })
  })

  describe("hsl function", () => {
    it("creates HSL color", () => {
      const red = hsl(0, 100, 50)
      expect(red).toBe("hsl(0, 100%, 50%)")
    })

    it("normalizes hue to 0-360", () => {
      const normalized = hsl(400, 100, 50)
      expect(normalized).toBe("hsl(40, 100%, 50%)")
    })

    it("clamps saturation and lightness", () => {
      const clamped = hsl(180, 150, -20)
      expect(clamped).toBe("hsl(180, 100%, 0%)")
    })
  })

  describe("hex function", () => {
    it("creates hex color with hash", () => {
      const red = hex("ff0000")
      expect(red).toBe("#ff0000")
    })

    it("handles existing hash", () => {
      const red = hex("#ff0000")
      expect(red).toBe("#ff0000")
    })

    it("converts short hex to long", () => {
      const red = hex("f00")
      expect(red).toBe("#ff0000")
    })

    it("validates hex format", () => {
      const invalid = hex("gggggg")
      expect(invalid).toBe("#000000") // Falls back to black
    })
  })

  describe("parseColor", () => {
    it("parses hex colors", () => {
      const parsed = parseColor("#ff0000")
      expect(parsed).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("parses rgb colors", () => {
      const parsed = parseColor("rgb(128, 64, 192)")
      expect(parsed).toEqual({ r: 128, g: 64, b: 192 })
    })

    it("parses named colors", () => {
      const parsed = parseColor("red")
      expect(parsed).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("returns null for invalid colors", () => {
      const parsed = parseColor("not-a-color")
      expect(parsed).toBeNull()
    })
  })

  describe("isValidColor", () => {
    it("validates hex colors", () => {
      expect(isValidColor("#ff0000")).toBe(true)
      expect(isValidColor("#f00")).toBe(true)
      expect(isValidColor("ff0000")).toBe(false)
      expect(isValidColor("#gggggg")).toBe(false)
    })

    it("validates rgb colors", () => {
      expect(isValidColor("rgb(255, 0, 0)")).toBe(true)
      expect(isValidColor("rgb(256, 0, 0)")).toBe(false)
      expect(isValidColor("rgb(-1, 0, 0)")).toBe(false)
    })

    it("validates hsl colors", () => {
      expect(isValidColor("hsl(0, 100%, 50%)")).toBe(true)
      expect(isValidColor("hsl(360, 100%, 50%)")).toBe(true)
      expect(isValidColor("hsl(0, 101%, 50%)")).toBe(false)
    })

    it("validates named colors", () => {
      expect(isValidColor("red")).toBe(true)
      expect(isValidColor("blue")).toBe(true)
      expect(isValidColor("notacolor")).toBe(false)
    })
  })

  describe("Color Conversions", () => {
    it("converts to hex", () => {
      expect(toHex("red")).toBe("#ff0000")
      expect(toHex("rgb(0, 255, 0)")).toBe("#00ff00")
      expect(toHex("#0000ff")).toBe("#0000ff")
    })

    it("converts to rgb", () => {
      expect(toRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 })
      expect(toRgb("red")).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("converts to hsl", () => {
      const red = toHsl("#ff0000")
      expect(red?.h).toBe(0)
      expect(red?.s).toBe(100)
      expect(red?.l).toBe(50)
    })
  })

  describe("Color Manipulation", () => {
    it("darkens colors", () => {
      const darkRed = darken("red", 20)
      const hslDark = toHsl(darkRed)
      expect(hslDark?.l).toBeLessThan(50)
    })

    it("lightens colors", () => {
      const lightRed = lighten("red", 20)
      const hslLight = toHsl(lightRed)
      expect(hslLight?.l).toBeGreaterThan(50)
    })

    it("saturates colors", () => {
      const desatRed = desaturate("red", 50)
      const moreSat = saturate(desatRed, 25)
      const hsl = toHsl(moreSat)
      expect(hsl?.s).toBeGreaterThan(50)
    })

    it("desaturates colors", () => {
      const desatBlue = desaturate("blue", 50)
      const hsl = toHsl(desatBlue)
      expect(hsl?.s).toBe(50)
    })

    it("rotates hue", () => {
      const rotated = rotate("red", 120)
      const hsl = toHsl(rotated)
      expect(hsl?.h).toBe(120)
    })

    it("mixes colors", () => {
      const purple = mix("red", "blue", 0.5)
      expect(purple).toBeDefined()
    })
  })

  describe("Color Relationships", () => {
    it("calculates contrast ratio", () => {
      const ratio = contrast("white", "black")
      expect(ratio).toBe(21) // Maximum contrast
    })

    it("finds complement color", () => {
      const comp = complement("red")
      const hsl = toHsl(comp)
      expect(hsl?.h).toBe(180) // Cyan
    })

    it("finds analogous colors", () => {
      const colors = analogous("red")
      expect(colors).toHaveLength(3)
      expect(colors[0]).toBe("red")
    })

    it("finds triadic colors", () => {
      const colors = triadic("red")
      expect(colors).toHaveLength(3)
    })

    it("finds tetradic colors", () => {
      const colors = tetradic("red")
      expect(colors).toHaveLength(4)
    })
  })

  describe("gradient function", () => {
    it("creates gradient between colors", () => {
      const grad = gradient("red", "blue", 5)
      expect(grad).toHaveLength(5)
      expect(grad[0]).toBe("red")
      expect(grad[4]).toBe("blue")
    })

    it("handles two-step gradient", () => {
      const grad = gradient("black", "white", 2)
      expect(grad).toHaveLength(2)
      expect(grad[0]).toBe("black")
      expect(grad[1]).toBe("white")
    })
  })

  describe("palette function", () => {
    it("generates monochromatic palette", () => {
      const mono = palette("blue", "monochromatic")
      expect(mono.length).toBeGreaterThan(3)
      // All colors should have same hue
    })

    it("generates complementary palette", () => {
      const comp = palette("red", "complementary")
      expect(comp).toContain("red")
      expect(comp.length).toBeGreaterThanOrEqual(2)
    })

    it("generates analogous palette", () => {
      const analog = palette("green", "analogous")
      expect(analog).toContain("green")
      expect(analog.length).toBeGreaterThanOrEqual(3)
    })

    it("generates triadic palette", () => {
      const tri = palette("blue", "triadic")
      expect(tri).toContain("blue")
      expect(tri).toHaveLength(3)
    })

    it("generates tetradic palette", () => {
      const tetra = palette("yellow", "tetradic")
      expect(tetra).toContain("yellow")
      expect(tetra).toHaveLength(4)
    })
  })

  describe("adaptiveColor", () => {
    it("adapts color based on background", () => {
      const onDark = adaptiveColor("gray", "black")
      const onLight = adaptiveColor("gray", "white")
      
      // Should adjust for better contrast
      expect(onDark).not.toBe(onLight)
    })
  })

  describe("colorScheme", () => {
    it("generates color scheme", () => {
      const scheme = colorScheme({
        primary: "blue",
        mode: "light"
      })
      
      expect(scheme.primary).toBe("blue")
      expect(scheme.background).toBeDefined()
      expect(scheme.text).toBeDefined()
    })

    it("generates dark scheme", () => {
      const scheme = colorScheme({
        primary: "blue",
        mode: "dark"
      })
      
      expect(scheme.background).toBeDefined()
      // Dark scheme should have dark background
    })
  })

  describe("Edge Cases", () => {
    it("handles invalid color inputs gracefully", () => {
      expect(parseColor("")).toBeNull()
      expect(toHex("invalid")).toBe("#000000")
      expect(isValidColor("")).toBe(false)
    })

    it("handles extreme values", () => {
      expect(darken("black", 50)).toBe("black")
      expect(lighten("white", 50)).toBe("white")
      expect(saturate("gray", 200)).toBeDefined()
    })
  })
})