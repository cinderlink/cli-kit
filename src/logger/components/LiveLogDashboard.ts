/**
 * Live Log Dashboard with Filtering
 * 
 * Advanced log dashboard with real-time updates, filtering, and preset support
 */

import { View, text, vstack, hstack, styledText } from "@core/view"
import { style, Colors } from "@core/terminal/ansi/styles"
import { LEVEL_COLORS, LEVEL_EMOJIS, logUtils } from "./LogComponents"
import type { LogLevel } from "@logger/types"
import type { ProcessLog } from "@process-manager/types"
import type { LogFilter } from "../impl/presets"
import { applyPreset, matchesFilter, LOG_PRESETS } from "../impl/presets"

interface LiveLogDashboardProps {
  processes: Array<{
    name: string
    logs: ProcessLog[]
    status: string
  }>
  maxLines?: number
  refreshInterval?: number
  showProcessStats?: boolean
  filter?: LogFilter
  searchTerm?: string
  selectedPreset?: string
  theme?: "dark" | "light"
}

interface ProcessLogWithName extends ProcessLog {
  processName: string
}

export function LiveLogDashboard({
  processes,
  maxLines = 100,
  refreshInterval = 1000,
  showProcessStats = true,
  filter,
  searchTerm = "",
  selectedPreset = "",
  theme = "dark"
}: LiveLogDashboardProps): View {
  
  // Combine logs from all processes
  const allLogs: ProcessLogWithName[] = []
  processes.forEach(process => {
    process.logs.forEach(log => {
      allLogs.push({ ...log, processName: process.name })
    })
  })

  // Sort by timestamp
  allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Apply filtering
  let filteredLogs = allLogs

  // Apply preset filter if selected
  if (selectedPreset && LOG_PRESETS[selectedPreset]) {
    filteredLogs = filteredLogs.filter(log => matchesFilter(log, LOG_PRESETS[selectedPreset]))
  }

  // Apply custom filter if provided
  if (filter) {
    filteredLogs = filteredLogs.filter(log => matchesFilter(log, filter))
  }

  // Apply search term
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm, 'i')
    filteredLogs = filteredLogs.filter(log => 
      searchRegex.test(log.message) || 
      searchRegex.test(log.processName) ||
      searchRegex.test(log.level)
    )
  }

  // Take only the most recent entries
  const displayLogs = filteredLogs.slice(-maxLines)

  // Create header with filter info
  const header = createHeader(allLogs.length, displayLogs.length, selectedPreset, searchTerm)
  
  // Create filter controls
  const filterControls = createFilterControls(selectedPreset, searchTerm)
  
  // Create process stats if enabled
  const processStats = showProcessStats ? createProcessStats(processes) : []
  
  // Create log entries
  const logEntries = displayLogs.map((log, i) => createLogEntry(log, i, theme))
  
  // Create footer controls
  const footerControls = createFooterControls()

  return vstack(
    header,
    text(""),
    filterControls,
    text(""),
    ...processStats,
    styledText("─".repeat(120), style().foreground(Colors.gray)),
    ...logEntries,
    text(""),
    footerControls
  )
}

