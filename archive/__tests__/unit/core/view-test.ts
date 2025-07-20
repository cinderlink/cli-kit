/**
 * Tests for View utilities
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { measureView, renderView, isView, createView } from "@/core/view"
import type { View } from "@/core/types"

describe("View Utilities", () => {
  const simpleView: View = {
    render: () => Effect.succeed("Hello World"),
    width: 11,
    height: 1
  }

  const multilineView: View = {
    render: () => Effect.succeed("Line 1\nLine 2\nLine 3"),
    width: 6,
    height: 3
  }

  describe("measureView", () => {
    it("measures simple views", async () => {
      const dimensions = await Effect.runPromise(measureView(simpleView))
      expect(dimensions.width).toBe(11)
      expect(dimensions.height).toBe(1)
    })

    it("measures multiline views", async () => {
      const dimensions = await Effect.runPromise(measureView(multilineView))
      expect(dimensions.width).toBe(6)
      expect(dimensions.height).toBe(3)
    })

    it("uses cached dimensions when available", async () => {
      let renderCount = 0
      const countingView: View = {
        render: () => {
          renderCount++
          return Effect.succeed("Test")
        },
        width: 4,
        height: 1
      }

      await Effect.runPromise(measureView(countingView))
      await Effect.runPromise(measureView(countingView))
      
      expect(renderCount).toBe(0) // Should use cached dimensions
    })

    it("measures dynamic views without cached dimensions", async () => {
      const dynamicView: View = {
        render: () => Effect.succeed("Dynamic content here")
      }

      const dimensions = await Effect.runPromise(measureView(dynamicView))
      expect(dimensions.width).toBe(19)
      expect(dimensions.height).toBe(1)
    })
  })

  describe("renderView", () => {
    it("renders views to strings", async () => {
      const content = await Effect.runPromise(renderView(simpleView))
      expect(content).toBe("Hello World")
    })

    it("renders multiline views", async () => {
      const content = await Effect.runPromise(renderView(multilineView))
      expect(content).toBe("Line 1\nLine 2\nLine 3")
    })

    it("renders views that return Effects", async () => {
      const effectView: View = {
        render: () => Effect.succeed("Effect content")
      }
      
      const content = await Effect.runPromise(renderView(effectView))
      expect(content).toBe("Effect content")
    })
  })

  describe("isView", () => {
    it("identifies valid views", () => {
      expect(isView(simpleView)).toBe(true)
      expect(isView(multilineView)).toBe(true)
      
      const minimalView = {
        render: () => Effect.succeed("test")
      }
      expect(isView(minimalView)).toBe(true)
    })

    it("rejects non-views", () => {
      expect(isView(null)).toBe(false)
      expect(isView(undefined)).toBe(false)
      expect(isView({})).toBe(false)
      expect(isView({ render: "not a function" })).toBe(false)
      expect(isView("string")).toBe(false)
      expect(isView(123)).toBe(false)
      expect(isView([])).toBe(false)
    })
  })

  describe("createView", () => {
    it("creates view from string", async () => {
      const view = createView("Simple text")
      expect(isView(view)).toBe(true)
      
      const content = await Effect.runPromise(renderView(view))
      expect(content).toBe("Simple text")
      
      const dimensions = await Effect.runPromise(measureView(view))
      expect(dimensions.width).toBe(11)
      expect(dimensions.height).toBe(1)
    })

    it("creates view from function", async () => {
      const view = createView(() => "Function text")
      const content = await Effect.runPromise(renderView(view))
      expect(content).toBe("Function text")
    })

    it("creates view from Effect", async () => {
      const view = createView(Effect.succeed("Effect text"))
      const content = await Effect.runPromise(renderView(view))
      expect(content).toBe("Effect text")
    })

    it("passes through existing views", () => {
      const view = createView(simpleView)
      expect(view).toBe(simpleView)
    })

    it("creates multiline views", async () => {
      const view = createView("Line 1\nLine 2")
      const dimensions = await Effect.runPromise(measureView(view))
      expect(dimensions.width).toBe(6)
      expect(dimensions.height).toBe(2)
    })
  })
})