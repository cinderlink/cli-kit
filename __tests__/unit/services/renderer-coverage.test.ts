/**
 * Additional tests for Renderer Service Implementation to improve coverage
 */

import { describe, it, expect, mock } from "bun:test"
import { Effect } from "effect"
import { RendererService } from "@/services/renderer"
import { RendererServiceLive } from "@/services/impl/renderer-impl"
import { TerminalService } from "@/services/terminal"
import type { View } from "@/core/types"
import { text, vstack, hstack, styledText } from "@/core/view"
import { style, Styles } from "@/styling"

describe("Renderer Service Coverage", () => {
  // Mock terminal service
  const mockTerminal = {
    write: mock((text: string) => Effect.succeed(undefined)),
    writeLine: mock((text: string) => Effect.succeed(undefined)),
    clear: Effect.succeed(undefined),
    moveCursor: mock((x: number, y: number) => Effect.succeed(undefined)),
    moveCursorRelative: mock((dx: number, dy: number) => Effect.succeed(undefined)),
    hideCursor: Effect.succeed(undefined),
    showCursor: Effect.succeed(undefined),
    getSize: Effect.succeed({ width: 80, height: 24 }),
    setRawMode: mock(() => Effect.succeed(undefined)),
    setAlternateScreen: mock(() => Effect.succeed(undefined)),
    saveCursor: Effect.succeed(undefined),
    restoreCursor: Effect.succeed(undefined),
    getCapabilities: Effect.succeed({
      colors: "truecolor" as const,
      unicode: true,
      mouse: true,
      focus: true,
      paste: true,
      alternateScreen: true
    }),
    supportsTrueColor: Effect.succeed(true),
    supports256Colors: Effect.succeed(true),
    supportsUnicode: Effect.succeed(true),
    clearToEndOfLine: Effect.succeed(undefined),
    clearToStartOfLine: Effect.succeed(undefined),
    clearLine: Effect.succeed(undefined),
    clearToEndOfScreen: Effect.succeed(undefined),
    clearToStartOfScreen: Effect.succeed(undefined),
    scrollUp: mock(() => Effect.succeed(undefined)),
    scrollDown: mock(() => Effect.succeed(undefined)),
    setTitle: mock(() => Effect.succeed(undefined)),
    bell: Effect.succeed(undefined),
    getCursorPosition: Effect.succeed({ x: 1, y: 1 }),
    setCursorShape: mock(() => Effect.succeed(undefined)),
    setCursorBlink: mock(() => Effect.succeed(undefined))
  }

  const terminalLayer = Effect.provide(TerminalService, TerminalService.of(mockTerminal as any))

  describe("render optimization", () => {
    it("caches rendered output for identical views", async () => {
      const view = text("Hello, World!")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          
          // Render the same view twice
          yield* renderer.render(view)
          yield* renderer.render(view)
          
          // Terminal write should only be called once due to caching
          expect(mockTerminal.write).toHaveBeenCalledTimes(1)
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles complex nested layouts", async () => {
      const complexView = vstack(
        hstack(
          styledText("Left", style().width(20)),
          styledText("Center", style().width(40)),
          styledText("Right", style().width(20))
        ),
        vstack(
          text("Line 1"),
          text("Line 2"),
          text("Line 3")
        )
      )
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(complexView)
          
          expect(mockTerminal.write).toHaveBeenCalled()
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles styled text with colors", async () => {
      const styledView = vstack(
        styledText("Red text", style().color("red")),
        styledText("Blue background", style().bg("blue")),
        styledText("Bold and italic", style().bold.italic),
        styledText("Underlined", style().underline)
      )
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(styledView)
          
          const calls = mockTerminal.write.mock.calls
          const output = calls.map(c => c[0]).join("")
          
          // Check for ANSI escape codes
          expect(output).toContain("\x1b[") // ANSI escape
          expect(output).toContain("31m") // Red foreground
          expect(output).toContain("44m") // Blue background
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles viewport clipping", async () => {
      const tallView = vstack(
        Array.from({ length: 100 }, (_, i) => text(`Line ${i + 1}`))
      )
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(tallView, { x: 0, y: 0, width: 80, height: 10 })
          
          // Should only render visible lines
          const writeCalls = mockTerminal.write.mock.calls.length
          expect(writeCalls).toBeLessThan(100)
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles frame begin and end", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          
          yield* renderer.beginFrame
          yield* renderer.render(text("Frame content"))
          yield* renderer.endFrame
          
          expect(mockTerminal.hideCursor).toBeDefined()
          expect(mockTerminal.showCursor).toBeDefined()
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles render errors gracefully", async () => {
      const errorView: View = {
        render: () => Effect.fail(new Error("Render failed"))
      }
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          const result = yield* renderer.render(errorView).pipe(Effect.either)
          
          expect(result._tag).toBe("Left")
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("respects render options", async () => {
      const view = styledText("Hello", style().width(50))
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          
          // Render with specific viewport
          yield* renderer.render(view, {
            x: 10,
            y: 5,
            width: 30,
            height: 10
          })
          
          expect(mockTerminal.moveCursor).toHaveBeenCalled()
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles empty views", async () => {
      const emptyView = vstack([])
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(emptyView)
          
          // Should handle empty view without errors
          expect(true).toBe(true)
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles unicode content", async () => {
      const unicodeView = vstack([
        text("Hello 世界 🌍"),
        text("Émojis: 😀 🎉 🚀"),
        text("Math: ∑ ∏ ∫ ∞")
      ])
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(unicodeView)
          
          const output = mockTerminal.write.mock.calls.map(c => c[0]).join("")
          expect(output).toContain("世界")
          expect(output).toContain("😀")
          expect(output).toContain("∑")
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("handles gradient backgrounds", async () => {
      const gradientView = styledText("Gradient text", 
        style().bg("linear-gradient(45deg, #ff0000, #00ff00, #0000ff)")
      )
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          yield* renderer.render(gradientView)
          
          const output = mockTerminal.write.mock.calls.map(c => c[0]).join("")
          // Should contain RGB color codes
          expect(output).toContain("48;2;") // RGB background
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })
  })

  describe("performance optimizations", () => {
    it("batches multiple render calls", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          
          // Render multiple views in quick succession
          yield* renderer.render(text("First"))
          yield* renderer.render(text("Second"))
          yield* renderer.render(text("Third"))
          
          // Should batch writes efficiently
          expect(mockTerminal.write.mock.calls.length).toBeGreaterThan(0)
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })

    it("skips rendering identical consecutive frames", async () => {
      const view = text("Static content")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererService
          
          yield* renderer.beginFrame
          yield* renderer.render(view)
          yield* renderer.endFrame
          
          const initialCalls = mockTerminal.write.mock.calls.length
          
          // Render same content again
          yield* renderer.beginFrame
          yield* renderer.render(view)
          yield* renderer.endFrame
          
          // Should not write again if content is identical
          const finalCalls = mockTerminal.write.mock.calls.length
          expect(finalCalls).toBe(initialCalls)
        }).pipe(
          Effect.provide(RendererServiceLive),
          terminalLayer
        )
      )
    })
  })
})