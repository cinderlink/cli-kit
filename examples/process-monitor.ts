/**
 * Process Monitor - An htop-inspired TUI for system process monitoring
 * 
 * Features:
 * - Simple process list with CPU/Memory usage
 * - Basic navigation with arrow keys
 * - Simulated system stats
 * - Auto-refresh with real-time updates
 */

import { Effect, Stream, Schedule } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, styledText, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, AppOptions, KeyEvent } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { LiveServices } from "@/services/impl/index.ts"

// =============================================================================
// Mock Data (simulating system processes)
// =============================================================================

interface Process {
  readonly pid: number
  readonly name: string
  readonly user: string
  readonly cpu: number
  readonly memory: number
  readonly status: 'running' | 'sleeping' | 'zombie' | 'stopped'
}

interface SystemStats {
  readonly cpuUsage: number
  readonly memoryUsage: number
  readonly processCount: number
  readonly uptime: number
}

const generateMockProcesses = (): ReadonlyArray<Process> => [
  {
    pid: 1,
    name: "systemd",
    user: "root",
    cpu: 0.1,
    memory: 8.2,
    status: 'running'
  },
  {
    pid: 124,
    name: "chrome",
    user: "user",
    cpu: Math.random() * 25 + 5,
    memory: Math.random() * 400 + 200,
    status: 'running'
  },
  {
    pid: 256,
    name: "node",
    user: "user", 
    cpu: Math.random() * 15 + 2,
    memory: Math.random() * 150 + 50,
    status: 'running'
  },
  {
    pid: 512,
    name: "firefox",
    user: "user",
    cpu: Math.random() * 20 + 3,
    memory: Math.random() * 300 + 100,
    status: 'running'
  },
  {
    pid: 1024,
    name: "code",
    user: "user",
    cpu: Math.random() * 10 + 1,
    memory: Math.random() * 200 + 80,
    status: 'running'
  }
]

const generateSystemStats = (): SystemStats => ({
  cpuUsage: Math.random() * 100,
  memoryUsage: Math.random() * 100,
  processCount: 156 + Math.floor(Math.random() * 20),
  uptime: Math.floor(Date.now() / 1000)
})

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly processes: ReadonlyArray<Process>
  readonly systemStats: SystemStats
  readonly selectedIndex: number
  readonly statusMessage: string
  readonly lastUpdate: number
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "refresh" }
  | { readonly tag: "moveUp" }
  | { readonly tag: "moveDown" }
  | { readonly tag: "kill" }

// =============================================================================
// Component
// =============================================================================

const processMonitor: Component<Model, Msg> = {
  init: Effect.succeed([{
    processes: generateMockProcesses(),
    systemStats: generateSystemStats(),
    selectedIndex: 0,
    statusMessage: "Process monitor active - Press k to kill, q to quit",
    lastUpdate: Date.now()
  }, []]),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "refresh": {
        return Effect.succeed([
          {
            ...model,
            processes: generateMockProcesses(),
            systemStats: generateSystemStats(),
            lastUpdate: Date.now()
          },
          []
        ])
      }
      
      case "moveUp": {
        const newIndex = Math.max(0, model.selectedIndex - 1)
        return Effect.succeed([
          { ...model, selectedIndex: newIndex },
          []
        ])
      }
      
      case "moveDown": {
        const newIndex = Math.min(model.processes.length - 1, model.selectedIndex + 1)
        return Effect.succeed([
          { ...model, selectedIndex: newIndex },
          []
        ])
      }
      
      case "kill": {
        const selectedProcess = model.processes[model.selectedIndex]
        if (selectedProcess) {
          return Effect.succeed([
            { 
              ...model, 
              statusMessage: `Killed process ${selectedProcess.name} (PID: ${selectedProcess.pid}) - simulated`
            },
            []
          ])
        }
        return Effect.succeed([model, [] as const] as const)
      }
      
      default:
        return Effect.succeed([model, [] as const] as const)
    }
  },
  
  view(model: Model) {
    const title = styledText("Process Monitor 📊", style().foreground(Colors.brightGreen).bold())
    const subtitle = text(
      `${model.systemStats.processCount} processes • CPU: ${model.systemStats.cpuUsage.toFixed(1)}% • MEM: ${model.systemStats.memoryUsage.toFixed(1)}%`,
      style().foreground(Colors.gray)
    )
    
    // Process table header
    const header = text(
      "  PID    NAME           USER     CPU%    MEM%    STATUS",
      style().foreground(Colors.brightWhite).bold()
    )
    
    // Process rows
    const processRows = model.processes.map((process, index) => {
      const isSelected = index === model.selectedIndex
      const bg = isSelected ? Colors.blue : undefined
      const fg = isSelected ? Colors.brightWhite : Colors.white
      
      const pidStr = process.pid.toString().padStart(5)
      const nameStr = process.name.padEnd(12).substring(0, 12)
      const userStr = process.user.padEnd(8).substring(0, 8)
      const cpuStr = process.cpu.toFixed(1).padStart(6)
      const memStr = process.memory.toFixed(1).padStart(6)
      const statusStr = process.status.padEnd(8)
      
      const rowText = `${isSelected ? '►' : ' '} ${pidStr}  ${nameStr}  ${userStr}  ${cpuStr}%  ${memStr}%  ${statusStr}`
      
      return styledText(rowText, style().foreground(fg).background(bg))
    })
    
    const processTable = vstack(
      header,
      text(""),
      ...processRows
    )
    
    const instructions = text(
      "↑/↓: Navigate • k: Kill Process • q: Quit • Auto-refresh: 2s",
      style().foreground(Colors.gray)
    )
    
    const statusText = styledText(model.statusMessage, style().foreground(Colors.yellow))
    
    return vstack(
      title,
      subtitle,
      text(""),
      box(processTable, {
        border: Borders.Normal,
        borderStyle: style().foreground(Colors.gray),
        padding: { top: 1, right: 2, bottom: 1, left: 2 }
      }),
      text(""),
      instructions,
      statusText
    )
  },

  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      // Auto-refresh timer
      const refreshTimer = Stream.repeatEffect(
        Effect.gen(function* () {
          yield* Effect.sleep(2000) // 2 second intervals
          return { tag: "refresh" } as Msg
        })
      )
      
      // Keyboard input
      const keyboardInput = input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0)
        }
        
        switch (key.key) {
          case 'up':
          case 'k':
            return { tag: "moveUp" } as const
          case 'down':
          case 'j':
            return { tag: "moveDown" } as const
          case 'x':
          case 'delete':
            return { tag: "kill" } as const
          case 'r':
            return { tag: "refresh" } as const
          default:
            return null
        }
      })
      
      return Stream.merge(refreshTimer, keyboardInput)
    })
}

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
}

console.log("Starting Process Monitor...")
console.log("This example demonstrates real-time data updates and system monitoring patterns")

const program = runApp(processMonitor, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Process Monitor error:", error)
    process.exit(1)
  })