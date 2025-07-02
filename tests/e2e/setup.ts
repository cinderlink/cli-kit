/**
 * E2E Test Setup - Test utilities for CLI-Kit examples
 * 
 * This module provides utilities for testing TUI applications by:
 * - Capturing terminal output
 * - Simulating keyboard input
 * - Asserting on rendered content
 * - Managing test timeouts
 */

import { Effect, Fiber, Queue, Ref, Stream, Schedule, pipe } from "effect"
import { runApp } from "@/index.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"
import { LiveServices } from "../../src/services/impl/index.ts"

// =============================================================================
// Test Types
// =============================================================================

export interface TestKeyEvent {
  readonly key: string
  readonly ctrl?: boolean
  readonly shift?: boolean
  readonly alt?: boolean
  readonly meta?: boolean
}

export interface TestContext<Model, Msg> {
  readonly sendKey: (key: TestKeyEvent) => Effect.Effect<void, never, never>
  readonly getOutput: () => Effect.Effect<string, never, never>
  readonly getCurrentModel: () => Effect.Effect<Model, never, never>
  readonly waitForOutput: (predicate: (output: string) => boolean, timeoutMs?: number) => Effect.Effect<string, Error, never>
  readonly waitForModel: (predicate: (model: Model) => boolean, timeoutMs?: number) => Effect.Effect<Model, Error, never>
  readonly cleanup: () => Effect.Effect<void, never, never>
}

// =============================================================================
// Mock Services for Testing
// =============================================================================

export const createTestContext = <Model, Msg>(
  component: Component<Model, Msg>,
  config: Partial<RuntimeConfig> = {}
): Effect.Effect<TestContext<Model, Msg>, Error, never> =>
  Effect.gen(function* (_) {
    // Captured output
    const outputRef = yield* _(Ref.make<string>(""))
    const modelRef = yield* _(Ref.make<Model | null>(null))
    const keyQueue = yield* _(Queue.unbounded<TestKeyEvent>())
    
    // Mock terminal service that captures output
    const mockTerminal = {
      getSize: () => Effect.succeed({ width: 80, height: 24 }),
      clear: () => Effect.succeed(undefined),
      hideCursor: () => Effect.succeed(undefined),
      showCursor: () => Effect.succeed(undefined),
      enableAlternateScreen: () => Effect.succeed(undefined),
      disableAlternateScreen: () => Effect.succeed(undefined)
    }
    
    // Mock renderer that captures output instead of writing to terminal
    const mockRenderer = {
      render: (view: any) => 
        Effect.gen(function* (_) {
          const output = renderToString(view)
          yield* _(Ref.set(outputRef, output))
        })
    }
    
    // Mock input service that reads from our queue
    const mockInput = {
      keyEvents: Stream.fromQueue(keyQueue).pipe(
        Stream.map(testKey => ({
          key: testKey.key,
          ctrl: testKey.ctrl || false,
          shift: testKey.shift || false,
          alt: testKey.alt || false,
          meta: testKey.meta || false
        }))
      ),
      mouseEvents: Stream.empty,
      mapKeys: (mapper: any) => 
        Stream.fromQueue(keyQueue).pipe(
          Stream.map(testKey => ({
            key: testKey.key,
            ctrl: testKey.ctrl || false,
            shift: testKey.shift || false,
            alt: testKey.alt || false,
            meta: testKey.meta || false
          })),
          Stream.filterMap(mapper)
        ),
      enableMouse: Effect.succeed(undefined),
      disableMouse: Effect.succeed(undefined)
    }
    
    // Mock storage service
    const mockStorage = {
      save: () => Effect.succeed(undefined),
      load: () => Effect.succeed(null),
      remove: () => Effect.succeed(undefined),
      clear: () => Effect.succeed(undefined)
    }
    
    // Mock mouse router
    const mockMouseRouter = {
      registerComponent: () => Effect.succeed(undefined),
      unregisterComponent: () => Effect.succeed(undefined),
      updateComponentBounds: () => Effect.succeed(undefined),
      routeMouseEvent: () => Effect.succeed(null),
      clearAll: Effect.succeed(undefined)
    }
    
    // Create mock services layer
    const MockServices = {
      TerminalService: mockTerminal,
      RendererService: mockRenderer,
      InputService: mockInput,
      StorageService: mockStorage,
      MouseRouterService: mockMouseRouter
    }
    
    // Test configuration
    const testConfig: RuntimeConfig = {
      fps: 30,
      debug: false,
      quitOnEscape: false,
      quitOnCtrlC: false,
      enableMouse: false,
      fullscreen: false,
      ...config
    }
    
    // Start the application in the background
    const appFiber = yield* _(
      runApp(component, testConfig).pipe(
        Effect.provide(MockServices),
        Effect.fork
      )
    )
    
    // Wait a bit for the app to initialize
    yield* _(Effect.sleep(100))
    
    return {
      sendKey: (key: TestKeyEvent) => Queue.offer(keyQueue, key),
      
      getOutput: () => Ref.get(outputRef),
      
      getCurrentModel: () => Ref.get(modelRef).pipe(
        Effect.flatMap(model => 
          model ? Effect.succeed(model) : Effect.fail(new Error("Model not available"))
        )
      ),
      
      waitForOutput: (predicate: (output: string) => boolean, timeoutMs = 5000) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          
          while (Date.now() - startTime < timeoutMs) {
            const output = yield* _(Ref.get(outputRef))
            if (predicate(output)) {
              return output
            }
            yield* _(Effect.sleep(50))
          }
          
          const finalOutput = yield* _(Ref.get(outputRef))
          return yield* _(Effect.fail(new Error(`Timeout waiting for output condition. Final output: ${finalOutput}`)))
        }),
      
      waitForModel: (predicate: (model: Model) => boolean, timeoutMs = 5000) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          
          while (Date.now() - startTime < timeoutMs) {
            const model = yield* _(Ref.get(modelRef))
            if (model && predicate(model)) {
              return model
            }
            yield* _(Effect.sleep(50))
          }
          
          return yield* _(Effect.fail(new Error("Timeout waiting for model condition")))
        }),
      
      cleanup: () => Fiber.interrupt(appFiber)
    }
  })

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Simple view-to-string renderer for testing
 */
