/**
 * Testing Utilities - Test helpers and mocks for TUI framework testing
 * 
 * This module provides utilities for testing TUI components, including
 * mock services, test runners, and assertion helpers.
 */

import { Effect, Context, Layer, Ref, Queue, Stream, Option, Cause } from "effect"
import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import {
  TerminalService,
  InputService,
  RendererService,
  StorageService
} from "@/services/index.ts"
import type {
  Component,
  KeyEvent,
  MouseEvent,
  WindowSize,
  View,
  Viewport,
  TerminalCapabilities,
  Cmd
} from "@/services/index.ts"
import {
  TerminalError,
  InputError,
  RenderError,
  StorageError
} from "@/core/errors.ts"

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
    alternateScreen: true,
    cursorShapes: true
  },
  rawMode: false,
  alternateScreen: false,
  mouseEnabled: false,
  ...overrides
})

// =============================================================================
// Mock Services
// =============================================================================

/**
 * Mock terminal service for testing.
 */
export const createMockTerminalService = (
  initialEnv: TestEnvironment = createTestEnvironment()
) => {
  const env = Ref.unsafeMake(initialEnv)

  return Layer.succeed(
    TerminalService,
    {
      clear: Effect.gen(function* (_) {
        yield* _(Ref.update(env, (e) => ({ ...e, output: [] })))
      }),

      write: (text: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ 
            ...e, 
            output: [...e.output, text] 
          })))
        }),

      writeLine: (text: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ 
            ...e, 
            output: [...e.output, text + '\n'] 
          })))
        }),

      moveCursor: (x: number, y: number) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ 
            ...e, 
            cursor: { x, y } 
          })))
        }),

      moveCursorRelative: (dx: number, dy: number) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ 
            ...e, 
            cursor: { x: e.cursor.x + dx, y: e.cursor.y + dy } 
          })))
        }),

      hideCursor: Effect.sync(() => {}),
      showCursor: Effect.sync(() => {}),

      getSize: Effect.gen(function* (_) {
        const current = yield* _(Ref.get(env))
        return current.size
      }),

      setRawMode: (enabled: boolean) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ ...e, rawMode: enabled })))
        }),

      setAlternateScreen: (enabled: boolean) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(env, (e) => ({ ...e, alternateScreen: enabled })))
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
      setCursorBlink: (_enabled: boolean) => Effect.sync(() => {})
    }
  )
}

/**
 * Mock input service for testing.
 */
export const createMockInputService = () => {
  const keyQueue = Queue.unbounded<KeyEvent>()
  const mouseQueue = Queue.unbounded<MouseEvent>()
  const resizeQueue = Queue.unbounded<WindowSize>()
  const pasteQueue = Queue.unbounded<string>()
  const focusQueue = Queue.unbounded<{ focused: boolean }>()

  const [keyQ, mouseQ, resizeQ, pasteQ, focusQ] = Effect.runSync(
    Effect.all([keyQueue, mouseQueue, resizeQueue, pasteQueue, focusQueue])
  )

  return Layer.succeed(
    InputService,
    {
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

      readLine: Effect.succeed("test input"),
      inputAvailable: Effect.succeed(false),
      flushInput: Effect.sync(() => {}),

      filterKeys: (predicate) =>
        Stream.fromQueue(keyQ).pipe(
          Stream.filter(predicate)
        ),

      mapKeys: <T>(mapper: (key: KeyEvent) => T | null) =>
        Stream.fromQueue(keyQ).pipe(
          Stream.filterMap((key): Option.Option<T> => {
            const result = mapper(key)
            return result !== null ? Option.some(result) : Option.none()
          })
        ),

      debounceKeys: (_ms) => Stream.fromQueue(keyQ),

      parseAnsiSequence: (_sequence) => Effect.succeed(null),
      rawInput: Stream.empty,
      setEcho: (_enabled) => Effect.sync(() => {})
    }
  )
}

/**
 * Mock renderer service for testing.
 */
