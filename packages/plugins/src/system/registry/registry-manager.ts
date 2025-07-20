/**
 * Process Registry Manager
 * 
 * This module provides a high-level manager for the process registry that integrates
 * with the main Process Manager Plugin and provides advanced process state management,
 * automated lifecycle tracking, and registry orchestration.
 * 
 * @module plugins/system/registry/registry-manager
 */

import { Effect, Schedule, Stream } from "effect"
import type { ProcessInfo, ProcessPlatformAdapter } from "../types"
import { ProcessRegistry, InMemoryRegistryStorage } from "./process-registry"
import {
  type ProcessRegistryConfig,
  type RegistryProcessInfo,
  type ProcessLifecycleEventRecord,
  type ProcessManagementConfig,
  type ManagedProcess,
  type RegistryStatistics,
  type RegistryProcessQuery,
  type ProcessEventQuery,
  type RegistryQueryResult,
  type RegistryStorage,
  ProcessRegistryConfigSchema,
  RegistryError,
} from "./types"

// =============================================================================
// Registry Manager Configuration
// =============================================================================

/**
 * Registry manager configuration extending base registry config
 */
export interface RegistryManagerConfig extends ProcessRegistryConfig {
  readonly autoSyncEnabled: boolean // Automatically sync with platform adapter
  readonly autoSyncInterval: number // Milliseconds between syncs
  readonly enableProcessDiscovery: boolean // Automatically discover new processes
  readonly enableProcessTracking: boolean // Track existing processes
  readonly enableDeadProcessCleanup: boolean // Remove dead processes automatically
  readonly deadProcessTimeout: number // Milliseconds before considering process dead
}

/**
 * Default registry manager configuration
 */
export const DEFAULT_REGISTRY_MANAGER_CONFIG: RegistryManagerConfig = {
  ...ProcessRegistryConfigSchema.parse({}),
  autoSyncEnabled: true,
  autoSyncInterval: 5000, // 5 seconds
  enableProcessDiscovery: true,
  enableProcessTracking: true,
  enableDeadProcessCleanup: true,
  deadProcessTimeout: 30000, // 30 seconds
}

// =============================================================================
// Registry Manager Implementation
// =============================================================================

/**
 * High-level process registry manager with automated lifecycle tracking
 */
export class ProcessRegistryManager {
  private readonly config: RegistryManagerConfig
  private readonly registry: ProcessRegistry
  private readonly storage: RegistryStorage
  
  // Platform integration
  private platformAdapter: ProcessPlatformAdapter | null = null
  
  // Sync state
  private syncInterval: Timer | null = null
  private isDestroyed = false
  private lastSyncTime: Date | null = null
  private syncErrorCount = 0
  
  // Process tracking state
  private knownProcesses = new Set<number>() // PIDs we've seen
  private lastProcessCheck = new Map<number, Date>() // PID -> last seen time

