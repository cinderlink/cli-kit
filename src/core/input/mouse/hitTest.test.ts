/**
 * Hit Test Service Tests
 */

import { describe, it, expect } from 'bun:test'
import { Effect } from 'effect'
import {
  HitTestService,
  HitTestServiceLive,
  createBounds,
  mouseEventHitsComponent,
  createHitTestService,
} from './hitTest'
import type { MouseEvent } from '../types'

describe('HitTest', () => {
  describe('HitTestService', () => {
    const createTestService = () => Effect.runSync(Effect.scoped(HitTestServiceLive))

    describe('component registration', () => {
      it('should register a component', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10, 1)

        Effect.runSync(service.registerComponent(bounds))
        const allBounds = Effect.runSync(service.getAllBounds)

        expect(allBounds).toHaveLength(1)
        expect(allBounds[0].componentId).toBe('button')
      })

      it('should update existing component bounds', () => {
        const service = createTestService()
        const bounds1 = createBounds('button', 10, 10, 20, 10, 1)
        const bounds2 = createBounds('button', 20, 20, 30, 15, 2)

        Effect.runSync(service.registerComponent(bounds1))
        Effect.runSync(service.registerComponent(bounds2))
        const allBounds = Effect.runSync(service.getAllBounds)

        expect(allBounds).toHaveLength(1)
        expect(allBounds[0].x).toBe(20)
        expect(allBounds[0].y).toBe(20)
        expect(allBounds[0].width).toBe(30)
        expect(allBounds[0].height).toBe(15)
      })

      it('should unregister a component', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds))
        Effect.runSync(service.unregisterComponent('button'))
        const allBounds = Effect.runSync(service.getAllBounds)

        expect(allBounds).toHaveLength(0)
      })

      it('should clear all components', () => {
        const service = createTestService()
        const bounds1 = createBounds('button1', 10, 10, 20, 10)
        const bounds2 = createBounds('button2', 40, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds1))
        Effect.runSync(service.registerComponent(bounds2))
        Effect.runSync(service.clearComponents)
        const allBounds = Effect.runSync(service.getAllBounds)

        expect(allBounds).toHaveLength(0)
      })

      it('should maintain z-order sorting', () => {
        const service = createTestService()
        const bounds1 = createBounds('button1', 0, 0, 10, 10, 3)
        const bounds2 = createBounds('button2', 0, 0, 10, 10, 1)
        const bounds3 = createBounds('button3', 0, 0, 10, 10, 2)

        Effect.runSync(service.registerComponent(bounds1))
        Effect.runSync(service.registerComponent(bounds2))
        Effect.runSync(service.registerComponent(bounds3))
        const allBounds = Effect.runSync(service.getAllBounds)

        expect(allBounds[0].zIndex).toBe(1)
        expect(allBounds[1].zIndex).toBe(2)
        expect(allBounds[2].zIndex).toBe(3)
      })
    })

    describe('hit testing', () => {
      it('should find component at coordinates', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds))
        const hit = Effect.runSync(service.hitTest(15, 15))

        expect(hit).not.toBeNull()
        expect(hit?.componentId).toBe('button')
        expect(hit?.localX).toBe(5)
        expect(hit?.localY).toBe(5)
      })

      it('should return null for miss', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds))
        const hit = Effect.runSync(service.hitTest(5, 5))

        expect(hit).toBeNull()
      })

      it('should return topmost component when overlapping', () => {
        const service = createTestService()
        const bounds1 = createBounds('button1', 10, 10, 20, 10, 1)
        const bounds2 = createBounds('button2', 15, 15, 20, 10, 2)

        Effect.runSync(service.registerComponent(bounds1))
        Effect.runSync(service.registerComponent(bounds2))
        const hit = Effect.runSync(service.hitTest(20, 18))

        expect(hit?.componentId).toBe('button2')
      })

      it('should test boundaries correctly', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds))

        // Test all edges
        expect(Effect.runSync(service.hitTest(10, 10))).not.toBeNull() // Top-left
        expect(Effect.runSync(service.hitTest(29, 10))).not.toBeNull() // Top-right
        expect(Effect.runSync(service.hitTest(10, 19))).not.toBeNull() // Bottom-left
        expect(Effect.runSync(service.hitTest(29, 19))).not.toBeNull() // Bottom-right

        // Just outside
        expect(Effect.runSync(service.hitTest(9, 10))).toBeNull() // Left
        expect(Effect.runSync(service.hitTest(30, 10))).toBeNull() // Right
        expect(Effect.runSync(service.hitTest(10, 9))).toBeNull() // Top
        expect(Effect.runSync(service.hitTest(10, 20))).toBeNull() // Bottom
      })
    })

    describe('hitTestAll', () => {
      it('should return all components at point', () => {
        const service = createTestService()
        const bounds1 = createBounds('button1', 10, 10, 30, 20, 1)
        const bounds2 = createBounds('button2', 20, 15, 20, 10, 2)
        const bounds3 = createBounds('button3', 25, 18, 10, 10, 3)

        Effect.runSync(service.registerComponent(bounds1))
        Effect.runSync(service.registerComponent(bounds2))
        Effect.runSync(service.registerComponent(bounds3))

        const hits = Effect.runSync(service.hitTestAll(30, 20))

        expect(hits).toHaveLength(3)
        expect(hits[0].componentId).toBe('button1') // Lowest z-index
        expect(hits[1].componentId).toBe('button2')
        expect(hits[2].componentId).toBe('button3') // Highest z-index
      })

      it('should return empty array for miss', () => {
        const service = createTestService()
        const bounds = createBounds('button', 10, 10, 20, 10)

        Effect.runSync(service.registerComponent(bounds))
        const hits = Effect.runSync(service.hitTestAll(50, 50))

        expect(hits).toHaveLength(0)
      })
    })
  })

  describe('utility functions', () => {
    describe('createBounds', () => {
      it('should create bounds with defaults', () => {
        const bounds = createBounds('test', 10, 20, 30, 40)

        expect(bounds.componentId).toBe('test')
        expect(bounds.x).toBe(10)
        expect(bounds.y).toBe(20)
        expect(bounds.width).toBe(30)
        expect(bounds.height).toBe(40)
        expect(bounds.zIndex).toBe(0)
      })

      it('should create bounds with z-index', () => {
        const bounds = createBounds('test', 10, 20, 30, 40, 5)

        expect(bounds.zIndex).toBe(5)
      })
    })

    describe('mouseEventHitsComponent', () => {
      it('should detect hit', () => {
        const mouseEvent: MouseEvent = {
          type: 'press',
          x: 15,
          y: 15,
        }
        const bounds = createBounds('button', 10, 10, 20, 10)

        expect(mouseEventHitsComponent(mouseEvent, bounds)).toBe(true)
      })

      it('should detect miss', () => {
        const mouseEvent: MouseEvent = {
          type: 'press',
          x: 5,
          y: 5,
        }
        const bounds = createBounds('button', 10, 10, 20, 10)

        expect(mouseEventHitsComponent(mouseEvent, bounds)).toBe(false)
      })

      it('should work with motion events', () => {
        const mouseEvent: MouseEvent = {
          type: 'motion',
          x: 15,
          y: 15,
        }
        const bounds = createBounds('button', 10, 10, 20, 10)

        expect(mouseEventHitsComponent(mouseEvent, bounds)).toBe(true)
      })
    })
  })

  describe('createHitTestService', () => {
    it('should create a layer with the service', () => {
      const layer = createHitTestService()

      // Test that the layer provides the service
      const program = Effect.gen(function* (_) {
        const service = yield* _(HitTestService)
        const bounds = createBounds('test', 0, 0, 10, 10)
        yield* _(service.registerComponent(bounds))
        return yield* _(service.getAllBounds)
      })

      const result = Effect.runSync(Effect.provide(program, layer))
      expect(result).toHaveLength(1)
      expect(result[0].componentId).toBe('test')
    })
  })
})
