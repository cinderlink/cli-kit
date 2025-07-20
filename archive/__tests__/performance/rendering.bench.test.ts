/**
 * Rendering Performance Benchmarks
 * 
 * Tests rendering performance of various UI components
 */

import { test, describe, expect } from "bun:test"
import { text, vstack, hstack, styledText } from "../../../src/core/view"
import { style, Colors } from "../../../src/styling"
import { Panel } from "../../../src/components/builders/Panel"
import { Effect } from "effect"

describe("Rendering Performance", () => {
  const runTimed = async (name: string, fn: () => void, iterations = 1000) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      fn()
    }
    const end = performance.now()
    const total = end - start
    const avg = total / iterations
    console.log(`${name}: ${total.toFixed(2)}ms total, ${avg.toFixed(4)}ms avg (${iterations} iterations)`)
    return { total, avg, iterations }
  }

  test("simple text rendering", async () => {
    const result = await runTimed("Simple text", () => {
      const view = text("Hello, World!")
      Effect.runSync(view.render())
    })
    expect(result.avg).toBeLessThan(1) // Should be under 1ms per render
  })
  
  test("styled text rendering", async () => {
    const result = await runTimed("Styled text", () => {
      const view = styledText(
        "Styled text with colors and decorations",
        style().foreground(Colors.blue).background(Colors.white).bold().underline()
      )
      Effect.runSync(view.render())
    })
    expect(result.avg).toBeLessThan(2) // Styled text can be a bit slower
  })
  
  test("vstack with 10 items", async () => {
    const items = Array.from({ length: 10 }, (_, i) => text(`Item ${i}`))
    
    const result = await runTimed("VStack 10 items", () => {
      const view = vstack(...items)
      Effect.runSync(view.render())
    })
    expect(result.avg).toBeLessThan(5)
  })
  
  test("vstack with 100 items", async () => {
    const items = Array.from({ length: 100 }, (_, i) => text(`Item ${i}`))
    
    const result = await runTimed("VStack 100 items", () => {
      const view = vstack(...items)
      Effect.runSync(view.render())
    }, 100) // Fewer iterations for heavy tests
    expect(result.avg).toBeLessThan(50)
  })
  
  test("nested layout rendering", async () => {
    const result = await runTimed("Nested layout", () => {
      const rows = Array.from({ length: 10 }, (_, i) =>
        hstack(
          text(`Row ${i}:`),
          ...Array.from({ length: 5 }, (_, j) => text(` Col${j}`))
        )
      )
      const view = vstack(...rows)
      Effect.runSync(view.render())
    })
    expect(result.avg).toBeLessThan(10)
  })
  
  test("panel rendering", async () => {
    const result = await runTimed("Panel", () => {
      const view = Panel(
        text("Panel content"),
        { title: "Test Panel" }
      )
      Effect.runSync(view.render())
    })
    expect(result.avg).toBeLessThan(5)
  })
})