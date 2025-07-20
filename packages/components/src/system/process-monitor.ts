/**
 * ProcessMonitor Component
 * 
 * A comprehensive real-time process monitoring component that displays system processes
 * with sorting, filtering, tree view, and system metrics. Built on the TUIX component
 * architecture for efficient real-time updates and seamless integration.
 */

import { Effect, Option, pipe } from "effect"
import { stringWidth } from "@tuix/core"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "@tuix/core"
import { style, Colors, type Style } from "@tuix/styling"
import { View as ViewUtils } from "@tuix/core"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  generateComponentId
} from "../base"
import type {
  ProcessMonitorProps,
  ProcessInfo,
  SystemMetrics,
  ProcessFilter,
  ProcessSort,
  ProcessTreeNode,
  ProcessStatus
} from "./types"
import { SystemMetricsCollector, ProcessCollector } from "./metrics-collector"
import { ProcessTree } from "./process-tree"
import { ProcessActions, InteractiveProcessManager } from "./process-actions"

const { text, vstack, hstack, styledText, box } = ViewUtils

// =============================================================================
// Types
// =============================================================================

/**
 * ProcessMonitor component model
 */
export interface ProcessMonitorModel {
  readonly id: string
  readonly processes: ProcessInfo[]
  readonly systemMetrics: SystemMetrics | null
  readonly filter: ProcessFilter
  readonly sort: ProcessSort
  readonly selectedPid: number | null
  readonly treeView: boolean
  readonly expandedNodes: Set<number>
  readonly refreshing: boolean
  readonly lastRefresh: Date | null
  readonly error: string | null
  readonly actionInProgress: boolean
  readonly props: ProcessMonitorProps
}

/**
 * ProcessMonitor component messages
 */
export type ProcessMonitorMsg =
  | { readonly _tag: "ProcessesUpdated"; readonly processes: ProcessInfo[] }
  | { readonly _tag: "MetricsUpdated"; readonly metrics: SystemMetrics }
  | { readonly _tag: "ProcessSelected"; readonly pid: number | null }
  | { readonly _tag: "SortChanged"; readonly column: keyof ProcessInfo; readonly direction?: 'asc' | 'desc' }
  | { readonly _tag: "FilterChanged"; readonly filter: Partial<ProcessFilter> }
  | { readonly _tag: "TreeViewToggled" }
  | { readonly _tag: "NodeExpansionToggled"; readonly pid: number }
  | { readonly _tag: "RefreshRequested" }
  | { readonly _tag: "RefreshCompleted"; readonly data: { processes: ProcessInfo[]; metrics: SystemMetrics | null } }
  | { readonly _tag: "ErrorOccurred"; readonly error: string }
  | { readonly _tag: "ActionStarted" }
  | { readonly _tag: "ActionCompleted" }
  | { readonly _tag: "KeyPressed"; readonly key: KeyEvent }
  | { readonly _tag: "MouseClicked"; readonly event: MouseEvent }
  | { readonly _tag: "NoOp" }

/**
 * ProcessMonitor styles
 */
export interface ProcessMonitorStyles extends ComponentStyles {
  readonly header: Style
  readonly processRow: Style
  readonly selectedRow: Style
  readonly systemMetrics: Style
  readonly statusBar: Style
  readonly errorText: Style
  readonly refreshing: Style
}

// =============================================================================
// Default Styles
// =============================================================================

const defaultProcessMonitorStyles: ProcessMonitorStyles = {
  base: style({
    border: { style: 'single', color: Colors.Gray },
    padding: { top: 1, bottom: 1, left: 2, right: 2 }
  }),
  focused: style({
    border: { color: Colors.Blue }
  }),
  disabled: style({
    color: Colors.Gray,
    opacity: 0.6
  }),
  header: style({
    fontWeight: 'bold',
    color: Colors.White,
    backgroundColor: Colors.DarkGray,
    padding: { left: 1, right: 1 }
  }),
  processRow: style({
    padding: { left: 1, right: 1 }
  }),
  selectedRow: style({
    backgroundColor: Colors.Blue,
    color: Colors.White
  }),
  systemMetrics: style({
    border: { style: 'single', color: Colors.Gray },
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    marginBottom: 1
  }),
  statusBar: style({
    backgroundColor: Colors.DarkGray,
    color: Colors.White,
    padding: { left: 1, right: 1 }
  }),
  errorText: style({
    color: Colors.Red
  }),
  refreshing: style({
    color: Colors.Yellow
  })
}

