/**
 * Process Monitor - An htop-inspired TUI for system process monitoring
 * 
 * Features:
 * - Real-time process table with CPU/Memory usage
 * - System resource meters (CPU, Memory, Network)
 * - Process filtering and sorting
 * - Kill process simulation
 * - Auto-refresh with configurable intervals
 */

import { Effect, Stream, Schedule } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, RuntimeConfig } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { 
  table,
  createColumn,
  createRow,
  progressBar,
  type TableModel,
  type TableMsg,
  type ProgressBarModel,
  type ProgressBarMsg,
  TableSelectionMode
} from "@/components/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

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
  readonly time: string
}

interface SystemStats {
  readonly cpuUsage: number
  readonly memoryUsage: number
  readonly memoryTotal: number
  readonly memoryUsed: number
  readonly networkIn: number
  readonly networkOut: number
  readonly processCount: number
}

const generateMockProcesses = (): Array<Process> => [
  { pid: 1, name: "systemd", user: "root", cpu: 0.1, memory: 8.2, status: "running", time: "00:05:23" },
  { pid: 1234, name: "chrome", user: "alice", cpu: 15.4, memory: 456.7, status: "running", time: "01:23:45" },
  { pid: 1235, name: "vscode", user: "alice", cpu: 8.9, memory: 234.1, status: "running", time: "02:15:30" },
  { pid: 1236, name: "firefox", user: "alice", cpu: 12.3, memory: 389.5, status: "running", time: "00:45:12" },
  { pid: 1237, name: "node", user: "alice", cpu: 3.2, memory: 123.4, status: "running", time: "00:12:34" },
  { pid: 1238, name: "docker", user: "root", cpu: 2.1, memory: 89.6, status: "running", time: "05:43:21" },
  { pid: 1239, name: "postgres", user: "postgres", cpu: 1.8, memory: 67.3, status: "running", time: "12:34:56" },
  { pid: 1240, name: "nginx", user: "www-data", cpu: 0.5, memory: 12.8, status: "running", time: "03:21:09" },
  { pid: 1241, name: "ssh", user: "alice", cpu: 0.1, memory: 4.2, status: "sleeping", time: "00:00:45" },
  { pid: 1242, name: "bash", user: "alice", cpu: 0.0, memory: 2.1, status: "sleeping", time: "00:00:12" }
]

const generateSystemStats = (): SystemStats => ({
  cpuUsage: Math.random() * 100,
  memoryUsage: 65 + Math.random() * 20,
  memoryTotal: 16384,
  memoryUsed: 10649,
  networkIn: Math.random() * 1000,
  networkOut: Math.random() * 500,
  processCount: 247
})

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly processTable: TableModel<Process>
  readonly cpuMeter: ProgressBarModel
  readonly memoryMeter: ProgressBarModel
  readonly systemStats: SystemStats
  readonly refreshInterval: number
  readonly filter: string
  readonly sortBy: string
  readonly sortDesc: boolean
  readonly selectedPid: number | null
  readonly statusMessage: string
  readonly lastUpdate: number
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "processMsg"; readonly msg: TableMsg<Process> }
  | { readonly tag: "cpuMeterMsg"; readonly msg: ProgressBarMsg }
  | { readonly tag: "memoryMeterMsg"; readonly msg: ProgressBarMsg }
  | { readonly tag: "refresh" }
  | { readonly tag: "setFilter"; readonly filter: string }
  | { readonly tag: "toggleSort"; readonly column: string }
  | { readonly tag: "killProcess" }
  | { readonly tag: "changeRefreshRate" }

// =============================================================================
// Component Setup
// =============================================================================

const createProcessTable = (processes: Array<Process>) => {
  const columns = [
    createColumn<Process>("pid", "PID", { width: 8, sortable: true, align: 'right' }),
    createColumn<Process>("name", "Name", { width: 15, sortable: true }),
    createColumn<Process>("user", "User", { width: 10, sortable: true }),
    createColumn<Process>("cpu", "CPU%", { 
      width: 8, 
      sortable: true, 
      align: 'right',
      render: (cpu: number) => `${cpu.toFixed(1)}%`
    }),
    createColumn<Process>("memory", "MEM%", { 
      width: 8, 
      sortable: true, 
      align: 'right',
      render: (memory: number) => `${memory.toFixed(1)}%`
    }),
    createColumn<Process>("status", "Status", { 
      width: 10, 
      align: 'center',
      render: (status: string) => {
        switch (status) {
          case 'running': return '🟢 RUN'
          case 'sleeping': return '💤 SLP'
          case 'zombie': return '🧟 ZMB'
          case 'stopped': return '⏹️ STP'
          default: return status
        }
      }
    }),
    createColumn<Process>("time", "Time", { width: 10, align: 'right' })
  ]
  
  const rows = processes.map(process => 
    createRow(`process-${process.pid}`, process)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Single,
    showHeader: true,
    width: 80,
    pageSize: 12,
    initialSort: { column: "cpu", direction: "desc" }
  })
}

// =============================================================================
// Component
// =============================================================================

