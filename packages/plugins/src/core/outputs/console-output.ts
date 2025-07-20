/**
 * Console Log Output
 * 
 * This module provides console/terminal output for logs with formatting,
 * colors, and level-specific handling.
 * 
 * @module plugins/core/outputs/console-output
 */

import type { LogOutput, LogEntry, LoggerConfig, LogFormat } from '../types'

/**
 * Console output implementation with formatting and colors
 */
export class ConsoleLogOutput implements LogOutput {
  private config: LoggerConfig
  private useColors: boolean
  private minLevel: string

  constructor(config: LoggerConfig) {
    this.config = config
    this.useColors = config.console?.colors ?? true
    this.minLevel = config.console?.level ?? config.level
  }

  /**
   * Initialize console output (no setup needed)
   */
  async initialize(): Promise<void> {
    // Console output needs no initialization
  }

  /**
   * Write log entry to console
   */
  write(entry: LogEntry): void {
    const formatted = this.format(entry)
    
    switch (entry.level) {
      case 'error':
      case 'fatal':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }
  }

  /**
   * Check if entry should be logged to console
   */
  shouldLog(entry: LogEntry): boolean {
    const levelOrder = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 }
    const entryLevel = levelOrder[entry.level]
    const minLevel = levelOrder[this.minLevel as keyof typeof levelOrder]
    
    return entryLevel >= minLevel
  }

  /**
   * Cleanup console output (no cleanup needed)
   */
  async destroy(): Promise<void> {
    // Console output needs no cleanup
  }

  /**
   * Format log entry for console output
   */
  private format(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return this.formatJson(entry)
      
      case 'structured':
        return this.formatStructured(entry)
      
      case 'text':
      default:
        return this.formatText(entry)
    }
  }

  /**
   * Format as JSON
   */
  private formatJson(entry: LogEntry): string {
    const output = JSON.stringify(entry)
    return this.useColors ? this.colorize(output, entry.level) : output
  }

  /**
   * Format as structured text
   */
  private formatStructured(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const message = entry.message
    const metadata = Object.keys(entry.metadata).length > 0 
      ? ` ${JSON.stringify(entry.metadata)}`
      : ''
    
    const output = `[${timestamp}] ${level}: ${message}${metadata}`
    return this.useColors ? this.colorize(output, entry.level) : output
  }

  /**
   * Format as simple text
   */
  private formatText(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase()
    const output = `[${timestamp}] ${level}: ${entry.message}`
    
    return this.useColors ? this.colorize(output, entry.level) : output
  }

  /**
   * Add ANSI colors based on log level
   */
  private colorize(text: string, level: string): string {
    if (!this.useColors) {
      return text
    }

    const colors = {
      debug: '\x1b[90m',    // Gray
      info: '\x1b[36m',     // Cyan
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      fatal: '\x1b[35m',    // Magenta
      reset: '\x1b[0m',     // Reset
    }

    const color = colors[level as keyof typeof colors] || colors.info
    return `${color}${text}${colors.reset}`
  }

  /**
   * Get output configuration
   */
  getConfig() {
    return {
      type: 'console',
      useColors: this.useColors,
      minLevel: this.minLevel,
      format: this.config.format,
    }
  }

  /**
   * Update output configuration
   */
  updateConfig(updates: Partial<{ colors: boolean; level: string }>) {
    if (updates.colors !== undefined) {
      this.useColors = updates.colors
    }
    
    if (updates.level !== undefined) {
      this.minLevel = updates.level
    }
  }
}