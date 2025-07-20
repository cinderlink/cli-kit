/**
 * Platform Adapter Factory
 * 
 * This module provides a factory for creating platform-specific process adapters
 * based on the current operating system. Supports automatic platform detection
 * and manual override.
 * 
 * @module plugins/system/adapters
 */

import type { ProcessPlatformAdapter } from "../types"
import { DarwinProcessAdapter } from "./darwin-adapter"
import { LinuxProcessAdapter } from "./linux-adapter"
import { MockProcessAdapter } from "./mock-adapter"

/**
 * Supported platform types
 */
export type SupportedPlatform = 'darwin' | 'linux' | 'mock'

/**
 * Platform adapter factory configuration
 */
export interface AdapterFactoryConfig {
  platform?: SupportedPlatform | 'auto'
  fallbackToMock?: boolean
  enableLogging?: boolean
}

/**
 * Platform adapter factory for creating appropriate process adapters
 */
export class ProcessAdapterFactory {
  private static instance: ProcessAdapterFactory | null = null
  private adapters: Map<SupportedPlatform, ProcessPlatformAdapter> = new Map()
  private config: Required<AdapterFactoryConfig>

  constructor(config: AdapterFactoryConfig = {}) {
    this.config = {
      platform: 'auto',
      fallbackToMock: true,
      enableLogging: false,
      ...config
    }
  }

  /**
   * Get singleton instance of the factory
   */
  public static getInstance(config?: AdapterFactoryConfig): ProcessAdapterFactory {
    if (!ProcessAdapterFactory.instance) {
      ProcessAdapterFactory.instance = new ProcessAdapterFactory(config)
    }
    return ProcessAdapterFactory.instance
  }

  /**
   * Create platform-specific adapter
   */
  public createAdapter(overridePlatform?: SupportedPlatform): ProcessPlatformAdapter {
    const platform = overridePlatform || this.detectPlatform()
    
    // Return cached adapter if available
    if (this.adapters.has(platform)) {
      return this.adapters.get(platform)!
    }

    let adapter: ProcessPlatformAdapter

    try {
      adapter = this.instantiateAdapter(platform)
      this.adapters.set(platform, adapter)
      
      if (this.config.enableLogging) {
        console.log(`Created ${platform} process adapter`)
      }
    } catch (error) {
      if (this.config.fallbackToMock && platform !== 'mock') {
        if (this.config.enableLogging) {
          console.warn(`Failed to create ${platform} adapter, falling back to mock:`, error)
        }
        adapter = this.createAdapter('mock')
      } else {
        throw new Error(`Failed to create ${platform} adapter: ${error}`)
      }
    }

    return adapter
  }

  /**
   * Detect current platform
   */
  public detectPlatform(): SupportedPlatform {
    if (this.config.platform !== 'auto') {
      return this.config.platform as SupportedPlatform
    }

    const nodePlatform = process.platform

    switch (nodePlatform) {
      case 'darwin':
        return 'darwin'
      case 'linux':
        return 'linux'
      default:
        if (this.config.fallbackToMock) {
          if (this.config.enableLogging) {
            console.warn(`Unsupported platform ${nodePlatform}, using mock adapter`)
          }
          return 'mock'
        }
        throw new Error(`Unsupported platform: ${nodePlatform}`)
    }
  }

  /**
   * Check if platform is supported
   */
  public isPlatformSupported(platform: string): boolean {
    return ['darwin', 'linux'].includes(platform)
  }

  /**
   * Get list of supported platforms
   */
  public getSupportedPlatforms(): SupportedPlatform[] {
    return ['darwin', 'linux', 'mock']
  }

  /**
   * Clear adapter cache
   */
  public clearCache(): void {
    this.adapters.clear()
  }

