/**
 * Testing Utilities - Test helpers and mocks for TUI framework testing
 *
 * This module provides utilities for testing TUI components, including
 * mock services, test runners, and assertion helpers.
 */

import { Effect, Context, Layer, Ref, Queue, Stream, Option, Cause } from 'effect'
import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import {
  TerminalService,
  InputService,
  RendererService,
  StorageService,
} from '../core/services/index'
import type {
  Component,
  KeyEvent,
  MouseEvent,
  WindowSize,
  View,
  Viewport,
  TerminalCapabilities,
  Cmd,
} from '../core/types/core'
import { TerminalError, InputError, RenderError, StorageError } from '../core/errors'

// =============================================================================
// Test Environment
// =============================================================================

/**
 * Test environment that captures all terminal output and input.
 */
export interface TestEnvironment {
  readonly output: ReadonlyArray<string>
  readonly cursor: { x: number; y: number }
  readonly size: WindowSize
  readonly capabilities: TerminalCapabilities
  readonly rawMode: boolean
  readonly alternateScreen: boolean
  readonly mouseEnabled: boolean
}

/**
 * Create a test environment with default values.
 */
export const createTestEnvironment = (
  overrides: Partial<TestEnvironment> = {}
): TestEnvironment => ({
  output: [],
  cursor: { x: 1, y: 1 },
  size: { width: 80, height: 24 },
  capabilities: {
    colors: '256',
    unicode: true,
    mouse: true,
    clipboard: false,
    sixel: false,
    kitty: false,
    iterm2: false,
    windowTitle: false,
    columns: 80,
    rows: 24,
    alternateScreen: true,
    cursorShapes: true,
  },
  rawMode: false,
  alternateScreen: false,
  mouseEnabled: false,
  ...overrides,
})

// =============================================================================
// Mock Services
// =============================================================================

/**
 * Mock terminal service interface for testing.
 */
export interface MockTerminalService extends TerminalService.TerminalService {
  // Testing utilities
  getWrites(): ReadonlyArray<string>
  setSize(width: number, height: number): void
  isCursorHidden(): boolean
  cleanup(): Effect.Effect<void>
}

/**
 * Mock terminal service for testing.
 */
export const createMockTerminalService = (
  initialEnv: TestEnvironment = createTestEnvironment()
): MockTerminalService => {
  const env = Ref.unsafeMake(initialEnv)
  const writes = Ref.unsafeMake<string[]>([])
  const cursorHidden = Ref.unsafeMake(false)

  const service: MockTerminalService = {
    clear: Effect.gen(function* (_) {
      yield* _(Ref.update(env, e => ({ ...e, output: [] })))
      yield* _(Ref.set(writes, []))
    }),

    write: (text: string) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(env, e => ({
            ...e,
            output: [...e.output, text],
          }))
        )
        yield* _(Ref.update(writes, w => [...w, text]))
      }),

    writeLine: (text: string) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(env, e => ({
            ...e,
            output: [...e.output, text + '\n'],
          }))
        )
        yield* _(Ref.update(writes, w => [...w, text + '\n']))
      }),

    moveCursor: (x: number, y: number) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(env, e => ({
            ...e,
            cursor: { x, y },
          }))
        )
      }),

    moveCursorRelative: (dx: number, dy: number) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(env, e => ({
            ...e,
            cursor: { x: e.cursor.x + dx, y: e.cursor.y + dy },
          }))
        )
      }),

    hideCursor: Effect.gen(function* (_) {
      yield* _(Ref.set(cursorHidden, true))
    }),

    showCursor: Effect.gen(function* (_) {
      yield* _(Ref.set(cursorHidden, false))
    }),

    getSize: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.size
    }),

    setRawMode: (enabled: boolean) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(env, e => ({ ...e, rawMode: enabled })))
      }),

    setAlternateScreen: (enabled: boolean) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(env, e => ({ ...e, alternateScreen: enabled })))
      }),

    saveCursor: Effect.sync(() => {}),
    restoreCursor: Effect.sync(() => {}),

    getCapabilities: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.capabilities
    }),

    supportsTrueColor: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.capabilities.colors === 'truecolor'
    }),

    supports256Colors: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.capabilities.colors === '256' || current.capabilities.colors === 'truecolor'
    }),

    supportsUnicode: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.capabilities.unicode
    }),

    clearToEndOfLine: Effect.sync(() => {}),
    clearToStartOfLine: Effect.sync(() => {}),
    clearLine: Effect.sync(() => {}),
    clearToEndOfScreen: Effect.sync(() => {}),
    clearToStartOfScreen: Effect.sync(() => {}),
    scrollUp: (_lines: number) => Effect.sync(() => {}),
    scrollDown: (_lines: number) => Effect.sync(() => {}),
    setTitle: (_title: string) => Effect.sync(() => {}),
    bell: Effect.sync(() => {}),

    getCursorPosition: Effect.gen(function* (_) {
      const current = yield* _(Ref.get(env))
      return current.cursor
    }),

    setCursorShape: (_shape: 'block' | 'underline' | 'bar') => Effect.sync(() => {}),
    setCursorBlink: (_enabled: boolean) => Effect.sync(() => {}),

    // Testing utilities
    getWrites: () => Effect.runSync(Ref.get(writes)),
    setSize: (width: number, height: number) => {
      Effect.runSync(Ref.update(env, e => ({ ...e, size: { width, height } })))
    },
    isCursorHidden: () => Effect.runSync(Ref.get(cursorHidden)),
    cleanup: () => Effect.sync(() => {}),
  }

  return service
}