// =============================================================================
// Command Helpers
// =============================================================================

/**
 * No-op command that does nothing
 */
const noCmd = (): ReadonlyArray<Cmd<ProcessMonitorMsg>> => []

/**
 * Command to refresh data
 */
const refreshCmd = (): Cmd<ProcessMonitorMsg> =>
  Effect.succeed({ _tag: "RefreshRequested" } as ProcessMonitorMsg)

/**
 * Command factory for simple messages
 */
const msgCmd = (msg: ProcessMonitorMsg): ReadonlyArray<Cmd<ProcessMonitorMsg>> =>
  [Effect.succeed(msg)]

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Create initial ProcessMonitor model
 */
function createInitialModel(props: ProcessMonitorProps): ProcessMonitorModel {
  return {
    id: generateComponentId(),
    processes: [],
    systemMetrics: null,
    filter: {
      searchQuery: '',
      minCpu: 0,
      minMemory: 0,
      selectedUsers: new Set(),
      selectedStatuses: new Set(),
      hideSystem: false
    },
    sort: {
      column: props.sortBy || 'cpu',
      direction: props.sortDirection || 'desc'
    },
    selectedPid: null,
    treeView: props.treeView || false,
    expandedNodes: new Set(),
    refreshing: false,
    lastRefresh: null,
    error: null,
    actionInProgress: false,
    props
  }
}

/**
 * Update ProcessMonitor model
 */
function updateProcessMonitor(
  msg: ProcessMonitorMsg,
  model: ProcessMonitorModel
): [ProcessMonitorModel, ReadonlyArray<Cmd<ProcessMonitorMsg>>] {
  switch (msg._tag) {
    case "ProcessesUpdated":
      return [
        {
          ...model,
          processes: msg.processes,
          lastRefresh: new Date(),
          refreshing: false,
          error: null
        },
        noCmd()
      ]

    case "MetricsUpdated":
      return [
        {
          ...model,
          systemMetrics: msg.metrics
        },
        noCmd()
      ]

    case "ProcessSelected":
      const newModel = {
        ...model,
        selectedPid: model.selectedPid === msg.pid ? null : msg.pid
      }
      
      // Call onProcessSelect callback if provided
      if (model.props.onProcessSelect && newModel.selectedPid) {
        setTimeout(() => model.props.onProcessSelect!(newModel.selectedPid!), 0)
      }
      
      return [newModel, noCmd()]

    case "SortChanged":
      const currentSort = model.sort
      const newDirection = currentSort.column === msg.column
        ? (msg.direction || (currentSort.direction === 'asc' ? 'desc' : 'asc'))
        : (msg.direction || 'desc')
      
      return [
        {
          ...model,
          sort: {
            column: msg.column,
            direction: newDirection
          }
        },
        noCmd()
      ]

    case "FilterChanged":
      return [
        {
          ...model,
          filter: {
            ...model.filter,
            ...msg.filter
          }
        },
        noCmd()
      ]

    case "TreeViewToggled":
      return [
        {
          ...model,
          treeView: !model.treeView
        },
        noCmd()
      ]

    case "NodeExpansionToggled":
      const expandedNodes = new Set(model.expandedNodes)
      if (expandedNodes.has(msg.pid)) {
        expandedNodes.delete(msg.pid)
      } else {
        expandedNodes.add(msg.pid)
      }
      
      return [
        {
          ...model,
          expandedNodes
        },
        noCmd()
      ]

    case "RefreshRequested":
      return [
        {
          ...model,
          refreshing: true,
          error: null
        },
        [Effect.promise(async () => {
          try {
            const processCollector = new ProcessCollector()
            const metricsCollector = new SystemMetricsCollector()
            
            const [processes, metrics] = await Promise.all([
              processCollector.collectProcesses(),
              model.props.showSystemMetrics !== false 
                ? metricsCollector.collectSystemMetrics()
                : Promise.resolve(null)
            ])
            
            return {
              _tag: "RefreshCompleted",
              data: { processes, metrics }
            } as ProcessMonitorMsg
          } catch (error) {
            return {
              _tag: "ErrorOccurred",
              error: error instanceof Error ? error.message : 'Unknown error'
            } as ProcessMonitorMsg
          }
        })]
      ]

    case "RefreshCompleted":
      return [
        {
          ...model,
          processes: msg.data.processes,
          systemMetrics: msg.data.metrics,
          refreshing: false,
          lastRefresh: new Date(),
          error: null
        },
        noCmd()
      ]

    case "ErrorOccurred":
      return [
        {
          ...model,
          error: msg.error,
          refreshing: false
        },
        noCmd()
      ]

    case "ActionStarted":
      return [
        {
          ...model,
          actionInProgress: true
        },
        noCmd()
      ]

    case "ActionCompleted":
      return [
        {
          ...model,
          actionInProgress: false
        },
        noCmd()
      ]

    case "KeyPressed":
      return handleKeyPress(msg.key, model)

    case "MouseClicked":
      return handleMouseClick(msg.event, model)

    case "NoOp":
      return [model, noCmd()]

    default:
      return [model, noCmd()]
  }
}

