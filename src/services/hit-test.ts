/**
 * Hit Testing Service - Maps mouse coordinates to components
 * 
 * This service maintains a registry of component bounds and provides
 * hit testing functionality to determine which component is at a given
 * mouse coordinate.
 */

import { Effect, Context, Ref, Array as EffectArray, Layer } from "effect"
import type { MouseEvent } from "@/core/types.ts"

// =============================================================================
// Types
// =============================================================================

/**
 * Rectangle representing a component's bounds on screen
 */
export interface ComponentBounds {
  readonly componentId: string
  readonly x: number
  readonly y: number  
  readonly width: number
  readonly height: number
  readonly zIndex: number // Higher values are on top
}

/**
 * Alias for ComponentBounds for backward compatibility
 */
export type MouseRegion = ComponentBounds

/**
 * Result of a hit test
 */
export interface HitTestResult {
  readonly componentId: string
  readonly bounds: ComponentBounds
  readonly localX: number // Mouse X relative to component
  readonly localY: number // Mouse Y relative to component
}

/**
 * Hit testing service interface
 */
export interface HitTestServiceInterface {
  /**
   * Register a component's bounds
   */
  readonly registerComponent: (bounds: ComponentBounds) => Effect.Effect<void, never, never>
  
  /**
   * Unregister a component
   */
  readonly unregisterComponent: (componentId: string) => Effect.Effect<void, never, never>
  
  /**
   * Clear all registered components
   */
  readonly clearComponents: Effect.Effect<void, never, never>
  
  /**
   * Find the topmost component at the given coordinates
   */
  readonly hitTest: (x: number, y: number) => Effect.Effect<HitTestResult | null, never, never>
  
  /**
   * Find all components at the given coordinates (bottom to top)
   */
  readonly hitTestAll: (x: number, y: number) => Effect.Effect<Array<HitTestResult>, never, never>
  
  /**
   * Get all registered component bounds
   */
  readonly getAllBounds: Effect.Effect<Array<ComponentBounds>, never, never>
}

/**
 * Hit testing service tag
 */
export const HitTestService = Context.GenericTag<HitTestServiceInterface>("HitTestService")

// =============================================================================
// Implementation
// =============================================================================

/**
 * Check if a point is inside a rectangle
 */
const pointInRect = (x: number, y: number, bounds: ComponentBounds): boolean => {
  return x >= bounds.x && 
         x < bounds.x + bounds.width &&
         y >= bounds.y && 
         y < bounds.y + bounds.height
}

/**
 * Live implementation of the hit testing service
 */
export const HitTestServiceLive = Effect.gen(function* (_) {
  const componentsRef = yield* _(Ref.make<Array<ComponentBounds>>([]))
  
  return {
    registerComponent: (bounds: ComponentBounds) =>
      Ref.update(componentsRef, components => {
        // Remove existing registration for this component
        const filtered = components.filter(c => c.componentId !== bounds.componentId)
        // Add new bounds, keeping sorted by zIndex (lowest first)
        return [...filtered, bounds].sort((a, b) => a.zIndex - b.zIndex)
      }),
    
    unregisterComponent: (componentId: string) =>
      Ref.update(componentsRef, components =>
        components.filter(c => c.componentId !== componentId)
      ),
    
    clearComponents: Ref.set(componentsRef, []),
    
    hitTest: (x: number, y: number) =>
      Effect.gen(function* (_) {
        const components = yield* _(Ref.get(componentsRef))
        
        // Find all components at this point, then return the topmost (highest zIndex)
        const hits = components
          .filter(bounds => pointInRect(x, y, bounds))
          .map(bounds => ({
            componentId: bounds.componentId,
            bounds,
            localX: x - bounds.x,
            localY: y - bounds.y
          }))
        
        // Return the topmost hit (last in the sorted array)
        return hits.length > 0 ? hits[hits.length - 1] : null
      }),
    
    hitTestAll: (x: number, y: number) =>
      Effect.gen(function* (_) {
        const components = yield* _(Ref.get(componentsRef))
        
        return components
          .filter(bounds => pointInRect(x, y, bounds))
          .map(bounds => ({
            componentId: bounds.componentId,
            bounds,
            localX: x - bounds.x,
            localY: y - bounds.y
          }))
      }),
    
    getAllBounds: Ref.get(componentsRef)
  }
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create component bounds
 */
export const createBounds = (
  componentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number = 0
): ComponentBounds => ({
  componentId,
  x,
  y,
  width,
  height,
  zIndex
})

/**
 * Check if a mouse event hits a component
 */
export const mouseEventHitsComponent = (
  mouseEvent: MouseEvent,
  bounds: ComponentBounds
): boolean => pointInRect(mouseEvent.x, mouseEvent.y, bounds)

/**
 * Create a layer with the HitTestService implementation
 */
export const createHitTestService = () => Layer.effect(HitTestService, HitTestServiceLive)