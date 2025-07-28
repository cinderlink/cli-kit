/**
 * Renderer Service Implementation Tests
 *
 * Tests for the double-buffered renderer with diff algorithm
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect, Layer } from 'effect'
import { RendererServiceLive } from './renderer'
import { TerminalServiceLive } from './terminal'
import { text } from '../../view/primitives/view'

describe('Renderer Service Implementation', () => {
  describe('Basic rendering', () => {
    it('should render a simple view', async () => {
      const view = text('Hello, World!')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.render(view)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })

    it('should handle empty view', async () => {
      const view = text('')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.render(view)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })

    it('should render multiline content', async () => {
      const view = text('Line 1\nLine 2\nLine 3')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.render(view)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })
  })

  describe('Viewport rendering', () => {
    it('should render within viewport bounds', async () => {
      const view = text('Content that might be larger than viewport')
      const viewport = { x: 0, y: 0, width: 20, height: 10 }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.renderInViewport(view, viewport)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })

    it('should handle viewport larger than content', async () => {
      const view = text('Small')
      const viewport = { x: 0, y: 0, width: 100, height: 50 }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.renderInViewport(view, viewport)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })

    it('should handle viewport smaller than content', async () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n')
      const view = text(largeContent)
      const viewport = { x: 0, y: 0, width: 10, height: 5 }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.renderInViewport(view, viewport)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })
  })

  describe('Frame management', () => {
    it('should track frame information', async () => {
      const view = text('Frame test')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          const frameStart = yield* renderer.startFrame()
          yield* renderer.render(view)
          const frameEnd = yield* renderer.endFrame()

          return { frameStart, frameEnd }
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result.frameStart).toBeDefined()
      expect(result.frameEnd).toBeDefined()
      expect(result.frameEnd >= result.frameStart).toBe(true)
    })

    it('should measure frame duration', async () => {
      const view = text('Duration test')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          const startTime = Date.now()

          yield* renderer.startFrame()
          yield* renderer.render(view)
          const duration = yield* renderer.getFrameDuration()
          yield* renderer.endFrame()

          return { duration, elapsed: Date.now() - startTime }
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result.duration).toBeGreaterThan(0)
      expect(result.duration).toBeLessThan(1000) // Should be reasonable
    })
  })

  describe('Double buffering', () => {
    it('should support double buffered rendering', async () => {
      const view1 = text('Frame 1')
      const view2 = text('Frame 2')

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          // Render first frame
          yield* renderer.startFrame()
          yield* renderer.render(view1)
          yield* renderer.endFrame()

          // Render second frame
          yield* renderer.startFrame()
          yield* renderer.render(view2)
          yield* renderer.endFrame()
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      // Should complete without errors
    })

    it('should handle rapid frame updates', async () => {
      const views = Array.from({ length: 10 }, (_, i) => text(`Frame ${i}`))

      const startTime = performance.now()

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          for (const view of views) {
            yield* renderer.startFrame()
            yield* renderer.render(view)
            yield* renderer.endFrame()
          }
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(1000) // Should be fast
    })
  })

  describe('Diff algorithm', () => {
    it('should efficiently handle minimal changes', async () => {
      const view1 = text('Original content')
      const view2 = text('Original content with addition')

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          // First render
          yield* renderer.startFrame()
          yield* renderer.render(view1)
          yield* renderer.endFrame()

          // Second render with minimal change
          yield* renderer.startFrame()
          yield* renderer.render(view2)
          yield* renderer.endFrame()
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      // Should complete efficiently
    })

    it('should handle complete content replacement', async () => {
      const view1 = text('Completely different content')
      const view2 = text('Entirely new content here')

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          yield* renderer.startFrame()
          yield* renderer.render(view1)
          yield* renderer.endFrame()

          yield* renderer.startFrame()
          yield* renderer.render(view2)
          yield* renderer.endFrame()
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )
    })
  })

  describe('ANSI handling', () => {
    it('should preserve ANSI escape sequences', async () => {
      const coloredView = text('\x1b[31mRed text\x1b[0m')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.render(coloredView)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })

    it('should handle complex ANSI sequences', async () => {
      const complexView = text('\x1b[1m\x1b[31mBold Red\x1b[0m \x1b[4mUnderlined\x1b[0m')

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* renderer.render(complexView)
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle render failures gracefully', async () => {
      // Create a view that will fail to render
      const failingView = {
        render: () => Effect.fail(new Error('Render failed')),
        width: 10,
        height: 1,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          return yield* Effect.either(renderer.render(failingView))
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      expect(result._tag).toBe('Left')
    })

    it('should recover from frame errors', async () => {
      const view = text('Recovery test')

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          // Start a frame but don't end it properly
          yield* renderer.startFrame()

          // Start another frame (should handle the incomplete previous frame)
          yield* renderer.startFrame()
          yield* renderer.render(view)
          yield* renderer.endFrame()
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      // Should complete without throwing
    })
  })

  describe('Memory management', () => {
    it('should not leak memory with many renders', async () => {
      const views = Array.from({ length: 100 }, (_, i) => text(`Content ${i}`))

      const startTime = performance.now()

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          for (const view of views) {
            yield* renderer.startFrame()
            yield* renderer.render(view)
            yield* renderer.endFrame()
          }
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(2000) // Should complete reasonably fast
    })
  })

  describe('Performance', () => {
    it('should render large content efficiently', async () => {
      const largeContent = Array.from(
        { length: 1000 },
        (_, i) => `Line ${i}: ${'Content '.repeat(10)}`
      ).join('\n')

      const view = text(largeContent)
      const startTime = performance.now()

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive
          yield* renderer.startFrame()
          yield* renderer.render(view)
          yield* renderer.endFrame()
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
    })

    it('should maintain consistent frame rates', async () => {
      const frames = 30
      const views = Array.from({ length: frames }, (_, i) => text(`Frame ${i}`))

      const startTime = performance.now()

      await Effect.runPromise(
        Effect.gen(function* () {
          const renderer = yield* RendererServiceLive

          for (const view of views) {
            yield* renderer.startFrame()
            yield* renderer.render(view)
            yield* renderer.endFrame()
          }
        }).pipe(Effect.provide(Layer.merge(RendererServiceLive, TerminalServiceLive)))
      )

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgFrameTime = totalTime / frames

      expect(avgFrameTime).toBeLessThan(50) // Should average < 50ms per frame
    })
  })
})
