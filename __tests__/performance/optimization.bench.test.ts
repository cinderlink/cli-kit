/**
 * Performance Optimization Benchmarks
 * 
 * Tests optimized implementations against originals
 */

import { test, describe, expect } from "bun:test"
import { text, vstack, hstack, styledText } from "../../src/core/view"
import { style, Colors } from "../../src/styling"
import { Effect } from "effect"

// Original implementations
import { stringWidth } from "../../src/utils/string-width"
import { renderStyled } from "../../src/styling/render"

// Optimized implementations
import { stringWidthOptimized, stringWidthNoAnsi } from "../../src/utils/string-width-optimized"
import { renderStyleOptimized, styledTextOptimized } from "../../src/styling/render-optimized"
import { globalViewCache } from "../../src/core/view-cache"

describe("Performance Optimizations", () => {
  const runComparison = async (
    name: string,
    originalFn: () => void,
    optimizedFn: () => void,
    iterations = 1000
  ) => {
    // Run original
    const startOriginal = performance.now()
    for (let i = 0; i < iterations; i++) {
      originalFn()
    }
    const originalTime = performance.now() - startOriginal
    
    // Run optimized
    const startOptimized = performance.now()
    for (let i = 0; i < iterations; i++) {
      optimizedFn()
    }
    const optimizedTime = performance.now() - startOptimized
    
    const improvement = ((originalTime - optimizedTime) / originalTime) * 100
    
    console.log(`${name}:`)
    console.log(`  Original: ${originalTime.toFixed(2)}ms`)
    console.log(`  Optimized: ${optimizedTime.toFixed(2)}ms`)
    console.log(`  Improvement: ${improvement.toFixed(1)}%`)
    
    return {
      original: originalTime,
      optimized: optimizedTime,
      improvement: improvement
    }
  }

  test("string width calculation - ASCII", async () => {
    const testStrings = Array.from({ length: 100 }, (_, i) => `Test string ${i}`)
    
    const result = await runComparison(
      "String width (ASCII)",
      () => testStrings.forEach(s => stringWidth(s)),
      () => testStrings.forEach(s => stringWidthOptimized(s))
    )
    
    // Should be faster or at least not significantly slower
    expect(result.improvement).toBeGreaterThan(-50)
  })

  test("string width calculation - Unicode", async () => {
    const testStrings = Array.from({ length: 100 }, (_, i) => `测试字符串 ${i} 🎨✨`)
    
    const result = await runComparison(
      "String width (Unicode)",
      () => testStrings.forEach(s => stringWidth(s)),
      () => testStrings.forEach(s => stringWidthOptimized(s))
    )
    
    expect(result.improvement).toBeGreaterThan(-50)
  })

  test("style rendering", async () => {
    const testStyle = style().foreground(Colors.blue).background(Colors.white).bold().underline()
    const testText = "Test text"
    
    const result = await runComparison(
      "Style rendering",
      () => Effect.runSync(renderStyled(testText, testStyle)),
      () => styledTextOptimized(testText, {
        foreground: 'blue',
        background: 'white', 
        bold: true,
        underline: true
      }),
      2000 // More iterations for smaller operations
    )
    
    expect(result.improvement).toBeGreaterThan(-50)
  })

  test("styled text creation", async () => {
    const testTexts = Array.from({ length: 100 }, (_, i) => `Styled text ${i}`)
    const testStyle = style().foreground(Colors.blue).bold()
    
    const result = await runComparison(
      "Styled text creation",
      () => testTexts.forEach(text => 
        Effect.runSync(styledText(text, testStyle).render())
      ),
      () => testTexts.forEach(text => 
        styledTextOptimized(text, testStyle)
      )
    )
    
    expect(result.improvement).toBeGreaterThan(0)
  })

  test("view caching", async () => {
    const testViews = Array.from({ length: 50 }, (_, i) => 
      vstack(
        text(`Header ${i}`),
        hstack(text("Left"), text("Right")),
        text(`Footer ${i}`)
      )
    )
    
    // First render without cache
    const startUncached = performance.now()
    for (const view of testViews) {
      await Effect.runPromise(view.render())
    }
    const uncachedTime = performance.now() - startUncached
    
    // Second render with cache (simulate by rendering again)
    const startCached = performance.now()
    for (const view of testViews) {
      const key = globalViewCache.generateKey(view)
      await globalViewCache.renderCached(key, view)
    }
    const cachedTime = performance.now() - startCached
    
    const improvement = ((uncachedTime - cachedTime) / uncachedTime) * 100
    
    console.log("View caching:")
    console.log(`  Uncached: ${uncachedTime.toFixed(2)}ms`)
    console.log(`  Cached: ${cachedTime.toFixed(2)}ms`) 
    console.log(`  Improvement: ${improvement.toFixed(1)}%`)
    
    // Cache should provide some improvement on repeated renders
    expect(improvement).toBeGreaterThan(0)
  })

  test("large layout rendering", async () => {
    // Create a large nested layout
    const createLargeLayout = () => {
      const rows = Array.from({ length: 20 }, (_, i) =>
        hstack(
          styledText(`Row ${i}:`, style().foreground(Colors.blue).bold()),
          text(" "),
          ...Array.from({ length: 10 }, (_, j) => 
            styledText(`Col${j}`, style().foreground(Colors.green))
          )
        )
      )
      return vstack(...rows)
    }
    
    const result = await runComparison(
      "Large layout rendering",
      () => {
        const layout = createLargeLayout()
        Effect.runSync(layout.render())
      },
      () => {
        const layout = createLargeLayout()
        const key = globalViewCache.generateKey(layout)
        globalViewCache.renderCached(key, layout)
      },
      10 // Fewer iterations for heavy operations
    )
    
    expect(result.improvement).toBeGreaterThan(-50)
  })

  test("repeated string operations", async () => {
    const longString = "This is a long string that will be processed multiple times ".repeat(10)
    
    const result = await runComparison(
      "Repeated string width",
      () => {
        for (let i = 0; i < 100; i++) {
          stringWidth(longString)
        }
      },
      () => {
        for (let i = 0; i < 100; i++) {
          stringWidthOptimized(longString)
        }
      },
      100
    )
    
    // Caching should provide significant improvement for repeated operations
    expect(result.improvement).toBeGreaterThan(50)
  })
})