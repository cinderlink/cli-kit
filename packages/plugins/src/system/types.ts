/**
 * Process Manager Plugin Types
 * 
 * This module defines the complete type system for the Process Manager Plugin,
 * providing interfaces for process management, system metrics, and real-time monitoring.
 * 
 * @module plugins/system/types
 */

import { z } from "zod"
import { Effect, Stream } from "effect"

// =============================================================================
// Process Information Types
// =============================================================================

/**
 * Process status enumeration
 */
export type ProcessStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping'

/**
 * Complete process information interface
 */
export interface ProcessInfo {
  readonly pid: number
  readonly ppid: number
  readonly name: string
  readonly command: string
  readonly args: readonly string[]
  readonly user: string
  cpu: number // Mutable for mock updates
  memory: number // Mutable for mock updates
  readonly vsz: number // Virtual memory size in bytes
  readonly rss: number // Resident set size in bytes
  readonly startTime: Date
  status: ProcessStatus // Mutable for state changes
}

/**
 * Process tree node structure
 */
export interface ProcessTreeNode {
  readonly process: ProcessInfo
  readonly children: ProcessTreeNode[]
  depth: number // Mutable for tree building
}

/**
 * Process query interface for filtering
 */
export interface ProcessQuery {
  readonly name?: string
  readonly user?: string
  readonly minCpu?: number
  readonly minMemory?: number
  readonly command?: string
  readonly status?: ProcessStatus
}

// =============================================================================
// System Metrics Types
// =============================================================================

/**
 * CPU metrics interface
 */
export interface CpuMetrics {
  readonly overall: number // Overall CPU usage percentage
  readonly cores: number[] // Per-core usage percentages
  readonly loadAverage: {
    readonly one: number
    readonly five: number
    readonly fifteen: number
  }
}

/**
 * Memory metrics interface
 */
export interface MemoryMetrics {
  readonly total: number // Total memory in bytes
  readonly available: number // Available memory in bytes
  readonly used: number // Used memory in bytes
  readonly free: number // Free memory in bytes
  readonly percent: number // Memory usage percentage
  readonly swap: {
    readonly total: number
    readonly used: number
    readonly free: number
    readonly percent: number
  }
}

/**
 * Disk metrics interface
 */
export interface DiskMetrics {
  readonly totalReads: number
  readonly totalWrites: number
  readonly readBytesPerSec: number
  readonly writeBytesPerSec: number
  readonly utilization: number // Disk utilization percentage
}

/**
 * Complete system metrics
 */
export interface SystemMetrics {
  readonly cpu: CpuMetrics
  readonly memory: MemoryMetrics
  readonly disk: DiskMetrics
  readonly timestamp: Date
}

/**
 * Time range for metrics aggregation
 */
export interface TimeRange {
  readonly start: Date
  readonly end: Date
}

/**
 * Aggregated metrics over a time range
 */
export interface AggregatedMetrics {
  readonly cpu: {
    readonly min: number
    readonly max: number
    readonly avg: number
  }
  readonly memory: {
    readonly min: number
    readonly max: number
    readonly avg: number
  }
  readonly disk: {
    readonly totalReads: number
    readonly totalWrites: number
  }
  readonly timeRange: TimeRange
  readonly sampleCount: number
}

// =============================================================================
// Process Manager Configuration
// =============================================================================

/**
 * Process Manager Plugin configuration schema
 */
export const ProcessManagerConfigSchema = z.object({
  refreshInterval: z.number().min(100).max(10000).default(1000),
  enableProcessTree: z.boolean().default(true),
  monitorSystemMetrics: z.boolean().default(true),
  bufferSize: z.number().min(10).max(10000).default(1000),
  enableAutoRestart: z.boolean().default(false),
  maxProcessHistory: z.number().min(100).max(100000).default(10000),
  platformAdapter: z.enum(['auto', 'darwin', 'linux', 'mock']).default('auto'),
  enableIPC: z.boolean().default(false),
  ipcConfig: z.object({
    broker: z.object({
      maxChannels: z.number().min(1).max(1000).default(100),
      maxClients: z.number().min(1).max(10000).default(1000),
      messageRetention: z.number().min(1000).max(86400000).default(300000),
      enablePersistence: z.boolean().default(false),
      heartbeatInterval: z.number().min(1000).max(60000).default(10000),
      cleanupInterval: z.number().min(5000).max(300000).default(30000),
    }).default({}),
    client: z.object({
      heartbeatInterval: z.number().min(1000).max(30000).default(5000),
      reconnectAttempts: z.number().min(0).max(10).default(3),
      reconnectDelay: z.number().min(1000).max(30000).default(5000),
      requestTimeout: z.number().min(1000).max(60000).default(10000),
    }).default({}),
  }).default({}),
  
  // Process pooling configuration
  enablePooling: z.boolean().default(false),
  poolConfig: z.object({
    defaultPoolSize: z.number().min(1).max(100).default(5),
    maxPools: z.number().min(1).max(100).default(10),
    poolScalingStrategy: z.enum(['fixed', 'dynamic', 'on_demand', 'scheduled']).default('dynamic'),
    poolLoadBalancing: z.enum(['round_robin', 'least_connections', 'least_busy', 'weighted', 'random']).default('least_busy'),
    poolHealthCheckInterval: z.number().min(1000).max(60000).default(10000),
    poolWorkerTimeout: z.number().min(10000).max(3600000).default(300000),
    poolTaskTimeout: z.number().min(1000).max(3600000).default(60000),
    poolMaxQueueSize: z.number().min(1).max(100000).default(10000),
  }).default({}),
})

