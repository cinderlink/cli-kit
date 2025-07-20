/**
 * Tests for Mouse Router Service
 */

import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { 
  MouseRouterService, 
  MouseRouterServiceLive,
  clickHandler,
  pressReleaseHandler,
  coordinateHandler
} from "@/services/mouse-router"
import type { MouseEvent } from "@/core/types"
import { HitTestService } from "@/services/hit-test"

describe("MouseRouterService", () => {
  // Mock HitTestService for testing
  const createMockHitTestService = () => {
    return HitTestService.of({
      registerComponent: (bounds: any) => Effect.succeed(undefined),
      unregisterComponent: (componentId: string) => Effect.succeed(undefined),
      hitTest: (x: number, y: number) => 
        Effect.succeed(
          x >= 10 && x <= 20 && y >= 10 && y <= 20 
            ? { componentId: "test-component", localX: x - 10, localY: y - 10 }
            : null
        ),
      clearComponents: Effect.succeed(undefined)
    })
  }

  const createMockMouseEvent = (x: number, y: number, type: "press" | "release" | "motion" | "wheel" = "press", button: "left" | "right" | "middle" | "wheel-up" | "wheel-down" = "left"): MouseEvent => ({
    type,
    x,
    y,
    button
  })

  describe("MouseRouterServiceLive", () => {
    it("should register and route mouse events to components", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          // Register a component
          const mockHandler = (mouse: MouseEvent, localX: number, localY: number) => {
            return { type: "click", localX, localY }
          }
          
          yield* _(routerService.registerComponent(
            "test-component",
            { x: 10, y: 10, width: 10, height: 10 },
            mockHandler
          ))
          
          // Route a mouse event
          const mouseEvent = createMockMouseEvent(15, 15, "press", "left")
          const routingResult = yield* _(routerService.routeMouseEvent(mouseEvent))
          
          return routingResult
        }).pipe(Effect.provide(hitTestLayer))
      )

      expect(result).toEqual({
        componentId: "test-component",
        message: { type: "click", localX: 5, localY: 5 },
        localX: 5,
        localY: 5
      })
    })

    it("should return null for mouse events outside component bounds", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          // Route a mouse event outside bounds
          const mouseEvent = createMockMouseEvent(5, 5, "press", "left")
          const routingResult = yield* _(routerService.routeMouseEvent(mouseEvent))
          
          return routingResult
        }).pipe(Effect.provide(hitTestLayer))
      )

      expect(result).toBeNull()
    })

    it("should unregister components", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          // Register and then unregister
          const mockHandler = () => ({ type: "click" })
          
          yield* _(routerService.registerComponent(
            "test-component",
            { x: 10, y: 10, width: 10, height: 10 },
            mockHandler
          ))
          
          yield* _(routerService.unregisterComponent("test-component"))
        }).pipe(Effect.provide(hitTestLayer))
      )

      // Test passes if no errors are thrown
      expect(true).toBe(true)
    })

    it("should update component bounds", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          yield* _(routerService.updateComponentBounds(
            "test-component",
            { x: 20, y: 20, width: 15, height: 15 }
          ))
        }).pipe(Effect.provide(hitTestLayer))
      )

      expect(true).toBe(true)
    })

    it("should clear all components", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          yield* _(routerService.clearAll)
        }).pipe(Effect.provide(hitTestLayer))
      )

      expect(true).toBe(true)
    })

    it("should return null when handler returns null", async () => {
      const hitTestService = createMockHitTestService()
      const hitTestLayer = Layer.succeed(HitTestService, hitTestService)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const routerService = yield* _(MouseRouterServiceLive)
          
          // Register a component with handler that returns null
          const mockHandler = () => null
          
          yield* _(routerService.registerComponent(
            "test-component",
            { x: 10, y: 10, width: 10, height: 10 },
            mockHandler
          ))
          
          // Route a mouse event
          const mouseEvent = createMockMouseEvent(15, 15, "press", "left")
          const routingResult = yield* _(routerService.routeMouseEvent(mouseEvent))
          
          return routingResult
        }).pipe(Effect.provide(hitTestLayer))
      )

      expect(result).toBeNull()
    })
  })
})