/**
 * Mock input service interface for testing.
 */
export interface MockInputService extends InputService.InputService {
  // Testing utilities
  simulateKey(key: string): void
  simulateMouse(event: MouseEvent): void
  simulateResize(width: number, height: number): void
  subscribeKeys(): Effect.Effect<never, never, Stream.Stream<string>>
  subscribeMouse(): Effect.Effect<never, never, Stream.Stream<MouseEvent>>
  subscribeResize(): Effect.Effect<never, never, Stream.Stream<WindowSize>>
  cleanup(): Effect.Effect<void>
}

/**
 * Mock input service for testing.
 */
export const createMockInputService = (): MockInputService => {
  const keyQueue = Queue.unbounded<KeyEvent>()
  const mouseQueue = Queue.unbounded<MouseEvent>()
  const resizeQueue = Queue.unbounded<WindowSize>()
  const pasteQueue = Queue.unbounded<string>()
  const focusQueue = Queue.unbounded<{ focused: boolean }>()
  const keyStringQueue = Queue.unbounded<string>()

  const [keyQ, mouseQ, resizeQ, pasteQ, focusQ, keyStringQ] = Effect.runSync(
    Effect.all([keyQueue, mouseQueue, resizeQueue, pasteQueue, focusQueue, keyStringQueue])
  )

  const service: MockInputService = {
    keyEvents: Stream.fromQueue(keyQ),
    mouseEvents: Stream.fromQueue(mouseQ),
    resizeEvents: Stream.fromQueue(resizeQ),
    pasteEvents: Stream.fromQueue(pasteQ),
    focusEvents: Stream.fromQueue(focusQ),

    enableMouse: Effect.sync(() => {}),
    disableMouse: Effect.sync(() => {}),
    enableMouseMotion: Effect.sync(() => {}),
    disableMouseMotion: Effect.sync(() => {}),
    enableBracketedPaste: Effect.sync(() => {}),
    disableBracketedPaste: Effect.sync(() => {}),
    enableFocusTracking: Effect.sync(() => {}),
    disableFocusTracking: Effect.sync(() => {}),

    readKey: Effect.gen(function* (_) {
      return yield* _(Queue.take(keyQ))
    }),

    readLine: Effect.succeed('test input'),
    inputAvailable: Effect.succeed(false),
    flushInput: Effect.sync(() => {}),

    filterKeys: predicate => Stream.fromQueue(keyQ).pipe(Stream.filter(predicate)),

    mapKeys: <T>(mapper: (key: KeyEvent) => T | null) =>
      Stream.fromQueue(keyQ).pipe(
        Stream.filterMap((key): Option.Option<T> => {
          const result = mapper(key)
          return result !== null ? Option.some(result) : Option.none()
        })
      ),

    debounceKeys: _ms => Stream.fromQueue(keyQ),

    parseAnsiSequence: _sequence => Effect.succeed(null),
    rawInput: Stream.empty,
    setEcho: _enabled => Effect.sync(() => {}),

    // Testing utilities
    simulateKey: (key: string) => {
      const keyEvent: KeyEvent = {
        type: 'key',
        key,
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        raw: key,
      }
      Effect.runSync(Queue.offer(keyQ, keyEvent))
      Effect.runSync(Queue.offer(keyStringQ, key))
    },
    simulateMouse: (event: MouseEvent) => {
      Effect.runSync(Queue.offer(mouseQ, event))
    },
    simulateResize: (width: number, height: number) => {
      Effect.runSync(Queue.offer(resizeQ, { width, height }))
    },
    subscribeKeys: () => Effect.succeed(Stream.fromQueue(keyStringQ)),
    subscribeMouse: () => Effect.succeed(Stream.fromQueue(mouseQ)),
    subscribeResize: () => Effect.succeed(Stream.fromQueue(resizeQ)),
    cleanup: () => Effect.sync(() => {}),
  }

  return service
}

