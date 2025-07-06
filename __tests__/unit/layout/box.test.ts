/**
 * Tests for src/layout/box.ts
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { styledBox, BoxProps } from "@/layout/box"
import { text } from "@/core/view"
import { Borders } from "@/styling/borders"
import { style } from "@/styling/style"
import { Colors } from "@/styling/color"

describe("Box Layout System", () => {
  describe("styledBox basic functionality", () => {
    it("creates box with default options", () => {
      const content = text("Hello")
      const boxed = styledBox(content)
      
      expect(boxed.width).toBeGreaterThanOrEqual(content.width)
      expect(boxed.height).toBeGreaterThanOrEqual(content.height)
    })

    it("adds padding to content", () => {
      const content = text("Test")
      const options: BoxProps = { padding: 2 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(content.width + 4) // 2 padding on each side
      expect(boxed.height).toBe(content.height + 4) // 2 padding top/bottom
    })

    it("handles minimum width", () => {
      const content = text("Hi")
      const options: BoxProps = { minWidth: 20 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBeGreaterThanOrEqual(20)
    })

    it("handles minimum height", () => {
      const content = text("Test")
      const options: BoxProps = { minHeight: 10 }
      const boxed = styledBox(content, options)
      
      expect(boxed.height).toBeGreaterThanOrEqual(10)
    })
  })

  describe("borders", () => {
    it("adds simple border", () => {
      const content = text("Test")
      const options: BoxProps = { border: Borders.Normal }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBeGreaterThanOrEqual(content.width)
      expect(boxed.height).toBeGreaterThanOrEqual(content.height)
    })

    it("combines border with padding", () => {
      const content = text("Test")
      const options: BoxProps = { 
        border: Borders.Normal, 
        padding: 1 
      }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBeGreaterThan(content.width)
      expect(boxed.height).toBeGreaterThan(content.height)
    })
  })

  describe("object padding", () => {
    it("handles complex padding object", () => {
      const content = text("Test")
      const options: BoxProps = { 
        padding: { top: 1, right: 2, bottom: 3, left: 4 }
      }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(content.width + 6) // 4 left + 2 right
      expect(boxed.height).toBe(content.height + 4) // 1 top + 3 bottom
    })
  })

  describe("styling", () => {
    it("applies background color", () => {
      const content = text("Test")
      const boxStyle = style().background(Colors.blue)
      const options: BoxProps = { style: boxStyle }
      const boxed = styledBox(content, options)
      
      expect(boxed).toBeDefined()
    })

    it("applies foreground color", () => {
      const content = text("Test")
      const boxStyle = style().foreground(Colors.white)
      const options: BoxProps = { style: boxStyle }
      const boxed = styledBox(content, options)
      
      expect(boxed).toBeDefined()
    })

    it("combines styling with borders", () => {
      const content = text("Test")
      const boxStyle = style().foreground(Colors.red).bold()
      const options: BoxProps = { 
        border: Borders.Heavy,
        style: boxStyle
      }
      const boxed = styledBox(content, options)
      
      expect(boxed).toBeDefined()
    })
  })

  describe("size constraints", () => {
    it("respects minimum width", () => {
      const content = text("Hi")
      const options: BoxProps = { minWidth: 20 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBeGreaterThanOrEqual(20)
    })

    it("respects minimum height", () => {
      const content = text("Test")
      const options: BoxProps = { minHeight: 10 }
      const boxed = styledBox(content, options)
      
      expect(boxed.height).toBeGreaterThanOrEqual(10)
    })

    it("handles both width and height constraints", () => {
      const content = text("Small")
      const options: BoxProps = { minWidth: 20, minHeight: 10 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBeGreaterThanOrEqual(20)
      expect(boxed.height).toBeGreaterThanOrEqual(10)
    })
  })

  describe("complex content", () => {
    it("handles multiline content", () => {
      const content = text("Line 1\nLine 2\nLine 3")
      const options: BoxProps = { padding: 1, border: Borders.Normal }
      const boxed = styledBox(content, options)
      
      expect(boxed.height).toBe(content.height + 4) // 3 lines + 2 padding + 2 border
    })

    it("handles wide content", () => {
      const wideContent = "a".repeat(100)
      const content = text(wideContent)
      const options: BoxProps = { padding: 2 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(104) // 100 + 4 padding
    })

    it("handles empty content", () => {
      const content = text("")
      const options: BoxProps = { padding: 1, border: Borders.Normal }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(4) // 0 + 2 padding + 2 border
      expect(boxed.height).toBe(5) // 1 + 2 padding + 2 border
    })
  })

  describe("rendering", () => {
    it("renders simple box correctly", async () => {
      const content = text("Hello")
      const options: BoxProps = { padding: 1 }
      const boxed = styledBox(content, options)
      
      const rendered = await Effect.runPromise(boxed.render())
      expect(rendered).toContain("Hello")
    })

    it("renders border correctly", async () => {
      const content = text("Test")
      const options: BoxProps = { border: Borders.Normal }
      const boxed = styledBox(content, options)
      
      const rendered = await Effect.runPromise(boxed.render())
      expect(rendered).toContain("Test")
      // Should contain border characters
      expect(rendered.split('\n').length).toBeGreaterThanOrEqual(3) // Should have border lines
    })
  })

  describe("edge cases", () => {
    it("handles zero padding", () => {
      const content = text("Test")
      const options: BoxProps = { padding: 0 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(content.width)
      expect(boxed.height).toBe(content.height)
    })

    it("handles very large padding", () => {
      const content = text("Test")
      const options: BoxProps = { padding: 50 }
      const boxed = styledBox(content, options)
      
      expect(boxed.width).toBe(content.width + 100)
      expect(boxed.height).toBe(content.height + 100)
    })

    it("handles negative dimensions gracefully", () => {
      const content = text("Test")
      const options: BoxProps = { 
        minWidth: -10, 
        minHeight: -5 
      }
      const boxed = styledBox(content, options)
      
      // Should not crash, dimensions should be at least content size
      expect(boxed.width).toBeGreaterThanOrEqual(content.width)
      expect(boxed.height).toBeGreaterThanOrEqual(content.height)
    })
  })

  describe("performance", () => {
    it("handles large content efficiently", () => {
      const largeContent = "x".repeat(10000)
      const content = text(largeContent)
      
      const start = Date.now()
      const boxed = styledBox(content, { padding: 5, border: Borders.Heavy })
      const end = Date.now()
      
      expect(boxed.width).toBe(10010) // 10000 + 10 padding
      expect(end - start).toBeLessThan(1000) // Should be fast
    })
  })
})