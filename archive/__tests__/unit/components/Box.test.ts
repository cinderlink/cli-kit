/**
 * Box Component Tests
 * Simple, focused tests for the Box component functionality
 */

import { describe, test, expect } from "bun:test"
import { Effect } from "effect"
import { Box, type BoxModel } from "../../../../src/components/Box"

// Helper to run Effects that are declared with AppServices but don't actually need them
const runSimpleEffect = <T>(effect: Effect.Effect<T, never, any>): T => 
  Effect.runSync(effect as Effect.Effect<T, never, never>)

describe("Box Component", () => {
  describe("Model and Messages", () => {
    test("creates box with content", () => {
      const model = { content: "Hello", padding: 1 }
      expect(model.content).toBe("Hello")
      expect(model.padding).toBe(1)
    })

    test("creates box without padding", () => {
      const model: BoxModel = { content: "Test" }
      expect(model.content).toBe("Test")
      expect(model.padding).toBeUndefined()
    })

    test("handles SetContent message", () => {
      const msg = { _tag: "SetContent" as const, content: "New content" }
      expect(msg._tag).toBe("SetContent")
      expect(msg.content).toBe("New content")
    })
  })

  describe("Component Logic", () => {
    test("initializes with empty content", () => {
      const [initialModel] = runSimpleEffect(Box.init)
      expect(initialModel.content).toBe("")
      expect(initialModel.padding).toBe(1)
    })

    test("updates content through SetContent message", () => {
      const initialModel = { content: "", padding: 1 }
      const msg = { _tag: "SetContent" as const, content: "Updated" }
      
      const [newModel] = runSimpleEffect(Box.update(msg, initialModel))
      expect(newModel.content).toBe("Updated")
      expect(newModel.padding).toBe(1)
    })

    test("preserves padding during content updates", () => {
      const initialModel = { content: "Old", padding: 3 }
      const msg = { _tag: "SetContent" as const, content: "New" }
      
      const [newModel] = runSimpleEffect(Box.update(msg, initialModel))
      expect(newModel.content).toBe("New")
      expect(newModel.padding).toBe(3)
    })
  })

  describe("View Rendering", () => {
    test("creates view with content", () => {
      const model = { content: "Test content", padding: 1 }
      const view = Box.view(model)
      
      expect(view).toBeDefined()
      expect(view.width).toBeGreaterThan(0)
      expect(view.height).toBeGreaterThan(0)
    })

    test("renders view output", async () => {
      const model = { content: "Hello", padding: 1 }
      const view = Box.view(model)
      
      const output = await Effect.runPromise(view.render())
      expect(output).toContain("Hello")
      expect(typeof output).toBe("string")
    })

    test("handles empty content", async () => {
      const model = { content: "", padding: 1 }
      const view = Box.view(model)
      
      const output = await Effect.runPromise(view.render())
      expect(typeof output).toBe("string")
      expect(output.length).toBeGreaterThan(0) // Should have box structure even with empty content
    })

    test("handles different padding values", () => {
      const paddingValues = [0, 1, 2, 3]
      
      paddingValues.forEach(padding => {
        const model = { content: "Test", padding }
        const view = Box.view(model)
        
        expect(view.width).toBeGreaterThan(0)
        expect(view.height).toBeGreaterThan(0)
      })
    })
  })

  describe("Component Integration", () => {
    test("full workflow: init -> update -> view", async () => {
      // Initialize
      const [initialModel] = runSimpleEffect(Box.init)
      expect(initialModel.content).toBe("")
      
      // Update content
      const msg = { _tag: "SetContent" as const, content: "Workflow test" }
      const [updatedModel] = runSimpleEffect(Box.update(msg, initialModel))
      expect(updatedModel.content).toBe("Workflow test")
      
      // Render view
      const view = Box.view(updatedModel)
      const output = await Effect.runPromise(view.render())
      expect(output).toContain("Workflow test")
    })

    test("multiple content updates", async () => {
      let model: BoxModel = { content: "", padding: 1 }
      
      const contents = ["First", "Second", "Third"]
      
      for (const content of contents) {
        const msg = { _tag: "SetContent" as const, content }
        const [newModel] = runSimpleEffect(Box.update(msg, model))
        model = newModel
        expect(model.content).toBe(content)
      }
      
      // Final state
      expect(model.content).toBe("Third")
    })
  })

  describe("Edge Cases", () => {
    test("handles very long content", async () => {
      const longContent = "A".repeat(1000)
      const model = { content: longContent, padding: 1 }
      const view = Box.view(model)
      
      const output = await Effect.runPromise(view.render())
      expect(output).toContain("A")
      expect(view.width).toBeGreaterThan(100)
    })

    test("handles multiline content", async () => {
      const multilineContent = "Line 1\nLine 2\nLine 3"
      const model = { content: multilineContent, padding: 1 }
      const view = Box.view(model)
      
      const output = await Effect.runPromise(view.render())
      expect(output).toContain("Line 1")
      expect(output).toContain("Line 2")
      expect(output).toContain("Line 3")
    })

    test("handles special characters", async () => {
      const specialContent = "Special: @#$%^&*()_+-=[]{}|;:,.<>?"
      const model = { content: specialContent, padding: 1 }
      const view = Box.view(model)
      
      const output = await Effect.runPromise(view.render())
      expect(output).toContain("Special:")
    })

    test("handles zero padding", () => {
      const model = { content: "No padding", padding: 0 }
      const view = Box.view(model)
      
      expect(view.width).toBeGreaterThan(0)
      expect(view.height).toBeGreaterThan(0)
    })
  })
})