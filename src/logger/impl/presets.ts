/**
 * Log Filter Presets
 * 
 * Common filtering scenarios for easier log management
 */

import type { LogLevel } from './types'
import type { ProcessLog } from '../process-manager/types'

export interface LogFilter {
  name: string
  description: string
  level?: LogLevel | LogLevel[]
  pattern?: string | RegExp
  source?: 'stdout' | 'stderr' | 'system'
  timeRange?: {
    since?: string | Date
    until?: string | Date
  }
  processPattern?: string | RegExp
  custom?: (log: ProcessLog & { processName?: string }) => boolean
}

export const LOG_PRESETS: Record<string, LogFilter> = {
  // Error tracking
  errors: {
    name: 'Errors Only',
    description: 'Show only error and fatal log entries',
    level: ['error', 'fatal']
  },

  warnings: {
    name: 'Warnings & Errors',
    description: 'Show warnings, errors, and fatal entries',
    level: ['warn', 'error', 'fatal']
  },

  // Development presets
  debug: {
    name: 'Debug Mode',
    description: 'Show debug and above (no trace)',
    level: ['debug', 'info', 'warn', 'error', 'fatal']
  },

  verbose: {
    name: 'Verbose',
    description: 'Show all log levels including trace',
    level: ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
  },

  // Framework-specific presets
  vite: {
    name: 'Vite Development',
    description: 'Filter Vite dev server logs',
    pattern: /\[(vite|hmr|dev|build)\]/i,
    custom: (log) => {
      // Filter out common vite noise
      if (log.message.includes('Local:') && log.message.includes('http://')) return false
      if (log.message.includes('ready in')) return true
      if (log.message.includes('hmr update')) return true
      if (log.message.includes('error') || log.level === 'error') return true
      return log.level !== 'debug'
    }
  },

  vitest: {
    name: 'Vitest Testing',
    description: 'Filter test execution logs',
    pattern: /\[(test|vitest|spec)\]/i,
    custom: (log) => {
      if (log.message.includes('PASS') || log.message.includes('FAIL')) return true
      if (log.message.includes('✓') || log.message.includes('×')) return true
      if (log.level === 'error' || log.level === 'warn') return true
      return !log.message.includes('stdout |') // Filter test output noise
    }
  },

  typescript: {
    name: 'TypeScript Compiler',
    description: 'TypeScript compilation logs',
    pattern: /\[(tsc|typescript|ts)\]/i,
    custom: (log) => {
      if (log.message.includes('error TS')) return true
      if (log.message.includes('Found 0 errors')) return true
      if (log.message.includes('Watching for file changes')) return false
      return log.level !== 'debug'
    }
  },

  eslint: {
    name: 'ESLint',
    description: 'Linting and code quality logs',
    pattern: /\[(eslint|lint)\]/i,
    custom: (log) => {
      if (log.message.includes('✖') || log.message.includes('error')) return true
      if (log.message.includes('warning')) return true
      if (log.message.includes('✔') && log.message.includes('problems')) return true
      return false
    }
  },

  // Production presets
  production: {
    name: 'Production',
    description: 'Production-safe log levels',
    level: ['info', 'warn', 'error', 'fatal'],
    custom: (log) => {
      // Filter out development noise
      if (log.message.includes('[DEV]') || log.message.includes('[DEBUG]')) return false
      if (log.message.includes('Hot reload') || log.message.includes('hmr')) return false
      return true
    }
  },

  // Time-based presets
  recent: {
    name: 'Recent (Last 5min)',
    description: 'Logs from the last 5 minutes',
    timeRange: {
      since: new Date(Date.now() - 5 * 60 * 1000)
    }
  },

  today: {
    name: 'Today',
    description: 'Logs from today',
    timeRange: {
      since: new Date(new Date().setHours(0, 0, 0, 0))
    }
  },

  // Performance presets
  performance: {
    name: 'Performance',
    description: 'Performance-related logs',
    pattern: /\b(slow|performance|time|duration|ms|seconds?|latency|memory|cpu)\b/i
  },

  database: {
    name: 'Database',
    description: 'Database-related logs',
    pattern: /\b(sql|query|database|db|postgres|mysql|mongodb|redis)\b/i
  },

  network: {
    name: 'Network',
    description: 'Network and HTTP-related logs',
    pattern: /\b(http|request|response|api|fetch|curl|network|tcp|udp|websocket)\b/i
  },

  // Security presets
  security: {
    name: 'Security',
    description: 'Security-related logs',
    pattern: /\b(auth|login|logout|token|jwt|oauth|security|attack|blocked|unauthorized|forbidden)\b/i,
    level: ['warn', 'error', 'fatal']
  },

  // Process-specific patterns
  startup: {
    name: 'Startup',
    description: 'Application startup logs',
    pattern: /\b(start|startup|init|launch|boot|ready|listening|server)\b/i,
    timeRange: {
      since: new Date(Date.now() - 2 * 60 * 1000) // Last 2 minutes
    }
  },

  crashes: {
    name: 'Crashes',
    description: 'Application crashes and fatal errors',
    level: ['fatal'],
    pattern: /\b(crash|fatal|exit|killed|segfault|panic|abort)\b/i
  }
}

