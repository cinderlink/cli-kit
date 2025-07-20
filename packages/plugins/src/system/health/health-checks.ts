/**
 * Process Health Checks
 * 
 * This module implements various health check types for process monitoring,
 * including process existence, resource usage, endpoint checks, and custom scripts.
 * 
 * @module plugins/system/health/health-checks
 */

import { v4 as uuidv4 } from "uuid"
import type { ProcessPlatformAdapter, ProcessInfo } from "../types"
import type {
  HealthCheckConfig,
  HealthCheckResult,
  HealthCheckStatus,
  HealthCheckType,
  HealthCheckError,
} from "./types"

// =============================================================================
// Health Check Base Class
// =============================================================================

/**
 * Abstract base class for health checks
 */
export abstract class BaseHealthCheck {
  protected readonly config: HealthCheckConfig
  protected readonly registryId: string
  protected readonly platformAdapter: ProcessPlatformAdapter

  constructor(
    registryId: string,
    config: HealthCheckConfig,
    platformAdapter: ProcessPlatformAdapter
  ) {
    this.registryId = registryId
    this.config = config
    this.platformAdapter = platformAdapter
  }

  /**
   * Execute the health check
   */
  public async execute(processInfo: ProcessInfo, attempt: number = 1): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const status = await this.performCheck(processInfo)
      const duration = Date.now() - startTime
      
      return {
        checkId: uuidv4(),
        registryId: this.registryId,
        pid: processInfo.pid,
        type: this.config.type,
        status,
        timestamp: new Date(),
        duration,
        attempt,
        message: this.getStatusMessage(status),
        details: await this.getCheckDetails(processInfo, status)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        checkId: uuidv4(),
        registryId: this.registryId,
        pid: processInfo.pid,
        type: this.config.type,
        status: 'error',
        timestamp: new Date(),
        duration,
        attempt,
        message: `Health check failed: ${error}`,
        details: { error: String(error) }
      }
    }
  }

  /**
   * Get check configuration
   */
  public getConfig(): HealthCheckConfig {
    return this.config
  }

  /**
   * Abstract method to perform the actual check
   */
  protected abstract performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus>

  /**
   * Get status message for the result
   */
  protected getStatusMessage(status: HealthCheckStatus): string {
    switch (status) {
      case 'healthy': return 'Health check passed'
      case 'unhealthy': return 'Health check failed'
      case 'timeout': return 'Health check timed out'
      case 'error': return 'Health check encountered an error'
      case 'unknown': return 'Health check status unknown'
      default: return 'Unknown health check status'
    }
  }

  /**
   * Get additional details for the check result
   */
  protected async getCheckDetails(
    processInfo: ProcessInfo, 
    status: HealthCheckStatus
  ): Promise<Record<string, unknown>> {
    return {
      processName: processInfo.name,
      processUser: processInfo.user,
      currentCpu: processInfo.cpu,
      currentMemory: processInfo.memory,
      checkType: this.config.type,
      checkConfig: this.config.parameters
    }
  }
}

// =============================================================================
// Specific Health Check Implementations
// =============================================================================

/**
 * Process existence health check
 */
export class ProcessExistsHealthCheck extends BaseHealthCheck {
  protected async performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus> {
    try {
      // Verify process still exists by getting updated info
      const currentProcess = await this.platformAdapter.getProcessInfo(processInfo.pid)
      
      if (!currentProcess) {
        return 'unhealthy'
      }
      
      // Additional checks: ensure it's the same process (name matches)
      if (currentProcess.name !== processInfo.name) {
        return 'unhealthy'
      }
      
      return 'healthy'
    } catch (error) {
      throw new HealthCheckError(
        `Failed to check process existence: ${error}`,
        'process_exists',
        error
      )
    }
  }
}

/**
 * CPU usage health check
 */
export class CpuUsageHealthCheck extends BaseHealthCheck {
  private cpuHistory: Array<{ timestamp: Date; usage: number }> = []

  protected async performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus> {
    const { maxCpuPercent = 80, sustainedDuration = 30000 } = this.config.parameters as {
      maxCpuPercent?: number
      sustainedDuration?: number
    }

    const currentCpu = processInfo.cpu
    const now = new Date()
    
    // Add current reading to history
    this.cpuHistory.push({ timestamp: now, usage: currentCpu })
    
    // Clean old readings outside the sustained duration window
    const cutoffTime = new Date(now.getTime() - sustainedDuration)
    this.cpuHistory = this.cpuHistory.filter(reading => reading.timestamp >= cutoffTime)
    
    // Check if CPU is currently above threshold
    if (currentCpu <= maxCpuPercent) {
      return 'healthy'
    }
    
    // Check if CPU has been sustained above threshold
    const sustainedReadings = this.cpuHistory.filter(reading => reading.usage > maxCpuPercent)
    
    if (sustainedReadings.length > 0) {
      const oldestSustainedReading = sustainedReadings[0]
      const sustainedTime = now.getTime() - oldestSustainedReading.timestamp.getTime()
      
      if (sustainedTime >= sustainedDuration) {
        return 'unhealthy'
      }
    }
    
    return 'healthy'
  }