  /**
   * Update factory configuration
   */
  public updateConfig(newConfig: Partial<AdapterFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<AdapterFactoryConfig> {
    return { ...this.config }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Instantiate platform-specific adapter
   */
  private instantiateAdapter(platform: SupportedPlatform): ProcessPlatformAdapter {
    switch (platform) {
      case 'darwin':
        return new DarwinProcessAdapter()
      case 'linux':
        return new LinuxProcessAdapter()
      case 'mock':
        return new MockProcessAdapter()
      default:
        throw new Error(`Unknown platform: ${platform}`)
    }
  }
}

/**
 * Convenience function to create adapter with auto-detection
 */
export function createProcessAdapter(config?: AdapterFactoryConfig): ProcessPlatformAdapter {
  const factory = ProcessAdapterFactory.getInstance(config)
  return factory.createAdapter()
}

/**
 * Convenience function to create adapter for specific platform
 */
export function createAdapterForPlatform(platform: SupportedPlatform, config?: AdapterFactoryConfig): ProcessPlatformAdapter {
  const factory = ProcessAdapterFactory.getInstance(config)
  return factory.createAdapter(platform)
}

/**
 * Check if current platform is supported
 */
export function isCurrentPlatformSupported(): boolean {
  const factory = ProcessAdapterFactory.getInstance()
  return factory.isPlatformSupported(process.platform)
}

/**
 * Get platform capabilities information
 */
export interface PlatformCapabilities {
  platform: SupportedPlatform
  processEnumeration: boolean
  processManagement: boolean
  systemMetrics: boolean
  realTimeMonitoring: boolean
  crossPlatformCompatible: boolean
}

/**
 * Get capabilities for a specific platform
 */
export function getPlatformCapabilities(platform: SupportedPlatform): PlatformCapabilities {
  const baseCapabilities = {
    platform,
    processEnumeration: true,
    processManagement: true,
    systemMetrics: true,
    realTimeMonitoring: true,
    crossPlatformCompatible: false
  }

  switch (platform) {
    case 'darwin':
      return {
        ...baseCapabilities,
        crossPlatformCompatible: true
      }
    case 'linux':
      return {
        ...baseCapabilities,
        crossPlatformCompatible: true
      }
    case 'mock':
      return {
        ...baseCapabilities,
        crossPlatformCompatible: true,
        processManagement: false // Mock doesn't actually manage processes
      }
    default:
      return {
        ...baseCapabilities,
        processEnumeration: false,
        processManagement: false,
        systemMetrics: false,
        realTimeMonitoring: false
      }
  }
}

/**
 * Validate adapter requirements
 */
export async function validateAdapterRequirements(adapter: ProcessPlatformAdapter): Promise<{
  valid: boolean
  issues: string[]
  warnings: string[]
}> {
  const issues: string[] = []
  const warnings: string[] = []

  try {
    // Test basic process enumeration
    const processes = await adapter.getProcessList()
    if (!Array.isArray(processes)) {
      issues.push('getProcessList() does not return an array')
    } else if (processes.length === 0) {
      warnings.push('No processes returned - this may indicate permission issues')
    }

    // Test system metrics
    const metrics = await adapter.getSystemMetrics()
    if (!metrics || typeof metrics !== 'object') {
      issues.push('getSystemMetrics() does not return valid metrics object')
    } else {
      if (!metrics.cpu || typeof metrics.cpu.overall !== 'number') {
        issues.push('Invalid CPU metrics structure')
      }
      if (!metrics.memory || typeof metrics.memory.total !== 'number') {
        issues.push('Invalid memory metrics structure')
      }
      if (!metrics.disk) {
        warnings.push('Disk metrics may not be fully implemented')
      }
    }

  } catch (error) {
    issues.push(`Adapter validation failed: ${error}`)
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  }
}

// Re-export adapters for direct use
export { DarwinProcessAdapter } from "./darwin-adapter"
export { LinuxProcessAdapter } from "./linux-adapter"
export { MockProcessAdapter } from "./mock-adapter"

// Re-export types
export type { ProcessPlatformAdapter } from "../types"