const renderToString = (view: any): string => {
  if (!view) return ""
  
  switch (view._tag) {
    case "Text":
      return view.content || ""
    
    case "VStack":
      return view.children?.map(renderToString).join('\n') || ""
    
    case "HStack":
      return view.children?.map(renderToString).join('') || ""
    
    case "Box":
      const childContent = renderToString(view.child)
      // Simple box rendering - just add borders if specified
      if (view.options?.border) {
        const lines = childContent.split('\n')
        const width = Math.max(...lines.map(l => l.length), view.options?.width || 20)
        const topBorder = '┌' + '─'.repeat(width) + '┐'
        const bottomBorder = '└' + '─'.repeat(width) + '┘'
        const sidedLines = lines.map(line => '│' + line.padEnd(width) + '│')
        return [topBorder, ...sidedLines, bottomBorder].join('\n')
      }
      return childContent
    
    default:
      return String(view)
  }
}

/**
 * Create a test key event
 */
export const key = (keyName: string, modifiers: Partial<TestKeyEvent> = {}): TestKeyEvent => ({
  key: keyName,
  ...modifiers
})

/**
 * Common key combinations
 */
export const keys = {
  enter: key('enter'),
  escape: key('escape'),
  tab: key('tab'),
  shiftTab: key('tab', { shift: true }),
  up: key('up'),
  down: key('down'),
  left: key('left'),
  right: key('right'),
  space: key(' '),
  ctrlC: key('ctrl+c'),
  f5: key('f5'),
  f9: key('f9')
}

/**
 * Assert that output contains expected text
 */
export const assertOutputContains = (output: string, expected: string): Effect.Effect<void, Error, never> =>
  output.includes(expected)
    ? Effect.succeed(undefined)
    : Effect.fail(new Error(`Expected output to contain "${expected}", but got: ${output}`))

/**
 * Assert that output matches a regex pattern
 */
export const assertOutputMatches = (output: string, pattern: RegExp): Effect.Effect<void, Error, never> =>
  pattern.test(output)
    ? Effect.succeed(undefined)
    : Effect.fail(new Error(`Expected output to match ${pattern}, but got: ${output}`))

/**
 * Type text character by character
 */
export const typeText = (ctx: TestContext<any, any>, text: string): Effect.Effect<void, never, never> =>
  Effect.forEach(text.split(''), char => 
    Effect.flatMap(ctx.sendKey(key(char)), () => Effect.sleep(50))
  ).pipe(Effect.map(() => undefined))

/**
 * Navigate using arrow keys
 */
export const navigate = (ctx: TestContext<any, any>, direction: 'up' | 'down' | 'left' | 'right', times = 1): Effect.Effect<void, never, never> =>
  Effect.forEach(
    Array(times).fill(0), 
    () => Effect.flatMap(ctx.sendKey(keys[direction]), () => Effect.sleep(100))
  ).pipe(Effect.map(() => undefined))