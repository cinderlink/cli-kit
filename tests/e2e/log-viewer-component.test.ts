/**
 * Log Viewer Component Tests (Direct Testing)
 * 
 * Tests component logic directly without runtime integration
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { 
  createComponentTestContext,
  testInteraction,
  assertOutputContains,
  assertModelProperty
} from "./component-test-utils.ts"

// Mock log viewer component for testing (reused from the original test)
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
      case "toggleSearchMode":
        return Effect.succeed([
          { 
            ...model, 
            isSearching: !model.isSearching,
            statusMessage: model.isSearching ? "Search mode OFF" : "Search mode ON - Type to search"
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
      case "toggleFilters":
        return Effect.succeed([
          { 
            ...model, 
            showFilters: !model.showFilters,
            statusMessage: `Filters panel: ${!model.showFilters ? 'SHOW' : 'HIDE'}`
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
  })
}

// =============================================================================
// Component Logic Tests
// =============================================================================

test("Log Viewer Component - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockLogViewer))
      
      // Test initial model state
      yield* _(assertModelProperty(ctx.model, "logCount", 20))
      yield* _(assertModelProperty(ctx.model, "autoScroll", true))
      yield* _(assertModelProperty(ctx.model, "isSearching", false))
      yield* _(assertModelProperty(ctx.model, "viewMode", "list"))
      
      // Test initial view output
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Log Viewer 📝"))
      yield* _(assertOutputContains(output, "20/20 entries"))
      yield* _(assertOutputContains(output, "Auto-scroll: ON"))
      yield* _(assertOutputContains(output, "Search mode: OFF"))
    })
  )
})

test("Log Viewer Component - Toggle Search Mode", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "toggleSearchMode" }],
      [
        (ctx) => assertModelProperty(ctx.model, "isSearching", true),
        (ctx) => assertModelProperty(ctx.model, "statusMessage", "Search mode ON - Type to search"),
        (ctx) => Effect.gen(function* (_) {
          const output = yield* _(ctx.getOutput())
          yield* _(assertOutputContains(output, "Search mode: ON"))
          yield* _(assertOutputContains(output, "Search mode ON - Type to search"))
        })
      ]
    )
  )
})

test("Log Viewer Component - Toggle Auto-scroll", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "toggleAutoScroll" }],
      [
        (ctx) => assertModelProperty(ctx.model, "autoScroll", false),
        (ctx) => assertModelProperty(ctx.model, "statusMessage", "Auto-scroll: OFF"),
        (ctx) => Effect.gen(function* (_) {
          const output = yield* _(ctx.getOutput())
          yield* _(assertOutputContains(output, "Auto-scroll: OFF"))
        })
      ]
    )
  )
})

test("Log Viewer Component - Level Filtering", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "toggleLevel", level: "ERROR" }],
      [
        (ctx) => Effect.gen(function* (_) {
          const hasError = ctx.model.levelFilter.has("ERROR")
          if (hasError) {
            return yield* _(Effect.fail(new Error("ERROR filter should be disabled")))
          }
        }),
        (ctx) => assertModelProperty(ctx.model, "statusMessage", "Filter ERROR: OFF")
      ]
    )
  )
})

test("Log Viewer Component - Navigation", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "navigateUp" }],
      [
        (ctx) => assertModelProperty(ctx.model, "selectedIndex", 18),
        (ctx) => assertModelProperty(ctx.model, "autoScroll", false)
      ]
    )
  )
})

test("Log Viewer Component - Toggle View Mode", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "toggleViewMode" }],
      [
        (ctx) => assertModelProperty(ctx.model, "viewMode", "detail"),
        (ctx) => assertModelProperty(ctx.model, "statusMessage", "View mode: detail")
      ]
    )
  )
})

test("Log Viewer Component - Toggle Filters", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [{ tag: "toggleFilters" }],
      [
        (ctx) => assertModelProperty(ctx.model, "showFilters", true),
        (ctx) => assertModelProperty(ctx.model, "statusMessage", "Filters panel: SHOW")
      ]
    )
  )
})

test("Log Viewer Component - Complex Workflow", async () => {
  await Effect.runPromise(
    testInteraction(
      mockLogViewer,
      [
        { tag: "toggleSearchMode" },
        { tag: "toggleFilters" },
        { tag: "toggleLevel", level: "DEBUG" },
        { tag: "navigateUp" },
        { tag: "toggleViewMode" }
      ],
      [
        (ctx) => assertModelProperty(ctx.model, "isSearching", true),
        (ctx) => assertModelProperty(ctx.model, "showFilters", true),
        (ctx) => assertModelProperty(ctx.model, "selectedIndex", 18),
        (ctx) => assertModelProperty(ctx.model, "autoScroll", false),
        (ctx) => assertModelProperty(ctx.model, "viewMode", "detail"),
        (ctx) => Effect.gen(function* (_) {
          const hasDebug = ctx.model.levelFilter.has("DEBUG")
          if (hasDebug) {
            return yield* _(Effect.fail(new Error("DEBUG filter should be disabled")))
          }
        })
      ]
    )
  )
})