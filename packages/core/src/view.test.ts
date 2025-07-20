/**
 * Tests for view system and basic view primitives
 */

import { test, expect } from "bun:test"
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
} from "./view.ts"

// =============================================================================
// Basic View Creation Tests
// =============================================================================

test("text should create view with content", async () => {
  const view = text("Hello, World!")
  
  expect(view.width).toBe(13)
  expect(view.height).toBe(1)
  
  const content = await Effect.runPromise(view.render())
  expect(content).toBe("Hello, World!")
})

test("text should handle multi-line content", async () => {
  const view = text("Line 1\nLine 2\nLonger Line 3")
  
  expect(view.width).toBe(13) // "Longer Line 3" is longest
  expect(view.height).toBe(3)
  
  const content = await Effect.runPromise(view.render())
  expect(content).toBe("Line 1\nLine 2\nLonger Line 3")
})

test("empty should create empty view", async () => {
  expect(empty.width).toBe(0)
  expect(empty.height).toBe(1)
  
  const content = await Effect.runPromise(empty.render())
  expect(content).toBe("")
})

test("createView should be alias for text", () => {
  const view1 = text("test")
  const view2 = createView("test")
  
  expect(view1.width).toBe(view2.width)
  expect(view1.height).toBe(view2.height)
})

// =============================================================================
// Type Guard Tests
// =============================================================================

test("isView should correctly identify views", () => {
  const view = text("test")
  const notView = { message: "not a view" }
  const nullValue = null
  const undefinedValue = undefined
  const stringValue = "string"
  const functionValue = () => "function"
  const objectWithRender = { render: () => Effect.succeed("test") }
  const objectWithWrongRender = { render: "not a function" }
  
  expect(isView(view)).toBe(true)
  expect(isView(objectWithRender)).toBe(true)
  expect(isView(notView)).toBe(false)
  expect(isView(nullValue)).toBe(false)
  expect(isView(undefinedValue)).toBe(false)
  expect(isView(stringValue)).toBe(false)
  expect(isView(functionValue)).toBe(false)
  expect(isView(objectWithWrongRender)).toBe(false)
})

// =============================================================================
// View Utility Tests
// =============================================================================

test("measureView should return view dimensions", async () => {
  const view = text("Hello\nWorld")
  
  const dimensions = await Effect.runPromise(measureView(view))
  
  expect(dimensions.width).toBe(5)
  expect(dimensions.height).toBe(2)
})

test("measureView should handle views without dimensions", async () => {
  const view = { render: () => Effect.succeed("test") } // No width/height
  
  const dimensions = await Effect.runPromise(measureView(view))
  
  expect(dimensions.width).toBe(0)
  expect(dimensions.height).toBe(0)
})

test("renderView should render view content", async () => {
  const view = text("Test content")
  
  const content = await Effect.runPromise(renderView(view))
  
  expect(content).toBe("Test content")
})

// =============================================================================
// Layout Tests
// =============================================================================

test("vstack should combine views vertically", async () => {
  const view1 = text("First")
  const view2 = text("Second")
  const view3 = text("Third")
  
  const stacked = vstack(view1, view2, view3)
  
  expect(stacked.width).toBe(6) // "Second" is longest
  expect(stacked.height).toBe(3)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("First\nSecond\nThird")
})

test("vstack should handle empty views", async () => {
  const view1 = text("Content")
  const emptyView = empty
  const view2 = text("More")
  
  const stacked = vstack(view1, emptyView, view2)
  
  expect(stacked.width).toBe(7) // "Content" is longest
  expect(stacked.height).toBe(3)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("Content\n\nMore")
})

test("hstack should combine views horizontally", async () => {
  const view1 = text("Left")
  const view2 = text("Right")
  
  const stacked = hstack(view1, view2)
  
  expect(stacked.width).toBe(9) // 4 + 5
  expect(stacked.height).toBe(1)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("LeftRight")
})

test("hstack should handle multi-line views", async () => {
  const view1 = text("L1\nL2")
  const view2 = text("R1\nR2\nR3")
  
  const stacked = hstack(view1, view2)
  
  expect(stacked.width).toBe(4) // 2 + 2
  expect(stacked.height).toBe(3) // max height
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("L1R1\nL2R2\n  R3") // L1/L2 padded to 2 chars, empty line for missing L3
})

