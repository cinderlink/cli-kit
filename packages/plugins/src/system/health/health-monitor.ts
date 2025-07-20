/**
 * Health Monitoring Manager
 * 
 * This module orchestrates process health monitoring, integrating health checks,
 * auto-restart functionality, and supervision policies into a unified system.
 * 
 * @module plugins/system/health/health-monitor
 */

import { Effect, Schedule } from "effect"
import { v4 as uuidv4 } from "uuid"
import type { ProcessPlatformAdapter, ProcessInfo } from "../types"
import type { ProcessRegistry } from "../registry/process-registry"
import { HealthCheckFactory, type BaseHealthCheck } from "./health-checks"
import { AutoRestartManager } from "./auto-restart"
import type {
  HealthMonitoringConfig,
  HealthMonitoringAPI,
  ProcessHealthState,
  HealthCheckResult,
  HealthCheckType,
  HealthCheckStatus,
  RestartAttempt,
  HealthMonitoringStats,
  HealthMonitoringError,
  HealthMonitoringConfigSchema,
} from "./types"

// =============================================================================
// Health Monitoring Manager
// =============================================================================

/**
 * Manages comprehensive process health monitoring and supervision
 */
export class HealthMonitoringManager implements HealthMonitoringAPI {
  private readonly platformAdapter: ProcessPlatformAdapter
  private readonly registry: ProcessRegistry
  private readonly autoRestartManager: AutoRestartManager
  
  // Supervision state
  private readonly supervisedProcesses = new Map<string, HealthMonitoringConfig>()
  private readonly healthStates = new Map<string, ProcessHealthState>()
  private readonly healthCheckInstances = new Map<string, Map<HealthCheckType, BaseHealthCheck>>()
  private readonly healthCheckResults = new Map<string, HealthCheckResult[]>()
  
  // Monitoring intervals
  private readonly monitoringIntervals = new Map<string, Timer>()
  private globalMonitoringInterval: Timer | null = null
  private isDestroyed = false

  constructor(platformAdapter: ProcessPlatformAdapter, registry: ProcessRegistry) {
    this.platformAdapter = platformAdapter
    this.registry = registry
    this.autoRestartManager = new AutoRestartManager(platformAdapter, registry)
    
    this.startGlobalMonitoring()
  }

  // =============================================================================
  // Process Supervision
  // =============================================================================

  /**
   * Start supervising a process with health monitoring
   */
  public async startSupervision(
    registryId: string, 
    config: HealthMonitoringConfig
  ): Promise<void> {
    if (this.isDestroyed) {
      throw new HealthMonitoringError('Health monitoring manager has been destroyed')
    }

    // Validate configuration
    const validatedConfig = HealthMonitoringConfigSchema.parse(config)
    
    // Check if process exists in registry
    const process = await this.registry.getProcess(registryId)
    if (!process) {
      throw new HealthMonitoringError(`Process not found in registry: ${registryId}`)
    }

    // Stop existing supervision if any
    if (this.supervisedProcesses.has(registryId)) {
      await this.stopSupervision(registryId)
    }

    // Store configuration
    this.supervisedProcesses.set(registryId, validatedConfig)
    
    // Initialize health state
    this.healthStates.set(registryId, {
      registryId,
      pid: process.pid,
      overallStatus: 'unknown',
      lastHealthCheck: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalHealthChecks: 0,
      totalFailures: 0,
      lastKnownGoodState: null,
      healthChecks: new Map(),
      isUnderSupervision: true
    })

    // Initialize health check results storage
    this.healthCheckResults.set(registryId, [])

    // Create health check instances
    const healthCheckMap = new Map<HealthCheckType, BaseHealthCheck>()
    for (const checkConfig of validatedConfig.healthChecks) {
      if (checkConfig.enabled) {
        const healthCheck = HealthCheckFactory.createHealthCheck(
          registryId,
          checkConfig,
          this.platformAdapter
        )
        healthCheckMap.set(checkConfig.type, healthCheck)
      }
    }
    this.healthCheckInstances.set(registryId, healthCheckMap)

    // Configure auto-restart
    if (validatedConfig.autoRestart.enabled) {
      this.autoRestartManager.configureAutoRestart(registryId, validatedConfig.autoRestart)
    }

    // Start individual process monitoring
    this.startProcessMonitoring(registryId)

    console.log(`Started health monitoring supervision for process ${registryId}`)
  }

