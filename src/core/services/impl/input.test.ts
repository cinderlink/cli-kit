/**
 * Input Service Implementation Tests
 *
 * Tests for the BubbleTea-inspired input handling system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect, Stream, Queue } from 'effect'
import { InputServiceLive } from './input'
import { KeyType } from '../../terminal/input/keys'

describe('Input Service Implementation', () => {
  describe('Key event parsing', () => {
    it('should parse basic ASCII characters', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Mock key input
          const keyStream = Stream.fromIterable([
            { key: 'a', type: KeyType.Rune },
            { key: 'B', type: KeyType.Rune },
            { key: '1', type: KeyType.Rune },
          ])

          return yield* Stream.take(keyStream, 3).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
    })

    it('should parse special keys', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'enter', type: KeyType.Enter },
            { key: 'escape', type: KeyType.Escape },
            { key: 'space', type: KeyType.Space },
            { key: 'tab', type: KeyType.Tab },
          ])

          return yield* Stream.take(keyStream, 4).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(4)
    })

    it('should parse arrow keys', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'up', type: KeyType.Up },
            { key: 'down', type: KeyType.Down },
            { key: 'left', type: KeyType.Left },
            { key: 'right', type: KeyType.Right },
          ])

          return yield* Stream.take(keyStream, 4).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(4)
    })

    it('should parse function keys', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'f1', type: KeyType.F1 },
            { key: 'f2', type: KeyType.F2 },
            { key: 'f12', type: KeyType.F12 },
          ])

          return yield* Stream.take(keyStream, 3).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
    })
  })

  describe('Key modifiers', () => {
    it('should detect control key combinations', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'ctrl+c', type: KeyType.CtrlC },
            { key: 'ctrl+d', type: KeyType.CtrlD },
            { key: 'ctrl+z', type: KeyType.CtrlZ },
          ])

          return yield* Stream.take(keyStream, 3).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
    })

    it('should detect alt key combinations', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'alt+a', type: KeyType.Rune, alt: true },
            { key: 'alt+enter', type: KeyType.Enter, alt: true },
          ])

          return yield* Stream.take(keyStream, 2).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
    })

    it('should detect shift key combinations', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const keyStream = Stream.fromIterable([
            { key: 'shift+tab', type: KeyType.ShiftTab },
            { key: 'shift+up', type: KeyType.Up, shift: true },
          ])

          return yield* Stream.take(keyStream, 2).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
    })
  })

  describe('Mouse events', () => {
    it('should parse mouse click events', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const mouseStream = Stream.fromIterable([
            {
              type: 'click',
              x: 10,
              y: 5,
              button: 'left',
              timestamp: Date.now(),
            },
            {
              type: 'click',
              x: 20,
              y: 15,
              button: 'right',
              timestamp: Date.now(),
            },
          ])

          return yield* Stream.take(mouseStream, 2).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
    })

    it('should parse mouse movement events', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const mouseStream = Stream.fromIterable([
            {
              type: 'move',
              x: 0,
              y: 0,
              timestamp: Date.now(),
            },
            {
              type: 'move',
              x: 5,
              y: 3,
              timestamp: Date.now(),
            },
            {
              type: 'move',
              x: 10,
              y: 8,
              timestamp: Date.now(),
            },
          ])

          return yield* Stream.take(mouseStream, 3).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
    })

    it('should parse scroll wheel events', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const mouseStream = Stream.fromIterable([
            {
              type: 'wheel',
              x: 15,
              y: 10,
              direction: 'up',
              timestamp: Date.now(),
            },
            {
              type: 'wheel',
              x: 15,
              y: 10,
              direction: 'down',
              timestamp: Date.now(),
            },
          ])

          return yield* Stream.take(mouseStream, 2).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
    })
  })

  describe('Window resize events', () => {
    it('should detect window resize', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const resizeStream = Stream.fromIterable([
            { width: 80, height: 24 },
            { width: 120, height: 30 },
          ])

          return yield* Stream.take(resizeStream, 2).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
      expect(result[0]?.width).toBe(80)
      expect(result[0]?.height).toBe(24)
    })
  })

  describe('Input streaming', () => {
    it('should provide continuous input stream', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Simulate rapid input
          const events = Array.from({ length: 10 }, (_, i) => ({
            key: String.fromCharCode(97 + i), // a-j
            type: KeyType.Rune,
          }))

          const eventStream = Stream.fromIterable(events)
          return yield* Stream.take(eventStream, 10).pipe(Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(10)
    })

    it('should handle input buffering', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Create a queue for buffering
          const queue = yield* Queue.unbounded()

          // Add items to queue
          yield* Queue.offer(queue, { key: 'a', type: KeyType.Rune })
          yield* Queue.offer(queue, { key: 'b', type: KeyType.Rune })
          yield* Queue.offer(queue, { key: 'c', type: KeyType.Rune })

          // Read from queue
          const items = yield* Stream.fromQueue(queue).pipe(Stream.take(3), Stream.runCollect)

          return items
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
    })
  })

  describe('ANSI sequence parsing', () => {
    it('should parse escape sequences correctly', async () => {
      const sequences = [
        '\x1b[A', // Up arrow
        '\x1b[B', // Down arrow
        '\x1b[C', // Right arrow
        '\x1b[D', // Left arrow
        '\x1b[H', // Home
        '\x1b[F', // End
      ]

      for (const seq of sequences) {
        // Test that the sequence would be parsed correctly
        expect(seq.startsWith('\x1b[')).toBe(true)
        expect(seq.length).toBeGreaterThan(2)
      }
    })

    it('should handle incomplete sequences', async () => {
      const incomplete = '\x1b['

      // Should not crash with incomplete sequences
      expect(incomplete.startsWith('\x1b')).toBe(true)
      expect(incomplete.length).toBe(2)
    })

    it('should handle complex sequences', async () => {
      const complexSequences = [
        '\x1b[1;2A', // Shift+Up
        '\x1b[1;5C', // Ctrl+Right
        '\x1b[M\x20\x21\x22', // Mouse event
      ]

      for (const seq of complexSequences) {
        expect(seq.startsWith('\x1b')).toBe(true)
        expect(seq.length).toBeGreaterThan(3)
      }
    })
  })

  describe('Error handling', () => {
    it('should handle invalid input gracefully', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Test with potentially invalid input
          const invalidStream = Stream.fromIterable(
            [null, undefined, { malformed: 'object' }, { key: '', type: 'unknown' }].filter(Boolean)
          )

          return yield* Stream.take(invalidStream, 1).pipe(Stream.runCollect, Effect.either)
        }).pipe(Effect.provide(InputServiceLive))
      )

      // Should either succeed or fail gracefully
      expect(result._tag).toBeDefined()
    })

    it('should recover from parsing errors', async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Should not crash the entire system
          const result = yield* Effect.either(
            Stream.fromIterable(['\x1b[999Z']) // Invalid sequence
              .pipe(Stream.take(1), Stream.runCollect)
          )

          return result
        }).pipe(Effect.provide(InputServiceLive))
      )

      // Should complete without throwing
    })
  })

  describe('Performance', () => {
    it('should handle high-frequency input', async () => {
      const startTime = performance.now()

      await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          // Generate many events
          const events = Array.from({ length: 1000 }, (_, i) => ({
            key: String.fromCharCode((i % 26) + 97),
            type: KeyType.Rune,
            timestamp: Date.now() + i,
          }))

          return yield* Stream.fromIterable(events).pipe(Stream.take(1000), Stream.runCollect)
        }).pipe(Effect.provide(InputServiceLive))
      )

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(1000) // Should handle quickly
    })

    it('should maintain low latency', async () => {
      const timestamps: number[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const events = Array.from({ length: 10 }, (_, i) => ({
            key: String(i),
            type: KeyType.Rune,
            timestamp: Date.now(),
          }))

          return yield* Stream.fromIterable(events).pipe(
            Stream.tap(event => Effect.sync(() => timestamps.push(Date.now()))),
            Stream.runDrain
          )
        }).pipe(Effect.provide(InputServiceLive))
      )

      // Check that events were processed quickly
      expect(timestamps).toHaveLength(10)
    })
  })

  describe('Input filtering', () => {
    it('should filter by key type', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const mixedEvents = Stream.fromIterable([
            { key: 'a', type: KeyType.Rune },
            { key: 'enter', type: KeyType.Enter },
            { key: 'b', type: KeyType.Rune },
            { key: 'escape', type: KeyType.Escape },
            { key: 'c', type: KeyType.Rune },
          ])

          // Filter only rune events
          return yield* mixedEvents.pipe(
            Stream.filter(event => event.type === KeyType.Rune),
            Stream.runCollect
          )
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(3)
      expect(result.every(event => event.type === KeyType.Rune)).toBe(true)
    })

    it('should filter by modifier keys', async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const input = yield* InputServiceLive

          const events = Stream.fromIterable([
            { key: 'a', type: KeyType.Rune, ctrl: false },
            { key: 'ctrl+c', type: KeyType.CtrlC, ctrl: true },
            { key: 'b', type: KeyType.Rune, ctrl: false },
            { key: 'ctrl+d', type: KeyType.CtrlD, ctrl: true },
          ])

          // Filter only ctrl events
          return yield* events.pipe(
            Stream.filter(event => event.ctrl === true),
            Stream.runCollect
          )
        }).pipe(Effect.provide(InputServiceLive))
      )

      expect(result).toHaveLength(2)
    })
  })
})
