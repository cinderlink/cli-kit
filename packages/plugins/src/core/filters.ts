/**
 * Log Filters Collection
 * 
 * This module provides a comprehensive collection of pre-built log filters
 * for common filtering scenarios, plus utilities for combining filters.
 * 
 * @module plugins/core/filters
 */

import type { LogEntry, LogFilter, LogLevelString } from './types'

// =============================================================================
// Basic Filters
// =============================================================================

/**
 * Filter by log level
 */
export const levelFilter = (level: LogLevelString): LogFilter => 
  (entry: LogEntry) => entry.level === level

/**
 * Filter by minimum log level
 */
export const minLevelFilter = (minLevel: LogLevelString): LogFilter => {
  const levelOrder = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 }
  const minLevelValue = levelOrder[minLevel]
  
  return (entry: LogEntry) => levelOrder[entry.level] >= minLevelValue
}

/**
 * Filter by component name in metadata
 */
export const componentFilter = (component: string): LogFilter => 
  (entry: LogEntry) => entry.metadata?.component === component

/**
 * Filter by user ID in metadata
 */
export const userFilter = (userId: string | number): LogFilter => 
  (entry: LogEntry) => entry.metadata?.userId === userId

/**
 * Filter by session ID in metadata
 */
export const sessionFilter = (sessionId: string): LogFilter => 
  (entry: LogEntry) => entry.metadata?.sessionId === sessionId

/**
 * Filter by message content (case-insensitive)
 */
export const messageFilter = (searchTerm: string): LogFilter => 
  (entry: LogEntry) => entry.message.toLowerCase().includes(searchTerm.toLowerCase())

/**
 * Filter by metadata key existence
 */
export const hasMetadataFilter = (key: string): LogFilter => 
  (entry: LogEntry) => key in entry.metadata

/**
 * Filter by metadata key-value pair
 */
export const metadataFilter = (key: string, value: unknown): LogFilter => 
  (entry: LogEntry) => entry.metadata[key] === value

// =============================================================================
// Time-based Filters
// =============================================================================

/**
 * Filter by time range
 */
export const timeRangeFilter = (start: Date, end?: Date): LogFilter => {
  const endTime = end || new Date()
  return (entry: LogEntry) => {
    const entryTime = entry.timestamp.getTime()
    return entryTime >= start.getTime() && entryTime <= endTime.getTime()
  }
}

/**
 * Filter logs from the last N minutes
 */
export const lastMinutesFilter = (minutes: number): LogFilter => {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000)
  return (entry: LogEntry) => entry.timestamp >= cutoff
}

/**
 * Filter logs from the last N hours
 */
export const lastHoursFilter = (hours: number): LogFilter => {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  return (entry: LogEntry) => entry.timestamp >= cutoff
}

/**
 * Filter logs from today
 */
export const todayFilter: LogFilter = (entry: LogEntry) => {
  const today = new Date()
  const entryDate = entry.timestamp
  return (
    today.getFullYear() === entryDate.getFullYear() &&
    today.getMonth() === entryDate.getMonth() &&
    today.getDate() === entryDate.getDate()
  )
}

// =============================================================================
// Pattern-based Filters
// =============================================================================

/**
 * Filter by regex pattern in message
 */
export const regexFilter = (pattern: RegExp): LogFilter => 
  (entry: LogEntry) => pattern.test(entry.message)

/**
 * Filter error messages with stack traces
 */
export const errorWithStackFilter: LogFilter = (entry: LogEntry) => {
  if (entry.level !== 'error' && entry.level !== 'fatal') {
    return false
  }
  return entry.metadata?.stack !== undefined || 
         entry.message.includes('Error:') ||
         entry.message.includes('Stack trace:')
}

/**
 * Filter HTTP request logs
 */
export const httpRequestFilter: LogFilter = (entry: LogEntry) => {
  return entry.metadata?.method !== undefined ||
         entry.metadata?.url !== undefined ||
         entry.metadata?.statusCode !== undefined ||
         entry.message.includes('HTTP')
}

/**
 * Filter performance-related logs
 */
export const performanceFilter: LogFilter = (entry: LogEntry) => {
  return entry.metadata?.duration !== undefined ||
         entry.metadata?.responseTime !== undefined ||
         entry.message.includes('ms') ||
         entry.message.includes('Performance')
}

/**
 * Filter security-related logs
 */
export const securityFilter: LogFilter = (entry: LogEntry) => {
  const securityKeywords = ['auth', 'login', 'logout', 'permission', 'security', 'unauthorized', 'forbidden']
  const messageText = entry.message.toLowerCase()
  
  return securityKeywords.some(keyword => messageText.includes(keyword)) ||
         entry.metadata?.security !== undefined ||
         entry.metadata?.auth !== undefined
}

// =============================================================================
// Composite Filters
// =============================================================================

/**
 * Filter for error conditions (errors + warnings)
 */
export const problemsFilter: LogFilter = (entry: LogEntry) => {
  return entry.level === 'error' || 
         entry.level === 'fatal' || 
         entry.level === 'warn'
}

/**
 * Filter for critical issues only
 */
export const criticalFilter: LogFilter = (entry: LogEntry) => {
  return entry.level === 'error' || entry.level === 'fatal'
}

/**
 * Filter for application startup/shutdown logs
 */
