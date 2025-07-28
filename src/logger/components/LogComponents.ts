/**
 * Logger UI Components
 *
 * Reusable components for displaying logs with proper formatting and colors
 */

import { View, text, hstack, vstack, styledText } from '@core/view'
import { style, Colors } from '@core/terminal/ansi/styles'
import type { LogLevel } from '@logger/types'

// Level colors matching the formatters
export const LEVEL_COLORS: Record<LogLevel, keyof typeof Colors> = {
  trace: 'gray',
  debug: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red',
  fatal: 'magenta',
}

// Level emojis for pretty display
export const LEVEL_EMOJIS: Record<LogLevel, string> = {
  trace: '🔍',
  debug: '🐛',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
  fatal: '💀',
}

// ANSI color codes for direct console output
export const LEVEL_ANSI: Record<LogLevel, string> = {
  trace: '\x1b[90m', // gray
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
}

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
}

/**
 * Component to display a log level with color and optional emoji
 */
export function LogLevelText({
  level,
  showEmoji = false,
  uppercase = true,
}: {
  level: LogLevel
  showEmoji?: boolean
  uppercase?: boolean
}): View {
  const color = LEVEL_COLORS[level]
  const emoji = showEmoji ? LEVEL_EMOJIS[level] + ' ' : ''
  const levelText = uppercase ? level.toUpperCase() : level

  return styledText(`${emoji}${levelText}`, style().foreground(Colors[color]))
}

/**
 * Component to display a log message with level-based coloring
 */
export function LogMessage({
  level,
  message,
  timestamp,
  context,
  showTimestamp = true,
  showContext = true,
  showEmoji = false,
}: {
  level: LogLevel
  message: string
  timestamp?: Date
  context?: string[]
  showTimestamp?: boolean
  showContext?: boolean
  showEmoji?: boolean
}): View {
  const parts: View[] = []

  // Timestamp
  if (showTimestamp && timestamp) {
    parts.push(styledText(timestamp.toISOString(), style().foreground(Colors.gray)))
  }

  // Level
  parts.push(LogLevelText({ level, showEmoji }))

  // Context
  if (showContext && context && context.length > 0) {
    parts.push(styledText(`[${context.join('.')}]`, style().foreground(Colors.blue)))
  }

  // Message
  parts.push(text(message))

  return hstack(...parts.map((part, i) => (i === 0 ? part : hstack(text(' '), part))))
}

/**
 * Component to display an error with stack trace
 */
export function LogError({
  error,
  showStack = true,
  indent = 2,
}: {
  error: Error
  showStack?: boolean
  indent?: number
}): View {
  const indentStr = ' '.repeat(indent)
  const parts: View[] = [
    styledText(`${indentStr}Error: ${error.message}`, style().foreground(Colors.red).bold()),
  ]

  if (showStack && error.stack) {
    const stackLines = error.stack.split('\n').slice(1)
    stackLines.forEach(line => {
      parts.push(styledText(indentStr + line.trim(), style().foreground(Colors.gray)))
    })
  }

  return vstack(...parts)
}

/**
 * Component to display metadata in a pretty format
 */
export function LogMetadata({
  metadata,
  indent = 2,
  compact = false,
}: {
  metadata: Record<string, any>
  indent?: number
  compact?: boolean
}): View {
  if (compact) {
    const items = Object.entries(metadata)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ')

    return styledText(items, style().foreground(Colors.gray))
  }

  return vstack(
    ...Object.entries(metadata).map(([key, value]) =>
      hstack(
        styledText(' '.repeat(indent) + key + ':', style().foreground(Colors.blue).bold()),
        text(' '),
        text(formatValue(value))
      )
    )
  )
}

/**
 * Pretty print a log entry
 */
export function PrettyLogEntry({
  level,
  message,
  timestamp = new Date(),
  context,
  error,
  metadata,
  showEmoji = true,
  showTimestamp = true,
  showContext = true,
  showMetadata = true,
}: {
  level: LogLevel
  message: string
  timestamp?: Date
  context?: string[]
  error?: Error
  metadata?: Record<string, any>
  showEmoji?: boolean
  showTimestamp?: boolean
  showContext?: boolean
  showMetadata?: boolean
}): View {
  const parts: View[] = [
    LogMessage({
      level,
      message,
      timestamp,
      context,
      showTimestamp,
      showContext,
      showEmoji,
    }),
  ]

  if (error) {
    parts.push(LogError({ error }))
  }

  if (showMetadata && metadata && Object.keys(metadata).length > 0) {
    parts.push(LogMetadata({ metadata }))
  }

  return vstack(...parts)
}

/**
 * Utility functions for console output
 */
export const logUtils = {
  /**
   * Format text with ANSI color codes
   */
  colorize(text: string, level: LogLevel): string {
    return `${LEVEL_ANSI[level]}${text}${ANSI.reset}`
  },

  /**
   * Format text with emoji
   */
  withEmoji(text: string, level: LogLevel): string {
    return `${LEVEL_EMOJIS[level]} ${text}`
  },

  /**
   * Create a colored log line
   */
  formatLogLine(
    level: LogLevel,
    message: string,
    options?: {
      showEmoji?: boolean
      showLevel?: boolean
      timestamp?: Date
      context?: string[]
    }
  ): string {
    const parts: string[] = []

    if (options?.timestamp) {
      parts.push(`${ANSI.dim}${options.timestamp.toISOString()}${ANSI.reset}`)
    }

    if (options?.showLevel !== false) {
      const levelText = level.toUpperCase().padEnd(5)
      const emoji = options?.showEmoji ? LEVEL_EMOJIS[level] + ' ' : ''
      parts.push(`${LEVEL_ANSI[level]}${emoji}${levelText}${ANSI.reset}`)
    }

    if (options?.context && options.context.length > 0) {
      parts.push(`${ANSI.dim}[${options.context.join('.')}]${ANSI.reset}`)
    }

    parts.push(message)

    return parts.join(' ')
  },

  /**
   * Quick logging with proper formatting - uses stdout/stderr directly to avoid logger circular dependencies
   */
  trace: (message: string) =>
    process.stdout.write(logUtils.formatLogLine('trace', message, { showEmoji: true }) + '\n'),
  debug: (message: string) =>
    process.stdout.write(logUtils.formatLogLine('debug', message, { showEmoji: true }) + '\n'),
  info: (message: string) =>
    process.stdout.write(logUtils.formatLogLine('info', message, { showEmoji: true }) + '\n'),
  warn: (message: string) =>
    process.stderr.write(logUtils.formatLogLine('warn', message, { showEmoji: true }) + '\n'),
  error: (message: string) =>
    process.stderr.write(logUtils.formatLogLine('error', message, { showEmoji: true }) + '\n'),
  fatal: (message: string) =>
    process.stderr.write(logUtils.formatLogLine('fatal', message, { showEmoji: true }) + '\n'),
}

// Helper to format values
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value, null, 2)
}