  /**
   * Stop supervising a process
   */
  public async stopSupervision(registryId: string): Promise<void> {
    this.supervisedProcesses.delete(registryId)
    
    // Update health state
    const healthState = this.healthStates.get(registryId)
    if (healthState) {
      (healthState as any).isUnderSupervision = false
    }

    // Stop monitoring interval
    const interval = this.monitoringIntervals.get(registryId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(registryId)
    }

    // Remove health check instances
    this.healthCheckInstances.delete(registryId)

    // Remove auto-restart configuration
    this.autoRestartManager.removeAutoRestart(registryId)

    console.log(`Stopped health monitoring supervision for process ${registryId}`)
  }

  /**
   * Update supervision configuration
   */
  public async updateSupervisionConfig(
    registryId: string, 
    configUpdate: Partial<HealthMonitoringConfig>
  ): Promise<void> {
    const currentConfig = this.supervisedProcesses.get(registryId)
    if (!currentConfig) {
      throw new HealthMonitoringError(`Process ${registryId} is not under supervision`)
    }

    const newConfig = { ...currentConfig, ...configUpdate }
    await this.startSupervision(registryId, newConfig)
  }

  // =============================================================================
  // Health Status Queries
  // =============================================================================

  /**
   * Get health state for a specific process
   */
  public async getProcessHealth(registryId: string): Promise<ProcessHealthState | null> {
    return this.healthStates.get(registryId) || null
  }

  /**
   * Get health states for all supervised processes
   */
  public async getAllProcessHealth(): Promise<readonly ProcessHealthState[]> {
    return Array.from(this.healthStates.values())
  }

  /**
   * Get health states for unhealthy processes
   */
  public async getUnhealthyProcesses(): Promise<readonly ProcessHealthState[]> {
    return Array.from(this.healthStates.values()).filter(
      state => state.overallStatus === 'unhealthy' || state.overallStatus === 'error'
    )
  }

  // =============================================================================
  // Health Check Management
  // =============================================================================

  /**
   * Manually trigger health checks for a process
   */
  public async triggerHealthCheck(
    registryId: string, 
    checkType?: HealthCheckType
  ): Promise<HealthCheckResult[]> {
    const healthCheckMap = this.healthCheckInstances.get(registryId)
    if (!healthCheckMap) {
      throw new HealthMonitoringError(`Process ${registryId} is not under supervision`)
    }

    const process = await this.registry.getProcess(registryId)
    if (!process) {
      throw new HealthMonitoringError(`Process not found in registry: ${registryId}`)
    }

    const results: HealthCheckResult[] = []
    
    if (checkType) {
      // Run specific health check
      const healthCheck = healthCheckMap.get(checkType)
      if (healthCheck) {
        const result = await healthCheck.execute(process)
        results.push(result)
        this.recordHealthCheckResult(registryId, result)
      }
    } else {
      // Run all enabled health checks
      for (const healthCheck of healthCheckMap.values()) {
        try {
          const result = await healthCheck.execute(process)
          results.push(result)
          this.recordHealthCheckResult(registryId, result)
        } catch (error) {
          console.error(`Health check failed for ${registryId}:`, error)
        }
      }
    }

    // Update overall health status
    this.updateOverallHealthStatus(registryId, results)
    
    return results
  }

  /**
   * Get health check history for a process
   */
  public async getHealthCheckHistory(
    registryId: string, 
    checkType?: HealthCheckType
  ): Promise<readonly HealthCheckResult[]> {
    const results = this.healthCheckResults.get(registryId) || []
    
    if (checkType) {
      return results.filter(result => result.type === checkType)
    }
    
    return results
  }

  // =============================================================================
  // Restart Management
  // =============================================================================

  /**
   * Manually restart a process
   */
  public async restartProcess(registryId: string, reason?: string): Promise<RestartAttempt> {
    return this.autoRestartManager.manualRestart(
      registryId, 
      reason || 'Manual restart via health monitoring'
    )
  }

  /**
   * Get restart history for a process
   */
  public async getRestartHistory(registryId: string): Promise<readonly RestartAttempt[]> {
    return this.autoRestartManager.getRestartHistory(registryId)
  }

  // =============================================================================
  // Statistics and Monitoring
  // =============================================================================

  /**
   * Get comprehensive health monitoring statistics
   */
  public async getHealthMonitoringStats(): Promise<HealthMonitoringStats> {
    const healthStates = Array.from(this.healthStates.values())
    const allResults = Array.from(this.healthCheckResults.values()).flat()
    const restartStats = this.autoRestartManager.getRestartStatistics()

    const healthyProcesses = healthStates.filter(s => s.overallStatus === 'healthy').length
    const unhealthyProcesses = healthStates.filter(s => s.overallStatus === 'unhealthy').length
    const unknownProcesses = healthStates.filter(s => s.overallStatus === 'unknown').length
    const processesUnderSupervision = healthStates.filter(s => s.isUnderSupervision).length

    const totalHealthChecks = allResults.length
    const avgDuration = totalHealthChecks > 0 
      ? allResults.reduce((sum, result) => sum + result.duration, 0) / totalHealthChecks
      : 0

    // Get recent results (last 100)
    const recentResults = allResults
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100)

