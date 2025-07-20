/**
 * Stream Analytics
 * 
 * This module provides comprehensive analytics and monitoring for log streams,
 * including performance metrics, health monitoring, and usage statistics.
 * 
 * @module plugins/core/stream-analytics
 */

import type { LogEntry, LogLevelString } from './types'

// =============================================================================
// Analytics Types
// =============================================================================

/**
 * Stream performance metrics
 */
export interface StreamMetrics {
  readonly streamName: string
  readonly totalEntries: number
  readonly entriesPerSecond: number
  readonly avgLatency: number
  readonly maxLatency: number
  readonly minLatency: number
  readonly subscriberCount: number
  readonly bufferUtilization: number
  readonly droppedEntries: number
  readonly errorCount: number
  readonly startTime: Date
  readonly lastActivityTime: Date
  readonly isHealthy: boolean
}

/**
 * Level distribution statistics
 */
export interface LevelDistribution {
  readonly debug: number
  readonly info: number
  readonly warn: number
  readonly error: number
  readonly fatal: number
  readonly total: number
}

/**
 * Time-series data point
 */
export interface TimeSeriesPoint {
  readonly timestamp: Date
  readonly value: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Stream health status
 */
export enum StreamHealth {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy',
  Unknown = 'unknown'
}

/**
 * Comprehensive stream analytics
 */
export interface StreamAnalytics {
  readonly streamName: string
  readonly metrics: StreamMetrics
  readonly levelDistribution: LevelDistribution
  readonly throughputHistory: TimeSeriesPoint[]
  readonly latencyHistory: TimeSeriesPoint[]
  readonly errorHistory: TimeSeriesPoint[]
  readonly health: StreamHealth
  readonly alerts: StreamAlert[]
  readonly recommendations: string[]
}

/**
 * Stream alert
 */
export interface StreamAlert {
  readonly id: string
  readonly level: 'info' | 'warning' | 'critical'
  readonly message: string
  readonly timestamp: Date
  readonly streamName: string
  readonly metric?: string
  readonly threshold?: number
  readonly currentValue?: number
}

// =============================================================================
// Analytics Tracker
// =============================================================================

/**
 * Tracks analytics for a single stream
 */
export class StreamAnalyticsTracker {
  private streamName: string
  private startTime = new Date()
  private lastActivityTime = new Date()
  
  // Counters
  private totalEntries = 0
  private droppedEntries = 0
  private errorCount = 0
  private subscriberCount = 0
  
  // Level tracking
  private levelCounts: Record<LogLevelString, number> = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  }
  
  // Latency tracking
  private latencyMeasurements: number[] = []
  private maxLatency = 0
  private minLatency = Infinity
  
  // Time series data
  private throughputHistory: TimeSeriesPoint[] = []
  private latencyHistory: TimeSeriesPoint[] = []
  private errorHistory: TimeSeriesPoint[] = []
  
  // Health monitoring
  private consecutiveErrors = 0
  private lastHealthCheck = new Date()
  
  // Alerts
  private alerts: StreamAlert[] = []
  private alertIdCounter = 0
  
  // Configuration
  private readonly maxHistorySize = 100
  private readonly healthCheckInterval = 30000 // 30 seconds
  private readonly latencyThreshold = 100 // ms
  private readonly errorThreshold = 10 // errors per minute
  
  constructor(streamName: string) {
    this.streamName = streamName
    this.schedulePeriodicTasks()
  }
  
