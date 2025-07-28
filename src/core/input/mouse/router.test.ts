/**
 * Mouse Router Service Tests
 */

import { describe, it, expect } from 'bun:test'
import { Effect, Layer } from 'effect'
import {
  MouseRouterService,
  MouseRouterServiceLive,
  clickHandler,
  pressReleaseHandler,
  coordinateHandler,
} from './router'
import { HitTestService, HitTestServiceLive, createBounds } from './hitTest'
import type { MouseEvent } from '../types'

describe('MouseRouter', () => {
  describe('MouseRouterService', () => {
    const createTestEnvironment = () => {
      const layer = Layer.merge(
        Layer.effect(MouseRouterService, MouseRouterServiceLive),
        Layer.effect(HitTestService, HitTestServiceLive)
      )
      return layer
    }

    describe('component registration', () => {
      it('should register a component with handler', () => {
        const layer = createTestEnvironment()
        const bounds = createBounds('button', 10, 10, 20, 10)

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)
          const hitTest = yield* _(HitTestService)

          yield* _(
            router.registerComponent(
              'button',
              bounds,
              clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
            )
          )

          // Verify component is registered in hit test service
          const allBounds = yield* _(hitTest.getAllBounds)
          return allBounds
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).toHaveLength(1)
        expect(result[0].componentId).toBe('button')
      })

      it('should unregister a component', () => {
        const layer = createTestEnvironment()
        const bounds = createBounds('button', 10, 10, 20, 10)

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)
          const hitTest = yield* _(HitTestService)

          yield* _(
            router.registerComponent(
              'button',
              bounds,
              clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
            )
          )

          yield* _(router.unregisterComponent('button'))

          const allBounds = yield* _(hitTest.getAllBounds)
          return allBounds
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).toHaveLength(0)
      })

      it('should update component bounds', () => {
        const layer = createTestEnvironment()
        const bounds1 = createBounds('button', 10, 10, 20, 10)
        const bounds2 = createBounds('button', 20, 20, 30, 15)

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)
          const hitTest = yield* _(HitTestService)

          yield* _(
            router.registerComponent(
              'button',
              bounds1,
              clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
            )
          )

          yield* _(router.updateComponentBounds('button', bounds2))

          const allBounds = yield* _(hitTest.getAllBounds)
          return allBounds[0]
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result.x).toBe(20)
        expect(result.y).toBe(20)
      })

      it('should clear all registrations', () => {
        const layer = createTestEnvironment()

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)
          const hitTest = yield* _(HitTestService)

          yield* _(
            router.registerComponent(
              'button1',
              createBounds('button1', 10, 10, 20, 10),
              clickHandler(() => ({ _tag: 'Button1' as const }))
            )
          )

          yield* _(
            router.registerComponent(
              'button2',
              createBounds('button2', 40, 10, 20, 10),
              clickHandler(() => ({ _tag: 'Button2' as const }))
            )
          )

          yield* _(router.clearAll)

          const allBounds = yield* _(hitTest.getAllBounds)
          return allBounds
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).toHaveLength(0)
      })
    })

    describe('mouse event routing', () => {
      it('should route click to correct component', () => {
        const layer = createTestEnvironment()

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)

          yield* _(
            router.registerComponent(
              'button',
              createBounds('button', 10, 10, 20, 10),
              clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
            )
          )

          const mouseEvent: MouseEvent = {
            type: 'press',
            x: 15,
            y: 15,
            button: 'left',
          }

          const result = yield* _(router.routeMouseEvent(mouseEvent))
          return result
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).not.toBeNull()
        expect(result?.componentId).toBe('button')
        expect(result?.message).toEqual({ _tag: 'ButtonClicked' })
        expect(result?.localX).toBe(5)
        expect(result?.localY).toBe(5)
      })

      it('should return null for miss', () => {
        const layer = createTestEnvironment()

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)

          yield* _(
            router.registerComponent(
              'button',
              createBounds('button', 10, 10, 20, 10),
              clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
            )
          )

          const mouseEvent: MouseEvent = {
            type: 'press',
            x: 50,
            y: 50,
            button: 'left',
          }

          const result = yield* _(router.routeMouseEvent(mouseEvent))
          return result
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).toBeNull()
      })

      it('should route to topmost component when overlapping', () => {
        const layer = createTestEnvironment()

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)

          yield* _(
            router.registerComponent(
              'button1',
              createBounds('button1', 10, 10, 30, 20, 1),
              clickHandler(() => ({ _tag: 'Button1' as const }))
            )
          )

          yield* _(
            router.registerComponent(
              'button2',
              createBounds('button2', 20, 15, 20, 10, 2),
              clickHandler(() => ({ _tag: 'Button2' as const }))
            )
          )

          const mouseEvent: MouseEvent = {
            type: 'press',
            x: 25,
            y: 18,
            button: 'left',
          }

          const result = yield* _(router.routeMouseEvent(mouseEvent))
          return result
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result?.componentId).toBe('button2')
        expect(result?.message).toEqual({ _tag: 'Button2' })
      })

      it('should handle handler returning null', () => {
        const layer = createTestEnvironment()

        const program = Effect.gen(function* (_) {
          const router = yield* _(MouseRouterService)

          yield* _(
            router.registerComponent(
              'button',
              createBounds('button', 10, 10, 20, 10),
              () => null // Handler always returns null
            )
          )

          const mouseEvent: MouseEvent = {
            type: 'press',
            x: 15,
            y: 15,
            button: 'left',
          }

          const result = yield* _(router.routeMouseEvent(mouseEvent))
          return result
        })

        const result = Effect.runSync(Effect.provide(program, layer))
        expect(result).toBeNull()
      })
    })
  })

  describe('handler utilities', () => {
    describe('clickHandler', () => {
      it('should handle left button press', () => {
        const handler = clickHandler(() => ({ _tag: 'Clicked' as const }))
        const event: MouseEvent = { type: 'press', x: 0, y: 0, button: 'left' }

        const result = handler(event, 0, 0)
        expect(result).toEqual({ _tag: 'Clicked' })
      })

      it('should ignore non-left button', () => {
        const handler = clickHandler(() => ({ _tag: 'Clicked' as const }))
        const event: MouseEvent = { type: 'press', x: 0, y: 0, button: 'right' }

        const result = handler(event, 0, 0)
        expect(result).toBeNull()
      })

      it('should ignore release events', () => {
        const handler = clickHandler(() => ({ _tag: 'Clicked' as const }))
        const event: MouseEvent = { type: 'release', x: 0, y: 0, button: 'left' }

        const result = handler(event, 0, 0)
        expect(result).toBeNull()
      })
    })

    describe('pressReleaseHandler', () => {
      it('should handle press events', () => {
        const handler = pressReleaseHandler(
          () => ({ _tag: 'Pressed' as const }),
          () => ({ _tag: 'Released' as const })
        )
        const event: MouseEvent = { type: 'press', x: 0, y: 0, button: 'left' }

        const result = handler(event, 0, 0)
        expect(result).toEqual({ _tag: 'Pressed' })
      })

      it('should handle release events', () => {
        const handler = pressReleaseHandler(
          () => ({ _tag: 'Pressed' as const }),
          () => ({ _tag: 'Released' as const })
        )
        const event: MouseEvent = { type: 'release', x: 0, y: 0, button: 'left' }

        const result = handler(event, 0, 0)
        expect(result).toEqual({ _tag: 'Released' })
      })

      it('should ignore non-left button', () => {
        const handler = pressReleaseHandler(
          () => ({ _tag: 'Pressed' as const }),
          () => ({ _tag: 'Released' as const })
        )
        const event: MouseEvent = { type: 'press', x: 0, y: 0, button: 'right' }

        const result = handler(event, 0, 0)
        expect(result).toBeNull()
      })

      it('should ignore motion events', () => {
        const handler = pressReleaseHandler(
          () => ({ _tag: 'Pressed' as const }),
          () => ({ _tag: 'Released' as const })
        )
        const event: MouseEvent = { type: 'motion', x: 0, y: 0 }

        const result = handler(event, 0, 0)
        expect(result).toBeNull()
      })
    })

    describe('coordinateHandler', () => {
      it('should provide coordinates to handler', () => {
        const handler = coordinateHandler((x, y, event) => ({
          _tag: 'MouseAt' as const,
          x,
          y,
          type: event.type,
        }))
        const event: MouseEvent = { type: 'motion', x: 100, y: 50 }

        const result = handler(event, 10, 5)
        expect(result).toEqual({
          _tag: 'MouseAt',
          x: 10,
          y: 5,
          type: 'motion',
        })
      })

      it('should handle null returns', () => {
        const handler = coordinateHandler(() => null)
        const event: MouseEvent = { type: 'motion', x: 100, y: 50 }

        const result = handler(event, 10, 5)
        expect(result).toBeNull()
      })
    })
  })
})
