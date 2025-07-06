/**
 * Comprehensive Tests for Testing Utilities
 */

import { describe, it, expect, test } from "bun:test"
import { Effect, Layer, Ref, Queue, Stream, Option } from "effect"
import {
  createTestEnvironment,
  createMockTerminalService,
  createMockInputService,
  createMockRendererService,
  createMockStorageService,
  createTestLayer,
  testComponent,
  TUIAssert,
  createMockAppServices,
  withMockServices,
  type TestEnvironment
} from "@/testing/test-utils"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService
} from "@/services/index"
import type { Component, View, KeyEvent, MouseEvent, Cmd } from "@/services/index"

describe("Testing Utilities", () => {
  describe("createTestEnvironment", () => {
    it("creates default test environment", () => {
      const env = createTestEnvironment()
      
      expect(env.output).toEqual([])
      expect(env.cursor).toEqual({ x: 1, y: 1 })
      expect(env.size).toEqual({ width: 80, height: 24 })
      expect(env.capabilities).toEqual({
        colors: '256',
        unicode: true,
        mouse: true,
        alternateScreen: true,
        cursorShapes: true
      })
      expect(env.rawMode).toBe(false)
      expect(env.alternateScreen).toBe(false)
      expect(env.mouseEnabled).toBe(false)
    })
    
    it("creates test environment with overrides", () => {
      const env = createTestEnvironment({
        size: { width: 120, height: 40 },
        rawMode: true,
        cursor: { x: 10, y: 20 },
        output: ["test line"]
      })
      
      expect(env.size).toEqual({ width: 120, height: 40 })
      expect(env.rawMode).toBe(true)
      expect(env.cursor).toEqual({ x: 10, y: 20 })
      expect(env.output).toEqual(["test line"])
      // Other properties retain defaults
      expect(env.alternateScreen).toBe(false)
    })
  })
  
  describe("Mock Terminal Service", () => {
    it("provides terminal operations", async () => {
      const layer = createMockTerminalService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          
          // Test write operations
          yield* _(terminal.write("Hello"))
          yield* _(terminal.writeLine("World"))
          
          // Test cursor operations
          yield* _(terminal.moveCursor(10, 20))
          const pos1 = yield* _(terminal.getCursorPosition)
          
          yield* _(terminal.moveCursorRelative(5, -3))
          const pos2 = yield* _(terminal.getCursorPosition)
          
          // Test screen operations
          yield* _(terminal.setRawMode(true))
          yield* _(terminal.setAlternateScreen(true))
          
          // Test capabilities
          const caps = yield* _(terminal.getCapabilities)
          const trueColor = yield* _(terminal.supportsTrueColor)
          const color256 = yield* _(terminal.supports256Colors)
          const unicode = yield* _(terminal.supportsUnicode)
          
          // Test size
          const size = yield* _(terminal.getSize)
          
          return { pos1, pos2, caps, trueColor, color256, unicode, size }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.pos1).toEqual({ x: 10, y: 20 })
      expect(result.pos2).toEqual({ x: 15, y: 17 })
      expect(result.caps.colors).toBe('256')
      expect(result.trueColor).toBe(false)
      expect(result.color256).toBe(true)
      expect(result.unicode).toBe(true)
      expect(result.size).toEqual({ width: 80, height: 24 })
    })
    
    it("tracks output correctly", async () => {
      const env = createTestEnvironment()
      const envRef = Ref.unsafeMake(env)
      const layer = createMockTerminalService(env)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          
          yield* _(terminal.write("Hello"))
          yield* _(terminal.write(" "))
          yield* _(terminal.writeLine("World"))
          yield* _(terminal.clear)
          yield* _(terminal.write("New"))
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles all terminal operations", async () => {
      const layer = createMockTerminalService()
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          
          // Test all operations don't throw
          yield* _(terminal.hideCursor)
          yield* _(terminal.showCursor)
          yield* _(terminal.saveCursor)
          yield* _(terminal.restoreCursor)
          yield* _(terminal.clearToEndOfLine)
          yield* _(terminal.clearToStartOfLine)
          yield* _(terminal.clearLine)
          yield* _(terminal.clearToEndOfScreen)
          yield* _(terminal.clearToStartOfScreen)
          yield* _(terminal.scrollUp(5))
          yield* _(terminal.scrollDown(3))
          yield* _(terminal.setTitle("Test"))
          yield* _(terminal.bell)
          yield* _(terminal.setCursorShape('block'))
          yield* _(terminal.setCursorBlink(true))
        }).pipe(Effect.provide(layer))
      )
      
      // If we got here, all operations succeeded
      expect(true).toBe(true)
    })
  })
  
  describe("Mock Input Service", () => {
    it("provides input operations", async () => {
      const layer = createMockInputService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const input = yield* _(InputService)
          
          // Test input operations
          yield* _(input.enableMouse)
          yield* _(input.disableMouse)
          yield* _(input.enableMouseMotion)
          yield* _(input.disableMouseMotion)
          yield* _(input.enableBracketedPaste)
          yield* _(input.disableBracketedPaste)
          yield* _(input.enableFocusTracking)
          yield* _(input.disableFocusTracking)
          
          // Test reading
          const line = yield* _(input.readLine)
          const available = yield* _(input.inputAvailable)
          yield* _(input.flushInput)
          
          // Test echo
          yield* _(input.setEcho(false))
          
          // Test parsing
          const parsed = yield* _(input.parseAnsiSequence("\x1b[A"))
          
          return { line, available, parsed }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.line).toBe("test input")
      expect(result.available).toBe(false)
      expect(result.parsed).toBeNull()
    })
    
    it("provides stream operations", async () => {
      const layer = createMockInputService()
      
      const service = await Effect.runPromise(
        Effect.gen(function* (_) {
          return yield* _(InputService)
        }).pipe(Effect.provide(layer))
      )
      
      // Test stream properties exist
      expect(service.keyEvents).toBeDefined()
      expect(service.mouseEvents).toBeDefined()
      expect(service.resizeEvents).toBeDefined()
      expect(service.pasteEvents).toBeDefined()
      expect(service.focusEvents).toBeDefined()
      expect(service.rawInput).toBeDefined()
      
      // Test filter and map operations
      const filtered = service.filterKeys(() => true)
      expect(filtered).toBeDefined()
      
      const mapped = service.mapKeys((key) => key.key)
      expect(mapped).toBeDefined()
      
      const debounced = service.debounceKeys(100)
      expect(debounced).toBeDefined()
    })
  })
  
  describe("Mock Renderer Service", () => {
    it("provides render operations", async () => {
      const layer = createMockRendererService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Test viewport operations
          yield* _(renderer.setViewport({ x: 10, y: 20, width: 100, height: 50 }))
          const viewport = yield* _(renderer.getViewport)
          
          yield* _(renderer.pushViewport({ x: 0, y: 0, width: 80, height: 24 }))
          yield* _(renderer.popViewport)
          
          // Test rendering
          const view: View = {
            content: "Test",
            width: 10,
            height: 1
          }
          
          yield* _(renderer.beginFrame)
          yield* _(renderer.render(view))
          yield* _(renderer.renderAt(view, 5, 10))
          yield* _(renderer.renderBatch([
            { view, x: 0, y: 0 },
            { view, x: 10, y: 10 }
          ]))
          yield* _(renderer.endFrame)
          
          // Test dirty regions
          yield* _(renderer.markDirty({ x: 0, y: 0, width: 10, height: 10 }))
          const dirty = yield* _(renderer.getDirtyRegions)
          yield* _(renderer.optimizeDirtyRegions)
          yield* _(renderer.clearDirtyRegions)
          
          // Test stats
          const stats = yield* _(renderer.getStats)
          yield* _(renderer.resetStats)
          yield* _(renderer.setProfilingEnabled(true))
          
          // Test text operations
          const measured = yield* _(renderer.measureText("Hello World"))
          const wrapped = yield* _(renderer.wrapText("Hello World", 5, {}))
          const truncated = yield* _(renderer.truncateText("Hello World", 8))
          
          // Test layers
          yield* _(renderer.createLayer("test", 1))
          yield* _(renderer.renderToLayer("test", view, 0, 0))
          yield* _(renderer.setLayerVisible("test", false))
          yield* _(renderer.compositeLayers)
          yield* _(renderer.removeLayer("test"))
          
          // Test state
          yield* _(renderer.saveState)
          yield* _(renderer.restoreState)
          yield* _(renderer.setClipRegion({ x: 0, y: 0, width: 80, height: 24 }))
          
          yield* _(renderer.forceRedraw)
          
          return { viewport, dirty, stats, measured, wrapped, truncated }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.viewport).toEqual({ x: 10, y: 20, width: 100, height: 50 })
      expect(result.dirty).toEqual([])
      expect(result.stats.framesRendered).toBeGreaterThan(0)
      expect(result.measured).toEqual({ width: 11, height: 1, lineCount: 1 })
      expect(result.wrapped).toEqual(["Hello"])
      expect(result.truncated).toBe("Hello...")
    })
  })
  
  describe("Mock Storage Service", () => {
    it("provides state operations", async () => {
      const layer = createMockStorageService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          
          // Test state operations
          yield* _(storage.saveState("test", { value: 42 }))
          const hasState = yield* _(storage.hasState("test"))
          const loaded = yield* _(storage.loadState<{ value: number }>("test"))
          const keys = yield* _(storage.listStateKeys)
          yield* _(storage.clearState("test"))
          const hasAfterClear = yield* _(storage.hasState("test"))
          
          return { hasState, loaded, keys, hasAfterClear }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.hasState).toBe(true)
      expect(result.loaded).toEqual({ value: 42 })
      expect(result.keys).toContain("test")
      expect(result.hasAfterClear).toBe(false)
    })
    
    it("provides cache operations", async () => {
      const layer = createMockStorageService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          
          // Test cache operations
          yield* _(storage.setCache("key", "value", 60))
          const cached = yield* _(storage.getCache<string>("key", {}))
          yield* _(storage.clearCache("key"))
          const afterClear = yield* _(storage.getCache<string>("key", {}))
          
          yield* _(storage.clearExpiredCache)
          const stats = yield* _(storage.getCacheStats)
          
          return { cached, afterClear, stats }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.cached).toBe("value")
      expect(result.afterClear).toBeNull()
      expect(result.stats).toEqual({
        totalEntries: 0,
        expiredEntries: 0,
        totalSize: 0
      })
    })
    
    it("provides file operations", async () => {
      const layer = createMockStorageService()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          
          // Test file operations
          const text = yield* _(storage.readTextFile<string>("/test.txt"))
          yield* _(storage.writeTextFile("/test.txt", "content"))
          
          const json = yield* _(storage.readJsonFile<{ test: boolean }>("/test.json", {}))
          yield* _(storage.writeJsonFile("/test.json", { test: true }))
          
          const exists = yield* _(storage.fileExists("/test.txt"))
          yield* _(storage.createDirectory("/test"))
          
          const stats = yield* _(storage.getFileStats("/test.txt"))
          
          // Test config operations
          const config = yield* _(storage.loadConfig("app", {}, { setting: "default" }))
          yield* _(storage.saveConfig("app", { setting: "value" }, {}))
          const path = yield* _(storage.getConfigPath("app"))
          
          // Test backup operations
          const backup = yield* _(storage.createBackup("/test.txt"))
          yield* _(storage.restoreBackup("/test.txt", backup))
          const backups = yield* _(storage.listBackups("/test.txt"))
          yield* _(storage.cleanupBackups("/test.txt", 3))
          
          // Test transactions
          const txId = yield* _(storage.beginTransaction)
          yield* _(storage.addToTransaction(txId, 'write', '/test.txt', 'data'))
          yield* _(storage.commitTransaction(txId))
          
          const txId2 = yield* _(storage.beginTransaction)
          yield* _(storage.addToTransaction(txId2, 'delete', '/test.txt'))
          yield* _(storage.rollbackTransaction(txId2))
          
          return { text, json, exists, stats, config, path, backup, backups }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.text).toBe("test file content")
      expect(result.json).toEqual({})
      expect(result.exists).toBe(true)
      expect(result.stats.isFile).toBe(true)
      expect(result.config).toEqual({ setting: "default" })
      expect(result.path).toBe("/tmp/test-config.json")
      expect(result.backup).toBe("/tmp/backup.txt")
      expect(result.backups).toEqual([])
    })
  })
  
  describe("createTestLayer", () => {
    it("provides all services", async () => {
      const layer = createTestLayer()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          const input = yield* _(InputService)
          const renderer = yield* _(RendererService)
          const storage = yield* _(StorageService)
          
          return { terminal, input, renderer, storage }
        }).pipe(Effect.provide(layer))
      )
      
      expect(result.terminal).toBeDefined()
      expect(result.input).toBeDefined()
      expect(result.renderer).toBeDefined()
      expect(result.storage).toBeDefined()
    })
    
    it("accepts environment overrides", async () => {
      const layer = createTestLayer({ size: { width: 120, height: 40 } })
      
      const size = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.getSize)
        }).pipe(Effect.provide(layer))
      )
      
      expect(size).toEqual({ width: 120, height: 40 })
    })
  })
  
  describe("testComponent", () => {
    // Create a simple test component
    const TestComponent: Component<number, "increment" | "decrement"> = {
      init: Effect.succeed([0, []]),
      
      update: (msg, model) => Effect.succeed(
        msg === "increment" ? [model + 1, []] : [model - 1, []]
      ),
      
      view: (model) => ({
        content: `Count: ${model}`,
        width: 10,
        height: 1,
        render: () => Effect.succeed(`Count: ${model}`)
      }),
      
      subscriptions: (_model) => Effect.succeed(Stream.empty)
    }
    
    it("tests component initialization", async () => {
      const tester = testComponent(TestComponent)
      const [model, cmds] = await tester.testInit()
      
      expect(model).toBe(0)
      expect(cmds).toEqual([])
    })
    
    it("tests component update", async () => {
      const tester = testComponent(TestComponent)
      
      const [model1, cmds1] = await tester.testUpdate("increment", 0)
      expect(model1).toBe(1)
      expect(cmds1).toEqual([])
      
      const [model2, cmds2] = await tester.testUpdate("decrement", model1)
      expect(model2).toBe(0)
      expect(cmds2).toEqual([])
    })
    
    it("tests component view", async () => {
      const tester = testComponent(TestComponent)
      
      const view1 = await tester.testView(0)
      expect(view1).toBe("Count: 0")
      
      const view2 = await tester.testView(5)
      expect(view2).toBe("Count: 5")
    })
    
    it("tests component subscriptions", async () => {
      const tester = testComponent(TestComponent)
      const subs = await tester.testSubscriptions(0)
      
      expect(subs).toBeDefined()
    })
    
    it("respects timeout option", async () => {
      const SlowComponent: Component<string, never> = {
        init: Effect.delay(Effect.succeed(["", []]), 100),
        update: () => Effect.succeed(["", []]),
        view: () => ({
          content: "",
          render: () => Effect.succeed("")
        })
      }
      
      const tester = testComponent(SlowComponent, { timeout: 200 })
      const [model] = await tester.testInit()
      expect(model).toBe("")
    })
  })
  
  describe("TUIAssert", () => {
    it("provides output assertions", () => {
      TUIAssert.outputContains("Hello World", "World")
      TUIAssert.outputMatches("Hello World", /Hello/)
      
      // These should not throw
      expect(() => TUIAssert.outputContains("Hello", "Hello")).not.toThrow()
      expect(() => TUIAssert.outputMatches("123", /\d+/)).not.toThrow()
    })
    
    it("provides state assertions", () => {
      const state = { count: 5, name: "test", active: true }
      
      TUIAssert.stateHas(state, { count: 5 })
      TUIAssert.stateHas(state, { name: "test", active: true })
      
      // This should not throw
      expect(() => TUIAssert.stateHas(state, { count: 5 })).not.toThrow()
    })
    
    it("provides view size assertions", () => {
      const view: View = { content: "Test", width: 80, height: 24 }
      
      TUIAssert.viewSize(view, 80, 24)
      TUIAssert.viewSize(view, 80)
      TUIAssert.viewSize(view, undefined, 24)
      
      // These should not throw
      expect(() => TUIAssert.viewSize(view, 80)).not.toThrow()
    })
  })
  
  describe("createMockAppServices", () => {
    it("creates all services", () => {
      const services = createMockAppServices()
      
      expect(services.terminal).toBeDefined()
      expect(services.input).toBeDefined()
      expect(services.renderer).toBeDefined()
      expect(services.storage).toBeDefined()
      expect(services.layer).toBeDefined()
    })
    
    it("provides working combined layer", async () => {
      const services = createMockAppServices()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          const input = yield* _(InputService)
          const renderer = yield* _(RendererService)
          const storage = yield* _(StorageService)
          
          // Test that all services work
          yield* _(terminal.write("test"))
          const line = yield* _(input.readLine)
          yield* _(renderer.render({ content: "test" }))
          yield* _(storage.saveState("key", "value"))
          
          return { line }
        }).pipe(Effect.provide(services.layer))
      )
      
      expect(result.line).toBe("test input")
    })
  })
  
  describe("withMockServices", () => {
    it("provides all services to an effect", async () => {
      const program = Effect.gen(function* (_) {
        const terminal = yield* _(TerminalService)
        const input = yield* _(InputService)
        const renderer = yield* _(RendererService)
        const storage = yield* _(StorageService)
        
        yield* _(terminal.write("Hello"))
        const line = yield* _(input.readLine)
        yield* _(renderer.render({ content: "World" }))
        yield* _(storage.saveState("test", true))
        
        return { line }
      })
      
      const result = await Effect.runPromise(withMockServices(program))
      
      expect(result.line).toBe("test input")
    })
  })
})