function createHeader(totalLogs: number, filteredLogs: number, preset: string, search: string): View {
  const filterInfo = []
  if (preset) filterInfo.push(`preset: ${preset}`)
  if (search) filterInfo.push(`search: "${search}"`)
  
  const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(", ")})` : ""
  
  return hstack(
    styledText("📊 Live Log Dashboard", style().bold().foreground(Colors.blue)),
    text("  "),
    styledText(`${filteredLogs}/${totalLogs} logs${filterText}`, style().foreground(Colors.gray)),
    text("  "),
    styledText(`Updated: ${new Date().toLocaleTimeString()}`, style().foreground(Colors.cyan))
  )
}

function createFilterControls(preset: string, search: string): View {
  const presetList = Object.keys(LOG_PRESETS).slice(0, 8).join(", ")
  
  return vstack(
    hstack(
      styledText("🔍 Filters: ", style().foreground(Colors.yellow)),
      text(`Preset: ${preset || "none"} | Search: ${search || "none"}`),
    ),
    hstack(
      styledText("Presets: ", style().foreground(Colors.gray)),
      text(presetList + "...")
    )
  )
}

function createProcessStats(processes: Array<{ name: string; logs: ProcessLog[]; status: string }>): View[] {
  const stats = processes.map(process => {
    const recentLogs = process.logs.filter(log => 
      Date.now() - log.timestamp.getTime() < 60000 // Last minute
    )
    const errorCount = recentLogs.filter(log => log.level === 'error').length
    const warnCount = recentLogs.filter(log => log.level === 'warn').length
    
    const statusColor = process.status === 'running' ? Colors.green : 
                       process.status === 'error' ? Colors.red : Colors.gray
    
    return hstack(
      styledText("●", style().foreground(statusColor)),
      text(" "),
      styledText(process.name.padEnd(15), style().bold()),
      text(`📄 ${process.logs.length.toString().padStart(4)} logs`),
      text("  "),
      errorCount > 0 ? styledText(`❌ ${errorCount}`, style().foreground(Colors.red)) : text(""),
      text("  "),
      warnCount > 0 ? styledText(`⚠️ ${warnCount}`, style().foreground(Colors.yellow)) : text("")
    )
  })

  return [
    styledText("Process Status:", style().foreground(Colors.cyan).bold()),
    ...stats,
    text("")
  ]
}

function createLogEntry(log: ProcessLogWithName, index: number, theme: string): View {
  const timestamp = log.timestamp.toLocaleTimeString() + "." + 
                   log.timestamp.getMilliseconds().toString().padStart(3, "0")
  
  const levelColor = LEVEL_COLORS[log.level] as keyof typeof Colors
  const levelEmoji = LEVEL_EMOJIS[log.level]
  const levelText = log.level.toUpperCase().padEnd(5)
  
  // Truncate long messages for better display
  const maxMessageLength = 80
  const message = log.message.length > maxMessageLength ? 
    log.message.substring(0, maxMessageLength) + "..." : log.message
  
  // Process name with consistent width
  const processName = log.processName.padEnd(12).substring(0, 12)
  
  return hstack(
    styledText(timestamp, style().foreground(Colors.gray)),
    text(" "),
    styledText(`[${processName}]`, style().foreground(Colors.blue)),
    text(" "),
    styledText(`${levelEmoji} ${levelText}`, style().foreground(Colors[levelColor] || Colors.white)),
    text(" "),
    text(message)
  )
}

function createFooterControls(): View {
  return vstack(
    styledText("─".repeat(120), style().foreground(Colors.gray)),
    hstack(
      styledText("Controls: ", style().foreground(Colors.yellow).bold()),
      styledText("/search", style().foreground(Colors.green)),
      text(" | "),
      styledText("p presets", style().foreground(Colors.green)),
      text(" | "),
      styledText("c clear", style().foreground(Colors.green)),
      text(" | "),
      styledText("f filter", style().foreground(Colors.green)),
      text(" | "),
      styledText("↑↓ scroll", style().foreground(Colors.green)),
      text(" | "),
      styledText("q quit", style().foreground(Colors.red))
    ),
    hstack(
      styledText("Quick presets: ", style().foreground(Colors.gray)),
      styledText("1", style().foreground(Colors.cyan)), text(":errors "),
      styledText("2", style().foreground(Colors.cyan)), text(":warnings "),
      styledText("3", style().foreground(Colors.cyan)), text(":debug "),
      styledText("4", style().foreground(Colors.cyan)), text(":vite "),
      styledText("5", style().foreground(Colors.cyan)), text(":vitest "),
      styledText("6", style().foreground(Colors.cyan)), text(":production ")
    )
  )
}

/**
 * Simple log viewer for individual processes
 */
export function ProcessLogView({
  processName,
  logs,
  maxLines = 50,
  filter,
  searchTerm = "",
  showTimestamp = true,
  followMode = false
}: {
  processName: string
  logs: ProcessLog[]
  maxLines?: number
  filter?: LogFilter
  searchTerm?: string
  showTimestamp?: boolean
  followMode?: boolean
}): View {
  
  // Apply filtering
  let filteredLogs = logs.map(log => ({ ...log, processName }))
  
  if (filter) {
    filteredLogs = filteredLogs.filter(log => matchesFilter(log, filter))
  }
  
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm, 'i')
    filteredLogs = filteredLogs.filter(log => searchRegex.test(log.message))
  }
  
  const displayLogs = followMode ? filteredLogs.slice(-maxLines) : filteredLogs.slice(0, maxLines)
  
  const header = hstack(
    styledText(`📝 Logs: ${processName}`, style().bold().foreground(Colors.blue)),
    text("  "),
    styledText(`(${displayLogs.length}/${logs.length})`, style().foreground(Colors.gray)),
    searchTerm ? hstack(text("  "), styledText(`search: "${searchTerm}"`, style().foreground(Colors.yellow))) : text("")
  )
  
  const logEntries = displayLogs.map((log, i) => {
    const timestamp = showTimestamp ? 
      `${log.timestamp.toLocaleTimeString()} ` : ""
    
    const levelColor = LEVEL_COLORS[log.level] as keyof typeof Colors
    const levelEmoji = LEVEL_EMOJIS[log.level]
    
    return hstack(
      showTimestamp ? styledText(timestamp, style().foreground(Colors.gray)) : text(""),
      styledText(`${levelEmoji} ${log.level.toUpperCase().padEnd(5)}`, 
        style().foreground(Colors[levelColor] || Colors.white)),
      text(" "),
      text(log.message)
    )
  })
  
  return vstack(
    header,
    text(""),
    ...logEntries,
    text(""),
    styledText(followMode ? "Following logs... (q to quit)" : "End of logs", 
      style().foreground(Colors.gray))
  )
}