const processMonitor: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const processes = generateMockProcesses()
    const systemStats = generateSystemStats()
    const processTableComponent = createProcessTable(processes)
    
    const [processModel] = yield* _(processTableComponent.init())
    const [cpuMeterModel] = yield* _(progressBar({ width: 20 }).init())
    const [memoryMeterModel] = yield* _(progressBar({ width: 20 }).init())
    
    return [{
      processTable: { ...processModel, focused: true },
      cpuMeter: cpuMeterModel,
      memoryMeter: memoryMeterModel,
      systemStats,
      refreshInterval: 2000,
      filter: "",
      sortBy: "cpu",
      sortDesc: true,
      selectedPid: null,
      statusMessage: "Process monitor active - Press F9 to kill, F5 to refresh",
      lastUpdate: Date.now()
    }, [
      // Start auto-refresh
      Effect.delay(Effect.succeed({ tag: "refresh" as const }), 2000)
    ]]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "processMsg": {
        const processTableComponent = createProcessTable(generateMockProcesses())
        return processTableComponent.update(msg.msg, model.processTable).pipe(
          Effect.map(([newProcessModel, cmds]) => [
            { ...model, processTable: newProcessModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(processMsg => ({ tag: "processMsg", msg: processMsg } as Msg))
            ))
          ])
        )
      }
      
      case "refresh": {
        const newStats = generateSystemStats()
        const newProcesses = generateMockProcesses()
        const processTableComponent = createProcessTable(newProcesses)
        
        return processTableComponent.init().pipe(
          Effect.map(([newProcessModel]) => [
            {
              ...model,
              processTable: { ...newProcessModel, focused: true },
              systemStats: newStats,
              lastUpdate: Date.now()
            },
            [
              // Schedule next refresh
              Effect.delay(Effect.succeed({ tag: "refresh" as const }), model.refreshInterval)
            ]
          ])
        )
      }
      
      case "killProcess": {
        const selectedRow = model.processTable.filteredRows[model.processTable.currentRowIndex]
        if (selectedRow) {
          const process = selectedRow.data as Process
          return Effect.succeed([
            { 
              ...model, 
              statusMessage: `Killed process ${process.name} (PID: ${process.pid}) - simulated`
            },
            []
          ])
        }
        return Effect.succeed([model, []])
      }
      
      case "changeRefreshRate": {
        const newInterval = model.refreshInterval === 1000 ? 5000 : 
                           model.refreshInterval === 5000 ? 10000 : 1000
        return Effect.succeed([
          { 
            ...model, 
            refreshInterval: newInterval,
            statusMessage: `Refresh rate changed to ${newInterval/1000}s`
          },
          []
        ])
      }
      
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view(model: Model) {
    const title = text("Process Monitor 📊", style(Colors.BrightGreen).bold())
    const uptime = `Up: ${Math.floor((Date.now() - model.lastUpdate + 3600000) / 1000)}s`
    const subtitle = text(`${model.systemStats.processCount} processes • ${uptime} • Refresh: ${model.refreshInterval/1000}s`, style(Colors.Gray))
    
    // System resource meters
    const cpuBar = hstack(
      text("CPU:  ", style(Colors.White)),
      progressBar({ width: 20 }).view({
        ...model.cpuMeter,
        progress: model.systemStats.cpuUsage
      }),
      text(` ${model.systemStats.cpuUsage.toFixed(1)}%`, style(Colors.White))
    )
    
    const memoryBar = hstack(
      text("MEM:  ", style(Colors.White)),
      progressBar({ width: 20 }).view({
        ...model.memoryMeter,
        progress: model.systemStats.memoryUsage
      }),
      text(` ${model.systemStats.memoryUsed}/${model.systemStats.memoryTotal}MB`, style(Colors.White))
    )
    
    const networkStats = hstack(
      text("NET: ", style(Colors.White)),
      text(`↓${model.systemStats.networkIn.toFixed(0)}KB/s `, style(Colors.BrightGreen)),
      text(`↑${model.systemStats.networkOut.toFixed(0)}KB/s`, style(Colors.BrightRed))
    )
    
    const systemPanel = box(
      vstack(
        text("System Resources", style(Colors.BrightYellow)),
        text("", style()),
        cpuBar,
        memoryBar,
        networkStats
      ),
      {
        border: Borders.single,
        borderStyle: style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 50,
        height: 7
      }
    )
    
    // Process table
    const processTableComponent = createProcessTable(generateMockProcesses())
    const processPanel = box(
      vstack(
        text("Processes (sorted by CPU usage)", style(Colors.BrightYellow)),
        text("", style()),
        processTableComponent.view(model.processTable)
      ),
      {
        border: Borders.single,
        borderStyle: style(Colors.BrightBlue),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 84,
        height: 16
      }
    )
    
    // Status bar
    const statusBar = box(
      text(model.statusMessage, style(Colors.White)),
      {
        border: Borders.single,
        borderStyle: style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 84
      }
    )
    
    // Keybindings help
    const help = vstack(
      text("Keybindings:", style(Colors.Yellow)),
      text("↑↓: Navigate  |  F5: Refresh  |  F9: Kill process  |  R: Change refresh rate", style(Colors.Gray)),
      text("Click column headers to sort  |  Ctrl+C: Exit", style(Colors.Gray))
    )
    
    return vstack(
      title,
      subtitle,
      text("", style()),
      systemPanel,
      text("", style()),
      processPanel,
      text("", style()),
      statusBar,
      text("", style()),
      help
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        // Process navigation
        if (key.key === 'up' || key.key === 'down') {
          return { tag: "processMsg", msg: { tag: key.key === 'up' ? "navigateUp" : "navigateDown" } }
        }
        
        // Actions
        if (key.key === 'f5') return { tag: "refresh" }
        if (key.key === 'f9') return { tag: "killProcess" }
        if (key.key === 'r') return { tag: "changeRefreshRate" }
        
        return null
      })
    })
}

// =============================================================================
// Main
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: true,
  quitOnCtrlC: true,
  enableMouse: false,
  fullscreen: true
}

console.log("Starting Process Monitor...")
console.log("This example demonstrates real-time data updates and system monitoring patterns")

const program = runApp(processMonitor, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })