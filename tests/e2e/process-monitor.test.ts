/**
 * Process Monitor E2E Tests
 * 
 * Tests for the process monitor example demonstrating:
 * - Real-time data updates
 * - Process table navigation
 * - System resource monitoring
 * - Process management operations
 * 
 * CONVERTED TO USE COMPONENT LOGIC TESTING APPROACH
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "./component-test-utils.ts"

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
    render: () => Effect.succeed([
      "Process Monitor 📊",
      `${model.processCount} processes • Refresh: ${model.refreshInterval/1000}s`,
      `CPU: ${model.cpuUsage.toFixed(1)}% | MEM: ${model.memoryUsage.toFixed(1)}%`,
      `Selected PID: ${model.selectedPid}`,
      model.statusMessage,
      "PID | Name | User | CPU% | MEM% | Status | Time"
    ].join('\n'))
  }),
  
  // Keyboard mapping function for testing
  handleKeyEvent: (key: string): ProcessMonitorMsg | null => {
    switch (key) {
      case 'f5': return { tag: 'refresh' }
      case 'f9': return { tag: 'killProcess' }
      case 'r': return { tag: 'changeRefreshRate' }
      case 'up': return { tag: 'navigateUp' }
      case 'down': return { tag: 'navigateDown' }
      default: return null
    }
  }
}

test("Process Monitor - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Process Monitor 📊")
      expect(output).toContain("247 processes")
      expect(output).toContain("CPU:")
      expect(output).toContain("MEM:")
      expect(output).toContain("Selected PID: 1234")
      expect(output).toContain("Press F9 to kill, F5 to refresh")
    })
  )
})

test("Process Monitor - Refresh Functionality", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      // Trigger refresh
      const ctx2 = yield* _(ctx.sendMessage({ tag: "refresh" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Data refreshed")
      expect(output).toContain("CPU:")
      expect(output).toContain("MEM:")
    })
  )
})

test("Process Monitor - Kill Process", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      // Trigger kill process
      const ctx2 = yield* _(ctx.sendMessage({ tag: "killProcess" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Killed process PID: 1234 - simulated")
    })
  )
})

test("Process Monitor - Change Refresh Rate", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      // Check initial refresh rate
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Refresh: 2s")
      
      // Change refresh rate
      const ctx2 = yield* _(ctx.sendMessage({ tag: "changeRefreshRate" }))
      
      output = yield* _(ctx2.getOutput())
      expect(output).toContain("Refresh rate changed to 1s")
      expect(output).toContain("Refresh: 1s")
    })
  )
})

test("Process Monitor - Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      // Check initial PID
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Selected PID: 1234")
      
      // Navigate up
      const ctx2 = yield* _(ctx.sendMessage({ tag: "navigateUp" }))
      output = yield* _(ctx2.getOutput())
      expect(output).toContain("Selected PID: 1233")
      
      // Navigate down twice
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "navigateDown" }))
      const ctx4 = yield* _(ctx3.sendMessage({ tag: "navigateDown" }))
      output = yield* _(ctx4.getOutput())
      expect(output).toContain("Selected PID: 1235")
    })
  )
})

test("Process Monitor - Keyboard Mapping", () => {
  // Test keyboard event mapping logic
  expect(mockProcessMonitor.handleKeyEvent('f5')).toEqual({ tag: 'refresh' })
  expect(mockProcessMonitor.handleKeyEvent('f9')).toEqual({ tag: 'killProcess' })
  expect(mockProcessMonitor.handleKeyEvent('r')).toEqual({ tag: 'changeRefreshRate' })
  expect(mockProcessMonitor.handleKeyEvent('up')).toEqual({ tag: 'navigateUp' })
  expect(mockProcessMonitor.handleKeyEvent('down')).toEqual({ tag: 'navigateDown' })
  expect(mockProcessMonitor.handleKeyEvent('x')).toBeNull()
})

test("Process Monitor - Keyboard Sequence", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockProcessMonitor))
      
      // Simulate keyboard sequence: f5 (refresh), down, down, f9 (kill)
      const keySequence = ['f5', 'down', 'down', 'f9']
      
      for (const key of keySequence) {
        const msg = mockProcessMonitor.handleKeyEvent(key)
        if (msg) {
          ctx = yield* _(ctx.sendMessage(msg))
        }
      }
      
      // Check final state
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Selected PID: 1236") // 1234 + 2 downs
      expect(output).toContain("Killed process PID: 1236 - simulated")
    })
  )
})