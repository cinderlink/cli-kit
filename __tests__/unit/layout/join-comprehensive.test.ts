/**
 * Comprehensive tests for src/layout/join.ts
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { 
  joinHorizontal, 
  joinVertical,
  JoinOptions,
  HorizontalAlign,
  VerticalAlign
} from "@/layout/join"
import { text } from "@/core/view"

describe("Layout Join System", () => {
  describe("joinHorizontal", () => {
    it("joins views horizontally with default options", async () => {
      const view1 = text("A")
      const view2 = text("B")
      const joined = joinHorizontal([view1, view2])
      
      expect(joined.width).toBe(2) // A + B
      expect(joined.height).toBe(1)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toBe("AB")
    })

    it("handles views of different heights", async () => {
      const view1 = text("Short")
      const view2 = text("Tall\nView")
      const joined = joinHorizontal([view1, view2])
      
      expect(joined.width).toBe(9) // 5 + 4
      expect(joined.height).toBe(2) // Height of tallest
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Short")
      expect(rendered).toContain("Tall")
      expect(rendered).toContain("View")
    })

    it("applies spacing between views", async () => {
      const view1 = text("A")
      const view2 = text("B")
      const options: JoinOptions = { spacing: 2 }
      const joined = joinHorizontal([view1, view2], options)
      
      expect(joined.width).toBe(4) // A + 2 spaces + B
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toBe("A  B")
    })

    it("handles top alignment", async () => {
      const view1 = text("Short")
      const view2 = text("Tall\nView\nHere")
      const options: JoinOptions = { align: "top" }
      const joined = joinHorizontal([view1, view2], options)
      
      expect(joined.height).toBe(3)
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Short")
    })

    it("handles middle alignment", async () => {
      const view1 = text("Mid")
      const view2 = text("A\nB\nC")
      const options: JoinOptions = { align: "middle" }
      const joined = joinHorizontal([view1, view2], options)
      
      expect(joined.height).toBe(3)
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Mid")
      expect(rendered).toContain("B")
    })

    it("handles bottom alignment", async () => {
      const view1 = text("Bottom")
      const view2 = text("Line1\nLine2\nLine3")
      const options: JoinOptions = { align: "bottom" }
      const joined = joinHorizontal([view1, view2], options)
      
      expect(joined.height).toBe(3)
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Bottom")
      expect(rendered).toContain("Line3")
    })

    it("handles empty view arrays", () => {
      const joined = joinHorizontal([])
      expect(joined.width).toBe(0)
      expect(joined.height).toBe(0)
    })

    it("handles single view", async () => {
      const view = text("Single")
      const joined = joinHorizontal([view])
      
      expect(joined.width).toBe(6)
      expect(joined.height).toBe(1)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toBe("Single")
    })
  })

  describe("joinVertical", () => {
    it("joins views vertically with default options", async () => {
      const view1 = text("Top")
      const view2 = text("Bottom")
      const joined = joinVertical([view1, view2])
      
      expect(joined.width).toBe(6) // Width of "Bottom"
      expect(joined.height).toBe(2)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Top")
      expect(rendered).toContain("Bottom")
    })

    it("handles views of different widths", async () => {
      const view1 = text("Short")
      const view2 = text("Much longer text")
      const joined = joinVertical([view1, view2])
      
      expect(joined.width).toBe(16) // Width of longest
      expect(joined.height).toBe(2)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Short")
      expect(rendered).toContain("Much longer text")
    })

    it("applies spacing between views", async () => {
      const view1 = text("A")
      const view2 = text("B")
      const options: JoinOptions = { spacing: 1 }
      const joined = joinVertical([view1, view2], options)
      
      expect(joined.height).toBe(3) // A + 1 empty line + B
      
      const rendered = await Effect.runPromise(joined.render())
      const lines = rendered.split('\n')
      expect(lines.length).toBe(3)
      expect(lines[0].trim()).toBe("A")
      expect(lines[1].trim()).toBe("")
      expect(lines[2].trim()).toBe("B")
    })

    it("handles left alignment", async () => {
      const view1 = text("Short")
      const view2 = text("Much longer line")
      const options: JoinOptions = { align: "left" }
      const joined = joinVertical([view1, view2], options)
      
      const rendered = await Effect.runPromise(joined.render())
      const lines = rendered.split('\n')
      expect(lines[0]).toMatch(/^Short/)
      expect(lines[1]).toMatch(/^Much longer line/)
    })

    it("handles center alignment", async () => {
      const view1 = text("Short")
      const view2 = text("Much longer line")
      const options: JoinOptions = { align: "center" }
      const joined = joinVertical([view1, view2], options)
      
      const rendered = await Effect.runPromise(joined.render())
      const lines = rendered.split('\n')
      expect(lines[0].indexOf("Short")).toBeGreaterThan(0) // Should be indented
    })

    it("handles right alignment", async () => {
      const view1 = text("Short")
      const view2 = text("Much longer line")
      const options: JoinOptions = { align: "right" }
      const joined = joinVertical([view1, view2], options)
      
      const rendered = await Effect.runPromise(joined.render())
      const lines = rendered.split('\n')
      expect(lines[0]).toMatch(/Short\s*$/) // Should end with "Short"
    })

    it("handles empty view arrays", () => {
      const joined = joinVertical([])
      expect(joined.width).toBe(0)
      expect(joined.height).toBe(0)
    })

    it("handles single view", async () => {
      const view = text("Single")
      const joined = joinVertical([view])
      
      expect(joined.width).toBe(6)
      expect(joined.height).toBe(1)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toBe("Single")
    })
  })

  describe("complex layouts", () => {
    it("handles nested horizontal and vertical joins", async () => {
      const a = text("A")
      const b = text("B")
      const c = text("C")
      const d = text("D")
      
      const row1 = joinHorizontal([a, b])
      const row2 = joinHorizontal([c, d])
      const grid = joinVertical([row1, row2])
      
      expect(grid.width).toBe(2)
      expect(grid.height).toBe(2)
      
      const rendered = await Effect.runPromise(grid.render())
      expect(rendered).toContain("AB")
      expect(rendered).toContain("CD")
    })

    it("handles mixed spacing and alignment", async () => {
      const view1 = text("1")
      const view2 = text("22")
      const view3 = text("333")
      
      const options: JoinOptions = { 
        spacing: 1, 
        align: "center" 
      }
      const joined = joinVertical([view1, view2, view3], options)
      
      expect(joined.height).toBe(5) // 3 views + 2 spacing lines
      expect(joined.width).toBe(3) // Width of "333"
    })

    it("handles large number of views", async () => {
      const views = Array.from({ length: 100 }, (_, i) => text(`Item ${i}`))
      const joined = joinVertical(views)
      
      expect(joined.height).toBe(100)
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Item 0")
      expect(rendered).toContain("Item 99")
    })
  })

  describe("edge cases", () => {
    it("handles views with zero dimensions", async () => {
      const empty = text("")
      const normal = text("Normal")
      const joined = joinHorizontal([empty, normal])
      
      expect(joined.width).toBe(6) // Just "Normal"
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toBe("Normal")
    })

    it("handles very wide spacing", async () => {
      const view1 = text("A")
      const view2 = text("B")
      const options: JoinOptions = { spacing: 100 }
      const joined = joinHorizontal([view1, view2], options)
      
      expect(joined.width).toBe(102) // A + 100 spaces + B
    })

    it("handles multiline views with spacing", async () => {
      const view1 = text("Line1\nLine2")
      const view2 = text("A\nB\nC")
      const options: JoinOptions = { spacing: 2 }
      const joined = joinVertical([view1, view2], options)
      
      expect(joined.height).toBe(7) // 2 + 2 spacing + 3
    })

    it("handles views with ANSI codes", async () => {
      const styled1 = text("\u001b[31mRed\u001b[0m")
      const styled2 = text("\u001b[32mGreen\u001b[0m")
      const joined = joinHorizontal([styled1, styled2])
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("Red")
      expect(rendered).toContain("Green")
    })

    it("handles unicode characters", async () => {
      const unicode1 = text("Hello 🌍")
      const unicode2 = text("World 🎉")
      const joined = joinVertical([unicode1, unicode2])
      
      const rendered = await Effect.runPromise(joined.render())
      expect(rendered).toContain("🌍")
      expect(rendered).toContain("🎉")
    })
  })

  describe("performance", () => {
    it("handles large grids efficiently", async () => {
      const start = Date.now()
      
      // Create a 50x50 grid
      const rows = Array.from({ length: 50 }, (_, row) => {
        const cells = Array.from({ length: 50 }, (_, col) => text(`${row},${col}`))
        return joinHorizontal(cells)
      })
      const grid = joinVertical(rows)
      
      expect(grid.width).toBeGreaterThan(0)
      expect(grid.height).toBe(50)
      
      const end = Date.now()
      expect(end - start).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})