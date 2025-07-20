/**
 * Process Monitor Component
 * 
 * Interactive TUI for monitoring and managing processes
 */

import { Effect } from "effect"
import { View, text, vstack, hstack, styledText } from "../../core/view"
import { style, Colors } from "../../styling"
import type { ProcessState, ProcessLog, ProcessManagerStats } from "../types"
import type { ProcessManagerClass } from "../manager"

interface ProcessMonitorProps {
  manager: ProcessManagerClass
  refreshInterval?: number
  showLogs?: boolean
  showStats?: boolean
  theme?: "dark" | "light"
}

const STATUS_COLORS = {
  running: "green",
  stopped: "gray",
  starting: "yellow",
  stopping: "yellow",
  error: "red",
  crashed: "red"
} as const

const STATUS_ICONS = {
  running: "●",
  stopped: "○",
  starting: "◐",
  stopping: "◐",
  error: "✗",
  crashed: "✗"
} as const

function formatUptime(ms: number): string {
  if (ms < 1000) return "0s"
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

// These helper functions are removed since we're now using simple view functions

export function ProcessMonitor({
  manager,
  refreshInterval = 1000,
  showLogs = true,
  showStats = true
}: ProcessMonitorProps): View {
  // For now, using static data - in a real implementation this would use runes for state management
  const processes = manager.list()
  const selectedIndex = 0
  const selectedProcess = processes[selectedIndex]
  const selectedLogs = selectedProcess ? manager.getLogs(selectedProcess.name) : []
  const systemStats = showStats ? manager.stats() as ProcessManagerStats : null
  const lastUpdate = new Date()

  // Create header
  const header = hstack(
    styledText("🔍 Process Monitor", style().bold().foreground(Colors.blue)),
    text("  "),
    styledText(`Last update: ${lastUpdate.toLocaleTimeString()}`, style().foreground(Colors.gray))
  )

  // Create process list header
  const processHeader = hstack(
    styledText("ST  ", style().bold()),
    styledText("NAME            ", style().bold()),
    styledText("STATUS    ", style().bold()),
    styledText("PID     ", style().bold()),
    styledText("UPTIME    ", style().bold()),
    styledText("MEMORY    ", style().bold()),
    styledText("CPU     ", style().bold()),
    styledText("RST", style().bold())
  )

  // Create process rows
  const processRows = processes.map((process, i) => {
    const statusColor = STATUS_COLORS[process.status]
    const statusIcon = STATUS_ICONS[process.status]
    const uptime = process.startTime ? Date.now() - process.startTime.getTime() : 0
    const selected = i === selectedIndex

    return hstack(
      styledText(statusIcon + "  ", style().foreground(Colors[statusColor as keyof typeof Colors] || Colors.white)),
      text(process.name.padEnd(16)),
      styledText(process.status.padEnd(10), style().foreground(Colors[statusColor as keyof typeof Colors] || Colors.white)),
      text((process.pid || "-").toString().padEnd(8)),
      text((uptime > 0 ? formatUptime(uptime) : "-").padEnd(10)),
      text((process.memory ? formatBytes(process.memory) : "-").padEnd(10)),
      text((process.cpu ? `${process.cpu.toFixed(1)}%` : "-").padEnd(8)),
      text(process.restarts.toString())
    )
  })

  // Create controls footer
  const controls = hstack(
    styledText("↑↓/jk Navigate", style().foreground(Colors.gray)),
    styledText("  s Start/Stop", style().foreground(Colors.gray)),
    styledText("  r Restart", style().foreground(Colors.gray)),
    styledText("  c Clear logs", style().foreground(Colors.gray)),
    styledText("  q Quit", style().foreground(Colors.gray))
  )

  return vstack(
    header,
    text(""),
    processHeader,
    styledText("─".repeat(80), style().foreground(Colors.gray)),
    ...processRows,
    text(""),
    controls
  )
}