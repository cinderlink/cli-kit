/**
 * Runtime Core
 * 
 * The main runtime class implementation
 */

import { Effect, Queue, Fiber, Ref, FiberRef, Layer, Context, Exit, Cause, Duration } from "effect"
import type { Component, View, Update, UpdateResult, Command, Subscription } from "../../../types"
import { 
  TerminalService, 
  InputService, 
  RendererService, 
  StorageService 
} from "../../../services"
import { KeyUtils } from "../../../terminal/input/keys"
import type { RuntimeConfig, RuntimeState, SystemMsg, RuntimeMetrics } from "./types"
import { RuntimeError } from "./types"
import { FrameScheduler, TimerManager, CommandScheduler } from "./scheduler"
import { SubscriptionManager } from "./subscriptions"

/**
 * The main runtime class that orchestrates the MVU loop
 */
export class Runtime<Model, Msg> {
  private readonly config: Required<RuntimeConfig>
  private readonly state: Ref.Ref<RuntimeState<Model>>
  private readonly messageQueue: Queue.Queue<SystemMsg<Msg>>
  private readonly frameScheduler: FrameScheduler<Msg>
  private readonly timerManager: TimerManager<Msg>
  private readonly commandScheduler: CommandScheduler<Msg>
  private readonly subscriptionManager: SubscriptionManager<Model, Msg>
  
  // Fibers for concurrent operations
  private inputFiber?: Fiber.RuntimeFiber<void>
  private updateFiber?: Fiber.RuntimeFiber<void>
  private renderFiber?: Fiber.RuntimeFiber<void>

  constructor(
    config: RuntimeConfig,
    state: Ref.Ref<RuntimeState<Model>>,
    messageQueue: Queue.Queue<SystemMsg<Msg>>
  ) {
    // Apply defaults to config
    this.config = {
      fps: config.fps ?? 60,
      enableMouse: config.enableMouse ?? false,
      fullscreen: config.fullscreen ?? true,
      debug: config.debug ?? false,
      messageBufferSize: config.messageBufferSize ?? 1000,
      updateTimeout: config.updateTimeout ?? Duration.seconds(5),
      commandTimeout: config.commandTimeout ?? Duration.seconds(30),
      maxConcurrentCommands: config.maxConcurrentCommands ?? 10,
      performanceMonitoring: config.performanceMonitoring ?? false,
      onError: config.onError,
      onQuit: config.onQuit,
      context: config.context
    }

    this.state = state
    this.messageQueue = messageQueue
    this.frameScheduler = new FrameScheduler(this.config.fps)
    this.timerManager = new TimerManager(messageQueue)
    this.commandScheduler = new CommandScheduler(
      messageQueue,
      this.config.maxConcurrentCommands
    )
    this.subscriptionManager = new SubscriptionManager(messageQueue)
  }

  /**
   * Run a component
   */
  run<E>(component: Component<Model, Msg, E>): Effect<void, E | RuntimeError> {
    return Effect.gen(function* (_) {
      console.log('MVU Runtime: Attempting to get services...')
      const terminal = yield* _(TerminalService)
      console.log('MVU Runtime: Got terminal service:', typeof terminal, Object.keys(terminal || {}))
      const input = yield* _(InputService)
      const renderer = yield* _(RendererService)

      try {
        // Initialize terminal
        if (this.config.fullscreen) {
          yield* _(terminal.setAlternateScreen(true))
        }
        yield* _(terminal.hideCursor)
        yield* _(terminal.clear)

        if (this.config.enableMouse) {
          yield* _(input.enableMouse)
        }

        // Initialize component
        const [initialModel, initialCommands] = yield* _(component.init)
        
        yield* _(Ref.update(this.state, state => ({
          ...state,
          model: initialModel,
          isRunning: true
        })))

        // Execute initial commands
        yield* _(this.executeCommands(initialCommands))

        // Start concurrent fibers
        yield* _(this.startFibers(component))

        // Wait for quit signal
        yield* _(this.waitForQuit())

      } finally {
        // Cleanup
        yield* _(this.cleanup(terminal))
      }
    }.bind(this))
  }