/**
 * Handle key press events
 */
function handleKeyPress(
  key: KeyEvent,
  model: ProcessMonitorModel
): [ProcessMonitorModel, ReadonlyArray<Cmd<ProcessMonitorMsg>>] {
  switch (key.key) {
    case 'r':
    case 'F5':
      return [model, [refreshCmd()]]
    
    case 't':
      return [model, msgCmd({ _tag: "TreeViewToggled" } as ProcessMonitorMsg)]
    
    case 'j':
    case 'ArrowDown':
      return selectNextProcess(model)
    
    case 'k':
    case 'ArrowUp':
      return selectPreviousProcess(model)
    
    case 'Enter':
    case ' ':
      if (model.selectedPid && model.treeView) {
        return [
          model,
          msgCmd({
            _tag: "NodeExpansionToggled",
            pid: model.selectedPid!
          } as ProcessMonitorMsg)
        ]
      }
      return [model, noCmd()]
    
    default:
      return [model, noCmd()]
  }
}

/**
 * Handle mouse click events
 */
function handleMouseClick(
  event: MouseEvent,
  model: ProcessMonitorModel
): [ProcessMonitorModel, ReadonlyArray<Cmd<ProcessMonitorMsg>>] {
  // Parse click position to determine what was clicked
  // This is a simplified implementation
  const clickedRowIndex = Math.max(0, event.position.row - 3) // Account for header
  const displayProcesses = getDisplayProcesses(model)
  
  if (clickedRowIndex < displayProcesses.length) {
    const clickedProcess = displayProcesses[clickedRowIndex]
    return [
      model,
      msgCmd({
        _tag: "ProcessSelected",
        pid: clickedProcess.pid
      } as ProcessMonitorMsg)
    ]
  }
  
  return [model, noCmd()]
}

/**
 * Select next process in list
 */
function selectNextProcess(
  model: ProcessMonitorModel
): [ProcessMonitorModel, ReadonlyArray<Cmd<ProcessMonitorMsg>>] {
  const displayProcesses = getDisplayProcesses(model)
  if (displayProcesses.length === 0) return [model, noCmd()]
  
  const currentIndex = model.selectedPid 
    ? displayProcesses.findIndex(p => p.pid === model.selectedPid)
    : -1
  
  const nextIndex = currentIndex < displayProcesses.length - 1 ? currentIndex + 1 : 0
  const nextProcess = displayProcesses[nextIndex]
  
  return [
    model,
    msgCmd({
      _tag: "ProcessSelected",
      pid: nextProcess.pid
    } as ProcessMonitorMsg)
  ]
}

/**
 * Select previous process in list
 */
function selectPreviousProcess(
  model: ProcessMonitorModel
): [ProcessMonitorModel, ReadonlyArray<Cmd<ProcessMonitorMsg>>] {
  const displayProcesses = getDisplayProcesses(model)
  if (displayProcesses.length === 0) return [model, noCmd()]
  
  const currentIndex = model.selectedPid 
    ? displayProcesses.findIndex(p => p.pid === model.selectedPid)
    : -1
  
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : displayProcesses.length - 1
  const prevProcess = displayProcesses[prevIndex]
  
  return [
    model,
    msgCmd({
      _tag: "ProcessSelected",
      pid: prevProcess.pid
    } as ProcessMonitorMsg)
  ]
}

/**
 * Get filtered and sorted processes for display
 */
