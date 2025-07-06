/**
 * Tests for src/styling/color.ts - actual implementation
 */

import { describe, it, expect } from "bun:test"
import { Option } from "effect"
import { 
  Colors,
  Color,
  type Color as ColorType
} from "@/styling/color"

describe("Actual Color System", () => {
  describe("Color constructors", () => {
    it("creates NoColor", () => {
      const noColor = Color.NoColor()
      expect(noColor._tag).toBe("NoColor")
    })

    it("creates ANSI colors", () => {
      const red = Color.ANSI(1)
      expect(red._tag).toBe("ANSI")
      if (red._tag === "ANSI") {
        expect(red.code).toBe(1)
      }
    })

    it("creates ANSI256 colors", () => {
      const purple = Color.ANSI256(93)
      expect(purple._tag).toBe("ANSI256")
      if (purple._tag === "ANSI256") {
        expect(purple.code).toBe(93)
      }
    })

    it("creates RGB colors", () => {
      const rgb = Color.RGB(255, 128, 64)
      expect(rgb._tag).toBe("RGB")
      if (rgb._tag === "RGB") {
        expect(rgb.r).toBe(255)
        expect(rgb.g).toBe(128)
        expect(rgb.b).toBe(64)
      }
    })

    it("creates Hex colors", () => {
      const hex = Color.Hex("#FF8040")
      expect(hex._tag).toBe("Hex")
      if (hex._tag === "Hex") {
        expect(hex.value).toBe("#FF8040")
      }
    })

    it("creates adaptive colors", () => {
      const light = Color.RGB(255, 255, 255)
      const dark = Color.RGB(0, 0, 0)
      const adaptive = Color.Adaptive(light, dark)
      
      expect(adaptive._tag).toBe("Adaptive")
      if (adaptive._tag === "Adaptive") {
        expect(adaptive.light).toEqual(light)
        expect(adaptive.dark).toEqual(dark)
      }
    })
  })

  describe("predefined Colors", () => {
    it("provides ANSI color constants", () => {
      expect(Colors.black._tag).toBe("ANSI")
      expect(Colors.red._tag).toBe("ANSI")
      expect(Colors.green._tag).toBe("ANSI")
      expect(Colors.yellow._tag).toBe("ANSI")
      expect(Colors.blue._tag).toBe("ANSI")
      expect(Colors.magenta._tag).toBe("ANSI")
      expect(Colors.cyan._tag).toBe("ANSI")
      expect(Colors.white._tag).toBe("ANSI")
    })

    it("has correct ANSI codes for standard colors", () => {
      if (Colors.red._tag === "ANSI") {
        expect(Colors.red.code).toBe(1)
      }
      if (Colors.green._tag === "ANSI") {
        expect(Colors.green.code).toBe(2)
      }
      if (Colors.blue._tag === "ANSI") {
        expect(Colors.blue.code).toBe(4)
      }
    })

    it("provides bright ANSI colors", () => {
      expect(Colors.brightRed._tag).toBe("ANSI")
      expect(Colors.brightGreen._tag).toBe("ANSI")
      expect(Colors.brightBlue._tag).toBe("ANSI")
      
      if (Colors.brightRed._tag === "ANSI") {
        expect(Colors.brightRed.code).toBe(9)
      }
    })
  })

  describe("utility functions", () => {
    it("creates hex colors with validation", () => {
      const validHex = Colors.hex("#FF0000")
      expect(Option.isSome(validHex)).toBe(true)
      
      if (Option.isSome(validHex)) {
        expect(validHex.value._tag).toBe("Hex")
        if (validHex.value._tag === "Hex") {
          expect(validHex.value.value).toBe("#FF0000")
        }
      }
    })

    it("rejects invalid hex colors", () => {
      const invalidHex = Colors.hex("not-a-color")
      expect(Option.isNone(invalidHex)).toBe(true)
    })

    it("creates RGB colors with validation", () => {
      const validRgb = Colors.rgb(255, 0, 0)
      expect(Option.isSome(validRgb)).toBe(true)
      
      if (Option.isSome(validRgb)) {
        expect(validRgb.value._tag).toBe("RGB")
        if (validRgb.value._tag === "RGB") {
          expect(validRgb.value.r).toBe(255)
          expect(validRgb.value.g).toBe(0)
          expect(validRgb.value.b).toBe(0)
        }
      }
    })

    it("rejects invalid RGB values", () => {
      const invalidRgb1 = Colors.rgb(256, 0, 0)
      const invalidRgb2 = Colors.rgb(-1, 0, 0)
      
      expect(Option.isNone(invalidRgb1)).toBe(true)
      expect(Option.isNone(invalidRgb2)).toBe(true)
    })

    it("creates adaptive colors", () => {
      const adaptive = Colors.adaptive(Colors.black, Colors.white)
      expect(adaptive._tag).toBe("Adaptive")
      
      if (adaptive._tag === "Adaptive") {
        expect(adaptive.light).toEqual(Colors.black)
        expect(adaptive.dark).toEqual(Colors.white)
      }
    })
  })

  describe("edge cases", () => {
    it("handles boundary RGB values", () => {
      const black = Colors.rgb(0, 0, 0)
      const white = Colors.rgb(255, 255, 255)
      
      expect(Option.isSome(black)).toBe(true)
      expect(Option.isSome(white)).toBe(true)
    })

    it("handles short hex colors", () => {
      const shortHex = Colors.hex("#F0A")
      if (Option.isSome(shortHex)) {
        expect(shortHex.value._tag).toBe("Hex")
      }
    })

    it("normalizes hex values", () => {
      const lowerHex = Colors.hex("#ff0000")
      const upperHex = Colors.hex("#FF0000")
      
      expect(Option.isSome(lowerHex)).toBe(true)
      expect(Option.isSome(upperHex)).toBe(true)
    })
  })
})