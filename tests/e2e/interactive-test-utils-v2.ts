/**
 * Interactive Test Utilities V2
 * 
 * Improved keypress simulation using proper Effect scoped resources
 * to ensure streams are properly connected before events are published.
 */

import { Effect, Stream, PubSub, Ref, Fiber, Layer, Scope, Queue } from "effect"
import type { Component, RuntimeConfig, KeyEvent } from "@/core/types.ts"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService,
  MouseRouterService,
  HitTestService
} from "@/services/index.ts"
import { runApp } from "@/core/runtime.ts"

// =============================================================================
// Interactive Test Context
// =============================================================================

export interface InteractiveTestContext<Model, Msg> {
  /** Send a key event to the application */
  readonly sendKey: (key: string, modifiers?: Partial<KeyEvent>) => Effect.Effect<void>
  
  /** Send multiple keys in sequence */
  readonly sendKeys: (keys: string[]) => Effect.Effect<void>
  
  /** Type text character by character */
  readonly typeText: (text: string) => Effect.Effect<void>
  
  /** Get current rendered output */
  readonly getOutput: () => Effect.Effect<string>
  
  /** Wait for output to match condition */
  readonly waitForOutput: (
    predicate: (output: string) => boolean,
    timeoutMs?: number
  ) => Effect.Effect<string>
  
  /** Get current model (if captured) */
  readonly getCurrentModel: () => Effect.Effect<Model>
  
  /** Wait for model to match condition */
  readonly waitForModel: (
    predicate: (model: Model) => boolean,
    timeoutMs?: number
  ) => Effect.Effect<Model>
  
  /** Clean up test resources */
  readonly cleanup: () => Effect.Effect<void>
}

// =============================================================================
// Create Interactive Test Context V2
// =============================================================================

