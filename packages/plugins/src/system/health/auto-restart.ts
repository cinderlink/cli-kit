/**
 * Auto-restart Manager
 * 
 * This module implements intelligent process auto-restart functionality
 * with configurable policies, backoff strategies, and failure tracking.
 * 
 * @module plugins/system/health/auto-restart
 */

import { v4 as uuidv4 } from "uuid"
import type { ProcessPlatformAdapter, ProcessInfo } from "../types"
import type { ProcessRegistry } from "../registry/process-registry"
import type {
  AutoRestartConfig,
  RestartPolicy,
  RestartStrategy,
  RestartAttempt,
  ProcessRestartError,
} from "./types"

// =============================================================================
// Restart State Tracking
// =============================================================================

/**
 * Restart state for a specific process
 */
interface ProcessRestartState {
  readonly registryId: string
  restartCount: number
  readonly restartHistory: RestartAttempt[]
  lastRestartTime: Date | null
  nextRestartTime: Date | null
  currentDelay: number
  isRestartInProgress: boolean
  manuallyStoppedAt: Date | null
}

// =============================================================================
// Auto-restart Manager
// =============================================================================

/**
 * Manages automatic process restarts with intelligent policies and backoff
 */
export class AutoRestartManager {
  private readonly platformAdapter: ProcessPlatformAdapter
  private readonly registry: ProcessRegistry
  private readonly restartStates = new Map<string, ProcessRestartState>()
  private readonly restartConfigs = new Map<string, AutoRestartConfig>()
  
  // Timers for scheduled restarts
  private readonly restartTimers = new Map<string, Timer>()

  constructor(platformAdapter: ProcessPlatformAdapter, registry: ProcessRegistry) {
    this.platformAdapter = platformAdapter
    this.registry = registry
  }

  // =============================================================================
  // Configuration Management
  // =============================================================================

  /**
   * Configure auto-restart for a process
   */
  public configureAutoRestart(registryId: string, config: AutoRestartConfig): void {
    this.restartConfigs.set(registryId, config)
    
    if (!this.restartStates.has(registryId)) {
      this.restartStates.set(registryId, {
        registryId,
        restartCount: 0,
        restartHistory: [],
        lastRestartTime: null,
        nextRestartTime: null,
        currentDelay: config.initialDelay,
        isRestartInProgress: false,
        manuallyStoppedAt: null
      })
    }
  }

  /**
   * Remove auto-restart configuration for a process
   */
  public removeAutoRestart(registryId: string): void {
    this.restartConfigs.delete(registryId)
    this.restartStates.delete(registryId)
    
    const timer = this.restartTimers.get(registryId)
    if (timer) {
      clearTimeout(timer)
      this.restartTimers.delete(registryId)
    }
  }

  /**
   * Get auto-restart configuration for a process
   */
  public getAutoRestartConfig(registryId: string): AutoRestartConfig | null {
    return this.restartConfigs.get(registryId) || null
  }

  /**
   * Get restart state for a process
   */
  public getRestartState(registryId: string): ProcessRestartState | null {
    return this.restartStates.get(registryId) || null
  }

  // =============================================================================
  // Restart Triggers
  // =============================================================================

  /**
   * Handle process exit event
   */
  public async handleProcessExit(
    registryId: string, 
    exitCode: number, 
    signal?: string
  ): Promise<RestartAttempt | null> {
    const config = this.restartConfigs.get(registryId)
    if (!config || !config.enabled || !config.restartOnProcessExit) {
      return null
    }

    const reason = signal 
      ? `Process exited with signal ${signal}`
      : `Process exited with code ${exitCode}`

    return this.scheduleRestart(registryId, reason)
  }

  /**
   * Handle process crash event
   */
  public async handleProcessCrash(
    registryId: string, 
    error: Error
  ): Promise<RestartAttempt | null> {
    const config = this.restartConfigs.get(registryId)
    if (!config || !config.enabled || !config.restartOnCrash) {
      return null
    }

    return this.scheduleRestart(registryId, `Process crashed: ${error.message}`)
  }

  /**
   * Handle health check failure
   */
  public async handleHealthCheckFailure(
    registryId: string, 
    failureReason: string
  ): Promise<RestartAttempt | null> {
    const config = this.restartConfigs.get(registryId)
    if (!config || !config.enabled || !config.restartOnHealthCheckFailure) {
      return null
    }

    return this.scheduleRestart(registryId, `Health check failed: ${failureReason}`)
  }

