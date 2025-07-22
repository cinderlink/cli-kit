/**
 * View Primitives Tests
 * 
 * Comprehensive tests for view creation and rendering functions
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import { 
  text, 
  styledText, 
  vstack, 
  hstack,
  empty,
  View
} from "./view"
import { style, Colors } from "@core/terminal/ansi/styles"

describe("View Primitives", () => {
  describe("text", () => {
    it("should create a view with plain text", async () => {
      const view = text("Hello, World!")
      
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("Hello, World!")
      expect(view.width).toBe(13)
      expect(view.height).toBe(1)
    })
    
    it("should handle empty text", async () => {
      const view = text("")
      
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("")
      expect(view.width).toBe(0)
      expect(view.height).toBe(1)
    })
    
    it("should handle multiline text", async () => {
      const view = text("Line 1\nLine 2\nLine 3")
      
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("Line 1\nLine 2\nLine 3")
      expect(view.width).toBe(6) // Width of longest line
      expect(view.height).toBe(3)
    })
    
    it("should handle text with ANSI escape sequences", async () => {
      const colorText = "\x1b[31mRed text\x1b[0m"
      const view = text(colorText)
      
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe(colorText)
      expect(view.width).toBe(8) // Should ignore ANSI sequences for width
      expect(view.height).toBe(1)
    })
  })
  
  describe("styledText", () => {
    it("should create a styled text view", async () => {
      const textStyle = style({
        color: Colors.red,
        bold: true
      })
      
      const view = styledText("Styled text", textStyle)
      
      const result = await Effect.runPromise(view.render())
      
      expect(result).toContain("Styled text")
      expect(result).toContain("\x1b[31m") // Red color code
      expect(result).toContain("\x1b[1m")  // Bold code
      expect(view.width).toBe(11)
      expect(view.height).toBe(1)
    })
    
    it("should handle empty styled text", async () => {
      const textStyle = style({ color: Colors.blue })
      const view = styledText("", textStyle)
      
      const result = await Effect.runPromise(view.render())
      
      expect(view.width).toBe(0)
      expect(view.height).toBe(1)
    })
  })
  
  describe("vstack", () => {
    it("should stack views vertically", async () => {
      const view1 = text("First line")
      const view2 = text("Second line")
      const view3 = text("Third")
      
      const stacked = vstack(view1, view2, view3)
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* stacked.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("First line\nSecond line\nThird")
      expect(result.width).toBe(11) // Width of longest line
      expect(result.height).toBe(3)
    })
    
    it("should handle empty vstack", async () => {
      const stacked = vstack()
      
      const result = await Effect.runPromise(stacked.render())
      
      expect(result).toBe("")
      expect(stacked.width).toBe(0)
      expect(stacked.height).toBe(0)
    })
    
    it("should handle single view in vstack", async () => {
      const view = text("Single line")
      const stacked = vstack([view])
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* stacked.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("Single line")
      expect(result.width).toBe(11)
      expect(result.height).toBe(1)
    })
  })
  
  describe("hstack", () => {
    it("should stack views horizontally", async () => {
      const view1 = text("Left")
      const view2 = text("Right")
      
      const stacked = hstack(view1, view2)
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* stacked.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("LeftRight")
      expect(result.width).toBe(9) // "Left" (4) + "Right" (5)
      expect(result.height).toBe(1)
    })
    
    it("should handle empty hstack", async () => {
      const stacked = hstack([])
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* stacked.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("")
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
    })
    
    it("should handle multiline views in hstack", async () => {
      const view1 = text("A\nB")
      const view2 = text("1\n2")
      
      const stacked = hstack([view1, view2])
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* stacked.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("A1\nB2")
      expect(result.width).toBe(2) // Max width of combined lines
      expect(result.height).toBe(2)
    })
  })
  
  describe("empty", () => {
    it("should create an empty view", async () => {
      const view = empty()
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* view.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("")
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
    })
  })
  
  describe("View composition", () => {
    it("should compose complex view hierarchies", async () => {
      const header = styledText("Header", style({ bold: true, color: Colors.blue }))
      const line1 = text("Line 1 content")
      const line2 = text("Line 2 content")
      const footer = styledText("Footer", style({ color: Colors.gray }))
      
      const body = vstack([line1, line2])
      const page = vstack([header, body, footer])
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* page.render({} as any)
          return rendered
        })
      )
      
      expect(result.height).toBe(4)
      expect(result.width).toBe(14) // Width of longest line
      expect(result.content).toContain("Header")
      expect(result.content).toContain("Line 1 content")
      expect(result.content).toContain("Line 2 content")
      expect(result.content).toContain("Footer")
    })
    
    it("should handle nested stacks", async () => {
      const left = vstack([text("L1"), text("L2")])
      const right = vstack([text("R1"), text("R2")])
      const combined = hstack([left, right])
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* combined.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("L1R1\nL2R2")
      expect(result.width).toBe(4) // "L1R1" length
      expect(result.height).toBe(2)
    })
  })
  
  describe("Error handling", () => {
    it("should handle render errors gracefully", async () => {
      // Create a view that will fail to render
      const failingView: View = {
        render: () => Effect.fail(new Error("Render failed")),
        width: 0,
        height: 0
      }
      
      const result = await Effect.runPromise(
        Effect.either(failingView.render({} as any))
      )
      
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toBe("Render failed")
      }
    })
  })
  
  describe("Performance", () => {
    it("should handle large view hierarchies efficiently", async () => {
      const startTime = performance.now()
      
      // Create a large hierarchy
      const views = Array.from({ length: 1000 }, (_, i) => 
        text(`Line ${i}`)
      )
      const largeStack = vstack(views)
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* largeStack.render({} as any)
          return rendered
        })
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(result.height).toBe(1000)
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
    })
  })
})