/**
 * Service Implementations - Live implementations of all services
 */

import { Effect, Layer, Stream } from "effect"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService,
  HitTestService,
  MouseRouterService
} from ".."
import { TerminalServiceLive } from "./terminal-impl"
import { InputServiceLive } from "./input-impl"
import { RendererServiceLive } from "./renderer-impl"
import { StorageServiceLive } from "./storage-impl"
import { HitTestServiceLive } from "../../../services/hit-test"
import { MouseRouterServiceLive } from "../../../services/mouse-router"

// Export individual service implementations
export * from "./terminal-impl"
export * from "./input-impl"
export * from "./renderer-impl"
export * from "./storage-impl"

/**
 * Complete live service layer with all services
 * RendererService depends on TerminalService, so we provide Terminal first
 * MouseRouterService depends on HitTestService
 */
export const LiveServices = TerminalServiceLive.pipe(
  Layer.merge(InputServiceLive),
  Layer.merge(StorageServiceLive),
  Layer.merge(RendererServiceLive),
  Layer.merge(Layer.effect(HitTestService, HitTestServiceLive)),
  Layer.merge(Layer.effect(MouseRouterService, MouseRouterServiceLive))
)

/**
 * Test service layer for testing
 */
export const TestServices = Layer.mergeAll(
  Layer.succeed(TerminalService, {
    clear: Effect.void,
    write: () => Effect.void,
    writeLine: () => Effect.void,
    moveCursor: () => Effect.void,
    moveCursorRelative: () => Effect.void,
    hideCursor: Effect.void,
    showCursor: Effect.void,
    getSize: Effect.succeed({ width: 80, height: 24 }),
    setRawMode: () => Effect.void,
    setAlternateScreen: () => Effect.void,
    saveCursor: Effect.void,
    restoreCursor: Effect.void,
    getCapabilities: Effect.succeed({
      colors: 'basic' as const,
      unicode: true,
      mouse: false,
      clipboard: false,
      sixel: false,
      kitty: false,
      iterm2: false,
      windowTitle: false,
      columns: 80,
      rows: 24
    }),
    supportsTrueColor: Effect.succeed(false),
    supports256Colors: Effect.succeed(false),
    supportsUnicode: Effect.succeed(true),
    clearToEndOfLine: Effect.void,
    clearToStartOfLine: Effect.void,
    clearLine: Effect.void,
    clearToEndOfScreen: Effect.void,
    clearToStartOfScreen: Effect.void,
    scrollUp: () => Effect.void,
    scrollDown: () => Effect.void,
    setTitle: () => Effect.void,
    bell: Effect.void,
    getCursorPosition: Effect.succeed({ x: 1, y: 1 }),
    setCursorShape: () => Effect.void,
    setCursorBlink: () => Effect.void
  }),
  Layer.succeed(InputService, {
    keyEvents: Stream.never,
    mouseEvents: Stream.never,
    resizeEvents: Stream.never,
    pasteEvents: Stream.never,
    enableMouse: Effect.void,
    disableMouse: Effect.void,
    enableMouseMotion: Effect.void,
    disableMouseMotion: Effect.void,
    enableBracketedPaste: Effect.void,
    disableBracketedPaste: Effect.void,
    enableFocusTracking: Effect.void,
    disableFocusTracking: Effect.void,
    focusEvents: Stream.never,
    readKey: Effect.fail(new Error("Not implemented in test")),
    readLine: Effect.fail(new Error("Not implemented in test")),
    inputAvailable: Effect.succeed(false),
    flushInput: Effect.void,
    filterKeys: () => Stream.never,
    mapKeys: () => Stream.never,
    debounceKeys: () => Stream.never,
    parseAnsiSequence: () => Effect.succeed(null),
    rawInput: Stream.never,
    setEcho: () => Effect.void
  }),
  Layer.succeed(RendererService, {
    render: () => Effect.void,
    beginFrame: Effect.void,
    endFrame: Effect.void,
    forceRedraw: Effect.void,
    setViewport: () => Effect.void,
    getViewport: Effect.succeed({ x: 0, y: 0, width: 80, height: 24 }),
    pushViewport: () => Effect.void,
    popViewport: Effect.void,
    clearDirtyRegions: Effect.void,
    markDirty: () => Effect.void,
    getDirtyRegions: Effect.succeed([]),
    optimizeDirtyRegions: Effect.void,
    getStats: Effect.succeed({
      framesRendered: 0,
      averageFrameTime: 0,
      lastFrameTime: 0,
      dirtyRegionCount: 0,
      bufferSwitches: 0
    }),
    resetStats: Effect.void,
    setProfilingEnabled: () => Effect.void,
    renderAt: () => Effect.void,
    renderBatch: () => Effect.void,
    setClipRegion: () => Effect.void,
    saveState: Effect.void,
    restoreState: Effect.void,
    measureText: () => Effect.succeed({ width: 0, height: 0, lineCount: 0 }),
    wrapText: () => Effect.succeed([]),
    truncateText: () => Effect.succeed(""),
    createLayer: () => Effect.void,
    removeLayer: () => Effect.void,
    renderToLayer: () => Effect.void,
    setLayerVisible: () => Effect.void,
    compositeLayers: Effect.void
  }),
  Layer.succeed(StorageService, {
    saveState: () => Effect.void,
    loadState: () => Effect.succeed(null),
    clearState: () => Effect.void,
    hasState: () => Effect.succeed(false),
    listStateKeys: Effect.succeed([]),
    loadConfig: () => Effect.fail(new Error("Not implemented in test")),
    saveConfig: () => Effect.void,
    getConfigPath: () => Effect.succeed("/tmp/test"),
    watchConfig: () => Effect.fail(new Error("Not implemented in test")),
    setCache: () => Effect.void,
    getCache: () => Effect.succeed(null),
    clearCache: () => Effect.void,
    clearExpiredCache: Effect.void,
    getCacheStats: Effect.succeed({ totalEntries: 0, expiredEntries: 0, totalSize: 0 }),
    readTextFile: () => Effect.fail(new Error("Not implemented in test")),
    writeTextFile: () => Effect.void,
    readJsonFile: () => Effect.fail(new Error("Not implemented in test")),
    writeJsonFile: () => Effect.void,
    fileExists: () => Effect.succeed(false),
    createDirectory: () => Effect.void,
    getFileStats: () => Effect.fail(new Error("Not implemented in test")),
    createBackup: () => Effect.succeed("/tmp/backup"),
    restoreBackup: () => Effect.void,
    listBackups: () => Effect.succeed([]),
    cleanupBackups: () => Effect.void,
    beginTransaction: Effect.succeed("test-transaction"),
    addToTransaction: () => Effect.void,
    commitTransaction: () => Effect.void,
    rollbackTransaction: () => Effect.void
  }),
  Layer.succeed(HitTestService, {
    registerComponent: () => Effect.void,
    unregisterComponent: () => Effect.void,
    clearComponents: Effect.void,
    hitTest: () => Effect.succeed(null),
    hitTestAll: () => Effect.succeed([]),
    getAllBounds: Effect.succeed([])
  }),
  Layer.succeed(MouseRouterService, {
    registerComponent: () => Effect.void,
    unregisterComponent: () => Effect.void,
    updateComponentBounds: () => Effect.void,
    routeMouseEvent: () => Effect.succeed(null),
    clearAll: Effect.void
  })
)