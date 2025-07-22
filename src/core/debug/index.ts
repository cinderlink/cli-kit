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
 * Create a debug logger for a specific category
 */
export function createDebugLogger(category: string, options?: {
  enabled?: boolean
  color?: string
}) {
  if (!debugCategories.has(category)) {
    debugCategories.set(category, {
      name: category,
      enabled: options?.enabled ?? debugEnabled,
      color: options?.color,
      entries: []
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
      level
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
    error: log('error')
  }
}

/**
 * Get all debug entries for a category
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
 * Clear debug entries
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
 * Get debug categories
 */
export function getDebugCategories(): DebugCategory[] {
  return Array.from(debugCategories.values())
}

/**
 * Enable/disable debug for a category
 */
export function setDebugEnabled(category: string, enabled: boolean): void {
  const cat = debugCategories.get(category)
  if (cat) cat.enabled = enabled
}

/**
 * Check if debug is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled
}

// Pre-create common debug loggers
export const scopeDebug = createDebugLogger('scope', { color: '36' }) // cyan
export const jsxDebug = createDebugLogger('jsx', { color: '35' }) // magenta
export const cliDebug = createDebugLogger('cli', { color: '34' }) // blue
export const renderDebug = createDebugLogger('render', { color: '32' }) // green