export const createInteractiveTestContext = <Model, Msg>(
  component: Component<Model, Msg>,
  config: Partial<RuntimeConfig> = {}
): Effect.Effect<InteractiveTestContext<Model, Msg>, never, Scope.Scope> =>
  Effect.gen(function* (_) {
    // State refs
    const outputRef = yield* _(Ref.make<string>(""))
    const modelRef = yield* _(Ref.make<Model | null>(null))
    const eventLogRef = yield* _(Ref.make<string[]>([]))
    
    // Create a queue for key events - simpler and more reliable than PubSub for testing
    const keyEventQueue = yield* _(Queue.unbounded<KeyEvent>())
    
    // Create a stream from the queue that will be consumed by the runtime
    // We need to ensure this stream is created BEFORE the runtime starts
    const keyEventStream = Stream.fromQueue(keyEventQueue)
    
    // Create a second queue for our own tracking
    const trackingQueue = yield* _(Queue.unbounded<KeyEvent>())
    
    // Fork a fiber to copy events from main queue to tracking queue
    yield* _(
      Stream.fromQueue(keyEventQueue).pipe(
        Stream.tap(event => Queue.offer(trackingQueue, event)),
        Stream.runDrain
      ).pipe(Effect.forkScoped)
    )
    
    // Mock services
    const mockTerminal = createMockTerminal()
    const mockRenderer = createMockRenderer(outputRef)
    const mockInput = createMockInputV2(keyEventStream, eventLogRef)
    const mockStorage = createMockStorage()
    const mockMouseRouter = createMockMouseRouter()
    const mockHitTest = createMockHitTest()
    
    // Create service layer
    const TestServices = Layer.mergeAll([
      Layer.succeed(TerminalService, TerminalService.of(mockTerminal)),
      Layer.succeed(RendererService, RendererService.of(mockRenderer)),
      Layer.succeed(InputService, InputService.of(mockInput)),
      Layer.succeed(StorageService, StorageService.of(mockStorage)),
      Layer.succeed(MouseRouterService, MouseRouterService.of(mockMouseRouter)),
      Layer.succeed(HitTestService, HitTestService.of(mockHitTest))
    ])
    
    // Wrap component to capture model updates
    const wrappedComponent: Component<Model, Msg> = {
      init: Effect.gen(function* (_) {
        const result = yield* _(component.init)
        yield* _(Ref.set(modelRef, result[0]))
        console.log("[TEST] Component initialized with model:", result[0])
        return result
      }),
      
      update: (msg: Msg, model: Model) =>
        Effect.gen(function* (_) {
          console.log("[TEST] Update called with msg:", msg)
          const result = yield* _(component.update(msg, model))
          yield* _(Ref.set(modelRef, result[0]))
          console.log("[TEST] Model updated to:", result[0])
          return result
        }),
      
      view: component.view,
      subscriptions: component.subscriptions ? 
        (model: Model) => Effect.gen(function* (_) {
          console.log("[TEST] Creating subscriptions for model:", model)
          const sub = yield* _(component.subscriptions!(model))
          return sub.pipe(
            Stream.tap(msg => Effect.sync(() => console.log("[TEST] Subscription emitting:", msg)))
          )
        }) : undefined
    }
    
    // Start the application
    console.log("[TEST] Starting application...")
    const appFiber = yield* _(
      runApp(wrappedComponent, {
        fps: 60,
        debug: true,
        quitOnEscape: false,
        quitOnCtrlC: false,
        enableMouse: false,
        fullscreen: false,
        ...config
      }).pipe(
        Effect.provide(TestServices),
        Effect.forkScoped
      )
    )
    
    // Wait for initialization - give the runtime time to set up subscriptions
    console.log("[TEST] Waiting for app initialization...")
    yield* _(Effect.sleep(200))
    
    // Create test context
    return {
      sendKey: (key: string, modifiers = {}) =>
        Effect.gen(function* (_) {
          const event = {
            key,
            ctrl: modifiers.ctrl || false,
            shift: modifiers.shift || false,
            alt: modifiers.alt || false,
            meta: modifiers.meta || false
          }
          console.log("[TEST] Sending key:", event)
          yield* _(Queue.offer(keyEventQueue, event))
          yield* _(Ref.update(eventLogRef, log => [...log, `Sent key: ${key}`]))
          // Give time for the event to be processed
          yield* _(Effect.sleep(50))
        }),
      
      sendKeys: (keys: string[]) =>
        Effect.forEach(keys, key => 
          Effect.gen(function* (_) {
            const event = {
              key,
              ctrl: false,
              shift: false,
              alt: false,
              meta: false
            }
            console.log("[TEST] Sending key:", event)
            yield* _(Queue.offer(keyEventQueue, event))
            yield* _(Ref.update(eventLogRef, log => [...log, `Sent key: ${key}`]))
            yield* _(Effect.sleep(50))
          })
        ).pipe(Effect.map(() => undefined)),
      
      typeText: (text: string) =>
        Effect.forEach(text.split(''), char =>
          Effect.gen(function* (_) {
            const event = {
              key: char,
              ctrl: false,
              shift: false,
              alt: false,
              meta: false
            }
            console.log("[TEST] Typing char:", event)
            yield* _(Queue.offer(keyEventQueue, event))
            yield* _(Ref.update(eventLogRef, log => [...log, `Typed: ${char}`]))
            yield* _(Effect.sleep(30))
          })
        ).pipe(Effect.map(() => undefined)),
      
      getOutput: () => Ref.get(outputRef),
      
      waitForOutput: (predicate, timeoutMs = 5000) =>
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
          const eventLog = yield* _(Ref.get(eventLogRef))
          return yield* _(Effect.fail(
            new Error(`Timeout waiting for output condition.\nFinal output: ${finalOutput}\nEvent log: ${eventLog.join(', ')}`)
          ))
        }),
      
      getCurrentModel: () =>
        Ref.get(modelRef).pipe(
          Effect.flatMap(model =>
            model
              ? Effect.succeed(model)
              : Effect.fail(new Error("Model not available"))
          )
        ),
      
      waitForModel: (predicate, timeoutMs = 5000) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          while (Date.now() - startTime < timeoutMs) {
            const model = yield* _(Ref.get(modelRef))
            if (model && predicate(model)) {
              return model
            }
            yield* _(Effect.sleep(50))
          }
          const eventLog = yield* _(Ref.get(eventLogRef))
          return yield* _(Effect.fail(
            new Error(`Timeout waiting for model condition.\nEvent log: ${eventLog.join(', ')}`)
          ))
        }),
      
      cleanup: () => Fiber.interrupt(appFiber)
    }
  })

// =============================================================================
// Mock Service Factories
// =============================================================================

function createMockTerminal() {
  return {
    getSize: Effect.succeed({ width: 80, height: 24 }),
    clear: Effect.succeed(undefined),
    hideCursor: Effect.succeed(undefined),
    showCursor: Effect.succeed(undefined),
    write: (_text: string) => Effect.succeed(undefined),
    writeLine: (_text: string) => Effect.succeed(undefined),
    moveCursor: (_x: number, _y: number) => Effect.succeed(undefined),
    moveCursorRelative: (_dx: number, _dy: number) => Effect.succeed(undefined),
    setRawMode: (_enabled: boolean) => Effect.succeed(undefined),
    setAlternateScreen: (_enabled: boolean) => Effect.succeed(undefined),
    saveCursor: Effect.succeed(undefined),
    restoreCursor: Effect.succeed(undefined),
    getCapabilities: Effect.succeed({
      colors: true,
      unicode: true,
      mouse: false
    }),
    isColorSupported: Effect.succeed(true),
    setTitle: (_title: string) => Effect.succeed(undefined),
    bell: Effect.succeed(undefined),
    scrollUp: (_lines: number) => Effect.succeed(undefined),
    scrollDown: (_lines: number) => Effect.succeed(undefined),
    clearLine: Effect.succeed(undefined),
    clearLineAfter: Effect.succeed(undefined),
    clearLineBefore: Effect.succeed(undefined),
    clearScreenAfter: Effect.succeed(undefined),
    clearScreenBefore: Effect.succeed(undefined)
  } as any
}

