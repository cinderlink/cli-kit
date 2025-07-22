/**
 * Flexbox Layout Tests
 * 
 * Tests for the flexbox layout system
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { flexbox } from "./flexbox"
import { text } from "@core/view/primitives/view"
import { FlexDirection, JustifyContent, AlignItems } from "./types"

describe("Flexbox Layout", () => {
  describe("Direction", () => {
    it("should layout items in row direction", async () => {
      const items = [
        text("Item1"),
        text("Item2"),
        text("Item3")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("Item1Item2Item3")
      expect(result.width).toBe(15) // Sum of item widths
      expect(result.height).toBe(1)
    })
    
    it("should layout items in column direction", async () => {
      const items = [
        text("Item1"),
        text("Item2"),
        text("Item3")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Column,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("Item1\nItem2\nItem3")
      expect(result.width).toBe(5) // Width of widest item
      expect(result.height).toBe(3) // Sum of item heights
    })
    
    it("should layout items in row-reverse direction", async () => {
      const items = [
        text("First"),
        text("Second"),
        text("Third")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.RowReverse,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("ThirdSecondFirst")
    })
    
    it("should layout items in column-reverse direction", async () => {
      const items = [
        text("First"),
        text("Second"),
        text("Third")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.ColumnReverse,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("Third\nSecond\nFirst")
    })
  })
  
  describe("Justify Content", () => {
    it("should justify content to start", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        justifyContent: JustifyContent.Start,
        items: items.map(item => ({ view: item })),
        width: 10
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("AB        ") // Items at start, padding at end
      expect(result.width).toBe(10)
    })
    
    it("should justify content to end", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        justifyContent: JustifyContent.End,
        items: items.map(item => ({ view: item })),
        width: 10
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("        AB") // Padding at start, items at end
    })
    
    it("should justify content to center", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        justifyContent: JustifyContent.Center,
        items: items.map(item => ({ view: item })),
        width: 10
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("    AB    ") // Equal padding on both sides
    })
    
    it("should space items evenly with space-between", async () => {
      const items = [text("A"), text("B"), text("C")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        justifyContent: JustifyContent.SpaceBetween,
        items: items.map(item => ({ view: item })),
        width: 10
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("A   B   C ") // Even space between items
    })
    
    it("should space items evenly with space-around", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        justifyContent: JustifyContent.SpaceAround,
        items: items.map(item => ({ view: item })),
        width: 10
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("  A    B  ") // Equal space around items
    })
  })
  
  describe("Align Items", () => {
    it("should align items to start", async () => {
      const items = [
        text("Short"),
        text("Much\nLonger\nContent")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        alignItems: AlignItems.Start,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      // Should align to top
      expect(result.height).toBe(3)
      expect(result.content).toContain("Short")
      expect(result.content).toContain("Much")
    })
    
    it("should align items to end", async () => {
      const items = [
        text("Short"),
        text("Much\nLonger\nContent")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        alignItems: AlignItems.End,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      // Should align to bottom
      expect(result.height).toBe(3)
    })
    
    it("should center align items", async () => {
      const items = [
        text("Short"),
        text("Much\nLonger\nContent")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        alignItems: AlignItems.Center,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      // Should center align vertically
      expect(result.height).toBe(3)
    })
  })
  
  describe("Flex grow and shrink", () => {
    it("should grow items proportionally", async () => {
      const items = [
        text("A"),
        text("B"),
        text("C")
      ]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        items: [
          { view: items[0], flexGrow: 1 },
          { view: items[1], flexGrow: 2 },
          { view: items[2], flexGrow: 1 }
        ],
        width: 12
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.width).toBe(12)
      // Item B should get twice the space as A and C
    })
    
    it("should handle flex basis", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        items: [
          { view: items[0], flexBasis: 3 },
          { view: items[1], flexBasis: 5 }
        ]
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.width).toBe(8) // 3 + 5
    })
  })
  
  describe("Gap", () => {
    it("should add gap between items", async () => {
      const items = [text("A"), text("B"), text("C")]
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        gap: 2,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.width).toBe(7) // 3 items (3 width) + 2 gaps (4 width)
      expect(result.content).toBe("A  B  C")
    })
    
    it("should add gap in column direction", async () => {
      const items = [text("A"), text("B")]
      
      const flex = flexbox({
        direction: FlexDirection.Column,
        gap: 1,
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.height).toBe(3) // 2 items + 1 gap
      expect(result.content).toBe("A\n \nB")
    })
  })
  
  describe("Wrapping", () => {
    it("should wrap items when they exceed container width", async () => {
      const items = Array.from({ length: 5 }, (_, i) => text(`Item${i}`))
      
      const flex = flexbox({
        direction: FlexDirection.Row,
        wrap: true,
        width: 15, // Force wrapping
        items: items.map(item => ({ view: item }))
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.height).toBeGreaterThan(1) // Should wrap to multiple lines
    })
  })
  
  describe("Empty and edge cases", () => {
    it("should handle empty item list", async () => {
      const flex = flexbox({
        direction: FlexDirection.Row,
        items: []
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
      expect(result.content).toBe("")
    })
    
    it("should handle single item", async () => {
      const flex = flexbox({
        direction: FlexDirection.Row,
        items: [{ view: text("Single") }]
      })
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      expect(result.content).toBe("Single")
    })
  })
  
  describe("Performance", () => {
    it("should handle many items efficiently", async () => {
      const items = Array.from({ length: 100 }, (_, i) => 
        ({ view: text(`Item${i}`) })
      )
      
      const flex = flexbox({
        direction: FlexDirection.Column,
        items
      })
      
      const startTime = performance.now()
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* flex.render({} as any)
          return rendered
        })
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(result.height).toBe(100)
      expect(renderTime).toBeLessThan(500) // Should be reasonably fast
    })
  })
})