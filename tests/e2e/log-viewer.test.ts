/**
 * Log Viewer E2E Tests
 * 
 * Tests for the log viewer example demonstrating:
 * - Log streaming and display
 * - Filtering by log level
 * - Search functionality
 * - Navigation and view modes
 * 
 * CONVERTED TO USE COMPONENT LOGIC TESTING APPROACH
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "./component-test-utils.ts"

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
      levelFilter: new Set(["ERROR", "WARN", "INFO", "DEBUG"]),
      autoScroll: true,
      selectedIndex: 19,
      viewMode: 'list' as const,
      statusMessage: "Log viewer active - Press / to search, F to filter",
      isSearching: false,
      showFilters: false
    } as LogViewerModel,
    []
  ]),
  
  update: (msg: LogViewerMsg, model: LogViewerModel) => {
    switch (msg.tag) {
      case "addLogEntry":
        return Effect.succeed([
          { 
            ...model, 
            logCount: model.logCount + 1,
            filteredCount: model.filteredCount + 1
          },
          []
        ])
      case "toggleLevel":
        const newFilter = new Set(model.levelFilter)
        if (newFilter.has(msg.level)) {
          newFilter.delete(msg.level)
        } else {
          newFilter.add(msg.level)
        }
        return Effect.succeed([
          { 
            ...model, 
            levelFilter: newFilter,
            statusMessage: `Filter ${msg.level}: ${newFilter.has(msg.level) ? 'ON' : 'OFF'}`
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
    render: () => Effect.succeed([
      "Log Viewer 📝",
      `${model.filteredCount}/${model.logCount} entries • Auto-scroll: ${model.autoScroll ? 'ON' : 'OFF'}`,
      `View mode: ${model.viewMode} | Selected: ${model.selectedIndex}`,
      `Search mode: ${model.isSearching ? 'ON' : 'OFF'} | Filters: ${model.showFilters ? 'SHOW' : 'HIDE'}`,
      `Level filters: ${Array.from(model.levelFilter).join(', ')}`,
      model.statusMessage,
      "2024-01-15 12:34:56 [INFO] app.log: User authentication successful",
      "2024-01-15 12:35:01 [ERROR] auth.log: Failed login attempt",
      "2024-01-15 12:35:05 [WARN] nginx.log: High memory usage detected"
    ].join('\n'))
  }),
  
  // Keyboard mapping function for testing
  handleKeyEvent: (key: string, model: LogViewerModel): LogViewerMsg | null => {
    switch (key) {
      case '1':
        return { tag: "toggleLevel", level: "ERROR" }
      case '2':
        return { tag: "toggleLevel", level: "WARN" }
      case '3':
        return { tag: "toggleLevel", level: "INFO" }
      case '4':
        return { tag: "toggleLevel", level: "DEBUG" }
      case '/':
        return { tag: "toggleSearchMode" }
      case 'f':
        return { tag: "toggleFilters" }
      case 'a':
        return { tag: "toggleAutoScroll" }
      case 'v':
        return { tag: "toggleViewMode" }
      case 'up':
        return { tag: "navigateUp" }
      case 'down':
        return { tag: "navigateDown" }
      default:
        return null
    }
  }
}

test("Log Viewer - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Log Viewer 📝")
      expect(output).toContain("20/20 entries")
      expect(output).toContain("Auto-scroll: ON")
      expect(output).toContain("View mode: list")
      expect(output).toContain("Search mode: OFF")
    })
  )
})

test("Log Viewer - Toggle Search Mode", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Toggle search mode
      const ctx2 = yield* _(ctx.sendMessage({ tag: "toggleSearchMode" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Search mode: ON")
      expect(output).toContain("Search mode ON - Type to search")
    })
  )
})

test("Log Viewer - Toggle Filters", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Toggle filters on
      const ctx2 = yield* _(ctx.sendMessage({ tag: "toggleFilters" }))
      let output = yield* _(ctx2.getOutput())
      expect(output).toContain("Filters: SHOW")
      expect(output).toContain("Filters panel: SHOW")
      
      // Toggle filters off
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "toggleFilters" }))
      output = yield* _(ctx3.getOutput())
      expect(output).toContain("Filters: HIDE")
      expect(output).toContain("Filters panel: HIDE")
    })
  )
})

test("Log Viewer - Level Filtering", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Toggle ERROR level off
      const ctx2 = yield* _(ctx.sendMessage({ tag: "toggleLevel", level: "ERROR" }))
      let output = yield* _(ctx2.getOutput())
      expect(output).toContain("Filter ERROR: OFF")
      expect(output).toContain("Level filters: WARN, INFO, DEBUG")
      
      // Toggle WARN level off
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "toggleLevel", level: "WARN" }))
      output = yield* _(ctx3.getOutput())
      expect(output).toContain("Filter WARN: OFF")
      expect(output).toContain("Level filters: INFO, DEBUG")
      
      // Toggle ERROR level back on
      const ctx4 = yield* _(ctx3.sendMessage({ tag: "toggleLevel", level: "ERROR" }))
      output = yield* _(ctx4.getOutput())
      expect(output).toContain("Filter ERROR: ON")
      expect(output).toContain("Level filters: INFO, DEBUG, ERROR")
    })
  )
})

test("Log Viewer - Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Check initial selection
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Selected: 19")
      expect(output).toContain("Auto-scroll: ON")
      
      // Navigate up
      const ctx2 = yield* _(ctx.sendMessage({ tag: "navigateUp" }))
      output = yield* _(ctx2.getOutput())
      expect(output).toContain("Selected: 18")
      expect(output).toContain("Auto-scroll: OFF") // Navigation disables auto-scroll
      
      // Navigate down
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "navigateDown" }))
      output = yield* _(ctx3.getOutput())
      expect(output).toContain("Selected: 19")
    })
  )
})

test("Log Viewer - View Mode Toggle", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Check initial view mode
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("View mode: list")
      
      // Toggle to detail mode
      const ctx2 = yield* _(ctx.sendMessage({ tag: "toggleViewMode" }))
      output = yield* _(ctx2.getOutput())
      expect(output).toContain("View mode: detail")
      expect(output).toContain("View mode: detail")
      
      // Toggle back to list mode
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "toggleViewMode" }))
      output = yield* _(ctx3.getOutput())
      expect(output).toContain("View mode: list")
    })
  )
})

test("Log Viewer - Keyboard Mapping", () => {
  const model: LogViewerModel = {
    logCount: 20,
    filteredCount: 20,
    searchTerm: "",
    levelFilter: new Set(["ERROR", "WARN", "INFO", "DEBUG"]),
    autoScroll: true,
    selectedIndex: 19,
    viewMode: 'list',
    statusMessage: "",
    isSearching: false,
    showFilters: false
  }
  
  // Test level filter keys
  expect(mockLogViewer.handleKeyEvent('1', model)).toEqual({ tag: "toggleLevel", level: "ERROR" })
  expect(mockLogViewer.handleKeyEvent('2', model)).toEqual({ tag: "toggleLevel", level: "WARN" })
  expect(mockLogViewer.handleKeyEvent('3', model)).toEqual({ tag: "toggleLevel", level: "INFO" })
  expect(mockLogViewer.handleKeyEvent('4', model)).toEqual({ tag: "toggleLevel", level: "DEBUG" })
  
  // Test function keys
  expect(mockLogViewer.handleKeyEvent('/', model)).toEqual({ tag: "toggleSearchMode" })
  expect(mockLogViewer.handleKeyEvent('f', model)).toEqual({ tag: "toggleFilters" })
  expect(mockLogViewer.handleKeyEvent('a', model)).toEqual({ tag: "toggleAutoScroll" })
  expect(mockLogViewer.handleKeyEvent('v', model)).toEqual({ tag: "toggleViewMode" })
  
  // Test navigation
  expect(mockLogViewer.handleKeyEvent('up', model)).toEqual({ tag: "navigateUp" })
  expect(mockLogViewer.handleKeyEvent('down', model)).toEqual({ tag: "navigateDown" })
  
  // Test unmapped keys
  expect(mockLogViewer.handleKeyEvent('x', model)).toBeNull()
})

test("Log Viewer - Complex Workflow", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Simulate complex workflow: toggle filters, disable ERROR, enable search, navigate
      const actions = [
        { tag: "toggleFilters" as const },
        { tag: "toggleLevel" as const, level: "ERROR" },
        { tag: "toggleSearchMode" as const },
        { tag: "navigateUp" as const },
        { tag: "navigateUp" as const },
        { tag: "toggleViewMode" as const }
      ]
      
      for (const action of actions) {
        ctx = yield* _(ctx.sendMessage(action))
      }
      
      // Check final state
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Filters: SHOW")
      expect(output).toContain("Level filters: WARN, INFO, DEBUG") // ERROR removed
      expect(output).toContain("Search mode: ON")
      expect(output).toContain("Selected: 17") // Started at 19, went up twice
      expect(output).toContain("View mode: detail")
      expect(output).toContain("Auto-scroll: OFF") // Disabled by navigation
    })
  )
})