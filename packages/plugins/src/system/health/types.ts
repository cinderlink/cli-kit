/**
 * Health Monitoring Types
 * 
 * This module defines the type system for process health monitoring,
 * auto-restart functionality, and health check configurations.
 * 
 * @module plugins/system/health/types
 */

import { z } from "zod"
import type { ProcessInfo, ProcessStatus } from "../types"

// =============================================================================
// Health Check Types
// =============================================================================

/**
 * Health check status enumeration
 */
export type HealthCheckStatus = 'healthy' | 'unhealthy' | 'unknown' | 'timeout' | 'error'

/**
 * Health check types
 */
export type HealthCheckType = 
  | 'process_exists'     // Check if process is still running
  | 'cpu_usage'         // Check CPU usage is within limits
  | 'memory_usage'      // Check memory usage is within limits
  | 'response_time'     // Check process response time
  | 'port_open'         // Check if process port is accessible
  | 'http_endpoint'     // Check HTTP endpoint health
  | 'custom_script'     // Run custom health check script
  | 'file_exists'       // Check if specific file exists
  | 'log_pattern'       // Check for patterns in log files

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly type: HealthCheckType
  readonly enabled: boolean
  readonly interval: number // milliseconds between checks
  readonly timeout: number // milliseconds before check times out
  readonly retries: number // number of retries before marking unhealthy
  readonly parameters: Record<string, unknown> // type-specific parameters
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  readonly checkId: string
  readonly registryId: string
  readonly pid: number
  readonly type: HealthCheckType
  readonly status: HealthCheckStatus
  readonly timestamp: Date
  readonly duration: number // milliseconds taken for check
  readonly message?: string
  readonly details?: Record<string, unknown>
  readonly attempt: number // which retry attempt this was
}

/**
 * Health check schemas for different types
 */
export const ProcessExistsCheckSchema = z.object({
  type: z.literal('process_exists'),
  enabled: z.boolean().default(true),
  interval: z.number().min(1000).default(5000),
  timeout: z.number().min(100).default(1000),
  retries: z.number().min(0).default(2),
  parameters: z.object({}).default({})
})

export const CpuUsageCheckSchema = z.object({
  type: z.literal('cpu_usage'),
  enabled: z.boolean().default(true),
  interval: z.number().min(1000).default(10000),
  timeout: z.number().min(100).default(2000),
  retries: z.number().min(0).default(1),
  parameters: z.object({
    maxCpuPercent: z.number().min(0).max(100).default(80),
    sustainedDuration: z.number().min(1000).default(30000) // 30 seconds
  })
})

export const MemoryUsageCheckSchema = z.object({
  type: z.literal('memory_usage'),
  enabled: z.boolean().default(true),
  interval: z.number().min(1000).default(15000),
  timeout: z.number().min(100).default(2000),
  retries: z.number().min(0).default(1),
  parameters: z.object({
    maxMemoryMB: z.number().min(1).optional(),
    maxMemoryPercent: z.number().min(0).max(100).optional()
  })
})

export const HttpEndpointCheckSchema = z.object({
  type: z.literal('http_endpoint'),
  enabled: z.boolean().default(false),
  interval: z.number().min(1000).default(30000),
  timeout: z.number().min(100).default(5000),
  retries: z.number().min(0).default(2),
  parameters: z.object({
    url: z.string().url(),
    expectedStatusCode: z.number().default(200),
    expectedResponse: z.string().optional(),
    headers: z.record(z.string()).optional()
  })
})

export const CustomScriptCheckSchema = z.object({
  type: z.literal('custom_script'),
  enabled: z.boolean().default(false),
  interval: z.number().min(1000).default(60000),
  timeout: z.number().min(1000).default(10000),
  retries: z.number().min(0).default(1),
  parameters: z.object({
    scriptPath: z.string(),
    arguments: z.array(z.string()).default([]),
    expectedExitCode: z.number().default(0),
    workingDirectory: z.string().optional()
  })
})

// =============================================================================
// Auto-restart Configuration
// =============================================================================

/**
 * Auto-restart policy types
 */
export type RestartPolicy = 
  | 'never'           // Never restart
  | 'on_failure'      // Restart only on failure
  | 'always'          // Always restart if stopped
  | 'unless_stopped'  // Restart unless manually stopped

/**
 * Restart strategy for backoff timing
 */
export type RestartStrategy = 'immediate' | 'linear' | 'exponential' | 'fixed'

/**
 * Auto-restart configuration
 */
export interface AutoRestartConfig {
  readonly enabled: boolean
  readonly policy: RestartPolicy
  readonly strategy: RestartStrategy
  readonly maxRestarts: number // maximum restarts within time window
  readonly timeWindow: number // time window in milliseconds
  readonly initialDelay: number // initial delay before first restart
  readonly maxDelay: number // maximum delay between restarts
  readonly backoffMultiplier: number // multiplier for exponential backoff
  readonly healthCheckGracePeriod: number // grace period after restart
  readonly restartOnHealthCheckFailure: boolean
  readonly restartOnProcessExit: boolean
  readonly restartOnCrash: boolean
}

/**
 * Auto-restart configuration schema
 */
