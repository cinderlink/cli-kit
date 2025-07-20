/**
 * Central Process Registry
 * 
 * This module implements the central process registry that provides:
 * - Process lifecycle tracking and state management
 * - Event-driven process monitoring
 * - Advanced querying and filtering capabilities
 * - Process management and health monitoring
 * - Persistent storage and recovery
 * 
 * @module plugins/system/registry/process-registry
 */

import { Effect, Ref } from "effect"
import { v4 as uuidv4 } from "uuid"
import type { ProcessInfo, ProcessStatus } from "../types"
import {
  type ProcessRegistryConfig,
  type ProcessRegistryAPI,
  type RegistryProcessInfo,
  type ProcessLifecycleEvent,
  type ProcessLifecycleEventRecord,
  type RegistryProcessQuery,
  type ProcessEventQuery,
  type RegistryQueryResult,
  type ProcessManagementConfig,
  type ManagedProcess,
  type RegistryStatistics,
  type ProcessSnapshot,
  type RegistryStorage,
  ProcessRegistryConfigSchema,
  RegistryError,
  ProcessNotFoundInRegistryError,
  RegistryValidationError,
} from "./types"

// =============================================================================
// In-Memory Registry Storage
// =============================================================================

/**
 * In-memory storage implementation for the registry
 */
export class InMemoryRegistryStorage implements RegistryStorage {
  private snapshots: ProcessSnapshot[] = []
  private events: ProcessLifecycleEventRecord[] = []

  async saveSnapshot(snapshot: ProcessSnapshot): Promise<void> {
    // Replace existing snapshot for same registry ID
    const existingIndex = this.snapshots.findIndex(s => s.registryId === snapshot.registryId)
    if (existingIndex >= 0) {
      this.snapshots[existingIndex] = snapshot
    } else {
      this.snapshots.push(snapshot)
    }
  }

  async loadSnapshots(): Promise<ProcessSnapshot[]> {
    return [...this.snapshots]
  }

  async saveEvent(event: ProcessLifecycleEventRecord): Promise<void> {
    this.events.push(event)
  }

  async loadEvents(query: ProcessEventQuery): Promise<ProcessLifecycleEventRecord[]> {
    let filtered = this.events

    if (query.registryId) {
      filtered = filtered.filter(e => e.registryId === query.registryId)
    }
    
    if (query.pid) {
      filtered = filtered.filter(e => e.pid === query.pid)
    }
    
    if (query.events && query.events.length > 0) {
      filtered = filtered.filter(e => query.events!.includes(e.event))
    }
    
    if (query.timestampAfter) {
      filtered = filtered.filter(e => e.timestamp >= query.timestampAfter!)
    }
    
    if (query.timestampBefore) {
      filtered = filtered.filter(e => e.timestamp <= query.timestampBefore!)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || filtered.length
    
    return filtered.slice(offset, offset + limit)
  }

  async cleanup(processRetentionDate: Date, eventRetentionDate: Date): Promise<{
    removedProcesses: number
    removedEvents: number
  }> {
    const initialSnapshotCount = this.snapshots.length
    const initialEventCount = this.events.length

    // Remove old snapshots
    this.snapshots = this.snapshots.filter(s => s.snapshotTime >= processRetentionDate)
    
    // Remove old events
    this.events = this.events.filter(e => e.timestamp >= eventRetentionDate)

    return {
      removedProcesses: initialSnapshotCount - this.snapshots.length,
      removedEvents: initialEventCount - this.events.length
    }
  }

  // Development utility methods
  clear(): void {
    this.snapshots = []
    this.events = []
  }

  getEventCount(): number {
    return this.events.length
  }

  getSnapshotCount(): number {
    return this.snapshots.length
  }
}

// =============================================================================
// Central Process Registry Implementation
// =============================================================================

/**
 * Central process registry for tracking and managing system processes
 */
export class ProcessRegistry implements ProcessRegistryAPI {
  private readonly config: ProcessRegistryConfig
  private readonly storage: RegistryStorage
  
