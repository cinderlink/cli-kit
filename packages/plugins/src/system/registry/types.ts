/**
 * Process Registry Types
 * 
 * This module defines the type system for the central process registry,
 * providing interfaces for process tracking, lifecycle management,
 * and state persistence.
 * 
 * @module plugins/system/registry/types
 */

import { z } from "zod"
import type { ProcessInfo, ProcessStatus, ProcessQuery } from "../types"

// =============================================================================
// Process Registry Core Types
// =============================================================================

/**
 * Extended process information with registry metadata
 */
export interface RegistryProcessInfo extends ProcessInfo {
  readonly registryId: string // Unique registry identifier
  readonly firstSeen: Date // When process was first discovered
  readonly lastSeen: Date // When process was last observed
  readonly seenCount: number // Number of times process has been observed
  readonly isManaged: boolean // Whether process is actively managed by registry
  readonly tags: readonly string[] // User-defined tags for categorization
}

/**
 * Process lifecycle event types
 */
export type ProcessLifecycleEvent = 
  | 'discovered'    // Process first seen
  | 'updated'       // Process information changed
  | 'status_change' // Process status changed
  | 'disappeared'   // Process no longer running
  | 'reappeared'    // Process came back after disappearing
  | 'managed'       // Process put under management
  | 'unmanaged'     // Process removed from management

/**
 * Process lifecycle event record
 */
export interface ProcessLifecycleEventRecord {
  readonly eventId: string
  readonly registryId: string
  readonly pid: number
  readonly event: ProcessLifecycleEvent
  readonly timestamp: Date
  readonly previousStatus?: ProcessStatus
  readonly newStatus?: ProcessStatus
  readonly metadata?: Record<string, unknown>
}

/**
 * Process state snapshot for persistence
 */
export interface ProcessSnapshot {
  readonly registryId: string
  readonly processInfo: RegistryProcessInfo
  readonly lifecycle: ProcessLifecycleEventRecord[]
  readonly snapshotTime: Date
}

// =============================================================================
// Registry Configuration
// =============================================================================

/**
 * Process registry configuration schema
 */
export const ProcessRegistryConfigSchema = z.object({
  maxProcessHistory: z.number().min(100).max(100000).default(10000),
  maxEventHistory: z.number().min(100).max(50000).default(5000),
  processRetentionDays: z.number().min(1).max(365).default(30),
  eventRetentionDays: z.number().min(1).max(90).default(7),
  enablePersistence: z.boolean().default(true),
  persistenceInterval: z.number().min(1000).max(300000).default(30000), // 30 seconds
  enableAutoCleanup: z.boolean().default(true),
  cleanupInterval: z.number().min(60000).max(86400000).default(3600000), // 1 hour
  enableLifecycleEvents: z.boolean().default(true),
  enableProcessTagging: z.boolean().default(true),
})

export type ProcessRegistryConfig = z.infer<typeof ProcessRegistryConfigSchema>

// =============================================================================
// Registry Query System
// =============================================================================

/**
 * Extended process query with registry-specific filters
 */
export interface RegistryProcessQuery extends ProcessQuery {
  readonly registryId?: string
  readonly tags?: readonly string[]
  readonly isManaged?: boolean
  readonly firstSeenAfter?: Date
  readonly firstSeenBefore?: Date
  readonly lastSeenAfter?: Date
  readonly lastSeenBefore?: Date
  readonly minSeenCount?: number
  readonly maxSeenCount?: number
  readonly hasEvents?: readonly ProcessLifecycleEvent[]
}

/**
 * Event query interface
 */
export interface ProcessEventQuery {
  readonly registryId?: string
  readonly pid?: number
  readonly events?: readonly ProcessLifecycleEvent[]
  readonly timestampAfter?: Date
  readonly timestampBefore?: Date
  readonly limit?: number
  readonly offset?: number
}

/**
 * Registry query result with pagination
 */
export interface RegistryQueryResult<T> {
  readonly items: readonly T[]
  readonly totalCount: number
  readonly hasMore: boolean
  readonly nextOffset?: number
}

// =============================================================================
// Process Management
// =============================================================================

/**
 * Process management configuration
 */
export interface ProcessManagementConfig {
  readonly autoRestart: boolean
  readonly maxRestarts: number
  readonly restartDelay: number // milliseconds
  readonly healthCheckInterval: number // milliseconds
  readonly healthCheckTimeout: number // milliseconds
  readonly gracefulShutdownTimeout: number // milliseconds
}

/**
 * Managed process information
 */
