import { test, expect, describe, beforeEach } from "bun:test"
import { Effect, Context, Layer } from "effect"
import { PluginManager, createPlugin, createPluginManager } from "../cli/plugin/index"
import type { Plugin, PluginLifecycleState } from "../cli/plugin/types"

// Create the Plugin Manager service
const PluginManagerService = Context.GenericTag<PluginManager>("PluginManager")

describe("PluginManager", () => {
  const createTestLayer = () => 
    Layer.succeed(PluginManagerService, createPluginManager())

  describe("plugin registration", () => {
    test("should register a plugin", async () => {
      const plugin = createPlugin({
        id: "test-plugin",
        name: "Test Plugin",
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin)
          return yield* manager.getPlugin("test-plugin")
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(result?.id).toBe("test-plugin")
      expect(result?.name).toBe("Test Plugin")
      expect(result?.version).toBe("1.0.0")
    })

    test("should not register duplicate plugin IDs", async () => {
      const plugin1 = createPlugin({
        id: "duplicate-plugin",
        name: "Plugin 1",
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const plugin2 = createPlugin({
        id: "duplicate-plugin",
        name: "Plugin 2", 
        version: "2.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin1)
          
          // This should fail
          return yield* manager.register(plugin2)
        }).pipe(
          Effect.provide(createTestLayer()),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
    })
  })

  describe("plugin lifecycle", () => {
    test("should initialize plugin", async () => {
      let initialized = false
      
      const plugin = createPlugin({
        id: "lifecycle-plugin",
        name: "Lifecycle Plugin",
        version: "1.0.0",
        initialize: () => Effect.sync(() => {
          initialized = true
        }),
        teardown: () => Effect.succeed(undefined)
      })

      await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin)
          yield* manager.initialize("lifecycle-plugin")
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(initialized).toBe(true)
    })

    test("should handle plugin dependencies", async () => {
      const initOrder: string[] = []
      
      const pluginA = createPlugin({
        id: "plugin-a",
        name: "Plugin A",
        version: "1.0.0",
        initialize: () => Effect.sync(() => {
          initOrder.push("a")
        }),
        teardown: () => Effect.succeed(undefined)
      })

      const pluginB = createPlugin({
        id: "plugin-b", 
        name: "Plugin B",
        version: "1.0.0",
        dependencies: ["plugin-a"],
        initialize: () => Effect.sync(() => {
          initOrder.push("b")
        }),
        teardown: () => Effect.succeed(undefined)
      })

      await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(pluginA)
          yield* manager.register(pluginB)
          yield* manager.initializeAll()
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(initOrder).toEqual(["a", "b"])
    })

    test("should teardown plugins in reverse order", async () => {
      const teardownOrder: string[] = []
      
      const pluginA = createPlugin({
        id: "teardown-a",
        name: "Plugin A", 
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.sync(() => {
          teardownOrder.push("a")
        })
      })

      const pluginB = createPlugin({
        id: "teardown-b",
        name: "Plugin B",
        version: "1.0.0", 
        dependencies: ["teardown-a"],
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.sync(() => {
          teardownOrder.push("b")
        })
      })

      await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(pluginA)
          yield* manager.register(pluginB)
          yield* manager.initializeAll()
          yield* manager.teardownAll()
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(teardownOrder).toEqual(["b", "a"])
    })
  })

  describe("plugin discovery", () => {
    test("should list all registered plugins", async () => {
      const plugin1 = createPlugin({
        id: "list-plugin-1",
        name: "Plugin 1",
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const plugin2 = createPlugin({
        id: "list-plugin-2", 
        name: "Plugin 2",
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin1)
          yield* manager.register(plugin2)
          return yield* manager.listPlugins()
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(result.length).toBe(2)
      expect(result.map(p => p.id).sort()).toEqual(["list-plugin-1", "list-plugin-2"])
    })

    test("should get plugin state", async () => {
      const plugin = createPlugin({
        id: "state-plugin",
        name: "State Plugin",
        version: "1.0.0",
        initialize: () => Effect.succeed(undefined),
        teardown: () => Effect.succeed(undefined)
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin)
          const beforeInit = yield* manager.getPluginState("state-plugin")
          yield* manager.initialize("state-plugin")
          const afterInit = yield* manager.getPluginState("state-plugin")
          return { beforeInit, afterInit }
        }).pipe(
          Effect.provide(createTestLayer())
        )
      )

      expect(result.beforeInit).toBe("registered")
      expect(result.afterInit).toBe("initialized")
    })
  })

  describe("error handling", () => {
    test("should handle initialization errors", async () => {
      const plugin = createPlugin({
        id: "error-plugin",
        name: "Error Plugin",
        version: "1.0.0",
        initialize: () => Effect.fail(new Error("Init failed")),
        teardown: () => Effect.succeed(undefined)
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(plugin)
          yield* manager.initialize("error-plugin")
        }).pipe(
          Effect.provide(createTestLayer()),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
    })

    test("should continue initializing other plugins after failure", async () => {
      let successfullyInitialized = false
      
      const failingPlugin = createPlugin({
        id: "failing-plugin",
        name: "Failing Plugin",
        version: "1.0.0",
        initialize: () => Effect.fail(new Error("Init failed")),
        teardown: () => Effect.succeed(undefined)
      })

      const successPlugin = createPlugin({
        id: "success-plugin",
        name: "Success Plugin", 
        version: "1.0.0",
        initialize: () => Effect.sync(() => {
          successfullyInitialized = true
        }),
        teardown: () => Effect.succeed(undefined)
      })

      await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* PluginManagerService
          yield* manager.register(failingPlugin)
          yield* manager.register(successPlugin)
          yield* manager.initializeAll()
        }).pipe(
          Effect.provide(createTestLayer()),
          Effect.catchAll(() => Effect.succeed(undefined))
        )
      )

      expect(successfullyInitialized).toBe(true)
    })
  })
})