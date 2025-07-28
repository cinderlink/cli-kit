/**
 * Core Types - Fundamental types for the TUIX TUI framework
 *
 * This module defines the complete type system for TUIX, implementing a robust
 * Model-View-Update (MVU) architecture enhanced with Effect.ts for type-safe
 * error handling, resource management, and asynchronous operations.
 *
 * ## Architecture Overview:
 *
 * ### MVU Pattern
 * - **Model**: Application state (immutable data)
 * - **View**: Pure functions that render state to UI
 * - **Update**: State transition functions triggered by messages
 * - **Commands**: Asynchronous side effects that produce messages
 * - **Subscriptions**: Continuous streams of external events
 *
 * ### Effect.ts Integration
 * - All operations are Effect computations for composability
 * - Comprehensive error handling with typed error channels
 * - Resource-safe operations with automatic cleanup
 * - Dependency injection through Context system
 *
 * ### Service Architecture
 * - Terminal operations (clearing, writing, cursor control)
 * - Input handling (keyboard, mouse, resize events)
 * - Rendering pipeline (frame management, viewport control)
 * - Storage operations (state persistence, configuration)
 *
 * @example
 * ```typescript
 * // Define a counter component
 * interface CounterModel {
 *   count: number
 * }
 *
 * type CounterMsg =
 *   | { _tag: 'Increment' }
 *   | { _tag: 'Decrement' }
 *
 * const counterComponent: Component<CounterModel, CounterMsg> = {
 *   init: Effect.succeed([{ count: 0 }, []]),
 *
 *   update: (msg, model) => {
 *     switch (msg._tag) {
 *       case 'Increment':
 *         return Effect.succeed([{ count: model.count + 1 }, []])
 *       case 'Decrement':
 *         return Effect.succeed([{ count: model.count - 1 }, []])
 *     }
 *   },
 *
 *   view: (model) => ({
 *     render: () => Effect.succeed(`Count: ${model.count}`)
 *   })
 * }
 * ```
 *
 * @module core/types/core
 */

import { Effect, Stream, Context } from 'effect'
import type { RenderError, TerminalError, InputError, StorageError } from './errors'
import type { WindowSize, Viewport, TerminalCapabilities } from './schemas'

// =============================================================================
// Core MVU Types
// =============================================================================

/**
 * A command represents an asynchronous operation that will produce a message
 *
 * Commands are Effect computations that handle side effects like HTTP requests,
 * file operations, timers, and other async operations. They are the MVU pattern's
 * way of performing side effects while maintaining functional purity.
 *
 * Commands never fail (error channel is never) because errors should be
 * converted to messages and handled in the update function.
 *
 * @example
 * ```typescript
 * // HTTP request command
 * const fetchUser = (id: string): Cmd<UserMsg> =>
 *   Effect.gen(function* (_) {
 *     try {
 *       const user = yield* _(httpGet(`/users/${id}`))
 *       return { _tag: 'UserLoaded', user }
 *     } catch (error) {
 *       return { _tag: 'UserLoadFailed', error }
 *     }
 *   })
 * ```
 */
export type Cmd<Msg> = Effect.Effect<Msg, never, AppServices>

/**
 * A subscription represents a continuous stream of messages
 *
 * Subscriptions provide ongoing streams of messages from external sources
 * like keyboard input, mouse events, window resize events, timers, or
 * network connections. They are automatically managed by the runtime.
 *
 * @example
 * ```typescript
 * // Timer subscription
 * const timerSub = (intervalMs: number): Sub<TimerMsg> =>
 *   Stream.fromSchedule(Schedule.spaced(intervalMs)).pipe(
 *     Stream.map(() => ({ _tag: 'Tick', timestamp: Date.now() }))
 *   )
 * ```
 */
export type Sub<Msg> = Stream.Stream<Msg, never, AppServices>

/**
 * A view represents the visual output of a component
 *
 * Views are pure representations of UI state that can be rendered to terminal
 * output. They encapsulate the rendering logic and optional dimension constraints.
 * The render function is where the actual terminal output is generated.
 *
 * @example
 * ```typescript
 * const buttonView: View = {
 *   render: () => Effect.succeed('[  OK  ]'),
 *   width: 8,
 *   height: 1
 * }
 *
 * // Dynamic view based on state
 * const counterView = (count: number): View => ({
 *   render: () => Effect.succeed(`Count: ${count}`),
 *   width: `Count: ${count}`.length
 * })
 * ```
 */
