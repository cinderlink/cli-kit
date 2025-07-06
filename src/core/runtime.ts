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
  StorageService,
  MouseRouterService 
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
  ) {
    // Apply sensible defaults
    this.config = {
      fps: 60,
      debug: false,
      quitOnEscape: false,
      quitOnCtrlC: true,  // Default to true for safety
      enableMouse: false,
      fullscreen: true,
      ...config  // User config overrides defaults
    }
  }

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
    
    // Enable mouse if configured
    if (self.config.enableMouse) {
      yield* _(input.enableMouse)
    }
    
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
    
    // Setup signal handlers for graceful shutdown
    const signalHandlers = yield* _(setupSignalHandlers(msgQueue, terminal, self.config))
    
    // Start automatic quit key handling if enabled
    const quitFiber = (self.config.quitOnCtrlC || self.config.quitOnEscape) ? 
      yield* _(
        handleAutomaticQuitKeys(input, msgQueue, self.config).pipe(
          Effect.fork,
          Effect.interruptible
        )
      ) : null
    
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
          processMessage(self.component, state, msgQueue, msg, self.config)
        )
      )
    )
    
    // Cleanup
    yield* _(signalHandlers.cleanup)
    const fibersToInterrupt = quitFiber ? [quitFiber, subFiber, renderFiber] : [subFiber, renderFiber]
    yield* _(Fiber.interruptAll(fibersToInterrupt))
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
    ),
    Effect.catchAll(error =>
      Effect.gen(function* (_) {
        // Emergency cleanup on any error
        const terminal = yield* _(TerminalService)
        yield* _(cleanup(terminal, self.config))
        yield* _(Effect.fail(error))
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
  sysMsg: SystemMsg<Msg>,
  config: RuntimeConfig
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
        // Key events would be routed to focused component
        // For now, they're not processed at the system level
        return
        
      case "MouseEvent":
        // Route mouse event to component
        const mouseRouter = yield* _(MouseRouterService)
        const routingResult = yield* _(mouseRouter.routeMouseEvent(sysMsg.event))
        
        if (config.debug) {
          if (routingResult) {
            console.log(`Mouse routed to ${routingResult.componentId}: ${sysMsg.event.type} ${sysMsg.event.button} at (${sysMsg.event.x}, ${sysMsg.event.y})`)
          } else {
            console.log(`Mouse not routed: ${sysMsg.event.type} ${sysMsg.event.button} at (${sysMsg.event.x}, ${sysMsg.event.y})`)
          }
        }
        
        if (routingResult) {
          // Convert to user message and process
          yield* _(Queue.offer(msgQueue, { _tag: "UserMsg", msg: routingResult.message }))
        }
        return
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
      Effect.flatMap(msg => {
        // Check if this is a quit command
        if (typeof msg === 'object' && msg !== null && '_tag' in msg && msg._tag === 'Quit') {
          // Send system quit message
          return Queue.offer(msgQueue, { _tag: "Quit" })
        } else {
          // Regular user message
          return Queue.offer(msgQueue, { _tag: "UserMsg" as const, msg })
        }
      }),
      Effect.catchAll(() => Effect.void) // Ignore failed commands
    )
  )

/**
 * Setup signal handlers for graceful shutdown
 */
const setupSignalHandlers = <Msg>(
  msgQueue: Queue.Queue<SystemMsg<Msg>>,
  terminal: TerminalService,
  config: RuntimeConfig
) =>
  Effect.gen(function* (_) {
    let isShuttingDown = false
    
    const handleShutdown = () => {
      if (isShuttingDown) return
      isShuttingDown = true
      
      // Send quit message to gracefully exit
      Effect.runSync(Queue.offer(msgQueue, { _tag: "Quit" }))
    }
    
    const emergencyCleanup = () => {
      if (isShuttingDown) return
      isShuttingDown = true
      
      // Emergency cleanup - bypass the normal shutdown process
      // Ensure terminal is restored even in raw mode
      try {
        // Try to restore terminal state synchronously
        if (process.stdin.isTTY && 'setRawMode' in process.stdin) {
          process.stdin.setRawMode(false)
        }
        process.stdout.write('\x1b[?25h')  // Show cursor
        process.stdout.write('\x1b[?1049l') // Exit alternate screen
        process.stdout.write('\x1b[2J')     // Clear screen
        process.stdout.write('\x1b[H')      // Move to home
      } catch (e) {
        // Ignore errors during emergency cleanup
      }
      
      Effect.runSync(cleanup(terminal, config).pipe(
        Effect.catchAll(() => Effect.void)
      ))
      process.exit(0)
    }
    
    // Handle SIGINT (Ctrl+C) - Note: may not fire in raw mode
    process.on('SIGINT', handleShutdown)
    
    // Handle SIGTERM (termination request)
    process.on('SIGTERM', handleShutdown)
    
    // Handle process exit events
    process.on('exit', emergencyCleanup)
    process.on('beforeExit', emergencyCleanup)
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      emergencyCleanup()
    })
    
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason)
      emergencyCleanup()
    })
    
    return {
      cleanup: Effect.sync(() => {
        process.removeListener('SIGINT', handleShutdown)
        process.removeListener('SIGTERM', handleShutdown)
        process.removeListener('exit', emergencyCleanup)
        process.removeListener('beforeExit', emergencyCleanup)
        process.removeListener('uncaughtException', emergencyCleanup)
        process.removeListener('unhandledRejection', emergencyCleanup)
      })
    }
  })


