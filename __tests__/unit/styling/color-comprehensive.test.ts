/**
 * Comprehensive Tests for Color System
 */

import { describe, it, expect } from "bun:test"
import { Option } from "effect"
import {
  Color,
  Colors,
  ColorProfile,
  toAnsiSequence,
  isVisible,
  blend,
  lighten,
  darken,
  gradient,
  rgb,
  hex,
  hsl
} from "@/styling/color"

describe("Color System", () => {
  describe("Color Constructors", () => {
    it("creates NoColor", () => {
      const color = Color.NoColor()
      expect(color._tag).toBe("NoColor")
    })
    
    it("creates ANSI color", () => {
      const color = Color.ANSI(31)
      expect(color._tag).toBe("ANSI")
      expect(color.code).toBe(31)
    })
    
    it("creates ANSI256 color", () => {
      const color = Color.ANSI256(214)
      expect(color._tag).toBe("ANSI256")
      expect(color.code).toBe(214)
    })
    
    it("creates Hex color", () => {
      const color = Color.Hex("#FF5733")
      expect(color._tag).toBe("Hex")
      expect(color.value).toBe("#FF5733")
    })
    
    it("creates RGB color", () => {
      const color = Color.RGB(255, 87, 51)
      expect(color._tag).toBe("RGB")
      expect(color.r).toBe(255)
      expect(color.g).toBe(87)
      expect(color.b).toBe(51)
    })
    
    it("creates Adaptive color", () => {
      const light = Color.Hex("#FFFFFF")
      const dark = Color.Hex("#000000")
      const color = Color.Adaptive(light, dark)
      expect(color._tag).toBe("Adaptive")
      expect(color.light).toBe(light)
      expect(color.dark).toBe(dark)
    })
  })
  
  describe("Color Smart Constructors", () => {
    it("creates hex colors with validation", () => {
      const valid = Colors.hex("#FF5733")
      expect(Option.isSome(valid)).toBe(true)
      if (Option.isSome(valid)) {
        expect(valid.value._tag).toBe("Hex")
        expect(valid.value.value).toBe("#FF5733")
      }
      
      const withoutHash = Colors.hex("FF5733")
      expect(Option.isSome(withoutHash)).toBe(true)
      
      const invalid = Colors.hex("not-a-hex")
      expect(Option.isNone(invalid)).toBe(true)
    })
    
    it("creates RGB colors with validation", () => {
      const valid = Colors.rgb(255, 128, 0)
      expect(Option.isSome(valid)).toBe(true)
      
      const invalid1 = Colors.rgb(256, 128, 0)
      expect(Option.isNone(invalid1)).toBe(true)
      
      const invalid2 = Colors.rgb(-1, 128, 0)
      expect(Option.isNone(invalid2)).toBe(true)
    })
    
    it("creates ANSI colors with validation", () => {
      const valid = Colors.ansi(7)
      expect(Option.isSome(valid)).toBe(true)
      
      const invalid = Colors.ansi(16)
      expect(Option.isNone(invalid)).toBe(true)
    })
    
    it("creates ANSI256 colors with validation", () => {
      const valid = Colors.ansi256(214)
      expect(Option.isSome(valid)).toBe(true)
      
      const invalid = Colors.ansi256(256)
      expect(Option.isNone(invalid)).toBe(true)
    })
    
    it("creates adaptive colors", () => {
      const adaptive = Colors.adaptive(Colors.white, Colors.black)
      expect(adaptive._tag).toBe("Adaptive")
      expect(adaptive.light).toEqual(Colors.white)
      expect(adaptive.dark).toEqual(Colors.black)
    })
  })
  
  describe("Standard Colors", () => {
    it("provides ANSI colors", () => {
      expect(Colors.black._tag).toBe("ANSI")
      expect(Colors.black.code).toBe(0)
      expect(Colors.red.code).toBe(1)
      expect(Colors.green.code).toBe(2)
      expect(Colors.yellow.code).toBe(3)
      expect(Colors.blue.code).toBe(4)
      expect(Colors.magenta.code).toBe(5)
      expect(Colors.cyan.code).toBe(6)
      expect(Colors.white.code).toBe(7)
    })
    
    it("provides bright ANSI colors", () => {
      expect(Colors.brightBlack.code).toBe(8)
      expect(Colors.brightRed.code).toBe(9)
      expect(Colors.brightGreen.code).toBe(10)
      expect(Colors.brightYellow.code).toBe(11)
      expect(Colors.brightBlue.code).toBe(12)
      expect(Colors.brightMagenta.code).toBe(13)
      expect(Colors.brightCyan.code).toBe(14)
      expect(Colors.brightWhite.code).toBe(15)
    })
    
    it("provides none color", () => {
      const none = Colors.none()
      expect(none._tag).toBe("NoColor")
    })
    
    it("provides common RGB colors", () => {
      expect(Colors.orange._tag).toBe("RGB")
      expect(Colors.orange.r).toBe(255)
      expect(Colors.orange.g).toBe(140)
      expect(Colors.orange.b).toBe(0)
      
      expect(Colors.deepOrange._tag).toBe("RGB")
      expect(Colors.lightOrange._tag).toBe("RGB")
    })
    
    it("provides color aliases", () => {
      expect(Colors.gray).toEqual(Colors.brightBlack)
      expect(Colors.grey).toEqual(Colors.gray)
    })
  })
  
  describe("toAnsiSequence", () => {
    it("converts NoColor to empty string", () => {
      const result = toAnsiSequence(Color.NoColor(), ColorProfile.TrueColor, false)
      expect(result).toBe("")
    })
    
    it("converts ANSI color for foreground", () => {
      const result = toAnsiSequence(Color.ANSI(1), ColorProfile.ANSI, false)
      expect(result).toBe("\x1b[31m")
    })
    
    it("converts ANSI color for background", () => {
      const result = toAnsiSequence(Color.ANSI(1), ColorProfile.ANSI, true)
      expect(result).toBe("\x1b[41m")
    })
    
    it("converts ANSI256 color", () => {
      const result = toAnsiSequence(Color.ANSI256(214), ColorProfile.ANSI256, false)
      expect(result).toBe("\x1b[38;5;214m")
    })
    
    it("converts ANSI256 color for background", () => {
      const result = toAnsiSequence(Color.ANSI256(214), ColorProfile.ANSI256, true)
      expect(result).toBe("\x1b[48;5;214m")
    })
    
    it("converts RGB color in TrueColor mode", () => {
      const result = toAnsiSequence(Color.RGB(255, 87, 51), ColorProfile.TrueColor, false)
      expect(result).toBe("\x1b[38;2;255;87;51m")
    })
    
    it("converts RGB color for background in TrueColor mode", () => {
      const result = toAnsiSequence(Color.RGB(255, 87, 51), ColorProfile.TrueColor, true)
      expect(result).toBe("\x1b[48;2;255;87;51m")
    })
    
    it("converts Hex color", () => {
      const result = toAnsiSequence(Color.Hex("#FF5733"), ColorProfile.TrueColor, false)
      expect(result).toBe("\x1b[38;2;255;87;51m")
    })
    
    it("handles NoColor profile", () => {
      const result = toAnsiSequence(Color.RGB(255, 0, 0), ColorProfile.NoColor, false)
      expect(result).toBe("")
    })
    
    it("degrades RGB to ANSI256", () => {
      const result = toAnsiSequence(Color.RGB(255, 87, 51), ColorProfile.ANSI256, false)
      // Should convert to nearest ANSI256 color
      expect(result).toMatch(/\x1b\[38;5;\d+m/)
    })
    
    it("degrades RGB to ANSI", () => {
      const result = toAnsiSequence(Color.RGB(255, 0, 0), ColorProfile.ANSI, false)
      expect(result).toBe("\x1b[91m") // Bright red (RGB colors map to bright variants)
    })
    
    it("handles bright ANSI colors", () => {
      const result = toAnsiSequence(Color.ANSI(9), ColorProfile.ANSI, false)
      expect(result).toBe("\x1b[91m") // Bright red
    })
    
    it("degrades ANSI256 to ANSI", () => {
      const result = toAnsiSequence(Color.ANSI256(9), ColorProfile.ANSI, false)
      expect(result).toBe("\x1b[91m") // Bright red
    })
    
  })
  
  describe("Color utility functions", () => {
    describe("isVisible", () => {
      it("returns false for NoColor", () => {
        expect(isVisible(Color.NoColor())).toBe(false)
      })
      
      it("returns true for visible colors", () => {
        expect(isVisible(Color.ANSI(31))).toBe(true)
        expect(isVisible(Color.ANSI256(214))).toBe(true)
        expect(isVisible(Color.RGB(255, 0, 0))).toBe(true)
        expect(isVisible(Color.Hex("#FF0000"))).toBe(true)
        expect(isVisible(Color.Adaptive(Color.RGB(0, 0, 0), Color.RGB(255, 255, 255)))).toBe(true)
      })
    })
    
    describe("blend", () => {
      it("blends two RGB colors", () => {
        const red = Color.RGB(255, 0, 0)
        const blue = Color.RGB(0, 0, 255)
        const result = blend(red, blue, 0.5)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBe(128) // (255 + 0) / 2
          expect(result.g).toBe(0)
          expect(result.b).toBe(128) // (0 + 255) / 2
        }
      })
      
      it("handles alpha of 0", () => {
        const red = Color.RGB(255, 0, 0)
        const blue = Color.RGB(0, 0, 255)
        const result = blend(red, blue, 0)
        
        expect(result).toEqual(blue) // alpha 0 means 100% background
      })
      
      it("handles alpha of 1", () => {
        const red = Color.RGB(255, 0, 0)
        const blue = Color.RGB(0, 0, 255)
        const result = blend(red, blue, 1)
        
        expect(result).toEqual(red) // alpha 1 means 100% foreground
      })
      
      it("returns NoColor when blending with NoColor", () => {
        const red = Color.RGB(255, 0, 0)
        const result = blend(red, Color.NoColor(), 0.5)
        
        expect(result._tag).toBe("NoColor")
      })
      
      it("blends non-RGB colors", () => {
        const result = blend(Color.Hex("#FF0000"), Color.Hex("#0000FF"), 0.5)
        
        // For non-RGB colors, returns bg if alpha <= 0.5, else fg
        expect(result).toEqual(Color.Hex("#0000FF"))
        
        const result2 = blend(Color.Hex("#FF0000"), Color.Hex("#0000FF"), 0.6)
        expect(result2).toEqual(Color.Hex("#FF0000"))
      })
    })
    
    describe("lighten", () => {
      it("lightens RGB color", () => {
        const color = Color.RGB(100, 100, 100)
        const result = lighten(color, 0.2)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBeGreaterThan(100)
          expect(result.g).toBeGreaterThan(100)
          expect(result.b).toBeGreaterThan(100)
        }
      })
      
      it("doesn't exceed 255", () => {
        const color = Color.RGB(250, 250, 250)
        const result = lighten(color, 0.5)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBe(255)
          expect(result.g).toBe(255)
          expect(result.b).toBe(255)
        }
      })
      
      it("returns NoColor for NoColor", () => {
        const result = lighten(Color.NoColor(), 0.5)
        expect(result._tag).toBe("NoColor")
      })
    })
    
    describe("darken", () => {
      it("darkens RGB color", () => {
        const color = Color.RGB(200, 200, 200)
        const result = darken(color, 0.2)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBeLessThan(200)
          expect(result.g).toBeLessThan(200)
          expect(result.b).toBeLessThan(200)
        }
      })
      
      it("doesn't go below 0", () => {
        const color = Color.RGB(10, 10, 10)
        const result = darken(color, 0.9)
        
        expect(result._tag).toBe("RGB")
        if (result._tag === "RGB") {
          expect(result.r).toBeGreaterThanOrEqual(0)
          expect(result.g).toBeGreaterThanOrEqual(0)
          expect(result.b).toBeGreaterThanOrEqual(0)
        }
      })
    })
    
    describe("gradient", () => {
      it("creates gradient between two colors", () => {
        const start = Color.RGB(255, 0, 0)
        const end = Color.RGB(0, 0, 255)
        const result = gradient(start, end, 5)
        
        expect(result).toHaveLength(5)
        expect(result[0]).toEqual(start)
        expect(result[4]).toEqual(end)
        
        // Check middle color
        const middle = result[2]
        expect(middle._tag).toBe("RGB")
        if (middle._tag === "RGB") {
          expect(middle.r).toBeCloseTo(128, 0)
          expect(middle.b).toBeCloseTo(128, 0)
        }
      })
      
      it("handles single step", () => {
        const start = Color.RGB(255, 0, 0)
        const end = Color.RGB(0, 0, 255)
        const result = gradient(start, end, 1)
        
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(start)
      })
      
      it("handles NoColor", () => {
        const result = gradient(Color.NoColor(), Color.RGB(255, 0, 0), 3)
        
        expect(result).toHaveLength(3)
        expect(result[0]._tag).toBe("NoColor")
        expect(result[1]._tag).toBe("NoColor")
        expect(result[2]._tag).toBe("NoColor")
      })
    })
  })
  
  describe("Helper functions", () => {
    it("rgb creates formatted string", () => {
      expect(rgb(255, 87, 51)).toBe("rgb(255, 87, 51)")
    })
    
    it("hex ensures hash prefix", () => {
      expect(hex("FF5733")).toBe("#FF5733")
      expect(hex("#FF5733")).toBe("#FF5733")
    })
    
    it("hsl creates formatted string", () => {
      expect(hsl(180, 50, 50)).toBe("hsl(180, 50%, 50%)")
    })
  })
  
  describe("ColorProfile enum", () => {
    it("has all profile values", () => {
      expect(ColorProfile.NoColor).toBe(0)
      expect(ColorProfile.ANSI).toBe(1)
      expect(ColorProfile.ANSI256).toBe(2)
      expect(ColorProfile.TrueColor).toBe(3)
    })
  })
})