/**
 * Visual Testing - Comprehensive tests for rendering accuracy
 */

import { Effect } from "effect"
import * as View from "@/core/view.ts"
import { stringWidth } from "@/utils/string-width.ts"

/**
 * Test individual view components and their rendered output
 */
export async function testViewRendering() {
  console.log("🎨 Testing View Rendering Accuracy\n")

  // Test 1: Basic text rendering
  console.log("📝 Test 1: Basic Text")
  const text1 = View.text("Count: 123")
  const rendered1 = await Effect.runPromise(text1.render())
  console.log(`Input: "Count: 123"`)
  console.log(`Output: "${rendered1}"`)
  console.log(`Width: ${text1.width}, Expected: ${stringWidth("Count: 123")}`)
  console.log(`Match: ${rendered1 === "Count: 123" ? "✅" : "❌"}\n`)

  // Test 2: Emoji text rendering
  console.log("📝 Test 2: Emoji Text")
  const text2 = View.text("🎯 Counter App")
  const rendered2 = await Effect.runPromise(text2.render())
  console.log(`Input: "🎯 Counter App"`)
  console.log(`Output: "${rendered2}"`)
  console.log(`Width: ${text2.width}, Expected: ${stringWidth("🎯 Counter App")}`)
  console.log(`Match: ${rendered2 === "🎯 Counter App" ? "✅" : "❌"}\n`)

  // Test 3: VStack rendering
  console.log("📝 Test 3: VStack")
  const vstack = View.vstack(
    View.text("🎯 Counter App"),
    View.text(""),
    View.text("Count: 0"),
    View.text("Last: Started")
  )
  const rendered3 = await Effect.runPromise(vstack.render())
  const expected3 = "🎯 Counter App\n\nCount: 0\nLast: Started"
  console.log(`VStack output:`)
  console.log(`"${rendered3.replace(/\n/g, '\\n')}"`)
  console.log(`Expected:`)
  console.log(`"${expected3.replace(/\n/g, '\\n')}"`)
  console.log(`Width: ${vstack.width}, Height: ${vstack.height}`)
  console.log(`Match: ${rendered3 === expected3 ? "✅" : "❌"}\n`)

  // Test 4: Box rendering
  console.log("📝 Test 4: Box Rendering")
  const content = View.vstack(
    View.text("🎯 Counter App"),
    View.text(""),
    View.text("Count: 0"),
    View.text("Last: Started")
  )
  const boxed = View.box(content)
  const rendered4 = await Effect.runPromise(boxed.render())
  
  console.log(`Box output:`)
  console.log(rendered4)
  console.log(`Box width: ${boxed.width}, height: ${boxed.height}`)
  
  // Validate box structure
  const lines = rendered4.split('\n')
  console.log(`Number of lines: ${lines.length}`)
  
  // Check each line
  lines.forEach((line, i) => {
    const lineWidth = stringWidth(line)
    console.log(`Line ${i}: width=${lineWidth}, content="${line}"`)
  })
  
  // Test for box integrity
  const hasTopBorder = lines[0].startsWith('┌') && lines[0].endsWith('┐')
  const hasBottomBorder = lines[lines.length - 1].startsWith('└') && lines[lines.length - 1].endsWith('┘')
  const hasLeftBorder = lines.slice(1, -1).every(line => line.startsWith('│'))
  const hasRightBorder = lines.slice(1, -1).every(line => line.endsWith('│'))
  
  console.log(`Box integrity:`)
  console.log(`  Top border: ${hasTopBorder ? "✅" : "❌"}`)
  console.log(`  Bottom border: ${hasBottomBorder ? "✅" : "❌"}`)
  console.log(`  Left border: ${hasLeftBorder ? "✅" : "❌"}`)
  console.log(`  Right border: ${hasRightBorder ? "✅" : "❌"}\n`)

  // Test 5: Styled text
  console.log("📝 Test 5: Styled Text")
  const bold = View.bold(View.text("Count: 123"))
  const dim = View.dim(View.text("Last: Started"))
  const rendered5a = await Effect.runPromise(bold.render())
  const rendered5b = await Effect.runPromise(dim.render())
  
  console.log(`Bold: "${rendered5a}"`)
  console.log(`Dim: "${rendered5b}"`)
  console.log(`Bold width: ${bold.width}, Dim width: ${dim.width}`)
  
  // Check if ANSI codes are present
  const hasBoldAnsi = rendered5a.includes('\x1b[1m') && rendered5a.includes('\x1b[0m')
  const hasDimAnsi = rendered5b.includes('\x1b[2m') && rendered5b.includes('\x1b[0m')
  
  console.log(`Bold ANSI: ${hasBoldAnsi ? "✅" : "❌"}`)
  console.log(`Dim ANSI: ${hasDimAnsi ? "✅" : "❌"}\n`)

  // Test 6: Center alignment
  console.log("📝 Test 6: Center Alignment")
  const centered = View.center(View.text("Test"), 20)
  const rendered6 = await Effect.runPromise(centered.render())
  console.log(`Centered in 20 chars: "${rendered6}"`)
  console.log(`Length: ${rendered6.length}, Expected: 20`)
  console.log(`Centered correctly: ${rendered6.length === 20 ? "✅" : "❌"}\n`)
}

/**
 * Test the complete counter component rendering
 */