  protected async getCheckDetails(
    processInfo: ProcessInfo, 
    status: HealthCheckStatus
  ): Promise<Record<string, unknown>> {
    const baseDetails = await super.getCheckDetails(processInfo, status)
    const { maxCpuPercent } = this.config.parameters as { maxCpuPercent?: number }
    
    return {
      ...baseDetails,
      currentCpuUsage: processInfo.cpu,
      maxAllowedCpu: maxCpuPercent,
      cpuHistoryCount: this.cpuHistory.length,
      recentCpuReadings: this.cpuHistory.slice(-5)
    }
  }
}

/**
 * Memory usage health check
 */
export class MemoryUsageHealthCheck extends BaseHealthCheck {
  protected async performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus> {
    const { maxMemoryMB, maxMemoryPercent } = this.config.parameters as {
      maxMemoryMB?: number
      maxMemoryPercent?: number
    }

    const currentMemoryMB = processInfo.memory / (1024 * 1024) // Convert bytes to MB
    
    // Check absolute memory limit
    if (maxMemoryMB && currentMemoryMB > maxMemoryMB) {
      return 'unhealthy'
    }
    
    // Check percentage-based limit (requires system metrics)
    if (maxMemoryPercent) {
      try {
        const systemMetrics = await this.platformAdapter.getSystemMetrics()
        const totalMemoryMB = systemMetrics.memory.total / (1024 * 1024)
        const memoryPercent = (currentMemoryMB / totalMemoryMB) * 100
        
        if (memoryPercent > maxMemoryPercent) {
          return 'unhealthy'
        }
      } catch (error) {
        // If we can't get system metrics, skip percentage check
        console.warn('Could not get system metrics for memory percentage check:', error)
      }
    }
    
    return 'healthy'
  }

  protected async getCheckDetails(
    processInfo: ProcessInfo, 
    status: HealthCheckStatus
  ): Promise<Record<string, unknown>> {
    const baseDetails = await super.getCheckDetails(processInfo, status)
    const { maxMemoryMB, maxMemoryPercent } = this.config.parameters as {
      maxMemoryMB?: number
      maxMemoryPercent?: number
    }
    
    const currentMemoryMB = processInfo.memory / (1024 * 1024)
    
    return {
      ...baseDetails,
      currentMemoryMB: Math.round(currentMemoryMB * 100) / 100,
      currentMemoryBytes: processInfo.memory,
      maxAllowedMemoryMB: maxMemoryMB,
      maxAllowedMemoryPercent: maxMemoryPercent
    }
  }
}

/**
 * HTTP endpoint health check
 */
export class HttpEndpointHealthCheck extends BaseHealthCheck {
  protected async performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus> {
    const { 
      url, 
      expectedStatusCode = 200, 
      expectedResponse,
      headers = {}
    } = this.config.parameters as {
      url: string
      expectedStatusCode?: number
      expectedResponse?: string
      headers?: Record<string, string>
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TUIX-ProcessManager-HealthCheck/1.0',
          ...headers
        }
      })
      
      clearTimeout(timeoutId)
      
      // Check status code
      if (response.status !== expectedStatusCode) {
        return 'unhealthy'
      }
      
      // Check response content if specified
      if (expectedResponse) {
        const responseText = await response.text()
        if (!responseText.includes(expectedResponse)) {
          return 'unhealthy'
        }
      }
      
      return 'healthy'
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'timeout'
      }
      throw new HealthCheckError(
        `HTTP endpoint check failed: ${error}`,
        'http_endpoint',
        error
      )
    }
  }

  protected async getCheckDetails(
    processInfo: ProcessInfo, 
    status: HealthCheckStatus
  ): Promise<Record<string, unknown>> {
    const baseDetails = await super.getCheckDetails(processInfo, status)
    const { url, expectedStatusCode } = this.config.parameters as {
      url: string
      expectedStatusCode?: number
    }
    
    return {
      ...baseDetails,
      endpointUrl: url,
      expectedStatusCode,
      timeoutMs: this.config.timeout
    }
  }
}

