/**
 * MVU Runtime Tests
 * 
 * Comprehensive tests for the Model-View-Update runtime,
 * focusing on state management, update cycles, and the core data flow.
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Effect, Stream, Fiber, Ref } from "effect"
import { Runtime, createRuntime, RuntimeConfig } from "./runtime"
import { Program } from "./runtime"
import { text, box, vstack, hstack } from "@core/view"
import type { View } from "@core/view"
import type { Cmd } from "./runtime"

// Test program types
interface TestModel {
  count: number
  text: string
  items: string[]
}

type TestMsg = 
  | { _tag: "increment" }
  | { _tag: "decrement" }
  | { _tag: "setText"; text: string }
  | { _tag: "addItem"; item: string }
  | { _tag: "removeItem"; index: number }
  | { _tag: "asyncComplete"; result: string }

describe("MVU Runtime", () => {
  describe("Basic Runtime Operations", () => {
    it("should create runtime with program", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "initial", items: [] },
          Effect.succeed({ _tag: "increment" })
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [{ ...model, count: model.count + 1 }, Effect.succeed(null)]
            case "decrement":
              return [{ ...model, count: model.count - 1 }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`)
      }

      const runtime = await Effect.runPromise(
        createRuntime(program)
      )

      expect(runtime).toBeDefined()
      expect(runtime.getModel).toBeDefined()
      expect(runtime.dispatch).toBeDefined()
      expect(runtime.shutdown).toBeDefined()
    })

    it("should initialize with correct model", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 42, text: "test", items: ["a", "b"] },
          Effect.succeed(null)
        ],
        update: (msg, model) => [model, Effect.succeed(null)],
        view: (model) => text(model.text)
      }

      const runtime = await Effect.runPromise(
        createRuntime(program)
      )

      const model = await Effect.runPromise(runtime.getModel())
      expect(model.count).toBe(42)
      expect(model.text).toBe("test")
      expect(model.items).toEqual(["a", "b"])
    })
  })

  describe("Update Cycles", () => {
    it("should process messages and update model", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [{ ...model, count: model.count + 1 }, Effect.succeed(null)]
            case "setText":
              return [{ ...model, text: msg.text }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(`${model.text}: ${model.count}`)
      }

      const runtime = await Effect.runPromise(createRuntime(program))

      // Dispatch messages
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      await Effect.runPromise(runtime.dispatch({ _tag: "setText", text: "Counter" }))
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))

      const model = await Effect.runPromise(runtime.getModel())
      expect(model.count).toBe(2)
      expect(model.text).toBe("Counter")
    })

    it("should handle command effects", async () => {
      let sideEffectCalled = false
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [
                { ...model, count: model.count + 1 },
                Effect.gen(function* () {
                  sideEffectCalled = true
                  return { _tag: "setText", text: "Incremented!" }
                })
              ]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(model.text)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      // Wait for command to be processed
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(sideEffectCalled).toBe(true)
      const model = await Effect.runPromise(runtime.getModel())
      expect(model.text).toBe("Incremented!")
    })

    it("should batch multiple updates", async () => {
      let updateCount = 0
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          updateCount++
          switch (msg._tag) {
            case "increment":
              return [{ ...model, count: model.count + 1 }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Dispatch multiple messages rapidly
      await Effect.runPromise(
        Effect.all([
          runtime.dispatch({ _tag: "increment" }),
          runtime.dispatch({ _tag: "increment" }),
          runtime.dispatch({ _tag: "increment" })
        ])
      )

      const model = await Effect.runPromise(runtime.getModel())
      expect(model.count).toBe(3)
      expect(updateCount).toBe(3)
    })
  })

  describe("View Rendering", () => {
    it("should render view based on model", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "Hello", items: ["A", "B", "C"] },
          Effect.succeed(null)
        ],
        update: (msg, model) => [model, Effect.succeed(null)],
        view: (model) => vstack([
          text(model.text),
          text(`Count: ${model.count}`),
          ...model.items.map(item => text(`- ${item}`))
        ])
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      const view = await Effect.runPromise(runtime.getView())
      
      expect(view.type).toBe("vstack")
      expect(view.children).toHaveLength(4) // text + count + 3 items
    })

    it("should update view when model changes", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "addItem":
              return [
                { ...model, items: [...model.items, msg.item] },
                Effect.succeed(null)
              ]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => vstack(model.items.map(item => text(item)))
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Initial view
      let view = await Effect.runPromise(runtime.getView())
      expect(view.children).toHaveLength(0)
      
      // Add items
      await Effect.runPromise(runtime.dispatch({ _tag: "addItem", item: "First" }))
      await Effect.runPromise(runtime.dispatch({ _tag: "addItem", item: "Second" }))
      
      view = await Effect.runPromise(runtime.getView())
      expect(view.children).toHaveLength(2)
    })
  })

  describe("Subscription Management", () => {
    it("should subscribe to model changes", async () => {
      const modelHistory: TestModel[] = []
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [{ ...model, count: model.count + 1 }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Subscribe to model changes
      const fiber = await Effect.runPromise(
        Effect.fork(
          runtime.subscribe((model) => {
            modelHistory.push({ ...model })
            return Effect.void
          })
        )
      )

      // Make changes
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      // Wait for subscriptions to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(modelHistory.length).toBeGreaterThanOrEqual(2)
      expect(modelHistory[modelHistory.length - 1].count).toBe(2)
      
      await Effect.runPromise(Fiber.interrupt(fiber))
    })

    it("should handle subscription errors gracefully", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => [model, Effect.succeed(null)],
        view: (model) => text("Test")
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Subscribe with failing handler
      const fiber = await Effect.runPromise(
        Effect.fork(
          runtime.subscribe((model) => {
            throw new Error("Subscription error")
          })
        )
      )

      // Should not crash runtime
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      const model = await Effect.runPromise(runtime.getModel())
      expect(model).toBeDefined()
      
      await Effect.runPromise(Fiber.interrupt(fiber))
    })
  })

  describe("Async Operations", () => {
    it("should handle async commands", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "Loading...", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [
                { ...model, text: "Loading..." },
                Effect.gen(function* () {
                  // Simulate async operation
                  yield* Effect.sleep(10)
                  return { _tag: "asyncComplete", result: "Loaded!" }
                })
              ]
            case "asyncComplete":
              return [
                { ...model, text: msg.result },
                Effect.succeed(null)
              ]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(model.text)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const model = await Effect.runPromise(runtime.getModel())
      expect(model.text).toBe("Loaded!")
    })

    it("should handle multiple concurrent commands", async () => {
      const results: string[] = []
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [
                model,
                Effect.all([
                  Effect.gen(function* () {
                    yield* Effect.sleep(Math.random() * 20)
                    results.push("A")
                    return null
                  }),
                  Effect.gen(function* () {
                    yield* Effect.sleep(Math.random() * 20)
                    results.push("B")
                    return null
                  })
                ]).pipe(Effect.map(() => null))
              ]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text("Test")
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      // Wait for commands
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(results).toContain("A")
      expect(results).toContain("B")
    })
  })

  describe("Error Handling", () => {
    it("should handle update errors", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          if (msg._tag === "increment" && model.count >= 2) {
            throw new Error("Count too high!")
          }
          switch (msg._tag) {
            case "increment":
              return [{ ...model, count: model.count + 1 }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // These should work
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      await Effect.runPromise(runtime.dispatch({ _tag: "increment" }))
      
      // This should fail but not crash
      await Effect.runPromise(
        runtime.dispatch({ _tag: "increment" }).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )
      
      const model = await Effect.runPromise(runtime.getModel())
      expect(model.count).toBe(2) // Should not have incremented
    })

    it("should handle command errors", async () => {
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "increment":
              return [
                model,
                Effect.fail(new Error("Command failed"))
              ]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text("Test")
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Should not crash runtime
      await Effect.runPromise(
        runtime.dispatch({ _tag: "increment" }).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )
      
      // Runtime should still be functional
      const model = await Effect.runPromise(runtime.getModel())
      expect(model).toBeDefined()
    })
  })

  describe("Lifecycle Management", () => {
    it("should clean up resources on shutdown", async () => {
      let cleanedUp = false
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => [model, Effect.succeed(null)],
        view: (model) => text("Test"),
        subscriptions: (model) => [
          Effect.gen(function* () {
            // Set up resource
            yield* Effect.addFinalizer(() => 
              Effect.sync(() => { cleanedUp = true })
            )
            
            // Return a stream that never emits
            return Stream.never
          })
        ]
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      await Effect.runPromise(runtime.shutdown())
      
      expect(cleanedUp).toBe(true)
    })

    it("should handle init command", async () => {
      let initCommandExecuted = false
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.gen(function* () {
            initCommandExecuted = true
            return { _tag: "setText", text: "Initialized" }
          })
        ],
        update: (msg, model) => {
          switch (msg._tag) {
            case "setText":
              return [{ ...model, text: msg.text }, Effect.succeed(null)]
            default:
              return [model, Effect.succeed(null)]
          }
        },
        view: (model) => text(model.text)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Wait for init command
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(initCommandExecuted).toBe(true)
      const model = await Effect.runPromise(runtime.getModel())
      expect(model.text).toBe("Initialized")
    })
  })

  describe("Performance", () => {
    it("should handle rapid updates efficiently", async () => {
      const updateTimes: number[] = []
      
      const program: Program<TestModel, TestMsg> = {
        init: () => [
          { count: 0, text: "", items: [] },
          Effect.succeed(null)
        ],
        update: (msg, model) => {
          const start = Date.now()
          const newModel = msg._tag === "increment" 
            ? { ...model, count: model.count + 1 }
            : model
          updateTimes.push(Date.now() - start)
          return [newModel, Effect.succeed(null)]
        },
        view: (model) => text(`Count: ${model.count}`)
      }

      const runtime = await Effect.runPromise(createRuntime(program))
      
      // Rapid fire updates
      const promises = Array(100).fill(0).map(() => 
        runtime.dispatch({ _tag: "increment" })
      )
      
      await Effect.runPromise(Effect.all(promises))
      
      const model = await Effect.runPromise(runtime.getModel())
      expect(model.count).toBe(100)
      
      // Check update times are reasonable
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      expect(avgUpdateTime).toBeLessThan(5) // Should be very fast
    })
  })
})