export async function testCounterRendering() {
  console.log("🧮 Testing Counter Component Rendering\n")
  
  // Import the counter component
  const { CounterComponent } = await import("../../examples/counter.ts")
  
  // Test initial state
  const [initialModel, _] = await Effect.runPromise(CounterComponent.init)
  const initialView = CounterComponent.view(initialModel)
  const rendered = await Effect.runPromise(initialView.render())
  
  console.log("Counter initial render:")
  console.log(rendered)
  console.log()
  
  // Test after increment
  const [incrementedModel, __] = await Effect.runPromise(
    CounterComponent.update({ _tag: "Increment" }, initialModel)
  )
  const incrementedView = CounterComponent.view(incrementedModel)
  const incrementedRendered = await Effect.runPromise(incrementedView.render())
  
  console.log("Counter after increment:")
  console.log(incrementedRendered)
  console.log()
  
  // Analyze the structure
  const lines = rendered.split('\n')
  console.log("Analysis:")
  console.log(`Total lines: ${lines.length}`)
  lines.forEach((line, i) => {
    console.log(`Line ${i}: width=${stringWidth(line)}, "${line}"`)
  })
}

/**
 * Test the complete renderer pipeline
 */
export async function testRendererPipeline() {
  console.log("🔧 Testing Complete Renderer Pipeline\n")
  
  const { Effect, Layer, Ref } = await import("effect")
  const { RendererServiceLive } = await import("../services/impl/renderer-impl.ts")
  const { TerminalServiceLive } = await import("../services/impl/terminal-impl.ts")
  
  // Create a mock terminal buffer to capture output
  class MockTerminal {
    buffer: string[] = []
    x = 1
    y = 1
    
    moveCursor = (x: number, y: number) => 
      Effect.sync(() => {
        this.x = x
        this.y = y
        this.buffer.push(`MOVE(${x},${y})`)
      })
    
    write = (text: string) =>
      Effect.sync(() => {
        this.buffer.push(`WRITE("${text}")`)
      })
      
    getSize = Effect.succeed({ width: 80, height: 24 })
    
    clear = Effect.sync(() => {
      this.buffer = []
    })
    
    hideCursor = Effect.void
    showCursor = Effect.void
    enableAltBuffer = Effect.void
    disableAltBuffer = Effect.void
    enableRawMode = Effect.void
    disableRawMode = Effect.void
  }
  
  const mockTerminal = new MockTerminal()
  
  // Create mock terminal service layer
  const MockTerminalLayer = Layer.succeed({
    moveCursor: mockTerminal.moveCursor,
    write: mockTerminal.write,
    getSize: mockTerminal.getSize,
    clear: mockTerminal.clear,
    hideCursor: mockTerminal.hideCursor,
    showCursor: mockTerminal.showCursor,
    enableAltBuffer: mockTerminal.enableAltBuffer,
    disableAltBuffer: mockTerminal.disableAltBuffer,
    enableRawMode: mockTerminal.enableRawMode,
    disableRawMode: mockTerminal.disableRawMode
  })
  
  try {
    const program = Effect.gen(function* (_) {
      const renderer = yield* _({ RendererService: RendererServiceLive })
      
      // Test 1: Simple text rendering
      console.log("📝 Test 1: Simple text through renderer")
      yield* _(renderer.beginFrame)
      yield* _(renderer.renderAt(View.text("Hello World"), 5, 5))
      yield* _(renderer.endFrame)
      
      console.log("Terminal commands:")
      mockTerminal.buffer.forEach(cmd => console.log(`  ${cmd}`))
      console.log()
      
      // Test 2: Styled text rendering
      console.log("📝 Test 2: Styled text through renderer")
      mockTerminal.buffer = []
      yield* _(renderer.beginFrame)
      yield* _(renderer.renderAt(View.bold(View.text("Bold Text")), 10, 10))
      yield* _(renderer.endFrame)
      
      console.log("Terminal commands:")
      mockTerminal.buffer.forEach(cmd => console.log(`  ${cmd}`))
      console.log()
      
      // Test 3: Box rendering
      console.log("📝 Test 3: Box through renderer")
      mockTerminal.buffer = []
      yield* _(renderer.beginFrame)
      const boxView = View.box(View.text("Test"))
      yield* _(renderer.renderAt(boxView, 0, 0))
      yield* _(renderer.endFrame)
      
      console.log("Terminal commands:")
      mockTerminal.buffer.forEach(cmd => console.log(`  ${cmd}`))
      console.log()
      
      // Verify no literal ANSI codes in output
      const hasLiteralAnsi = mockTerminal.buffer.some(cmd => 
        cmd.includes('WRITE("[1m') || cmd.includes('WRITE("[0m') || 
        cmd.includes('WRITE("[2m'))
      
      console.log(`No literal ANSI in output: ${!hasLiteralAnsi ? "✅" : "❌"}`)
      
      // Verify proper ANSI escape sequences
      const hasProperAnsi = mockTerminal.buffer.some(cmd =>
        cmd.includes('WRITE("\\x1b[1m') || cmd.includes('WRITE("\\x1b[0m'))
        
      console.log(`Proper ANSI sequences: ${hasProperAnsi ? "✅" : "❌"}`)
    })
    
    const layer = Layer.provide(MockTerminalLayer, RendererServiceLive)
    await Effect.runPromise(Effect.provide(program, layer))
    
  } catch (error) {
    console.error("❌ Renderer pipeline test failed:", error)
  }
}

/**
 * Run all visual tests
 */
export async function runVisualTests() {
  try {
    await testViewRendering()
    console.log("─".repeat(60))
    await testCounterRendering()
    console.log("─".repeat(60))
    await testRendererPipeline()
    console.log("\n🎯 Visual tests completed!")
  } catch (error) {
    console.error("❌ Visual tests failed:", error)
  }
}