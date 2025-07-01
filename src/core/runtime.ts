/**
 * Application Runtime - The heart of the TUI framework
 * 
 * This module implements the main application loop, coordinating
 * between input, update, and render cycles using Effect's fiber system.
 */

import { Effect, Fiber, Queue, Ref, Stream, Schedule, pipe, Scope, Exit } from "effect"
import type { 
  Component, 
  Cmd, 
  Sub,
  AppServices,
  KeyEvent,
  MouseEvent
} from "@/core/types.ts"
import { 
  TerminalService, 
  InputService, 
  RendererService, 
  StorageService 
} from "@/services/index.ts"
import { ApplicationError } from "@/core/errors.ts"

/**
 * System messages that the runtime can inject
 */
export type SystemMsg<Msg> = 
  | { readonly _tag: "WindowResized"; readonly width: number; readonly height: number }
  | { readonly _tag: "KeyPressed"; readonly key: KeyEvent }
  | { readonly _tag: "MouseEvent"; readonly event: MouseEvent }
  | { readonly _tag: "Tick"; readonly time: number }
  | { readonly _tag: "UserMsg"; readonly msg: Msg }
  | { readonly _tag: "Quit" }

/**
 * Runtime configuration options
 */
export interface RuntimeConfig {
  readonly fps?: number // Target frames per second (default: 60)
  readonly debug?: boolean // Enable debug logging
  readonly quitOnEscape?: boolean // Quit when ESC is pressed
  readonly quitOnCtrlC?: boolean // Quit when Ctrl+C is pressed
  readonly enableMouse?: boolean // Enable mouse support
  readonly fullscreen?: boolean // Use alternate screen buffer
}

/**
 * Runtime state
 */
interface RuntimeState<Model, Msg> {
  readonly model: Model
  readonly running: boolean
  readonly lastRenderTime: number
  readonly frameCount: number
}

/**
 * The main application runtime
 */
export class Runtime<Model, Msg> {
  constructor(
    private readonly component: Component<Model, Msg>,
    private readonly config: RuntimeConfig = {}
  ) {}

  /**
   * Run the application
   */
  readonly run = () => {
    const self = this
    return Effect.gen(function* (_) {
    
    // Get services from the context
    const terminal = yield* _(TerminalService)
    const input = yield* _(InputService)  
    const renderer = yield* _(RendererService)
    
    // Setup terminal
    yield* _(terminal.setRawMode(true))
    if (self.config.fullscreen ?? true) {
      yield* _(terminal.setAlternateScreen(true))
    }
    yield* _(terminal.hideCursor)
    yield* _(terminal.clear)
    
    // Initialize component
    const [initialModel, initialCmds] = yield* _(self.component.init)
    
    // Create message queue
    const msgQueue = yield* _(Queue.unbounded<SystemMsg<Msg>>())
    
    // Create runtime state
    const state = yield* _(Ref.make<RuntimeState<Model, Msg>>({
      model: initialModel,
      running: true,
      lastRenderTime: Date.now(),
      frameCount: 0
    }))
    
    // Process initial commands
    yield* _(processCmds(initialCmds, msgQueue))
    
    // Start input handling fiber
    const inputFiber = yield* _(
      handleInput(input, msgQueue, self.config).pipe(
        Effect.fork,
        Effect.interruptible
      )
    )
    
    // Start subscription handling fiber
    const subFiber = yield* _(
      handleSubscriptions(self.component, state, msgQueue).pipe(
        Effect.fork,
        Effect.interruptible
      )
    )
    
    // Start render loop fiber
    const renderFiber = yield* _(
      renderLoop(self.component, renderer, state, self.config).pipe(
        Effect.fork,
        Effect.interruptible
      )
    )
    
    // Main update loop
    yield* _(
      Stream.fromQueue(msgQueue).pipe(
        Stream.takeWhile(msg => msg._tag !== "Quit"),
        Stream.runForEach(msg =>
          processMessage(self.component, state, msgQueue, msg)
        )
      )
    )
    
    // Cleanup
    yield* _(Fiber.interruptAll([inputFiber, subFiber, renderFiber]))
    yield* _(cleanup(terminal, self.config))
  }).pipe(
    Effect.scoped,
    Effect.catchAllDefect(defect =>
      Effect.gen(function* (_) {
        // Emergency cleanup on crash
        const terminal = yield* _(TerminalService)
        yield* _(cleanup(terminal, self.config))
        yield* _(Effect.die(defect))
      })
    )
  )
  }
}

/**
 * Process a single message through the update cycle
 */
const processMessage = <Model, Msg>(
  component: Component<Model, Msg>,
  state: Ref.Ref<RuntimeState<Model, Msg>>,
  msgQueue: Queue.Queue<SystemMsg<Msg>>,
  sysMsg: SystemMsg<Msg>
) =>
  Effect.gen(function* (_) {
    const currentState = yield* _(Ref.get(state))
    
    // Handle system messages
    let msg: Msg
    switch (sysMsg._tag) {
      case "UserMsg":
        msg = sysMsg.msg
        break
      case "WindowResized":
        // If component handles resize, convert to user message
        // Otherwise ignore
        return
      case "KeyPressed":
      case "MouseEvent":
      case "Tick":
        // These would be converted to user messages if component handles them
        return
      case "Quit":
        yield* _(Ref.update(state, s => ({ ...s, running: false })))
        return
    }
    
    // Run update
    const [newModel, cmds] = yield* _(
      component.update(msg, currentState.model)
    )
    
    // Update state
    yield* _(Ref.update(state, s => ({ ...s, model: newModel })))
    
    // Process commands
    yield* _(processCmds(cmds, msgQueue))
  })

