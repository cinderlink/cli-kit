/**
 * Performance Monitor - Cross-module performance monitoring and metrics
 * 
 * Tracks event throughput, response times, memory usage, and generates
 * comprehensive performance reports across all modules.
 */

import { Effect, Stream, Duration, Schedule } from 'effect'
import { EventBus, BaseEvent } from "../model/events/event-bus"
import { ModuleBase } from '../module-base'
import type { CLICommandEvent } from '../../cli/events'

/**
 * Performance metric structure
 */
export interface PerformanceMetric {
  readonly timestamp: Date
  readonly value: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Throughput metric
 */
export interface ThroughputMetric {
  readonly channel: string
  readonly count: number
  readonly ratePerMinute: number
}

/**
 * Response time metric
 */
export interface ResponseTimeMetric {
  readonly command: string
  readonly average: number
  readonly min: number
  readonly max: number
  readonly p95: number
}

/**
 * Memory usage metric
 */
export interface MemoryUsageMetric {
  readonly heapUsed: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Performance report
 */
export interface PerformanceReport {
  readonly timestamp: Date
  readonly eventThroughput: ThroughputMetric[]
  readonly responseTimeStats: ResponseTimeMetric[]
  readonly memoryUsage?: MemoryUsageMetric
}

/**
 * Performance event type
 */
export interface PerformanceReportEvent extends BaseEvent {
  readonly type: 'performance-report'
  readonly report: PerformanceReport
}

/**
 * Workflow-specific metrics
 */
export interface WorkflowMetrics {
  readonly workflowId: string
  readonly startTime: Date
  readonly endTime?: Date
  readonly stepDurations: Map<string, number>
  readonly totalDuration?: number
  readonly resourceUsage: {
    peakMemory: number
    avgCpu: number
  }
}

/**
 * Performance Monitor implementation
 */
export class PerformanceMonitor extends ModuleBase {
  private metrics = new Map<string, PerformanceMetric>()
  private eventCounts = new Map<string, number>()
  private responseTimeTracker = new Map<string, number[]>()
  private workflowMetrics = new Map<string, WorkflowMetrics>()
  private reportingInterval = Duration.minutes(5)
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'performance-monitor')
  }
  
  /**
   * Initialize performance monitoring
   */
  initialize(): Effect<void, never> {
    return Effect.all([
      this.monitorEventThroughput(),
      this.monitorResponseTimes(),
      this.monitorMemoryUsage(),
      this.generatePerformanceReports()
    ]).pipe(Effect.asVoid)
  }
  