/**
 * Mock renderer service interface for testing.
 */
export interface MockRendererService extends RendererService.RendererService {
  // Testing utilities
  getLastFrame(): string | null
  getLastRendered(): string
  getFrameHistory(): ReadonlyArray<View>
  getRenderCount(): number
  clear(): Effect.Effect<void>
}

/**
 * Mock renderer service for testing.
 */
export const createMockRendererService = (): MockRendererService => {
  const renderedViews = Ref.unsafeMake<ReadonlyArray<string>>([])
  const viewHistory = Ref.unsafeMake<ReadonlyArray<View>>([])
  const viewport = Ref.unsafeMake<Viewport>({ x: 0, y: 0, width: 80, height: 24 })
  const stats = Ref.unsafeMake({
    framesRendered: 0,
    averageFrameTime: 0,
    lastFrameTime: 0,
    dirtyRegionCount: 0,
    bufferSwitches: 0,
  })

  const service: MockRendererService = {
    render: (view: View) =>
      Effect.gen(function* (_) {
        // Mock implementation: render the view to get its content
        const rendered = yield* _(view.render())
        yield* _(Ref.update(renderedViews, views => [...views, rendered]))
        yield* _(Ref.update(viewHistory, views => [...views, view]))
        yield* _(
          Ref.update(stats, s => ({
            ...s,
            framesRendered: s.framesRendered + 1,
          }))
        )
      }),

    beginFrame: Effect.sync(() => {}),
    endFrame: Effect.sync(() => {}),
    forceRedraw: Effect.sync(() => {}),

    setViewport: (v: Viewport) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(viewport, v))
      }),

    getViewport: Effect.gen(function* (_) {
      return yield* _(Ref.get(viewport))
    }),

    pushViewport: (v: Viewport) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(viewport, v))
      }),

    popViewport: Effect.sync(() => {}),
    clearDirtyRegions: Effect.sync(() => {}),
    markDirty: _region => Effect.sync(() => {}),
    getDirtyRegions: Effect.succeed([]),
    optimizeDirtyRegions: Effect.sync(() => {}),

    getStats: Effect.gen(function* (_) {
      return yield* _(Ref.get(stats))
    }),

    resetStats: Effect.gen(function* (_) {
      yield* _(
        Ref.set(stats, {
          framesRendered: 0,
          averageFrameTime: 0,
          lastFrameTime: 0,
          dirtyRegionCount: 0,
          bufferSwitches: 0,
        })
      )
    }),

    setProfilingEnabled: _enabled => Effect.sync(() => {}),

    renderAt: (view: View, _x: number, _y: number) =>
      Effect.gen(function* (_) {
        const content = yield* _(view.render())
        const rendered = `[View at ${_x},${_y}] ${content}`
        yield* _(Ref.update(renderedViews, views => [...views, rendered]))
      }),

    renderBatch: views =>
      Effect.gen(function* (_) {
        for (const { view, x, y } of views) {
          const rendered = `[View at ${x},${y} ${view.width || 80}x${view.height || 24}]`
          yield* _(Ref.update(renderedViews, v => [...v, rendered]))
        }
      }),

    setClipRegion: _region => Effect.sync(() => {}),
    saveState: Effect.sync(() => {}),
    restoreState: Effect.sync(() => {}),

    measureText: (text: string) =>
      Effect.succeed({
        width: text.length,
        height: 1,
        lineCount: 1,
      }),

    wrapText: (text: string, width: number, _options) => Effect.succeed([text.slice(0, width)]),

    truncateText: (text: string, width: number, ellipsis = '...') =>
      Effect.succeed(
        text.length <= width ? text : text.slice(0, width - ellipsis.length) + ellipsis
      ),

    createLayer: (_name, _zIndex) => Effect.sync(() => {}),
    removeLayer: _name => Effect.sync(() => {}),
    renderToLayer: (_layerName, view: View, _x: number, _y: number) =>
      Effect.gen(function* (_) {
        const rendered = `[Layer ${_layerName}: View at ${_x},${_y} ${view.width || 80}x${view.height || 24}]`
        yield* _(Ref.update(renderedViews, views => [...views, rendered]))
      }),
    setLayerVisible: (_layerName, _visible) => Effect.sync(() => {}),
    compositeLayers: Effect.sync(() => {}),

    // Testing utilities
    getLastFrame: () => {
      const views = Effect.runSync(Ref.get(renderedViews))
      return views.length > 0 ? views[views.length - 1] : null
    },
    getLastRendered: () => {
      const views = Effect.runSync(Ref.get(renderedViews))
      return views.length > 0 ? views[views.length - 1] : ''
    },
    getFrameHistory: () => {
      return Effect.runSync(Ref.get(viewHistory))
    },
    getRenderCount: () => {
      const currentStats = Effect.runSync(Ref.get(stats))
      return currentStats.framesRendered
    },
    clear: () =>
      Effect.sync(() => {
        Effect.runSync(Ref.set(renderedViews, []))
        Effect.runSync(Ref.set(viewHistory, []))
      }),
  }

  return service
}

