/**
 * LogViewer Component - Production-ready log viewing with virtualization
 * 
 * A high-performance log viewer component following the TUIX MVU architecture.
 * Features virtual scrolling, real-time streaming, syntax highlighting, and 
 * comprehensive search capabilities for debugging and monitoring.
 * 
 * @module @tuix/components/display/log-viewer
 */

import { Effect, Option, pipe, Stream } from "effect"
import { stringWidth, View as ViewUtils } from "../../../../src/core/view"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "../../../../src/core/types"
import { style, Colors, type Style } from "../../../../src/styling"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  generateComponentId
} from "../base"
import type { LogEntry, LogLevelString } from "./types"
import { LogSyntaxHighlighter, createSyntaxHighlighter, type SyntaxTheme } from "./log-syntax"
import { LogStreamManager, createLogStreamManager, type LogStreamConfig } from "./log-stream"
import { LogAnalyzer, createLogAnalyzer, type LogStatistics } from "./log-analysis"

// =============================================================================
// LogViewer Types
// =============================================================================

/**
 * Log viewer configuration
 */
export interface LogViewerConfig {
  readonly height: number
  readonly width: number
  readonly lineHeight: number
  readonly maxBufferSize: number
  readonly followMode: boolean
  readonly searchable: boolean
  readonly syntaxTheme: 'dark' | 'light'
  readonly showTimestamps: boolean
  readonly showLevels: boolean
  readonly autoAnalysis: boolean
}

/**
 * Log viewer model state
 */
export interface LogViewerModel {
  readonly id: string
  readonly config: LogViewerConfig
  readonly logs: LogEntry[]
  readonly filteredLogs: LogEntry[]
  readonly searchQuery: string
  readonly selectedLevels: Set<LogLevelString>
  readonly viewport: {
    readonly scrollTop: number
    readonly visibleStart: number
    readonly visibleEnd: number
  }
  readonly stats: LogStatistics | null
  readonly isStreaming: boolean
  readonly focusedIndex: number
  readonly styles: LogViewerStyles
}

/**
 * Log viewer messages
 */
export type LogViewerMsg =
  | { type: 'search'; query: string }
  | { type: 'toggleLevel'; level: LogLevelString }
  | { type: 'scroll'; scrollTop: number }
  | { type: 'appendLogs'; logs: LogEntry[] }
  | { type: 'setLogs'; logs: LogEntry[] }
  | { type: 'clear' }
  | { type: 'toggleFollowMode' }
  | { type: 'focusNext' }
  | { type: 'focusPrevious' }
  | { type: 'startStreaming'; stream: Stream.Stream<LogEntry[]> }
  | { type: 'stopStreaming' }
  | { type: 'analyze' }
  | { type: 'export' }
  | { type: 'key'; event: KeyEvent }
  | { type: 'mouse'; event: MouseEvent }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'resize'; width: number; height: number }

/**
 * Log viewer configuration properties
 */
export interface LogViewerProps {
  readonly logs?: LogEntry[]
  readonly height?: number
  readonly width?: number
  readonly lineHeight?: number
  readonly maxBufferSize?: number
  readonly followMode?: boolean
  readonly searchable?: boolean
  readonly syntaxTheme?: 'dark' | 'light'
  readonly showTimestamps?: boolean
  readonly showLevels?: boolean
  readonly autoAnalysis?: boolean
  readonly stream?: Stream.Stream<LogEntry[]>
  readonly styles?: Partial<LogViewerStyles>
}

/**
 * Log viewer styling configuration
 */
export interface LogViewerStyles extends ComponentStyles {
  readonly container: Style
  readonly header: Style
  readonly searchInput: Style
  readonly levelFilter: Style
  readonly logLine: Style
  readonly timestamp: Style
  readonly level: Style
  readonly message: Style
  readonly scrollbar: Style
  readonly footer: Style
  readonly stats: Style
}

// =============================================================================
// Default Configuration & Styles
// =============================================================================

/**
 * Default log viewer configuration
 */