  /**
   * Record a log entry being processed
   */
  recordEntry(entry: LogEntry, latency?: number): void {
    this.totalEntries++
    this.levelCounts[entry.level]++
    this.lastActivityTime = new Date()
    
    if (latency !== undefined) {
      this.recordLatency(latency)
    }
    
    // Check for error entries
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.consecutiveErrors++
      this.errorCount++
    } else {
      this.consecutiveErrors = 0
    }
  }
  
  /**
   * Record latency measurement
   */
  recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency)
    this.maxLatency = Math.max(this.maxLatency, latency)
    this.minLatency = Math.min(this.minLatency, latency)
    
    // Keep only recent measurements
    if (this.latencyMeasurements.length > 1000) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-500)
    }
    
    // Check latency threshold
    if (latency > this.latencyThreshold) {
      this.createAlert('warning', `High latency detected: ${latency}ms`, 'latency', this.latencyThreshold, latency)
    }
  }
  
  /**
   * Record dropped entry
   */
  recordDroppedEntry(): void {
    this.droppedEntries++
  }
  
  /**
   * Update subscriber count
   */
  updateSubscriberCount(count: number): void {
    this.subscriberCount = count
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): StreamMetrics {
    const now = new Date()
    const uptimeSeconds = (now.getTime() - this.startTime.getTime()) / 1000
    const entriesPerSecond = uptimeSeconds > 0 ? this.totalEntries / uptimeSeconds : 0
    
    const avgLatency = this.latencyMeasurements.length > 0
      ? this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length
      : 0
    
    return {
      streamName: this.streamName,
      totalEntries: this.totalEntries,
      entriesPerSecond: Math.round(entriesPerSecond * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      maxLatency: this.maxLatency === Infinity ? 0 : this.maxLatency,
      minLatency: this.minLatency === Infinity ? 0 : this.minLatency,
      subscriberCount: this.subscriberCount,
      bufferUtilization: 0, // Would be calculated based on buffer state
      droppedEntries: this.droppedEntries,
      errorCount: this.errorCount,
      startTime: this.startTime,
      lastActivityTime: this.lastActivityTime,
      isHealthy: this.calculateHealth() === StreamHealth.Healthy,
    }
  }
  
  /**
   * Get level distribution
   */
  getLevelDistribution(): LevelDistribution {
    const total = Object.values(this.levelCounts).reduce((sum, count) => sum + count, 0)
    
    return {
      debug: this.levelCounts.debug,
      info: this.levelCounts.info,
      warn: this.levelCounts.warn,
      error: this.levelCounts.error,
      fatal: this.levelCounts.fatal,
      total,
    }
  }
  
  /**
   * Get comprehensive analytics
   */
  getAnalytics(): StreamAnalytics {
    return {
      streamName: this.streamName,
      metrics: this.getMetrics(),
      levelDistribution: this.getLevelDistribution(),
      throughputHistory: [...this.throughputHistory],
      latencyHistory: [...this.latencyHistory],
      errorHistory: [...this.errorHistory],
      health: this.calculateHealth(),
      alerts: [...this.alerts],
      recommendations: this.generateRecommendations(),
    }
  }
  
  /**
   * Calculate stream health
   */
  private calculateHealth(): StreamHealth {
    const now = new Date()
    const timeSinceActivity = now.getTime() - this.lastActivityTime.getTime()
    
    // Check if stream is active
    if (timeSinceActivity > 300000) { // 5 minutes
      return StreamHealth.Unknown
    }
    
    // Check error rate
    const errorRate = this.errorCount / Math.max(this.totalEntries, 1)
    if (errorRate > 0.1) { // More than 10% errors
      return StreamHealth.Unhealthy
    }
    
    // Check consecutive errors
    if (this.consecutiveErrors > 5) {
      return StreamHealth.Degraded
    }
    
    // Check latency
    const avgLatency = this.latencyMeasurements.length > 0
      ? this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length
      : 0
    
    if (avgLatency > this.latencyThreshold * 2) {
      return StreamHealth.Degraded
    }
    
    return StreamHealth.Healthy
  }
  
  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const metrics = this.getMetrics()
    
    // High latency recommendation
    if (metrics.avgLatency > this.latencyThreshold) {
      recommendations.push('Consider increasing buffer size to reduce latency')
    }
    
    // High error rate recommendation
    const errorRate = this.errorCount / Math.max(this.totalEntries, 1)
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected - investigate error sources')
    }
    
    // No subscribers recommendation
    if (metrics.subscriberCount === 0 && metrics.totalEntries > 0) {
      recommendations.push('Stream has no active subscribers - consider removing if unused')
    }
    
    // High throughput recommendation
    if (metrics.entriesPerSecond > 1000) {
      recommendations.push('High throughput detected - consider stream partitioning')
    }
    
    // Dropped entries recommendation
    if (metrics.droppedEntries > 0) {
      recommendations.push('Entries are being dropped - increase buffer size or add backpressure handling')
    }
    
    return recommendations
  }
  
  /**
   * Create an alert
   */
  private createAlert(
    level: 'info' | 'warning' | 'critical',
    message: string,
    metric?: string,
    threshold?: number,
    currentValue?: number
  ): void {
    const alert: StreamAlert = {
      id: `alert-${this.alertIdCounter++}`,
      level,
      message,
      timestamp: new Date(),
      streamName: this.streamName,
      metric,
      threshold,
      currentValue,
    }
    
    this.alerts.push(alert)
    
    // Keep only recent alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-25)
    }
  }
  
  /**
   * Schedule periodic tasks
   */
  private schedulePeriodicTasks(): void {
    setInterval(() => {
      this.recordTimeSeriesData()
      this.checkHealth()
    }, 10000) // Every 10 seconds
  }
  
  /**
   * Record time series data points
   */
  private recordTimeSeriesData(): void {
    const now = new Date()
    const metrics = this.getMetrics()
    
    // Record throughput
    this.throughputHistory.push({
      timestamp: now,
      value: metrics.entriesPerSecond,
    })
    
    // Record latency
    if (this.latencyMeasurements.length > 0) {
      this.latencyHistory.push({
        timestamp: now,
        value: metrics.avgLatency,
      })
    }
    
    // Record error count
    this.errorHistory.push({
      timestamp: now,
      value: this.errorCount,
    })
    
    // Trim history
    this.trimHistory()
  }
  
  /**
   * Trim time series history to max size
   */
  private trimHistory(): void {
    if (this.throughputHistory.length > this.maxHistorySize) {
      this.throughputHistory = this.throughputHistory.slice(-this.maxHistorySize)
    }
    
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory = this.latencyHistory.slice(-this.maxHistorySize)
    }
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }
  }
  
  /**
   * Perform health check
   */
  private checkHealth(): void {
    const health = this.calculateHealth()
    
    if (health === StreamHealth.Unhealthy) {
      this.createAlert('critical', 'Stream health is unhealthy')
    } else if (health === StreamHealth.Degraded) {
      this.createAlert('warning', 'Stream health is degraded')
    }
    
    this.lastHealthCheck = new Date()
  }
  
  /**
   * Reset analytics data
   */
  reset(): void {
    this.totalEntries = 0
    this.droppedEntries = 0
    this.errorCount = 0
    this.consecutiveErrors = 0
    
    this.levelCounts = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    }
    
    this.latencyMeasurements = []
    this.maxLatency = 0
    this.minLatency = Infinity
    
    this.throughputHistory = []
    this.latencyHistory = []
    this.errorHistory = []
    
    this.alerts = []
    this.startTime = new Date()
    this.lastActivityTime = new Date()
  }
}