function getDisplayProcesses(model: ProcessMonitorModel): ProcessInfo[] {
  let filtered = model.processes.filter(process => {
    // Search filter
    if (model.filter.searchQuery) {
      const query = model.filter.searchQuery.toLowerCase()
      if (
        !process.name.toLowerCase().includes(query) &&
        !process.command.toLowerCase().includes(query) &&
        !process.user.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    
    // Resource filters
    if (process.cpu < model.filter.minCpu) return false
    if (process.memory < model.filter.minMemory) return false
    
    // User filter
    if (model.filter.selectedUsers.size > 0) {
      if (!model.filter.selectedUsers.has(process.user)) return false
    }
    
    // Status filter
    if (model.filter.selectedStatuses.size > 0) {
      if (!model.filter.selectedStatuses.has(process.status)) return false
    }
    
    // System process filter
    if (model.filter.hideSystem && isSystemProcess(process)) {
      return false
    }
    
    // Apply custom filter if provided
    if (model.props.filterBy && !model.props.filterBy(process)) {
      return false
    }
    
    return true
  })
  
  // Apply sorting
  filtered.sort((a, b) => {
    const column = model.sort.column
    const direction = model.sort.direction === 'asc' ? 1 : -1
    
    let aValue = a[column]
    let bValue = b[column]
    
    // Handle special sorting cases
    if (column === 'startTime') {
      aValue = (a.startTime as Date).getTime()
      bValue = (b.startTime as Date).getTime()
    }
    
    if (aValue < bValue) return -1 * direction
    if (aValue > bValue) return 1 * direction
    return 0
  })
  
  // Handle tree view
  if (model.treeView) {
    const tree = new ProcessTree()
    tree.setExpandedPids(model.expandedNodes)
    const treeNodes = tree.buildProcessTree(filtered)
    const flatNodes = tree.flattenTree(treeNodes)
    return flatNodes.map(node => node.process)
  }
  
  // Apply maxProcesses limit
  const maxProcesses = model.props.maxProcesses || filtered.length
  return filtered.slice(0, maxProcesses)
}

/**
 * Check if process is a system process
 */
function isSystemProcess(process: ProcessInfo): boolean {
  return (
    process.pid < 1000 ||
    process.user === 'root' ||
    process.user === 'system' ||
    process.name.startsWith('kernel') ||
    process.command.includes('/System/') ||
    process.command.includes('/usr/libexec/')
  )
}

/**
 * Format memory value for display
 */
function formatMemory(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format CPU percentage
 */
function formatCpu(cpu: number): string {
  return `${cpu.toFixed(1)}%`
}

/**
 * Render ProcessMonitor view
 */
function viewProcessMonitor(
  model: ProcessMonitorModel,
  styles: ProcessMonitorStyles = defaultProcessMonitorStyles
): View {
  const displayProcesses = getDisplayProcesses(model)
  
  return vstack([
    // System metrics panel
    ...(model.props.showSystemMetrics && model.systemMetrics 
      ? [renderSystemMetrics(model.systemMetrics, styles)]
      : []
    ),
    
    // Controls panel
    renderControlsPanel(model, displayProcesses.length, styles),
    
    // Process table
    renderProcessTable(model, displayProcesses, styles),
    
    // Status bar
    renderStatusBar(model, displayProcesses.length, styles)
  ])
}

/**
 * Render system metrics panel
 */
function renderSystemMetrics(
  metrics: SystemMetrics,
  styles: ProcessMonitorStyles
): View {
  return styledText(
    `System Metrics\n` +
    `CPU: ${metrics.cpu.overall.toFixed(1)}% | ` +
    `Load: ${metrics.loadAverage.oneMinute.toFixed(2)} | ` +
    `Memory: ${formatMemory(metrics.memory.used)} / ${formatMemory(metrics.memory.total)} (${metrics.memory.percent.toFixed(1)}%) | ` +
    `Swap: ${formatMemory(metrics.memory.swap.used)} / ${formatMemory(metrics.memory.swap.total)} | ` +
    `Uptime: ${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`,
    styles.systemMetrics
  )
}

/**
 * Render controls panel
 */
function renderControlsPanel(
  model: ProcessMonitorModel,
  displayCount: number,
  styles: ProcessMonitorStyles
): View {
  const statusItems = [
    `Processes: ${model.processes.length}`,
    `Filtered: ${displayCount}`,
    ...(model.refreshing ? ['Refreshing...'] : []),
    ...(model.error ? [`Error: ${model.error}`] : []),
    ...(model.lastRefresh ? [`Last: ${model.lastRefresh.toLocaleTimeString()}`] : [])
  ]
  
  return text(statusItems.join(' | '))
}

/**
 * Render process table
 */
function renderProcessTable(
  model: ProcessMonitorModel,
  processes: ProcessInfo[],
  styles: ProcessMonitorStyles
): View {
  const headers = [
    { key: 'pid', label: 'PID', width: 8 },
    { key: 'name', label: 'Name', width: 20 },
    { key: 'user', label: 'User', width: 12 },
    { key: 'cpu', label: 'CPU%', width: 8 },
    { key: 'memory', label: 'Memory', width: 12 },
    { key: 'status', label: 'Status', width: 10 },
    { key: 'command', label: 'Command', width: 40 }
  ]
  
  // Header row
  const headerRow = styledText(
    headers.map(h => h.label.padEnd(h.width)).join(' '),
    styles.header
  )
  
  // Process rows
  const processRows = processes.map(process => {
    const isSelected = process.pid === model.selectedPid
    const rowStyle = isSelected ? styles.selectedRow : styles.processRow
    
    const cells = [
      process.pid.toString().padEnd(8),
      process.name.substring(0, 20).padEnd(20),
      process.user.substring(0, 12).padEnd(12),
      formatCpu(process.cpu).padEnd(8),
      formatMemory(process.memory).padEnd(12),
      process.status.padEnd(10),
      process.command.substring(0, 40).padEnd(40)
    ]
    
    return styledText(cells.join(' '), rowStyle)
  })
  
  return vstack([headerRow, ...processRows])
}

/**
 * Render status bar
 */
function renderStatusBar(
  model: ProcessMonitorModel,
  displayCount: number,
  styles: ProcessMonitorStyles
): View {
  const statusText = [
    `Total: ${model.processes.length}`,
    `Filtered: ${displayCount}`,
    `CPU Avg: ${model.systemMetrics?.cpu.overall.toFixed(1) || 'N/A'}%`,
    `Mem: ${model.systemMetrics ? formatMemory(model.systemMetrics.memory.used) : 'N/A'}`
  ].join(' | ')
  
  return styledText(statusText, styles.statusBar)
}

// =============================================================================
// Component Factory Functions
// =============================================================================

/**
 * Create ProcessMonitor component
 */
export function processMonitor(props: ProcessMonitorProps = {}): UIComponent<ProcessMonitorModel, ProcessMonitorMsg> {
  const model = createInitialModel(props)
  
  return {
    id: model.id,
    init: () => Effect.succeed([
      model,
      [refreshCmd()]
    ]),
    update: (msg, currentModel) => Effect.succeed(updateProcessMonitor(msg, currentModel)),
    view: (currentModel) => viewProcessMonitor(currentModel),
    
    // Focus management
    focus: () => Effect.succeed({ _tag: "NoOp" } as ProcessMonitorMsg),
    blur: () => Effect.succeed({ _tag: "NoOp" } as ProcessMonitorMsg),
    focused: (model) => false,
    
    // Size management  
    setSize: (width: number, height?: number) => Effect.succeed(undefined),
    getSize: (model) => ({ width: 80, height: 24 }),
    
    // Key handling
    handleKey: (key, model) => ({ _tag: "KeyPressed", key } as ProcessMonitorMsg),
    
    // Mouse handling
    handleMouse: (mouse, model) => ({ _tag: "MouseClicked", event: mouse } as ProcessMonitorMsg),
    
    subscriptions: () => [
      // Set up periodic refresh if refreshInterval is specified
      ...(props.refreshInterval ? [
        {
          id: `${model.id}-refresh`,
          interval: props.refreshInterval,
          msg: () => ({ _tag: "RefreshRequested" } as ProcessMonitorMsg)
        }
      ] : [])
    ]
  }
}

/**
 * Create simple process monitor with default settings
 */
export function simpleProcessMonitor(): UIComponent<ProcessMonitorModel, ProcessMonitorMsg> {
  return processMonitor({
    refreshInterval: 2000,
    showSystemMetrics: true,
    maxProcesses: 50
  })
}

/**
 * Create detailed process monitor with all features enabled
 */
export function detailedProcessMonitor(): UIComponent<ProcessMonitorModel, ProcessMonitorMsg> {
  return processMonitor({
    refreshInterval: 1000,
    showSystemMetrics: true,
    treeView: true,
    managementEnabled: true,
    showDetails: true,
    variant: 'detailed'
  })
}

/**
 * Create compact process monitor for smaller displays
 */
export function compactProcessMonitor(): UIComponent<ProcessMonitorModel, ProcessMonitorMsg> {
  return processMonitor({
    refreshInterval: 3000,
    showSystemMetrics: false,
    maxProcesses: 20,
    variant: 'compact'
  })
}

// Export types and main component
export type { ProcessMonitorModel, ProcessMonitorMsg, ProcessMonitorStyles }
export { defaultProcessMonitorStyles }