  /**
   * Start the concurrent fibers for input, update, and render
   */
  private startFibers<E>(
    component: Component<Model, Msg, E>
  ): Effect<void, E | RuntimeError> {
    return Effect.gen(function* (_) {
      // Start input fiber
      this.inputFiber = yield* _(this.createInputFiber().pipe(Effect.fork))

      // Start update fiber
      this.updateFiber = yield* _(
        this.createUpdateFiber(component.update).pipe(Effect.fork)
      )

      // Start render fiber
      this.renderFiber = yield* _(
        this.createRenderFiber(component.view).pipe(Effect.fork)
      )

      // Start subscriptions
      if (component.subscriptions) {
        yield* _(this.subscriptionManager.start(
          component.subscriptions,
          () => Effect.map(Ref.get(this.state), s => s.model)
        ))
      }
    }.bind(this))
  }

  /**
   * Create the input processing fiber
   */
  private createInputFiber(): Effect<void, RuntimeError> {
    return Effect.gen(function* (_) {
      const input = yield* _(InputService)

      yield* _(
        input.subscribe((event) =>
          Effect.gen(function* (_) {
            switch (event._tag) {
              case "KeyPress":
                yield* _(Queue.offer(this.messageQueue, {
                  _tag: "KeyPress",
                  key: event.key
                }))
                break
              
              case "MouseMove":
                if (this.config.enableMouse) {
                  yield* _(Queue.offer(this.messageQueue, {
                    _tag: "MouseMove",
                    x: event.x,
                    y: event.y
                  }))
                }
                break
              
              case "MouseClick":
                if (this.config.enableMouse) {
                  yield* _(Queue.offer(this.messageQueue, {
                    _tag: "MouseClick",
                    x: event.x,
                    y: event.y,
                    button: event.button
                  }))
                }
                break
              
              case "Resize":
                yield* _(Queue.offer(this.messageQueue, {
                  _tag: "WindowResize",
                  width: event.width,
                  height: event.height
                }))
                break
            }
          }.bind(this))
        )
      )
    }.bind(this)).pipe(
      Effect.catchAll(error =>
        Effect.fail(new RuntimeError("Input fiber failed", "input", error))
      )
    )
  }

  /**
   * Create the update processing fiber
   */
  private createUpdateFiber(
    update: Update<Model, Msg>
  ): Effect<void, RuntimeError> {
    return Effect.gen(function* (_) {
      while (true) {
        const msg = yield* _(Queue.take(this.messageQueue))
        
        try {
          yield* _(this.processMessage(msg, update))
        } catch (error) {
          if (this.config.onError) {
            yield* _(this.config.onError(error))
          } else {
            yield* _(Effect.logError("Update error", error))
          }
        }

        const state = yield* _(Ref.get(this.state))
        if (!state.isRunning) break
      }
    }.bind(this)).pipe(
      Effect.catchAll(error =>
        Effect.fail(new RuntimeError("Update fiber failed", "update", error))
      )
    )
  }

  /**
   * Create the render fiber
   */
  private createRenderFiber(
    view: (model: Model) => View
  ): Effect<void, RuntimeError> {
    return Effect.gen(function* (_) {
      const renderer = yield* _(RendererService)
      const terminal = yield* _(TerminalService)

      while (true) {
        const startTime = Date.now()
        
        const state = yield* _(Ref.get(this.state))
        if (!state.isRunning) break

        try {
          // Generate view
          const viewResult = view(state.model)
          
          // Render to terminal
          yield* _(terminal.clear)
          const rendered = yield* _(viewResult.render())
          yield* _(terminal.write(rendered))
          
          // Track metrics
          const renderTime = Date.now() - startTime
          yield* _(Ref.update(this.state, s => ({
            ...s,
            frameCount: s.frameCount + 1,
            lastRenderTime: renderTime
          })))

          if (this.config.performanceMonitoring) {
            yield* _(Queue.offer(this.messageQueue, {
              _tag: "RenderComplete",
              duration: renderTime
            }))
          }
        } catch (error) {
          yield* _(Effect.logError("Render error", error))
          
          // Stop the app if we get too many render errors
          const errorState = yield* _(Ref.get(this.state))
          if (errorState.frameCount > 100) {
            console.error("[MVU Runtime] Too many render errors - stopping app to prevent infinite loop")
            yield* _(Ref.update(this.state, s => ({ ...s, isRunning: false })))
            break
          }
        }

        // Wait for next frame
        yield* _(this.frameScheduler.waitForNextFrame())
      }
    }.bind(this)).pipe(
      Effect.catchAll(error =>
        Effect.fail(new RuntimeError("Render fiber failed", "render", error))
      )
    )
  }

