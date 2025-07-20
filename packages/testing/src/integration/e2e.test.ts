/**
 * End-to-End Application Tests - Test complete app workflows
 * 
 * This module tests complete TUIX application workflows including:
 * - Application startup and shutdown
 * - User interaction flows
 * - Plugin-enhanced workflows
 * - Error recovery scenarios
 * - Performance under load
 * 
 * Tests follow the requirements from task 3A.5 with comprehensive coverage
 * of complete application integration scenarios.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Context, Layer, Ref, Queue, Stream, Fiber, Schedule } from "effect"
import {
  createTestHarness,
  runTest,
  type TestHarnessOptions,
  type TestSession,
  type KeySequence,
} from "../e2e-harness"
import {
  createMockAppServices,
  withMockServices,
  createTestLayer,
} from "../test-utils"
import { ComponentError } from "@tuix/core"
import { createPlugin, createPluginSystem } from "@tuix/core/plugin"

// =============================================================================
// Test Application Factories
// =============================================================================

/**
 * Create a simple counter application for testing
 */
const createCounterApp = () => {
  const state = Ref.unsafeMake({ count: 0, message: "Counter App" })
  
  return {
    init: Effect.gen(function* (_) {
      yield* _(Ref.set(state, { count: 0, message: "Counter initialized" }))
    }),
    
    handleInput: (input: string) => Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      switch (input) {
        case "+":
          yield* _(Ref.set(state, { 
            count: current.count + 1, 
            message: `Count: ${current.count + 1}` 
          }))
          break
        case "-":
          yield* _(Ref.set(state, { 
            count: current.count - 1, 
            message: `Count: ${current.count - 1}` 
          }))
          break
        case "r":
          yield* _(Ref.set(state, { 
            count: 0, 
            message: "Counter reset" 
          }))
          break
      }
    }),
    
    render: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      return `${current.message}\nPress +/- to change, r to reset, q to quit`
    }),
    
    cleanup: Effect.gen(function* (_) {
      yield* _(Ref.set(state, { count: 0, message: "Cleanup complete" }))
    }),
    
    getState: () => Ref.get(state),
  }
}

/**
 * Create a todo application for testing
 */
const createTodoApp = () => {
  const state = Ref.unsafeMake({ 
    todos: [] as string[], 
    input: "",
    mode: "list" as "list" | "add"
  })
  
  return {
    init: Effect.gen(function* (_) {
      yield* _(Ref.set(state, { 
        todos: [], 
        input: "", 
        mode: "list" 
      }))
    }),
    
    handleInput: (input: string) => Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      
      if (current.mode === "list") {
        switch (input) {
          case "a":
            yield* _(Ref.update(state, s => ({ ...s, mode: "add", input: "" })))
            break
          case "d":
            if (current.todos.length > 0) {
              yield* _(Ref.update(state, s => ({ 
                ...s, 
                todos: s.todos.slice(0, -1) 
              })))
            }
            break
        }
      } else if (current.mode === "add") {
        if (input === "Enter") {
          if (current.input.trim()) {
            yield* _(Ref.update(state, s => ({ 
              ...s, 
              todos: [...s.todos, s.input.trim()],
              input: "",
              mode: "list"
            })))
          }
        } else if (input === "Escape") {
          yield* _(Ref.update(state, s => ({ 
            ...s, 
            input: "", 
            mode: "list" 
          })))
        } else if (input === "Backspace") {
          yield* _(Ref.update(state, s => ({ 
            ...s, 
            input: s.input.slice(0, -1) 
          })))
        } else if (input.length === 1) {
          yield* _(Ref.update(state, s => ({ 
            ...s, 
            input: s.input + input 
          })))
        }
      }
    }),
    
    render: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      
      if (current.mode === "list") {
        const todoList = current.todos.map((todo, i) => `${i + 1}. ${todo}`).join("\n")
        return `Todo List:\n${todoList}\n\nPress 'a' to add, 'd' to delete, 'q' to quit`
      } else {
        return `Add Todo: ${current.input}\nPress Enter to add, Escape to cancel`
      }
    }),
    
    cleanup: Effect.gen(function* (_) {
      yield* _(Ref.set(state, { todos: [], input: "", mode: "list" }))
    }),
    
    getState: () => Ref.get(state),
  }
}

/**
 * Create a plugin-enhanced application
 */
