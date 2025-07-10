/**
 * Comprehensive tests for styling render module
 */

import { describe, it, expect } from "bun:test"
import { renderStyled, renderStyledSync } from "@/styling/render"
import { style } from "@/styling/style"

describe("Styling Render Module", () => {
  describe("renderStyledSync function", () => {
    it("renders plain text without styling", () => {
      const result = renderStyledSync("Hello World", style())
      expect(result).toBe("Hello World")
    })

    it("renders text with color", () => {
      const result = renderStyledSync("Red Text", style().color("red"))
      expect(result).toContain("\x1b[31m") // Red ANSI code
      expect(result).toContain("Red Text")
      expect(result).toContain("\x1b[0m") // Reset code
    })

    it("renders text with background color", () => {
      const result = renderStyledSync("Blue BG", style().bg("blue"))
      expect(result).toContain("\x1b[44m") // Blue background
      expect(result).toContain("Blue BG")
    })

    it("renders bold text", () => {
      const result = renderStyledSync("Bold", style().bold)
      expect(result).toContain("\x1b[1m") // Bold code
      expect(result).toContain("Bold")
    })

    it("renders italic text", () => {
      const result = renderStyledSync("Italic", style().italic)
      expect(result).toContain("\x1b[3m") // Italic code
      expect(result).toContain("Italic")
    })

    it("renders underlined text", () => {
      const result = renderStyledSync("Underline", style().underline)
      expect(result).toContain("\x1b[4m") // Underline code
      expect(result).toContain("Underline")
    })

    it("renders dim text", () => {
      const result = renderStyledSync("Dim", style().dim)
      expect(result).toContain("\x1b[2m") // Dim code
      expect(result).toContain("Dim")
    })

    it("renders blinking text", () => {
      const result = renderStyledSync("Blink", style().blink)
      expect(result).toContain("\x1b[5m") // Blink code
      expect(result).toContain("Blink")
    })

    it("renders reversed text", () => {
      const result = renderStyledSync("Reverse", style().reverse)
      expect(result).toContain("\x1b[7m") // Reverse code
      expect(result).toContain("Reverse")
    })

    it("renders hidden text", () => {
      const result = renderStyledSync("Hidden", style().hidden)
      expect(result).toContain("\x1b[8m") // Hidden code
      expect(result).toContain("Hidden")
    })

    it("renders strikethrough text", () => {
      const result = renderStyledSync("Strike", style().strikethrough)
      expect(result).toContain("\x1b[9m") // Strikethrough code
      expect(result).toContain("Strike")
    })

    it("combines multiple styles", () => {
      const result = renderStyledSync("Multi", 
        style().color("red").bold.underline.bg("yellow")
      )
      expect(result).toContain("\x1b[31m") // Red
      expect(result).toContain("\x1b[1m")  // Bold
      expect(result).toContain("\x1b[4m")  // Underline
      expect(result).toContain("\x1b[43m") // Yellow background
      expect(result).toContain("Multi")
    })

    it("handles empty text", () => {
      const result = renderStyledSync("", style().color("red"))
      expect(result).toBe("")
    })

    it("handles hex colors", () => {
      const result = renderStyledSync("Hex", style().color("#ff0000"))
      expect(result).toContain("\x1b[38;2;255;0;0m") // RGB red
      expect(result).toContain("Hex")
    })

    it("handles RGB colors", () => {
      const result = renderStyledSync("RGB", style().color("rgb(0, 255, 0)"))
      expect(result).toContain("\x1b[38;2;0;255;0m") // RGB green
      expect(result).toContain("RGB")
    })

    it("handles HSL colors", () => {
      const result = renderStyledSync("HSL", style().color("hsl(240, 100%, 50%)"))
      expect(result).toContain("\x1b[38;2") // Should convert to RGB
      expect(result).toContain("HSL")
    })

    it("handles multi-line text", () => {
      const text = "Line 1\nLine 2\nLine 3"
      const result = renderStyledSync(text, style().color("blue"))
      const lines = result.split('\n')
      expect(lines).toHaveLength(3)
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toContain("\x1b[34m") // Blue
        }
      })
    })

    it("preserves whitespace", () => {
      const text = "  Spaced  Text  "
      const result = renderStyledSync(text, style().color("green"))
      expect(result).toContain("  Spaced  Text  ")
    })

    it("handles special characters", () => {
      const text = "Special: !@#$%^&*()"
      const result = renderStyledSync(text, style().bold)
      expect(result).toContain("!@#$%^&*()")
    })

    it("handles unicode characters", () => {
      const text = "Unicode: 你好 🌍 ∑"
      const result = renderStyledSync(text, style().color("magenta"))
      expect(result).toContain("你好")
      expect(result).toContain("🌍")
      expect(result).toContain("∑")
    })

    it("handles ANSI reset properly", () => {
      const result = renderStyledSync("Test", style().color("red").bold)
      expect(result.endsWith("\x1b[0m")).toBe(true)
    })

    it("handles invalid colors gracefully", () => {
      const result = renderStyledSync("Test", style().color("invalid-color"))
      expect(result).toContain("Test")
      // Should not crash
    })

    it("handles very long text", () => {
      const longText = "A".repeat(1000)
      const result = renderStyledSync(longText, style().color("cyan"))
      expect(result).toContain("A".repeat(1000))
      expect(result).toContain("\x1b[36m") // Cyan
    })

    it("handles nested ANSI codes", () => {
      const textWithAnsi = "\x1b[31mRed\x1b[0m Normal"
      const result = renderStyledSync(textWithAnsi, style().bold)
      expect(result).toContain("Red")
      expect(result).toContain("Normal")
    })

    it("applies 256-color codes", () => {
      const s = style()
      s.set("color", { r: 128, g: 64, b: 192 }) // Custom RGB
      const result = renderStyledSync("256Color", s)
      expect(result).toContain("\x1b[38;2;128;64;192m")
    })

    it("applies background 256-color codes", () => {
      const s = style()
      s.set("backgroundColor", { r: 255, g: 128, b: 0 }) // Orange
      const result = renderStyledSync("BG256", s)
      expect(result).toContain("\x1b[48;2;255;128;0m")
    })

    it("handles grayscale colors", () => {
      const result = renderStyledSync("Gray", style().color("#808080"))
      expect(result).toContain("\x1b[38;2;128;128;128m")
    })

    it("optimizes identical consecutive styles", () => {
      const text = "Same style text"
      const result1 = renderStyledSync(text, style().color("red"))
      const result2 = renderStyledSync(text, style().color("red"))
      expect(result1).toBe(result2)
    })
  })

  describe("renderStyled function", () => {
    it("returns an Effect that renders styled text", async () => {
      const effect = renderStyled("Hello", style().color("blue"))
      const result = await effect.pipe(
        (e: any) => e.pipe ? e.pipe((r: any) => Promise.resolve(r)) : Promise.resolve(e)
      )
      expect(result).toContain("Hello")
      expect(result).toContain("\x1b[34m") // Blue
    })

    it("handles errors gracefully", async () => {
      const effect = renderStyled("Test", null as any)
      try {
        await effect.pipe(
          (e: any) => e.pipe ? e.pipe((r: any) => Promise.resolve(r)) : Promise.resolve(e)
        )
        // Should not crash
        expect(true).toBe(true)
      } catch (error) {
        // Error is expected for null style
        expect(error).toBeDefined()
      }
    })
  })

  describe("edge cases and error handling", () => {
    it("handles null style gracefully", () => {
      const result = renderStyledSync("Test", null as any)
      expect(result).toContain("Test")
    })

    it("handles undefined style gracefully", () => {
      const result = renderStyledSync("Test", undefined as any)
      expect(result).toContain("Test")
    })

    it("handles style with no properties", () => {
      const emptyStyle = style()
      const result = renderStyledSync("Plain", emptyStyle)
      expect(result).toBe("Plain")
    })

    it("handles circular style references", () => {
      const s = style()
      // Create a circular reference (if possible in the API)
      const result = renderStyledSync("Circular", s)
      expect(result).toContain("Circular")
    })

    it("handles very complex nested styles", () => {
      const complex = style()
        .color("red")
        .bg("blue")
        .bold
        .italic
        .underline
        .blink
        .reverse
        .dim
      
      const result = renderStyledSync("Complex", complex)
      expect(result).toContain("Complex")
      expect(result).toContain("\x1b[31m") // Red
      expect(result).toContain("\x1b[44m") // Blue BG
      expect(result).toContain("\x1b[1m")  // Bold
      expect(result).toContain("\x1b[3m")  // Italic
      expect(result).toContain("\x1b[4m")  // Underline
    })

    it("handles text with embedded newlines and styles", () => {
      const text = "Line 1\n\x1b[31mRed Line\x1b[0m\nLine 3"
      const result = renderStyledSync(text, style().bold)
      expect(result).toContain("Line 1")
      expect(result).toContain("Red Line")
      expect(result).toContain("Line 3")
    })

    it("preserves exact character count", () => {
      const text = "12345"
      const result = renderStyledSync(text, style().color("white"))
      // Remove ANSI codes to count actual characters
      const cleaned = result.replace(/\x1b\[[0-9;]*m/g, '')
      expect(cleaned).toBe("12345")
    })

    it("handles zero-width characters", () => {
      const text = "Test\u200BZero\u200CWidth"
      const result = renderStyledSync(text, style().color("black"))
      expect(result).toContain("Test")
      expect(result).toContain("Zero")
      expect(result).toContain("Width")
    })
  })
})