  /**
   * Process a system message
   */
  private processMessage(
    msg: SystemMsg<Msg>,
    update: Update<Model, Msg>
  ): Effect<void> {
    return Effect.gen(function* (_) {
      const state = yield* _(Ref.get(this.state))

      switch (msg._tag) {
        case "UserMsg": {
          const startTime = Date.now()
          const [newModel, commands] = yield* _(
            update(msg.msg, state.model)
          )
          
          yield* _(Ref.update(this.state, s => ({
            ...s,
            model: newModel
          })))

          yield* _(this.executeCommands(commands))

          if (this.config.performanceMonitoring) {
            yield* _(Queue.offer(this.messageQueue, {
              _tag: "UpdateComplete",
              duration: Date.now() - startTime
            }))
          }
          break
        }

        case "KeyPress": {
          // Check for quit key
          if (KeyUtils.isQuit(msg.key)) {
            yield* _(Queue.offer(this.messageQueue, { _tag: "Quit" }))
          }
          break
        }

        case "Quit": {
          yield* _(Ref.update(this.state, s => ({
            ...s,
            isRunning: false
          })))
          break
        }

        case "Batch": {
          for (const userMsg of msg.msgs) {
            yield* _(Queue.offer(this.messageQueue, {
              _tag: "UserMsg",
              msg: userMsg
            }))
          }
          break
        }

        default:
          // Other system messages can be handled by extensions
          break
      }
    }.bind(this))
  }

  /**
   * Execute commands
   */
  private executeCommands(
    commands: ReadonlyArray<Command<Msg>>
  ): Effect<void> {
    return Effect.gen(function* (_) {
      for (const command of commands) {
        yield* _(this.commandScheduler.execute(
          command.execute,
          command.onComplete,
          command.onError
        ))
      }
    }.bind(this))
  }

  /**
   * Wait for quit signal
   */
  private waitForQuit(): Effect<void> {
    return Effect.gen(function* (_) {
      while (true) {
        const state = yield* _(Ref.get(this.state))
        if (!state.isRunning) break
        yield* _(Effect.sleep(Duration.millis(100)))
      }
    }.bind(this))
  }

  /**
   * Cleanup resources
   */
  private cleanup(terminal?: TerminalService): Effect<void> {
    return Effect.gen(function* (_) {
      // Stop all fibers
      const fibers = [
        this.inputFiber,
        this.updateFiber,
        this.renderFiber
      ].filter(Boolean) as Fiber.RuntimeFiber<void>[]

      yield* _(Effect.all(fibers.map(f => Fiber.interrupt(f))))

      // Stop subscriptions
      yield* _(this.subscriptionManager.stop())

      // Cancel timers and commands
      yield* _(this.timerManager.cancelAll())
      yield* _(this.commandScheduler.cancelAll())

      // Reset terminal - try to get it from service if not provided
      try {
        const terminalService = terminal || (yield* _(TerminalService))
        const input = yield* _(InputService)
        if (terminalService) {
          yield* _(terminalService.showCursor)
          if (this.config.enableMouse) {
            yield* _(input.disableMouse)
          }
          if (this.config.fullscreen) {
            yield* _(terminalService.setAlternateScreen(false))
          }
        }
      } catch {
        // Ignore terminal cleanup errors - the terminal service might not be available in this context
      }

      // Run custom quit handler
      if (this.config.onQuit) {
        yield* _(this.config.onQuit())
      }
    }.bind(this))
  }

  /**
   * Get runtime metrics
   */
  getMetrics(): Effect<RuntimeMetrics> {
    return Effect.gen(function* (_) {
      const state = yield* _(Ref.get(this.state))
      const messagesQueued = yield* _(Queue.size(this.messageQueue))

      return {
        frameRate: state.frameCount > 0 
          ? 1000 / (state.lastRenderTime || 1) 
          : 0,
        updateDuration: 0, // Would need to track this
        renderDuration: state.lastRenderTime,
        commandsQueued: 0, // Would need to track this
        commandsActive: this.commandScheduler.getActiveCount(),
        messagesQueued,
        memoryUsage: process.memoryUsage().heapUsed
      }
    }.bind(this))
  }
}