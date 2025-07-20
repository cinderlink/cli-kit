/**
 * ScrollableBox Component
 * 
 * A reusable scrollable container with optional filtering and search
 * Perfect for displaying logs, process lists, and other scrollable content
 */

import { Effect } from "effect"
import type { View } from "../../core/types"
import { View as ViewUtils } from "../../core"
import { style, Colors } from "../../styling"

const { vstack, hstack, text, styledText } = ViewUtils

export interface ScrollableBoxProps {
  readonly title?: string
  readonly items: ReadonlyArray<any>
  readonly renderItem: (item: any, index: number) => View
  readonly height?: number
  readonly showScrollbar?: boolean
  readonly showFilter?: boolean
  readonly filterPlaceholder?: string
  readonly emptyMessage?: string
  readonly border?: 'single' | 'double' | 'rounded' | 'thick' | 'none'
  readonly showCount?: boolean
  readonly footer?: View | string
}

/**
 * ScrollableBox component with virtual scrolling and filtering
 */
export const ScrollableBox = (props: ScrollableBoxProps): View => {
  const {
    title,
    items,
    renderItem,
    height = 20,
    showScrollbar = true,
    showFilter = false,
    filterPlaceholder = "Filter...",
    emptyMessage = "No items to display",
    border = 'rounded',
    showCount = true,
    footer
  } = props

  // For now, we'll render all items (in a real implementation, 
  // we'd implement virtual scrolling based on viewport)
  const visibleItems = items.slice(0, height)
  const hasMore = items.length > height

  const content = vstack(
    // Header with count
    showCount && hstack(
      styledText(`Items: ${items.length}`, style().foreground(Colors.gray)),
      hasMore && styledText(` (showing ${visibleItems.length})`, style().foreground(Colors.yellow))
    ),
    
    // Filter input (placeholder for now)
    showFilter && vstack(
      text("🔍 " + filterPlaceholder)
    ),
    
    // Items or empty message
    items.length === 0 ? (
      styledText(emptyMessage, style().foreground(Colors.yellow))
    ) : (
      vstack(
        ...visibleItems.map((item, index) => renderItem(item, index)),
        hasMore && styledText(`... and ${items.length - height} more`, style().foreground(Colors.gray).italic())
      )
    ),
    
    // Footer
    footer && (
      typeof footer === 'string' ? styledText(footer, style().foreground(Colors.gray)) : footer
    )
  )

  // For now, return the content directly
  // In a real implementation, we'd use the styledBox from layout
  return content
}

/**
 * Specialized ScrollableLogBox for log entries
 */
export interface LogEntry {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
}

export const ScrollableLogBox = (props: Omit<ScrollableBoxProps, 'renderItem' | 'items'> & {
  logs: ReadonlyArray<LogEntry>
  colorize?: boolean
}) => {
  const { logs, colorize = true, ...rest } = props
  
  const levelColors = {
    debug: Colors.gray,
    info: Colors.blue,
    warn: Colors.yellow,
    error: Colors.red
  }

  const levelIcons = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌'
  }

  return ScrollableBox({
    ...rest,
    items: logs,
    renderItem: (log: LogEntry) => hstack(
      styledText(log.timestamp.toLocaleTimeString(), style().foreground(Colors.gray)),
      styledText(
        `${levelIcons[log.level]} ${log.level.toUpperCase().padEnd(5)}`,
        colorize ? style().foreground(levelColors[log.level]).bold() : style()
      ),
      styledText(`[${log.source.padEnd(12)}]`, style().foreground(Colors.cyan)),
      text(log.message)
    )
  })
}

/**
 * ScrollableProcessList for process status displays
 */
export interface ProcessInfo {
  name: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  pid?: number
  uptime?: number
  restarts?: number
}

export const ScrollableProcessList = (props: Omit<ScrollableBoxProps, 'renderItem' | 'items'> & {
  processes: ReadonlyArray<ProcessInfo>
  detailed?: boolean
}) => {
  const { processes, detailed = false, ...rest } = props

  const statusColors = {
    running: Colors.green,
    stopped: Colors.gray,
    error: Colors.red,
    starting: Colors.yellow
  }

  const statusIcons = {
    running: '🟢',
    stopped: '⚪',
    error: '🔴',
    starting: '🟡'
  }

  return ScrollableBox({
    ...rest,
    items: processes,
    renderItem: (proc: ProcessInfo) => vstack(
      hstack(
        text(statusIcons[proc.status] || '⚫'),
        styledText(proc.name.padEnd(20), style().foreground(Colors.cyan).bold()),
        styledText(
          `[${proc.status.toUpperCase().padEnd(8)}]`,
          style().foreground(statusColors[proc.status])
        ),
        proc.pid && styledText(`PID: ${proc.pid.toString().padEnd(8)}`, style().foreground(Colors.gray)),
        proc.uptime && styledText(`⏱️  ${proc.uptime}s`, style().foreground(Colors.blue)),
        proc.restarts !== undefined && styledText(`🔄 ${proc.restarts}`, style().foreground(Colors.yellow))
      ),
      detailed && styledText('└─ Additional details here...', style().foreground(Colors.gray))
    )
  })
}