  constructor(
    config: Partial<RegistryManagerConfig> = {},
    storage?: RegistryStorage
  ) {
    this.config = { ...DEFAULT_REGISTRY_MANAGER_CONFIG, ...config }
    this.storage = storage || new InMemoryRegistryStorage()
    this.registry = new ProcessRegistry(this.config, this.storage)
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  /**
   * Initialize the registry manager
   */
  public async initialize(platformAdapter: ProcessPlatformAdapter): Promise<void> {
    if (this.isDestroyed) {
      throw new RegistryError('Cannot initialize destroyed registry manager')
    }

    this.platformAdapter = platformAdapter
    
    // Perform initial sync
    if (this.config.autoSyncEnabled) {
      await this.syncWithPlatform()
      this.startAutoSync()
    }
  }

  /**
   * Destroy the registry manager
   */
  public async destroy(): Promise<void> {
    this.isDestroyed = true
    
    this.stopAutoSync()
    await this.registry.destroy()
    
    this.platformAdapter = null
    this.knownProcesses.clear()
    this.lastProcessCheck.clear()
  }

  /**
   * Get the underlying registry
   */
  public getRegistry(): ProcessRegistry {
    return this.registry
  }

  // =============================================================================
  // Platform Synchronization
  // =============================================================================

  /**
   * Manually trigger sync with platform adapter
   */
  public async syncWithPlatform(): Promise<{
    discovered: number
    updated: number
    disappeared: number
    errors: string[]
  }> {
    if (!this.platformAdapter) {
      throw new RegistryError('Platform adapter not initialized')
    }

    const result = {
      discovered: 0,
      updated: 0,
      disappeared: 0,
      errors: [] as string[]
    }

    try {
      // Get current processes from platform
      const currentProcesses = await this.platformAdapter.getProcessList()
      const currentPids = new Set(currentProcesses.map(p => p.pid))
      const now = new Date()

      // Discover new processes and update existing ones
      for (const process of currentProcesses) {
        try {
          const existingProcess = await this.registry.getProcessByPid(process.pid)
          
          if (existingProcess) {
            // Update existing process
            if (this.config.enableProcessTracking) {
              await this.registry.updateProcess(existingProcess.registryId, process)
              result.updated++
            }
          } else {
            // Discover new process
            if (this.config.enableProcessDiscovery) {
              await this.registry.registerProcess(process)
              result.discovered++
            }
          }
          
          // Track that we've seen this process
          this.knownProcesses.add(process.pid)
          this.lastProcessCheck.set(process.pid, now)
          
        } catch (error) {
          result.errors.push(`Failed to sync process ${process.pid}: ${error}`)
        }
      }

      // Handle disappeared processes
      if (this.config.enableDeadProcessCleanup) {
        const disappearedPids: number[] = []
        
        for (const pid of this.knownProcesses) {
          if (!currentPids.has(pid)) {
            const lastSeen = this.lastProcessCheck.get(pid)
            if (lastSeen && (now.getTime() - lastSeen.getTime()) > this.config.deadProcessTimeout) {
              disappearedPids.push(pid)
            }
          }
        }
        
        for (const pid of disappearedPids) {
          try {
            const process = await this.registry.getProcessByPid(pid)
            if (process) {
              await this.registry.unregisterProcess(process.registryId)
              result.disappeared++
            }
            
            this.knownProcesses.delete(pid)
            this.lastProcessCheck.delete(pid)
            
          } catch (error) {
            result.errors.push(`Failed to unregister disappeared process ${pid}: ${error}`)
          }
        }
      }

      this.lastSyncTime = now
      this.syncErrorCount = 0

    } catch (error) {
      this.syncErrorCount++
      result.errors.push(`Platform sync failed: ${error}`)
      throw new RegistryError(`Platform synchronization failed: ${error}`, error)
    }

    return result
  }

  /**
   * Get sync status information
   */
  public getSyncStatus(): {
    lastSync: Date | null
    nextSync: Date | null
    errorCount: number
    isEnabled: boolean
    knownProcessCount: number
  } {
    const nextSync = this.lastSyncTime && this.config.autoSyncEnabled
      ? new Date(this.lastSyncTime.getTime() + this.config.autoSyncInterval)
      : null

    return {
      lastSync: this.lastSyncTime,
      nextSync,
      errorCount: this.syncErrorCount,
      isEnabled: this.config.autoSyncEnabled,
      knownProcessCount: this.knownProcesses.size
    }
  }

  // =============================================================================
  // Process Management Integration
  // =============================================================================

  /**
   * Enhanced process registration with automatic tagging and metadata
   */
  public async registerProcessWithMetadata(
    process: ProcessInfo,
    tags: string[] = [],
    managementConfig?: ProcessManagementConfig
  ): Promise<RegistryProcessInfo> {
    const registryProcess = await this.registry.registerProcess(process)
    
    // Apply tags if provided
    if (tags.length > 0) {
      await this.registry.tagProcess(registryProcess.registryId, tags)
    }
    
    // Apply management config if provided
    if (managementConfig) {
      await this.registry.manageProcess(registryProcess.registryId, managementConfig)
    }
    
    // Track in known processes
    this.knownProcesses.add(process.pid)
    this.lastProcessCheck.set(process.pid, new Date())
    
    // Return updated process with tags and management status
    const updatedProcess = await this.registry.getProcess(registryProcess.registryId)
    return updatedProcess!
  }

  /**
   * Bulk register processes with common configuration
   */
  public async bulkRegisterProcesses(
    processes: ProcessInfo[],
    commonTags: string[] = [],
    commonManagementConfig?: ProcessManagementConfig
  ): Promise<RegistryProcessInfo[]> {
    const results: RegistryProcessInfo[] = []
    
    for (const process of processes) {
      try {
        const registered = await this.registerProcessWithMetadata(
          process,
          commonTags,
          commonManagementConfig
        )
        results.push(registered)
      } catch (error) {
        console.error(`Failed to register process ${process.pid}:`, error)
      }
    }
    
    return results
  }

  /**
   * Smart process discovery with automatic categorization
   */
  public async discoverAndCategorizeProcesses(): Promise<{
    systemProcesses: RegistryProcessInfo[]
    userProcesses: RegistryProcessInfo[]
    applications: RegistryProcessInfo[]
    services: RegistryProcessInfo[]
  }> {
    if (!this.platformAdapter) {
      throw new RegistryError('Platform adapter not initialized')
    }

    const processes = await this.platformAdapter.getProcessList()
    const result = {
      systemProcesses: [] as RegistryProcessInfo[],
      userProcesses: [] as RegistryProcessInfo[],
      applications: [] as RegistryProcessInfo[],
      services: [] as RegistryProcessInfo[]
    }

    for (const process of processes) {
      let category: keyof typeof result
      let tags: string[] = []

      // Categorize based on various heuristics
      if (process.user === 'root' || process.user === 'system') {
        category = 'systemProcesses'
        tags.push('system')
      } else if (process.name.includes('app') || process.name.includes('App')) {
        category = 'applications'
        tags.push('application')
      } else if (process.name.includes('service') || process.name.includes('daemon')) {
        category = 'services'
        tags.push('service')
      } else {
        category = 'userProcesses'
        tags.push('user')
      }

      // Add additional tags based on process characteristics
      if (process.cpu > 50) tags.push('high-cpu')
      if (process.memory > 1000000000) tags.push('high-memory') // > 1GB
      if (process.name.toLowerCase().includes('browser')) tags.push('browser')
      if (process.name.toLowerCase().includes('editor')) tags.push('editor')

      try {
        const registryProcess = await this.registerProcessWithMetadata(process, tags)
        result[category].push(registryProcess)
      } catch (error) {
        console.error(`Failed to register and categorize process ${process.pid}:`, error)
      }
    }

    return result
  }

  // =============================================================================
  // Enhanced Query and Analytics
  // =============================================================================

  /**
   * Get process analytics with trends and insights
   */
  public async getProcessAnalytics(timeRange?: { start: Date; end: Date }): Promise<{
    totalProcesses: number
    newProcessesToday: number
    disappearedProcessesToday: number
    topCpuConsumers: RegistryProcessInfo[]
    topMemoryConsumers: RegistryProcessInfo[]
    mostActiveProcesses: RegistryProcessInfo[] // Most status changes
    managedProcessHealth: {
      healthy: number
      unhealthy: number
      total: number
    }
  }> {
    const statistics = await this.registry.getStatistics()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Get today's events
    const todayEvents = await this.registry.queryEvents({
      timestampAfter: today
    })
    
    const newProcessesToday = todayEvents.items.filter(e => e.event === 'discovered').length
    const disappearedProcessesToday = todayEvents.items.filter(e => e.event === 'disappeared').length
    
    // Get most active processes (most events)
    const eventCounts = new Map<string, number>()
    todayEvents.items.forEach(event => {
      const current = eventCounts.get(event.registryId) || 0
      eventCounts.set(event.registryId, current + 1)
    })
    
    const mostActiveIds = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)
    
    const mostActiveProcesses: RegistryProcessInfo[] = []
    for (const id of mostActiveIds) {
      const process = await this.registry.getProcess(id)
      if (process) mostActiveProcesses.push(process)
    }
    
    // Managed process health
    const managedProcesses = await this.registry.getAllManagedProcesses()
    const healthyCount = managedProcesses.filter(p => p.isHealthy).length
    
    return {
      totalProcesses: statistics.totalProcesses,
      newProcessesToday,
      disappearedProcessesToday,
      topCpuConsumers: statistics.topProcessesByCpu.slice(0, 10),
      topMemoryConsumers: statistics.topProcessesByMemory.slice(0, 10),
      mostActiveProcesses,
      managedProcessHealth: {
        healthy: healthyCount,
        unhealthy: managedProcesses.length - healthyCount,
        total: managedProcesses.length
      }
    }
  }

