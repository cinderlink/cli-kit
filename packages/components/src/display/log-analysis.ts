/**
 * Log Analysis System - Pattern extraction and intelligent log analysis
 * 
 * @module @tuix/components/display/log-analysis
 */

import { Effect } from "effect"
import type { LogEntry, LogLevelString } from "./types"

/**
 * Identified log pattern
 */
export interface LogPattern {
  signature: string
  template: string
  count: number
  examples: LogEntry[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'error' | 'performance' | 'security' | 'business' | 'system'
  firstSeen: Date
  lastSeen: Date
}

/**
 * Grouped error information
 */
export interface ErrorGroup {
  signature: string
  message: string
  count: number
  occurrences: LogEntry[]
  stackTrace?: string
  firstOccurrence: Date
  lastOccurrence: Date
  affected: {
    users?: Set<string>
    endpoints?: Set<string>
    services?: Set<string>
  }
}

/**
 * Log statistics
 */
export interface LogStatistics {
  totalLogs: number
  levelCounts: Record<LogLevelString, number>
  timeRange: {
    start: Date
    end: Date
    duration: number
  }
  topPatterns: LogPattern[]
  errorRate: number
  averageLogsPerMinute: number
  peakLogsPerMinute: number
  uniqueMessages: number
  patternCoverage: number // percentage of logs matching known patterns
}

/**
 * Analysis configuration
 */
export interface AnalysisConfig {
  maxPatterns: number
  minPatternOccurrences: number
  patternSimilarityThreshold: number
  enableStackTraceGrouping: boolean
  enablePerformanceAnalysis: boolean
  timeWindowMinutes: number
}

/**
 * Log analyzer that extracts patterns and provides insights
 */
export class LogAnalyzer {
  private config: AnalysisConfig
  private knownPatterns: Map<string, LogPattern> = new Map()
  private errorGroups: Map<string, ErrorGroup> = new Map()

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = {
      maxPatterns: 100,
      minPatternOccurrences: 3,
      patternSimilarityThreshold: 0.8,
      enableStackTraceGrouping: true,
      enablePerformanceAnalysis: true,
      timeWindowMinutes: 60,
      ...config
    }
  }

  /**
   * Analyze a batch of log entries
   */
  analyzeLogs(logs: LogEntry[]): Effect.Effect<LogStatistics, never, never> {
    return Effect.gen(this, function* () {
      // Extract patterns
      const patterns = yield* this.extractPatterns(logs)
      
      // Group errors
      const errorGroups = yield* this.groupErrors(logs)
      
      // Calculate statistics
      const stats = yield* this.calculateStatistics(logs, patterns)
      
      return stats
    })
  }

  /**
   * Extract common patterns from log messages
   */
  extractPatterns(logs: LogEntry[]): Effect.Effect<LogPattern[], never, never> {
    return Effect.gen(this, function* () {
      const patternMap = new Map<string, LogPattern>()
      
      for (const log of logs) {
        const signature = yield* this.generateSignature(log.message)
        const template = yield* this.generateTemplate(log.message)
        
        const existing = patternMap.get(signature)
        if (existing) {
          existing.count++
          existing.examples.push(log)
          existing.lastSeen = log.timestamp
          
          // Keep only recent examples (last 10)
          if (existing.examples.length > 10) {
            existing.examples = existing.examples.slice(-10)
          }
        } else {
          patternMap.set(signature, {
            signature,
            template,
            count: 1,
            examples: [log],
            severity: this.assessSeverity(log),
            category: this.categorizeLog(log),
            firstSeen: log.timestamp,
            lastSeen: log.timestamp
          })
        }
      }
      
      // Filter patterns by minimum occurrences and sort by count
      const patterns = Array.from(patternMap.values())
        .filter(pattern => pattern.count >= this.config.minPatternOccurrences)
        .sort((a, b) => b.count - a.count)
        .slice(0, this.config.maxPatterns)
      
      // Update internal pattern store
      patterns.forEach(pattern => {
        this.knownPatterns.set(pattern.signature, pattern)
      })
      
      return patterns
    })
  }

