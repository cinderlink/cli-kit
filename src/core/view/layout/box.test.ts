/**
 * Box Layout Tests
 *
 * Tests for the box layout system with borders and styling
 */

import { describe, it, expect } from 'bun:test'
import { Effect } from 'effect'
import { box, paddedBox } from './box'
import { text } from '../primitives/view'
import { Borders, BorderSide } from '../../terminal/ansi/styles'

describe('Box Layout', () => {
  describe('box', () => {
    it('should create a box with rounded border', async () => {
      const content = text('Hello')
      const boxed = box({ border: Borders.rounded }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.content).toContain('╭')
      expect(result.content).toContain('╮')
      expect(result.content).toContain('╰')
      expect(result.content).toContain('╯')
      expect(result.content).toContain('Hello')
      expect(result.width).toBe(7) // Content (5) + borders (2)
      expect(result.height).toBe(3) // Content (1) + borders (2)
    })

    it('should create a box with thick border', async () => {
      const content = text('Test')
      const boxed = box({ border: Borders.thick }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.content).toContain('┏')
      expect(result.content).toContain('┓')
      expect(result.content).toContain('┗')
      expect(result.content).toContain('┛')
      expect(result.content).toContain('Test')
    })

    it('should create a box with double border', async () => {
      const content = text('Content')
      const boxed = box({ border: Borders.double }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.content).toContain('╔')
      expect(result.content).toContain('╗')
      expect(result.content).toContain('╚')
      expect(result.content).toContain('╝')
      expect(result.content).toContain('Content')
    })

    it('should handle partial borders', async () => {
      const content = text('Partial')
      const boxed = box(
        {
          border: Borders.rounded,
          borderSides: BorderSide.Top | BorderSide.Bottom,
        },
        content
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      // Should only have top and bottom borders
      expect(result.content).toContain('─') // Top/bottom line
      expect(result.content).not.toContain('│') // No side borders
    })

    it('should handle left and right borders only', async () => {
      const content = text('Sides')
      const boxed = box(
        {
          border: Borders.rounded,
          borderSides: BorderSide.Left | BorderSide.Right,
        },
        content
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.content).toContain('│') // Side borders
      expect(result.content).not.toContain('─') // No top/bottom borders
    })
  })

  describe('paddedBox', () => {
    it('should create a box with padding', async () => {
      const content = text('Padded')
      const boxed = paddedBox(
        {
          border: Borders.rounded,
          padding: { top: 1, bottom: 1, left: 2, right: 2 },
        },
        content
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.width).toBe(10) // Content (6) + padding (4) + borders (2)
      expect(result.height).toBe(5) // Content (1) + padding (2) + borders (2)
      expect(result.content).toContain('Padded')
    })

    it('should handle uniform padding', async () => {
      const content = text('Uniform')
      const boxed = paddedBox(
        {
          border: Borders.rounded,
          padding: 1,
        },
        content
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.width).toBe(9) // Content (7) + padding (2) + borders (2)
      expect(result.height).toBe(4) // Content (1) + padding (2) + borders (2)
    })

    it('should handle zero padding', async () => {
      const content = text('No padding')
      const boxed = paddedBox(
        {
          border: Borders.rounded,
          padding: 0,
        },
        content
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.width).toBe(12) // Content (10) + borders (2)
      expect(result.height).toBe(3) // Content (1) + borders (2)
    })
  })

  describe('Multiline content', () => {
    it('should handle multiline content in boxes', async () => {
      const content = text('Line 1\nLine 2\nLine 3')
      const boxed = box({ border: Borders.rounded }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.height).toBe(5) // Content (3) + borders (2)
      expect(result.width).toBe(8) // Longest line (6) + borders (2)
      expect(result.content).toContain('Line 1')
      expect(result.content).toContain('Line 2')
      expect(result.content).toContain('Line 3')
    })

    it('should center multiline content', async () => {
      const content = text('Short\nVery long line\nMid')
      const boxed = box({ border: Borders.rounded }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.width).toBe(16) // Longest line (14) + borders (2)
      expect(result.content).toContain('Very long line')
    })
  })

  describe('Empty content', () => {
    it('should handle empty content', async () => {
      const content = text('')
      const boxed = box({ border: Borders.rounded }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      expect(result.width).toBe(2) // Just borders
      expect(result.height).toBe(3) // Empty line + borders
    })
  })

  describe('Nested boxes', () => {
    it('should handle nested boxes', async () => {
      const innerContent = text('Inner')
      const innerBox = box({ border: Borders.thin }, innerContent)
      const outerBox = box({ border: Borders.double }, innerBox)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* outerBox.render({} as any)
          return rendered
        })
      )

      expect(result.content).toContain('Inner')
      expect(result.content).toContain('┌') // Inner box thin border
      expect(result.content).toContain('╔') // Outer box double border
    })
  })

  describe('Error handling', () => {
    it('should handle invalid border configurations', async () => {
      const content = text('Test')

      // Test with borderSides but no border
      const boxed = box({ borderSides: BorderSide.All }, content)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      // Should still render the content
      expect(result.content).toContain('Test')
    })
  })

  describe('Performance', () => {
    it('should render large boxed content efficiently', async () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join('\n')
      const content = text(lines)
      const boxed = box({ border: Borders.rounded }, content)

      const startTime = performance.now()

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rendered = yield* boxed.render({} as any)
          return rendered
        })
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(result.height).toBe(1002) // Content (1000) + borders (2)
      expect(renderTime).toBeLessThan(1000) // Should be fast
    })
  })
})
