/**
 * Coordination Module Type Definitions
 *
 * This file contains all type definitions for the coordination module
 */

import type { Duration, Effect } from 'effect'
import type { BaseEvent } from '@core/model/events/event-bus'

// Choreography Types
export interface UIUpdateEvent extends BaseEvent {
  readonly type: 'ui:update'
  readonly componentId: string
  readonly updateType: 'render' | 'state' | 'props'
  readonly data: unknown
}

export interface NotificationEvent extends BaseEvent {
  readonly type: 'notification'
  readonly level: 'info' | 'warning' | 'error' | 'success'
  readonly message: string
  readonly details?: unknown
}

export interface ConfigChangeNotificationEvent extends BaseEvent {
  readonly type: 'config:change-notification'
  readonly configModule: string
  readonly changes: Record<string, unknown>
  readonly affectedServices: string[]
}

// Orchestrator Types
export interface WorkflowConfig {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly steps: WorkflowStep[]
  readonly retryPolicy?: RetryPolicy
  readonly timeout?: Duration.Duration
  readonly tags?: string[]
}

export interface WorkflowStep {
  readonly id: string
  readonly name: string
  readonly handler: (input: unknown) => Effect.Effect<unknown, unknown>
  readonly dependsOn?: string[]
  readonly retryPolicy?: RetryPolicy
  readonly timeout?: Duration.Duration
  readonly critical?: boolean
}

export interface RetryPolicy {
  readonly maxAttempts: number
  readonly backoff?: 'constant' | 'exponential' | 'linear'
  readonly delay?: Duration.Duration
  readonly maxDelay?: Duration.Duration
}

export interface WorkflowInstance {
  readonly id: string
  readonly workflowId: string
  readonly startTime: Date
  readonly endTime?: Date
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  readonly steps: WorkflowStepInstance[]
  readonly input: unknown
  readonly output?: unknown
  readonly error?: unknown
}

export interface WorkflowStepInstance extends WorkflowStep {
  readonly instanceId: string
  readonly startTime?: Date
  readonly endTime?: Date
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  readonly attempts: number
  readonly output?: unknown
  readonly error?: unknown
}

export interface WorkflowResult {
  readonly workflowId: string
  readonly instanceId: string
  readonly status: 'completed' | 'failed' | 'cancelled'
  readonly steps: WorkflowStepInstance[]
  readonly output?: unknown
  readonly error?: unknown
  readonly duration: Duration.Duration
}

// Stream Optimizer Types
export interface RelevanceCriteria<T extends BaseEvent> {
  readonly priority: number
  readonly filter: (event: T) => boolean
  readonly transform?: (event: T) => T
}

export interface OptimizationStats {
  readonly eventsProcessed: number
  readonly eventsBatched: number
  readonly eventsThrottled: number
  readonly eventsDeduplicated: number
  readonly batchCount: number
  readonly avgBatchSize: number
  readonly compressionRatio: number
}

// Performance Monitor Types
export interface PerformanceMetric {
  readonly name: string
  readonly value: number
  readonly unit: string
  readonly timestamp: Date
  readonly tags?: Record<string, string>
}

export interface ThroughputMetric {
  readonly module: string
  readonly eventsPerSecond: number
  readonly bytesPerSecond: number
  readonly timestamp: Date
}

export interface ResponseTimeMetric {
  readonly operation: string
  readonly min: number
  readonly max: number
  readonly avg: number
  readonly p50: number
  readonly p95: number
  readonly p99: number
  readonly timestamp: Date
}

export interface MemoryUsageMetric {
  readonly heapUsed: number
  readonly heapTotal: number
  readonly external: number
  readonly timestamp: Date
}

export interface PerformanceReport {
  readonly timestamp: Date
  readonly throughput: ThroughputMetric[]
  readonly responseTimes: ResponseTimeMetric[]
  readonly memory: MemoryUsageMetric
  readonly customMetrics: PerformanceMetric[]
}

export interface PerformanceReportEvent extends BaseEvent {
  readonly type: 'performance:report'
  readonly report: PerformanceReport
}

export interface WorkflowMetrics {
  readonly workflowId: string
  readonly totalExecutions: number
  readonly successCount: number
  readonly failureCount: number
  readonly avgDuration: number
  readonly stepMetrics: Map<string, ResponseTimeMetric>
}

// Error Recovery Types
export interface ErrorPattern {
  readonly id: string
  readonly description: string
  readonly eventTypes: string[]
  readonly errorConditions: ErrorCondition[]
  readonly recoveryStrategyId: string
}