test("hstack should pad shorter views to match height", async () => {
  const view1 = text("A")
  const view2 = text("B1\nB2\nB3")
  
  const stacked = hstack(view1, view2)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("AB1\n B2\n B3") // A padded with space, then empty lines
})

// =============================================================================
// Box Tests
// =============================================================================

test("box should create border around view", async () => {
  const view = text("Hello")
  const boxed = box(view)
  
  expect(boxed.width).toBe(9) // 5 + 4 for border
  expect(boxed.height).toBe(3) // 1 + 2 for top/bottom
  
  const content = await Effect.runPromise(boxed.render())
  const lines = content.split('\n')
  
  expect(lines[0]).toBe("┌───────┐")
  expect(lines[1]).toBe("│ Hello │")
  expect(lines[2]).toBe("└───────┘")
})

test("box should handle multi-line content", async () => {
  const view = text("Line1\nLine2")
  const boxed = box(view)
  
  const content = await Effect.runPromise(boxed.render())
  const lines = content.split('\n')
  
  expect(lines[0]).toBe("┌───────┐")
  expect(lines[1]).toBe("│ Line1 │")
  expect(lines[2]).toBe("│ Line2 │")
  expect(lines[3]).toBe("└───────┘")
})

test("box should handle lines of different lengths", async () => {
  const view = text("Short\nMuch longer line")
  const boxed = box(view)
  
  const content = await Effect.runPromise(boxed.render())
  const lines = content.split('\n')
  
  expect(lines[0]).toBe("┌──────────────────┐")
  expect(lines[1]).toBe("│ Short            │")
  expect(lines[2]).toBe("│ Much longer line │")
  expect(lines[3]).toBe("└──────────────────┘")
})

// =============================================================================
// Center Tests
// =============================================================================

test("center should center view within given width", async () => {
  const view = text("Hello")
  const centered = center(view, 10)
  
  expect(centered.width).toBe(10)
  expect(centered.height).toBe(view.height)
  
  const content = await Effect.runPromise(centered.render())
  expect(content).toBe("  Hello   ") // 2 left + 5 content + 3 right = 10
})

test("center should handle multi-line content", async () => {
  const view = text("Hi\nBye")
  const centered = center(view, 8)
  
  const content = await Effect.runPromise(centered.render())
  expect(content).toBe("   Hi   \n  Bye   ") // Each line centered individually
})

test("center should handle content wider than total width", async () => {
  const view = text("Very long content")
  const centered = center(view, 5)
  
  const content = await Effect.runPromise(centered.render())
  expect(content).toBe("Very long content") // No padding added when content is wider
})

// =============================================================================
// Styling Tests
// =============================================================================

test("styled should apply ANSI codes", async () => {
  const view = text("Hello")
  const styledView = styled(view, "\x1b[31m") // Red
  
  expect(styledView.width).toBe(view.width)
  expect(styledView.height).toBe(view.height)
  
  const content = await Effect.runPromise(styledView.render())
  expect(content).toBe("\x1b[31mHello\x1b[0m")
})

test("bold should apply bold styling", async () => {
  const view = text("Bold text")
  const boldView = bold(view)
  
  const content = await Effect.runPromise(boldView.render())
  expect(content).toBe("\x1b[1mBold text\x1b[0m")
})

test("dim should apply dim styling", async () => {
  const view = text("Dim text")
  const dimView = dim(view)
  
  const content = await Effect.runPromise(dimView.render())
  expect(content).toBe("\x1b[2mDim text\x1b[0m")
})

test("italic should apply italic styling", async () => {
  const view = text("Italic text")
  const italicView = italic(view)
  
  const content = await Effect.runPromise(italicView.render())
  expect(content).toBe("\x1b[3mItalic text\x1b[0m")
})

test("underline should apply underline styling", async () => {
  const view = text("Underlined")
  const underlinedView = underline(view)
  
  const content = await Effect.runPromise(underlinedView.render())
  expect(content).toBe("\x1b[4mUnderlined\x1b[0m")
})