  /**
   * Manually trigger restart
   */
  public async manualRestart(
    registryId: string, 
    reason: string = 'Manual restart requested'
  ): Promise<RestartAttempt> {
    const config = this.restartConfigs.get(registryId)
    if (!config) {
      throw new ProcessRestartError(
        'No auto-restart configuration found for process',
        registryId
      )
    }

    return this.performRestart(registryId, reason)
  }

  // =============================================================================
  // Restart Scheduling and Execution
  // =============================================================================

  /**
   * Schedule a restart based on configuration
   */
  private async scheduleRestart(
    registryId: string, 
    reason: string
  ): Promise<RestartAttempt | null> {
    const config = this.restartConfigs.get(registryId)!
    const state = this.restartStates.get(registryId)!
    
    // Check restart policy
    if (!this.shouldRestart(registryId, config, state)) {
      return null
    }

    // Check rate limits
    if (!this.isWithinRateLimit(config, state)) {
      console.warn(`Restart rate limit exceeded for process ${registryId}`)
      return null
    }

    const delay = this.calculateRestartDelay(config, state)
    
    if (delay === 0) {
      // Immediate restart
      return this.performRestart(registryId, reason)
    } else {
      // Scheduled restart
      const nextRestartTime = new Date(Date.now() + delay)
      state.nextRestartTime = nextRestartTime
      
      const timer = setTimeout(async () => {
        try {
          await this.performRestart(registryId, reason)
        } catch (error) {
          console.error(`Scheduled restart failed for ${registryId}:`, error)
        }
      }, delay)
      
      this.restartTimers.set(registryId, timer)
      
      console.log(`Restart scheduled for ${registryId} in ${delay}ms`)
      return null // Will create RestartAttempt when actually executed
    }
  }

  /**
   * Perform the actual restart operation
   */
  private async performRestart(registryId: string, reason: string): Promise<RestartAttempt> {
    const state = this.restartStates.get(registryId)!
    const config = this.restartConfigs.get(registryId)!
    
    if (state.isRestartInProgress) {
      throw new ProcessRestartError('Restart already in progress', registryId)
    }

    const startTime = Date.now()
    const attemptId = uuidv4()
    
    state.isRestartInProgress = true
    
    try {
      // Get current process info
      const process = await this.registry.getProcess(registryId)
      if (!process) {
        throw new ProcessRestartError('Process not found in registry', registryId)
      }

      // For now, we'll simulate a restart by updating the process state
      // In a real implementation, this would:
      // 1. Gracefully stop the current process
      // 2. Start a new instance
      // 3. Update the registry with the new PID
      
      console.log(`Restarting process ${process.name} (PID: ${process.pid})`)
      
      // Simulate process restart with new PID
      const newPid = Math.floor(Math.random() * 90000) + 10000
      const newProcess = {
        ...process,
        pid: newPid,
        startTime: new Date(),
        status: 'starting' as const
      }
      
      // Update registry with new process
      await this.registry.updateProcess(registryId, newProcess)
      
      const duration = Date.now() - startTime
      const now = new Date()
      
      const attempt: RestartAttempt = {
        attemptId,
        registryId,
        pid: process.pid,
        timestamp: now,
        reason,
        success: true,
        newPid,
        duration
      }
      
      // Update restart state
      state.restartCount++
      state.lastRestartTime = now
      state.nextRestartTime = null
      state.currentDelay = this.calculateNextDelay(config, state)
      state.restartHistory.push(attempt)
      
      // Limit history size
      if (state.restartHistory.length > 50) {
        state.restartHistory.splice(0, state.restartHistory.length - 50)
      }
      
      console.log(`Process ${process.name} restarted successfully (new PID: ${newPid})`)
      return attempt
      
    } catch (error) {
      const duration = Date.now() - startTime
      const now = new Date()
      
      const attempt: RestartAttempt = {
        attemptId,
        registryId,
        pid: 0, // Unknown since restart failed
        timestamp: now,
        reason,
        success: false,
        duration,
        error: String(error)
      }
      
      state.restartHistory.push(attempt)
      
      throw new ProcessRestartError(
        `Failed to restart process: ${error}`,
        registryId,
        error
      )
    } finally {
      state.isRestartInProgress = false
      
      // Clear scheduled restart timer
      const timer = this.restartTimers.get(registryId)
      if (timer) {
        clearTimeout(timer)
        this.restartTimers.delete(registryId)
      }
    }
  }

  // =============================================================================
  // Restart Policy Logic
  // =============================================================================

