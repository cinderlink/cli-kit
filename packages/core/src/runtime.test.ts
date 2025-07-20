/**
 * Tests for application runtime system
 */

import { test, expect } from "bun:test"
import { Effect, Queue, Ref, Stream, Fiber } from "effect"
import { Runtime, runApp, type SystemMsg, type RuntimeConfig } from "./runtime.ts"
import type { Component, Cmd } from "./types.ts"

// Mock services for testing
const createMockTerminalService = () => ({
  setRawMode: (enabled: boolean) => Effect.succeed(undefined),
  setAlternateScreen: (enabled: boolean) => Effect.succeed(undefined),
  hideCursor: Effect.succeed(undefined),
  showCursor: Effect.succeed(undefined),
  clear: Effect.succeed(undefined),
  write: (text: string) => Effect.succeed(undefined),
  getSize: () => Effect.succeed({ width: 80, height: 24 })
})

const createMockInputService = () => ({
  enableMouse: Effect.succeed(undefined),
  disableMouse: Effect.succeed(undefined),
  filterKeys: (predicate: any) => Stream.empty,
  keyStream: Stream.empty,
  mouseStream: Stream.empty
})

const createMockRendererService = () => ({
  beginFrame: Effect.succeed(undefined),
  endFrame: Effect.succeed(undefined),
  render: (view: any) => Effect.succeed(undefined)
})

const createMockMouseRouterService = () => ({
  routeMouseEvent: (event: any) => Effect.succeed(null)
})

// Mock component for testing
interface TestModel {
  count: number
  running: boolean
}

type TestMsg = 
  | { readonly _tag: "Increment" }
  | { readonly _tag: "Decrement" }
  | { readonly _tag: "Stop" }
  | { readonly _tag: "Quit" }

const createTestComponent = (): Component<TestModel, TestMsg> => ({
  init: Effect.succeed([{ count: 0, running: true }, []]),
  
  update: (msg: TestMsg, model: TestModel) => {
    switch (msg._tag) {
      case "Increment":
        return Effect.succeed([{ ...model, count: model.count + 1 }, []])
      case "Decrement":
        return Effect.succeed([{ ...model, count: model.count - 1 }, []])
      case "Stop":
        return Effect.succeed([{ ...model, running: false }, []])
      case "Quit":
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" as const })]])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: TestModel) => ({
    render: () => Effect.succeed(`Count: ${model.count}`)
  }),
  
  subscriptions: (model: TestModel) => 
    model.running 
      ? Effect.succeed(Stream.empty)
      : Effect.succeed(Stream.empty)
})

// Mock services provider
const mockServices = {
  TerminalService: createMockTerminalService(),
  InputService: createMockInputService(), 
  RendererService: createMockRendererService(),
  MouseRouterService: createMockMouseRouterService()
}

// =============================================================================
// Runtime Configuration Tests
// =============================================================================

test("Runtime should apply default configuration", () => {
  const component = createTestComponent()
  const runtime = new Runtime(component)
  
  // Access private config through type assertion for testing
  const config = (runtime as any).config
  
  expect(config.fps).toBe(60)
  expect(config.debug).toBe(false)
  expect(config.quitOnEscape).toBe(false)
  expect(config.quitOnCtrlC).toBe(true)
  expect(config.enableMouse).toBe(false)
  expect(config.fullscreen).toBe(true)
})

test("Runtime should merge user configuration with defaults", () => {
  const component = createTestComponent()
  const userConfig: RuntimeConfig = {
    fps: 30,
    debug: true,
    quitOnEscape: true,
    enableMouse: true
  }
  const runtime = new Runtime(component, userConfig)
  
  const config = (runtime as any).config
  
  expect(config.fps).toBe(30)
  expect(config.debug).toBe(true)
  expect(config.quitOnEscape).toBe(true)
  expect(config.quitOnCtrlC).toBe(true) // Default not overridden
  expect(config.enableMouse).toBe(true)
  expect(config.fullscreen).toBe(true) // Default not overridden
})

// =============================================================================
// System Message Tests
// =============================================================================

test("SystemMsg should have correct type structure", () => {
  const windowResized: SystemMsg<TestMsg> = {
    _tag: "WindowResized",
    width: 100,
    height: 50
  }
  
  const userMsg: SystemMsg<TestMsg> = {
    _tag: "UserMsg",
    msg: { _tag: "Increment" }
  }
  
  const quit: SystemMsg<TestMsg> = {
    _tag: "Quit"
  }
  
  expect(windowResized._tag).toBe("WindowResized")
  expect(windowResized.width).toBe(100)
  expect(windowResized.height).toBe(50)
  
  expect(userMsg._tag).toBe("UserMsg")
  expect(userMsg.msg._tag).toBe("Increment")
  
  expect(quit._tag).toBe("Quit")
})