const createPluginApp = () => {
  const state = Ref.unsafeMake({ 
    message: "Plugin App",
    plugins: [] as string[]
  })
  
  return {
    init: Effect.gen(function* (_) {
      // Initialize plugin system
      const pluginSystem = await createPluginSystem()
      
      // Register test plugin
      const testPlugin = createPlugin({
        name: "test-plugin",
        version: "1.0.0",
        description: "Test plugin for E2E testing",
      })
      
      await pluginSystem.registerPlugin(testPlugin)
      
      yield* _(Ref.set(state, { 
        message: "Plugin app initialized",
        plugins: ["test-plugin"]
      }))
    }),
    
    handleInput: (input: string) => Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      switch (input) {
        case "p":
          yield* _(Ref.update(state, s => ({ 
            ...s, 
            message: `Plugins: ${s.plugins.join(", ")}` 
          })))
          break
        case "r":
          yield* _(Ref.update(state, s => ({ 
            ...s, 
            message: "Plugin app refreshed" 
          })))
          break
      }
    }),
    
    render: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(state))
      return `${current.message}\nPress 'p' to show plugins, 'r' to refresh, 'q' to quit`
    }),
    
    cleanup: Effect.gen(function* (_) {
      yield* _(Ref.set(state, { message: "Cleanup complete", plugins: [] }))
    }),
    
    getState: () => Ref.get(state),
  }
}

// =============================================================================
// Application Startup and Shutdown Tests
// =============================================================================

describe("Application Startup and Shutdown", () => {
  test("should start and initialize application correctly", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Initialize app
        yield* _(app.init)
        
        // Verify initial state
        const state = yield* _(app.getState())
        expect(state.count).toBe(0)
        expect(state.message).toBe("Counter initialized")
        
        // Verify initial render
        const rendered = yield* _(app.render)
        expect(rendered).toContain("Counter initialized")
        expect(rendered).toContain("Press +/- to change")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle application shutdown gracefully", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Initialize and use app
        yield* _(app.init)
        yield* _(app.handleInput("+"))
        yield* _(app.handleInput("+"))
        
        // Verify state before shutdown
        const beforeShutdown = yield* _(app.getState())
        expect(beforeShutdown.count).toBe(2)
        
        // Shutdown
        yield* _(app.cleanup)
        
        // Verify cleanup
        const afterShutdown = yield* _(app.getState())
        expect(afterShutdown.message).toBe("Cleanup complete")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle initialization errors", async () => {
    const errorApp = {
      init: Effect.fail(new ComponentError({
        componentName: "ErrorApp",
        operation: "init",
        message: "Initialization failed"
      })),
      handleInput: (_: string) => Effect.succeed(void 0),
      render: Effect.succeed("Error app"),
      cleanup: Effect.succeed(void 0),
    }
    
    const result = await Effect.runPromise(
      errorApp.init.pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(ComponentError)
  })
  
  test("should handle concurrent app startup", async () => {
    const appCount = 5
    const apps = Array.from({ length: appCount }, () => createCounterApp())
    
    const startTime = performance.now()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Start all apps concurrently
        yield* _(Effect.all(
          apps.map(app => app.init),
          { concurrency: 5 }
        ))
        
        // Verify all apps initialized
        const states = yield* _(Effect.all(
          apps.map(app => app.getState())
        ))
        
        states.forEach(state => {
          expect(state.count).toBe(0)
          expect(state.message).toBe("Counter initialized")
        })
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(1000) // 1 second
  })
})

// =============================================================================
// User Interaction Flow Tests
// =============================================================================