/**
 * Process commands by converting them to messages
 */
const processCmds = <Msg>(
  cmds: ReadonlyArray<Cmd<Msg>>,
  msgQueue: Queue.Queue<SystemMsg<Msg>>
) =>
  Effect.forEach(cmds, cmd =>
    cmd.pipe(
      Effect.map(msg => ({ _tag: "UserMsg" as const, msg })),
      Effect.flatMap(sysMsg => Queue.offer(msgQueue, sysMsg)),
      Effect.catchAll(() => Effect.void) // Ignore failed commands
    )
  )

/**
 * Handle input events
 */
const handleInput = <Msg>(
  input: InputService,
  msgQueue: Queue.Queue<SystemMsg<Msg>>,
  config: RuntimeConfig
) =>
  Effect.gen(function* (_) {
    const keyStream = yield* _(input.keyEvents)
    
    yield* _(
      keyStream.pipe(
        Stream.runForEach(key => {
          // Check for quit keys
          if (config.quitOnEscape && key.name === "escape") {
            return Queue.offer(msgQueue, { _tag: "Quit" })
          }
          if (config.quitOnCtrlC && key.ctrl && key.name === "c") {
            return Queue.offer(msgQueue, { _tag: "Quit" })
          }
          
          // Otherwise send as key event
          return Queue.offer(msgQueue, { _tag: "KeyPressed", key })
        })
      )
    )
  })

/**
 * Handle subscriptions
 */
const handleSubscriptions = <Model, Msg>(
  component: Component<Model, Msg>,
  state: Ref.Ref<RuntimeState<Model, Msg>>,
  msgQueue: Queue.Queue<SystemMsg<Msg>>
) =>
  Effect.gen(function* (_) {
    if (!component.subscriptions) return
    
    let currentSub: Stream.Stream<Msg, never, any> | null = null
    let currentFiber: Fiber.Fiber<void, never> | null = null
    
    // Watch for model changes and restart subscription
    yield* _(
      Effect.repeat(
        Effect.gen(function* (_) {
          const currentState = yield* _(Ref.get(state))
          if (!currentState.running) return
          
          // Cancel previous subscription if exists
          if (currentFiber) {
            yield* _(Fiber.interrupt(currentFiber))
          }
          
          // Start new subscription with current model
          const sub = yield* _(component.subscriptions!(currentState.model))
          
          // Fork the subscription processing
          currentFiber = yield* _(
            sub.pipe(
              Stream.runForEach(msg => 
                Queue.offer(msgQueue, { _tag: "UserMsg" as const, msg })
              ),
              Effect.fork
            )
          )
          
          // Wait a bit before checking again
          yield* _(Effect.sleep(100))
        }),
        Schedule.forever
      )
    )
  })

/**
 * Render loop
 */
const renderLoop = <Model, Msg>(
  component: Component<Model, Msg>,
  renderer: RendererService,
  state: Ref.Ref<RuntimeState<Model, Msg>>,
  config: RuntimeConfig
) =>
  Effect.gen(function* (_) {
    const targetFrameTime = 1000 / (config.fps || 60)
    
    yield* _(
      Effect.repeat(
        Effect.gen(function* (_) {
          const currentState = yield* _(Ref.get(state))
          if (!currentState.running) return
          
          const startTime = Date.now()
          
          // Get view from component
          const view = component.view(currentState.model)
          
          // Render the view
          yield* _(renderer.beginFrame)
          yield* _(renderer.render(view))
          yield* _(renderer.endFrame)
          
          // Update frame stats
          const endTime = Date.now()
          const frameTime = endTime - startTime
          
          yield* _(Ref.update(state, s => ({
            ...s,
            lastRenderTime: endTime,
            frameCount: s.frameCount + 1
          })))
          
          // Log if frame took too long
          if (config.debug && frameTime > targetFrameTime) {
            yield* _(Effect.logWarning(`Slow frame: ${frameTime}ms`))
          }
        }),
        Schedule.fixed(`${Math.floor(targetFrameTime)} millis`)
      )
    )
  })

/**
 * Cleanup terminal state
 */
const cleanup = (terminal: TerminalService, config: RuntimeConfig) =>
  Effect.gen(function* (_) {
    yield* _(terminal.showCursor)
    yield* _(terminal.setRawMode(false))
    if (config.fullscreen ?? true) {
      yield* _(terminal.setAlternateScreen(false))
    }
    yield* _(terminal.clear)
  })

/**
 * Create and run an application
 */
export const runApp = <Model, Msg>(
  component: Component<Model, Msg>,
  config?: RuntimeConfig
) => {
  const runtime = new Runtime(component, config)
  return runtime.run()
}