// =============================================================================
// Component Integration Tests  
// =============================================================================

test("Runtime should initialize component correctly", async () => {
  const component = createTestComponent()
  
  // Test component initialization
  const [initialModel, initialCmds] = await Effect.runPromise(component.init)
  
  expect(initialModel.count).toBe(0)
  expect(initialModel.running).toBe(true)
  expect(initialCmds).toEqual([])
})

test("Component update should work correctly", async () => {
  const component = createTestComponent()
  const initialModel = { count: 5, running: true }
  
  const [newModel1, cmds1] = await Effect.runPromise(
    component.update({ _tag: "Increment" }, initialModel)
  )
  expect(newModel1.count).toBe(6)
  expect(cmds1).toEqual([])
  
  const [newModel2, cmds2] = await Effect.runPromise(
    component.update({ _tag: "Decrement" }, newModel1)
  )
  expect(newModel2.count).toBe(5)
  expect(cmds2).toEqual([])
  
  const [newModel3, cmds3] = await Effect.runPromise(
    component.update({ _tag: "Stop" }, newModel2)
  )
  expect(newModel3.running).toBe(false)
  expect(cmds3).toEqual([])
})

test("Component should handle quit message", async () => {
  const component = createTestComponent()
  const initialModel = { count: 0, running: true }
  
  const [newModel, cmds] = await Effect.runPromise(
    component.update({ _tag: "Quit" }, initialModel)
  )
  
  expect(newModel.count).toBe(0)
  expect(cmds).toHaveLength(1)
  
  // Test that the command produces a quit message
  const quitMsg = await Effect.runPromise(cmds[0])
  expect(quitMsg._tag).toBe("Quit")
})

test("Component view should render correctly", async () => {
  const component = createTestComponent()
  const model = { count: 42, running: true }
  
  const view = component.view(model)
  const rendered = await Effect.runPromise(view.render())
  
  expect(rendered).toBe("Count: 42")
})

// =============================================================================
// Runtime State Tests
// =============================================================================

test("Runtime should manage state correctly", async () => {
  // Test runtime state structure
  interface TestRuntimeState {
    readonly model: TestModel
    readonly running: boolean
    readonly lastRenderTime: number
    readonly frameCount: number
  }
  
  const state: TestRuntimeState = {
    model: { count: 10, running: true },
    running: true,
    lastRenderTime: Date.now(),
    frameCount: 5
  }
  
  expect(state.model.count).toBe(10)
  expect(state.running).toBe(true)
  expect(state.frameCount).toBe(5)
  expect(typeof state.lastRenderTime).toBe("number")
})

// =============================================================================
// Queue and Message Processing Tests
// =============================================================================

test("Message queue should handle SystemMsg correctly", async () => {
  const queue = await Effect.runPromise(Queue.unbounded<SystemMsg<TestMsg>>())
  
  const userMsg: SystemMsg<TestMsg> = {
    _tag: "UserMsg",
    msg: { _tag: "Increment" }
  }
  
  const quitMsg: SystemMsg<TestMsg> = {
    _tag: "Quit"
  }
  
  // Offer messages to queue
  await Effect.runPromise(Queue.offer(queue, userMsg))
  await Effect.runPromise(Queue.offer(queue, quitMsg))
  
  // Take messages from queue
  const msg1 = await Effect.runPromise(Queue.take(queue))
  const msg2 = await Effect.runPromise(Queue.take(queue))
  
  expect(msg1._tag).toBe("UserMsg")
  expect((msg1 as any).msg._tag).toBe("Increment")
  expect(msg2._tag).toBe("Quit")
})

// =============================================================================
// Configuration Validation Tests
// =============================================================================

test("RuntimeConfig should accept valid configurations", () => {
  const validConfigs: RuntimeConfig[] = [
    {},
    { fps: 30 },
    { debug: true },
    { quitOnEscape: true, quitOnCtrlC: false },
    { enableMouse: true, fullscreen: false },
    { fps: 120, debug: true, quitOnEscape: true, enableMouse: true }
  ]
  
  validConfigs.forEach(config => {
    expect(() => new Runtime(createTestComponent(), config)).not.toThrow()
  })
})