export const lifecycleFilter: LogFilter = (entry: LogEntry) => {
  const lifecycleKeywords = ['start', 'stop', 'init', 'shutdown', 'boot', 'exit']
  const messageText = entry.message.toLowerCase()
  
  return lifecycleKeywords.some(keyword => messageText.includes(keyword)) ||
         entry.metadata?.lifecycle !== undefined
}

// =============================================================================
// Filter Combinators
// =============================================================================

/**
 * Combine multiple filters with AND logic
 */
export const andFilter = (...filters: LogFilter[]): LogFilter => 
  (entry: LogEntry) => filters.every(filter => filter(entry))

/**
 * Combine multiple filters with OR logic
 */
export const orFilter = (...filters: LogFilter[]): LogFilter => 
  (entry: LogEntry) => filters.some(filter => filter(entry))

/**
 * Negate a filter
 */
export const notFilter = (filter: LogFilter): LogFilter => 
  (entry: LogEntry) => !filter(entry)

/**
 * Rate limiting filter - only passes every Nth entry
 */
export const rateLimitFilter = (rate: number): LogFilter => {
  let counter = 0
  return (entry: LogEntry) => {
    counter++
    return counter % rate === 0
  }
}

/**
 * Sampling filter - passes a percentage of entries
 */
export const samplingFilter = (percentage: number): LogFilter => {
  if (percentage <= 0) return () => false
  if (percentage >= 100) return () => true
  
  return (entry: LogEntry) => Math.random() * 100 < percentage
}

/**
 * Debounce filter - only passes if enough time has passed since last match
 */
export const debounceFilter = (intervalMs: number, keyFn?: (entry: LogEntry) => string): LogFilter => {
  const lastTimes = new Map<string, number>()
  
  return (entry: LogEntry) => {
    const key = keyFn ? keyFn(entry) : 'default'
    const now = Date.now()
    const lastTime = lastTimes.get(key) || 0
    
    if (now - lastTime >= intervalMs) {
      lastTimes.set(key, now)
      return true
    }
    
    return false
  }
}

// =============================================================================
// Filter Collections
// =============================================================================

/**
 * Pre-defined filter collections for common use cases
 */
export const FilterCollections = {
  /**
   * Development filters - useful during development
   */
  development: {
    errorsOnly: criticalFilter,
    debugAndInfo: orFilter(levelFilter('debug'), levelFilter('info')),
    recentErrors: andFilter(criticalFilter, lastHoursFilter(1)),
    httpRequests: httpRequestFilter,
    performance: performanceFilter,
  },
  
  /**
   * Production monitoring filters
   */
  production: {
    alerts: criticalFilter,
    warnings: minLevelFilter('warn'),
    security: securityFilter,
    performance: performanceFilter,
    lifecycle: lifecycleFilter,
  },
  
  /**
   * Debugging filters
   */
  debugging: {
    withStack: errorWithStackFilter,
    byComponent: (component: string) => componentFilter(component),
    byUser: (userId: string | number) => userFilter(userId),
    recentActivity: lastMinutesFilter(5),
  },
  
  /**
   * Analytics filters
   */
  analytics: {
    sampled: samplingFilter(10), // 10% sample
    rateLimited: rateLimitFilter(10), // Every 10th entry
    noDebug: notFilter(levelFilter('debug')),
    businessLogic: notFilter(orFilter(httpRequestFilter, performanceFilter)),
  }
}

/**
 * Create a filter from a simple configuration object
 */
export interface FilterConfig {
  level?: LogLevelString
  minLevel?: LogLevelString
  component?: string
  userId?: string | number
  sessionId?: string
  message?: string
  timeRange?: { start: Date; end?: Date }
  lastMinutes?: number
  lastHours?: number
  today?: boolean
  metadata?: Record<string, unknown>
  and?: FilterConfig[]
  or?: FilterConfig[]
  not?: FilterConfig
}

/**
 * Build a filter from configuration
 */
export const buildFilter = (config: FilterConfig): LogFilter => {
  const filters: LogFilter[] = []
  
  if (config.level) {
    filters.push(levelFilter(config.level))
  }
  
  if (config.minLevel) {
    filters.push(minLevelFilter(config.minLevel))
  }
  
  if (config.component) {
    filters.push(componentFilter(config.component))
  }
  
  if (config.userId !== undefined) {
    filters.push(userFilter(config.userId))
  }
  
  if (config.sessionId) {
    filters.push(sessionFilter(config.sessionId))
  }
  
  if (config.message) {
    filters.push(messageFilter(config.message))
  }
  
  if (config.timeRange) {
    filters.push(timeRangeFilter(config.timeRange.start, config.timeRange.end))
  }
  
  if (config.lastMinutes) {
    filters.push(lastMinutesFilter(config.lastMinutes))
  }
  
  if (config.lastHours) {
    filters.push(lastHoursFilter(config.lastHours))
  }
  
  if (config.today) {
    filters.push(todayFilter)
  }
  
  if (config.metadata) {
    for (const [key, value] of Object.entries(config.metadata)) {
      filters.push(metadataFilter(key, value))
    }
  }
  
  if (config.and) {
    const andFilters = config.and.map(buildFilter)
    filters.push(andFilter(...andFilters))
  }
  
  if (config.or) {
    const orFilters = config.or.map(buildFilter)
    filters.push(orFilter(...orFilters))
  }
  
  if (config.not) {
    filters.push(notFilter(buildFilter(config.not)))
  }
  
  // Combine all filters with AND logic
  return filters.length === 1 ? filters[0] : andFilter(...filters)
}