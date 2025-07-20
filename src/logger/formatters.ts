/**
 * Log Formatters
 * 
 * Various formatters for different output styles
 */

import type { LogEntry, LogFormatter, LogLevel } from "./types"
import { stripAnsi } from "../utils/ansi"

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "\x1b[90m",    // gray
  debug: "\x1b[36m",    // cyan
  info: "\x1b[32m",     // green
  warn: "\x1b[33m",     // yellow
  error: "\x1b[31m",    // red
  fatal: "\x1b[35m"     // magenta
}

const LEVEL_EMOJIS: Record<LogLevel, string> = {
  trace: "🔍",
  debug: "🐛",
  info: "ℹ️ ",
  warn: "⚠️ ",
  error: "❌",
  fatal: "💀"
}

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const ITALIC = "\x1b[3m"

export class PrettyFormatter implements LogFormatter {
  constructor(
    private options: {
      colorize?: boolean
      showTimestamp?: boolean
      showLevel?: boolean
      showEmoji?: boolean
      showContext?: boolean
      showMetadata?: boolean
      showSource?: boolean
      timestampFormat?: "iso" | "unix" | "relative" | ((date: Date) => string)
      indentSize?: number
    } = {}
  ) {
    this.options = {
      colorize: true,
      showTimestamp: true,
      showLevel: true,
      showEmoji: false,
      showContext: true,
      showMetadata: true,
      showSource: false,
      timestampFormat: "iso",
      indentSize: 2,
      ...options
    }
  }

  format(entry: LogEntry): string {
    const parts: string[] = []
    const { colorize } = this.options

    // Timestamp
    if (this.options.showTimestamp) {
      const timestamp = this.formatTimestamp(entry.timestamp)
      parts.push(colorize ? `${DIM}${timestamp}${RESET}` : timestamp)
    }

    // Level with emoji
    if (this.options.showLevel) {
      const level = entry.level.toUpperCase().padEnd(5)
      const levelColor = colorize ? LEVEL_COLORS[entry.level] : ""
      const emoji = this.options.showEmoji ? LEVEL_EMOJIS[entry.level] + " " : ""
      parts.push(`${levelColor}${emoji}${level}${colorize ? RESET : ""}`)
    }

    // Context
    if (this.options.showContext && entry.context?.length) {
      const context = entry.context.join(".")
      parts.push(colorize ? `${DIM}[${context}]${RESET}` : `[${context}]`)
    }

    // Main message
    parts.push(entry.message)

    // Error
    if (entry.error) {
      parts.push("\n" + this.formatError(entry.error, colorize))
    }

    // Metadata as pretty JSON
    if (this.options.showMetadata && entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push("\n" + this.formatMetadata(entry.metadata, colorize))
    }

    // Source info
    if (this.options.showSource && entry.src) {
      const src = `${entry.src.file}:${entry.src.line}${entry.src.func ? ` (${entry.src.func})` : ""}`
      parts.push(colorize ? `${DIM}${src}${RESET}` : src)
    }

    return parts.join(" ")
  }

  private formatTimestamp(date: Date): string {
    const { timestampFormat } = this.options

    if (typeof timestampFormat === "function") {
      return timestampFormat(date)
    }

    switch (timestampFormat) {
      case "unix":
        return String(Math.floor(date.getTime() / 1000))
      case "relative":
        return this.getRelativeTime(date)
      case "iso":
      default:
        return date.toISOString()
    }
  }

  private getRelativeTime(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 1000) return "now"
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  private formatError(error: Error, colorize: boolean): string {
    const indent = " ".repeat(this.options.indentSize || 2)
    const lines: string[] = []
    
    lines.push(`${indent}${colorize ? BOLD : ""}Error: ${error.message}${colorize ? RESET : ""}`)
    
    if (error.stack) {
      const stackLines = error.stack.split("\n").slice(1) // Skip first line (already shown message)
      stackLines.forEach(line => {
        if (colorize) {
          // Highlight file paths
          line = line.replace(/\(([^)]+)\)/, `(${DIM}$1${RESET})`)
          // Highlight function names
          line = line.replace(/at (\S+)/, `at ${ITALIC}$1${RESET}`)
        }
        lines.push(indent + line.trim())
      })
    }
    