  /**
   * Group related errors by signature
   */
  groupErrors(logs: LogEntry[]): Effect.Effect<ErrorGroup[], never, never> {
    return Effect.gen(this, function* () {
      const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'fatal')
      const groupMap = new Map<string, ErrorGroup>()
      
      for (const log of errorLogs) {
        const signature = yield* this.generateErrorSignature(log)
        
        const existing = groupMap.get(signature)
        if (existing) {
          existing.count++
          existing.occurrences.push(log)
          existing.lastOccurrence = log.timestamp
          
          // Extract additional context
          this.updateAffectedResources(existing, log)
        } else {
          const group: ErrorGroup = {
            signature,
            message: this.extractErrorMessage(log.message),
            count: 1,
            occurrences: [log],
            stackTrace: this.extractStackTrace(log),
            firstOccurrence: log.timestamp,
            lastOccurrence: log.timestamp,
            affected: {
              users: new Set(),
              endpoints: new Set(),
              services: new Set()
            }
          }
          
          this.updateAffectedResources(group, log)
          groupMap.set(signature, group)
        }
      }
      
      const groups = Array.from(groupMap.values())
        .sort((a, b) => b.count - a.count)
      
      // Update internal error groups store
      groups.forEach(group => {
        this.errorGroups.set(group.signature, group)
      })
      
      return groups
    })
  }

  /**
   * Generate a signature for pattern matching
   */
  private generateSignature(message: string): Effect.Effect<string, never, never> {
    return Effect.gen(function* () {
      // Normalize the message by replacing variable parts with placeholders
      let normalized = message
        
      // Replace numbers with placeholder
      normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, '{number}')
      
      // Replace UUIDs with placeholder
      normalized = normalized.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '{uuid}')
      
      // Replace IPs with placeholder
      normalized = normalized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '{ip}')
      
      // Replace timestamps with placeholder
      normalized = normalized.replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{3})?Z?\b/g, '{timestamp}')
      
      // Replace file paths with placeholder
      normalized = normalized.replace(/\/[^\s]+/g, '{path}')
      
      // Replace quoted strings with placeholder
      normalized = normalized.replace(/"[^"]*"/g, '{string}')
      
      // Replace email addresses
      normalized = normalized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '{email}')
      
      // Replace URLs
      normalized = normalized.replace(/https?:\/\/[^\s]+/g, '{url}')
      
      return normalized.trim()
    })
  }

  /**
   * Generate a human-readable template from a message
   */
  private generateTemplate(message: string): Effect.Effect<string, never, never> {
    return Effect.gen(function* () {
      const signature = yield* this.generateSignature(message)
      
      // Make template more readable
      let template = signature
        .replace(/{number}/g, '<NUMBER>')
        .replace(/{uuid}/g, '<UUID>')
        .replace(/{ip}/g, '<IP_ADDRESS>')
        .replace(/{timestamp}/g, '<TIMESTAMP>')
        .replace(/{path}/g, '<FILE_PATH>')
        .replace(/{string}/g, '<STRING>')
        .replace(/{email}/g, '<EMAIL>')
        .replace(/{url}/g, '<URL>')
      
      return template
    })
  }

  /**
   * Generate error signature for grouping
   */
  private generateErrorSignature(log: LogEntry): Effect.Effect<string, never, never> {
    return Effect.gen(this, function* () {
      const baseSignature = yield* this.generateSignature(log.message)
      
      // For errors, also consider stack trace if available
      if (this.config.enableStackTraceGrouping && log.error?.stack) {
        const stackLines = log.error.stack.split('\n').slice(0, 3) // First 3 lines
        const normalizedStack = stackLines
          .map(line => line.replace(/:\d+:\d+/g, ':LINE:COL'))
          .join('|')
        
        return `${baseSignature}|${normalizedStack}`
      }
      
      return baseSignature
    })
  }

  /**
   * Extract clean error message
   */
  private extractErrorMessage(message: string): string {
    // Remove common prefixes
    const cleanMessage = message
      .replace(/^Error:\s*/i, '')
      .replace(/^Exception:\s*/i, '')
      .replace(/^TypeError:\s*/i, '')
      .replace(/^ReferenceError:\s*/i, '')
    
    return cleanMessage
  }

  /**
   * Extract stack trace from log entry
   */
  private extractStackTrace(log: LogEntry): string | undefined {
    if (log.error?.stack) {
      return log.error.stack
    }
    
    // Try to extract from message if it contains stack trace
    const lines = log.message.split('\n')
    if (lines.length > 1 && lines.some(line => line.includes('at '))) {
      return lines.slice(1).join('\n')
    }
    
    return undefined
  }

  /**
   * Update affected resources for error group
   */
  private updateAffectedResources(group: ErrorGroup, log: LogEntry): void {
    if (log.metadata) {
      // Extract user information
      if (log.metadata.userId) {
        group.affected.users?.add(String(log.metadata.userId))
      }
      if (log.metadata.username) {
        group.affected.users?.add(String(log.metadata.username))
      }
      
      // Extract endpoint information
      if (log.metadata.endpoint) {
        group.affected.endpoints?.add(String(log.metadata.endpoint))
      }
      if (log.metadata.path) {
        group.affected.endpoints?.add(String(log.metadata.path))
      }
      
      // Extract service information
      if (log.metadata.service) {
        group.affected.services?.add(String(log.metadata.service))
      }
      if (log.metadata.component) {
        group.affected.services?.add(String(log.metadata.component))
      }
    }
  }

  /**
   * Assess the severity of a log pattern
   */
  private assessSeverity(log: LogEntry): LogPattern['severity'] {
    switch (log.level) {
      case 'fatal':
        return 'critical'
      case 'error':
        return 'high'
      case 'warn':
        return 'medium'
      default:
        return 'low'
    }
  }

  /**
   * Categorize a log entry
   */
  private categorizeLog(log: LogEntry): LogPattern['category'] {
    const message = log.message.toLowerCase()
    
    if (message.includes('error') || message.includes('exception') || message.includes('failed')) {
      return 'error'
    }
    
    if (message.includes('slow') || message.includes('timeout') || message.includes('performance')) {
      return 'performance'
    }
    
    if (message.includes('auth') || message.includes('permission') || message.includes('unauthorized')) {
      return 'security'
    }
    
    if (message.includes('user') || message.includes('order') || message.includes('payment')) {
      return 'business'
    }
    
    return 'system'
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(logs: LogEntry[], patterns: LogPattern[]): Effect.Effect<LogStatistics, never, never> {
    return Effect.gen(function* () {
      if (logs.length === 0) {
        return {
          totalLogs: 0,
          levelCounts: {} as Record<LogLevel, number>,
          timeRange: { start: new Date(), end: new Date(), duration: 0 },
          topPatterns: [],
          errorRate: 0,
          averageLogsPerMinute: 0,
          peakLogsPerMinute: 0,
          uniqueMessages: 0,
          patternCoverage: 0
        }
      }
      
      // Count by level
      const levelCounts = logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1
        return acc
      }, {} as Record<LogLevel, number>)
      
      // Time range
      const timestamps = logs.map(log => log.timestamp.getTime()).sort((a, b) => a - b)
      const start = new Date(timestamps[0])
      const end = new Date(timestamps[timestamps.length - 1])
      const duration = end.getTime() - start.getTime()
      
      // Error rate
      const errorCount = (levelCounts.error || 0) + (levelCounts.fatal || 0)
      const errorRate = logs.length > 0 ? errorCount / logs.length : 0
      
      // Logs per minute calculations
      const durationMinutes = Math.max(1, duration / (1000 * 60))
      const averageLogsPerMinute = logs.length / durationMinutes
      
      // Calculate peak logs per minute (sliding window)
      const peakLogsPerMinute = this.calculatePeakLogsPerMinute(logs)
      
      // Unique messages
      const uniqueMessages = new Set(logs.map(log => log.message)).size
      
      // Pattern coverage
      const logsWithPatterns = logs.filter(log => {
        const signature = Effect.runSync(this.generateSignature(log.message))
        return patterns.some(pattern => pattern.signature === signature)
      }).length
      const patternCoverage = logs.length > 0 ? logsWithPatterns / logs.length : 0
      
      return {
        totalLogs: logs.length,
        levelCounts,
        timeRange: { start, end, duration },
        topPatterns: patterns.slice(0, 10),
        errorRate,
        averageLogsPerMinute,
        peakLogsPerMinute,
        uniqueMessages,
        patternCoverage
      }
    })
  }

  /**
   * Calculate peak logs per minute using sliding window
   */
  private calculatePeakLogsPerMinute(logs: LogEntry[]): number {
    if (logs.length === 0) return 0
    
    const windowSize = 60000 // 1 minute in milliseconds
    const sortedLogs = logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    let maxCount = 0
    let windowStart = 0
    
    for (let windowEnd = 0; windowEnd < sortedLogs.length; windowEnd++) {
      // Move window start to maintain 1-minute window
      while (sortedLogs[windowEnd].timestamp.getTime() - 
             sortedLogs[windowStart].timestamp.getTime() > windowSize) {
        windowStart++
      }
      
      const count = windowEnd - windowStart + 1
      maxCount = Math.max(maxCount, count)
    }
    
    return maxCount
  }

  /**
   * Get current known patterns
   */
  getKnownPatterns(): LogPattern[] {
    return Array.from(this.knownPatterns.values())
  }

  /**
   * Get current error groups
   */
  getErrorGroups(): ErrorGroup[] {
    return Array.from(this.errorGroups.values())
  }

  /**
   * Export analysis results
   */
  exportAnalysis(logs: LogEntry[]): Effect.Effect<string, never, never> {
    return Effect.gen(this, function* () {
      const stats = yield* this.analyzeLogs(logs)
      const patterns = this.getKnownPatterns()
      const errorGroups = this.getErrorGroups()
      
      const report = {
        timestamp: new Date().toISOString(),
        summary: stats,
        patterns: patterns.map(p => ({
          template: p.template,
          count: p.count,
          severity: p.severity,
          category: p.category
        })),
        errorGroups: errorGroups.map(g => ({
          message: g.message,
          count: g.count,
          affectedUsers: g.affected.users?.size || 0,
          affectedEndpoints: g.affected.endpoints?.size || 0
        }))
      }
      
      return JSON.stringify(report, null, 2)
    })
  }
}

/**
 * Create a log analyzer with default configuration
 */
export function createLogAnalyzer(config?: Partial<AnalysisConfig>): LogAnalyzer {
  return new LogAnalyzer(config)
}