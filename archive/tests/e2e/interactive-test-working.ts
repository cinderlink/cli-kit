/**
 * Working Interactive Test Utilities
 * 
 * Based on the working setup.ts approach but with proper handling
 * to avoid event competition between consumers.
 */

import { Effect, Stream, Queue, Ref, Fiber, Layer, Scope } from "effect"
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
  
  /** Get current rendered output */
  readonly getOutput: () => Effect.Effect<string>
  
  /** Wait for output to match condition */
  readonly waitForOutput: (
    predicate: (output: string) => boolean,
    timeoutMs?: number
  ) => Effect.Effect<string>
  
  /** Get current model */
  readonly getCurrentModel: () => Effect.Effect<Model>
  
  /** Wait for model to match condition */
  readonly waitForModel: (
    predicate: (model: Model) => boolean,
    timeoutMs?: number
  ) => Effect.Effect<Model>
}

// =============================================================================
// Create Interactive Test Context
// =============================================================================

export const createInteractiveTestContext = <Model, Msg>(
  component: Component<Model, Msg>,
  config: Partial<RuntimeConfig> = {}
): Effect.Effect<InteractiveTestContext<Model, Msg>, never, Scope.Scope> =>
  Effect.scoped(
    Effect.gen(function* (_) {
      // State refs
      const outputRef = yield* _(Ref.make<string>(""))
      const modelRef = yield* _(Ref.make<Model | null>(null))
      
      // Create a single queue for key events
      const keyQueue = yield* _(Queue.unbounded<KeyEvent>())
      
      // IMPORTANT: Disable quit keys in config to prevent the runtime
      // from creating a competing consumer via input.filterKeys
      const testConfig: RuntimeConfig = {
        fps: 60,
        debug: false,
        quitOnEscape: false,  // Critical!
        quitOnCtrlC: false,   // Critical!
        enableMouse: false,
        fullscreen: false,
        ...config
      }
      
      // Create the key event stream that will be used by all consumers
      // This is the key - we create ONE stream that's used for keyEvents
      const keyEventStream = Stream.fromQueue(keyQueue).pipe(
        Stream.tap(event => 
          Effect.sync(() => console.log("[INPUT STREAM] Key event:", event.key))
        )
      )
      
      // Mock input service
      const mockInput: InputService = {
        keyEvents: keyEventStream,
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
        // IMPORTANT: filterKeys and mapKeys must return the SAME stream
        // to avoid creating competing consumers
        filterKeys: (predicate: (key: KeyEvent) => boolean) =>
          keyEventStream.pipe(Stream.filter(predicate)),
        mapKeys: <T>(mapper: (key: KeyEvent) => Effect.Effect<T>) =>
          keyEventStream.pipe(Stream.mapEffect(mapper))
      } as any
      
      // Other mock services
      const mockTerminal = {
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
      
      const mockRenderer = {
        render: (view: any) =>
          Effect.gen(function* (_) {
            let output: string
            if (view && view.render && typeof view.render === 'function') {
              output = yield* _(view.render())
            } else {
              output = String(view)
            }
            yield* _(Ref.set(outputRef, output))
          }),
        beginFrame: Effect.succeed(undefined),
        endFrame: Effect.succeed(undefined),
        clear: Effect.succeed(undefined)
      } as any
      
      const mockStorage = {
        save: (_key: string, _value: unknown) => Effect.succeed(undefined),
        load: (_key: string) => Effect.succeed(null),
        remove: (_key: string) => Effect.succeed(undefined),
        clear: Effect.succeed(undefined),
        list: Effect.succeed([]),
        exists: (_key: string) => Effect.succeed(false)
      } as any
      
      const mockMouseRouter = {
        registerComponent: () => Effect.succeed(undefined),
        unregisterComponent: () => Effect.succeed(undefined),
        updateComponentBounds: () => Effect.succeed(undefined),
        routeMouseEvent: () => Effect.succeed(null),
        clearAll: Effect.succeed(undefined)
      } as any
      
      const mockHitTest = {
        hitTest: () => Effect.succeed(null),
        findComponentAt: () => Effect.succeed(null)
      } as any
      
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
          return result
        }),
        
        update: (msg: Msg, model: Model) =>
          Effect.gen(function* (_) {
            const result = yield* _(component.update(msg, model))
            yield* _(Ref.set(modelRef, result[0]))
            return result
          }),
        
        view: component.view,
        subscriptions: component.subscriptions
      }
      
      // Start the application
      const appFiber = yield* _(
        runApp(wrappedComponent, testConfig).pipe(
          Effect.provide(TestServices),
          Effect.forkScoped
        )
      )
      
      // Wait for initialization
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
            console.log("[TEST] Sending key:", key)
            yield* _(Queue.offer(keyQueue, event))
            // Give time for event processing
            yield* _(Effect.sleep(100))
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
              yield* _(Queue.offer(keyQueue, event))
              yield* _(Effect.sleep(100))
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
            return yield* _(Effect.fail(
              new Error(`Timeout waiting for output condition.\nFinal output: ${finalOutput}`)
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
            return yield* _(Effect.fail(
              new Error(`Timeout waiting for model condition.`)
            ))
          })
      }
    })
  )

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