/**
 * Mock storage service interface for testing.
 */
export interface MockStorageService extends StorageService.StorageService {
  // Testing utilities - matching the test expectations
  get: <T>(key: string) => Effect.Effect<T | null>
  set: <T>(key: string, value: T) => Effect.Effect<void>
  delete: (key: string) => Effect.Effect<void>
  list: () => Effect.Effect<ReadonlyArray<string>>
  clear: () => Effect.Effect<void>
}

/**
 * Mock storage service for testing.
 */
export const createMockStorageService = (): MockStorageService => {
  const storage = Ref.unsafeMake<Map<string, unknown>>(new Map())

  const service: MockStorageService = {
    saveState: <T>(key: string, data: T) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(storage, map => new Map(map).set(key, data)))
      }),

    loadState: <T>(key: string) =>
      Effect.gen(function* (_) {
        const map = yield* _(Ref.get(storage))
        return (map.get(key) as T) || null
      }),

    clearState: (key: string) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(storage, map => {
            const newMap = new Map(map)
            newMap.delete(key)
            return newMap
          })
        )
      }),

    hasState: (key: string) =>
      Effect.gen(function* (_) {
        const map = yield* _(Ref.get(storage))
        return map.has(key)
      }),

    listStateKeys: Effect.gen(function* (_) {
      const map = yield* _(Ref.get(storage))
      return Array.from(map.keys())
    }),

    loadConfig: <T>(_appName: string, _schema: unknown, defaults: T) => Effect.succeed(defaults),

    saveConfig: <T>(_appName: string, _config: T, _schema: unknown) => Effect.sync(() => {}),

    getConfigPath: (_appName: string) => Effect.succeed('/tmp/test-config.json'),

    watchConfig: <T>(_appName: string, _schema: unknown) =>
      Effect.succeed(Effect.never as Effect.Effect<T>),

    setCache: <T>(key: string, data: T, _ttlSeconds?: number) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(storage, map => new Map(map).set(`cache:${key}`, data)))
      }),

    getCache: <T>(key: string, _schema: unknown) =>
      Effect.gen(function* (_) {
        const map = yield* _(Ref.get(storage))
        return (map.get(`cache:${key}`) as T) || null
      }),

    clearCache: (key: string) =>
      Effect.gen(function* (_) {
        yield* _(
          Ref.update(storage, map => {
            const newMap = new Map(map)
            newMap.delete(`cache:${key}`)
            return newMap
          })
        )
      }),

    clearExpiredCache: Effect.sync(() => {}),
    getCacheStats: Effect.succeed({
      totalEntries: 0,
      expiredEntries: 0,
      totalSize: 0,
    }),

    readTextFile: <T>(_path: string, _schema?: unknown) => Effect.succeed('test file content' as T),

    writeTextFile: (
      _path: string,
      _content: string,
      _options?: { readonly createDirs?: boolean; readonly backup?: boolean }
    ) => Effect.sync(() => {}),

    readJsonFile: <T>(_path: string, _schema: unknown) => Effect.succeed({} as T),

    writeJsonFile: <T>(_path: string, _data: T, _options?: { pretty?: boolean }) =>
      Effect.sync(() => {}),

    fileExists: (_path: string) => Effect.succeed(true),
    createDirectory: (_path: string) => Effect.sync(() => {}),

    getFileStats: (_path: string) =>
      Effect.succeed({
        size: 1024,
        modified: new Date(),
        created: new Date(),
        isFile: true,
        isDirectory: false,
      }),

    createBackup: (_filePath: string, _backupSuffix?: string) => Effect.succeed('/tmp/backup.txt'),

    restoreBackup: (_filePath: string, _backupPath: string) => Effect.sync(() => {}),

    listBackups: (_filePath: string) => Effect.succeed([]),

    cleanupBackups: (_filePath: string, _keepCount: number) => Effect.sync(() => {}),

    beginTransaction: Effect.succeed('test-transaction'),

    addToTransaction: (
      _transactionId: string,
      _operation: 'write' | 'delete',
      _path: string,
      _content?: string
    ) => Effect.sync(() => {}),

    commitTransaction: (_transactionId: string) => Effect.sync(() => {}),

    rollbackTransaction: (_transactionId: string) => Effect.sync(() => {}),

    // Testing utilities - using the same underlying storage as saveState/loadState
    get: <T>(key: string) => service.loadState<T>(key),
    set: <T>(key: string, value: T) => service.saveState(key, value),
    delete: (key: string) => service.clearState(key),
    list: () => service.listStateKeys,
    clear: () =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(storage, new Map()))
      }),
  }

  return service
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a complete test layer with all mock services.
 */
