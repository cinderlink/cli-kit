/**
 * E2E Test Setup - Test utilities for CLI-Kit examples
 * 
 * This module provides utilities for testing TUI applications by:
 * - Capturing terminal output
 * - Simulating keyboard input
 * - Asserting on rendered content
 * - Managing test timeouts
 */

import { Effect, Fiber, Queue, Ref, Stream, Layer, Option, Scope } from "effect"
import { runApp } from "@/index.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService,
  MouseRouterService,
  HitTestService
} from "@/services/index.ts"

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

interface TestGuardOptions {
  readonly idleTimeoutMs?: number
  readonly pollIntervalMs?: number
  readonly label?: string
}

interface TestRuntimeOptions extends Partial<RuntimeConfig> {
  readonly guard?: TestGuardOptions
}

export const createTestContext = <Model, Msg>(
  component: Component<Model, Msg>,
  config: TestRuntimeOptions = {}
): Effect.Effect<TestContext<Model, Msg>, Error, Scope.Scope> =>
  Effect.gen(function* (_) {
    // Captured output and model state
    const outputRef = yield* _(Ref.make<string>(""))
    const modelRef = yield* _(Ref.make<Model | null>(null))
    const keyQueue = yield* _(Queue.unbounded<TestKeyEvent>())
    const guardErrorRef = yield* _(Ref.make<Option.Option<Error>>(Option.none<Error>()))
    const lastActivityRef = yield* _(Ref.make<number>(Date.now()))
    const cleanedRef = yield* _(Ref.make(false))

    const { guard: guardOptions, ...runtimeOverrides } = config
    const guardConfig = {
      idleTimeoutMs: guardOptions?.idleTimeoutMs ?? 10_000,
      pollIntervalMs: guardOptions?.pollIntervalMs ?? 100,
      label: guardOptions?.label ?? (component as any)?.name ?? "test-context"
    }
    
    // For now, let's use a simpler approach - the issue is not multiple consumers
    // but that the subscription stream isn't being consumed properly
    
    // Mock terminal service that captures output
    const mockTerminal = {
      getSize: Effect.succeed({ width: 80, height: 24 }),
      clear: Effect.succeed(undefined),
      hideCursor: Effect.succeed(undefined),
      showCursor: Effect.succeed(undefined),
      write: (text: string) => Effect.succeed(undefined),
      writeLine: (text: string) => Effect.succeed(undefined),
      moveCursor: (x: number, y: number) => Effect.succeed(undefined),
      moveCursorRelative: (dx: number, dy: number) => Effect.succeed(undefined),
      setRawMode: (enabled: boolean) => Effect.succeed(undefined),
      setAlternateScreen: (enabled: boolean) => Effect.succeed(undefined),
      saveCursor: Effect.succeed(undefined),
      restoreCursor: Effect.succeed(undefined),
      getCapabilities: Effect.succeed({
        colors: true,
        unicode: true,
        mouse: false
      }),
      isColorSupported: Effect.succeed(true),
      setTitle: (title: string) => Effect.succeed(undefined),
      bell: Effect.succeed(undefined),
      scrollUp: (lines: number) => Effect.succeed(undefined),
      scrollDown: (lines: number) => Effect.succeed(undefined),
      clearLine: Effect.succeed(undefined),
      clearLineAfter: Effect.succeed(undefined),
      clearLineBefore: Effect.succeed(undefined),
      clearScreenAfter: Effect.succeed(undefined),
      clearScreenBefore: Effect.succeed(undefined)
    }
    
    // Mock renderer that captures output and model
    const mockRenderer = {
      render: (view: any) => 
        Effect.gen(function* (_) {
          let output: string
          if (view && view.render && typeof view.render === 'function') {
            // This is a View object with render method
            output = yield* _(view.render())
          } else {
            // This is a simple view structure
            output = renderToString(view)
          }
          yield* _(Ref.set(outputRef, output))
        }),
      beginFrame: Effect.succeed(undefined),
      endFrame: Effect.succeed(undefined),
      clear: Effect.succeed(undefined)
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
      resizeEvents: Stream.empty,
      pasteEvents: Stream.empty,
      focusEvents: Stream.empty,
      enableMouse: Effect.succeed(undefined),
      disableMouse: Effect.succeed(undefined),
      enableMouseMotion: Effect.succeed(undefined),
      disableMouseMotion: Effect.succeed(undefined),
      enableBracketedPaste: Effect.succeed(undefined),
      disableBracketedPaste: Effect.succeed(undefined),
      enableFocusTracking: Effect.succeed(undefined),
      disableFocusTracking: Effect.succeed(undefined),
      readKey: Queue.take(keyQueue).pipe(
        Effect.map(testKey => ({
          key: testKey.key,
          ctrl: testKey.ctrl || false,
          shift: testKey.shift || false,
          alt: testKey.alt || false,
          meta: testKey.meta || false
        }))
      ),
      readLine: Effect.succeed(""),
      inputAvailable: Effect.succeed(false),
      flushInput: Effect.succeed(undefined),
      filterKeys: (predicate: any) => 
        Stream.fromQueue(keyQueue).pipe(
          Stream.map(testKey => ({
            key: testKey.key,
            ctrl: testKey.ctrl || false,
            shift: testKey.shift || false,
            alt: testKey.alt || false,
            meta: testKey.meta || false
          })),
          Stream.filter(predicate)
        ),
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
        )
    }
    
    // Mock storage service
    const mockStorage = {
      save: (key: string, value: unknown) => Effect.succeed(undefined),
      load: (key: string) => Effect.succeed(null),
      remove: (key: string) => Effect.succeed(undefined),
      clear: Effect.succeed(undefined),
      list: Effect.succeed([]),
      exists: (key: string) => Effect.succeed(false)
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
    const MockServices = Layer.mergeAll([
      Layer.succeed(TerminalService, TerminalService.of(mockTerminal)),
      Layer.succeed(RendererService, RendererService.of(mockRenderer)),
      Layer.succeed(InputService, InputService.of(mockInput)),
      Layer.succeed(StorageService, StorageService.of(mockStorage)),
      Layer.succeed(MouseRouterService, MouseRouterService.of(mockMouseRouter)),
      Layer.succeed(HitTestService, HitTestService.of({
        hitTest: () => Effect.succeed(null),
        findComponentAt: () => Effect.succeed(null)
      }))
    ])
    
    // Test configuration
    const testConfig: RuntimeConfig = {
      fps: 30,
      debug: false,
      quitOnEscape: false,
      quitOnCtrlC: false,
      enableMouse: false,
      fullscreen: false,
      ...runtimeOverrides
    }
    
    // Create a test-specific component wrapper that captures the model
    const wrappedComponent: Component<Model, Msg> = {
      init: Effect.gen(function* (_) {
        const [initialModel, cmds] = yield* _(component.init)
        // Capture the initial model for testing
        yield* _(Ref.set(modelRef, initialModel))
        return [initialModel, cmds]
      }),
      update: (msg: Msg, model: Model) => 
        Effect.gen(function* (_) {
          const [newModel, cmds] = yield* _(component.update(msg, model))
          // Capture the new model for testing
          yield* _(Ref.set(modelRef, newModel))
          return [newModel, cmds]
        }),
      view: component.view,
      subscriptions: component.subscriptions
    }
    
    const withGuard = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | Error, R> =>
      guardConfig.idleTimeoutMs <= 0
        ? effect
        : Effect.gen(function* (_) {
            const guardError = yield* _(Ref.get(guardErrorRef))
            if (Option.isSome(guardError)) {
              return yield* _(Effect.fail(guardError.value))
            }
            yield* _(Ref.set(lastActivityRef, Date.now()))
            return yield* _(effect)
          })

    // Start the application in the background (scoped for automatic cleanup)
    const appFiber = yield* _(
      runApp(wrappedComponent, testConfig).pipe(
        Effect.provide(MockServices),
        Effect.forkScoped
      )
    )

    const safeCleanup = Effect.uninterruptible(
      Effect.gen(function* (_) {
        const alreadyCleaned = yield* _(Ref.get(cleanedRef))
        if (alreadyCleaned) {
          return
        }
        yield* _(Ref.set(cleanedRef, true))
        yield* _(Fiber.interrupt(appFiber))
      })
    )

    if (guardConfig.idleTimeoutMs > 0) {
      yield* _(
        Effect.forever(
          Effect.sleep(guardConfig.pollIntervalMs).pipe(
            Effect.flatMap(() =>
              Effect.gen(function* (_) {
                const alreadyCleaned = yield* _(Ref.get(cleanedRef))
                if (alreadyCleaned) {
                  return
                }

                const guardError = yield* _(Ref.get(guardErrorRef))
                if (Option.isSome(guardError)) {
                  return
                }

                const lastActivity = yield* _(Ref.get(lastActivityRef))
                if (Date.now() - lastActivity > guardConfig.idleTimeoutMs) {
                  const error = new Error(
                    `Test context guard triggered after ${guardConfig.idleTimeoutMs}ms of inactivity (${guardConfig.label})`
                  )
                  yield* _(Ref.set(guardErrorRef, Option.some(error)))
                  yield* _(safeCleanup)
                }
              })
            )
          )
        ).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
          Effect.forkScoped
        )
      )
    }

    // Wait a bit for the app to initialize and capture initial model
    yield* _(Effect.sleep(100))
    
    return {
      sendKey: (key: TestKeyEvent) => withGuard(Queue.offer(keyQueue, key)),

      getOutput: () => withGuard(Ref.get(outputRef)),

      getCurrentModel: () =>
        withGuard(
          Ref.get(modelRef).pipe(
            Effect.flatMap(model =>
              model ? Effect.succeed(model) : Effect.fail(new Error("Model not available"))
            )
          )
        ),

      waitForOutput: (predicate: (output: string) => boolean, timeoutMs = 5000) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          
          while (Date.now() - startTime < timeoutMs) {
            const output = yield* _(withGuard(Ref.get(outputRef)))
            if (predicate(output)) {
              return output
            }
            yield* _(withGuard(Effect.sleep(50)))
          }
          
          const guardError = yield* _(Ref.get(guardErrorRef))
          if (Option.isSome(guardError)) {
            return yield* _(Effect.fail(guardError.value))
          }

          const finalOutput = yield* _(Ref.get(outputRef))
          return yield* _(Effect.fail(new Error(`Timeout waiting for output condition. Final output: ${finalOutput}`)))
        }),
      
      waitForModel: (predicate: (model: Model) => boolean, timeoutMs = 5000) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          
          while (Date.now() - startTime < timeoutMs) {
            const model = yield* _(withGuard(Ref.get(modelRef)))
            if (model && predicate(model)) {
              return model
            }
            yield* _(withGuard(Effect.sleep(50)))
          }
          
          const guardError = yield* _(Ref.get(guardErrorRef))
          if (Option.isSome(guardError)) {
            return yield* _(Effect.fail(guardError.value))
          }

          return yield* _(Effect.fail(new Error("Timeout waiting for model condition")))
        }),
      
      cleanup: () => safeCleanup
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
