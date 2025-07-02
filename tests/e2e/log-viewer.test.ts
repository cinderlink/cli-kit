/**
 * Log Viewer E2E Tests
 * 
 * Tests for the log viewer example demonstrating:
 * - Log streaming and display
 * - Filtering by log level
 * - Search functionality
 * - Navigation and view modes
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { 
  createTestContext, 
  keys, 
  key, 
  typeText,
  assertOutputContains,
  assertOutputMatches
} from "./setup.ts"

// Mock log viewer component for testing
interface LogViewerModel {
  readonly logCount: number
  readonly filteredCount: number
  readonly searchTerm: string
  readonly levelFilter: Set<string>
  readonly autoScroll: boolean
  readonly selectedIndex: number
  readonly viewMode: 'list' | 'detail'
  readonly statusMessage: string
  readonly isSearching: boolean
  readonly showFilters: boolean
}

type LogViewerMsg = 
  | { readonly tag: "addLogEntry" }
  | { readonly tag: "toggleLevel"; readonly level: string }
  | { readonly tag: "toggleAutoScroll" }
  | { readonly tag: "navigateUp" }
  | { readonly tag: "navigateDown" }
  | { readonly tag: "toggleViewMode" }
  | { readonly tag: "toggleSearchMode" }
  | { readonly tag: "toggleFilters" }
  | { readonly tag: "search"; readonly term: string }

const mockLogViewer = {
  init: Effect.succeed([
    {
      logCount: 20,
      filteredCount: 20,
      searchTerm: "",
      levelFilter: new Set(['ERROR', 'WARN', 'INFO', 'DEBUG']),
      autoScroll: true,
      selectedIndex: 19,
      viewMode: 'list' as const,
      statusMessage: "Log viewer active - Press / to search, F to filter",
      isSearching: false,
      showFilters: false
    },
    []
  ]),
  
  update: (msg: LogViewerMsg, model: LogViewerModel) => {
    switch (msg.tag) {
      case "addLogEntry":
        return Effect.succeed([
          { 
            ...model, 
            logCount: model.logCount + 1,
            filteredCount: model.filteredCount + 1,
            selectedIndex: model.autoScroll ? model.logCount : model.selectedIndex
          },
          []
        ])
      case "toggleLevel":
        const newLevelFilter = new Set(model.levelFilter)
        if (newLevelFilter.has(msg.level)) {
          newLevelFilter.delete(msg.level)
        } else {
          newLevelFilter.add(msg.level)
        }
        return Effect.succeed([
          { 
            ...model, 
            levelFilter: newLevelFilter,
            statusMessage: `Filter ${msg.level}: ${newLevelFilter.has(msg.level) ? 'ON' : 'OFF'}`
          },
          []
        ])
      case "toggleAutoScroll":
        return Effect.succeed([
          { 
            ...model, 
            autoScroll: !model.autoScroll,
            statusMessage: `Auto-scroll: ${!model.autoScroll ? 'ON' : 'OFF'}`
          },
          []
        ])
      case "navigateUp":
        return Effect.succeed([
          { 
            ...model, 
            selectedIndex: Math.max(0, model.selectedIndex - 1),
            autoScroll: false
          },
          []
        ])
      case "navigateDown":
        return Effect.succeed([
          { 
            ...model, 
            selectedIndex: Math.min(model.filteredCount - 1, model.selectedIndex + 1),
            autoScroll: false
          },
          []
        ])
      case "toggleViewMode":
        const newMode = model.viewMode === 'list' ? 'detail' : 'list'
        return Effect.succeed([
          { 
            ...model, 
            viewMode: newMode,
            statusMessage: `View mode: ${newMode}`
          },
          []
        ])
      case "toggleSearchMode":
        return Effect.succeed([
          { 
            ...model, 
            isSearching: !model.isSearching,
            statusMessage: model.isSearching ? "Search mode OFF" : "Search mode ON - Type to search"
          },
          []
        ])
      case "toggleFilters":
        return Effect.succeed([
          { 
            ...model, 
            showFilters: !model.showFilters,
            statusMessage: `Filters panel: ${!model.showFilters ? 'SHOW' : 'HIDE'}`
          },
          []
        ])
      case "search":
        return Effect.succeed([
          { 
            ...model, 
            searchTerm: msg.term,
            filteredCount: msg.term ? Math.floor(model.logCount / 2) : model.logCount,
            statusMessage: `Search: "${msg.term}" - ${msg.term ? Math.floor(model.logCount / 2) : model.logCount} results`
          },
          []
        ])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: LogViewerModel) => ({
    _tag: "VStack" as const,
    children: [
      { _tag: "Text" as const, content: "Log Viewer 📝" },
      { _tag: "Text" as const, content: `${model.filteredCount}/${model.logCount} entries • Auto-scroll: ${model.autoScroll ? 'ON' : 'OFF'}` },
      { _tag: "Text" as const, content: `View mode: ${model.viewMode} | Selected: ${model.selectedIndex}` },
      { _tag: "Text" as const, content: `Search mode: ${model.isSearching ? 'ON' : 'OFF'} | Filters: ${model.showFilters ? 'SHOW' : 'HIDE'}` },
      { _tag: "Text" as const, content: `Level filters: ${Array.from(model.levelFilter).join(', ')}` },
      { _tag: "Text" as const, content: model.statusMessage },
      { _tag: "Text" as const, content: "2024-01-15 12:34:56 [INFO] app.log: User authentication successful" },
      { _tag: "Text" as const, content: "2024-01-15 12:35:01 [ERROR] auth.log: Failed login attempt" },
      { _tag: "Text" as const, content: "2024-01-15 12:35:05 [WARN] nginx.log: High memory usage detected" }
    ]
  }),
  
  subscriptions: () => Effect.succeed({})
}

test("Log Viewer - Initial State", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Log Viewer 📝"))
      yield* _(assertOutputContains(output, "20/20 entries"))
      yield* _(assertOutputContains(output, "Auto-scroll: ON"))
      yield* _(assertOutputContains(output, "View mode: list"))
      yield* _(assertOutputContains(output, "Search mode: OFF"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Toggle Search Mode", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Toggle search mode with '/'
      yield* _(ctx.sendKey(key('/')))
      yield* _(ctx.waitForOutput(output => output.includes("Search mode ON"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Search mode: ON"))
      yield* _(assertOutputContains(output, "Search mode ON - Type to search"))
      
      // Toggle off
      yield* _(ctx.sendKey(key('/')))
      yield* _(ctx.waitForOutput(output => output.includes("Search mode OFF"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Search mode: OFF"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Toggle Filters", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Toggle filters with 'f'
      yield* _(ctx.sendKey(key('f')))
      yield* _(ctx.waitForOutput(output => output.includes("Filters panel: SHOW"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Filters: SHOW"))
      
      // Toggle off
      yield* _(ctx.sendKey(key('f')))
      yield* _(ctx.waitForOutput(output => output.includes("Filters panel: HIDE"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Filters: HIDE"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Level Filtering", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Test level filter toggles (1-4 keys)
      yield* _(ctx.sendKey(key('1')))  // Toggle ERROR
      yield* _(ctx.waitForOutput(output => output.includes("Filter ERROR: OFF"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Filter ERROR: OFF"))
      
      yield* _(ctx.sendKey(key('2')))  // Toggle WARN
      yield* _(ctx.waitForOutput(output => output.includes("Filter WARN: OFF"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Filter WARN: OFF"))
      
      // Toggle back on
      yield* _(ctx.sendKey(key('1')))  // Toggle ERROR back on
      yield* _(ctx.waitForOutput(output => output.includes("Filter ERROR: ON"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Filter ERROR: ON"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Navigation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Check initial selection
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Selected: 19"))
      
      // Navigate up
      yield* _(ctx.sendKey(keys.up))
      yield* _(ctx.waitForOutput(output => output.includes("Selected: 18"), 1000))
      
      // Navigate down
      yield* _(ctx.sendKey(keys.down))
      yield* _(ctx.waitForOutput(output => output.includes("Selected: 19"), 1000))
      
      // Navigation should disable auto-scroll
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Auto-scroll: OFF"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Toggle Auto-scroll", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Toggle auto-scroll with 'a'
      yield* _(ctx.sendKey(key('a')))
      yield* _(ctx.waitForOutput(output => output.includes("Auto-scroll: OFF"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Auto-scroll: OFF"))
      
      // Toggle back on
      yield* _(ctx.sendKey(key('a')))
      yield* _(ctx.waitForOutput(output => output.includes("Auto-scroll: ON"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Auto-scroll: ON"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Toggle View Mode", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // Toggle view mode with 'v'
      yield* _(ctx.sendKey(key('v')))
      yield* _(ctx.waitForOutput(output => output.includes("View mode: detail"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "View mode: detail"))
      
      // Toggle back to list
      yield* _(ctx.sendKey(key('v')))
      yield* _(ctx.waitForOutput(output => output.includes("View mode: list"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "View mode: list"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Log Entries Display", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      const output = yield* _(ctx.getOutput())
      
      // Check that log entries are displayed with proper format
      yield* _(assertOutputMatches(output, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/))  // Timestamp
      yield* _(assertOutputContains(output, "[INFO]"))
      yield* _(assertOutputContains(output, "[ERROR]"))
      yield* _(assertOutputContains(output, "[WARN]"))
      yield* _(assertOutputContains(output, "app.log"))
      yield* _(assertOutputContains(output, "auth.log"))
      yield* _(assertOutputContains(output, "nginx.log"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Log Viewer - Complete Workflow", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockLogViewer))
      
      // 1. Check initial state
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Log Viewer 📝"))
      
      // 2. Enable search mode
      yield* _(ctx.sendKey(key('/')))
      yield* _(ctx.waitForOutput(output => output.includes("Search mode ON"), 1000))
      
      // 3. Show filters
      yield* _(ctx.sendKey(key('f')))
      yield* _(ctx.waitForOutput(output => output.includes("Filters panel: SHOW"), 1000))
      
      // 4. Toggle some log levels
      yield* _(ctx.sendKey(key('4')))  // Toggle DEBUG
      yield* _(ctx.waitForOutput(output => output.includes("Filter DEBUG: OFF"), 1000))
      
      // 5. Navigate logs
      yield* _(ctx.sendKey(keys.up))
      yield* _(ctx.waitForOutput(output => output.includes("Auto-scroll: OFF"), 1000))
      
      // 6. Change view mode
      yield* _(ctx.sendKey(key('v')))
      yield* _(ctx.waitForOutput(output => output.includes("View mode: detail"), 1000))
      
      // 7. Toggle auto-scroll back on
      yield* _(ctx.sendKey(key('a')))
      yield* _(ctx.waitForOutput(output => output.includes("Auto-scroll: ON"), 1000))
      
      const finalOutput = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(finalOutput, "View mode: detail"))
      yield* _(assertOutputContains(finalOutput, "Auto-scroll: ON"))
      
      yield* _(ctx.cleanup())
    })
  )
})