/**
 * Debug System
 *
 * Centralized debug logging that collects information for structured display
 */

import { Effect, Ref } from 'effect'

export interface DebugEntry {
  timestamp: Date
  category: string
  message: string
  data?: unknown
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
}

export interface DebugCategory {
  name: string
  enabled: boolean
  color?: string
  entries: DebugEntry[]
}

// Global debug state
const debugCategories = new Map<string, DebugCategory>()
const debugEnabled = process.env.TUIX_DEBUG === 'true'

/**
 * Creates a debug logger for a specific category.
 *
 * @param category - The category name for grouping debug messages
 * @param options - Optional configuration for the logger
 * @param options.enabled - Whether this category is enabled (defaults to TUIX_DEBUG env var)
 * @param options.color - ANSI color code for console output (e.g., '36' for cyan)
 * @returns Debug logger with methods for each log level
 *
 * @example
 * ```typescript
 * const debug = createDebugLogger('my-module', { color: '36' })
 * debug.info('Operation started')
 * debug.error('Operation failed', { errorCode: 500 })
 * ```
 */
export function createDebugLogger(
  category: string,
  options?: {
    enabled?: boolean
    color?: string
  }
) {
  if (!debugCategories.has(category)) {
    debugCategories.set(category, {
      name: category,
      enabled: options?.enabled ?? debugEnabled,
      color: options?.color,
      entries: [],
    })
  }

  const log = (level: DebugEntry['level']) => (message: string, data?: unknown) => {
    const cat = debugCategories.get(category)
    if (!cat?.enabled) return

    cat.entries.push({
      timestamp: new Date(),
      category,
      message,
      data,
      level,
    })

    // In verbose mode, also log to console
    if (process.env.TUIX_DEBUG_VERBOSE === 'true') {
      const prefix = `[${category}]`
      const coloredPrefix = cat.color ? `\x1b[${cat.color}m${prefix}\x1b[0m` : prefix
      console.log(`${coloredPrefix} ${message}`, data ?? '')
    }
  }

  return {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  }
}

/**
 * Retrieves debug entries for a specific category or all categories.
 *
 * @param category - Optional category name to filter entries. If omitted, returns all entries.
 * @returns Array of debug entries sorted by timestamp
 *
 * @example
 * ```typescript
 * // Get entries for specific category
 * const scopeLogs = getDebugEntries('scope')
 *
 * // Get all entries across all categories
 * const allLogs = getDebugEntries()
 * ```
 */
export function getDebugEntries(category?: string): DebugEntry[] {
  if (category) {
    return debugCategories.get(category)?.entries ?? []
  }

  // Return all entries sorted by timestamp
  const allEntries: DebugEntry[] = []
  for (const cat of debugCategories.values()) {
    allEntries.push(...cat.entries)
  }
  return allEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Clears debug entries for a specific category or all categories.
 *
 * @param category - Optional category name to clear. If omitted, clears all categories.
 *
 * @example
 * ```typescript
 * // Clear specific category
 * clearDebugEntries('scope')
 *
 * // Clear all categories
 * clearDebugEntries()
 * ```
 */
export function clearDebugEntries(category?: string): void {
  if (category) {
    const cat = debugCategories.get(category)
    if (cat) cat.entries = []
  } else {
    for (const cat of debugCategories.values()) {
      cat.entries = []
    }
  }
}

/**
 * Retrieves all registered debug categories.
 *
 * @returns Array of debug category configurations
 *
 * @example
 * ```typescript
 * const categories = getDebugCategories()
 * categories.forEach(cat => {
 *   console.log(`${cat.name}: ${cat.entries.length} entries`)
 * })
 * ```
 */
export function getDebugCategories(): DebugCategory[] {
  return Array.from(debugCategories.values())
}

/**
 * Enables or disables debug logging for a specific category.
 *
 * @param category - The category name to configure
 * @param enabled - Whether to enable or disable debug logging
 *
 * @example
 * ```typescript
 * // Enable debugging for a category at runtime
 * setDebugEnabled('my-module', true)
 *
 * // Disable debugging
 * setDebugEnabled('my-module', false)
 * ```
 */
export function setDebugEnabled(category: string, enabled: boolean): void {
  const cat = debugCategories.get(category)
  if (cat) cat.enabled = enabled
}

/**
 * Checks if global debug mode is enabled.
 *
 * @returns True if TUIX_DEBUG environment variable is set to 'true'
 *
 * @example
 * ```typescript
 * if (isDebugEnabled()) {
 *   // Perform expensive debug operations
 *   const detailedInfo = gatherDebugInfo()
 *   debug.trace('Detailed info', detailedInfo)
 * }
 * ```
 */
export function isDebugEnabled(): boolean {
  return debugEnabled
}

// Pre-create common debug loggers
export const scopeDebug = createDebugLogger('scope', { color: '36' }) // cyan
export const jsxDebug = createDebugLogger('jsx', { color: '35' }) // magenta
export const cliDebug = createDebugLogger('cli', { color: '34' }) // blue
export const renderDebug = createDebugLogger('render', { color: '32' }) // green