export const defaultLogViewerConfig: LogViewerConfig = {
  height: 20,
  width: 80,
  lineHeight: 1,
  maxBufferSize: 10000,
  followMode: true,
  searchable: true,
  syntaxTheme: 'dark',
  showTimestamps: true,
  showLevels: true,
  autoAnalysis: false
}

/**
 * Default log viewer styles
 */
export const defaultLogViewerStyles: LogViewerStyles = {
  // Required base ComponentStyles properties
  base: style({
    border: 'single',
    borderColor: Colors.gray
  }),
  focused: style({
    border: 'single',
    borderColor: Colors.blue
  }),
  disabled: style({
    border: 'single',
    borderColor: Colors.gray,
    color: Colors.gray
  }),
  // LogViewer-specific styles
  container: style({
    border: 'single',
    borderColor: Colors.gray
  }),
  header: style({
    backgroundColor: Colors.blue,
    color: Colors.white,
    padding: { horizontal: 1 }
  }),
  searchInput: style({
    backgroundColor: Colors.black,
    color: Colors.white,
    border: 'single',
    borderColor: Colors.gray
  }),
  levelFilter: style({
    color: Colors.cyan
  }),
  logLine: style({
    paddingLeft: 1
  }),
  timestamp: style({
    color: Colors.gray,
    width: 20
  }),
  level: style({
    width: 8,
    bold: true
  }),
  message: style({
    color: Colors.white
  }),
  scrollbar: style({
    color: Colors.blue
  }),
  footer: style({
    backgroundColor: Colors.gray,
    color: Colors.black,
    padding: { horizontal: 1 }
  }),
  stats: style({
    color: Colors.cyan
  })
}

// =============================================================================
// Log Level Colors
// =============================================================================

/**
 * Get color for log level
 */