  /**
   * Enhanced process search with fuzzy matching and ranking
   */
  public async searchProcesses(
    searchTerm: string,
    options: {
      includeInactive?: boolean
      tagFilter?: string[]
      limit?: number
    } = {}
  ): Promise<RegistryProcessInfo[]> {
    const { includeInactive = false, tagFilter = [], limit = 50 } = options
    
    const query: RegistryProcessQuery = {}
    
    // Apply tag filter
    if (tagFilter.length > 0) {
      query.tags = tagFilter
    }
    
    // Get all matching processes
    const result = await this.registry.queryProcesses(query)
    let processes = result.items
    
    // Filter by status if needed
    if (!includeInactive) {
      processes = processes.filter(p => p.status === 'running')
    }
    
    // Fuzzy search and ranking
    const searchLower = searchTerm.toLowerCase()
    const scored = processes.map(process => {
      let score = 0
      
      // Exact name match gets highest score
      if (process.name.toLowerCase() === searchLower) score += 100
      else if (process.name.toLowerCase().includes(searchLower)) score += 50
      
      // Command match
      if (process.command.toLowerCase().includes(searchLower)) score += 30
      
      // User match
      if (process.user.toLowerCase().includes(searchLower)) score += 20
      
      // Tag match
      if (process.tags.some(tag => tag.toLowerCase().includes(searchLower))) score += 40
      
      // Boost for managed processes
      if (process.isManaged) score += 10
      
      // Boost for recently seen processes
      const hoursSinceLastSeen = (Date.now() - process.lastSeen.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastSeen < 1) score += 15
      else if (hoursSinceLastSeen < 24) score += 5
      
      return { process, score }
    })
    
    // Filter out processes with no score and sort by score
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.process)
  }

  // =============================================================================
  // Streaming and Real-time Updates
  // =============================================================================

  /**
   * Stream registry events in real-time
   */
  public streamRegistryEvents(): Stream.Stream<ProcessLifecycleEventRecord, never, never> {
    return Stream.repeatEffect(
      Effect.gen((function* (this: ProcessRegistryManager) {
        yield* Effect.sleep(1000) // Check every second
        
        // Get recent events (last 2 seconds to avoid missing any)
        const recentEvents = yield* Effect.tryPromise(() =>
          this.registry.queryEvents({
            timestampAfter: new Date(Date.now() - 2000)
          })
        )
        
        return recentEvents.items
      }).bind(this))
    ).pipe(
      Stream.flatMap((events) => Stream.fromIterable(events))
    )
  }

  /**
   * Stream process changes
   */
  public streamProcessUpdates(): Stream.Stream<{
    type: 'registered' | 'updated' | 'unregistered'
    process: RegistryProcessInfo
  }, never, never> {
    const events = this.streamRegistryEvents()
    
    return Stream.filterMap(events, (event) => {
      return Effect.gen((function* (this: ProcessRegistryManager) {
        const process = yield* Effect.tryPromise(() => 
          this.registry.getProcess(event.registryId)
        )
        
        if (!process) return null
        
        let type: 'registered' | 'updated' | 'unregistered'
        
        switch (event.event) {
          case 'discovered':
            type = 'registered'
            break
          case 'disappeared':
            type = 'unregistered'
            break
          default:
            type = 'updated'
            break
        }
        
        return { type, process }
      }).bind(this))
    })
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private startAutoSync(): void {
    if (this.syncInterval || !this.config.autoSyncEnabled) return
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithPlatform()
      } catch (error) {
        console.error('Auto-sync failed:', error)
      }
    }, this.config.autoSyncInterval)
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}