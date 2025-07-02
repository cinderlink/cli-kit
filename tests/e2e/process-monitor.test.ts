/**
 * Process Monitor E2E Tests
 * 
 * Tests for the process monitor example demonstrating:
 * - Real-time data updates
 * - Process table navigation
 * - System resource monitoring
 * - Process management operations
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { 
  createTestContext, 
  keys, 
  key, 
  navigate,
  assertOutputContains,
  assertOutputMatches
} from "./setup.ts"

// Mock process monitor component for testing
interface ProcessMonitorModel {
  readonly processCount: number
  readonly selectedPid: number | null
  readonly statusMessage: string
  readonly refreshInterval: number
  readonly cpuUsage: number
  readonly memoryUsage: number
}

type ProcessMonitorMsg = 
  | { readonly tag: "refresh" }
  | { readonly tag: "killProcess" }
  | { readonly tag: "changeRefreshRate" }
  | { readonly tag: "navigateUp" }
  | { readonly tag: "navigateDown" }

const mockProcessMonitor = {
  init: Effect.succeed([
    {
      processCount: 247,
      selectedPid: 1234,
      statusMessage: "Process monitor active - Press F9 to kill, F5 to refresh",
      refreshInterval: 2000,
      cpuUsage: 45.2,
      memoryUsage: 65.8
    },
    []
  ]),
  
  update: (msg: ProcessMonitorMsg, model: ProcessMonitorModel) => {
    switch (msg.tag) {
      case "refresh":
        return Effect.succeed([
          { 
            ...model, 
            cpuUsage: Math.random() * 100,
            memoryUsage: 60 + Math.random() * 30,
            statusMessage: "Data refreshed"
          },
          []
        ])
      case "killProcess":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Killed process PID: ${model.selectedPid} - simulated`
          },
          []
        ])
      case "changeRefreshRate":
        const newInterval = model.refreshInterval === 1000 ? 5000 : 1000
        return Effect.succeed([
          { 
            ...model, 
            refreshInterval: newInterval,
            statusMessage: `Refresh rate changed to ${newInterval/1000}s`
          },
          []
        ])
      case "navigateUp":
        return Effect.succeed([
          { 
            ...model, 
            selectedPid: Math.max(1, (model.selectedPid || 1234) - 1)
          },
          []
        ])
      case "navigateDown":
        return Effect.succeed([
          { 
            ...model, 
            selectedPid: (model.selectedPid || 1234) + 1
          },
          []
        ])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: ProcessMonitorModel) => ({
    _tag: "VStack" as const,
    children: [
      { _tag: "Text" as const, content: "Process Monitor 📊" },
      { _tag: "Text" as const, content: `${model.processCount} processes • Refresh: ${model.refreshInterval/1000}s` },
      { _tag: "Text" as const, content: `CPU: ${model.cpuUsage.toFixed(1)}% | MEM: ${model.memoryUsage.toFixed(1)}%` },
      { _tag: "Text" as const, content: `Selected PID: ${model.selectedPid}` },
      { _tag: "Text" as const, content: model.statusMessage },
      { _tag: "Text" as const, content: "PID | Name | User | CPU% | MEM% | Status | Time" }
    ]
  }),
  
  subscriptions: () => Effect.succeed({})
}

test("Process Monitor - Initial State", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Process Monitor 📊"))
      yield* _(assertOutputContains(output, "247 processes"))
      yield* _(assertOutputContains(output, "CPU:"))
      yield* _(assertOutputContains(output, "MEM:"))
      yield* _(assertOutputContains(output, "Selected PID: 1234"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Refresh Functionality", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      // Test F5 refresh
      yield* _(ctx.sendKey(keys.f5))
      yield* _(ctx.waitForOutput(output => output.includes("Data refreshed"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Data refreshed"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Kill Process", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      // Test F9 kill process
      yield* _(ctx.sendKey(keys.f9))
      yield* _(ctx.waitForOutput(output => output.includes("Killed process PID: 1234"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Killed process PID: 1234 - simulated"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Change Refresh Rate", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      // Test 'r' key to change refresh rate
      yield* _(ctx.sendKey(key('r')))
      yield* _(ctx.waitForOutput(output => output.includes("Refresh rate changed"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputMatches(output, /Refresh rate changed to [15]s/))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Process Navigation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      // Get initial PID
      const initialOutput = yield* _(ctx.getOutput())
      expect(initialOutput).toContain("Selected PID: 1234")
      
      // Navigate up (should decrease PID)
      yield* _(ctx.sendKey(keys.up))
      yield* _(ctx.waitForOutput(output => output.includes("Selected PID: 1233"), 1000))
      
      // Navigate down (should increase PID)
      yield* _(ctx.sendKey(keys.down))
      yield* _(ctx.sendKey(keys.down))
      yield* _(ctx.waitForOutput(output => output.includes("Selected PID: 1235"), 1000))
      
      const finalOutput = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(finalOutput, "Selected PID: 1235"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - System Resource Display", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      const output = yield* _(ctx.getOutput())
      
      // Check that system resources are displayed
      yield* _(assertOutputMatches(output, /CPU: \d+\.\d+%/))
      yield* _(assertOutputMatches(output, /MEM: \d+\.\d+%/))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Process Table Headers", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      const output = yield* _(ctx.getOutput())
      
      // Check that process table headers are present
      yield* _(assertOutputContains(output, "PID"))
      yield* _(assertOutputContains(output, "Name"))
      yield* _(assertOutputContains(output, "User"))
      yield* _(assertOutputContains(output, "CPU%"))
      yield* _(assertOutputContains(output, "MEM%"))
      yield* _(assertOutputContains(output, "Status"))
      yield* _(assertOutputContains(output, "Time"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Process Monitor - Complete Workflow", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockProcessMonitor))
      
      // 1. Check initial state
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Process Monitor 📊"))
      
      // 2. Navigate to different process
      yield* _(ctx.sendKey(keys.down))
      yield* _(ctx.waitForOutput(output => output.includes("Selected PID: 1235"), 1000))
      
      // 3. Refresh data
      yield* _(ctx.sendKey(keys.f5))
      yield* _(ctx.waitForOutput(output => output.includes("Data refreshed"), 1000))
      
      // 4. Change refresh rate
      yield* _(ctx.sendKey(key('r')))
      yield* _(ctx.waitForOutput(output => output.includes("Refresh rate changed"), 1000))
      
      // 5. Kill process
      yield* _(ctx.sendKey(keys.f9))
      yield* _(ctx.waitForOutput(output => output.includes("Killed process"), 1000))
      
      const finalOutput = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(finalOutput, "Killed process PID: 1235"))
      
      yield* _(ctx.cleanup())
    })
  )
})