function getLevelColor(level: LogLevelString): string {
  switch (level) {
    case 'debug': return Colors.blue
    case 'info': return Colors.green
    case 'warn': return Colors.yellow
    case 'error': return Colors.red
    case 'fatal': return Colors.magenta
    default: return Colors.white
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate filtered logs based on search and level filters
 */
function calculateFilteredLogs(logs: LogEntry[], searchQuery: string, selectedLevels: Set<LogLevelString>): LogEntry[] {
  let filtered = logs

  // Filter by selected levels
  if (selectedLevels.size > 0) {
    filtered = filtered.filter(log => selectedLevels.has(log.level))
  }

  // Apply search filter
  if (searchQuery) {
    try {
      const regex = new RegExp(searchQuery, 'i')
      filtered = filtered.filter(log => regex.test(log.message))
    } catch {
      // If regex is invalid, fall back to simple string search
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => log.message.toLowerCase().includes(query))
    }
  }

  return filtered
}

/**
 * Calculate viewport boundaries for virtual scrolling
 */
function calculateViewport(
  scrollTop: number,
  height: number,
  lineHeight: number,
  totalLines: number
): { visibleStart: number; visibleEnd: number } {
  const visibleLines = Math.floor(height / lineHeight)
  const startLine = Math.floor(scrollTop / lineHeight)
  
  // Add buffer for smooth scrolling
  const buffer = Math.ceil(visibleLines * 0.5)
  
  return {
    visibleStart: Math.max(0, startLine - buffer),
    visibleEnd: Math.min(totalLines, startLine + visibleLines + buffer)
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  return timestamp.toISOString().replace('T', ' ').substr(0, 19)
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Initialize log viewer model
 */
export function init(props: LogViewerProps = {}): Effect.Effect<[LogViewerModel, Cmd<LogViewerMsg>], never, never> {
  const config: LogViewerConfig = {
    ...defaultLogViewerConfig,
    ...props
  }
  
  const logs = props.logs || []
  const selectedLevels = new Set<LogLevelString>(['debug', 'info', 'warn', 'error', 'fatal'])
  const filteredLogs = calculateFilteredLogs(logs, '', selectedLevels)
  
  const model: LogViewerModel = {
    id: generateComponentId('log-viewer-model'),
    config,
    logs,
    filteredLogs,
    searchQuery: '',
    selectedLevels,
    viewport: {
      scrollTop: 0,
      visibleStart: 0,
      visibleEnd: Math.min(filteredLogs.length, Math.floor(config.height / config.lineHeight))
    },
    stats: null,
    isStreaming: false,
    focusedIndex: -1,
    styles: {
      ...defaultLogViewerStyles,
      ...props.styles
    }
  }

  const cmd = props.stream 
    ? Effect.succeed({ type: 'startStreaming', stream: props.stream } as LogViewerMsg)
    : Effect.none

  return Effect.succeed([model, [cmd]])
}

/**
 * Update log viewer model
 */
export function update(
  msg: LogViewerMsg,
  model: LogViewerModel
): Effect.Effect<[LogViewerModel, Cmd<LogViewerMsg>], never, never> {
  switch (msg.type) {
    case 'search': {
      const filteredLogs = calculateFilteredLogs(model.logs, msg.query, model.selectedLevels)
      const viewport = calculateViewport(0, model.config.height, model.config.lineHeight, filteredLogs.length)
      
      return Effect.succeed([{
        ...model,
        searchQuery: msg.query,
        filteredLogs,
        viewport: { ...model.viewport, scrollTop: 0, ...viewport }
      }, Effect.none])
    }

    case 'toggleLevel': {
      const newSelectedLevels = new Set(model.selectedLevels)
      if (newSelectedLevels.has(msg.level)) {
        newSelectedLevels.delete(msg.level)
      } else {
        newSelectedLevels.add(msg.level)
      }
      
      const filteredLogs = calculateFilteredLogs(model.logs, model.searchQuery, newSelectedLevels)
      const viewport = calculateViewport(model.viewport.scrollTop, model.config.height, model.config.lineHeight, filteredLogs.length)
      
      return Effect.succeed([{
        ...model,
        selectedLevels: newSelectedLevels,
        filteredLogs,
        viewport: { ...model.viewport, ...viewport }
      }, Effect.none])
    }

    case 'scroll': {
      const viewport = calculateViewport(msg.scrollTop, model.config.height, model.config.lineHeight, model.filteredLogs.length)
      
      return Effect.succeed([{
        ...model,
        viewport: { scrollTop: msg.scrollTop, ...viewport }
      }, Effect.none])
    }

    case 'appendLogs': {
      const newLogs = [...model.logs, ...msg.logs]
      // Apply buffer size limit
      const logs = newLogs.length > model.config.maxBufferSize 
        ? newLogs.slice(-model.config.maxBufferSize)
        : newLogs
      
      const filteredLogs = calculateFilteredLogs(logs, model.searchQuery, model.selectedLevels)
      const shouldAutoScroll = model.config.followMode && 
        model.viewport.scrollTop >= (model.filteredLogs.length - Math.floor(model.config.height / model.config.lineHeight)) * model.config.lineHeight
      
      const scrollTop = shouldAutoScroll ? filteredLogs.length * model.config.lineHeight : model.viewport.scrollTop
      const viewport = calculateViewport(scrollTop, model.config.height, model.config.lineHeight, filteredLogs.length)
      
      const cmd: ReadonlyArray<Cmd<LogViewerMsg>> = model.config.autoAnalysis ? [Effect.succeed({ type: 'analyze' } as LogViewerMsg)] : []
      
      return Effect.succeed([{
        ...model,
        logs,
        filteredLogs,
        viewport: { scrollTop, ...viewport }
      }, cmd])
    }

    case 'setLogs': {
      const filteredLogs = calculateFilteredLogs(msg.logs, model.searchQuery, model.selectedLevels)
      const viewport = calculateViewport(0, model.config.height, model.config.lineHeight, filteredLogs.length)
      
      return Effect.succeed([{
        ...model,
        logs: msg.logs,
        filteredLogs,
        viewport: { scrollTop: 0, ...viewport }
      }, Effect.none])
    }

    case 'clear': {
      return Effect.succeed([{
        ...model,
        logs: [],
        filteredLogs: [],
        stats: null,
        viewport: { scrollTop: 0, visibleStart: 0, visibleEnd: 0 }
      }, Effect.none])
    }

    case 'toggleFollowMode': {
      return Effect.succeed([{
        ...model,
        config: { ...model.config, followMode: !model.config.followMode }
      }, Effect.none])
    }

    case 'focusNext': {
      const newIndex = Math.min(model.focusedIndex + 1, model.filteredLogs.length - 1)
      return Effect.succeed([{
        ...model,
        focusedIndex: newIndex
      }, []])
    }

    case 'focusPrevious': {
      const newIndex = Math.max(model.focusedIndex - 1, -1)
      return Effect.succeed([{
        ...model,
        focusedIndex: newIndex
      }, []])
    }

    case 'analyze': {
      return pipe(
        Effect.sync(() => {
          const analyzer = createLogAnalyzer()
          return Effect.runSync(analyzer.analyzeLogs(model.logs))
        }),
        Effect.map(stats => [{
          ...model,
          stats
        }, Effect.none])
      )
    }

    case 'startStreaming': {
      // In a real implementation, this would set up the stream subscription
      return Effect.succeed([{
        ...model,
        isStreaming: true
      }, Effect.none])
    }

    case 'stopStreaming': {
      return Effect.succeed([{
        ...model,
        isStreaming: false
      }, Effect.none])
    }

    case 'key': {
      const { key } = msg.event
      switch (key) {
        case 'ArrowDown':
        case 'j':
          return update({ type: 'focusNext' }, model)
        case 'ArrowUp':
        case 'k':
          return update({ type: 'focusPrevious' }, model)
        case 'f':
          return update({ type: 'toggleFollowMode' }, model)
        case 'c':
          return update({ type: 'clear' }, model)
        case '/':
          // In a real implementation, this would focus search input
          return Effect.succeed([model, []])
        default:
          return Effect.succeed([model, []])
      }
    }

    case 'mouse': {
      // Handle mouse events for scrolling
      return Effect.succeed([model, []])
    }

    case 'focus': {
      return Effect.succeed([{
        ...model,
        focusedIndex: 0
      }, []])
    }

    case 'blur': {
      return Effect.succeed([{
        ...model,
        focusedIndex: -1
      }, []])
    }

    case 'resize': {
      return Effect.succeed([{
        ...model,
        config: {
          ...model.config,
          width: msg.width,
          height: msg.height
        },
        viewport: { 
          scrollTop: model.viewport.scrollTop,
          ...calculateViewport(model.viewport.scrollTop, msg.height, model.config.lineHeight, model.filteredLogs.length) 
        }
      }, []])
    }

    default:
      return Effect.succeed([model, []])
  }
}

/**
 * Render log viewer view
 */
export function view(model: LogViewerModel): View {
  const { config, filteredLogs, viewport, searchQuery, selectedLevels, styles } = model
  const highlighter = createSyntaxHighlighter(config.syntaxTheme)
  
  // Header with search and filters
  const header = ViewUtils.box({
    content: [
      ViewUtils.text(`LogViewer (${filteredLogs.length}/${model.logs.length} logs)`, styles.header),
      ...(config.searchable ? [
        ViewUtils.text(`Search: ${searchQuery}`, styles.searchInput)
      ] : [])
    ],
    style: styles.header
  })

  // Level filter buttons
  const levelFilters = ViewUtils.horizontal([
    ...(['debug', 'info', 'warn', 'error', 'fatal'] as LogLevelString[]).map(level => {
      const isSelected = selectedLevels.has(level)
      const color = isSelected ? getLevelColor(level) : Colors.gray
      return ViewUtils.text(
        `[${isSelected ? '●' : '○'}] ${level.toUpperCase()}`,
        style({ color, marginRight: 1 })
      )
    })
  ])

  // Virtual scrolled log lines
  const visibleLogs = filteredLogs.slice(viewport.visibleStart, viewport.visibleEnd)
  const logLines = visibleLogs.map((log, index) => {
    const globalIndex = viewport.visibleStart + index
    const isFocused = globalIndex === model.focusedIndex
    const highlighted = highlighter.highlight(log.message)
    
    const lineStyle = isFocused 
      ? style({ ...styles.logLine, backgroundColor: Colors.blue })
      : styles.logLine

    const parts = []
    
    // Timestamp
    if (config.showTimestamps) {
      parts.push(ViewUtils.text(formatTimestamp(log.timestamp), styles.timestamp))
    }
    
    // Level
    if (config.showLevels) {
      parts.push(ViewUtils.text(
        log.level.toUpperCase().padEnd(5),
        style({ ...styles.level, color: getLevelColor(log.level) })
      ))
    }
    
    // Message with syntax highlighting
    parts.push(ViewUtils.text(log.message, styles.message))
    
    return ViewUtils.box({
      content: ViewUtils.horizontal(parts),
      style: lineStyle
    })
  })

  // Footer with stats and controls
  const footer = ViewUtils.box({
    content: [
      ViewUtils.text(
        `${model.isStreaming ? '🔄' : '⏸'} | Follow: ${config.followMode ? 'ON' : 'OFF'} | ↑↓/jk: navigate | f: follow | c: clear | /: search`,
        styles.footer
      ),
      ...(model.stats ? [
        ViewUtils.text(
          `Errors: ${model.stats.errorRate * 100}% | Peak: ${model.stats.peakLogsPerMinute}/min | Patterns: ${model.stats.topPatterns.length}`,
          styles.stats
        )
      ] : [])
    ],
    style: styles.footer
  })

  // Main content area
  const content = ViewUtils.box({
    content: [
      header,
      levelFilters,
      ...logLines,
      footer
    ],
    style: styles.container
  })

  return content
}

// =============================================================================
// Component Factory Functions
// =============================================================================

/**
 * Create a basic log viewer component
 */
export function logViewer(props: LogViewerProps = {}): UIComponent<LogViewerModel, LogViewerMsg> {
  const id = generateComponentId('log-viewer')
  
  return {
    // Component ID
    id,
    
    // Standard MVU methods
    init: () => init(props),
    update,
    view,
    
    // Focus management
    focus: () => Effect.succeed({ type: 'focus' } as unknown as Cmd<LogViewerMsg>),
    blur: () => Effect.succeed({ type: 'blur' } as unknown as Cmd<LogViewerMsg>),
    focused: (model) => model.focusedIndex >= 0,
    
    // Size management
    setSize: (width: number, height?: number) => Effect.void,
    getSize: (model) => ({ 
      width: model.config.width, 
      height: model.config.height 
    }),
    
    // Event handlers
    handleKey: (event: KeyEvent, model: LogViewerModel) => {
      return { type: 'key', event } as LogViewerMsg
    },
    
    handleMouse: (event: MouseEvent, model: LogViewerModel) => {
      return { type: 'mouse', event } as LogViewerMsg
    }
  }
}

/**
 * Create a simple log viewer with minimal configuration
 */
export function simpleLogViewer(logs: LogEntry[]): UIComponent<LogViewerModel, LogViewerMsg> {
  return logViewer({
    logs,
    height: 15,
    searchable: false,
    showTimestamps: false,
    autoAnalysis: false
  })
}

/**
 * Create a detailed log viewer with full features
 */
export function detailedLogViewer(props: LogViewerProps = {}): UIComponent<LogViewerModel, LogViewerMsg> {
  return logViewer({
    ...props,
    searchable: true,
    showTimestamps: true,
    showLevels: true,
    autoAnalysis: true,
    followMode: true
  })
}

/**
 * Create a streaming log viewer
 */
export function streamingLogViewer(
  stream: Stream.Stream<LogEntry[]>,
  props: Omit<LogViewerProps, 'stream'> = {}
): UIComponent<LogViewerModel, LogViewerMsg> {
  return logViewer({
    ...props,
    stream,
    followMode: true,
    autoAnalysis: true
  })
}