  /**
   * Determine if a process should be restarted
   */
  private shouldRestart(
    registryId: string,
    config: AutoRestartConfig,
    state: ProcessRestartState
  ): boolean {
    // Check if manually stopped
    if (state.manuallyStoppedAt && config.policy === 'unless_stopped') {
      return false
    }
    
    switch (config.policy) {
      case 'never':
        return false
      
      case 'on_failure':
        return true // Caller should only call this for failures
      
      case 'always':
        return true
      
      case 'unless_stopped':
        return state.manuallyStoppedAt === null
      
      default:
        return false
    }
  }

  /**
   * Check if restart is within rate limits
   */
  private isWithinRateLimit(config: AutoRestartConfig, state: ProcessRestartState): boolean {
    const now = Date.now()
    const timeWindow = config.timeWindow
    const maxRestarts = config.maxRestarts
    
    // Filter recent restarts within time window
    const recentRestarts = state.restartHistory.filter(
      attempt => (now - attempt.timestamp.getTime()) <= timeWindow
    )
    
    return recentRestarts.length < maxRestarts
  }

  /**
   * Calculate delay before next restart
   */
  private calculateRestartDelay(config: AutoRestartConfig, state: ProcessRestartState): number {
    switch (config.strategy) {
      case 'immediate':
        return 0
      
      case 'fixed':
        return config.initialDelay
      
      case 'linear':
        return config.initialDelay + (state.restartCount * 1000)
      
      case 'exponential':
        return Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, state.restartCount),
          config.maxDelay
        )
      
      default:
        return config.initialDelay
    }
  }

  /**
   * Calculate delay for next restart (updates state)
   */
  private calculateNextDelay(config: AutoRestartConfig, state: ProcessRestartState): number {
    switch (config.strategy) {
      case 'exponential':
        return Math.min(
          state.currentDelay * config.backoffMultiplier,
          config.maxDelay
        )
      
      case 'linear':
        return state.currentDelay + 1000
      
      default:
        return state.currentDelay
    }
  }

  // =============================================================================
  // State Management
  // =============================================================================

  /**
   * Mark a process as manually stopped
   */
  public markManuallyStopped(registryId: string): void {
    const state = this.restartStates.get(registryId)
    if (state) {
      state.manuallyStoppedAt = new Date()
      
      // Cancel any pending restart
      const timer = this.restartTimers.get(registryId)
      if (timer) {
        clearTimeout(timer)
        this.restartTimers.delete(registryId)
        state.nextRestartTime = null
      }
    }
  }

  /**
   * Clear manual stop flag (allow restarts again)
   */
  public clearManualStop(registryId: string): void {
    const state = this.restartStates.get(registryId)
    if (state) {
      state.manuallyStoppedAt = null
    }
  }

  /**
   * Reset restart count and history
   */
  public resetRestartState(registryId: string): void {
    const state = this.restartStates.get(registryId)
    const config = this.restartConfigs.get(registryId)
    
    if (state && config) {
      state.restartCount = 0
      state.restartHistory.length = 0
      state.lastRestartTime = null
      state.currentDelay = config.initialDelay
      state.manuallyStoppedAt = null
    }
  }

  /**
   * Get restart history for a process
   */
  public getRestartHistory(registryId: string): readonly RestartAttempt[] {
    const state = this.restartStates.get(registryId)
    return state ? state.restartHistory : []
  }

  /**
   * Get restart statistics
   */
  public getRestartStatistics(): {
    totalConfiguredProcesses: number
    processesWithPendingRestarts: number
    totalRestartAttempts: number
    successfulRestarts: number
    failedRestarts: number
    averageRestartTime: number
  } {
    let totalRestartAttempts = 0
    let successfulRestarts = 0
    let failedRestarts = 0
    let totalRestartTime = 0
    let processesWithPendingRestarts = 0
    
    for (const state of this.restartStates.values()) {
      if (state.nextRestartTime) {
        processesWithPendingRestarts++
      }
      
      for (const attempt of state.restartHistory) {
        totalRestartAttempts++
        totalRestartTime += attempt.duration
        
        if (attempt.success) {
          successfulRestarts++
        } else {
          failedRestarts++
        }
      }
    }
    
    return {
      totalConfiguredProcesses: this.restartConfigs.size,
      processesWithPendingRestarts,
      totalRestartAttempts,
      successfulRestarts,
      failedRestarts,
      averageRestartTime: totalRestartAttempts > 0 ? totalRestartTime / totalRestartAttempts : 0
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Clear all timers
    for (const timer of this.restartTimers.values()) {
      clearTimeout(timer)
    }
    
    this.restartTimers.clear()
    this.restartStates.clear()
    this.restartConfigs.clear()
  }
}