  // In-memory state
  private readonly processes = new Map<string, RegistryProcessInfo>()
  private readonly pidToRegistryId = new Map<number, string>()
  private readonly managedProcesses = new Map<string, ManagedProcess>()
  private readonly processTags = new Map<string, Set<string>>()
  
  // Cleanup state
  private cleanupInterval: Timer | null = null
  private persistenceInterval: Timer | null = null
  private lastCleanup: Date | null = null

  constructor(config: Partial<ProcessRegistryConfig> = {}, storage?: RegistryStorage) {
    this.config = ProcessRegistryConfigSchema.parse(config)
    this.storage = storage || new InMemoryRegistryStorage()
    
    this.initialize()
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  private initialize(): void {
    // Start periodic cleanup if enabled
    if (this.config.enableAutoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup().catch(error => {
          console.error('Registry cleanup failed:', error)
        })
      }, this.config.cleanupInterval)
    }

    // Start periodic persistence if enabled
    if (this.config.enablePersistence) {
      this.persistenceInterval = setInterval(() => {
        this.persistCurrentState().catch(error => {
          console.error('Registry persistence failed:', error)
        })
      }, this.config.persistenceInterval)
    }
  }

  public async destroy(): Promise<void> {
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval)
      this.persistenceInterval = null
    }

    // Final persistence
    if (this.config.enablePersistence) {
      await this.persistCurrentState()
    }

    // Clear state
    this.processes.clear()
    this.pidToRegistryId.clear()
    this.managedProcesses.clear()
    this.processTags.clear()
  }

  // =============================================================================
  // Process Registration and Tracking
  // =============================================================================

  async registerProcess(process: ProcessInfo): Promise<RegistryProcessInfo> {
    // Check if process already exists by PID
    const existingRegistryId = this.pidToRegistryId.get(process.pid)
    if (existingRegistryId) {
      return this.updateProcess(existingRegistryId, process)
    }

    const registryId = uuidv4()
    const now = new Date()
    
    const registryProcess: RegistryProcessInfo = {
      ...process,
      registryId,
      firstSeen: now,
      lastSeen: now,
      seenCount: 1,
      isManaged: false,
      tags: []
    }

    this.processes.set(registryId, registryProcess)
    this.pidToRegistryId.set(process.pid, registryId)

    // Record lifecycle event
    if (this.config.enableLifecycleEvents) {
      await this.addEvent({
        registryId,
        pid: process.pid,
        event: 'discovered',
        newStatus: process.status,
        metadata: { name: process.name, command: process.command }
      })
    }

    return registryProcess
  }

  async updateProcess(registryId: string, process: ProcessInfo): Promise<RegistryProcessInfo> {
    const existing = this.processes.get(registryId)
    if (!existing) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    const now = new Date()
    const previousStatus = existing.status
    
    const updated: RegistryProcessInfo = {
      ...existing,
      ...process,
      registryId, // Preserve registry ID
      firstSeen: existing.firstSeen, // Preserve first seen
      lastSeen: now,
      seenCount: existing.seenCount + 1,
      tags: existing.tags // Preserve tags
    }

    this.processes.set(registryId, updated)
    this.pidToRegistryId.set(process.pid, registryId)

    // Record lifecycle events
    if (this.config.enableLifecycleEvents) {
      if (previousStatus !== process.status) {
        await this.addEvent({
          registryId,
          pid: process.pid,
          event: 'status_change',
          previousStatus,
          newStatus: process.status
        })
      } else {
        await this.addEvent({
          registryId,
          pid: process.pid,
          event: 'updated'
        })
      }
    }

    return updated
  }

  async unregisterProcess(registryId: string): Promise<void> {
    const process = this.processes.get(registryId)
    if (!process) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    // Record lifecycle event
    if (this.config.enableLifecycleEvents) {
      await this.addEvent({
        registryId,
        pid: process.pid,
        event: 'disappeared',
        previousStatus: process.status
      })
    }

    // Remove from all maps
    this.processes.delete(registryId)
    this.pidToRegistryId.delete(process.pid)
    this.managedProcesses.delete(registryId)
    this.processTags.delete(registryId)
  }

  // =============================================================================
  // Process Querying
  // =============================================================================

  async getProcess(registryId: string): Promise<RegistryProcessInfo | null> {
    return this.processes.get(registryId) || null
  }

  async getProcessByPid(pid: number): Promise<RegistryProcessInfo | null> {
    const registryId = this.pidToRegistryId.get(pid)
    if (!registryId) return null
    return this.getProcess(registryId)
  }

  async queryProcesses(query: RegistryProcessQuery): Promise<RegistryQueryResult<RegistryProcessInfo>> {
    let processes = Array.from(this.processes.values())

    // Apply filters
    if (query.registryId) {
      processes = processes.filter(p => p.registryId === query.registryId)
    }
    
    if (query.name) {
      processes = processes.filter(p => p.name.toLowerCase().includes(query.name!.toLowerCase()))
    }
    
    if (query.user) {
      processes = processes.filter(p => p.user === query.user)
    }
    
    if (query.command) {
      processes = processes.filter(p => p.command.toLowerCase().includes(query.command!.toLowerCase()))
    }
    
    if (query.status) {
      processes = processes.filter(p => p.status === query.status)
    }
    
    if (query.minCpu !== undefined) {
      processes = processes.filter(p => p.cpu >= query.minCpu!)
    }
    
    if (query.minMemory !== undefined) {
      processes = processes.filter(p => p.memory >= query.minMemory!)
    }
    
    if (query.isManaged !== undefined) {
      processes = processes.filter(p => p.isManaged === query.isManaged)
    }
    
    if (query.tags && query.tags.length > 0) {
      processes = processes.filter(p => 
        query.tags!.some(tag => p.tags.includes(tag))
      )
    }
    
    if (query.firstSeenAfter) {
      processes = processes.filter(p => p.firstSeen >= query.firstSeenAfter!)
    }
    
    if (query.firstSeenBefore) {
      processes = processes.filter(p => p.firstSeen <= query.firstSeenBefore!)
    }
    
    if (query.lastSeenAfter) {
      processes = processes.filter(p => p.lastSeen >= query.lastSeenAfter!)
    }
    
    if (query.lastSeenBefore) {
      processes = processes.filter(p => p.lastSeen <= query.lastSeenBefore!)
    }
    
    if (query.minSeenCount !== undefined) {
      processes = processes.filter(p => p.seenCount >= query.minSeenCount!)
    }
    
    if (query.maxSeenCount !== undefined) {
      processes = processes.filter(p => p.seenCount <= query.maxSeenCount!)
    }

    return {
      items: processes,
      totalCount: processes.length,
      hasMore: false,
      nextOffset: undefined
    }
  }

  async getAllProcesses(): Promise<readonly RegistryProcessInfo[]> {
    return Array.from(this.processes.values())
  }

  // =============================================================================
  // Process Management
  // =============================================================================

  async manageProcess(registryId: string, config: ProcessManagementConfig): Promise<void> {
    const process = this.processes.get(registryId)
    if (!process) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    const managedProcess: ManagedProcess = {
      registryId,
      config,
      restartCount: 0,
      lastRestartTime: null,
      isHealthy: true,
      lastHealthCheck: null,
      healthCheckFailures: 0
    }

    this.managedProcesses.set(registryId, managedProcess)
    
    // Update process managed status
    const updated = { ...process, isManaged: true }
    this.processes.set(registryId, updated)

    // Record lifecycle event
    if (this.config.enableLifecycleEvents) {
      await this.addEvent({
        registryId,
        pid: process.pid,
        event: 'managed',
        metadata: { config }
      })
    }
  }

  async unmanageProcess(registryId: string): Promise<void> {
    const process = this.processes.get(registryId)
    if (!process) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    this.managedProcesses.delete(registryId)
    
    // Update process managed status
    const updated = { ...process, isManaged: false }
    this.processes.set(registryId, updated)

    // Record lifecycle event
    if (this.config.enableLifecycleEvents) {
      await this.addEvent({
        registryId,
        pid: process.pid,
        event: 'unmanaged'
      })
    }
  }

  async getManagedProcess(registryId: string): Promise<ManagedProcess | null> {
    return this.managedProcesses.get(registryId) || null
  }

  async getAllManagedProcesses(): Promise<readonly ManagedProcess[]> {
    return Array.from(this.managedProcesses.values())
  }

  // =============================================================================
  // Lifecycle Events
  // =============================================================================

  async getProcessEvents(registryId: string): Promise<readonly ProcessLifecycleEventRecord[]> {
    return this.storage.loadEvents({ registryId })
  }

  async queryEvents(query: ProcessEventQuery): Promise<RegistryQueryResult<ProcessLifecycleEventRecord>> {
    const events = await this.storage.loadEvents(query)
    
    return {
      items: events,
      totalCount: events.length,
      hasMore: false, // TODO: Implement proper pagination
      nextOffset: undefined
    }
  }

  async addEvent(event: Omit<ProcessLifecycleEventRecord, 'eventId' | 'timestamp'>): Promise<ProcessLifecycleEventRecord> {
    const fullEvent: ProcessLifecycleEventRecord = {
      ...event,
      eventId: uuidv4(),
      timestamp: new Date()
    }

    await this.storage.saveEvent(fullEvent)
    return fullEvent
  }

  // =============================================================================
  // Process Tagging
  // =============================================================================

  async tagProcess(registryId: string, tags: readonly string[]): Promise<void> {
    const process = this.processes.get(registryId)
    if (!process) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    const existingTags = new Set(process.tags)
    tags.forEach(tag => existingTags.add(tag))
    
    const updated = { ...process, tags: Array.from(existingTags) }
    this.processes.set(registryId, updated)
    
    // Update reverse lookup
    if (!this.processTags.has(registryId)) {
      this.processTags.set(registryId, new Set())
    }
    const processTagSet = this.processTags.get(registryId)!
    tags.forEach(tag => processTagSet.add(tag))
  }

  async untagProcess(registryId: string, tags: readonly string[]): Promise<void> {
    const process = this.processes.get(registryId)
    if (!process) {
      throw new ProcessNotFoundInRegistryError(registryId)
    }

    const existingTags = new Set(process.tags)
    tags.forEach(tag => existingTags.delete(tag))
    
    const updated = { ...process, tags: Array.from(existingTags) }
    this.processes.set(registryId, updated)
    
    // Update reverse lookup
    const processTagSet = this.processTags.get(registryId)
    if (processTagSet) {
      tags.forEach(tag => processTagSet.delete(tag))
    }
  }

  async getProcessesByTag(tag: string): Promise<readonly RegistryProcessInfo[]> {
    return Array.from(this.processes.values()).filter(p => p.tags.includes(tag))
  }

  // =============================================================================
  // Statistics and Monitoring
  // =============================================================================

  async getStatistics(): Promise<RegistryStatistics> {
    const processes = Array.from(this.processes.values())
    const events = await this.storage.loadEvents({})
    
    const activeProcesses = processes.filter(p => p.status === 'running')
    const managedProcesses = processes.filter(p => p.isManaged)
    
    const processCountByStatus: Record<ProcessStatus, number> = {
      running: 0,
      stopped: 0,
      error: 0,
      starting: 0,
      stopping: 0
    }
    
    processes.forEach(p => {
      processCountByStatus[p.status]++
    })
    
    const eventCountByType: Record<ProcessLifecycleEvent, number> = {
      discovered: 0,
      updated: 0,
      status_change: 0,
      disappeared: 0,
      reappeared: 0,
      managed: 0,
      unmanaged: 0
    }
    
    events.forEach(e => {
      eventCountByType[e.event]++
    })
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventsToday = events.filter(e => e.timestamp >= today).length
    
    // Top processes by memory and CPU
    const sortedByMemory = [...processes].sort((a, b) => b.memory - a.memory)
    const sortedByCpu = [...processes].sort((a, b) => b.cpu - a.cpu)
    
    const sortedByAge = [...processes].sort((a, b) => a.firstSeen.getTime() - b.firstSeen.getTime())
    
    return {
      totalProcesses: processes.length,
      activeProcesses: activeProcesses.length,
      managedProcesses: managedProcesses.length,
      totalEvents: events.length,
      eventsToday,
      topProcessesByMemory: sortedByMemory.slice(0, 10),
      topProcessesByCpu: sortedByCpu.slice(0, 10),
      processCountByStatus,
      eventCountByType,
      oldestProcess: sortedByAge[0],
      newestProcess: sortedByAge[sortedByAge.length - 1]
    }
  }

  async getHealthStatus(): Promise<{
    healthy: boolean
    issues: readonly string[]
    lastCleanup: Date | null
    nextCleanup: Date | null
  }> {
    const issues: string[] = []
    
    // Check if too many processes
    if (this.processes.size > this.config.maxProcessHistory * 0.9) {
      issues.push(`Process count approaching limit: ${this.processes.size}/${this.config.maxProcessHistory}`)
    }
    
    // Check managed process health
    const managedProcesses = Array.from(this.managedProcesses.values())
    const unhealthyCount = managedProcesses.filter(p => !p.isHealthy).length
    if (unhealthyCount > 0) {
      issues.push(`${unhealthyCount} managed processes are unhealthy`)
    }
    
    const nextCleanup = this.lastCleanup 
      ? new Date(this.lastCleanup.getTime() + this.config.cleanupInterval)
      : null
    
    return {
      healthy: issues.length === 0,
      issues,
      lastCleanup: this.lastCleanup,
      nextCleanup
    }
  }

  // =============================================================================
  // Persistence and Cleanup
  // =============================================================================

  async snapshot(): Promise<ProcessSnapshot[]> {
    const snapshots: ProcessSnapshot[] = []
    
    for (const process of this.processes.values()) {
      const events = await this.storage.loadEvents({ registryId: process.registryId })
      
      snapshots.push({
        registryId: process.registryId,
        processInfo: process,
        lifecycle: events,
        snapshotTime: new Date()
      })
    }
    
    return snapshots
  }

  async restore(snapshots: readonly ProcessSnapshot[]): Promise<void> {
    this.processes.clear()
    this.pidToRegistryId.clear()
    this.managedProcesses.clear()
    this.processTags.clear()
    
    for (const snapshot of snapshots) {
      this.processes.set(snapshot.registryId, snapshot.processInfo)
      this.pidToRegistryId.set(snapshot.processInfo.pid, snapshot.registryId)
      
      // Restore tags
      if (snapshot.processInfo.tags.length > 0) {
        this.processTags.set(snapshot.registryId, new Set(snapshot.processInfo.tags))
      }
      
      // Restore events
      for (const event of snapshot.lifecycle) {
        await this.storage.saveEvent(event)
      }
    }
  }

  async cleanup(): Promise<{
    removedProcesses: number
    removedEvents: number
  }> {
    const now = new Date()
    const processRetentionDate = new Date(now.getTime() - this.config.processRetentionDays * 24 * 60 * 60 * 1000)
    const eventRetentionDate = new Date(now.getTime() - this.config.eventRetentionDays * 24 * 60 * 60 * 1000)
    
    // Remove old processes
    let removedProcesses = 0
    for (const [registryId, process] of this.processes.entries()) {
      if (process.lastSeen < processRetentionDate) {
        this.processes.delete(registryId)
        this.pidToRegistryId.delete(process.pid)
        this.managedProcesses.delete(registryId)
        this.processTags.delete(registryId)
        removedProcesses++
      }
    }
    
    // Clean up storage
    const storageCleanup = await this.storage.cleanup(processRetentionDate, eventRetentionDate)
    
    this.lastCleanup = now
    
    return {
      removedProcesses: removedProcesses + storageCleanup.removedProcesses,
      removedEvents: storageCleanup.removedEvents
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  private async persistCurrentState(): Promise<void> {
    if (!this.config.enablePersistence) return
    
    const snapshots = await this.snapshot()
    for (const snapshot of snapshots) {
      await this.storage.saveSnapshot(snapshot)
    }
  }

  // Development helpers
  public getProcessCount(): number {
    return this.processes.size
  }

  public getManagedProcessCount(): number {
    return this.managedProcesses.size
  }
}