export interface ManagedProcess {
  readonly registryId: string
  readonly config: ProcessManagementConfig
  readonly restartCount: number
  readonly lastRestartTime: Date | null
  readonly isHealthy: boolean
  readonly lastHealthCheck: Date | null
  readonly healthCheckFailures: number
}

// =============================================================================
// Registry Statistics
// =============================================================================

/**
 * Registry statistics and metrics
 */
export interface RegistryStatistics {
  readonly totalProcesses: number
  readonly activeProcesses: number
  readonly managedProcesses: number
  readonly totalEvents: number
  readonly eventsToday: number
  readonly topProcessesByMemory: readonly RegistryProcessInfo[]
  readonly topProcessesByCpu: readonly RegistryProcessInfo[]
  readonly processCountByStatus: Record<ProcessStatus, number>
  readonly eventCountByType: Record<ProcessLifecycleEvent, number>
  readonly oldestProcess?: RegistryProcessInfo
  readonly newestProcess?: RegistryProcessInfo
}

// =============================================================================
// Registry API Interface
// =============================================================================

/**
 * Process registry API interface
 */
export interface ProcessRegistryAPI {
  // Process registration and tracking
  registerProcess(process: ProcessInfo): Promise<RegistryProcessInfo>
  updateProcess(registryId: string, process: ProcessInfo): Promise<RegistryProcessInfo>
  unregisterProcess(registryId: string): Promise<void>
  
  // Process querying
  getProcess(registryId: string): Promise<RegistryProcessInfo | null>
  getProcessByPid(pid: number): Promise<RegistryProcessInfo | null>
  queryProcesses(query: RegistryProcessQuery): Promise<RegistryQueryResult<RegistryProcessInfo>>
  getAllProcesses(): Promise<readonly RegistryProcessInfo[]>
  
  // Process management
  manageProcess(registryId: string, config: ProcessManagementConfig): Promise<void>
  unmanageProcess(registryId: string): Promise<void>
  getManagedProcess(registryId: string): Promise<ManagedProcess | null>
  getAllManagedProcesses(): Promise<readonly ManagedProcess[]>
  
  // Lifecycle events
  getProcessEvents(registryId: string): Promise<readonly ProcessLifecycleEventRecord[]>
  queryEvents(query: ProcessEventQuery): Promise<RegistryQueryResult<ProcessLifecycleEventRecord>>
  addEvent(event: Omit<ProcessLifecycleEventRecord, 'eventId' | 'timestamp'>): Promise<ProcessLifecycleEventRecord>
  
  // Process tagging
  tagProcess(registryId: string, tags: readonly string[]): Promise<void>
  untagProcess(registryId: string, tags: readonly string[]): Promise<void>
  getProcessesByTag(tag: string): Promise<readonly RegistryProcessInfo[]>
  
  // Statistics and monitoring
  getStatistics(): Promise<RegistryStatistics>
  getHealthStatus(): Promise<{
    healthy: boolean
    issues: readonly string[]
    lastCleanup: Date | null
    nextCleanup: Date | null
  }>
  
  // Persistence and cleanup
  snapshot(): Promise<ProcessSnapshot[]>
  restore(snapshots: readonly ProcessSnapshot[]): Promise<void>
  cleanup(): Promise<{
    removedProcesses: number
    removedEvents: number
  }>
}

// =============================================================================
// Storage Interface
// =============================================================================

/**
 * Registry storage interface for persistence
 */
export interface RegistryStorage {
  saveSnapshot(snapshot: ProcessSnapshot): Promise<void>
  loadSnapshots(): Promise<ProcessSnapshot[]>
  saveEvent(event: ProcessLifecycleEventRecord): Promise<void>
  loadEvents(query: ProcessEventQuery): Promise<ProcessLifecycleEventRecord[]>
  cleanup(processRetentionDate: Date, eventRetentionDate: Date): Promise<{
    removedProcesses: number
    removedEvents: number
  }>
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Registry operation error
 */
export class RegistryError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'RegistryError'
  }
}

/**
 * Process not found error
 */
export class ProcessNotFoundInRegistryError extends RegistryError {
  constructor(registryId: string) {
    super(`Process not found in registry: ${registryId}`)
    this.name = 'ProcessNotFoundInRegistryError'
  }
}

/**
 * Registry persistence error
 */
export class RegistryPersistenceError extends RegistryError {
  constructor(message: string, cause?: unknown) {
    super(`Registry persistence error: ${message}`, cause)
    this.name = 'RegistryPersistenceError'
  }
}

/**
 * Registry validation error
 */
export class RegistryValidationError extends RegistryError {
  constructor(message: string) {
    super(`Registry validation error: ${message}`)
    this.name = 'RegistryValidationError'
  }
}