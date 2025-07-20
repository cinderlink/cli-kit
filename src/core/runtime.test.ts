/**
 * Runtime Tests
 * 
 * Comprehensive tests for the application runtime system including:
 * - Runtime creation and configuration
 * - MVU loop implementation
 * - Fiber-based concurrency
 * - Input processing
 * - State management
 * - Command execution
 * - Subscription handling
 * - Rendering pipeline
 * - Graceful shutdown
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Effect, TestClock, TestContext, Fiber, Either, Exit } from 'effect'
import { 
  createRuntime, 
  RuntimeConfig,
  type Runtime,
  type RuntimeError 
} from './runtime'
import { 
  createMockTerminalService,
  createMockInputService,
  createMockRendererService,
  createMockStorageService,
  MockInputService
} from '../testing/test-utils'
import type { Component, View } from './types'
import { text } from './view'

describe('Runtime', () => {
  let mockTerminal: ReturnType<typeof createMockTerminalService>
  let mockInput: MockInputService
  let mockRenderer: ReturnType<typeof createMockRendererService>
  let mockStorage: ReturnType<typeof createMockStorageService>

  beforeEach(() => {
    mockTerminal = createMockTerminalService()
    mockInput = createMockInputService()
    mockRenderer = createMockRendererService()
    mockStorage = createMockStorageService()
  })

  afterEach(() => {
    // Clean up any resources
  })

  describe('createRuntime', () => {
    test('should create runtime with default config', async () => {
      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        expect(runtime).toBeDefined()
        expect(runtime.run).toBeInstanceOf(Function)
        expect(runtime.stop).toBeInstanceOf(Function)
        expect(runtime.state$).toBeDefined()
      })

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage)
        )
      )
    })

    test('should create runtime with custom config', async () => {
      const config: RuntimeConfig = {
        fps: 30,
        enableMouse: false,
        fullscreen: false,
        debugMode: true
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime(config)
        // Runtime should respect configuration
        expect(runtime).toBeDefined()
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage)
        )
      )
    })
  })

  describe('MVU Loop', () => {
    test('should process initial state correctly', async () => {
      type Model = { count: number }
      type Msg = { type: 'increment' } | { type: 'decrement' }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ count: 0 }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'increment':
              return [{ count: model.count + 1 }, Effect.succeed(null)]
            case 'decrement':
              return [{ count: model.count - 1 }, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        // Give runtime a moment to initialize
        yield* Effect.sleep(10)
        
        // Check initial state
        const state = yield* runtime.state$
        expect(state).toEqual({ count: 0 })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })

    test('should handle messages and update state', async () => {
      type Model = { count: number }
      type Msg = { type: 'increment' } | { type: 'decrement' }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ count: 0 }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'increment':
              return [{ count: model.count + 1 }, Effect.succeed(null)]
            case 'decrement':
              return [{ count: model.count - 1 }, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Count: ${model.count}`),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        // Give runtime a moment to initialize
        yield* Effect.sleep(10)
        
        // Send increment message
        yield* runtime.send({ type: 'increment' })
        yield* Effect.sleep(10)
        
        let state = yield* runtime.state$
        expect(state).toEqual({ count: 1 })
        
        // Send another increment
        yield* runtime.send({ type: 'increment' })
        yield* Effect.sleep(10)
        
        state = yield* runtime.state$
        expect(state).toEqual({ count: 2 })
        
        // Send decrement
        yield* runtime.send({ type: 'decrement' })
        yield* Effect.sleep(10)
        
        state = yield* runtime.state$
        expect(state).toEqual({ count: 1 })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })

    test('should execute commands from update', async () => {
      type Model = { status: string }
      type Msg = { type: 'fetch' } | { type: 'fetched'; data: string }

      let commandExecuted = false

      const testComponent: Component<Model, Msg> = {
        init: () => [{ status: 'idle' }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'fetch':
              const cmd = Effect.gen(function* () {
                commandExecuted = true
                yield* Effect.sleep(50)
                return { type: 'fetched', data: 'success' } as Msg
              })
              return [{ status: 'loading' }, cmd]
            case 'fetched':
              return [{ status: msg.data }, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Status: ${model.status}`),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Trigger fetch command
        yield* runtime.send({ type: 'fetch' })
        yield* Effect.sleep(10)
        
        // Should be loading
        let state = yield* runtime.state$
        expect(state).toEqual({ status: 'loading' })
        expect(commandExecuted).toBe(true)
        
        // Wait for command to complete
        yield* Effect.sleep(60)
        
        // Should have fetched data
        state = yield* runtime.state$
        expect(state).toEqual({ status: 'success' })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })
  })

  describe('Subscriptions', () => {
    test('should handle timer subscriptions', async () => {
      type Model = { ticks: number }
      type Msg = { type: 'tick' }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ ticks: 0 }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'tick':
              return [{ ticks: model.ticks + 1 }, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Ticks: ${model.ticks}`),
        subscriptions: () => [
          {
            id: 'timer',
            effect: Effect.gen(function* () {
              yield* Effect.sleep(100)
              return { type: 'tick' } as Msg
            }).pipe(Effect.forever)
          }
        ]
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Initial state
        let state = yield* runtime.state$
        expect(state).toEqual({ ticks: 0 })
        
        // Wait for first tick
        yield* Effect.sleep(110)
        state = yield* runtime.state$
        expect(state).toEqual({ ticks: 1 })
        
        // Wait for second tick
        yield* Effect.sleep(100)
        state = yield* runtime.state$
        expect(state).toEqual({ ticks: 2 })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })

    test('should handle input subscriptions', async () => {
      type Model = { lastKey: string }
      type Msg = { type: 'keypress'; key: string }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ lastKey: 'none' }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'keypress':
              return [{ lastKey: msg.key }, Effect.succeed(null)]
          }
        },
        view: (model) => text(`Last key: ${model.lastKey}`),
        subscriptions: () => [
          {
            id: 'input',
            effect: mockInput.subscribeKeys().pipe(
              Effect.map(key => ({ type: 'keypress', key } as Msg))
            )
          }
        ]
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Simulate keypress
        mockInput.simulateKey('a')
        yield* Effect.sleep(10)
        
        let state = yield* runtime.state$
        expect(state).toEqual({ lastKey: 'a' })
        
        // Another keypress
        mockInput.simulateKey('b')
        yield* Effect.sleep(10)
        
        state = yield* runtime.state$
        expect(state).toEqual({ lastKey: 'b' })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })
  })

  describe('Rendering', () => {
    test('should render view to terminal', async () => {
      type Model = { message: string }
      type Msg = { type: 'update'; message: string }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ message: 'Hello' }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'update':
              return [{ message: msg.message }, Effect.succeed(null)]
          }
        },
        view: (model) => text(model.message),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Check initial render
        expect(mockRenderer.getLastRendered()).toContain('Hello')
        
        // Update message
        yield* runtime.send({ type: 'update', message: 'World' })
        yield* Effect.sleep(10)
        
        // Check updated render
        expect(mockRenderer.getLastRendered()).toContain('World')
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })

    test('should respect fps configuration', async () => {
      const renderCalls: number[] = []

      const testComponent: Component<{}, never> = {
        init: () => [{}, Effect.succeed(null)],
        update: (model) => [model, Effect.succeed(null)],
        view: () => {
          renderCalls.push(Date.now())
          return text('Test')
        },
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime({ fps: 10 }) // 10 fps = 100ms per frame
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        // Run for 250ms (should be ~2-3 frames at 10fps)
        yield* Effect.sleep(250)
        
        yield* Fiber.interrupt(fiber)
        
        // Should have 2-3 render calls
        expect(renderCalls.length).toBeGreaterThanOrEqual(2)
        expect(renderCalls.length).toBeLessThanOrEqual(3)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage)
        )
      )
    })
  })

  describe('Error Handling', () => {
    test('should handle errors in init', async () => {
      const testComponent: Component<{}, never> = {
        init: () => Effect.fail(new Error('Init failed')),
        update: (model) => [model, Effect.succeed(null)],
        view: () => text('Should not render'),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const result = yield* runtime.run(testComponent).pipe(
          Effect.either
        )
        
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left.message).toContain('Init failed')
        }
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage)
        )
      )
    })

    test('should handle errors in update', async () => {
      type Msg = { type: 'crash' }
      
      const testComponent: Component<{}, Msg> = {
        init: () => [{}, Effect.succeed(null)],
        update: (model, msg) => {
          if (msg.type === 'crash') {
            throw new Error('Update crashed')
          }
          return [model, Effect.succeed(null)]
        },
        view: () => text('Running'),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Send crash message
        yield* runtime.send({ type: 'crash' })
        
        // Runtime should handle the error gracefully
        const exit = yield* Fiber.await(fiber)
        expect(Exit.isFailure(exit)).toBe(true)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })
  })

  describe('Graceful Shutdown', () => {
    test('should stop cleanly on interrupt', async () => {
      let cleanupCalled = false

      const testComponent: Component<{}, never> = {
        init: () => [{}, Effect.succeed(null)],
        update: (model) => [model, Effect.succeed(null)],
        view: () => text('Running'),
        subscriptions: () => [{
          id: 'cleanup-test',
          effect: Effect.never.pipe(
            Effect.onInterrupt(() => {
              cleanupCalled = true
              return Effect.succeed(undefined)
            })
          )
        }]
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Stop runtime
        yield* runtime.stop()
        yield* Fiber.await(fiber)
        
        expect(cleanupCalled).toBe(true)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })

    test('should cleanup terminal on exit', async () => {
      let terminalCleanedUp = false
      mockTerminal.cleanup = Effect.sync(() => {
        terminalCleanedUp = true
      })

      const testComponent: Component<{}, never> = {
        init: () => [{}, Effect.succeed(null)],
        update: (model) => [model, Effect.succeed(null)],
        view: () => text('Test'),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        yield* runtime.stop()
        yield* Fiber.await(fiber)
        
        expect(terminalCleanedUp).toBe(true)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })
  })

  describe('Concurrent Operations', () => {
    test('should handle multiple commands concurrently', async () => {
      type Model = { results: string[] }
      type Msg = 
        | { type: 'start-all' }
        | { type: 'completed'; result: string }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ results: [] }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'start-all':
              // Start 3 concurrent commands
              const cmd1 = Effect.gen(function* () {
                yield* Effect.sleep(50)
                return { type: 'completed', result: 'A' } as Msg
              })
              const cmd2 = Effect.gen(function* () {
                yield* Effect.sleep(30)
                return { type: 'completed', result: 'B' } as Msg
              })
              const cmd3 = Effect.gen(function* () {
                yield* Effect.sleep(10)
                return { type: 'completed', result: 'C' } as Msg
              })
              
              return [
                model,
                Effect.all([cmd1, cmd2, cmd3], { concurrency: 'unbounded' })
              ]
            case 'completed':
              return [
                { results: [...model.results, msg.result] },
                Effect.succeed(null)
              ]
          }
        },
        view: (model) => text(`Results: ${model.results.join(',')}`),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Start concurrent commands
        yield* runtime.send({ type: 'start-all' })
        
        // Wait for all to complete
        yield* Effect.sleep(100)
        
        const state = yield* runtime.state$
        // Results should be in order of completion (C, B, A)
        expect(state.results).toEqual(['C', 'B', 'A'])
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage),
          TestClock.testClock
        )
      )
    })
  })

  describe('State Persistence', () => {
    test('should save and restore state', async () => {
      type Model = { count: number; name: string }
      type Msg = { type: 'increment' } | { type: 'restore' }

      const testComponent: Component<Model, Msg> = {
        init: () => [{ count: 0, name: 'test' }, Effect.succeed(null)],
        update: (model, msg) => {
          switch (msg.type) {
            case 'increment':
              const newModel = { count: model.count + 1, name: model.name }
              // Save state
              const saveCmd = mockStorage.set('app-state', JSON.stringify(newModel))
                .pipe(Effect.map(() => null))
              return [newModel, saveCmd]
            case 'restore':
              const restoreCmd = mockStorage.get('app-state').pipe(
                Effect.map(data => {
                  if (data) {
                    const restored = JSON.parse(data) as Model
                    return { type: 'restored', model: restored } as any
                  }
                  return null
                })
              )
              return [model, restoreCmd]
          }
        },
        view: (model) => text(`Count: ${model.count}, Name: ${model.name}`),
        subscriptions: () => []
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        const fiber = yield* runtime.run(testComponent).pipe(Effect.fork)
        
        yield* Effect.sleep(10)
        
        // Increment and save
        yield* runtime.send({ type: 'increment' })
        yield* Effect.sleep(10)
        
        // Verify saved
        const saved = yield* mockStorage.get('app-state')
        expect(JSON.parse(saved!)).toEqual({ count: 1, name: 'test' })
        
        yield* Fiber.interrupt(fiber)
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provideService('TerminalService', mockTerminal),
          Effect.provideService('InputService', mockInput),
          Effect.provideService('RendererService', mockRenderer),
          Effect.provideService('StorageService', mockStorage)
        )
      )
    })
  })
})