    // Get recent restart attempts
    const recentRestarts: RestartAttempt[] = []
    for (const registryId of this.supervisedProcesses.keys()) {
      const restarts = await this.getRestartHistory(registryId)
      recentRestarts.push(...restarts.slice(-10))
    }
    recentRestarts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      totalProcesses: healthStates.length,
      healthyProcesses,
      unhealthyProcesses,
      unknownProcesses,
      processesUnderSupervision,
      totalHealthChecks,
      totalRestartAttempts: restartStats.totalRestartAttempts,
      successfulRestarts: restartStats.successfulRestarts,
      failedRestarts: restartStats.failedRestarts,
      averageHealthCheckDuration: avgDuration,
      recentHealthCheckResults: recentResults,
      recentRestartAttempts: recentRestarts.slice(0, 50)
    }
  }

  /**
   * Get system health overview
   */
  public async getSystemHealthOverview(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'critical'
    issues: readonly string[]
    recommendations: readonly string[]
  }> {
    const healthStates = Array.from(this.healthStates.values())
    const issues: string[] = []
    const recommendations: string[] = []

    const unhealthyCount = healthStates.filter(s => s.overallStatus === 'unhealthy').length
    const errorCount = healthStates.filter(s => s.overallStatus === 'error').length
    const totalSupervised = healthStates.filter(s => s.isUnderSupervision).length

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'

    if (errorCount > 0) {
      overallHealth = 'critical'
      issues.push(`${errorCount} processes have health check errors`)
      recommendations.push('Investigate health check configuration and process status')
    }

    if (unhealthyCount > 0) {
      if (unhealthyCount / totalSupervised > 0.5) {
        overallHealth = 'critical'
        issues.push(`${unhealthyCount} out of ${totalSupervised} supervised processes are unhealthy`)
      } else {
        overallHealth = overallHealth === 'critical' ? 'critical' : 'degraded'
        issues.push(`${unhealthyCount} processes are unhealthy`)
      }
      recommendations.push('Review unhealthy processes and consider restarting them')
    }

    const restartStats = this.autoRestartManager.getRestartStatistics()
    if (restartStats.failedRestarts > restartStats.successfulRestarts * 0.2) {
      overallHealth = overallHealth === 'healthy' ? 'degraded' : overallHealth
      issues.push('High restart failure rate detected')
      recommendations.push('Review restart configurations and process dependencies')
    }

    if (totalSupervised === 0) {
      issues.push('No processes are under health monitoring supervision')
      recommendations.push('Configure health monitoring for critical processes')
    }

    return {
      overallHealth,
      issues,
      recommendations
    }
  }

  // =============================================================================
  // Private Implementation
  // =============================================================================

  /**
   * Start monitoring for a specific process
   */
  private startProcessMonitoring(registryId: string): void {
    const config = this.supervisedProcesses.get(registryId)!
    
    const interval = setInterval(async () => {
      try {
        await this.runHealthChecksForProcess(registryId)
      } catch (error) {
        console.error(`Health monitoring failed for ${registryId}:`, error)
      }
    }, config.globalHealthCheckInterval)
    
    this.monitoringIntervals.set(registryId, interval)
  }

  /**
   * Run health checks for a specific process
   */
  private async runHealthChecksForProcess(registryId: string): Promise<void> {
    const process = await this.registry.getProcess(registryId)
    if (!process) {
      console.warn(`Process ${registryId} no longer exists in registry`)
      await this.stopSupervision(registryId)
      return
    }

    const healthCheckMap = this.healthCheckInstances.get(registryId)
    if (!healthCheckMap) return

    const results: HealthCheckResult[] = []
    
    for (const [checkType, healthCheck] of healthCheckMap.entries()) {
      try {
        const result = await healthCheck.execute(process)
        results.push(result)
        this.recordHealthCheckResult(registryId, result)
      } catch (error) {
        console.error(`Health check ${checkType} failed for ${registryId}:`, error)
      }
    }

    this.updateOverallHealthStatus(registryId, results)
    
    // Handle unhealthy processes
    const healthState = this.healthStates.get(registryId)!
    if (healthState.overallStatus === 'unhealthy') {
      await this.handleUnhealthyProcess(registryId, results)
    }
  }

  /**
   * Record a health check result
   */
  private recordHealthCheckResult(registryId: string, result: HealthCheckResult): void {
    const results = this.healthCheckResults.get(registryId) || []
    results.push(result)
    
    // Limit history size
    if (results.length > 1000) {
      results.splice(0, results.length - 1000)
    }
    
    this.healthCheckResults.set(registryId, results)
  }

  /**
   * Update overall health status based on check results
   */
  private updateOverallHealthStatus(registryId: string, results: HealthCheckResult[]): void {
    const healthState = this.healthStates.get(registryId)!
    const config = this.supervisedProcesses.get(registryId)!
    
    const hasErrors = results.some(r => r.status === 'error')
    const hasUnhealthy = results.some(r => r.status === 'unhealthy')
    const hasTimeout = results.some(r => r.status === 'timeout')
    
    let newStatus: HealthCheckStatus
    
    if (hasErrors) {
      newStatus = 'error'
    } else if (hasUnhealthy || hasTimeout) {
      newStatus = 'unhealthy'
    } else if (results.every(r => r.status === 'healthy')) {
      newStatus = 'healthy'
    } else {
      newStatus = 'unknown'
    }
    
    // Update consecutive counters
    if (newStatus === 'healthy') {
      (healthState as any).consecutiveSuccesses++
      (healthState as any).consecutiveFailures = 0
      (healthState as any).lastKnownGoodState = new Date()
    } else {
      (healthState as any).consecutiveFailures++
      (healthState as any).consecutiveSuccesses = 0
    }
    
    // Apply thresholds
    if (newStatus === 'healthy' && healthState.consecutiveSuccesses >= config.healthyThreshold) {
      (healthState as any).overallStatus = 'healthy'
    } else if (newStatus !== 'healthy' && healthState.consecutiveFailures >= config.unhealthyThreshold) {
      (healthState as any).overallStatus = newStatus
    }
    
    (healthState as any).lastHealthCheck = new Date()
    ;(healthState as any).totalHealthChecks++
    
    if (newStatus !== 'healthy') {
      (healthState as any).totalFailures++
    }
  }

  /**
   * Handle an unhealthy process
   */
  private async handleUnhealthyProcess(
    registryId: string, 
    results: HealthCheckResult[]
  ): Promise<void> {
    const config = this.supervisedProcesses.get(registryId)!
    
    if (config.autoRestart.enabled && config.autoRestart.restartOnHealthCheckFailure) {
      const failureReasons = results
        .filter(r => r.status !== 'healthy')
        .map(r => `${r.type}: ${r.message}`)
        .join(', ')
      
      try {
        await this.autoRestartManager.handleHealthCheckFailure(registryId, failureReasons)
      } catch (error) {
        console.error(`Failed to trigger auto-restart for ${registryId}:`, error)
      }
    }
  }

  /**
   * Start global monitoring coordination
   */
  private startGlobalMonitoring(): void {
    // Periodic cleanup and coordination
    this.globalMonitoringInterval = setInterval(() => {
      this.performGlobalMaintenance()
    }, 60000) // Every minute
  }

  /**
   * Perform global maintenance tasks
   */
  private performGlobalMaintenance(): void {
    // Clean up old health check results
    for (const [registryId, results] of this.healthCheckResults.entries()) {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
      const filteredResults = results.filter(result => result.timestamp >= cutoffTime)
      this.healthCheckResults.set(registryId, filteredResults)
    }
    
    // Log supervision status
    const stats = {
      supervisedProcesses: this.supervisedProcesses.size,
      healthyProcesses: Array.from(this.healthStates.values()).filter(s => s.overallStatus === 'healthy').length,
      unhealthyProcesses: Array.from(this.healthStates.values()).filter(s => s.overallStatus === 'unhealthy').length
    }
    
    console.log('Health monitoring status:', stats)
  }

  /**
   * Cleanup resources and stop monitoring
   */
  public destroy(): void {
    this.isDestroyed = true
    
    // Stop all monitoring intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval)
    }
    this.monitoringIntervals.clear()
    
    if (this.globalMonitoringInterval) {
      clearInterval(this.globalMonitoringInterval)
      this.globalMonitoringInterval = null
    }
    
    // Cleanup auto-restart manager
    this.autoRestartManager.destroy()
    
    // Clear all state
    this.supervisedProcesses.clear()
    this.healthStates.clear()
    this.healthCheckInstances.clear()
    this.healthCheckResults.clear()
    
    console.log('Health monitoring manager destroyed')
  }
}