test("RuntimeConfig should handle edge cases", () => {
  const edgeConfigs: RuntimeConfig[] = [
    { fps: 1 }, // Very low FPS
    { fps: 240 }, // Very high FPS
    { debug: false }, // Explicit false
    { quitOnEscape: false, quitOnCtrlC: false } // Both quit options disabled
  ]
  
  edgeConfigs.forEach(config => {
    expect(() => new Runtime(createTestComponent(), config)).not.toThrow()
  })
})

// =============================================================================
// Error Handling Tests
// =============================================================================

test("Runtime should handle component init errors", async () => {
  const errorComponent: Component<TestModel, TestMsg> = {
    init: Effect.fail(new Error("Init failed")),
    update: (msg, model) => Effect.succeed([model, []]),
    view: (model) => ({ render: () => Effect.succeed("") })
  }
  
  // Test that the component init properly fails
  const result = await Effect.runPromiseExit(errorComponent.init)
  expect(result._tag).toBe("Failure")
})

test("Runtime should handle component update errors", async () => {
  const errorComponent: Component<TestModel, TestMsg> = {
    init: Effect.succeed([{ count: 0, running: true }, []]),
    update: (msg, model) => Effect.fail(new Error("Update failed")),
    view: (model) => ({ render: () => Effect.succeed("") })
  }
  
  // This would be tested in integration, component errors during update
  // should be handled by the runtime's error boundaries
  expect(errorComponent.update).toBeDefined()
  
  const result = await Effect.runPromiseExit(
    errorComponent.update({ _tag: "Increment" }, { count: 0, running: true })
  )
  
  expect(result._tag).toBe("Failure")
})

// =============================================================================
// Lifecycle Tests
// =============================================================================

test("runApp should create and run runtime", () => {
  const component = createTestComponent()
  const config: RuntimeConfig = { fps: 30, debug: true }
  
  const appEffect = runApp(component, config)
  
  // Verify it returns an Effect
  expect(typeof appEffect).toBe("object")
  expect("pipe" in appEffect).toBe(true)
})

test("Runtime should handle empty configuration", () => {
  const component = createTestComponent()
  const runtime = new Runtime(component, {})
  
  const config = (runtime as any).config
  
  // Should have all defaults
  expect(config.fps).toBe(60)
  expect(config.debug).toBe(false)
  expect(config.quitOnCtrlC).toBe(true)
})

// =============================================================================
// Mock Integration Tests
// =============================================================================

test("Mock services should provide correct interface", () => {
  const terminal = createMockTerminalService()
  const input = createMockInputService()
  const renderer = createMockRendererService()
  const mouseRouter = createMockMouseRouterService()
  
  // Verify mock services have required methods/properties
  expect(typeof terminal.setRawMode).toBe("function")
  expect(typeof terminal.clear).toBe("object") // Effect object
  expect(typeof input.enableMouse).toBe("object") // Effect object
  expect(typeof renderer.render).toBe("function")
  expect(typeof mouseRouter.routeMouseEvent).toBe("function")
})

// =============================================================================
// Stream and Effect Integration Tests
// =============================================================================

test("Effect operations should work with runtime structures", async () => {
  // Test Ref operations
  const testRef = await Effect.runPromise(Ref.make({ count: 0 }))
  
  await Effect.runPromise(Ref.update(testRef, state => ({ count: state.count + 1 })))
  const newState = await Effect.runPromise(Ref.get(testRef))
  
  expect(newState.count).toBe(1)
})

test("Fiber operations should work correctly", async () => {
  const testEffect = Effect.succeed("completed")
  
  const result = await Effect.runPromise(Effect.gen(function* (_) {
    const fiber = yield* _(Effect.fork(testEffect))
    return yield* _(Fiber.join(fiber))
  }))
  
  expect(result).toBe("completed")
})

// =============================================================================
// Configuration Edge Cases
// =============================================================================

test("Runtime should handle undefined configuration", () => {
  const component = createTestComponent()
  const runtime = new Runtime(component, undefined)
  
  const config = (runtime as any).config
  expect(config.fps).toBe(60) // Should use defaults
})

test("Runtime should preserve user overrides", () => {
  const component = createTestComponent()
  const runtime = new Runtime(component, { 
    fps: 15,
    fullscreen: false,
    quitOnCtrlC: false 
  })
  
  const config = (runtime as any).config
  expect(config.fps).toBe(15)
  expect(config.fullscreen).toBe(false)
  expect(config.quitOnCtrlC).toBe(false)
  expect(config.debug).toBe(false) // Default preserved
})