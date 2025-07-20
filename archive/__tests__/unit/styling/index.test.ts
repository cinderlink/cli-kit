/**
 * Tests for styling index module
 */

import { describe, it, expect } from "bun:test"
import { rgb, hex, hsl } from "../../../src/styling/index"

describe("Styling Index Convenience Functions", () => {
  describe("rgb", () => {
    it("formats RGB color string", () => {
      expect(rgb(255, 0, 0)).toBe("rgb(255, 0, 0)")
      expect(rgb(0, 255, 0)).toBe("rgb(0, 255, 0)")
      expect(rgb(0, 0, 255)).toBe("rgb(0, 0, 255)")
      expect(rgb(128, 128, 128)).toBe("rgb(128, 128, 128)")
    })

    it("handles zero values", () => {
      expect(rgb(0, 0, 0)).toBe("rgb(0, 0, 0)")
    })

    it("handles max values", () => {
      expect(rgb(255, 255, 255)).toBe("rgb(255, 255, 255)")
    })
  })

  describe("hex", () => {
    it("adds # prefix if missing", () => {
      expect(hex("ff0000")).toBe("#ff0000")
      expect(hex("00ff00")).toBe("#00ff00")
      expect(hex("0000ff")).toBe("#0000ff")
    })

    it("preserves # prefix if present", () => {
      expect(hex("#ff0000")).toBe("#ff0000")
      expect(hex("#00ff00")).toBe("#00ff00")
      expect(hex("#0000ff")).toBe("#0000ff")
    })

    it("handles short hex codes", () => {
      expect(hex("fff")).toBe("#fff")
      expect(hex("#000")).toBe("#000")
    })

    it("handles uppercase hex", () => {
      expect(hex("FF0000")).toBe("#FF0000")
      expect(hex("#ABCDEF")).toBe("#ABCDEF")
    })
  })

  describe("hsl", () => {
    it("formats HSL color string", () => {
      expect(hsl(0, 100, 50)).toBe("hsl(0, 100%, 50%)")
      expect(hsl(120, 100, 50)).toBe("hsl(120, 100%, 50%)")
      expect(hsl(240, 100, 50)).toBe("hsl(240, 100%, 50%)")
    })

    it("handles zero saturation", () => {
      expect(hsl(0, 0, 50)).toBe("hsl(0, 0%, 50%)")
    })

    it("handles zero lightness", () => {
      expect(hsl(180, 50, 0)).toBe("hsl(180, 50%, 0%)")
    })

    it("handles full lightness", () => {
      expect(hsl(60, 100, 100)).toBe("hsl(60, 100%, 100%)")
    })

    it("handles 360 degree hue", () => {
      expect(hsl(360, 50, 50)).toBe("hsl(360, 50%, 50%)")
    })
  })
})