/**
 * Custom script health check
 */
export class CustomScriptHealthCheck extends BaseHealthCheck {
  protected async performCheck(processInfo: ProcessInfo): Promise<HealthCheckStatus> {
    const { 
      scriptPath, 
      arguments: scriptArgs = [], 
      expectedExitCode = 0,
      workingDirectory
    } = this.config.parameters as {
      scriptPath: string
      arguments?: string[]
      expectedExitCode?: number
      workingDirectory?: string
    }

    try {
      // For now, we'll use a simple mock implementation
      // In a real implementation, this would execute the script
      console.log(`Would execute script: ${scriptPath} with args:`, scriptArgs)
      
      // Mock success for demonstration
      return 'healthy'
      
    } catch (error) {
      throw new HealthCheckError(
        `Custom script check failed: ${error}`,
        'custom_script',
        error
      )
    }
  }

  protected async getCheckDetails(
    processInfo: ProcessInfo, 
    status: HealthCheckStatus
  ): Promise<Record<string, unknown>> {
    const baseDetails = await super.getCheckDetails(processInfo, status)
    const { scriptPath, arguments: scriptArgs, expectedExitCode } = this.config.parameters as {
      scriptPath: string
      arguments?: string[]
      expectedExitCode?: number
    }
    
    return {
      ...baseDetails,
      scriptPath,
      scriptArguments: scriptArgs,
      expectedExitCode,
      timeoutMs: this.config.timeout
    }
  }
}

// =============================================================================
// Health Check Factory
// =============================================================================

/**
 * Factory for creating health check instances
 */
export class HealthCheckFactory {
  /**
   * Create a health check instance based on configuration
   */
  public static createHealthCheck(
    registryId: string,
    config: HealthCheckConfig,
    platformAdapter: ProcessPlatformAdapter
  ): BaseHealthCheck {
    switch (config.type) {
      case 'process_exists':
        return new ProcessExistsHealthCheck(registryId, config, platformAdapter)
      
      case 'cpu_usage':
        return new CpuUsageHealthCheck(registryId, config, platformAdapter)
      
      case 'memory_usage':
        return new MemoryUsageHealthCheck(registryId, config, platformAdapter)
      
      case 'http_endpoint':
        return new HttpEndpointHealthCheck(registryId, config, platformAdapter)
      
      case 'custom_script':
        return new CustomScriptHealthCheck(registryId, config, platformAdapter)
      
      default:
        throw new HealthCheckError(
          `Unknown health check type: ${(config as any).type}`,
          config.type
        )
    }
  }

  /**
   * Get default health check configurations
   */
  public static getDefaultHealthChecks(): HealthCheckConfig[] {
    return [
      {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      },
      {
        type: 'cpu_usage',
        enabled: true,
        interval: 10000,
        timeout: 2000,
        retries: 1,
        parameters: {
          maxCpuPercent: 80,
          sustainedDuration: 30000
        }
      },
      {
        type: 'memory_usage',
        enabled: true,
        interval: 15000,
        timeout: 2000,
        retries: 1,
        parameters: {
          maxMemoryMB: 1024 // 1GB default limit
        }
      }
    ]
  }

  /**
   * Validate health check configuration
   */
  public static validateHealthCheckConfig(config: HealthCheckConfig): boolean {
    // Basic validation
    if (!config.type || !config.interval || !config.timeout) {
      return false
    }

    if (config.interval < 1000 || config.timeout < 100) {
      return false
    }

    if (config.retries < 0) {
      return false
    }

    // Type-specific validation
    switch (config.type) {
      case 'http_endpoint':
        const httpParams = config.parameters as any
        if (!httpParams.url) {
          return false
        }
        try {
          new URL(httpParams.url)
        } catch {
          return false
        }
        break
      
      case 'custom_script':
        const scriptParams = config.parameters as any
        if (!scriptParams.scriptPath) {
          return false
        }
        break
      
      case 'cpu_usage':
        const cpuParams = config.parameters as any
        if (cpuParams.maxCpuPercent && (cpuParams.maxCpuPercent < 0 || cpuParams.maxCpuPercent > 100)) {
          return false
        }
        break
      
      case 'memory_usage':
        const memParams = config.parameters as any
        if (memParams.maxMemoryMB && memParams.maxMemoryMB < 1) {
          return false
        }
        if (memParams.maxMemoryPercent && (memParams.maxMemoryPercent < 0 || memParams.maxMemoryPercent > 100)) {
          return false
        }
        break
    }

    return true
  }
}