export interface View {
  readonly render: () => Effect.Effect<string, RenderError, never>
  readonly width?: number
  readonly height?: number
}

/**
 * The core Component interface that implements the MVU pattern
 *
 * All TUIX components must implement this interface, which defines the complete
 * MVU (Model-View-Update) architecture. Components are pure, composable units
 * that manage their own state and respond to messages.
 *
 * The Component interface ensures:
 * - Predictable state management through the update function
 * - Pure rendering through the view function
 * - Controlled side effects through commands
 * - External event handling through subscriptions
 *
 * @template Model - The component's state type
 * @template Msg - The component's message type
 *
 * @example
 * ```typescript
 * interface TodoModel {
 *   items: string[]
 *   input: string
 * }
 *
 * type TodoMsg =
 *   | { _tag: 'AddItem' }
 *   | { _tag: 'UpdateInput', text: string }
 *
 * const todoComponent: Component<TodoModel, TodoMsg> = {
 *   init: Effect.succeed([{ items: [], input: '' }, []]),
 *
 *   update: (msg, model) => {
 *     switch (msg._tag) {
 *       case 'AddItem':
 *         return Effect.succeed([
 *           { ...model, items: [...model.items, model.input], input: '' },
 *           []
 *         ])
 *       case 'UpdateInput':
 *         return Effect.succeed([{ ...model, input: msg.text }, []])
 *     }
 *   },
 *
 *   view: (model) => ({
 *     render: () => Effect.succeed(
 *       model.items.join('\n') + '\n> ' + model.input
 *     )
 *   })
 * }
 * ```
 */