  /**
   * Monitor event throughput across all channels
   */
  private monitorEventThroughput(): Effect<void, never> {
    return this.eventBus.subscribePattern<BaseEvent>(
      /.+/,
      event => this.trackEventThroughput(event)
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Monitor CLI command response times
   */
  private monitorResponseTimes(): Effect<void, never> {
    return this.eventBus.subscribe<CLICommandEvent>(
      'cli-command',
      event => this.trackResponseTime(event)
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Monitor memory usage periodically
   */
  private monitorMemoryUsage(): Effect<void, never> {
    return Effect.fork(
      Effect.repeat(
        this.captureMemoryMetrics(),
        Schedule.fixed(Duration.seconds(30))
      )
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Generate periodic performance reports
   */
  private generatePerformanceReports(): Effect<void, never> {
    return Effect.fork(
      Effect.repeat(
        this.generateAndEmitReport(),
        Schedule.fixed(this.reportingInterval)
      )
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Track event throughput
   */
  private trackEventThroughput(event: BaseEvent): Effect<void, never> {
    return Effect.sync(() => {
      const channelKey = `${event.source}:${event.type}`
      const current = this.eventCounts.get(channelKey) || 0
      this.eventCounts.set(channelKey, current + 1)
    })
  }
  
  /**
   * Track CLI command response times
   */
  private trackResponseTime(event: CLICommandEvent): Effect<void, never> {
    return Effect.sync(() => {
      if (event.type === 'cli-command-executed' && event.executionTime) {
        const pathKey = event.path.join(':')
        const times = this.responseTimeTracker.get(pathKey) || []
        times.push(event.executionTime)
        
        // Keep only last 100 measurements
        if (times.length > 100) {
          times.shift()
        }
        
        this.responseTimeTracker.set(pathKey, times)
      }
    })
  }
  
  /**
   * Capture current memory metrics
   */
  private captureMemoryMetrics(): Effect<void, never> {
    return Effect.sync(() => {
      const memUsage = process.memoryUsage()
      
      this.metrics.set('memory', {
        timestamp: new Date(),
        value: memUsage.heapUsed,
        metadata: {
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        }
      })
    })
  }
  
  /**
   * Generate and emit performance report
   */
  private generateAndEmitReport(): Effect<void, never> {
    return Effect.gen(function* () {
      const report = this.generatePerformanceReport()
      
      yield* this.emitEvent<PerformanceReportEvent>('performance-report', {
        type: 'performance-report',
        report,
        timestamp: new Date(),
        source: 'performance-monitor',
        id: this.generateId()
      })
      
      // Reset counters for next period
      this.eventCounts.clear()
    }.bind(this))
  }
  
  /**
   * Generate performance report
   */
  private generatePerformanceReport(): PerformanceReport {
    const eventThroughput = Array.from(this.eventCounts.entries()).map(
      ([channel, count]) => ({ 
        channel, 
        count, 
        ratePerMinute: count / Duration.toMinutes(this.reportingInterval) 
      })
    )
    
    const responseTimeStats = Array.from(this.responseTimeTracker.entries()).map(
      ([command, times]) => ({
        command,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: this.calculatePercentile(times, 95)
      })
    )
    
    const memoryMetric = this.metrics.get('memory')
    
    return {
      timestamp: new Date(),
      eventThroughput,
      responseTimeStats,
      memoryUsage: memoryMetric ? {
        heapUsed: memoryMetric.value,
        metadata: memoryMetric.metadata
      } : undefined
    }
  }
  
  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  /**
   * Start monitoring a specific workflow
   */
  startWorkflowMonitoring(workflowId: string): Effect<void, never> {
    return Effect.sync(() => {
      this.workflowMetrics.set(workflowId, {
        workflowId,
        startTime: new Date(),
        stepDurations: new Map(),
        resourceUsage: {
          peakMemory: process.memoryUsage().heapUsed,
          avgCpu: 0
        }
      })
    })
  }
  
  /**
   * Record workflow step duration
   */
  recordWorkflowStep(workflowId: string, stepId: string, duration: number): Effect<void, never> {
    return Effect.sync(() => {
      const metrics = this.workflowMetrics.get(workflowId)
      if (metrics) {
        metrics.stepDurations.set(stepId, duration)
      }
    })
  }
  
  /**
   * Complete workflow monitoring
   */
  completeWorkflowMonitoring(workflowId: string): Effect<WorkflowMetrics | null, never> {
    return Effect.sync(() => {
      const metrics = this.workflowMetrics.get(workflowId)
      if (metrics) {
        metrics.endTime = new Date()
        metrics.totalDuration = metrics.endTime.getTime() - metrics.startTime.getTime()
        
        // Update peak memory
        const currentMemory = process.memoryUsage().heapUsed
        metrics.resourceUsage.peakMemory = Math.max(
          metrics.resourceUsage.peakMemory,
          currentMemory
        )
        
        return metrics
      }
      return null
    })
  }
  
  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId: string): Effect<WorkflowMetrics | null, never> {
    return Effect.sync(() => this.workflowMetrics.get(workflowId) || null)
  }
  
  /**
   * Public API: Get current performance metrics
   */
  getPerformanceMetrics(): Effect<PerformanceReport, never> {
    return Effect.sync(() => this.generatePerformanceReport())
  }
  
  /**
   * Public API: Get event throughput for specific channel
   */
  getEventThroughput(channel?: string): Effect<ThroughputMetric[], never> {
    return Effect.sync(() => {
      const entries = Array.from(this.eventCounts.entries())
      const filtered = channel 
        ? entries.filter(([key]) => key.includes(channel))
        : entries
      
      return filtered.map(([key, count]) => ({
        channel: key,
        count,
        ratePerMinute: count / Duration.toMinutes(this.reportingInterval)
      }))
    })
  }
  
  /**
   * Public API: Get response time statistics
   */
  getResponseTimeStats(command?: string): Effect<ResponseTimeMetric[], never> {
    return Effect.sync(() => {
      const entries = Array.from(this.responseTimeTracker.entries())
      const filtered = command
        ? entries.filter(([key]) => key.includes(command))
        : entries
      
      return filtered.map(([command, times]) => ({
        command,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: this.calculatePercentile(times, 95)
      }))
    })
  }
  
  /**
   * Public API: Get memory usage metrics
   */
  getMemoryUsage(): Effect<MemoryUsageMetric | null, never> {
    return Effect.sync(() => {
      const metric = this.metrics.get('memory')
      return metric ? {
        heapUsed: metric.value,
        metadata: metric.metadata
      } : null
    })
  }
  
  /**
   * Configure reporting interval
   */
  setReportingInterval(interval: Duration.Duration): Effect<void, never> {
    return Effect.sync(() => {
      this.reportingInterval = interval
    })
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics(): Effect<void, never> {
    return Effect.sync(() => {
      this.metrics.clear()
      this.eventCounts.clear()
      this.responseTimeTracker.clear()
      this.workflowMetrics.clear()
    })
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}