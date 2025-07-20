/**
 * Tests for Hit Test Service
 */

import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { HitTestService, HitTestServiceLive, createHitTestService } from "@/services/hit-test"
import type { ComponentBounds } from "@/services/hit-test"

describe("Hit Test Service", () => {
  const createTestService = () => {
    const layer = createHitTestService()
    return Effect.gen(function* (_) {
      return yield* _(HitTestService)
    }).pipe(Effect.provide(layer))
  }

  const createBounds = (id: string, x: number, y: number, width: number, height: number, zIndex: number = 0): ComponentBounds => ({
    componentId: id,
    x,
    y,
    width,
    height,
    zIndex
  })

  it("registers and tests component bounds", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const bounds1 = createBounds("button1", 10, 10, 20, 10)
    const bounds2 = createBounds("button2", 40, 10, 20, 10)
    
    // Register components
    await Effect.runPromise(service.registerComponent(bounds1))
    await Effect.runPromise(service.registerComponent(bounds2))
    
    // Test hits
    const hit1 = await Effect.runPromise(service.hitTest(15, 15))
    expect(hit1?.componentId).toBe("button1")
    expect(hit1?.localX).toBe(5)
    expect(hit1?.localY).toBe(5)
    
    const hit2 = await Effect.runPromise(service.hitTest(50, 15))
    expect(hit2?.componentId).toBe("button2")
    expect(hit2?.localX).toBe(10)
    expect(hit2?.localY).toBe(5)
    
    const miss = await Effect.runPromise(service.hitTest(5, 5))
    expect(miss).toBeNull()
  })

  it("unregisters components", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const bounds = createBounds("temp", 0, 0, 10, 10)
    
    await Effect.runPromise(service.registerComponent(bounds))
    
    // Should hit before unregistering
    const before = await Effect.runPromise(service.hitTest(5, 5))
    expect(before?.componentId).toBe("temp")
    
    // Unregister
    await Effect.runPromise(service.unregisterComponent("temp"))
    
    // Should miss after unregistering
    const after = await Effect.runPromise(service.hitTest(5, 5))
    expect(after).toBeNull()
  })

  it("clears all components", async () => {
    const service = await Effect.runPromise(createTestService())
    
    // Register multiple components
    for (let i = 0; i < 3; i++) {
      await Effect.runPromise(service.registerComponent(
        createBounds(`comp${i}`, i * 20, 0, 10, 10)
      ))
    }
    
    const before = await Effect.runPromise(service.hitTest(25, 5))
    expect(before).not.toBeNull()
    
    // Clear all
    await Effect.runPromise(service.clearComponents)
    
    const after = await Effect.runPromise(service.hitTest(25, 5))
    expect(after).toBeNull()
  })

  it("handles overlapping components with z-index", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const bottom = createBounds("bottom", 10, 10, 20, 20, 1)
    const top = createBounds("top", 15, 15, 10, 10, 2)
    
    await Effect.runPromise(service.registerComponent(bottom))
    await Effect.runPromise(service.registerComponent(top))
    
    // Should hit the top component in overlapping area
    const hit = await Effect.runPromise(service.hitTest(20, 20))
    expect(hit?.componentId).toBe("top")
    
    // Should hit bottom component in non-overlapping area
    const bottomHit = await Effect.runPromise(service.hitTest(12, 12))
    expect(bottomHit?.componentId).toBe("bottom")
  })

  it("updates existing component bounds", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const original = createBounds("movable", 0, 0, 10, 10)
    await Effect.runPromise(service.registerComponent(original))
    
    // Should hit at original position
    const oldHit = await Effect.runPromise(service.hitTest(5, 5))
    expect(oldHit?.componentId).toBe("movable")
    
    // Update bounds (re-register with same componentId)
    const updated = createBounds("movable", 20, 20, 10, 10)
    await Effect.runPromise(service.registerComponent(updated))
    
    // Should miss at old position
    const oldMiss = await Effect.runPromise(service.hitTest(5, 5))
    expect(oldMiss).toBeNull()
    
    // Should hit at new position
    const newHit = await Effect.runPromise(service.hitTest(25, 25))
    expect(newHit?.componentId).toBe("movable")
  })

  it("gets all registered component bounds", async () => {
    const service = await Effect.runPromise(createTestService())
    
    // Register multiple components
    const bounds = [
      createBounds("a", 0, 0, 10, 10),
      createBounds("b", 20, 20, 15, 15),
      createBounds("c", 40, 40, 5, 5)
    ]
    
    for (const bound of bounds) {
      await Effect.runPromise(service.registerComponent(bound))
    }
    
    const all = await Effect.runPromise(service.getAllBounds)
    expect(all).toHaveLength(3)
    expect(all.map(b => b.componentId).sort()).toEqual(["a", "b", "c"])
  })

  it("finds all components at a point", async () => {
    const service = await Effect.runPromise(createTestService())
    
    // Create overlapping components
    await Effect.runPromise(service.registerComponent(
      createBounds("layer1", 10, 10, 20, 20, 1)
    ))
    await Effect.runPromise(service.registerComponent(
      createBounds("layer2", 15, 15, 10, 10, 2)
    ))
    await Effect.runPromise(service.registerComponent(
      createBounds("layer3", 18, 18, 4, 4, 3)
    ))
    
    const hits = await Effect.runPromise(service.hitTestAll(20, 20))
    expect(hits).toHaveLength(3)
    
    // Should be sorted by zIndex
    const ids = hits.map(h => h.componentId)
    expect(ids).toEqual(["layer1", "layer2", "layer3"])
  })

  it("handles edge detection correctly", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const bounds = createBounds("edge-test", 10, 10, 20, 20)
    await Effect.runPromise(service.registerComponent(bounds))
    
    // Should hit on all edges (inclusive)
    expect(await Effect.runPromise(service.hitTest(10, 10))).not.toBeNull() // Top-left
    expect(await Effect.runPromise(service.hitTest(29, 10))).not.toBeNull() // Top-right
    expect(await Effect.runPromise(service.hitTest(10, 29))).not.toBeNull() // Bottom-left
    expect(await Effect.runPromise(service.hitTest(29, 29))).not.toBeNull() // Bottom-right
    
    // Should miss just outside edges
    expect(await Effect.runPromise(service.hitTest(9, 10))).toBeNull()
    expect(await Effect.runPromise(service.hitTest(30, 10))).toBeNull()
    expect(await Effect.runPromise(service.hitTest(10, 9))).toBeNull()
    expect(await Effect.runPromise(service.hitTest(10, 30))).toBeNull()
  })

  it("calculates correct local coordinates", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const bounds = createBounds("coords", 100, 50, 20, 30)
    await Effect.runPromise(service.registerComponent(bounds))
    
    const hit = await Effect.runPromise(service.hitTest(115, 65))
    expect(hit?.componentId).toBe("coords")
    expect(hit?.localX).toBe(15) // 115 - 100
    expect(hit?.localY).toBe(15) // 65 - 50
  })

  it("handles zero-sized components", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const zeroBounds = createBounds("zero", 10, 10, 0, 0)
    await Effect.runPromise(service.registerComponent(zeroBounds))
    
    // Zero-sized component should not be hit
    const miss = await Effect.runPromise(service.hitTest(10, 10))
    expect(miss).toBeNull()
  })

  it("handles negative coordinates", async () => {
    const service = await Effect.runPromise(createTestService())
    
    const negativeBounds = createBounds("negative", -10, -10, 20, 20)
    await Effect.runPromise(service.registerComponent(negativeBounds))
    
    const hit = await Effect.runPromise(service.hitTest(-5, -5))
    expect(hit?.componentId).toBe("negative")
    expect(hit?.localX).toBe(5) // -5 - (-10)
    expect(hit?.localY).toBe(5) // -5 - (-10)
  })
})