export const AutoRestartConfigSchema = z.object({
  enabled: z.boolean().default(false),
  policy: z.enum(['never', 'on_failure', 'always', 'unless_stopped']).default('on_failure'),
  strategy: z.enum(['immediate', 'linear', 'exponential', 'fixed']).default('exponential'),
  maxRestarts: z.number().min(0).default(5),
  timeWindow: z.number().min(60000).default(300000), // 5 minutes
  initialDelay: z.number().min(0).default(1000),
  maxDelay: z.number().min(1000).default(60000),
  backoffMultiplier: z.number().min(1).default(2),
  healthCheckGracePeriod: z.number().min(1000).default(10000),
  restartOnHealthCheckFailure: z.boolean().default(true),
  restartOnProcessExit: z.boolean().default(true),
  restartOnCrash: z.boolean().default(true)
})

// =============================================================================
// Health Monitoring Configuration
// =============================================================================

/**
 * Complete health monitoring configuration
 */
export interface HealthMonitoringConfig {
  readonly enabled: boolean
  readonly globalHealthCheckInterval: number
  readonly unhealthyThreshold: number // consecutive failures before unhealthy
  readonly healthyThreshold: number // consecutive successes before healthy
  readonly enableMetricsCollection: boolean
  readonly metricsRetentionDays: number
  readonly enableAlerting: boolean
  readonly healthChecks: readonly HealthCheckConfig[]
  readonly autoRestart: AutoRestartConfig
}

/**
 * Health monitoring configuration schema
 */
export const HealthMonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  globalHealthCheckInterval: z.number().min(1000).default(30000),
  unhealthyThreshold: z.number().min(1).default(3),
  healthyThreshold: z.number().min(1).default(2),
  enableMetricsCollection: z.boolean().default(true),
  metricsRetentionDays: z.number().min(1).default(7),
  enableAlerting: z.boolean().default(false),
  healthChecks: z.array(z.union([
    ProcessExistsCheckSchema,
    CpuUsageCheckSchema,
    MemoryUsageCheckSchema,
    HttpEndpointCheckSchema,
    CustomScriptCheckSchema
  ])).default([
    { type: 'process_exists', enabled: true, interval: 5000, timeout: 1000, retries: 2, parameters: {} }
  ]),
  autoRestart: AutoRestartConfigSchema
})

// =============================================================================
// Health Monitoring State
// =============================================================================

/**
 * Process health state
 */
export interface ProcessHealthState {
  readonly registryId: string
  readonly pid: number
  readonly overallStatus: HealthCheckStatus
  readonly lastHealthCheck: Date | null
  readonly consecutiveFailures: number
  readonly consecutiveSuccesses: number
  readonly totalHealthChecks: number
  readonly totalFailures: number
  readonly lastKnownGoodState: Date | null
  readonly healthChecks: Map<HealthCheckType, HealthCheckResult[]>
  readonly isUnderSupervision: boolean
}

/**
 * Restart attempt record
 */
export interface RestartAttempt {
  readonly attemptId: string
  readonly registryId: string
  readonly pid: number
  readonly timestamp: Date
  readonly reason: string
  readonly success: boolean
  readonly newPid?: number
  readonly duration: number // milliseconds taken for restart
  readonly error?: string
}

/**
 * Health monitoring statistics
 */
export interface HealthMonitoringStats {
  readonly totalProcesses: number
  readonly healthyProcesses: number
  readonly unhealthyProcesses: number
  readonly unknownProcesses: number
  readonly processesUnderSupervision: number
  readonly totalHealthChecks: number
  readonly totalRestartAttempts: number
  readonly successfulRestarts: number
  readonly failedRestarts: number
  readonly averageHealthCheckDuration: number
  readonly recentHealthCheckResults: readonly HealthCheckResult[]
  readonly recentRestartAttempts: readonly RestartAttempt[]
}

// =============================================================================
// Health Monitoring API
// =============================================================================

/**
 * Health monitoring API interface
 */
export interface HealthMonitoringAPI {
  // Process supervision
  startSupervision(registryId: string, config: HealthMonitoringConfig): Promise<void>
  stopSupervision(registryId: string): Promise<void>
  updateSupervisionConfig(registryId: string, config: Partial<HealthMonitoringConfig>): Promise<void>
  
  // Health status queries
  getProcessHealth(registryId: string): Promise<ProcessHealthState | null>
  getAllProcessHealth(): Promise<readonly ProcessHealthState[]>
  getUnhealthyProcesses(): Promise<readonly ProcessHealthState[]>
  
  // Health check management
  triggerHealthCheck(registryId: string, checkType?: HealthCheckType): Promise<HealthCheckResult[]>
  getHealthCheckHistory(registryId: string, checkType?: HealthCheckType): Promise<readonly HealthCheckResult[]>
  
  // Restart management
  restartProcess(registryId: string, reason?: string): Promise<RestartAttempt>
  getRestartHistory(registryId: string): Promise<readonly RestartAttempt[]>
  
  // Statistics and monitoring
  getHealthMonitoringStats(): Promise<HealthMonitoringStats>
  getSystemHealthOverview(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'critical'
    issues: readonly string[]
    recommendations: readonly string[]
  }>
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Health monitoring error
 */
export class HealthMonitoringError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'HealthMonitoringError'
  }
}

/**
 * Health check error
 */
export class HealthCheckError extends HealthMonitoringError {
  constructor(
    message: string, 
    public readonly checkType: HealthCheckType,
    cause?: unknown
  ) {
    super(message, cause)
    this.name = 'HealthCheckError'
  }
}

/**
 * Process restart error
 */
export class ProcessRestartError extends HealthMonitoringError {
  constructor(
    message: string,
    public readonly registryId: string,
    cause?: unknown
  ) {
    super(message, cause)
    this.name = 'ProcessRestartError'
  }
}

/**
 * Supervision configuration error
 */
export class SupervisionConfigError extends HealthMonitoringError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'SupervisionConfigError'
  }
}