function createMockRenderer(outputRef: Ref.Ref<string>) {
  return {
    render: (view: any) =>
      Effect.gen(function* (_) {
        let output: string
        if (view && view.render && typeof view.render === 'function') {
          output = yield* _(view.render())
        } else {
          output = String(view)
        }
        console.log("[TEST] Rendered output:", output)
        yield* _(Ref.set(outputRef, output))
      }),
    beginFrame: Effect.succeed(undefined),
    endFrame: Effect.succeed(undefined),
    clear: Effect.succeed(undefined)
  } as any
}

function createMockInputV2(keyEventStream: Stream.Stream<KeyEvent>, eventLogRef: Ref.Ref<string[]>) {
  console.log("[TEST] Creating mock input service")
  
  // The key is to ensure the keyEvents property returns the SAME stream instance
  // This stream will be consumed by the runtime's subscription system
  const service = {
    keyEvents: keyEventStream.pipe(
      Stream.tap(event => 
        Effect.gen(function* (_) {
          console.log("[TEST] Key event in stream:", event.key)
          yield* _(Ref.update(eventLogRef, log => [...log, `Stream saw: ${event.key}`]))
        })
      )
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
    readKey: Effect.never,
    readLine: Effect.succeed(""),
    inputAvailable: Effect.succeed(false),
    flushInput: Effect.succeed(undefined),
    filterKeys: (predicate: (key: KeyEvent) => boolean) =>
      keyEventStream.pipe(Stream.filter(predicate)),
    mapKeys: <T>(mapper: (key: KeyEvent) => Effect.Effect<T>) =>
      keyEventStream.pipe(Stream.mapEffect(mapper))
  } as any
  
  return service
}

function createMockStorage() {
  return {
    save: (_key: string, _value: unknown) => Effect.succeed(undefined),
    load: (_key: string) => Effect.succeed(null),
    remove: (_key: string) => Effect.succeed(undefined),
    clear: Effect.succeed(undefined),
    list: Effect.succeed([]),
    exists: (_key: string) => Effect.succeed(false)
  } as any
}

function createMockMouseRouter() {
  return {
    registerComponent: () => Effect.succeed(undefined),
    unregisterComponent: () => Effect.succeed(undefined),
    updateComponentBounds: () => Effect.succeed(undefined),
    routeMouseEvent: () => Effect.succeed(null),
    clearAll: Effect.succeed(undefined)
  } as any
}

function createMockHitTest() {
  return {
    hitTest: () => Effect.succeed(null),
    findComponentAt: () => Effect.succeed(null)
  } as any
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Run an interactive test with automatic cleanup
 */
export const runInteractiveTest = <Model, Msg>(
  component: Component<Model, Msg>,
  test: (ctx: InteractiveTestContext<Model, Msg>) => Effect.Effect<void>,
  config?: Partial<RuntimeConfig>
): Effect.Effect<void> =>
  Effect.scoped(
    Effect.gen(function* (_) {
      const ctx = yield* _(createInteractiveTestContext(component, config))
      yield* _(test(ctx))
    })
  )

/**
 * Common key combinations
 */
export const Keys = {
  Enter: 'enter',
  Escape: 'escape',
  Tab: 'tab',
  Space: ' ',
  Backspace: 'backspace',
  Delete: 'delete',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  
  // Function keys
  F1: 'f1',
  F2: 'f2',
  F3: 'f3',
  F4: 'f4',
  F5: 'f5',
  F6: 'f6',
  F7: 'f7',
  F8: 'f8',
  F9: 'f9',
  F10: 'f10',
  F11: 'f11',
  F12: 'f12',
  
  // Control combinations
  CtrlC: { key: 'c', ctrl: true },
  CtrlX: { key: 'x', ctrl: true },
  CtrlV: { key: 'v', ctrl: true },
  CtrlZ: { key: 'z', ctrl: true },
  CtrlA: { key: 'a', ctrl: true },
  CtrlS: { key: 's', ctrl: true },
  CtrlD: { key: 'd', ctrl: true },
  CtrlQ: { key: 'q', ctrl: true }
} as const