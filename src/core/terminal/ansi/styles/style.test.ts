/**
 * Style System Tests
 *
 * Tests for the ANSI style creation and manipulation system
 */

import { describe, it, expect } from 'bun:test'
import { style, mergeStyles } from './style'
import { Colors } from './color'
import { HorizontalAlign, VerticalAlign } from './types'

describe('Style System', () => {
  describe('Basic style creation', () => {
    it('should create a style with color', () => {
      const s = style({ color: Colors.red })

      expect(s.color).toBe(Colors.red)
      expect(s.background).toBeUndefined()
      expect(s.bold).toBeUndefined()
    })

    it('should create a style with background color', () => {
      const s = style({ background: Colors.blue })

      expect(s.background).toBe(Colors.blue)
      expect(s.color).toBeUndefined()
    })

    it('should create a style with text decorations', () => {
      const s = style({
        bold: true,
        italic: true,
        underline: true,
      })

      expect(s.bold).toBe(true)
      expect(s.italic).toBe(true)
      expect(s.underline).toBe(true)
    })

    it('should create a style with dimensions', () => {
      const s = style({
        width: 10,
        height: 5,
        minWidth: 5,
        maxWidth: 20,
      })

      expect(s.width).toBe(10)
      expect(s.height).toBe(5)
      expect(s.minWidth).toBe(5)
      expect(s.maxWidth).toBe(20)
    })

    it('should create a style with padding', () => {
      const s = style({
        padding: { top: 1, bottom: 2, left: 3, right: 4 },
      })

      expect(s.padding?.top).toBe(1)
      expect(s.padding?.bottom).toBe(2)
      expect(s.padding?.left).toBe(3)
      expect(s.padding?.right).toBe(4)
    })

    it('should create a style with margin', () => {
      const s = style({
        margin: { top: 1, bottom: 1, left: 2, right: 2 },
      })

      expect(s.margin?.top).toBe(1)
      expect(s.margin?.bottom).toBe(1)
      expect(s.margin?.left).toBe(2)
      expect(s.margin?.right).toBe(2)
    })

    it('should create a style with alignment', () => {
      const s = style({
        textAlign: HorizontalAlign.Center,
        verticalAlign: VerticalAlign.Middle,
      })

      expect(s.textAlign).toBe(HorizontalAlign.Center)
      expect(s.verticalAlign).toBe(VerticalAlign.Middle)
    })
  })

  describe('Style merging', () => {
    it('should merge two styles correctly', () => {
      const base = style({ color: Colors.red, bold: true })
      const override = style({ color: Colors.blue, italic: true })

      const merged = mergeStyles(base, override)

      expect(merged.color).toBe(Colors.blue) // Override wins
      expect(merged.bold).toBe(true) // From base
      expect(merged.italic).toBe(true) // From override
    })

    it('should merge multiple styles', () => {
      const s1 = style({ color: Colors.red })
      const s2 = style({ bold: true })
      const s3 = style({ italic: true, color: Colors.green })

      const merged = mergeStyles(s1, s2, s3)

      expect(merged.color).toBe(Colors.green) // Last wins
      expect(merged.bold).toBe(true)
      expect(merged.italic).toBe(true)
    })

    it('should merge padding and margin correctly', () => {
      const base = style({
        padding: { top: 1, left: 2 },
        margin: { top: 3 },
      })
      const override = style({
        padding: { bottom: 4, right: 5 },
        margin: { bottom: 6 },
      })

      const merged = mergeStyles(base, override)

      expect(merged.padding?.top).toBe(1)
      expect(merged.padding?.left).toBe(2)
      expect(merged.padding?.bottom).toBe(4)
      expect(merged.padding?.right).toBe(5)
      expect(merged.margin?.top).toBe(3)
      expect(merged.margin?.bottom).toBe(6)
    })

    it('should handle undefined and null values', () => {
      const base = style({ color: Colors.red })
      const merged = mergeStyles(base, undefined as any, null as any)

      expect(merged.color).toBe(Colors.red)
    })

    it('should override with false values', () => {
      const base = style({ bold: true, italic: true })
      const override = style({ bold: false })

      const merged = mergeStyles(base, override)

      expect(merged.bold).toBe(false)
      expect(merged.italic).toBe(true)
    })
  })

  describe('Complex styles', () => {
    it('should handle comprehensive styling', () => {
      const s = style({
        color: Colors.white,
        background: Colors.darkBlue,
        bold: true,
        italic: false,
        underline: true,
        strikethrough: false,
        width: 20,
        height: 10,
        minWidth: 10,
        maxWidth: 30,
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        margin: { top: 0, bottom: 0, left: 1, right: 1 },
        textAlign: HorizontalAlign.Center,
        verticalAlign: VerticalAlign.Middle,
      })

      expect(s.color).toBe(Colors.white)
      expect(s.background).toBe(Colors.darkBlue)
      expect(s.bold).toBe(true)
      expect(s.italic).toBe(false)
      expect(s.underline).toBe(true)
      expect(s.strikethrough).toBe(false)
      expect(s.width).toBe(20)
      expect(s.height).toBe(10)
      expect(s.textAlign).toBe(HorizontalAlign.Center)
      expect(s.verticalAlign).toBe(VerticalAlign.Middle)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty style object', () => {
      const s = style({})

      expect(s).toBeDefined()
      expect(Object.keys(s)).toEqual([])
    })

    it('should handle numeric color values', () => {
      const s = style({
        color: { type: 'ansi', value: 31 } as any,
      })

      expect(s.color).toBeDefined()
    })

    it('should handle zero values correctly', () => {
      const s = style({
        width: 0,
        height: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      })

      expect(s.width).toBe(0)
      expect(s.height).toBe(0)
      expect(s.padding?.top).toBe(0)
    })

    it('should handle negative values', () => {
      const s = style({
        margin: { top: -1, left: -2 },
      })

      expect(s.margin?.top).toBe(-1)
      expect(s.margin?.left).toBe(-2)
    })
  })

  describe('Style consistency', () => {
    it('should maintain style immutability', () => {
      const original = style({ color: Colors.red })
      const merged = mergeStyles(original, style({ bold: true }))

      expect(original.bold).toBeUndefined()
      expect(merged.bold).toBe(true)
      expect(original !== merged).toBe(true)
    })

    it('should deep clone nested objects', () => {
      const original = style({
        padding: { top: 1, bottom: 2 },
      })
      const merged = mergeStyles(
        original,
        style({
          padding: { left: 3 },
        })
      )

      // Original should not be modified
      expect(original.padding?.left).toBeUndefined()
      expect(merged.padding?.left).toBe(3)
      expect(merged.padding?.top).toBe(1)
    })
  })

  describe('Performance', () => {
    it('should handle many style merges efficiently', () => {
      const startTime = performance.now()

      let result = style({ color: Colors.red })

      for (let i = 0; i < 1000; i++) {
        result = mergeStyles(
          result,
          style({
            bold: i % 2 === 0,
            width: i,
          })
        )
      }

      const endTime = performance.now()
      const mergeTime = endTime - startTime

      expect(result.width).toBe(999)
      expect(mergeTime).toBeLessThan(100) // Should be fast
    })

    it('should handle complex style objects efficiently', () => {
      const complexStyle = style({
        color: Colors.red,
        background: Colors.blue,
        bold: true,
        italic: true,
        underline: true,
        strikethrough: false,
        width: 100,
        height: 50,
        minWidth: 50,
        maxWidth: 200,
        padding: { top: 5, bottom: 5, left: 10, right: 10 },
        margin: { top: 2, bottom: 2, left: 4, right: 4 },
        textAlign: HorizontalAlign.Center,
        verticalAlign: VerticalAlign.Middle,
      })

      const startTime = performance.now()

      let result = complexStyle
      for (let i = 0; i < 100; i++) {
        result = mergeStyles(result, complexStyle)
      }

      const endTime = performance.now()
      const mergeTime = endTime - startTime

      expect(mergeTime).toBeLessThan(50) // Should still be fast
    })
  })
})