describe("Helper Functions", () => {
  describe("clickHandler", () => {
    it("should respond to left click press events", () => {
      const onClick = () => ({ type: "clicked" })
      const handler = clickHandler(onClick)
      
      const mouseEvent = createMockMouseEvent(10, 10, "press", "left")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toEqual({ type: "clicked" })
    })

    it("should ignore non-left clicks", () => {
      const onClick = () => ({ type: "clicked" })
      const handler = clickHandler(onClick)
      
      const mouseEvent = createMockMouseEvent(10, 10, "press", "right")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toBeNull()
    })

    it("should ignore release events", () => {
      const onClick = () => ({ type: "clicked" })
      const handler = clickHandler(onClick)
      
      const mouseEvent = createMockMouseEvent(10, 10, "release", "left")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toBeNull()
    })
  })

  describe("pressReleaseHandler", () => {
    it("should respond to left press events", () => {
      const onPress = () => ({ type: "pressed" })
      const onRelease = () => ({ type: "released" })
      const handler = pressReleaseHandler(onPress, onRelease)
      
      const mouseEvent = createMockMouseEvent(10, 10, "press", "left")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toEqual({ type: "pressed" })
    })

    it("should respond to left release events", () => {
      const onPress = () => ({ type: "pressed" })
      const onRelease = () => ({ type: "released" })
      const handler = pressReleaseHandler(onPress, onRelease)
      
      const mouseEvent = createMockMouseEvent(10, 10, "release", "left")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toEqual({ type: "released" })
    })

    it("should ignore non-left button events", () => {
      const onPress = () => ({ type: "pressed" })
      const onRelease = () => ({ type: "released" })
      const handler = pressReleaseHandler(onPress, onRelease)
      
      const mouseEvent = createMockMouseEvent(10, 10, "press", "right")
      const result = handler(mouseEvent, 5, 5)
      
      expect(result).toBeNull()
    })

    it("should ignore motion and wheel events", () => {
      const onPress = () => ({ type: "pressed" })
      const onRelease = () => ({ type: "released" })
      const handler = pressReleaseHandler(onPress, onRelease)
      
      const motionEvent = createMockMouseEvent(10, 10, "motion", "left")
      const wheelEvent = createMockMouseEvent(10, 10, "wheel", "wheel-up")
      
      expect(handler(motionEvent, 5, 5)).toBeNull()
      expect(handler(wheelEvent, 5, 5)).toBeNull()
    })
  })

  describe("coordinateHandler", () => {
    it("should provide local coordinates to callback", () => {
      const onMouse = (x: number, y: number, event: MouseEvent) => ({
        type: "coordinate",
        x,
        y,
        eventType: event.type
      })
      const handler = coordinateHandler(onMouse)
      
      const mouseEvent = createMockMouseEvent(15, 20, "press", "left")
      const result = handler(mouseEvent, 5, 10)
      
      expect(result).toEqual({
        type: "coordinate",
        x: 5,
        y: 10,
        eventType: "press"
      })
    })

    it("should handle callback returning null", () => {
      const onMouse = () => null
      const handler = coordinateHandler(onMouse)
      
      const mouseEvent = createMockMouseEvent(15, 20, "press", "left")
      const result = handler(mouseEvent, 5, 10)
      
      expect(result).toBeNull()
    })

    it("should work with all mouse event types", () => {
      const onMouse = (x: number, y: number, event: MouseEvent) => ({
        type: event.type,
        coords: [x, y]
      })
      const handler = coordinateHandler(onMouse)
      
      const events = [
        createMockMouseEvent(10, 10, "press"),
        createMockMouseEvent(10, 10, "release"),
        createMockMouseEvent(10, 10, "motion"),
        createMockMouseEvent(10, 10, "wheel")
      ]
      
      const results = events.map(event => handler(event, 5, 7))
      
      expect(results).toEqual([
        { type: "press", coords: [5, 7] },
        { type: "release", coords: [5, 7] },
        { type: "motion", coords: [5, 7] },
        { type: "wheel", coords: [5, 7] }
      ])
    })
  })
})

// Helper function used in tests
function createMockMouseEvent(x: number, y: number, type: "press" | "release" | "motion" | "wheel", button: "left" | "right" | "middle" | "wheel-up" | "wheel-down" = "left"): MouseEvent {
  return { type, x, y, button }
}