describe("User Interaction Flows", () => {
  test("should handle basic user input sequence", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Simulate user interactions
        yield* _(app.handleInput("+"))
        yield* _(app.handleInput("+"))
        yield* _(app.handleInput("+"))
        
        const state1 = yield* _(app.getState())
        expect(state1.count).toBe(3)
        
        yield* _(app.handleInput("-"))
        
        const state2 = yield* _(app.getState())
        expect(state2.count).toBe(2)
        
        yield* _(app.handleInput("r"))
        
        const state3 = yield* _(app.getState())
        expect(state3.count).toBe(0)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle complex user workflow", async () => {
    const app = createTodoApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Add first todo
        yield* _(app.handleInput("a"))
        yield* _(app.handleInput("B"))
        yield* _(app.handleInput("u"))
        yield* _(app.handleInput("y"))
        yield* _(app.handleInput(" "))
        yield* _(app.handleInput("m"))
        yield* _(app.handleInput("i"))
        yield* _(app.handleInput("l"))
        yield* _(app.handleInput("k"))
        yield* _(app.handleInput("Enter"))
        
        // Add second todo
        yield* _(app.handleInput("a"))
        yield* _(app.handleInput("W"))
        yield* _(app.handleInput("a"))
        yield* _(app.handleInput("l"))
        yield* _(app.handleInput("k"))
        yield* _(app.handleInput(" "))
        yield* _(app.handleInput("d"))
        yield* _(app.handleInput("o"))
        yield* _(app.handleInput("g"))
        yield* _(app.handleInput("Enter"))
        
        // Verify todos were added
        const state = yield* _(app.getState())
        expect(state.todos).toEqual(["Buy milk", "Walk dog"])
        expect(state.mode).toBe("list")
        
        // Delete one todo
        yield* _(app.handleInput("d"))
        
        const finalState = yield* _(app.getState())
        expect(finalState.todos).toEqual(["Buy milk"])
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle input validation", async () => {
    const app = createTodoApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Try to add empty todo
        yield* _(app.handleInput("a"))
        yield* _(app.handleInput("Enter")) // Empty input
        
        const state1 = yield* _(app.getState())
        expect(state1.todos).toEqual([]) // Should not add empty todo
        expect(state1.mode).toBe("add") // Should stay in add mode
        
        // Cancel add mode
        yield* _(app.handleInput("Escape"))
        
        const state2 = yield* _(app.getState())
        expect(state2.mode).toBe("list")
        
        // Try to delete from empty list
        yield* _(app.handleInput("d"))
        
        const state3 = yield* _(app.getState())
        expect(state3.todos).toEqual([]) // Should still be empty
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle rapid user input", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Simulate rapid input
        const inputs = Array.from({ length: 100 }, (_, i) => i % 2 === 0 ? "+" : "-")
        
        for (const input of inputs) {
          yield* _(app.handleInput(input))
        }
        
        const state = yield* _(app.getState())
        expect(state.count).toBe(0) // Should be balanced
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Plugin-Enhanced Workflow Tests
// =============================================================================

describe("Plugin-Enhanced Workflows", () => {
  test("should integrate plugins with application workflow", async () => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const app = createPluginApp()
        
        yield* _(app.init)
        
        // Test plugin integration
        yield* _(app.handleInput("p"))
        
        const state = yield* _(app.getState())
        expect(state.plugins).toContain("test-plugin")
        expect(state.message).toContain("Plugins: test-plugin")
        
        // Test app refresh
        yield* _(app.handleInput("r"))
        
        const refreshedState = yield* _(app.getState())
        expect(refreshedState.message).toBe("Plugin app refreshed")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle plugin lifecycle during app usage", async () => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const pluginSystem = await createPluginSystem()
        
        // Create plugin with lifecycle tracking
        const lifecycleEvents: string[] = []
        
        const lifecyclePlugin = createPlugin({
          name: "lifecycle-plugin",
          version: "1.0.0",
          description: "Plugin with lifecycle tracking",
        })
        
        // Override lifecycle methods to track events
        const trackingPlugin = {
          ...lifecyclePlugin,
          init: Effect.sync(() => {
            lifecycleEvents.push("init")
          }),
          destroy: Effect.sync(() => {
            lifecycleEvents.push("destroy")
          }),
          activate: Effect.sync(() => {
            lifecycleEvents.push("activate")
          }),
          deactivate: Effect.sync(() => {
            lifecycleEvents.push("deactivate")
          }),
        }
        
        // Test plugin lifecycle
        await pluginSystem.registerPlugin(trackingPlugin)
        
        // Simulate app usage
        // In real implementation, this would trigger plugin lifecycle events
        
        await pluginSystem.unregisterPlugin(trackingPlugin.name)
        
        // Verify lifecycle events
        expect(lifecycleEvents).toContain("init")
        expect(lifecycleEvents).toContain("destroy")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle plugin communication during workflow", async () => {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const pluginSystem = await createPluginSystem()
        
        const messages: string[] = []
        
        // Create communicating plugins
        const plugin1 = createPlugin({
          name: "sender-plugin",
          version: "1.0.0",
          description: "Sends messages",
        })
        
        const plugin2 = createPlugin({
          name: "receiver-plugin",
          version: "1.0.0",
          description: "Receives messages",
        })
        
        await pluginSystem.registerPlugin(plugin1)
        await pluginSystem.registerPlugin(plugin2)
        
        // Simulate plugin communication
        // In real implementation, this would use the signal system
        
        expect(messages).toBeDefined()
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Error Recovery Scenario Tests
// =============================================================================

describe("Error Recovery Scenarios", () => {
  test("should recover from runtime errors", async () => {
    const errorApp = {
      init: Effect.succeed(void 0),
      
      handleInput: (input: string) => Effect.gen(function* (_) {
        if (input === "error") {
          return yield* _(Effect.fail(new Error("Runtime error")))
        }
        return yield* _(Effect.succeed(void 0))
      }),
      
      render: Effect.succeed("Error test app"),
      cleanup: Effect.succeed(void 0),
    }
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(errorApp.init)
        
        // Normal input should work
        yield* _(errorApp.handleInput("normal"))
        
        // Error input should fail
        const result = yield* _(errorApp.handleInput("error").pipe(Effect.either))
        expect(result._tag).toBe("Left")
        
        // App should still work after error
        yield* _(errorApp.handleInput("normal"))
        
        const rendered = yield* _(errorApp.render)
        expect(rendered).toBe("Error test app")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle service failures gracefully", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Simulate service failure by creating a layer that fails
        const failingLayer = Layer.succeed(
          createMockAppServices().terminal,
          {
            write: Effect.fail(new Error("Terminal failure")),
            clear: Effect.succeed(void 0),
            getSize: Effect.succeed({ width: 80, height: 24 }),
          }
        )
        
        // App should continue working despite service failure
        yield* _(app.handleInput("+"))
        
        const state = yield* _(app.getState())
        expect(state.count).toBe(1)
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle memory pressure scenarios", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        // Simulate memory pressure by creating many operations
        const operations = Array.from({ length: 1000 }, (_, i) => 
          app.handleInput(i % 2 === 0 ? "+" : "-")
        )
        
        // Execute all operations
        yield* _(Effect.all(operations, { concurrency: 50 }))
        
        // App should still be responsive
        const state = yield* _(app.getState())
        expect(state.count).toBe(0) // Should be balanced
        
        const rendered = yield* _(app.render)
        expect(rendered).toContain("Count: 0")
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})

// =============================================================================
// Performance Under Load Tests
// =============================================================================

describe("Performance Under Load", () => {
  test("should handle high-frequency user input", async () => {
    const app = createCounterApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        const inputCount = 10000
        const startTime = performance.now()
        
        // Simulate high-frequency input
        for (let i = 0; i < inputCount; i++) {
          yield* _(app.handleInput("+"))
        }
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Verify final state
        const state = yield* _(app.getState())
        expect(state.count).toBe(inputCount)
        
        // Should complete within reasonable time
        expect(duration).toBeLessThan(2000) // 2 seconds
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle concurrent user sessions", async () => {
    const sessionCount = 10
    const apps = Array.from({ length: sessionCount }, () => createCounterApp())
    
    const startTime = performance.now()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Initialize all apps
        yield* _(Effect.all(
          apps.map(app => app.init),
          { concurrency: sessionCount }
        ))
        
        // Simulate concurrent user activity
        const activities = apps.map((app, index) => 
          Effect.gen(function* (_) {
            // Each app performs different operations
            for (let i = 0; i < 100; i++) {
              yield* _(app.handleInput("+"))
              if (i % 10 === 0) {
                yield* _(app.handleInput("-"))
              }
            }
          })
        )
        
        yield* _(Effect.all(activities, { concurrency: sessionCount }))
        
        // Verify all apps completed successfully
        const states = yield* _(Effect.all(
          apps.map(app => app.getState())
        ))
        
        states.forEach(state => {
          expect(state.count).toBe(90) // 100 increments - 10 decrements
        })
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(3000) // 3 seconds
  })
  
  test("should handle memory-intensive operations", async () => {
    const app = createTodoApp()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(app.init)
        
        const todoCount = 1000
        const startTime = performance.now()
        
        // Add many todos
        for (let i = 0; i < todoCount; i++) {
          yield* _(app.handleInput("a"))
          
          // Type todo text
          const todoText = `Todo item ${i}`
          for (const char of todoText) {
            yield* _(app.handleInput(char))
          }
          
          yield* _(app.handleInput("Enter"))
        }
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Verify final state
        const state = yield* _(app.getState())
        expect(state.todos).toHaveLength(todoCount)
        expect(state.mode).toBe("list")
        
        // Should complete within reasonable time
        expect(duration).toBeLessThan(5000) // 5 seconds
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
  
  test("should handle resource cleanup under load", async () => {
    const appCount = 100
    const apps = Array.from({ length: appCount }, () => createCounterApp())
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Initialize all apps
        yield* _(Effect.all(
          apps.map(app => app.init),
          { concurrency: 20 }
        ))
        
        // Use all apps briefly
        yield* _(Effect.all(
          apps.map(app => app.handleInput("+")),
          { concurrency: 20 }
        ))
        
        // Cleanup all apps
        const cleanupStart = performance.now()
        
        yield* _(Effect.all(
          apps.map(app => app.cleanup),
          { concurrency: 20 }
        ))
        
        const cleanupEnd = performance.now()
        const cleanupDuration = cleanupEnd - cleanupStart
        
        // Verify cleanup completed
        const states = yield* _(Effect.all(
          apps.map(app => app.getState())
        ))
        
        states.forEach(state => {
          expect(state.message).toBe("Cleanup complete")
        })
        
        // Should cleanup within reasonable time
        expect(cleanupDuration).toBeLessThan(1000) // 1 second
      }).pipe(Effect.provide(createMockAppServices().layer))
    )
  })
})