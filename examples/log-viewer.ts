/**
 * Log Viewer - An lnav-inspired TUI for viewing and analyzing log files
 * 
 * Features:
 * - Streaming log display with auto-scroll
 * - Log level filtering (ERROR, WARN, INFO, DEBUG)
 * - Search functionality with highlighting
 * - Timestamp-based navigation
 * - Multiple log sources
 * - Export and bookmarking
 */

import { Effect, Stream, Schedule } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, styledText, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, AppOptions, KeyEvent } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { 
  textInput,
  list,
  type TextInputModel,
  type TextInputMsg,
  type ListModel,
  type ListMsg
} from "@/components/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Mock Data (simulating log entries)
// =============================================================================

interface LogEntry {
  readonly id: string
  readonly timestamp: string
  readonly level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  readonly source: string
  readonly message: string
  readonly details?: string
}

const mockLogSources = ['app.log', 'nginx.log', 'database.log', 'auth.log']

const generateLogEntry = (): LogEntry => {
  const levels: Array<LogEntry['level']> = ['ERROR', 'WARN', 'INFO', 'DEBUG']
  const sources = mockLogSources
  const messages = [
    "User authentication successful",
    "Database connection established",
    "HTTP request processed",
    "Cache miss for key user:123",
    "Failed to connect to external API",
    "Memory usage threshold exceeded",
    "Request timeout after 30s",
    "New user registration completed",
    "Email notification sent",
    "Backup process started",
    "Configuration file reloaded",
    "SSL certificate expires in 7 days"
  ]
  
  const level = levels[Math.floor(Math.random() * levels.length)]
  const source = sources[Math.floor(Math.random() * sources.length)]
  const message = messages[Math.floor(Math.random() * messages.length)]
  
  const now = new Date()
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19)
  
  return {
    id: `${now.getTime()}-${Math.random()}`,
    timestamp,
    level,
    source,
    message,
    details: level === 'ERROR' ? 'Stack trace available' : undefined
  }
}

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly logs: Array<LogEntry>
  readonly filteredLogs: Array<LogEntry>
  readonly searchInput: TextInputModel
  readonly searchTerm: string
  readonly levelFilter: Set<LogEntry['level']>
  readonly sourceFilter: string
  readonly autoScroll: boolean
  readonly selectedIndex: number
  readonly viewMode: 'list' | 'detail'
  readonly statusMessage: string
  readonly isSearching: boolean
  readonly showFilters: boolean
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "quit" }
  | { readonly tag: "searchMsg"; readonly msg: TextInputMsg }
  | { readonly tag: "addLogEntry"; readonly entry: LogEntry }
  | { readonly tag: "toggleLevel"; readonly level: LogEntry['level'] }
  | { readonly tag: "setSourceFilter"; readonly source: string }
  | { readonly tag: "toggleAutoScroll" }
  | { readonly tag: "navigateUp" }
  | { readonly tag: "navigateDown" }
  | { readonly tag: "toggleViewMode" }
  | { readonly tag: "search" }
  | { readonly tag: "clearSearch" }
  | { readonly tag: "toggleSearchMode" }
  | { readonly tag: "toggleFilters" }
  | { readonly tag: "exportLogs" }
  | { readonly tag: "keyPress"; readonly key: KeyEvent }

// =============================================================================
// Filtering Logic
// =============================================================================

const filterLogs = (logs: Array<LogEntry>, model: Model): Array<LogEntry> => {
  return logs.filter(log => {
    // Level filter
    if (!model.levelFilter.has(log.level)) return false
    
    // Source filter
    if (model.sourceFilter && !log.source.includes(model.sourceFilter)) return false
    
    // Search filter
    if (model.searchTerm) {
      const searchLower = model.searchTerm.toLowerCase()
      return log.message.toLowerCase().includes(searchLower) ||
             log.source.toLowerCase().includes(searchLower) ||
             log.level.toLowerCase().includes(searchLower)
    }
    
    return true
  })
}

const highlightText = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '🔍$1🔍')
}

// =============================================================================
// Component
// =============================================================================

// Create log generation stream outside the component  
const createLogStream = () => 
  Stream.asyncPush<{ tag: "addLogEntry", entry: LogEntry }>((emit) =>
    Effect.sync(() => {
      const interval = setInterval(() => {
        emit.single({ tag: "addLogEntry" as const, entry: generateLogEntry() })
      }, 1000)
      
      return Effect.sync(() => clearInterval(interval))
    })
  )