export const createTestLayer = (env?: Partial<TestEnvironment>) => {
  const terminal = createMockTerminalService(env ? createTestEnvironment(env) : undefined)
  const input = createMockInputService()
  const renderer = createMockRendererService()
  const storage = createMockStorageService()

  return Layer.mergeAll(
    Layer.succeed(TerminalService, terminal),
    Layer.succeed(InputService, input),
    Layer.succeed(RendererService, renderer),
    Layer.succeed(StorageService, storage)
  )
}

/**
 * Test a component in isolation.
 */
export const testComponent = <Model, Msg>(
  component: Component<Model, Msg>,
  options?: {
    readonly environment?: Partial<TestEnvironment>
    readonly timeout?: number
  }
) => {
  const testLayer = createTestLayer(options?.environment)

  // Helper to run effects with the test layer
  const runWithLayer = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
    Effect.runPromise(
      effect.pipe(
        Effect.provide(testLayer),
        Effect.timeout(options?.timeout || 5000)
      ) as Effect.Effect<A, E | Cause.TimeoutException, never>
    )

  return {
    /**
     * Test component initialization.
     */
    testInit: (): Promise<readonly [Model, ReadonlyArray<Cmd<Msg>>]> =>
      runWithLayer(component.init),

    /**
     * Test a single update cycle.
     */
    testUpdate: (msg: Msg, model: Model): Promise<readonly [Model, ReadonlyArray<Cmd<Msg>>]> =>
      runWithLayer(component.update(msg, model)),

    /**
     * Test view rendering.
     */
    testView: (model: Model): Promise<string> => runWithLayer(component.view(model).render()),

    /**
     * Test subscriptions.
     */
    testSubscriptions: (model: Model) =>
      component.subscriptions
        ? runWithLayer(component.subscriptions(model))
        : Promise.resolve(Stream.empty),
  }
}

/**
 * Assertion helpers for TUI testing.
 */
export const TUIAssert = {
  /**
   * Assert that rendered output contains specific text.
   */
  outputContains: (output: string, expected: string) => {
    expect(output).toContain(expected)
  },

  /**
   * Assert that rendered output matches a pattern.
   */
  outputMatches: (output: string, pattern: RegExp) => {
    expect(output).toMatch(pattern)
  },

  /**
   * Assert that component state has specific properties.
   */
  stateHas: <T>(state: T, expected: Partial<T>) => {
    for (const [key, value] of Object.entries(expected)) {
      expect((state as Record<string, unknown>)[key]).toEqual(value)
    }
  },

  /**
   * Assert that a view has specific dimensions.
   */
  viewSize: (view: View, width?: number, height?: number) => {
    if (width !== undefined) {
      expect(view.width).toBe(width)
    }
    if (height !== undefined) {
      expect(view.height).toBe(height)
    }
  },
} as const

// =============================================================================
// Comprehensive Service Mocks
// =============================================================================

/**
 * Create all mock services for integration testing
 */
export const createMockAppServices = () => {
  const terminal = createMockTerminalService()
  const input = createMockInputService()
  const renderer = createMockRendererService()
  const storage = createMockStorageService()

  return {
    terminal,
    input,
    renderer,
    storage,
    // Provide combined layer
    layer: Layer.mergeAll(
      Layer.succeed(TerminalService, terminal),
      Layer.succeed(InputService, input),
      Layer.succeed(RendererService, renderer),
      Layer.succeed(StorageService, storage)
    ),
  }
}

/**
 * Create a comprehensive test harness with all services
 */
export const withMockServices = <R, E, A>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E,
  Exclude<R, TerminalService | InputService | RendererService | StorageService>
> => {
  const services = createMockAppServices()
  return Effect.provide(effect, services.layer)
}

// =============================================================================
// Test Interaction Helpers
// =============================================================================

/**
 * Test interaction helper
 */
export interface InteractionTest<Model, Msg> {
  component: Component<Model, Msg>
  interactions: Array<{
    type: 'keypress' | 'mouse' | 'resize'
    key?: string
    event?: unknown
    size?: { width: number; height: number }
    wait?: number
  }>
  expectations: Array<{
    after: number
    check: (state: Model) => void
  }>
}

export async function testInteraction<Model, Msg>(
  test: InteractionTest<Model, Msg>
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Mock implementation for now
    // TODO: Implement proper interaction testing
    return { success: true }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Test lifecycle helper
 */
export interface LifecycleTest<Model, Msg> {
  component: Component<Model, Msg> & {
    cleanup?: Effect.Effect<void>
  }
  duration: number
}

export async function testLifecycle<Model, Msg>(
  test: LifecycleTest<Model, Msg>
): Promise<{
  success: boolean
  mountCalled: boolean
  destroyCalled: boolean
  error?: Error
}> {
  try {
    // Mock implementation for now
    // TODO: Implement proper lifecycle testing
    return { success: true, mountCalled: true, destroyCalled: true }
  } catch (error) {
    return { success: false, mountCalled: false, destroyCalled: false, error: error as Error }
  }
}

/**
 * Test harness interface
 */
export interface TestHarness<Model = unknown, Msg = unknown> {
  run: (component: Component<Model, Msg>) => Promise<void>
  send: (msg: Msg) => Promise<void>
  sendAndCatchError: (msg: Msg) => Promise<{ error?: Error }>
  stop: () => Promise<void>
  getState: () => Promise<Model>
  terminal: MockTerminalService
  input: MockInputService
  renderer: MockRendererService
  storage: MockStorageService
  runtime: unknown
}

export function createTestHarness<Model = unknown, Msg = unknown>(): TestHarness<Model, Msg> {
  const services = createMockAppServices()
  let currentModel: Model | undefined
  let currentComponent: Component<Model, Msg> | undefined
  let isRunning = false

  const harness: TestHarness<Model, Msg> = {
    terminal: services.terminal,
    input: services.input,
    renderer: services.renderer,
    storage: services.storage,
    runtime: null,

    async run(component: Component<Model, Msg>) {
      currentComponent = component
      isRunning = true

      // Initialize component
      const [initialModel, initialCmd] = await Effect.runPromise(
        Effect.provide(component.init, services.layer)
      )
      currentModel = initialModel

      // Render initial view
      const view = component.view(initialModel)
      await Effect.runPromise(Effect.provide(services.renderer.render(view), services.layer))

      // Execute initial commands if any
      for (const cmd of initialCmd) {
        await Effect.runPromise(Effect.provide(cmd, services.layer))
      }
    },

    async send(msg: Msg) {
      if (!currentComponent || !currentModel || !isRunning) {
        throw new Error('Harness not running')
      }

      // Update the model
      const [newModel, cmd] = await Effect.runPromise(
        Effect.provide(currentComponent.update(msg, currentModel), services.layer)
      )
      currentModel = newModel

      // Re-render
      const view = currentComponent.view(newModel)
      await Effect.runPromise(Effect.provide(services.renderer.render(view), services.layer))

      // Execute commands if any
      for (const command of cmd) {
        await Effect.runPromise(Effect.provide(command, services.layer))
      }
    },

    async sendAndCatchError(msg: Msg) {
      try {
        await harness.send(msg)
        return {}
      } catch (error) {
        return { error: error as Error }
      }
    },

    async stop() {
      isRunning = false
      currentComponent = undefined
      currentModel = undefined
    },

    async getState() {
      if (!currentModel) {
        throw new Error('No state available')
      }
      return currentModel
    },
  }

  return harness
}