/**
 * Apply a preset filter to logs
 */
export function applyPreset(
  logs: (ProcessLog & { processName?: string })[], 
  presetName: string
): (ProcessLog & { processName?: string })[] {
  const preset = LOG_PRESETS[presetName]
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`)
  }

  return logs.filter(log => matchesFilter(log, preset))
}

/**
 * Check if a log entry matches a filter
 */
export function matchesFilter(
  log: ProcessLog & { processName?: string }, 
  filter: LogFilter
): boolean {
  // Level filter
  if (filter.level) {
    const levels = Array.isArray(filter.level) ? filter.level : [filter.level]
    if (!levels.includes(log.level)) {
      return false
    }
  }

  // Source filter
  if (filter.source && log.source !== filter.source) {
    return false
  }

  // Pattern filter
  if (filter.pattern) {
    const pattern = filter.pattern instanceof RegExp ? filter.pattern : new RegExp(filter.pattern, 'i')
    if (!pattern.test(log.message)) {
      return false
    }
  }

  // Process pattern filter
  if (filter.processPattern && log.processName) {
    const pattern = filter.processPattern instanceof RegExp ? filter.processPattern : new RegExp(filter.processPattern, 'i')
    if (!pattern.test(log.processName)) {
      return false
    }
  }

  // Time range filter
  if (filter.timeRange) {
    const logTime = log.timestamp.getTime()
    
    if (filter.timeRange.since) {
      const since = filter.timeRange.since instanceof Date ? filter.timeRange.since : new Date(filter.timeRange.since)
      if (logTime < since.getTime()) {
        return false
      }
    }
    
    if (filter.timeRange.until) {
      const until = filter.timeRange.until instanceof Date ? filter.timeRange.until : new Date(filter.timeRange.until)
      if (logTime > until.getTime()) {
        return false
      }
    }
  }

  // Custom filter
  if (filter.custom && !filter.custom(log)) {
    return false
  }

  return true
}

/**
 * Get available presets with descriptions
 */
export function getAvailablePresets(): Array<{ name: string; description: string }> {
  return Object.entries(LOG_PRESETS).map(([key, preset]) => ({
    name: key,
    description: preset.description
  }))
}

/**
 * Create a custom filter from simple options
 */
export function createFilter(options: {
  level?: LogLevel | LogLevel[]
  search?: string
  process?: string
  since?: string | Date
  until?: string | Date
}): LogFilter {
  return {
    name: 'Custom Filter',
    description: 'User-defined filter',
    level: options.level,
    pattern: options.search ? new RegExp(options.search, 'i') : undefined,
    processPattern: options.process ? new RegExp(options.process, 'i') : undefined,
    timeRange: {
      since: options.since,
      until: options.until
    }
  }
}

/**
 * Quick preset application functions
 */
export const quickFilters = {
  errors: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'errors'),
  warnings: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'warnings'), 
  debug: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'debug'),
  recent: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'recent'),
  production: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'production'),
  vite: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'vite'),
  vitest: (logs: (ProcessLog & { processName?: string })[]) => applyPreset(logs, 'vitest')
}