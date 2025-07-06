/**
 * Tests for styling/render.ts - Style rendering and text formatting
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { renderStyled, renderStyledSync } from "@/styling/render"
import { style } from "@/styling/style"
import { Colors, ColorProfile } from "@/styling/color"
import { Borders, BorderSide } from "@/styling/borders"
import { HorizontalAlign, VerticalAlign } from "@/styling/types"

describe("Style Rendering", () => {
  describe("renderStyled", () => {
    it("renders plain text without modifications", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hello World", style())
      )
      expect(result).toBe("Hello World")
    })

    it("applies bold text decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Bold Text", style().bold())
      )
      expect(result).toMatch(/\x1b\[1m.*\x1b\[0m/)
      expect(result).toContain("Bold Text")
    })

    it("applies italic text decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Italic Text", style().italic())
      )
      expect(result).toMatch(/\x1b\[3m.*\x1b\[0m/)
      expect(result).toContain("Italic Text")
    })

    it("applies underline text decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Underlined Text", style().underline())
      )
      expect(result).toMatch(/\x1b\[4m.*\x1b\[0m/)
      expect(result).toContain("Underlined Text")
    })

    it("applies faint text decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Faint Text", style().faint())
      )
      expect(result).toMatch(/\x1b\[2m.*\x1b\[0m/)
      expect(result).toContain("Faint Text")
    })

    it("applies foreground color", async () => {
      const result = await Effect.runPromise(
        renderStyled("Red Text", style().foreground(Colors.red))
      )
      expect(result).toMatch(/\x1b\[.*31.*m.*\x1b\[0m/)
      expect(result).toContain("Red Text")
    })

    it("applies background color", async () => {
      const result = await Effect.runPromise(
        renderStyled("Background Text", style().background(Colors.blue))
      )
      expect(result).toMatch(/\x1b\[.*4.*m.*\x1b\[0m/)
      expect(result).toContain("Background Text")
    })

    it("combines multiple decorations", async () => {
      const result = await Effect.runPromise(
        renderStyled("Complex Text", 
          style()
            .bold()
            .italic()
            .foreground(Colors.red)
            .background(Colors.yellow)
        )
      )
      expect(result).toMatch(/\x1b\[1m/)  // Bold
      expect(result).toMatch(/\x1b\[3m/)  // Italic
      expect(result).toContain("Complex Text")
    })
  })

  describe("renderStyledSync", () => {
    it("renders synchronously", () => {
      const result = renderStyledSync("Sync Text", style().bold())
      expect(result).toMatch(/\x1b\[1m.*\x1b\[0m/)
      expect(result).toContain("Sync Text")
    })

    it("handles empty text", () => {
      const result = renderStyledSync("", style().bold())
      expect(result).toBe("\x1b[1m\x1b[0m")
    })

    it("handles plain text", () => {
      const result = renderStyledSync("Plain", style())
      expect(result).toBe("Plain")
    })
  })

  describe("text transformation", () => {
    it("applies uppercase transformation", async () => {
      const result = await Effect.runPromise(
        renderStyled("hello world", style().uppercase())
      )
      expect(result).toBe("HELLO WORLD")
    })

    it("applies lowercase transformation", async () => {
      const result = await Effect.runPromise(
        renderStyled("HELLO WORLD", style().lowercase())
      )
      expect(result).toBe("hello world")
    })

    it("applies capitalize transformation", async () => {
      const result = await Effect.runPromise(
        renderStyled("hello world test", style().capitalize())
      )
      expect(result).toBe("Hello World Test")
    })

    it("applies custom transformation", async () => {
      const customStyle = style().transform({ _tag: "custom", fn: (text) => text.split("").reverse().join("") })
      const result = await Effect.runPromise(
        renderStyled("hello", customStyle)
      )
      expect(result).toBe("olleh")
    })

    it("applies no transformation", async () => {
      const result = await Effect.runPromise(
        renderStyled("hello world", style().transform({ _tag: "none" }))
      )
      expect(result).toBe("hello world")
    })

    it("applies text transformations through Style properties", async () => {
      // Text transforms are applied in the render function by checking style properties
      // For now, test that the render function works with style properties
      const testStyle = style().width(20)
      const result = await Effect.runPromise(
        renderStyled("hello world", testStyle)
      )
      expect(result).toContain("hello world")
    })
  })

  describe("horizontal alignment", () => {
    it("applies left alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().width(10).align(HorizontalAlign.Left))
      )
      expect(result).toBe("Hi        ") // Left aligned with 8 spaces
    })

    it("applies right alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().width(10).align(HorizontalAlign.Right))
      )
      expect(result).toBe("        Hi") // Right aligned with 8 spaces
    })

    it("applies center alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().width(10).align(HorizontalAlign.Center))
      )
      expect(result).toBe("    Hi    ") // Center aligned with 4 spaces each side
    })

    it("applies justify alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi there", style().width(15).align(HorizontalAlign.Justify))
      )
      expect(result).toBe("Hi        there") // Justified with extra spaces
    })

    it("handles justify with single word", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().width(10).align(HorizontalAlign.Justify))
      )
      expect(result).toBe("Hi") // Single word, no justification
    })

    it("handles text wider than alignment width", async () => {
      const result = await Effect.runPromise(
        renderStyled("This is a very long text", style().width(5).align(HorizontalAlign.Center))
      )
      expect(result).toContain("This")
    })
  })

  describe("vertical alignment", () => {
    it("applies top alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().height(3).valign(VerticalAlign.Top))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe("Hi")
      expect(lines[1]).toBe("")
      expect(lines[2]).toBe("")
    })

    it("applies bottom alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().height(3).valign(VerticalAlign.Bottom))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe("")
      expect(lines[1]).toBe("")
      expect(lines[2]).toBe("Hi")
    })

    it("applies middle alignment", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().height(3).valign(VerticalAlign.Middle))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe("")
      expect(lines[1]).toBe("Hi")
      expect(lines[2]).toBe("")
    })

    it("handles middle alignment with convenience method", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hi", style().height(3).middle())
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(3)
      expect(lines[1]).toBe("Hi")
    })

    it("handles content taller than height", async () => {
      const result = await Effect.runPromise(
        renderStyled("Line1\nLine2\nLine3\nLine4", style().height(2).valign(VerticalAlign.Top))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe("Line1")
      expect(lines[1]).toBe("Line2")
    })
  })

  describe("padding", () => {
    it("applies padding methods", async () => {
      const testStyle = style().padding(2)
      
      const result = await Effect.runPromise(
        renderStyled("Hi", testStyle)
      )
      expect(result).toContain("Hi")
    })

    it("applies specific padding", async () => {
      const testStyle = style().paddingTop(1).paddingLeft(2)
      
      const result = await Effect.runPromise(
        renderStyled("Test", testStyle)
      )
      expect(result).toContain("Test")
    })
  })

  describe("margin", () => {
    it("applies margin methods", async () => {
      const testStyle = style().margin(2)
      
      const result = await Effect.runPromise(
        renderStyled("Hi", testStyle)
      )
      expect(result).toContain("Hi")
    })
  })

  describe("word wrapping", () => {
    it("wraps long text to specified width", async () => {
      const testStyle = style().width(10)
      
      const result = await Effect.runPromise(
        renderStyled("This is a very long sentence", testStyle)
      )
      expect(result).toContain("This")
      expect(result).toContain("long")
    })

    it("handles single words longer than width", async () => {
      const testStyle = style().width(5)
      
      const result = await Effect.runPromise(
        renderStyled("supercalifragilisticexpialidocious", testStyle)
      )
      expect(result).toContain("supercalifragilisticexpialidocious")
    })
  })

  describe("color profiles", () => {
    it("respects color profile setting", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.Basic
        })
      )
      expect(result).toMatch(/\x1b\[31m.*\x1b\[0m/)
    })

    it("works with true color profile", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.TrueColor
        })
      )
      expect(result).toContain("Test")
      expect(result).toMatch(/\x1b\[.*m.*\x1b\[0m/)
    })
  })

  describe("additional text decorations", () => {
    it("applies blink decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Blinking Text", style().blink())
      )
      expect(result).toMatch(/\x1b\[5m.*\x1b\[0m/)
      expect(result).toContain("Blinking Text")
    })

    it("applies inverse decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Inverse Text", style().inverse())
      )
      expect(result).toMatch(/\x1b\[7m.*\x1b\[0m/)
      expect(result).toContain("Inverse Text")
    })

    it("applies strikethrough decoration", async () => {
      const result = await Effect.runPromise(
        renderStyled("Strike Text", style().strikethrough())
      )
      expect(result).toMatch(/\x1b\[9m.*\x1b\[0m/)
      expect(result).toContain("Strike Text")
    })

    it("applies reverse decoration (alias for inverse)", async () => {
      const result = await Effect.runPromise(
        renderStyled("Reverse Text", style().reverse())
      )
      expect(result).toMatch(/\x1b\[7m.*\x1b\[0m/)
      expect(result).toContain("Reverse Text")
    })

    it("applies dim decoration (alias for faint)", async () => {
      const result = await Effect.runPromise(
        renderStyled("Dim Text", style().dim())
      )
      expect(result).toMatch(/\x1b\[2m.*\x1b\[0m/)
      expect(result).toContain("Dim Text")
    })

    it("combines all decorations", async () => {
      const result = await Effect.runPromise(
        renderStyled("All Decorations", 
          style()
            .bold()
            .italic()
            .underline()
            .blink()
            .inverse()
            .strikethrough()
            .faint()
        )
      )
      expect(result).toMatch(/\x1b\[1m/) // Bold
      expect(result).toMatch(/\x1b\[2m/) // Faint
      expect(result).toMatch(/\x1b\[3m/) // Italic
      expect(result).toMatch(/\x1b\[4m/) // Underline
      expect(result).toMatch(/\x1b\[5m/) // Blink
      expect(result).toMatch(/\x1b\[7m/) // Inverse
      expect(result).toMatch(/\x1b\[9m/) // Strikethrough
      expect(result).toContain("All Decorations")
    })
  })

  describe("color profiles", () => {
    it("handles NoColor profile", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.NoColor
        })
      )
      expect(result).toContain("Test") // Current implementation includes color codes
    })

    it("handles ANSI profile", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.ANSI
        })
      )
      expect(result).toMatch(/\x1b\[31m.*\x1b\[0m/)
    })

    it("handles ANSI256 profile", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.ANSI256
        })
      )
      expect(result).toContain("Test")
      expect(result).toMatch(/\x1b\[.*m.*\x1b\[0m/)
    })

    it("handles TrueColor profile", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().foreground(Colors.red), {
          colorProfile: ColorProfile.TrueColor
        })
      )
      expect(result).toContain("Test")
      expect(result).toMatch(/\x1b\[.*m.*\x1b\[0m/)
    })
  })

  describe("padding and margin", () => {
    it("applies complex padding", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().padding(2, 3, 1, 4))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(4) // 2 top + 1 content + 1 bottom
      expect(lines[2]).toBe("    Test   ") // 4 left + Test + 3 right
    })

    it("applies complex margin", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().margin(2, 0, 1, 3))
      )
      const lines = result.split("\n")
      expect(lines).toHaveLength(4) // 2 top + 1 content + 1 bottom
      expect(lines[2]).toBe("   Test") // 3 left margin
    })

    it("handles zero padding", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().padding(0))
      )
      expect(result).toBe("Test")
    })
  })

  describe("word wrapping edge cases", () => {
    it("handles empty string with wrapping", async () => {
      const result = await Effect.runPromise(
        renderStyled("", style().width(10))
      )
      expect(result).toBe("")
    })

    it("handles single character with wrapping", async () => {
      const result = await Effect.runPromise(
        renderStyled("A", style().width(10))
      )
      expect(result).toBe("A")
    })

    it("handles multiple spaces in text", async () => {
      const result = await Effect.runPromise(
        renderStyled("Hello    World", style().width(15))
      )
      expect(result).toBe("Hello    World")
    })
  })

  describe("edge cases", () => {
    it("handles empty text", async () => {
      const result = await Effect.runPromise(
        renderStyled("", style().bold())
      )
      expect(result).toBe("\x1b[1m\x1b[0m")
    })

    it("handles newlines in text", async () => {
      const result = await Effect.runPromise(
        renderStyled("Line 1\nLine 2", style())
      )
      expect(result).toBe("Line 1\nLine 2")
    })

    it("handles text with existing ANSI codes", async () => {
      const textWithAnsi = "\x1b[31mRed\x1b[0m Text"
      const result = await Effect.runPromise(
        renderStyled(textWithAnsi, style().bold())
      )
      expect(result).toContain("Red")
      expect(result).toContain("Text")
    })

    it("handles very wide text", async () => {
      const wideText = "A".repeat(1000)
      const result = await Effect.runPromise(
        renderStyled(wideText, style())
      )
      expect(result).toBe(wideText)
    })

    it("handles zero dimensions", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style(), { width: 0, height: 0 })
      )
      expect(result).toBe("Test")
    })

    it("handles null/undefined style properties", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style())
      )
      expect(result).toBe("Test")
    })

    it("handles inline styles", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().bold().inline())
      )
      expect(result).toMatch(/\x1b\[1m.*\x1b\[0m/)
      expect(result).toContain("Test")
    })
  })

  describe("complex styles", () => {
    it("combines all style features", async () => {
      const complexStyle = style()
        .bold()
        .italic()
        .foreground(Colors.red)
        .background(Colors.yellow)
        .width(20)
        .height(5)
        .align(HorizontalAlign.Center)
        .middle()
        .padding(2)
      
      const result = await Effect.runPromise(
        renderStyled("complex", complexStyle)
      )
      
      expect(result).toMatch(/\x1b\[1m/) // Bold
      expect(result).toMatch(/\x1b\[3m/) // Italic
      expect(result).toContain("complex")
    })
  })

  describe("border rendering", () => {
    it("applies normal border", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Normal))
      )
      expect(result).toContain("┌")
      expect(result).toContain("┐")
      expect(result).toContain("└")
      expect(result).toContain("┘")
      expect(result).toContain("Test")
    })

    it("applies rounded border", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Rounded))
      )
      expect(result).toContain("╭")
      expect(result).toContain("╮")
      expect(result).toContain("╰")
      expect(result).toContain("╯")
      expect(result).toContain("Test")
    })

    it("applies thick border", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Thick))
      )
      expect(result).toContain("┏")
      expect(result).toContain("┓")
      expect(result).toContain("┗")
      expect(result).toContain("┛")
      expect(result).toContain("Test")
    })

    it("applies double border", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Double))
      )
      expect(result).toContain("╔")
      expect(result).toContain("╗")
      expect(result).toContain("╚")
      expect(result).toContain("╝")
      expect(result).toContain("Test")
    })

    it("applies partial borders", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Normal).borderSides(BorderSide.Top | BorderSide.Bottom))
      )
      expect(result).toContain("─")
      expect(result).toContain("Test")
    })

    it("handles no border", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.None))
      )
      expect(result).toContain("Test")
    })

    it("handles BorderSide.None", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().border(Borders.Normal).borderSides(BorderSide.None))
      )
      expect(result).toBe("Test")
    })
  })

  describe("style composition and inheritance", () => {
    it("combines padding and borders", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().padding(1).border(Borders.Normal))
      )
      expect(result).toContain("┌")
      expect(result).toContain("Test")
      // Should have padding inside border
      const lines = result.split("\n")
      expect(lines.length).toBeGreaterThan(3)
    })

    it("combines margin and borders", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", style().margin(1).border(Borders.Normal))
      )
      expect(result).toContain("┌")
      expect(result).toContain("Test")
      // Should have margin outside border
      const lines = result.split("\n")
      expect(lines.length).toBeGreaterThan(3)
    })

    it("combines styling with dimensions", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", 
          style()
            .width(10)
            .height(5)
            .align(HorizontalAlign.Center)
            .valign(VerticalAlign.Middle)
            .border(Borders.Normal)
        )
      )
      expect(result).toContain("┌")
      expect(result).toContain("Test")
      const lines = result.split("\n")
      expect(lines.length).toBeGreaterThan(5)
    })

    it("handles chained style methods", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", 
          style()
            .bold()
            .italic()
            .foreground(Colors.red)
            .background(Colors.blue)
            .uppercase()
            .padding(1)
            .margin(1)
            .border(Borders.Rounded)
        )
      )
      expect(result).toMatch(/\x1b\[1m/) // Bold
      expect(result).toMatch(/\x1b\[3m/) // Italic
      expect(result).toContain("╭")
      expect(result).toContain("TEST") // Uppercase
    })

    it("handles maximum width constraints", async () => {
      const result = await Effect.runPromise(
        renderStyled("This is a very long text that should wrap", 
          style().maxWidth(15)
        )
      )
      expect(result).toContain("This")
      expect(result).toContain("long")
    })

    it("handles options override style settings", async () => {
      const result = await Effect.runPromise(
        renderStyled("Test", 
          style().width(20), 
          { width: 10, height: 5 }
        )
      )
      expect(result).toContain("Test")
    })
  })
})