export interface ErrorCondition {
  readonly field: string
  readonly operator: 'equals' | 'contains' | 'matches'
  readonly value: unknown
}

export interface ErrorIndicator {
  readonly patternId: string
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly confidence: number
}

export interface RecoveryStrategy {
  readonly id: string
  readonly type: 'retry' | 'fallback' | 'circuit-break' | 'notify-and-continue'
  readonly config: RecoveryConfig
}

export type RecoveryConfig = RetryConfig | FallbackConfig | CircuitBreakConfig | NotifyConfig

export interface RetryConfig {
  readonly type: 'retry'
  readonly maxAttempts: number
  readonly backoff: 'constant' | 'exponential' | 'linear'
  readonly delay: Duration.Duration
  readonly maxDelay?: Duration.Duration
}

export interface FallbackConfig {
  readonly type: 'fallback'
  readonly fallbackHandler: (error: unknown) => Effect.Effect<unknown, unknown>
  readonly timeout?: Duration.Duration
}

export interface CircuitBreakConfig {
  readonly type: 'circuit-break'
  readonly failureThreshold: number
  readonly resetTimeout: Duration.Duration
  readonly halfOpenRequests: number
}

export interface NotifyConfig {
  readonly type: 'notify-and-continue'
  readonly notificationChannels: string[]
  readonly includeStackTrace?: boolean
}

export interface CircuitBreaker {
  readonly id: string
  readonly state: 'closed' | 'open' | 'half-open'
  readonly failureCount: number
  readonly successCount: number
  readonly lastFailureTime?: Date
  readonly lastSuccessTime?: Date
  readonly nextRetryTime?: Date
}

export interface ErrorStatistics {
  readonly totalErrors: number
  readonly errorsByType: Map<string, number>
  readonly errorsByModule: Map<string, number>
  readonly errorsBySeverity: Map<string, number>
  readonly recentErrors: ErrorIndicator[]
  readonly circuitBreakers: Map<string, CircuitBreaker>
}

export interface ErrorDetectionEvent extends BaseEvent {
  readonly type: 'error:detected'
  readonly error: unknown
  readonly pattern?: ErrorPattern
  readonly indicator: ErrorIndicator
}

export interface ErrorRecoveryEvent extends BaseEvent {
  readonly type: 'error:recovery'
  readonly error: unknown
  readonly strategy: RecoveryStrategy
  readonly result: 'success' | 'failure'
  readonly attempts?: number
}

// Integration Pattern Types
export interface PatternHandle {
  readonly id: string
  readonly pattern: string
  readonly active: boolean
  readonly startTime: Date
  readonly stop: () => Effect.Effect<void>
}

export interface DashboardUpdateEvent extends BaseEvent {
  readonly type: 'dashboard:update'
  readonly dashboard: {
    readonly processCount: number
    readonly activeProcesses: Array<{
      readonly id: string
      readonly name: string
      readonly status: string
      readonly cpu: number
      readonly memory: number
    }>
    readonly systemHealth: 'healthy' | 'degraded' | 'unhealthy'
  }
}

export interface CLIPredictionEvent extends BaseEvent {
  readonly type: 'cli:prediction'
  readonly input: string
  readonly predictions: Array<{
    readonly command: string
    readonly confidence: number
    readonly description?: string
  }>
}

export interface AuditLogEvent extends BaseEvent {
  readonly type: 'audit:log'
  readonly action: string
  readonly user?: string
  readonly module: string
  readonly details: Record<string, unknown>
  readonly timestamp: Date
  readonly severity: 'info' | 'warning' | 'error'
}

// Module Types
export interface CoordinationConfig {
  enableProcessMonitoring?: boolean
  enableInteractiveCLI?: boolean
  enableDynamicUI?: boolean
  enableAuditTrail?: boolean
  performanceReportingInterval?: Duration.Duration
  errorRecoveryEnabled?: boolean
  streamOptimization?: {
    processOutput?: boolean
    cliCommands?: boolean
    uiUpdates?: boolean
  }
}

export interface SystemHealth {
  readonly timestamp: Date
  readonly performance: PerformanceReport
  readonly errors: ErrorStatistics
  readonly throughput: ThroughputMetric[]
  readonly status: 'healthy' | 'degraded' | 'unhealthy'
  readonly activePatterns: string[]
  readonly activeWorkflows: number
}
