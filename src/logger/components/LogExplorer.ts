/**
 * Interactive Log Explorer Component
 * 
 * Rich, interactive log viewer with expandable JSON trees
 */

import { Effect } from "effect"
import { View, text, vstack, hstack, styledText } from "../../core/view"
import { style, Colors } from "../../styling"
import type { InteractiveLogEntry, LogLevel } from "../types"

interface LogExplorerProps {
  entries: InteractiveLogEntry[]
  maxEntries?: number
  showSearch?: boolean
  showFilters?: boolean
  theme?: "dark" | "light" | "auto"
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "gray",
  debug: "cyan", 
  info: "green",
  warn: "yellow",
  error: "red",
  fatal: "magenta"
}

const LEVEL_ICONS: Record<LogLevel, string> = {
  trace: "🔍",
  debug: "🐛", 
  info: "ℹ️ ",
  warn: "⚠️ ",
  error: "❌",
  fatal: "💀"
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString() + "." + date.getMilliseconds().toString().padStart(3, "0")
}

// Simplified helper functions for the non-JSX version

export function LogExplorer({
  entries,
  maxEntries = 1000,
  showSearch = true,
  showFilters = true,
  theme = "dark"
}: LogExplorerProps): View {
  // For now, using static state - would use runes in full implementation
  const expandedIds = new Set<string>()
  const searchTerm = ""
  const levelFilter: LogLevel | "all" = "all"

  // Filter entries
  const filteredEntries = entries
    .filter(entry => {
      if (levelFilter !== "all" && entry.level !== levelFilter) {
        return false
      }
      if (searchTerm && !entry.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      return true
    })
    .slice(-maxEntries)
    .map(entry => ({
      ...entry,
      expanded: expandedIds.has(entry.id)
    }))

  // Create header
  const header = hstack(
    styledText("🔍 Log Explorer", style().bold().foreground(Colors.blue)),
    text("  "),
    styledText(`(${filteredEntries.length} entries)`, style().foreground(Colors.gray))
  )

  // Create log entry rows
  const logRows = filteredEntries.map(entry => {
    const levelColor = LEVEL_COLORS[entry.level]
    const levelIcon = LEVEL_ICONS[entry.level]
    const timestamp = formatTimestamp(entry.timestamp)
    
    return hstack(
      styledText(timestamp, style().foreground(Colors.gray)),
      text("  "),
      styledText(`${levelIcon} ${entry.level.toUpperCase()}`, style().foreground(Colors[levelColor as keyof typeof Colors] || Colors.white)),
      text("  "),
      entry.context?.length > 0 ? styledText(`[${entry.context.join(".")}]`, style().foreground(Colors.blue)) : text(""),
      text("  "),
      text(entry.message)
    )
  })

  // Create controls footer
  const controls = hstack(
    styledText("↑↓ Navigate", style().foreground(Colors.gray)),
    styledText("  Enter Expand/Collapse", style().foreground(Colors.gray)),
    styledText("  / Search", style().foreground(Colors.gray)),
    styledText("  q Quit", style().foreground(Colors.gray))
  )

  return vstack(
    header,
    text(""),
    styledText("─".repeat(80), style().foreground(Colors.gray)),
    ...logRows,
    text(""),
    controls
  )
}