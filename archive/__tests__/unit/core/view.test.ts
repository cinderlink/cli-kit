/**
 * Tests for core/view.ts - View system and primitives
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  text,
  empty,
  createView,
  isView,
  measureView,
  renderView,
  vstack,
  hstack,
  box,
  center,
  styled,
  bold,
  dim,
  italic,
  underline,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  styledText
} from "@/core/view"
import { style } from "@/styling/style"
import { Colors } from "@/styling/color"
import type { View } from "@/core/types"

describe("Core View System", () => {
  describe("text", () => {
    it("creates a simple text view", async () => {
      const view = text("Hello World")
      
      expect(view.width).toBe(11)
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("Hello World")
    })

    it("handles multi-line text", async () => {
      const view = text("Line 1\nLine 2\nLine 3")
      
      expect(view.width).toBe(6) // "Line 1" is longest
      expect(view.height).toBe(3)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("Line 1\nLine 2\nLine 3")
    })

    it("handles empty text", async () => {
      const view = text("")
      
      expect(view.width).toBe(0)
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("")
    })

    it("calculates width correctly for varying line lengths", async () => {
      const view = text("Short\nMuch longer line\nMed")
      
      expect(view.width).toBe(16) // "Much longer line" is longest
      expect(view.height).toBe(3)
    })

    it("handles unicode characters", async () => {
      const view = text("Hello 世界")
      
      // Unicode characters may have different widths
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("Hello 世界")
    })
  })

  describe("empty", () => {
    it("creates an empty view", async () => {
      expect(empty.width).toBe(0)
      expect(empty.height).toBe(1)
      
      const result = await Effect.runPromise(empty.render())
      expect(result).toBe("")
    })
  })

  describe("createView", () => {
    it("is an alias for text function", async () => {
      const view1 = text("Test")
      const view2 = createView("Test")
      
      expect(view1.width || 0).toEqual(view2.width || 0)
      expect(view1.height || 0).toEqual(view2.height || 0)
      
      const result1 = await Effect.runPromise(view1.render())
      const result2 = await Effect.runPromise(view2.render())
      expect(result1).toBe(result2)
    })
  })

  describe("isView", () => {
    it("identifies valid view objects", () => {
      const view = text("Test")
      expect(isView(view)).toBe(true)
    })

    it("rejects non-view objects", () => {
      expect(isView(null)).toBeFalsy() // null is falsy
      expect(isView(undefined)).toBeFalsy() // undefined is falsy
      expect(isView({})).toBe(false)
      expect(isView("string")).toBe(false)
      expect(isView(123)).toBe(false)
      expect(isView({ width: 10, height: 5 })).toBe(false) // missing render
    })

    it("identifies objects with render function", () => {
      const mockView = {
        render: () => Effect.succeed("test"),
        width: 4,
        height: 1
      }
      expect(isView(mockView)).toBe(true)
    })
  })

  describe("measureView", () => {
    it("measures view dimensions", async () => {
      const view = text("Hello\nWorld")
      const dimensions = await Effect.runPromise(measureView(view))
      
      expect(dimensions.width).toBe(5)
      expect(dimensions.height).toBe(2)
    })

    it("handles undefined dimensions", async () => {
      const mockView: View = {
        render: () => Effect.succeed("test")
      }
      
      const dimensions = await Effect.runPromise(measureView(mockView))
      expect(dimensions.width).toBe(0)
      expect(dimensions.height).toBe(0)
    })

    it("measures empty view", async () => {
      const dimensions = await Effect.runPromise(measureView(empty))
      expect(dimensions.width).toBe(0)
      expect(dimensions.height).toBe(1)
    })
  })

  describe("renderView", () => {
    it("renders a view to string", async () => {
      const view = text("Test content")
      const result = await Effect.runPromise(renderView(view))
      expect(result).toBe("Test content")
    })

    it("handles multi-line content", async () => {
      const view = text("Line 1\nLine 2")
      const result = await Effect.runPromise(renderView(view))
      expect(result).toBe("Line 1\nLine 2")
    })
  })

  describe("styledText", () => {
    it("creates styled text using new styling system", async () => {
      const textStyle = style().bold()
      const view = styledText("Styled", textStyle)
      
      expect(view.width).toBe(6) // Default to content width when no style width
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toContain("Styled")
      expect(result).toMatch(/\x1b\[1m.*\x1b\[0m/) // Should contain bold ANSI codes
    })

    it("respects style dimensions", async () => {
      const textStyle = style().width(10).height(3)
      const view = styledText("Test", textStyle)
      
      expect(view.width).toBe(10)
      expect(view.height).toBe(3)
    })

    it("handles multi-line content", async () => {
      const textStyle = style()
      const view = styledText("Line 1\nLine 2", textStyle)
      
      expect(view.height).toBe(2) // Content has 2 lines
    })

    it("handles style without dimensions", async () => {
      const textStyle = style().foreground(Colors.red)
      const view = styledText("No dims", textStyle)
      
      expect(view.width).toBe(7) // Content width
      expect(view.height).toBe(1) // Content height
    })
  })

  describe("vstack", () => {
    it("stacks views vertically", async () => {
      const view1 = text("First")
      const view2 = text("Second") 
      const view3 = text("Third")
      
      const stacked = vstack(view1, view2, view3)
      
      expect(stacked.width).toBe(6) // "Second" is longest
      expect(stacked.height).toBe(3)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("First\nSecond\nThird")
    })

    it("handles empty views in stack", async () => {
      const view1 = text("Content")
      const view2 = empty
      const view3 = text("More")
      
      const stacked = vstack(view1, view2, view3)
      
      expect(stacked.height).toBe(3)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("Content\n\nMore")
    })

    it("handles single view", async () => {
      const view = text("Single")
      const stacked = vstack(view)
      
      expect(stacked.width).toBe(6)
      expect(stacked.height).toBe(1)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("Single")
    })

    it("handles no views", async () => {
      const stacked = vstack()
      
      expect(stacked.width).toBe(-Infinity) // Math.max() of empty array
      expect(stacked.height).toBe(0)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("")
    })

    it("handles multi-line views", async () => {
      const view1 = text("A\nB")
      const view2 = text("C\nD\nE")
      
      const stacked = vstack(view1, view2)
      
      expect(stacked.height).toBe(5) // 2 + 3
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("A\nB\nC\nD\nE")
    })
  })

  describe("hstack", () => {
    it("stacks views horizontally", async () => {
      const view1 = text("AB")
      const view2 = text("CD") 
      
      const stacked = hstack(view1, view2)
      
      expect(stacked.width).toBe(4) // 2 + 2
      expect(stacked.height).toBe(1)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("ABCD")
    })

    it("handles different height views", async () => {
      const view1 = text("A\nB\nC")
      const view2 = text("X")
      
      const stacked = hstack(view1, view2)
      
      expect(stacked.width).toBe(2) // 1 + 1
      expect(stacked.height).toBe(3)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("AX\nB \nC ")
    })

    it("pads shorter views to match height", async () => {
      const view1 = text("Long")
      const view2 = text("A\nB\nC")
      
      const stacked = hstack(view1, view2)
      
      expect(stacked.width).toBe(5) // 4 + 1
      expect(stacked.height).toBe(3)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("LongA\n    B\n    C")
    })

    it("pads lines to view width", async () => {
      const view1 = text("ABC\nD") // First line is 3 wide, second is 1 wide
      const view2 = text("X")
      
      const stacked = hstack(view1, view2)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("ABCX\nD   ") // view2 has empty space for shorter view1 line
    })

    it("handles empty views", async () => {
      const view1 = text("Content")
      const view2 = empty
      
      const stacked = hstack(view1, view2)
      
      expect(stacked.width).toBe(7) // 7 + 0
      expect(stacked.height).toBe(1)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("Content")
    })

    it("handles no views", async () => {
      const stacked = hstack()
      
      expect(stacked.width).toBe(0)
      expect(stacked.height).toBe(-Infinity) // Math.max of empty array
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("")
    })

    it("handles multiple multi-line views", async () => {
      const view1 = text("A\nB")
      const view2 = text("X\nY")
      const view3 = text("1\n2")
      
      const stacked = hstack(view1, view2, view3)
      
      expect(stacked.width).toBe(3)
      expect(stacked.height).toBe(2)
      
      const result = await Effect.runPromise(stacked.render())
      expect(result).toBe("AX1\nBY2")
    })
  })

  describe("box", () => {
    it("creates a box around a view", async () => {
      const view = text("Hello")
      const boxed = box(view)
      
      expect(boxed.width).toBe(9) // 5 + 4 (for borders and padding)
      expect(boxed.height).toBe(3) // 1 + 2 (for top/bottom borders)
      
      const result = await Effect.runPromise(boxed.render())
      const lines = result.split('\n')
      
      expect(lines[0]).toBe("┌───────┐")
      expect(lines[1]).toBe("│ Hello │")
      expect(lines[2]).toBe("└───────┘")
    })

    it("handles multi-line content", async () => {
      const view = text("A\nBC\nD")
      const boxed = box(view)
      
      expect(boxed.width).toBe(6) // 2 (max width) + 4
      expect(boxed.height).toBe(5) // 3 + 2
      
      const result = await Effect.runPromise(boxed.render())
      const lines = result.split('\n')
      
      expect(lines[0]).toBe("┌────┐")
      expect(lines[1]).toBe("│ A  │")
      expect(lines[2]).toBe("│ BC │")
      expect(lines[3]).toBe("│ D  │")
      expect(lines[4]).toBe("└────┘")
    })

    it("handles empty content", async () => {
      const boxed = box(empty)
      
      expect(boxed.width).toBe(4) // 0 + 4
      expect(boxed.height).toBe(3) // 1 + 2
      
      const result = await Effect.runPromise(boxed.render())
      const lines = result.split('\n')
      
      expect(lines[0]).toBe("┌──┐")
      expect(lines[1]).toBe("│  │")
      expect(lines[2]).toBe("└──┘")
    })

    it("handles varying line widths", async () => {
      const view = text("Short\nMuch longer line")
      const boxed = box(view)
      
      const result = await Effect.runPromise(boxed.render())
      const lines = result.split('\n')
      
      expect(lines[1]).toBe("│ Short            │") // Padded to match longest line
      expect(lines[2]).toBe("│ Much longer line │")
    })
  })

  describe("center", () => {
    it("centers a view within given width", async () => {
      const view = text("Hi")
      const centered = center(view, 10)
      
      expect(centered.width).toBe(10)
      expect(centered.height).toBe(view.height || 1)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("    Hi    ") // 4 spaces on each side
    })

    it("handles odd padding", async () => {
      const view = text("Odd")
      const centered = center(view, 10)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("   Odd    ") // 3 left, 4 right
    })

    it("handles multi-line content", async () => {
      const view = text("A\nBC")
      const centered = center(view, 8)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("   A    \n   BC   ") // Each line centered independently
    })

    it("handles content wider than total width", async () => {
      const view = text("Very long content")
      const centered = center(view, 5)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("Very long content") // No padding when content is wider
    })

    it("handles zero width", async () => {
      const view = text("Test")
      const centered = center(view, 0)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("Test") // No padding
    })

    it("handles empty content", async () => {
      const centered = center(empty, 6)
      
      const result = await Effect.runPromise(centered.render())
      expect(result).toBe("      ") // All spaces
    })
  })

  describe("styled", () => {
    it("applies ANSI styling to a view", async () => {
      const view = text("Hello")
      const styledView = styled(view, '\x1b[1m') // Bold
      
      expect(styledView.width).toBe(view.width || 5)
      expect(styledView.height).toBe(view.height || 1)
      
      const result = await Effect.runPromise(styledView.render())
      expect(result).toBe("\x1b[1mHello\x1b[0m")
    })

    it("preserves view dimensions", async () => {
      const view = text("Multi\nLine")
      const styledView = styled(view, '\x1b[31m') // Red
      
      expect(styledView.width).toBe(view.width || 0)
      expect(styledView.height).toBe(view.height || 0)
      
      const result = await Effect.runPromise(styledView.render())
      expect(result).toBe("\x1b[31mMulti\nLine\x1b[0m")
    })
  })

  describe("style shortcuts", () => {
    const testView = text("Test")

    it("applies bold styling", async () => {
      const view = bold(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[1mTest\x1b[0m")
    })

    it("applies dim styling", async () => {
      const view = dim(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[2mTest\x1b[0m")
    })

    it("applies italic styling", async () => {
      const view = italic(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[3mTest\x1b[0m")
    })

    it("applies underline styling", async () => {
      const view = underline(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[4mTest\x1b[0m")
    })
  })

  describe("color shortcuts", () => {
    const testView = text("Color")

    it("applies red color", async () => {
      const view = red(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[31mColor\x1b[0m")
    })

    it("applies green color", async () => {
      const view = green(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[32mColor\x1b[0m")
    })

    it("applies yellow color", async () => {
      const view = yellow(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[33mColor\x1b[0m")
    })

    it("applies blue color", async () => {
      const view = blue(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[34mColor\x1b[0m")
    })

    it("applies magenta color", async () => {
      const view = magenta(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[35mColor\x1b[0m")
    })

    it("applies cyan color", async () => {
      const view = cyan(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[36mColor\x1b[0m")
    })

    it("applies white color", async () => {
      const view = white(testView)
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("\x1b[37mColor\x1b[0m")
    })
  })

  describe("complex compositions", () => {
    it("combines multiple operations", async () => {
      const content1 = text("First")
      const content2 = text("Second")
      const stacked = vstack(content1, content2)
      const boxed = box(stacked)
      const styled = red(boxed)
      
      const result = await Effect.runPromise(styled.render())
      expect(result).toMatch(/\u001b\[31m[\s\S]*\u001b\[0m/) // Red styling with Unicode escapes
      expect(result).toContain("┌")
      expect(result).toContain("First")
      expect(result).toContain("Second")
    })

    it("nests horizontal and vertical stacks", async () => {
      const row1 = hstack(text("A"), text("B"))
      const row2 = hstack(text("C"), text("D"))
      const grid = vstack(row1, row2)
      
      const result = await Effect.runPromise(grid.render())
      expect(result).toBe("AB\nCD")
    })

    it("centers a boxed view", async () => {
      const content = text("Hi")
      const boxed = box(content)
      const centered = center(boxed, 15)
      
      const result = await Effect.runPromise(centered.render())
      const lines = result.split('\n')
      
      // Box should be centered within 15 characters
      lines.forEach(line => {
        expect(line.length).toBe(15)
      })
    })
  })

  describe("edge cases", () => {
    it("handles views with undefined dimensions", async () => {
      const mockView: View = {
        render: () => Effect.succeed("test")
      }
      
      const stacked = vstack(mockView)
      expect(stacked.width).toBe(0)
      expect(stacked.height).toBe(1) // Default height for views without height
    })

    it("handles string width calculation edge cases", async () => {
      // Test with zero-width characters or special Unicode
      const view = text("Test\u200B") // Zero-width space
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("Test\u200B")
    })

    it("handles very large content", async () => {
      const largeContent = "X".repeat(1000)
      const view = text(largeContent)
      
      expect(view.width).toBe(1000)
      expect(view.height).toBe(1)
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe(largeContent)
    })

    it("handles deeply nested stacks", async () => {
      let nested = text("Core")
      for (let i = 0; i < 10; i++) {
        nested = vstack(nested, text(`Level ${i}`))
      }
      
      expect(nested.height).toBe(11) // 1 + 10
      
      const result = await Effect.runPromise(nested.render())
      expect(result).toContain("Core")
      expect(result).toContain("Level 9")
    })
  })

  describe("performance", () => {
    it("handles large stacks efficiently", async () => {
      const views = Array(100).fill(0).map((_, i) => text(`Item ${i}`))
      
      const start = Date.now()
      const stacked = vstack(...views)
      const result = await Effect.runPromise(stacked.render())
      const duration = Date.now() - start
      
      expect(stacked.height).toBe(100)
      expect(result.split('\n')).toHaveLength(100)
      expect(duration).toBeLessThan(100) // Should be reasonably fast
    })

    it("handles large horizontal stacks efficiently", async () => {
      const views = Array(50).fill(0).map((_, i) => text(`${i}`))
      
      const start = Date.now()
      const stacked = hstack(...views)
      const result = await Effect.runPromise(stacked.render())
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100) // Should be reasonably fast
      expect(result.length).toBeGreaterThan(50) // Should contain all items
    })
  })
})