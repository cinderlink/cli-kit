/**
 * Mouse Router Service - Routes mouse events to components
 * 
 * This service coordinates between hit testing and component message routing.
 * It maintains a registry of components and their mouse handlers, performs
 * hit testing, and converts mouse events to component messages.
 */

import { Effect, Context, Ref, Array as EffectArray, HashMap } from "effect"
import type { MouseEvent } from "@/core/types.ts"
import { HitTestService, type ComponentBounds, createBounds } from "./hit-test.js"

// =============================================================================
// Types
// =============================================================================

/**
 * Component mouse handler registration
 */
export interface ComponentMouseHandler<Msg> {
  readonly componentId: string
  readonly handler: (mouse: MouseEvent, localX: number, localY: number) => Msg | null
}

/**
 * Mouse routing result
 */
export interface MouseRoutingResult<Msg> {
  readonly componentId: string
  readonly message: Msg
  readonly localX: number
  readonly localY: number
}

/**
 * Mouse router service interface
 */
export interface MouseRouterServiceInterface {
  /**
   * Register a component for mouse events
   */
  readonly registerComponent: <Msg>(
    componentId: string,
    bounds: ComponentBounds,
    handler: (mouse: MouseEvent, localX: number, localY: number) => Msg | null
  ) => Effect.Effect<void, never, never>
  
  /**
   * Unregister a component
   */
  readonly unregisterComponent: (componentId: string) => Effect.Effect<void, never, never>
  
  /**
   * Update component bounds (for layout changes)
   */
  readonly updateComponentBounds: (componentId: string, bounds: ComponentBounds) => Effect.Effect<void, never, never>
  
  /**
   * Route a mouse event to the appropriate component
   */
  readonly routeMouseEvent: <Msg>(mouseEvent: MouseEvent) => Effect.Effect<MouseRoutingResult<Msg> | null, never, HitTestService>
  
  /**
   * Clear all registrations
   */
  readonly clearAll: Effect.Effect<void, never, HitTestService>
}

/**
 * Mouse router service tag
 */
export const MouseRouterService = Context.GenericTag<MouseRouterServiceInterface>("MouseRouterService")

// =============================================================================
// Implementation
// =============================================================================

/**
 * Live implementation of the mouse router service
 */
export const MouseRouterServiceLive = Effect.gen(function* (_) {
  const handlersRef = yield* _(Ref.make<HashMap.HashMap<string, (mouse: MouseEvent, localX: number, localY: number) => any>>(HashMap.empty()))
  
  return {
    registerComponent: <Msg>(
      componentId: string,
      bounds: ComponentBounds,
      handler: (mouse: MouseEvent, localX: number, localY: number) => Msg | null
    ) =>
      Effect.gen(function* (_) {
        const hitTest = yield* _(HitTestService)
        
        // Register with hit testing
        yield* _(hitTest.registerComponent(bounds))
        
        // Register handler
        yield* _(Ref.update(handlersRef, handlers =>
          HashMap.set(handlers, componentId, handler)
        ))
      }),
    
    unregisterComponent: (componentId: string) =>
      Effect.gen(function* (_) {
        const hitTest = yield* _(HitTestService)
        
        // Unregister from hit testing
        yield* _(hitTest.unregisterComponent(componentId))
        
        // Remove handler
        yield* _(Ref.update(handlersRef, handlers =>
          HashMap.remove(handlers, componentId)
        ))
      }),
    
    updateComponentBounds: (componentId: string, bounds: ComponentBounds) =>
      Effect.gen(function* (_) {
        const hitTest = yield* _(HitTestService)
        yield* _(hitTest.registerComponent(bounds)) // This will update existing
      }),
    
    routeMouseEvent: <Msg>(mouseEvent: MouseEvent) =>
      Effect.gen(function* (_) {
        const hitTest = yield* _(HitTestService)
        const handlers = yield* _(Ref.get(handlersRef))
        
        // Find component at mouse coordinates
        const hitResult = yield* _(hitTest.hitTest(mouseEvent.x, mouseEvent.y))
        if (!hitResult) return null
        
        // Get handler for this component
        const handler = HashMap.get(handlers, hitResult.componentId)
        if (!handler) return null
        
        // Call handler with local coordinates
        const message = handler(mouseEvent, hitResult.localX, hitResult.localY)
        if (!message) return null
        
        return {
          componentId: hitResult.componentId,
          message,
          localX: hitResult.localX,
          localY: hitResult.localY
        } as MouseRoutingResult<Msg>
      }),
    
    clearAll: Effect.gen(function* (_) {
      const hitTest = yield* _(HitTestService)
      yield* _(hitTest.clearComponents)
      yield* _(Ref.set(handlersRef, HashMap.empty()))
    })
  }
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a simple mouse handler that only responds to left clicks
 */
export const clickHandler = <Msg>(onClick: () => Msg) =>
  (mouse: MouseEvent, localX: number, localY: number): Msg | null => {
    if (mouse.type === 'press' && mouse.button === 'left') {
      return onClick()
    }
    return null
  }

/**
 * Create a mouse handler that responds to press and release
 */
export const pressReleaseHandler = <Msg>(onPress: () => Msg, onRelease: () => Msg) =>
  (mouse: MouseEvent, localX: number, localY: number): Msg | null => {
    if (mouse.button === 'left') {
      if (mouse.type === 'press') {
        return onPress()
      } else if (mouse.type === 'release') {
        return onRelease()
      }
    }
    return null
  }

/**
 * Create a mouse handler that provides mouse coordinates
 */
export const coordinateHandler = <Msg>(onMouse: (x: number, y: number, event: MouseEvent) => Msg | null) =>
  (mouse: MouseEvent, localX: number, localY: number): Msg | null =>
    onMouse(localX, localY, mouse)