test("color functions should apply correct color codes", async () => {
  const testText = "Color"
  const view = text(testText)
  
  const redView = red(view)
  const redContent = await Effect.runPromise(redView.render())
  expect(redContent).toBe("\x1b[31mColor\x1b[0m")
  
  const greenView = green(view)
  const greenContent = await Effect.runPromise(greenView.render())
  expect(greenContent).toBe("\x1b[32mColor\x1b[0m")
  
  const yellowView = yellow(view)
  const yellowContent = await Effect.runPromise(yellowView.render())
  expect(yellowContent).toBe("\x1b[33mColor\x1b[0m")
  
  const blueView = blue(view)
  const blueContent = await Effect.runPromise(blueView.render())
  expect(blueContent).toBe("\x1b[34mColor\x1b[0m")
  
  const magentaView = magenta(view)
  const magentaContent = await Effect.runPromise(magentaView.render())
  expect(magentaContent).toBe("\x1b[35mColor\x1b[0m")
  
  const cyanView = cyan(view)
  const cyanContent = await Effect.runPromise(cyanView.render())
  expect(cyanContent).toBe("\x1b[36mColor\x1b[0m")
  
  const whiteView = white(view)
  const whiteContent = await Effect.runPromise(whiteView.render())
  expect(whiteContent).toBe("\x1b[37mColor\x1b[0m")
})

// =============================================================================
// Styled Text Tests
// =============================================================================

test("styledText should create styled view with basic style stub", async () => {
  // Create a basic style stub - core package provides minimal styling
  const testStyle = { get: () => null }
  const styledView = styledText("Styled", testStyle)
  
  expect(styledView.width).toBe(6) // "Styled" length
  expect(styledView.height).toBe(1)
  
  const content = await Effect.runPromise(styledView.render())
  expect(content).toBe("Styled") // Basic stub just returns the text
})

test("styledText should respect style dimensions when provided", async () => {
  // Test with width/height provided by style
  const testStyle = { 
    get: (prop: string) => {
      if (prop === "width") return 20
      if (prop === "height") return 5
      return null
    }
  }
  const styledView = styledText("Test", testStyle)
  
  expect(styledView.width).toBe(20)
  expect(styledView.height).toBe(5)
})

test("styledText should handle multi-line content", async () => {
  // Basic test with multi-line content
  const testStyle = { get: () => null }
  const styledView = styledText("Line 1\nLine 2", testStyle)
  
  expect(styledView.height).toBe(2)
  
  const content = await Effect.runPromise(styledView.render())
  expect(content).toBe("Line 1\nLine 2")
})

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

test("views should handle empty string content", async () => {
  const view = text("")
  
  expect(view.width).toBe(0)
  expect(view.height).toBe(1)
  
  const content = await Effect.runPromise(view.render())
  expect(content).toBe("")
})

test("vstack should handle single view", async () => {
  const view = text("Single")
  const stacked = vstack(view)
  
  expect(stacked.width).toBe(6)
  expect(stacked.height).toBe(1)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("Single")
})

test("hstack should handle single view", async () => {
  const view = text("Single")
  const stacked = hstack(view)
  
  expect(stacked.width).toBe(6)
  expect(stacked.height).toBe(1)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("Single")
})

test("vstack should handle no views", async () => {
  const stacked = vstack()
  
  expect(stacked.width).toBe(-Infinity) // Math.max of empty array
  expect(stacked.height).toBe(0)
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("")
})

test("hstack should handle no views", async () => {
  const stacked = hstack()
  
  expect(stacked.width).toBe(0)
  expect(stacked.height).toBe(-Infinity) // Math.max of empty array
  
  const content = await Effect.runPromise(stacked.render())
  expect(content).toBe("")
})

test("center should handle zero width", async () => {
  const view = text("Test")
  const centered = center(view, 0)
  
  expect(centered.width).toBe(0)
  
  const content = await Effect.runPromise(centered.render())
  expect(content).toBe("Test") // No padding added
})

test("styling should preserve view dimensions", async () => {
  const originalView = text("Multi\nLine\nContent")
  const styledView = bold(red(underline(originalView)))
  
  expect(styledView.width).toBe(originalView.width)
  expect(styledView.height).toBe(originalView.height)
})

test("complex layout combinations should work", async () => {
  const header = center(bold(text("HEADER")), 20)
  const left = box(text("Left\nPanel"))
  const right = box(text("Right\nPanel"))
  const body = hstack(left, right)
  const page = vstack(header, body)
  
  expect(page.width).toBe(20) // Max of header(20) and body widths
  
  const content = await Effect.runPromise(page.render())
  expect(content).toContain("HEADER")
  expect(content).toContain("Left")
  expect(content).toContain("Right")
})