/**
 * Handle automatic quit keys - this runs in parallel with component subscriptions
 * and ensures quit keys always work unless explicitly disabled
 */
const handleAutomaticQuitKeys = <Msg>(
  input: InputService,
  msgQueue: Queue.Queue<SystemMsg<Msg>>,
  config: RuntimeConfig
) =>
  Effect.gen(function* (_) {
    // Create a separate subscription to handle quit keys
    // This doesn't conflict with component subscriptions because PubSub broadcasts to all subscribers
    yield* _(
      input.filterKeys(key => {
        const isQuit = (config.quitOnCtrlC && key.ctrl && key.key === 'ctrl+c') ||
                      (config.quitOnEscape && key.key === 'escape')
        return isQuit
      }).pipe(
        Stream.runForEach(() => Queue.offer(msgQueue, { _tag: "Quit" }))
      )
    )
  })

/**
 * Handle subscriptions - properly manages dynamic subscriptions that depend on model state
 */
const handleSubscriptions = <Model, Msg>(
  component: Component<Model, Msg>,
  state: Ref.Ref<RuntimeState<Model, Msg>>,
  msgQueue: Queue.Queue<SystemMsg<Msg>>
) =>
  Effect.gen(function* (_) {
    if (!component.subscriptions) return
    
    // Track current subscription fiber to restart when model changes
    let currentSubFiber: Fiber.Fiber<never, never> | null = null
    let lastModel: Model | null = null
    
    // Function to start/restart subscriptions
    const startSubscription = (model: Model) =>
      Effect.gen(function* (_) {
        // Interrupt existing subscription if running
        if (currentSubFiber) {
          yield* _(Fiber.interrupt(currentSubFiber))
        }
        
        // Create new subscription with current model
        const sub = yield* _(component.subscriptions!(model))
        
        // Start new subscription fiber
        currentSubFiber = yield* _(
          sub.pipe(
            Stream.takeWhile(() => Effect.gen(function* (_) {
              const currentState = yield* _(Ref.get(state))
              return currentState.running
            })),
            Stream.runForEach(msg => 
              Queue.offer(msgQueue, { _tag: "UserMsg" as const, msg })
            )
          ).pipe(
            Effect.fork
          )
        )
        
        lastModel = model
      })
    
    // Start initial subscription
    const initialState = yield* _(Ref.get(state))
    yield* _(startSubscription(initialState.model))
    
    // Monitor state changes and restart subscriptions when model changes
    yield* _(
      Effect.repeat(
        Effect.gen(function* (_) {
          const currentState = yield* _(Ref.get(state))
          
          if (!currentState.running) {
            // App is shutting down, interrupt subscription and exit
            if (currentSubFiber) {
              yield* _(Fiber.interrupt(currentSubFiber))
            }
            return
          }
          
          // Check if model has changed (using referential equality for performance)
          if (currentState.model !== lastModel) {
            yield* _(startSubscription(currentState.model))
          }
          
          // Small delay to avoid busy waiting
          yield* _(Effect.sleep(16)) // ~60fps model checking
        }),
        Schedule.whileEffect(() => 
          Effect.gen(function* (_) {
            const currentState = yield* _(Ref.get(state))
            return currentState.running
          })
        )
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
    // Disable mouse if it was enabled
    if (config.enableMouse) {
      const input = yield* _(InputService)
      yield* _(input.disableMouse)
    }
    
    // Reset terminal state to normal
    yield* _(terminal.write('\x1b[0m')) // Reset all styling
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