export type ProcessManagerConfig = z.infer<typeof ProcessManagerConfigSchema>

// =============================================================================
// Process Manager API Interface
// =============================================================================

/**
 * Main Process Manager API interface
 */
export interface ProcessManagerAPI {
  // Process enumeration
  getProcessList(): Promise<ProcessInfo[]>
  getProcessTree(): Promise<ProcessTreeNode[]>
  findProcesses(query: ProcessQuery): Promise<ProcessInfo[]>
  
  // Process management
  killProcess(pid: number, signal?: string): Promise<void>
  suspendProcess(pid: number): Promise<void>
  resumeProcess(pid: number): Promise<void>
  
  // System metrics
  getSystemMetrics(): Promise<SystemMetrics>
  getMetricsHistory(): SystemMetrics[]
  getAggregatedMetrics(timeRange: TimeRange): AggregatedMetrics
  
  // Real-time monitoring
  subscribeToProcessUpdates(): Stream.Stream<ProcessInfo[], never, never>
  subscribeToMetrics(): Stream.Stream<SystemMetrics, never, never>
  watchProcess(pid: number): Stream.Stream<ProcessInfo, never, never>
  
  // IPC functionality (optional)
  sendIPCMessage?(processId: string, payload: unknown): Promise<void>
  requestIPCResponse?(processId: string, payload: unknown): Promise<unknown>
  broadcastIPCMessage?(payload: unknown): Promise<void>
  registerProcessForIPC?(processInfo: ProcessInfo): Promise<string>
  unregisterProcessFromIPC?(processId: string): Promise<void>
  getIPCConnections?(): Array<{
    processId: string
    processInfo: ProcessInfo
    connected: boolean
    lastActivity: Date
  }>
  
  // Process pooling functionality (optional)
  createPool?(poolId: string, config: {
    name: string
    workerCommand: string
    workerArgs?: string[]
    minWorkers?: number
    maxWorkers?: number
    scalingStrategy?: 'fixed' | 'dynamic' | 'on_demand' | 'scheduled'
    loadBalancing?: 'round_robin' | 'least_connections' | 'least_busy' | 'weighted' | 'random'
  }): Promise<string>
  removePool?(poolId: string): Promise<void>
  submitTaskToPool?(poolId: string, task: {
    command: string
    args: string[]
    options?: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
      priority?: number
      retry?: number
    }
  }): Promise<string>
  getPoolStatus?(poolId: string): Promise<{
    id: string
    name: string
    isRunning: boolean
    totalWorkers: number
    idleWorkers: number
    busyWorkers: number
    queuedTasks: number
    runningTasks: number
    completedTasks: number
  } | null>
  getPoolMetrics?(poolId: string): Promise<{
    poolId: string
    totalTasksProcessed: number
    totalTasksCompleted: number
    totalTasksFailed: number
    averageTaskDuration: number
    workerUtilization: number
    throughputPerSecond: number
  } | null>
  getAllPools?(): Array<{
    id: string
    name: string
    isRunning: boolean
    totalWorkers: number
    queuedTasks: number
  }>
  scalePool?(poolId: string, targetSize: number): Promise<void>
}

// =============================================================================
// Platform Adapter Interface
// =============================================================================

/**
 * Platform-specific adapter interface
 */
export interface ProcessPlatformAdapter {
  getProcessList(): Promise<ProcessInfo[]>
  getProcessInfo(pid: number): Promise<ProcessInfo | null>
  getSystemMetrics(): Promise<SystemMetrics>
  killProcess(pid: number, signal: string): Promise<void>
  suspendProcess(pid: number): Promise<void>
  resumeProcess(pid: number): Promise<void>
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Process collection error
 */
export class ProcessCollectionError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ProcessCollectionError'
  }
}

/**
 * Process enumeration error
 */
export class ProcessEnumerationError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ProcessEnumerationError'
  }
}

/**
 * Process management error
 */
export class ProcessManagementError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ProcessManagementError'
  }
}

/**
 * Process not found error
 */
export class ProcessNotFoundError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ProcessNotFoundError'
  }
}

/**
 * Metrics collection error
 */
export class MetricsCollectionError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'MetricsCollectionError'
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Circular buffer interface for metrics history
 */
export interface CircularBuffer<T> {
  push(item: T): void
  toArray(): T[]
  size(): number
  clear(): void
  isFull(): boolean
}

/**
 * Plugin metadata for Process Manager
 */
export interface ProcessManagerPluginMetadata {
  readonly name: 'process-manager'
  readonly version: '1.0.0'
  readonly description: 'System process management and monitoring'
  readonly author: 'TUIX Team'
  readonly capabilities: readonly [
    'process-enumeration',
    'process-management',
    'system-metrics',
    'real-time-monitoring'
  ]
  readonly dependencies: readonly []
  readonly platform: readonly ['darwin', 'linux']
}