export const createMockRendererService = () => {
  const renderedViews = Ref.unsafeMake<ReadonlyArray<string>>([])
  const viewport = Ref.unsafeMake<Viewport>({ x: 0, y: 0, width: 80, height: 24 })
  const stats = Ref.unsafeMake({
    framesRendered: 0,
    averageFrameTime: 0,
    lastFrameTime: 0,
    dirtyRegionCount: 0,
    bufferSwitches: 0
  })

  return Layer.succeed(
    RendererService,
    {
      render: (view: View) =>
        Effect.gen(function* (_) {
          // Mock implementation: just return a simple string representation
          const rendered = `[View ${view.width || 80}x${view.height || 24}]`
          yield* _(Ref.update(renderedViews, (views) => [...views, rendered]))
          yield* _(Ref.update(stats, (s) => ({ 
            ...s, 
            framesRendered: s.framesRendered + 1 
          })))
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
      markDirty: (_region) => Effect.sync(() => {}),
      getDirtyRegions: Effect.succeed([]),
      optimizeDirtyRegions: Effect.sync(() => {}),

      getStats: Effect.gen(function* (_) {
        return yield* _(Ref.get(stats))
      }),

      resetStats: Effect.gen(function* (_) {
        yield* _(Ref.set(stats, {
          framesRendered: 0,
          averageFrameTime: 0,
          lastFrameTime: 0,
          dirtyRegionCount: 0,
          bufferSwitches: 0
        }))
      }),

      setProfilingEnabled: (_enabled) => Effect.sync(() => {}),

      renderAt: (view: View, _x: number, _y: number) =>
        Effect.gen(function* (_) {
          const rendered = `[View at ${_x},${_y} ${view.width || 80}x${view.height || 24}]`
          yield* _(Ref.update(renderedViews, (views) => [...views, rendered]))
        }),

      renderBatch: (views) =>
        Effect.gen(function* (_) {
          for (const { view, x, y } of views) {
            const rendered = `[View at ${x},${y} ${view.width || 80}x${view.height || 24}]`
            yield* _(Ref.update(renderedViews, (v) => [...v, rendered]))
          }
        }),

      setClipRegion: (_region) => Effect.sync(() => {}),
      saveState: Effect.sync(() => {}),
      restoreState: Effect.sync(() => {}),

      measureText: (text: string) =>
        Effect.succeed({
          width: text.length,
          height: 1,
          lineCount: 1
        }),

      wrapText: (text: string, width: number, _options) =>
        Effect.succeed([text.slice(0, width)]),

      truncateText: (text: string, width: number, ellipsis = '...') =>
        Effect.succeed(
          text.length <= width ? text : text.slice(0, width - ellipsis.length) + ellipsis
        ),

      createLayer: (_name, _zIndex) => Effect.sync(() => {}),
      removeLayer: (_name) => Effect.sync(() => {}),
      renderToLayer: (_layerName, view: View, _x: number, _y: number) =>
        Effect.gen(function* (_) {
          const rendered = `[Layer ${_layerName}: View at ${_x},${_y} ${view.width || 80}x${view.height || 24}]`
          yield* _(Ref.update(renderedViews, (views) => [...views, rendered]))
        }),
      setLayerVisible: (_layerName, _visible) => Effect.sync(() => {}),
      compositeLayers: Effect.sync(() => {})
    }
  )
}

/**
 * Mock storage service for testing.
 */
export const createMockStorageService = () => {
  const storage = Ref.unsafeMake<Map<string, unknown>>(new Map())

  return Layer.succeed(
    StorageService,
    {
      saveState: <T>(key: string, data: T) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(storage, (map) => new Map(map).set(key, data)))
        }),

      loadState: <T>(key: string) =>
        Effect.gen(function* (_) {
          const map = yield* _(Ref.get(storage))
          return (map.get(key) as T) || null
        }),

      clearState: (key: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(storage, (map) => {
            const newMap = new Map(map)
            newMap.delete(key)
            return newMap
          }))
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

      loadConfig: <T>(_appName: string, _schema: any, defaults: T) =>
        Effect.succeed(defaults),

      saveConfig: <T>(_appName: string, _config: T, _schema: any) =>
        Effect.sync(() => {}),

      getConfigPath: (_appName: string) =>
        Effect.succeed('/tmp/test-config.json'),

      watchConfig: <T>(_appName: string, _schema: any) =>
        Effect.succeed(Effect.never),

      setCache: <T>(key: string, data: T, _ttlSeconds?: number) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(storage, (map) => new Map(map).set(`cache:${key}`, data)))
        }),

      getCache: <T>(key: string, _schema: any) =>
        Effect.gen(function* (_) {
          const map = yield* _(Ref.get(storage))
          return (map.get(`cache:${key}`) as T) || null
        }),

      clearCache: (key: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(storage, (map) => {
            const newMap = new Map(map)
            newMap.delete(`cache:${key}`)
            return newMap
          }))
        }),

      clearExpiredCache: Effect.sync(() => {}),
      getCacheStats: Effect.succeed({
        totalEntries: 0,
        expiredEntries: 0,
        totalSize: 0
      }),

      readTextFile: <T>(_path: string, _schema?: any) =>
        Effect.succeed("test file content" as T),

      writeTextFile: (_path: string, _content: string, _options?: { readonly createDirs?: boolean; readonly backup?: boolean }) =>
        Effect.sync(() => {}),

      readJsonFile: <T>(_path: string, _schema: unknown) =>
        Effect.succeed({} as T),

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
          isDirectory: false
        }),

      createBackup: (_filePath: string, _backupSuffix?: string) =>
        Effect.succeed('/tmp/backup.txt'),

      restoreBackup: (_filePath: string, _backupPath: string) =>
        Effect.sync(() => {}),

      listBackups: (_filePath: string) =>
        Effect.succeed([]),

      cleanupBackups: (_filePath: string, _keepCount: number) =>
        Effect.sync(() => {}),

      beginTransaction: Effect.succeed('test-transaction'),

      addToTransaction: (_transactionId: string, _operation: 'write' | 'delete', _path: string, _content?: string) =>
        Effect.sync(() => {}),

      commitTransaction: (_transactionId: string) =>
        Effect.sync(() => {}),

      rollbackTransaction: (_transactionId: string) =>
        Effect.sync(() => {})
    }
  )
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a complete test layer with all mock services.
 */
export const createTestLayer = (env?: Partial<TestEnvironment>) =>
  Layer.merge(
    createMockTerminalService(env ? createTestEnvironment(env) : undefined),
    Layer.merge(
      createMockInputService(),
      Layer.merge(
        createMockRendererService(),
        createMockStorageService()
      )
    )
  )

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
  const runWithLayer = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> =>
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
    testView: (model: Model): Promise<string> =>
      runWithLayer(component.view(model).render()),

    /**
     * Test subscriptions.
     */
    testSubscriptions: (model: Model) =>
      component.subscriptions
        ? runWithLayer(component.subscriptions(model))
        : Promise.resolve(Stream.empty)
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
      expect((state as any)[key]).toEqual(value)
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
  }
} as const