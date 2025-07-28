/**
 * Borders System Tests
 *
 * Tests for border character sets and border rendering
 */

import { describe, it, expect } from 'bun:test'
import { Borders, BorderSide, getBorderChar, renderBox } from './borders'

describe('Borders System', () => {
  describe('Border sets', () => {
    it('should provide thin border characters', () => {
      const thin = Borders.thin

      expect(thin.topLeft).toBe('┌')
      expect(thin.topRight).toBe('┐')
      expect(thin.bottomLeft).toBe('└')
      expect(thin.bottomRight).toBe('┘')
      expect(thin.horizontal).toBe('─')
      expect(thin.vertical).toBe('│')
    })

    it('should provide thick border characters', () => {
      const thick = Borders.thick

      expect(thick.topLeft).toBe('┏')
      expect(thick.topRight).toBe('┓')
      expect(thick.bottomLeft).toBe('┗')
      expect(thick.bottomRight).toBe('┛')
      expect(thick.horizontal).toBe('━')
      expect(thick.vertical).toBe('┃')
    })

    it('should provide double border characters', () => {
      const double = Borders.double

      expect(double.topLeft).toBe('╔')
      expect(double.topRight).toBe('╗')
      expect(double.bottomLeft).toBe('╚')
      expect(double.bottomRight).toBe('╝')
      expect(double.horizontal).toBe('═')
      expect(double.vertical).toBe('║')
    })

    it('should provide rounded border characters', () => {
      const rounded = Borders.rounded

      expect(rounded.topLeft).toBe('╭')
      expect(rounded.topRight).toBe('╮')
      expect(rounded.bottomLeft).toBe('╰')
      expect(rounded.bottomRight).toBe('╯')
      expect(rounded.horizontal).toBe('─')
      expect(rounded.vertical).toBe('│')
    })

    it('should provide ASCII border characters', () => {
      const ascii = Borders.ascii

      expect(ascii.topLeft).toBe('+')
      expect(ascii.topRight).toBe('+')
      expect(ascii.bottomLeft).toBe('+')
      expect(ascii.bottomRight).toBe('+')
      expect(ascii.horizontal).toBe('-')
      expect(ascii.vertical).toBe('|')
    })

    it('should provide dotted border characters', () => {
      const dotted = Borders.dotted

      expect(dotted.topLeft).toBe('·')
      expect(dotted.topRight).toBe('·')
      expect(dotted.bottomLeft).toBe('·')
      expect(dotted.bottomRight).toBe('·')
      expect(dotted.horizontal).toBe('·')
      expect(dotted.vertical).toBe(':')
    })
  })

  describe('Border sides', () => {
    it('should define border side flags', () => {
      expect(BorderSide.None).toBe(0)
      expect(BorderSide.Top).toBe(1)
      expect(BorderSide.Right).toBe(2)
      expect(BorderSide.Bottom).toBe(4)
      expect(BorderSide.Left).toBe(8)
      expect(BorderSide.All).toBe(15) // 1 + 2 + 4 + 8
    })

    it('should combine border sides with bitwise operations', () => {
      const topBottom = BorderSide.Top | BorderSide.Bottom
      expect(topBottom).toBe(5) // 1 + 4

      const leftRight = BorderSide.Left | BorderSide.Right
      expect(leftRight).toBe(10) // 8 + 2

      const all = BorderSide.Top | BorderSide.Right | BorderSide.Bottom | BorderSide.Left
      expect(all).toBe(BorderSide.All)
    })
  })

  describe('getBorderChar', () => {
    it('should return correct characters for each position', () => {
      const border = Borders.thin

      expect(getBorderChar(border, 'top-left')).toBe('┌')
      expect(getBorderChar(border, 'top-right')).toBe('┐')
      expect(getBorderChar(border, 'bottom-left')).toBe('└')
      expect(getBorderChar(border, 'bottom-right')).toBe('┘')
      expect(getBorderChar(border, 'horizontal')).toBe('─')
      expect(getBorderChar(border, 'vertical')).toBe('│')
    })

    it('should handle different border styles', () => {
      expect(getBorderChar(Borders.thick, 'horizontal')).toBe('━')
      expect(getBorderChar(Borders.double, 'vertical')).toBe('║')
      expect(getBorderChar(Borders.rounded, 'top-left')).toBe('╭')
      expect(getBorderChar(Borders.ascii, 'top-left')).toBe('+')
    })

    it('should return fallback for invalid positions', () => {
      const char = getBorderChar(Borders.thin, 'invalid' as any)
      expect(char).toBe(' ') // Should fallback to space
    })
  })

  describe('renderBox', () => {
    it('should render a basic box', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
      })

      const lines = box.split('\n')
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe('┌───┐') // Top border
      expect(lines[1]).toBe('│   │') // Side borders
      expect(lines[2]).toBe('└───┘') // Bottom border
    })

    it('should render box with content', () => {
      const box = renderBox({
        width: 7,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
        content: 'Hello',
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('┌─────┐')
      expect(lines[1]).toBe('│Hello│')
      expect(lines[2]).toBe('└─────┘')
    })

    it('should render box with multiline content', () => {
      const box = renderBox({
        width: 7,
        height: 4,
        border: Borders.thin,
        sides: BorderSide.All,
        content: 'Line1\nLine2',
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('┌─────┐')
      expect(lines[1]).toBe('│Line1│')
      expect(lines[2]).toBe('│Line2│')
      expect(lines[3]).toBe('└─────┘')
    })

    it('should render partial borders', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.Top | BorderSide.Bottom,
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('─────') // Top border only
      expect(lines[1]).toBe('     ') // No side borders
      expect(lines[2]).toBe('─────') // Bottom border only
    })

    it('should render only side borders', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.Left | BorderSide.Right,
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('│   │') // Side borders only
      expect(lines[1]).toBe('│   │') // Side borders only
      expect(lines[2]).toBe('│   │') // Side borders only
    })

    it('should handle single side borders', () => {
      const topOnly = renderBox({
        width: 5,
        height: 2,
        border: Borders.thin,
        sides: BorderSide.Top,
      })

      const lines = topOnly.split('\n')
      expect(lines[0]).toBe('─────')
      expect(lines[1]).toBe('     ')
    })

    it('should render thick borders', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thick,
        sides: BorderSide.All,
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('┏━━━┓')
      expect(lines[1]).toBe('┃   ┃')
      expect(lines[2]).toBe('┗━━━┛')
    })

    it('should render rounded borders', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.rounded,
        sides: BorderSide.All,
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('╭───╮')
      expect(lines[1]).toBe('│   │')
      expect(lines[2]).toBe('╰───╯')
    })

    it('should render ASCII borders', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.ascii,
        sides: BorderSide.All,
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('+---+')
      expect(lines[1]).toBe('|   |')
      expect(lines[2]).toBe('+---+')
    })
  })

  describe('Content alignment', () => {
    it('should left-align content by default', () => {
      const box = renderBox({
        width: 10,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
        content: 'Short',
      })

      const lines = box.split('\n')
      expect(lines[1]).toBe('│Short   │') // Left-aligned with padding
    })

    it('should handle content wider than box', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
        content: 'Very long content',
      })

      const lines = box.split('\n')
      // Should truncate content
      expect(lines[1].length).toBe(5) // Box width maintained
    })

    it('should handle content taller than box', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
        content: 'Line1\nLine2\nLine3\nLine4',
      })

      const lines = box.split('\n')
      expect(lines).toHaveLength(3) // Box height maintained
    })
  })

  describe('Edge cases', () => {
    it('should handle minimum box dimensions', () => {
      const box = renderBox({
        width: 2,
        height: 2,
        border: Borders.thin,
        sides: BorderSide.All,
      })

      const lines = box.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('┌┐')
      expect(lines[1]).toBe('└┘')
    })

    it('should handle no borders', () => {
      const box = renderBox({
        width: 5,
        height: 2,
        border: Borders.thin,
        sides: BorderSide.None,
        content: 'Hello',
      })

      const lines = box.split('\n')
      expect(lines[0]).toBe('Hello')
      expect(lines[1]).toBe('     ')
    })

    it('should handle empty content', () => {
      const box = renderBox({
        width: 5,
        height: 3,
        border: Borders.thin,
        sides: BorderSide.All,
        content: '',
      })

      const lines = box.split('\n')
      expect(lines[1]).toBe('│   │') // Empty content line
    })
  })

  describe('Performance', () => {
    it('should render large boxes efficiently', () => {
      const startTime = performance.now()

      const box = renderBox({
        width: 100,
        height: 50,
        border: Borders.thin,
        sides: BorderSide.All,
        content: Array.from({ length: 48 }, (_, i) => `Line ${i}`).join('\n'),
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(box.split('\n')).toHaveLength(50)
      expect(renderTime).toBeLessThan(100) // Should be fast
    })

    it('should handle many border renders efficiently', () => {
      const startTime = performance.now()

      for (let i = 0; i < 100; i++) {
        renderBox({
          width: 10,
          height: 5,
          border: Borders.thin,
          sides: BorderSide.All,
          content: `Content ${i}`,
        })
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(200) // Should handle multiple renders quickly
    })
  })
})