    return lines.join("\n")
  }

  private formatMetadata(metadata: Record<string, any>, colorize: boolean): string {
    return this.formatJSON(metadata, colorize, 1)
  }

  private formatJSON(obj: any, colorize: boolean, depth: number = 0): string {
    const indent = " ".repeat((this.options.indentSize || 2) * depth)
    const nextIndent = " ".repeat((this.options.indentSize || 2) * (depth + 1))
    
    if (obj === null) return colorize ? `${DIM}null${RESET}` : "null"
    if (obj === undefined) return colorize ? `${DIM}undefined${RESET}` : "undefined"
    
    const type = typeof obj
    
    if (type === "string") {
      return colorize ? `${LEVEL_COLORS.info}"${obj}"${RESET}` : `"${obj}"`
    }
    
    if (type === "number") {
      return colorize ? `${LEVEL_COLORS.warn}${obj}${RESET}` : String(obj)
    }
    
    if (type === "boolean") {
      return colorize ? `${LEVEL_COLORS.debug}${obj}${RESET}` : String(obj)
    }
    
    if (obj instanceof Date) {
      return colorize ? `${LEVEL_COLORS.trace}${obj.toISOString()}${RESET}` : obj.toISOString()
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]"
      
      const items = obj.map(item => 
        nextIndent + this.formatJSON(item, colorize, depth + 1)
      ).join(",\n")
      
      return `[\n${items}\n${indent}]`
    }
    
    if (type === "object") {
      const keys = Object.keys(obj)
      if (keys.length === 0) return "{}"
      
      const items = keys.map(key => {
        const formattedKey = colorize ? `${BOLD}${key}${RESET}` : key
        const value = this.formatJSON(obj[key], colorize, depth + 1)
        return `${nextIndent}${formattedKey}: ${value}`
      }).join(",\n")
      
      return `{\n${items}\n${indent}}`
    }
    
    return String(obj)
  }
}

export class JSONFormatter implements LogFormatter {
  constructor(
    private options: {
      pretty?: boolean
      indent?: number
    } = {}
  ) {}

  format(entry: LogEntry): string {
    const obj: any = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      ...(entry.name && { name: entry.name }),
      ...(entry.hostname && { hostname: entry.hostname }),
      ...(entry.pid && { pid: entry.pid }),
      ...(entry.v !== undefined && { v: entry.v }),
      ...(entry.context?.length && { context: entry.context }),
      ...(entry.error && { 
        error: {
          message: entry.error.message,
          name: entry.error.name,
          stack: entry.error.stack
        }
      }),
      ...(entry.span && { span: entry.span }),
      ...(entry.src && { src: entry.src }),
      ...(entry.metadata && { ...entry.metadata })
    }

    if (this.options.pretty) {
      return JSON.stringify(obj, null, this.options.indent || 2)
    }
    
    return JSON.stringify(obj)
  }
}

export class CompactFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const parts: string[] = []
    
    // Timestamp in compact format
    parts.push(entry.timestamp.toISOString().replace("T", " ").slice(0, -5))
    
    // Level
    parts.push(entry.level.toUpperCase())
    
    // Context if present
    if (entry.context?.length) {
      parts.push(`[${entry.context.join(".")}]`)
    }
    
    // Message
    parts.push(entry.message)
    
    // Error message only
    if (entry.error) {
      parts.push(`ERROR: ${entry.error.message}`)
    }
    
    // Compact metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metaStr = Object.entries(entry.metadata)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ")
      parts.push(metaStr)
    }
    
    return parts.join(" | ")
  }
}

export class CLIFormatter implements LogFormatter {
  constructor(
    private options: {
      colorize?: boolean
      maxWidth?: number
    } = {}
  ) {
    this.options = {
      colorize: true,
      maxWidth: process.stdout.columns || 80,
      ...options
    }
  }

  format(entry: LogEntry): string {
    const { colorize, maxWidth = 80 } = this.options
    const levelColor = colorize ? LEVEL_COLORS[entry.level] : ""
    const emoji = LEVEL_EMOJIS[entry.level]
    
    // Build the prefix
    const prefix = `${emoji} ${levelColor}${entry.level.toUpperCase()}${colorize ? RESET : ""}`
    
    // Format the message to fit within maxWidth
    const prefixLength = stripAnsi(prefix).length + 1
    const messageWidth = maxWidth - prefixLength
    
    const wrappedMessage = this.wrapText(entry.message, messageWidth)
    const firstLine = wrappedMessage[0]! || ""
    const restLines = wrappedMessage.slice(1).map(line => 
      " ".repeat(prefixLength) + line
    ).join("\n")
    
    let output = `${prefix} ${firstLine}`
    if (restLines) {
      output += "\n" + restLines
    }
    
    // Add metadata in a compact format
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metaLine = this.formatMetadataLine(entry.metadata, colorize)
      output += "\n" + " ".repeat(prefixLength) + metaLine
    }
    
    return output
  }

  private wrapText(text: string, width: number): string[] {
    if (text.length <= width) return [text]
    
    const lines: string[] = []
    const words = text.split(" ")
    let currentLine = ""
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? " " : "") + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    
    if (currentLine) lines.push(currentLine)
    return lines
  }

  private formatMetadataLine(metadata: Record<string, any>, colorize: boolean): string {
    const items = Object.entries(metadata).map(([key, value]) => {
      const formattedValue = typeof value === "string" ? value : JSON.stringify(value)
      return colorize 
        ? `${DIM}${key}=${RESET}${formattedValue}`
        : `${key}=${formattedValue}`
    })
    
    return items.join(" ")
  }
}