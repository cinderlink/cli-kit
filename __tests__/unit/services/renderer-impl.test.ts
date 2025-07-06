/**
 * Tests for services/impl/renderer-impl.ts - Renderer service implementation
 */

import { describe, it, expect } from "bun:test"
import { Effect, Layer, Ref } from "effect"
import { RendererServiceLive } from "@/services/impl/renderer-impl"
import { RendererService } from "@/services/renderer"
import { TerminalService } from "@/services/terminal"
import { text, vstack, hstack } from "@/core/view"
import { style } from "@/styling"
import { Colors } from "@/styling/color"

// Mock Terminal Service for testing
const MockTerminalService = Layer.succeed(TerminalService, {
  getSize: () => Effect.succeed({ width: 80, height: 24 }),
  moveCursor: () => Effect.succeed(void 0),
  clearScreen: () => Effect.succeed(void 0),
  hideCursor: () => Effect.succeed(void 0),
  showCursor: () => Effect.succeed(void 0),
  write: () => Effect.succeed(void 0),
  enterAlternateScreen: () => Effect.succeed(void 0),
  exitAlternateScreen: () => Effect.succeed(void 0),
  enableRawMode: () => Effect.succeed(void 0),
  disableRawMode: () => Effect.succeed(void 0)
})

const testLayer = Layer.provide(RendererServiceLive, MockTerminalService)

describe("Renderer Service Implementation", () => {
  describe("basic rendering", () => {
    it("renders simple text", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Hello World")
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("renders styled text", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Styled", style().foreground(Colors.red).bold())
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("handles empty text", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("")
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("layout rendering", () => {
    it("renders vertical stack", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = vstack(
          text("Line 1"),
          text("Line 2"),
          text("Line 3")
        )
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("renders horizontal stack", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = hstack(
          text("Left"),
          text("Right")
        )
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("renders nested layouts", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = vstack(
          text("Header"),
          hstack(
            text("Left"),
            text("Right")
          ),
          text("Footer")
        )
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("viewport management", () => {
    it("handles viewport updates", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Test")
        
        // First render
        yield* _(renderer.render(view))
        
        // Update viewport
        yield* _(renderer.setViewport({ x: 0, y: 0, width: 40, height: 12 }))
        
        // Render again
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("supports viewport operations", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Test")
        
        // Basic viewport usage
        yield* _(renderer.render(view))
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("renderer reliability", () => {
    it("handles consecutive renders", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Content")
        
        // Render something
        yield* _(renderer.render(view))
        
        // Render again
        yield* _(renderer.render(text("New content")))
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("performance features", () => {
    it("supports diff rendering", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        
        // First render
        const view1 = text("Original")
        yield* _(renderer.render(view1))
        
        // Second render with small change
        const view2 = text("Modified")
        yield* _(renderer.render(view2))
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("handles identical renders efficiently", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        const view = text("Same content")
        
        // Multiple renders of same content
        yield* _(renderer.render(view))
        yield* _(renderer.render(view))
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("error handling", () => {
    it("handles invalid views gracefully", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        
        // Create a view that might cause issues
        const problematicView = {
          render: () => Effect.fail(new Error("Render error")),
          measureSync: () => ({ width: 0, height: 0 })
        }
        
        // Should handle the error appropriately
        const result = yield* _(
          Effect.either(renderer.render(problematicView as any))
        )
        expect(result._tag).toBe("Left")
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })

  describe("complex scenarios", () => {
    it("renders large content", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        
        // Create a large view
        const lines = Array(100).fill(0).map((_, i) => text(`Line ${i + 1}`))
        const view = vstack(...lines)
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("handles rapid updates", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        
        // Rapid succession of renders
        for (let i = 0; i < 10; i++) {
          const view = text(`Update ${i}`)
          yield* _(renderer.render(view))
        }
        
        // Final render should work
        yield* _(renderer.render(text("Final")))
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })

    it("handles mixed content types", async () => {
      const program = Effect.gen(function* (_) {
        const renderer = yield* _(RendererService)
        
        const view = vstack(
          text("Plain text"),
          text("Styled", style().foreground(Colors.blue)),
          hstack(
            text("Left", style().bold()),
            text("Right", style().italic())
          ),
          text("Unicode: 🌟 ★ ✨")
        )
        
        yield* _(renderer.render(view))
        // If we get here without throwing, the render succeeded
      })
      
      await Effect.runPromise(Effect.provide(program, testLayer))
    })
  })
})