const logViewer: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const [searchInputModel] = yield* _(textInput({
      placeholder: "Search logs...",
      width: 40
    }).init())
    
    // Generate initial logs
    const initialLogs = Array.from({ length: 20 }, () => generateLogEntry())
    
    const model: Model = {
      logs: initialLogs,
      filteredLogs: initialLogs,
      searchInput: searchInputModel,
      searchTerm: "",
      levelFilter: new Set(['ERROR', 'WARN', 'INFO', 'DEBUG']),
      sourceFilter: "",
      autoScroll: true,
      selectedIndex: initialLogs.length - 1,
      viewMode: 'list',
      statusMessage: "Log viewer active - Press / to search, F to filter",
      isSearching: false,
      showFilters: false
    }
    
    return [model, []]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "quit":
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" as const })]])
        
      case "searchMsg": {
        const searchComponent = textInput({ placeholder: "Search logs...", width: 40 })
        return searchComponent.update(msg.msg, model.searchInput).pipe(
          Effect.map(([newSearchModel, cmds]) => {
            const newSearchTerm = newSearchModel.value
            const newFilteredLogs = filterLogs(model.logs, { ...model, searchTerm: newSearchTerm })
            
            return [
              {
                ...model,
                searchInput: newSearchModel,
                searchTerm: newSearchTerm,
                filteredLogs: newFilteredLogs,
                selectedIndex: newFilteredLogs.length > 0 ? Math.min(model.selectedIndex, newFilteredLogs.length - 1) : 0
              },
              cmds.map(cmd => cmd.pipe(
                Effect.map(searchMsg => ({ tag: "searchMsg", msg: searchMsg } as Msg))
              ))
            ]
          })
        )
      }
      
      case "addLogEntry": {
        const newLogs = [...model.logs, msg.entry]
        const newFilteredLogs = filterLogs(newLogs, model)
        
        return Effect.succeed([
          {
            ...model,
            logs: newLogs,
            filteredLogs: newFilteredLogs,
            selectedIndex: model.autoScroll ? newFilteredLogs.length - 1 : model.selectedIndex
          },
          []
        ])
      }
      
      case "toggleLevel": {
        const newLevelFilter = new Set(model.levelFilter)
        if (newLevelFilter.has(msg.level)) {
          newLevelFilter.delete(msg.level)
        } else {
          newLevelFilter.add(msg.level)
        }
        
        const newFilteredLogs = filterLogs(model.logs, { ...model, levelFilter: newLevelFilter })
        
        return Effect.succeed([
          {
            ...model,
            levelFilter: newLevelFilter,
            filteredLogs: newFilteredLogs,
            selectedIndex: newFilteredLogs.length > 0 ? Math.min(model.selectedIndex, newFilteredLogs.length - 1) : 0,
            statusMessage: `Filter ${msg.level}: ${newLevelFilter.has(msg.level) ? 'ON' : 'OFF'}`
          },
          []
        ])
      }
      
      case "navigateUp": {
        const newIndex = Math.max(0, model.selectedIndex - 1)
        return Effect.succeed([
          { ...model, selectedIndex: newIndex, autoScroll: false },
          []
        ])
      }
      
      case "navigateDown": {
        const newIndex = Math.min(model.filteredLogs.length - 1, model.selectedIndex + 1)
        return Effect.succeed([
          { ...model, selectedIndex: newIndex, autoScroll: false },
          []
        ])
      }
      
      case "toggleAutoScroll": {
        return Effect.succeed([
          { 
            ...model, 
            autoScroll: !model.autoScroll,
            statusMessage: `Auto-scroll: ${!model.autoScroll ? 'ON' : 'OFF'}`
          },
          []
        ])
      }
      
      case "toggleViewMode": {
        const newMode = model.viewMode === 'list' ? 'detail' : 'list'
        return Effect.succeed([
          { 
            ...model, 
            viewMode: newMode,
            statusMessage: `View mode: ${newMode}`
          },
          []
        ])
      }
      
      case "toggleSearchMode": {
        const newIsSearching = !model.isSearching
        
        // If entering search mode, focus the search input
        if (newIsSearching) {
          const searchComponent = textInput({ placeholder: "Search logs...", width: 40 })
          return searchComponent.update({ _tag: "Focus" }, model.searchInput).pipe(
            Effect.map(([newSearchModel, cmds]) => [
              {
                ...model,
                isSearching: newIsSearching,
                searchInput: newSearchModel,
                statusMessage: "Search mode ON - Type to search"
              },
              cmds.map(cmd => cmd.pipe(
                Effect.map(searchMsg => ({ tag: "searchMsg", msg: searchMsg } as Msg))
              ))
            ])
          )
        } else {
          // If exiting search mode, blur the search input and clear search
          const searchComponent = textInput({ placeholder: "Search logs...", width: 40 })
          return searchComponent.update({ _tag: "Blur" }, model.searchInput).pipe(
            Effect.map(([newSearchModel, cmds]) => {
              const clearedSearchInput = { ...newSearchModel, value: "" }
              const newFilteredLogs = filterLogs(model.logs, { ...model, searchTerm: "" })
              
              return [
                {
                  ...model,
                  isSearching: newIsSearching,
                  searchInput: clearedSearchInput,
                  searchTerm: "",
                  filteredLogs: newFilteredLogs,
                  statusMessage: "Search mode OFF"
                },
                cmds.map(cmd => cmd.pipe(
                  Effect.map(searchMsg => ({ tag: "searchMsg", msg: searchMsg } as Msg))
                ))
              ]
            })
          )
        }
      }
      
      case "clearSearch": {
        const clearedSearchInput = { ...model.searchInput, value: "" }
        const newFilteredLogs = filterLogs(model.logs, { ...model, searchTerm: "" })
        
        return Effect.succeed([
          {
            ...model,
            searchInput: clearedSearchInput,
            searchTerm: "",
            filteredLogs: newFilteredLogs,
            statusMessage: "Search cleared"
          },
          []
        ])
      }
      
      case "toggleFilters": {
        return Effect.succeed([
          { 
            ...model, 
            showFilters: !model.showFilters,
            statusMessage: `Filters panel: ${!model.showFilters ? 'SHOW' : 'HIDE'}`
          },
          []
        ])
      }
      
      case "exportLogs": {
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Exported ${model.filteredLogs.length} log entries (simulated)`
          },
          []
        ])
      }
      
      case "keyPress": {
        const key = msg.key
        
        // If in search mode, handle input appropriately
        if (model.isSearching) {
          // Special keys that work in search mode
          if (key.key === 'escape') {
            // Call update recursively with toggleSearchMode
            return Effect.map(
              this.update({ tag: "toggleSearchMode" }, model),
              result => result
            )
          }
          if (key.key === 'enter') {
            // Call update recursively with toggleSearchMode
            return Effect.map(
              this.update({ tag: "toggleSearchMode" }, model),
              result => result
            )
          }
          
          // Forward all other keys to search input
          const searchComponent = textInput({ placeholder: "Search logs...", width: 40 })
          const inputMsg = searchComponent.handleKey(key, model.searchInput)
          if (inputMsg) {
            // Call update recursively with searchMsg
            return Effect.map(
              this.update({ tag: "searchMsg", msg: inputMsg }, model),
              result => result
            )
          }
          
          // Key not handled by input
          return Effect.succeed([model, []])
        }
        
        // Normal mode key handling
        if (key.key === 'q') {
          return Effect.map(this.update({ tag: "quit" }, model), result => result)
        }
        
        // Navigation
        if (key.key === 'up') return Effect.map(this.update({ tag: "navigateUp" }, model), result => result)
        if (key.key === 'down') return Effect.map(this.update({ tag: "navigateDown" }, model), result => result)
        
        // Toggle functions
        if (key.key === '/') return Effect.map(this.update({ tag: "toggleSearchMode" }, model), result => result)
        if (key.key === 'f') return Effect.map(this.update({ tag: "toggleFilters" }, model), result => result)
        if (key.key === 'a') return Effect.map(this.update({ tag: "toggleAutoScroll" }, model), result => result)
        if (key.key === 'v') return Effect.map(this.update({ tag: "toggleViewMode" }, model), result => result)
        if (key.key === 'e') return Effect.map(this.update({ tag: "exportLogs" }, model), result => result)
        // ESC in normal mode does nothing
        
        // Level filters
        if (key.key === '1') return Effect.map(this.update({ tag: "toggleLevel", level: 'ERROR' }, model), result => result)
        if (key.key === '2') return Effect.map(this.update({ tag: "toggleLevel", level: 'WARN' }, model), result => result)
        if (key.key === '3') return Effect.map(this.update({ tag: "toggleLevel", level: 'INFO' }, model), result => result)
        if (key.key === '4') return Effect.map(this.update({ tag: "toggleLevel", level: 'DEBUG' }, model), result => result)
        
        return Effect.succeed([model, []])
      }
      
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view(model: Model) {
    const title = styledText("Log Viewer 📝", style().foreground(Colors.brightYellow).bold())
    const subtitle = styledText(`${model.filteredLogs.length}/${model.logs.length} entries • Auto-scroll: ${model.autoScroll ? 'ON' : 'OFF'}`, style().foreground(Colors.gray))
    
    // Create a spacer that maintains the same height as a box
    const spacer = (width: number, height: number) => {
      const lines = Array(height).fill(' '.repeat(width))
      return styledText(lines.join('\n'), style())
    }
    
    // Search bar (if in search mode) - always maintain height
    const searchBar = model.isSearching ? box(
      vstack(
        styledText("Search:", style().foreground(Colors.brightCyan)),
        textInput({ placeholder: "Search logs...", width: 40 }).view(model.searchInput)
      )
    ) : spacer(50, 4) // Same dimensions as the search box
    
    // Filter panel (if showing filters)
    const filterPanel = model.showFilters ? box(
      vstack(
        styledText("Log Level Filters:", style().foreground(Colors.brightMagenta)),
        styledText("", style()),
        hstack(
          styledText(`[${model.levelFilter.has('ERROR') ? '✓' : ' '}] ERROR`, 
               model.levelFilter.has('ERROR') ? style().foreground(Colors.brightRed) : style().foreground(Colors.gray)),
          styledText("  ", style()),
          styledText(`[${model.levelFilter.has('WARN') ? '✓' : ' '}] WARN`, 
               model.levelFilter.has('WARN') ? style().foreground(Colors.brightYellow) : style().foreground(Colors.gray))
        ),
        hstack(
          styledText(`[${model.levelFilter.has('INFO') ? '✓' : ' '}] INFO`, 
               model.levelFilter.has('INFO') ? style().foreground(Colors.brightGreen) : style().foreground(Colors.gray)),
          styledText("  ", style()),
          styledText(`[${model.levelFilter.has('DEBUG') ? '✓' : ' '}] DEBUG`, 
               model.levelFilter.has('DEBUG') ? style().foreground(Colors.brightBlue) : style().foreground(Colors.gray))
        )
      )
    ) : spacer(40, 6) // Same dimensions as the filter box
    
    // Log entries display
    const visibleLogs = model.filteredLogs.slice(Math.max(0, model.filteredLogs.length - 15))
    const logLines = visibleLogs.map((log, index) => {
      const globalIndex = model.filteredLogs.length - 15 + index
      const isSelected = globalIndex === model.selectedIndex
      
      const levelStyle = {
        'ERROR': style().foreground(Colors.brightRed),
        'WARN': style().foreground(Colors.brightYellow),
        'INFO': style().foreground(Colors.brightGreen),
        'DEBUG': style().foreground(Colors.brightBlue)
      }[log.level]
      
      const logLine = model.viewMode === 'list' 
        ? `${log.timestamp} [${log.level}] ${log.source}: ${highlightText(log.message, model.searchTerm)}`
        : `${log.timestamp}\n[${log.level}] Source: ${log.source}\nMessage: ${highlightText(log.message, model.searchTerm)}${log.details ? `\nDetails: ${log.details}` : ''}`
      
      const lineStyle = isSelected 
        ? levelStyle.background(Colors.gray)
        : levelStyle
      
      return styledText(logLine, lineStyle)
    })
    
    const logPanel = box(
      vstack(
        styledText("Log Entries", style().foreground(Colors.brightWhite)),
        styledText("", style()),
        ...logLines
      )
    )
    
    // Status bar
    const statusBar = box(
      styledText(model.statusMessage, style().foreground(Colors.white))
    )
    
    // Keybindings help
    const help = vstack(
      styledText("Keybindings:", style().foreground(Colors.yellow)),
      styledText("↑↓: Navigate  |  /: Search  |  F: Filters  |  A: Auto-scroll  |  V: View mode", style().foreground(Colors.gray)),
      styledText("1-4: Toggle log levels  |  E: Export  |  Ctrl+C: Exit", style().foreground(Colors.gray))
    )
    
    const topRow = model.isSearching && model.showFilters 
      ? hstack(searchBar, styledText("  ", style()), filterPanel)
      : model.isSearching 
        ? hstack(searchBar, styledText("  ", style()), spacer(40, 6))
        : model.showFilters 
          ? hstack(spacer(50, 4), styledText("  ", style()), filterPanel)
          : hstack(spacer(50, 4), styledText("  ", style()), spacer(40, 6))
    
    return vstack(
      title,
      subtitle,
      text(""),
      topRow,
      text(""),
      logPanel,
      text(""),
      statusBar,
      text(""),
      help
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      // Create input stream that doesn't check model.isSearching
      // Instead, we'll create a keyPress message and handle routing in update
      const inputStream = input.mapKeys(key => {
        // Always quit on Ctrl+C
        if (key.ctrl && key.key === 'ctrl+c') {
          return { tag: "quit" as const }
        }
        
        // Send all other keys as a generic keyPress message
        return { tag: "keyPress" as const, key }
      })
      
      // Create log generation stream
      const logStream = createLogStream()
      
      // Merge the streams manually
      return Stream.merge(inputStream, logStream)
    })
}

// =============================================================================
// Main
// =============================================================================

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting Log Viewer...")
console.log("This example demonstrates streaming data, filtering, and search patterns")

const program = runApp(logViewer, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })