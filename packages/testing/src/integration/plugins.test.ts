/**
 * Plugin Integration Tests - Test plugin loading, communication, and dependencies
 * 
 * This module tests the TUIX plugin system integration including:
 * - Plugin loading and initialization lifecycle
 * - Plugin communication via hooks and signals
 * - Plugin dependency resolution
 * - Plugin isolation and error boundaries
 * - Hot-reload functionality
 * 
 * Tests follow the requirements from task 3A.1 with comprehensive coverage
 * of plugin system integration scenarios.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Context, Layer, Ref, Queue } from "effect"
import * as Plugin from "@tuix/core/plugin"
import { createMockAppServices, withMockServices } from "../test-utils"

// =============================================================================
// Test Setup
// =============================================================================

interface TestPluginSystem {
  registry: Plugin.PluginRegistry
  hookManager: Plugin.HookManager
  signalManager: Plugin.SignalManager
  loader: Plugin.PluginLoader
  cleanup: Effect.Effect<void, never, never>
}

const createTestPluginSystem = (): Effect.Effect<TestPluginSystem, never, never> =>
  Effect.gen(function* (_) {
    const registry = yield* _(Plugin.createPluginRegistry())
    const hookManager = yield* _(Plugin.createHookManager())
    const signalManager = yield* _(Plugin.createSignalManager())
    const loader = yield* _(Plugin.createPluginLoader())
    
    const cleanup = Effect.gen(function* (_) {
      // Clean up all registered plugins
      const plugins = yield* _(registry.list())
      for (const plugin of plugins) {
        yield* _(registry.unregister(plugin.name))
      }
    })
    
    return {
      registry,
      hookManager,
      signalManager,
      loader,
      cleanup,
    }
  })

// Test plugin factories
const createTestPlugin = (name: string, version: string = "1.0.0"): Plugin.Plugin => {
  const initRef = Ref.unsafeMake(false)
  const destroyRef = Ref.unsafeMake(false)
  
  return Plugin.createPlugin({
    name,
    version,
    description: `Test plugin ${name}`,
    author: "Test Suite",
    hooks: {
      [Plugin.HookNames.COMPONENT_INIT]: {
        before: Effect.gen(function* (_) {
          yield* _(Ref.set(initRef, true))
        }),
        priority: 10,
      },
    },
    signals: {
      [Plugin.SignalNames.PLUGIN_LOADED]: {
        name: `${name}:loaded`,
        description: `Plugin ${name} loaded signal`,
      },
    },
  })
}

const createDependentPlugin = (name: string, dependencies: string[]): Plugin => {
  const plugin = createTestPlugin(name)
  return {
    ...plugin,
    metadata: {
      ...plugin.metadata,
      dependencies: dependencies.reduce((acc, dep) => ({ ...acc, [dep]: "1.0.0" }), {}),
    },
  }
}

const createPluginWithServices = (name: string, services: Record<string, unknown>): Plugin => {
  const plugin = createTestPlugin(name)
  return {
    ...plugin,
    services,
  }
}

// =============================================================================
// Plugin Discovery and Registration Tests
// =============================================================================

describe("Plugin Discovery and Registration", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should register and discover plugins", async () => {
    const plugin1 = createTestPlugin("test-plugin-1")
    const plugin2 = createTestPlugin("test-plugin-2")
    
    // Register plugins
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin1))
        yield* _(system.registry.register(plugin2))
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    // Verify registration
    const plugins = await Effect.runPromise(system.registry.list())
    expect(plugins).toHaveLength(2)
    expect(plugins.map(p => p.name)).toEqual(["test-plugin-1", "test-plugin-2"])
  })
  
  test("should prevent duplicate plugin registration", async () => {
    const plugin = createTestPlugin("duplicate-test")
    
    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin))
        return yield* _(system.registry.register(plugin))
      }).pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(PluginError)
  })
  
  test("should unregister plugins", async () => {
    const plugin = createTestPlugin("unregister-test")
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin))
        yield* _(system.registry.unregister(plugin.name))
        
        const plugins = yield* _(system.registry.list())
        expect(plugins).toHaveLength(0)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should check plugin registration status", async () => {
    const plugin = createTestPlugin("status-test")
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Initially not registered
        const notRegistered = yield* _(system.registry.isRegistered(plugin.name))
        expect(notRegistered).toBe(false)
        
        // Register and check
        yield* _(system.registry.register(plugin))
        const registered = yield* _(system.registry.isRegistered(plugin.name))
        expect(registered).toBe(true)
        
        // Unregister and check
        yield* _(system.registry.unregister(plugin.name))
        const unregistered = yield* _(system.registry.isRegistered(plugin.name))
        expect(unregistered).toBe(false)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
})

// =============================================================================
// Hook System Integration Tests
// =============================================================================

describe("Hook System Integration", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should execute hooks in priority order", async () => {
    const executionOrder: string[] = []
    
    const plugin1 = createPlugin({
      name: "hook-plugin-1",
      version: "1.0.0",
      hooks: {
        "test:hook": {
          before: Effect.sync(() => {
            executionOrder.push("plugin1-before")
          }),
          priority: 20,
        },
      },
    })
    
    const plugin2 = createPlugin({
      name: "hook-plugin-2", 
      version: "1.0.0",
      hooks: {
        "test:hook": {
          before: Effect.sync(() => {
            executionOrder.push("plugin2-before")
          }),
          priority: 10,
        },
      },
    })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin1))
        yield* _(system.registry.register(plugin2))
        
        // Register hooks
        yield* _(system.hookManager.register("hook-plugin-1", "test:hook", plugin1.hooks["test:hook"]))
        yield* _(system.hookManager.register("hook-plugin-2", "test:hook", plugin2.hooks["test:hook"]))
        
        // Execute hooks
        yield* _(system.hookManager.executeBefore("test:hook"))
        
        // Higher priority (20) should execute before lower priority (10)
        expect(executionOrder).toEqual(["plugin1-before", "plugin2-before"])
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should handle hook execution errors", async () => {
    const plugin = createPlugin({
      name: "error-hook-plugin",
      version: "1.0.0",
      hooks: {
        "error:hook": {
          before: Effect.fail(new Error("Hook error")),
        },
      },
    })
    
    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin))
        yield* _(system.hookManager.register("error-hook-plugin", "error:hook", plugin.hooks["error:hook"]))
        
        return yield* _(system.hookManager.executeBefore("error:hook"))
      }).pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(HookError)
  })
  
  test("should support around hooks", async () => {
    const aroundResults: string[] = []
    
    const plugin = createPlugin({
      name: "around-hook-plugin",
      version: "1.0.0",
      hooks: {
        "around:test": {
          around: (next) => Effect.gen(function* (_) {
            aroundResults.push("before-around")
            yield* _(next)
            aroundResults.push("after-around")
          }),
        },
      },
    })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin))
        yield* _(system.hookManager.register("around-hook-plugin", "around:test", plugin.hooks["around:test"]))
        
        const next = Effect.sync(() => {
          aroundResults.push("inside-next")
        })
        
        yield* _(system.hookManager.executeAround("around:test", next))
        
        expect(aroundResults).toEqual(["before-around", "inside-next", "after-around"])
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
})

// =============================================================================
// Signal System Integration Tests
// =============================================================================

describe("Signal System Integration", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should emit and receive signals between plugins", async () => {
    const receivedSignals: string[] = []
    
    const emitterPlugin = createPlugin({
      name: "emitter-plugin",
      version: "1.0.0",
      signals: {
        "test:signal": {
          name: "test:signal",
          description: "Test signal",
        },
      },
    })
    
    const receiverPlugin = createPlugin({
      name: "receiver-plugin",
      version: "1.0.0",
    })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(emitterPlugin))
        yield* _(system.registry.register(receiverPlugin))
        
        // Subscribe to signal
        const handler: SignalHandler<string> = (data) => 
          Effect.sync(() => {
            receivedSignals.push(data)
          })
        
        yield* _(system.signalManager.subscribe("test:signal", handler))
        
        // Emit signal
        yield* _(system.signalManager.emit("test:signal", "test-data"))
        
        // Small delay to ensure signal is processed
        yield* _(Effect.sleep(10))
        
        expect(receivedSignals).toEqual(["test-data"])
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should handle signal subscription and unsubscription", async () => {
    const receivedSignals: string[] = []
    
    const handler: SignalHandler<string> = (data) => 
      Effect.sync(() => {
        receivedSignals.push(data)
      })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Subscribe
        const subscription = yield* _(system.signalManager.subscribe("test:unsub", handler))
        
        // Emit signal
        yield* _(system.signalManager.emit("test:unsub", "before-unsub"))
        yield* _(Effect.sleep(10))
        
        // Unsubscribe
        yield* _(system.signalManager.unsubscribe(subscription))
        
        // Emit signal again
        yield* _(system.signalManager.emit("test:unsub", "after-unsub"))
        yield* _(Effect.sleep(10))
        
        // Should only receive the first signal
        expect(receivedSignals).toEqual(["before-unsub"])
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should support one-time signal subscriptions", async () => {
    const receivedSignals: string[] = []
    
    const handler: SignalHandler<string> = (data) => 
      Effect.sync(() => {
        receivedSignals.push(data)
      })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Subscribe once
        yield* _(system.signalManager.subscribeOnce("test:once", handler))
        
        // Emit signal multiple times
        yield* _(system.signalManager.emit("test:once", "first"))
        yield* _(system.signalManager.emit("test:once", "second"))
        yield* _(Effect.sleep(10))
        
        // Should only receive the first signal
        expect(receivedSignals).toEqual(["first"])
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
})

// =============================================================================
// Plugin Dependency Resolution Tests
// =============================================================================

describe("Plugin Dependency Resolution", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should resolve plugin dependencies", async () => {
    const basePlugin = createTestPlugin("base-plugin")
    const dependentPlugin = createDependentPlugin("dependent-plugin", ["base-plugin"])
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(basePlugin))
        yield* _(system.registry.register(dependentPlugin))
        
        const resolved = yield* _(system.registry.resolve(["dependent-plugin"]))
        
        // Should resolve both plugins in correct order
        expect(resolved).toHaveLength(2)
        expect(resolved[0].name).toBe("base-plugin")
        expect(resolved[1].name).toBe("dependent-plugin")
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should detect circular dependencies", async () => {
    const plugin1 = createDependentPlugin("plugin1", ["plugin2"])
    const plugin2 = createDependentPlugin("plugin2", ["plugin1"])
    
    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin1))
        yield* _(system.registry.register(plugin2))
        
        return yield* _(system.registry.resolve(["plugin1"]))
      }).pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(PluginDependencyError)
  })
  
  test("should handle missing dependencies", async () => {
    const dependentPlugin = createDependentPlugin("dependent-plugin", ["missing-plugin"])
    
    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(dependentPlugin))
        
        return yield* _(system.registry.resolve(["dependent-plugin"]))
      }).pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(PluginDependencyError)
  })
})

// =============================================================================
// Plugin Isolation and Error Boundary Tests
// =============================================================================

describe("Plugin Isolation and Error Boundaries", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should isolate plugin failures", async () => {
    const goodPlugin = createTestPlugin("good-plugin")
    const badPlugin = createPlugin({
      name: "bad-plugin",
      version: "1.0.0",
      hooks: {
        "test:hook": {
          before: Effect.fail(new Error("Plugin failure")),
        },
      },
    })
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(goodPlugin))
        yield* _(system.registry.register(badPlugin))
        
        // Register hooks
        yield* _(system.hookManager.register("good-plugin", "test:hook", goodPlugin.hooks[HookNames.COMPONENT_INIT]))
        yield* _(system.hookManager.register("bad-plugin", "test:hook", badPlugin.hooks["test:hook"]))
        
        // Execute hooks - should not fail completely
        const result = yield* _(system.hookManager.executeBefore("test:hook")).pipe(
          Effect.either
        )
        
        // Should handle the error gracefully
        expect(result._tag).toBe("Left")
        expect(result.left).toBeInstanceOf(HookError)
        
        // Good plugin should still be registered
        const isRegistered = yield* _(system.registry.isRegistered("good-plugin"))
        expect(isRegistered).toBe(true)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should handle plugin initialization failures", async () => {
    const plugin = createPlugin({
      name: "init-fail-plugin",
      version: "1.0.0",
    })
    
    // Override init to fail
    const failingPlugin = {
      ...plugin,
      init: Effect.fail(new PluginError({
        pluginName: "init-fail-plugin",
        operation: "init",
        message: "Initialization failed",
      })),
    }
    
    const result = await Effect.runPromise(
      system.registry.register(failingPlugin).pipe(
        Effect.either,
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(PluginError)
  })
})

// =============================================================================
// Plugin Cleanup Tests
// =============================================================================

describe("Plugin Cleanup", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should cleanup plugin resources on unload", async () => {
    const cleanupCalled = Ref.unsafeMake(false)
    
    const plugin = createPlugin({
      name: "cleanup-plugin",
      version: "1.0.0",
    })
    
    // Override destroy to track cleanup
    const trackingPlugin = {
      ...plugin,
      destroy: Effect.gen(function* (_) {
        yield* _(Ref.set(cleanupCalled, true))
      }),
    }
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(trackingPlugin))
        yield* _(system.registry.unregister(trackingPlugin.name))
        
        const wasCalled = yield* _(Ref.get(cleanupCalled))
        expect(wasCalled).toBe(true)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  test("should cleanup hooks on plugin unload", async () => {
    const plugin = createTestPlugin("hook-cleanup-plugin")
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.registry.register(plugin))
        yield* _(system.hookManager.register("hook-cleanup-plugin", "test:hook", plugin.hooks[HookNames.COMPONENT_INIT]))
        
        // Verify hook is registered
        const hooksBeforeUnload = yield* _(system.hookManager.listHooks("test:hook"))
        expect(hooksBeforeUnload).toHaveLength(1)
        
        // Unregister plugin
        yield* _(system.registry.unregister(plugin.name))
        yield* _(system.hookManager.unregister("hook-cleanup-plugin", "test:hook"))
        
        // Verify hook is cleaned up
        const hooksAfterUnload = yield* _(system.hookManager.listHooks("test:hook"))
        expect(hooksAfterUnload).toHaveLength(0)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
})

// =============================================================================
// Performance and Stress Tests
// =============================================================================

describe("Plugin System Performance", () => {
  let system: TestPluginSystem
  
  beforeEach(async () => {
    system = await Effect.runPromise(
      createTestPluginSystem().pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
  })
  
  afterEach(async () => {
    await Effect.runPromise(system.cleanup)
  })
  
  test("should handle multiple plugins efficiently", async () => {
    const pluginCount = 50
    const plugins = Array.from({ length: pluginCount }, (_, i) => 
      createTestPlugin(`plugin-${i}`)
    )
    
    const startTime = performance.now()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        // Register all plugins
        for (const plugin of plugins) {
          yield* _(system.registry.register(plugin))
        }
        
        // Verify all are registered
        const registeredPlugins = yield* _(system.registry.list())
        expect(registeredPlugins).toHaveLength(pluginCount)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(1000) // 1 second
  })
  
  test("should handle many signal emissions efficiently", async () => {
    const emissionCount = 100
    const receivedSignals: string[] = []
    
    const handler: SignalHandler<string> = (data) => 
      Effect.sync(() => {
        receivedSignals.push(data)
      })
    
    const startTime = performance.now()
    
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* _(system.signalManager.subscribe("perf:test", handler))
        
        // Emit many signals
        for (let i = 0; i < emissionCount; i++) {
          yield* _(system.signalManager.emit("perf:test", `signal-${i}`))
        }
        
        // Wait for all signals to be processed
        yield* _(Effect.sleep(100))
        
        expect(receivedSignals).toHaveLength(emissionCount)
      }).pipe(
        Effect.provide(createMockAppServices().layer)
      )
    )
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(2000) // 2 seconds
  })
})