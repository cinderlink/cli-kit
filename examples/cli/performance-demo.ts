/**
 * Performance Demo
 * 
 * Demonstrates the performance optimization features in CLI-KIT
 */

import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { createLazyHandler, preloadHandlers, globalLazyCache } from "../../src/cli/lazy-cache"
import { globalViewCache } from "../../src/core/view-cache"
import { getStyleCacheStats, clearStyleCache } from "../../src/styling/render-optimized"
import { getWidthCacheStats, clearWidthCache } from "../../src/utils/string-width-optimized"
import { text, vstack, hstack, styledText } from "../../src/core/view"
import { style, Colors } from "../../src/styling"
import { z } from "zod"

// Create some lazy-loaded commands to demonstrate lazy loading
const heavyCommand = createLazyHandler(
  "./heavy-command",
  async () => {
    // Simulate a heavy command that takes time to load
    await new Promise(resolve => setTimeout(resolve, 100))
    return (args: any) => {
      console.log("Heavy command executed!")
      return text("Heavy command completed")
    }
  }
)

const dataCommand = createLazyHandler(
  "./data-command", 
  async () => {
    return (args: any) => {
      // Create a large data structure to test view caching
      const items = Array.from({ length: 100 }, (_, i) => 
        hstack(
          styledText(`Item ${i}:`, style().foreground(Colors.blue).bold()),
          text(` Value ${i * 2}`)
        )
      )
      
      return vstack(
        text("Large Data Set"),
        text(""),
        ...items
      )
    }
  }
)

// Performance testing command
const perfTestHandler = (args: any) => {
  console.log("Running performance tests...")
  
  // Test 1: String width calculation performance
  console.log("\n📏 String Width Performance:")
  const testStrings = [
    "Simple ASCII text",
    "Unicode: 世界 🌟",
    "Mixed: Hello 世界 🎨 Test",
    "Long: " + "A".repeat(100)
  ]
  
  testStrings.forEach(str => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      // Using the optimized string width function
      const { stringWidthOptimized } = require("../../src/utils/string-width-optimized")
      stringWidthOptimized(str)
    }
    const end = performance.now()
    console.log(`  "${str.slice(0, 20)}...": ${(end - start).toFixed(2)}ms (1000 iterations)`)
  })
  
  // Test 2: Style rendering performance
  console.log("\n🎨 Style Rendering Performance:")
  const testStyles = [
    { foreground: "red", bold: true },
    { foreground: "#ff0000", background: "#ffffff" },
    { foreground: "blue", italic: true, underline: true }
  ]
  
  testStyles.forEach((testStyle, i) => {
    const start = performance.now()
    for (let j = 0; j < 1000; j++) {
      const { styledTextOptimized } = require("../../src/styling/render-optimized")
      styledTextOptimized("Test text", testStyle)
    }
    const end = performance.now()
    console.log(`  Style ${i + 1}: ${(end - start).toFixed(2)}ms (1000 iterations)`)
  })
  
  // Test 3: View caching benefit
  console.log("\n📦 View Caching Performance:")
  const complexView = vstack(
    text("Header"),
    ...Array.from({ length: 20 }, (_, i) => 
      styledText(`Item ${i}`, style().foreground(Colors.green))
    ),
    text("Footer")
  )
  
  // First render (uncached)
  const start1 = performance.now()
  globalViewCache.renderCached("complex-view", complexView)
  const uncachedTime = performance.now() - start1
  
  // Second render (cached)
  const start2 = performance.now()
  globalViewCache.renderCached("complex-view", complexView)
  const cachedTime = performance.now() - start2
  
  console.log(`  Uncached: ${uncachedTime.toFixed(2)}ms`)
  console.log(`  Cached: ${cachedTime.toFixed(2)}ms`)
  console.log(`  Improvement: ${((uncachedTime - cachedTime) / uncachedTime * 100).toFixed(1)}%`)
  
  return text("Performance tests completed! Check console output for results.")
}

// Cache statistics command
const statsHandler = (args: any) => {
  const viewStats = globalViewCache.getStats()
  const styleStats = getStyleCacheStats()
  const widthStats = getWidthCacheStats()
  const lazyStats = globalLazyCache.getStats()
  
  return vstack(
    styledText("Cache Statistics", style().foreground(Colors.blue).bold()),
    text(""),
    
    styledText("📦 View Cache:", style().foreground(Colors.green)),
    text(`  Size: ${viewStats.size} entries`),
    text(`  Total Access: ${viewStats.totalAccess}`),
    text(`  Average Age: ${viewStats.avgAge.toFixed(0)}ms`),
    text(""),
    
    styledText("🎨 Style Cache:", style().foreground(Colors.yellow)),
    text(`  Size: ${styleStats.size} entries`),
    text(""),
    
    styledText("📏 Width Cache:", style().foreground(Colors.cyan)),
    text(`  Size: ${widthStats.size} entries`),
    text(`  Max Size: ${widthStats.maxSize}`),
    text(""),
    
    styledText("⚡ Lazy Cache:", style().foreground(Colors.magenta)),
    text(`  Size: ${lazyStats.size} entries`),
    text(`  Total Hits: ${lazyStats.hits}`),
    text(`  Average Load Time: ${lazyStats.avgLoadTime.toFixed(2)}ms`),
    text(`  Most Used: ${lazyStats.mostUsed.slice(0, 3).join(", ")}`)
  )
}

// Clear caches command
const clearHandler = (args: any) => {
  globalViewCache.clear()
  clearStyleCache()
  clearWidthCache()
  globalLazyCache.clear()
  
  return styledText("✓ All caches cleared!", style().foreground(Colors.green))
}

const config = defineConfig({
  name: "performance-demo",
  version: "1.0.0",
  description: "Demonstrates CLI-KIT performance optimizations",
  
  commands: {
    // Regular command
    perf: {
      description: "Run performance benchmarks",
      handler: perfTestHandler
    },
    
    stats: {
      description: "Show cache statistics",
      handler: statsHandler
    },
    
    clear: {
      description: "Clear all caches",
      handler: clearHandler
    },
    
    // Lazy-loaded commands
    heavy: {
      description: "Execute a heavy command (lazy-loaded)",
      handler: heavyCommand
    },
    
    data: {
      description: "Display large data set (lazy-loaded)",
      handler: dataCommand
    },
    
    demo: {
      description: "Interactive performance demo",
      handler: (args: any) => {
        return vstack(
          styledText("🚀 CLI-KIT Performance Demo", style().foreground(Colors.blue).bold()),
          text(""),
          text("Available commands:"),
          text(""),
          hstack(styledText("perf", style().foreground(Colors.green)), text("  - Run performance benchmarks")),
          hstack(styledText("stats", style().foreground(Colors.green)), text(" - Show cache statistics")), 
          hstack(styledText("clear", style().foreground(Colors.green)), text(" - Clear all caches")),
          hstack(styledText("heavy", style().foreground(Colors.yellow)), text(" - Execute heavy command (lazy)")),
          hstack(styledText("data", style().foreground(Colors.yellow)), text("  - Show large data set (lazy)")),
          text(""),
          text("💡 Tips:"),
          text("• Run 'perf' to see performance improvements"),
          text("• Use 'stats' to monitor cache usage"),
          text("• Try 'heavy' and 'data' multiple times to see lazy loading"),
          text("• Use 'clear' to reset caches and compare performance")
        )
      }
    }
  }
})

// Preload the heavy commands in the background
preloadHandlers([heavyCommand, dataCommand])

// Run the CLI
if (import.meta.main) {
  runCLI(config)
}