export interface Component<Model, Msg> {
  /**
   * Initialize the component and return the initial model and any startup commands.
   */
  readonly init: Effect.Effect<readonly [Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>

  /**
   * Process a message and return the updated model and any commands to execute.
   * This is where all state transitions happen.
   */
  readonly update: (
    msg: Msg,
    model: Model
  ) => Effect.Effect<readonly [Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>

  /**
   * Render the current model to a view that can be displayed.
   * This should be a pure function with no side effects.
   */
  readonly view: (model: Model) => View

  /**
   * Optional subscriptions that provide continuous streams of messages.
   * Common subscriptions include keyboard input, mouse events, and timers.
   */
  readonly subscriptions?: (model: Model) => Effect.Effect<Sub<Msg>, never, AppServices>
}

// =============================================================================
// Application Configuration
// =============================================================================

/**
 * Configuration options for TUI applications.
 */
export interface AppOptions {
  readonly alternateScreen?: boolean
  readonly mouse?: boolean
  readonly fps?: number
  readonly exitKeys?: ReadonlyArray<string>
  readonly debug?: boolean
}

// =============================================================================
// Service Types (Forward Declarations)
// =============================================================================

/**
 * Terminal service interface for low-level terminal operations
 *
 * Provides access to terminal capabilities like clearing the screen,
 * writing output, cursor control, and terminal state management.
 * All operations are Effect-based for composability and error handling.
 *
 * @example
 * ```typescript
 * const writeHello = Effect.gen(function* (_) {
 *   const terminal = yield* _(TerminalService)
 *   yield* _(terminal.clear)
 *   yield* _(terminal.write('Hello, World!'))
 *   yield* _(terminal.moveCursor(0, 1))
 * })
 * ```
 */
export interface TerminalService
  extends Context.Tag<
    'TerminalService',
    {
      readonly clear: Effect.Effect<void, TerminalError, never>
      readonly write: (text: string) => Effect.Effect<void, TerminalError, never>
      readonly writeLine: (text: string) => Effect.Effect<void, TerminalError, never>
      readonly moveCursor: (x: number, y: number) => Effect.Effect<void, TerminalError, never>
      readonly moveCursorRelative: (
        dx: number,
        dy: number
      ) => Effect.Effect<void, TerminalError, never>
      readonly hideCursor: Effect.Effect<void, TerminalError, never>
      readonly showCursor: Effect.Effect<void, TerminalError, never>
      readonly getSize: Effect.Effect<WindowSize, TerminalError, never>
      readonly setRawMode: (enabled: boolean) => Effect.Effect<void, TerminalError, never>
      readonly setAlternateScreen: (enabled: boolean) => Effect.Effect<void, TerminalError, never>
      readonly saveCursor: Effect.Effect<void, TerminalError, never>
      readonly restoreCursor: Effect.Effect<void, TerminalError, never>
      readonly getCapabilities: Effect.Effect<TerminalCapabilities, TerminalError, never>
      readonly supportsTrueColor: Effect.Effect<boolean, TerminalError, never>
      readonly supports256Colors: Effect.Effect<boolean, TerminalError, never>
      readonly supportsUnicode: Effect.Effect<boolean, TerminalError, never>
      readonly clearToEndOfLine: Effect.Effect<void, TerminalError, never>
      readonly clearToStartOfLine: Effect.Effect<void, TerminalError, never>
      readonly clearLine: Effect.Effect<void, TerminalError, never>
      readonly clearToEndOfScreen: Effect.Effect<void, TerminalError, never>
      readonly clearToStartOfScreen: Effect.Effect<void, TerminalError, never>
      readonly scrollUp: (lines: number) => Effect.Effect<void, TerminalError, never>
      readonly scrollDown: (lines: number) => Effect.Effect<void, TerminalError, never>
      readonly setTitle: (title: string) => Effect.Effect<void, TerminalError, never>
      readonly bell: Effect.Effect<void, TerminalError, never>
      readonly getCursorPosition: Effect.Effect<{ x: number; y: number }, TerminalError, never>
      readonly setCursorShape: (
        shape: 'block' | 'underline' | 'bar'
      ) => Effect.Effect<void, TerminalError, never>
      readonly setCursorBlink: (enabled: boolean) => Effect.Effect<void, TerminalError, never>
    }
  > {}

/**
 * Input service interface for handling user input events
 *
 * Provides streams of input events from keyboard, mouse, and window
 * resize operations. All streams are managed automatically by the runtime.
 *
 * @example
 * ```typescript
 * const handleInput = Effect.gen(function* (_) {
 *   const input = yield* _(InputService)
 *
 *   // Set up keyboard event subscription
 *   const keyStream = input.keyEvents
 *
 *   // Enable mouse support
 *   yield* _(input.enableMouse)
 * })
 * ```
 */
export interface InputService
  extends Context.Tag<
    'InputService',
    {
      readonly keyEvents: Sub<import('./schemas').KeyEvent>
      readonly mouseEvents: Sub<import('./schemas').MouseEvent>
      readonly resizeEvents: Sub<WindowSize>
      readonly pasteEvents: Sub<string>
      readonly focusEvents: Sub<{ focused: boolean }>
      readonly enableMouse: Effect.Effect<void, InputError, never>
      readonly disableMouse: Effect.Effect<void, InputError, never>
      readonly enableMouseMotion: Effect.Effect<void, InputError, never>
      readonly disableMouseMotion: Effect.Effect<void, InputError, never>
      readonly enableBracketedPaste: Effect.Effect<void, InputError, never>
      readonly disableBracketedPaste: Effect.Effect<void, InputError, never>
      readonly enableFocusTracking: Effect.Effect<void, InputError, never>
      readonly disableFocusTracking: Effect.Effect<void, InputError, never>
      readonly readKey: Effect.Effect<import('./schemas').KeyEvent, InputError, never>
      readonly readLine: Effect.Effect<string, InputError, never>
      readonly inputAvailable: Effect.Effect<boolean, InputError, never>
      readonly flushInput: Effect.Effect<void, InputError, never>
      readonly filterKeys: (
        predicate: (key: import('./schemas').KeyEvent) => boolean
      ) => Stream.Stream<import('./schemas').KeyEvent, InputError, never>
      readonly mapKeys: <T>(
        mapper: (key: import('./schemas').KeyEvent) => T | null
      ) => Stream.Stream<T, InputError, never>
      readonly debounceKeys: (
        ms: number
      ) => Stream.Stream<import('./schemas').KeyEvent, InputError, never>
      readonly parseAnsiSequence: (
        sequence: string
      ) => Effect.Effect<import('./schemas').KeyEvent | null, InputError, never>
      readonly rawInput: Stream.Stream<string, InputError, never>
      readonly setEcho: (enabled: boolean) => Effect.Effect<void, InputError, never>
    }
  > {}

/**
 * Renderer service interface for managing the rendering pipeline
 *
 * Handles the conversion of View objects to terminal output, frame
 * management, viewport control, and optimization of screen updates.
 *
 * @example
 * ```typescript
 * const renderFrame = Effect.gen(function* (_) {
 *   const renderer = yield* _(RendererService)
 *
 *   yield* _(renderer.beginFrame)
 *   yield* _(renderer.render(myView))
 *   yield* _(renderer.endFrame)
 * })
 * ```
 */
export interface RendererService
  extends Context.Tag<
    'RendererService',
    {
      readonly render: (view: View) => Effect.Effect<void, RenderError, never>
      readonly beginFrame: Effect.Effect<void, RenderError, never>
      readonly endFrame: Effect.Effect<void, RenderError, never>
      readonly forceRedraw: Effect.Effect<void, RenderError, never>
      readonly setViewport: (viewport: Viewport) => Effect.Effect<void, RenderError, never>
      readonly getViewport: Effect.Effect<Viewport, RenderError, never>
      readonly pushViewport: (viewport: Viewport) => Effect.Effect<void, RenderError, never>
      readonly popViewport: Effect.Effect<void, RenderError, never>
      readonly clearDirtyRegions: Effect.Effect<void, never, never>
      readonly markDirty: (region: Viewport) => Effect.Effect<void, RenderError, never>
      readonly getDirtyRegions: Effect.Effect<ReadonlyArray<Viewport>, RenderError, never>
      readonly optimizeDirtyRegions: Effect.Effect<void, RenderError, never>
      readonly getStats: Effect.Effect<
        {
          framesRendered: number
          averageFrameTime: number
          lastFrameTime: number
          dirtyRegionCount: number
          bufferSwitches: number
        },
        RenderError,
        never
      >
      readonly resetStats: Effect.Effect<void, RenderError, never>
      readonly setProfilingEnabled: (enabled: boolean) => Effect.Effect<void, RenderError, never>
      readonly renderAt: (
        view: View,
        x: number,
        y: number
      ) => Effect.Effect<void, RenderError, never>
      readonly renderBatch: (
        views: ReadonlyArray<{ view: View; x: number; y: number }>
      ) => Effect.Effect<void, RenderError, never>
      readonly setClipRegion: (region: Viewport | null) => Effect.Effect<void, RenderError, never>
      readonly saveState: Effect.Effect<void, RenderError, never>
      readonly restoreState: Effect.Effect<void, RenderError, never>
      readonly measureText: (
        text: string
      ) => Effect.Effect<{ width: number; height: number; lineCount: number }, RenderError, never>
      readonly wrapText: (
        text: string,
        width: number,
        options?: { wordWrap?: boolean; breakWords?: boolean }
      ) => Effect.Effect<ReadonlyArray<string>, RenderError, never>
      readonly truncateText: (
        text: string,
        width: number,
        ellipsis?: string
      ) => Effect.Effect<string, RenderError, never>
      readonly createLayer: (
        name: string,
        zIndex?: number
      ) => Effect.Effect<void, RenderError, never>
      readonly removeLayer: (name: string) => Effect.Effect<void, RenderError, never>
      readonly renderToLayer: (
        layerName: string,
        view: View,
        x: number,
        y: number
      ) => Effect.Effect<void, RenderError, never>
      readonly setLayerVisible: (
        layerName: string,
        visible: boolean
      ) => Effect.Effect<void, RenderError, never>
      readonly compositeLayers: Effect.Effect<void, RenderError, never>
    }
  > {}

/**
 * Storage service interface for persistent state management
 *
 * Provides key-value storage for application state, configuration,
 * and other persistent data. All operations are type-safe and Effect-based.
 *
 * @example
 * ```typescript
 * const saveUserPrefs = Effect.gen(function* (_) {
 *   const storage = yield* _(StorageService)
 *
 *   const prefs = { theme: 'dark', fontSize: 14 }
 *   yield* _(storage.saveState('userPrefs', prefs))
 *
 *   const loaded = yield* _(storage.loadState<typeof prefs>('userPrefs'))
 * })
 * ```
 */
export interface StorageService
  extends Context.Tag<
    'StorageService',
    {
      readonly saveState: <T>(key: string, data: T) => Effect.Effect<void, StorageError, never>
      readonly loadState: <T>(key: string) => Effect.Effect<T | null, StorageError, never>
      readonly clearState: (key: string) => Effect.Effect<void, StorageError, never>
      readonly hasState: (key: string) => Effect.Effect<boolean, StorageError, never>
      readonly listStateKeys: Effect.Effect<ReadonlyArray<string>, StorageError, never>
      readonly loadConfig: <T>(
        appName: string,
        schema: unknown,
        defaults: T
      ) => Effect.Effect<T, StorageError, never>
      readonly saveConfig: <T>(
        appName: string,
        config: T,
        schema: unknown
      ) => Effect.Effect<void, StorageError, never>
      readonly getConfigPath: (appName: string) => Effect.Effect<string, StorageError, never>
      readonly watchConfig: <T>(
        appName: string,
        schema: unknown
      ) => Effect.Effect<Effect.Effect<T, StorageError, never>, StorageError, never>
      readonly setCache: <T>(
        key: string,
        data: T,
        ttlSeconds?: number
      ) => Effect.Effect<void, StorageError, never>
      readonly getCache: <T>(
        key: string,
        schema: unknown
      ) => Effect.Effect<T | null, StorageError, never>
      readonly clearCache: (key: string) => Effect.Effect<void, StorageError, never>
      readonly clearExpiredCache: Effect.Effect<void, StorageError, never>
      readonly getCacheStats: Effect.Effect<
        {
          totalEntries: number
          expiredEntries: number
          totalSize: number
        },
        StorageError,
        never
      >
      readonly readTextFile: <T>(
        path: string,
        schema?: unknown
      ) => Effect.Effect<T, StorageError, never>
      readonly writeTextFile: (
        path: string,
        content: string,
        options?: { readonly createDirs?: boolean; readonly backup?: boolean }
      ) => Effect.Effect<void, StorageError, never>
      readonly readJsonFile: <T>(
        path: string,
        schema: unknown
      ) => Effect.Effect<T, StorageError, never>
      readonly writeJsonFile: <T>(
        path: string,
        data: T,
        options?: { pretty?: boolean }
      ) => Effect.Effect<void, StorageError, never>
      readonly fileExists: (path: string) => Effect.Effect<boolean, StorageError, never>
      readonly createDirectory: (path: string) => Effect.Effect<void, StorageError, never>
      readonly getFileStats: (path: string) => Effect.Effect<
        {
          size: number
          modified: Date
          created: Date
          isFile: boolean
          isDirectory: boolean
        },
        StorageError,
        never
      >
      readonly createBackup: (
        filePath: string,
        backupSuffix?: string
      ) => Effect.Effect<string, StorageError, never>
      readonly restoreBackup: (
        filePath: string,
        backupPath: string
      ) => Effect.Effect<void, StorageError, never>
      readonly listBackups: (
        filePath: string
      ) => Effect.Effect<ReadonlyArray<string>, StorageError, never>
      readonly cleanupBackups: (
        filePath: string,
        keepCount: number
      ) => Effect.Effect<void, StorageError, never>
      readonly beginTransaction: Effect.Effect<string, StorageError, never>
      readonly addToTransaction: (
        transactionId: string,
        operation: 'write' | 'delete',
        path: string,
        content?: string
      ) => Effect.Effect<void, StorageError, never>
      readonly commitTransaction: (
        transactionId: string
      ) => Effect.Effect<void, StorageError, never>
      readonly rollbackTransaction: (
        transactionId: string
      ) => Effect.Effect<void, StorageError, never>
    }
  > {}

/**
 * Union of all application services.
 */
export type AppServices = TerminalService | InputService | RendererService | StorageService

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extract the model type from a component
 *
 * Utility type that extracts the Model type parameter from a Component.
 * Useful for working with component types in generic contexts.
 *
 * @example
 * ```typescript
 * type MyComponent = Component<{ count: number }, { type: 'increment' }>
 * type Model = ModelOf<MyComponent> // { count: number }
 * ```
 */
export type ModelOf<T> = T extends Component<infer M, unknown> ? M : never

/**
 * Extract the message type from a component
 *
 * Utility type that extracts the Msg type parameter from a Component.
 * Useful for working with component message types in generic contexts.
 *
 * @example
 * ```typescript
 * type MyComponent = Component<{ count: number }, { type: 'increment' }>
 * type Messages = MsgOf<MyComponent> // { type: 'increment' }
 * ```
 */
export type MsgOf<T> = T extends Component<unknown, infer Msg> ? Msg : never

/**
 * A program represents a complete TUI application with its model and message types.
 */
export interface Program<Model, Msg> extends Component<Model, Msg> {
  readonly options?: AppOptions
}

/**
 * Runtime state for a running TUI application.
 */
export interface RuntimeState<Model> {
  readonly model: Model
  readonly running: boolean
  readonly viewport: Viewport
  readonly capabilities: TerminalCapabilities
}
