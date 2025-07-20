/**
 * Process Pooling Types
 * 
 * This module defines the complete type system for process pooling,
 * including worker pool management, dynamic scaling, and load balancing.
 * 
 * @module plugins/system/pool/types
 */

import { z } from "zod"
import { Effect, Stream } from "effect"
import type { ProcessInfo } from "../types"

// =============================================================================
// Worker Pool Types
// =============================================================================

/**
 * Worker process status
 */
export type WorkerStatus = 'idle' | 'busy' | 'starting' | 'stopping' | 'failed' | 'terminated'

/**
 * Pool scaling strategy
 */
export type PoolScalingStrategy = 'fixed' | 'dynamic' | 'on_demand' | 'scheduled'

/**
 * Load balancing algorithm
 */
export type LoadBalancingAlgorithm = 'round_robin' | 'least_connections' | 'least_busy' | 'weighted' | 'random'

/**
 * Worker process information
 */
export interface WorkerProcess {
  readonly id: string
  readonly poolId: string
  readonly processInfo: ProcessInfo
  readonly status: WorkerStatus
  readonly createdAt: Date
  readonly lastActivityAt: Date
  readonly taskCount: number
  readonly failureCount: number
  readonly currentTask?: string
  readonly metadata: Record<string, unknown>
}

/**
 * Task to be executed by a worker
 */
export interface PoolTask {
  readonly id: string
  readonly poolId: string
  readonly command: string
  readonly args: string[]
  readonly options: {
    readonly cwd?: string
    readonly env?: Record<string, string>
    readonly timeout?: number
    readonly priority?: number
    readonly retry?: number
    readonly metadata?: Record<string, unknown>
  }
  readonly createdAt: Date
  readonly scheduledAt?: Date
  readonly assignedWorker?: string
  readonly status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled'
}

/**
 * Task result
 */
export interface TaskResult {
  readonly taskId: string
  readonly workerId: string
  readonly success: boolean
  readonly exitCode?: number
  readonly stdout?: string
  readonly stderr?: string
  readonly duration: number
  readonly completedAt: Date
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

// =============================================================================
// Pool Configuration Types
// =============================================================================

/**
 * Pool configuration schema
 */
export const PoolConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  
  // Worker configuration
  workerCommand: z.string().min(1),
  workerArgs: z.array(z.string()).default([]),
  workerOptions: z.object({
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeout: z.number().min(1000).max(3600000).optional(), // 1s to 1h
    retries: z.number().min(0).max(10).default(3),
  }).default({}),
  
  // Pool sizing
  minWorkers: z.number().min(0).max(1000).default(1),
  maxWorkers: z.number().min(1).max(1000).default(10),
  initialWorkers: z.number().min(0).max(1000).default(2),
  
  // Scaling configuration
  scalingStrategy: z.enum(['fixed', 'dynamic', 'on_demand', 'scheduled']).default('dynamic'),
  scaleUpThreshold: z.number().min(0).max(1).default(0.8), // 80% utilization
  scaleDownThreshold: z.number().min(0).max(1).default(0.2), // 20% utilization
  scaleUpCooldown: z.number().min(1000).max(300000).default(30000), // 30s
  scaleDownCooldown: z.number().min(1000).max(300000).default(60000), // 1m
  
  // Load balancing
  loadBalancingAlgorithm: z.enum(['round_robin', 'least_connections', 'least_busy', 'weighted', 'random']).default('least_busy'),
  weights: z.record(z.number()).optional(), // For weighted load balancing
  
  // Health and monitoring
  healthCheckInterval: z.number().min(1000).max(60000).default(10000), // 10s
  workerIdleTimeout: z.number().min(10000).max(3600000).default(300000), // 5m
  workerMaxFailures: z.number().min(1).max(100).default(5),
  
  // Task management
  taskTimeout: z.number().min(1000).max(3600000).default(60000), // 1m
  taskRetryDelay: z.number().min(100).max(60000).default(1000), // 1s
  maxQueueSize: z.number().min(1).max(100000).default(10000),
  
  // Resource limits
  resourceLimits: z.object({
    cpu: z.number().min(0.1).max(100).optional(), // CPU percentage
    memory: z.number().min(1).max(1000000).optional(), // Memory in MB
    diskSpace: z.number().min(1).max(1000000).optional(), // Disk space in MB
  }).default({}),
  
  // Lifecycle
  gracefulShutdownTimeout: z.number().min(1000).max(60000).default(30000), // 30s
  forceKillTimeout: z.number().min(1000).max(60000).default(5000), // 5s
  
  // Persistence
  enablePersistence: z.boolean().default(false),
  persistenceInterval: z.number().min(1000).max(300000).default(60000), // 1m
})

export type PoolConfig = z.infer<typeof PoolConfigSchema>

// =============================================================================
// Pool Status and Metrics
// =============================================================================

/**
 * Pool status information
 */
export interface PoolStatus {
  readonly id: string
  readonly name: string
  readonly isRunning: boolean
  readonly totalWorkers: number
  readonly idleWorkers: number
  readonly busyWorkers: number
  readonly failedWorkers: number
  readonly queuedTasks: number
  readonly runningTasks: number
  readonly completedTasks: number
  readonly failedTasks: number
  readonly lastScalingAction?: Date
  readonly lastActivityAt: Date
  readonly uptime: number
  readonly memoryUsage: number
}

/**
 * Pool metrics
 */
export interface PoolMetrics {
  readonly poolId: string
  readonly totalTasksProcessed: number
  readonly totalTasksCompleted: number
  readonly totalTasksFailed: number
  readonly averageTaskDuration: number
  readonly averageQueueTime: number
  readonly throughputPerSecond: number
  readonly workerUtilization: number
  readonly scalingEvents: number
  readonly errorRate: number
  readonly peakWorkerCount: number
  readonly totalWorkerRestarts: number
  readonly resourceUsage: {
    readonly cpu: number
    readonly memory: number
    readonly diskSpace: number
  }
}

/**
 * Pool statistics
 */
export interface PoolStatistics {
  readonly poolId: string
  readonly timeRange: {
    readonly start: Date
    readonly end: Date
  }
  readonly taskStats: {
    readonly total: number
    readonly completed: number
    readonly failed: number
    readonly cancelled: number
    readonly averageDuration: number
    readonly medianDuration: number
    readonly p95Duration: number
    readonly p99Duration: number
  }
  readonly workerStats: {
    readonly totalSpawned: number
    readonly totalTerminated: number
    readonly averageLifetime: number
    readonly failureRate: number
    readonly restartCount: number
  }
  readonly scalingStats: {
    readonly scaleUpEvents: number
    readonly scaleDownEvents: number
    readonly averagePoolSize: number
    readonly peakPoolSize: number
    readonly minPoolSize: number
  }
}

// =============================================================================
// Pool Events
// =============================================================================

/**
 * Pool event types
 */
export type PoolEvent = {
  readonly type: 'pool_started'
  readonly poolId: string
  readonly timestamp: Date
} | {
  readonly type: 'pool_stopped'
  readonly poolId: string
  readonly timestamp: Date
} | {
  readonly type: 'worker_spawned'
  readonly poolId: string
  readonly workerId: string
  readonly timestamp: Date
} | {
  readonly type: 'worker_terminated'
  readonly poolId: string
  readonly workerId: string
  readonly reason: string
  readonly timestamp: Date
} | {
  readonly type: 'worker_failed'
  readonly poolId: string
  readonly workerId: string
  readonly error: string
  readonly timestamp: Date
} | {
  readonly type: 'task_queued'
  readonly poolId: string
  readonly taskId: string
  readonly timestamp: Date
} | {
  readonly type: 'task_assigned'
  readonly poolId: string
  readonly taskId: string
  readonly workerId: string
  readonly timestamp: Date
} | {
  readonly type: 'task_completed'
  readonly poolId: string
  readonly taskId: string
  readonly workerId: string
  readonly duration: number
  readonly timestamp: Date
} | {
  readonly type: 'task_failed'
  readonly poolId: string
  readonly taskId: string
  readonly workerId: string
  readonly error: string
  readonly timestamp: Date
} | {
  readonly type: 'pool_scaled'
  readonly poolId: string
  readonly action: 'up' | 'down'
  readonly fromSize: number
  readonly toSize: number
  readonly timestamp: Date
} | {
  readonly type: 'pool_error'
  readonly poolId: string
  readonly error: string
  readonly timestamp: Date
}

// =============================================================================
// Pool Interface
// =============================================================================

/**
 * Worker pool interface
 */
export interface WorkerPool {
  readonly id: string
  readonly config: PoolConfig
  readonly isRunning: boolean
  
  // Pool lifecycle
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  
  // Task management
  submitTask(task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string>
  cancelTask(taskId: string): Promise<void>
  getTaskResult(taskId: string): Promise<TaskResult | null>
  waitForTask(taskId: string): Promise<TaskResult>
  
  // Worker management
  getWorkers(): WorkerProcess[]
  getWorker(workerId: string): WorkerProcess | null
  terminateWorker(workerId: string): Promise<void>
  
  // Scaling
  scaleUp(count?: number): Promise<void>
  scaleDown(count?: number): Promise<void>
  setPoolSize(size: number): Promise<void>
  
  // Monitoring
  getStatus(): PoolStatus
  getMetrics(): PoolMetrics
  getStatistics(timeRange?: { start: Date; end: Date }): PoolStatistics
  
  // Event streaming
  subscribeToEvents(): Stream.Stream<PoolEvent, never, never>
  subscribeToTaskResults(): Stream.Stream<TaskResult, never, never>
  subscribeToWorkerEvents(): Stream.Stream<PoolEvent, never, never>
}

/**
 * Pool manager interface
 */
export interface PoolManager {
  readonly pools: Map<string, WorkerPool>
  readonly isRunning: boolean
  
  // Manager lifecycle
  start(): Promise<void>
  stop(): Promise<void>
  
  // Pool management
  createPool(config: PoolConfig): Promise<WorkerPool>
  removePool(poolId: string): Promise<void>
  getPool(poolId: string): WorkerPool | null
  
  // Global operations
  submitTaskToPool(poolId: string, task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string>
  submitTaskToAnyPool(task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string>
  
  // Monitoring
  getGlobalStatus(): {
    readonly totalPools: number
    readonly runningPools: number
    readonly totalWorkers: number
    readonly totalTasks: number
    readonly totalQueueSize: number
  }
  getGlobalMetrics(): {
    readonly totalTasksProcessed: number
    readonly totalTasksCompleted: number
    readonly totalTasksFailed: number
    readonly averageTaskDuration: number
    readonly globalThroughput: number
    readonly totalResourceUsage: {
      readonly cpu: number
      readonly memory: number
      readonly diskSpace: number
    }
  }
  
  // Event streaming
  subscribeToGlobalEvents(): Stream.Stream<PoolEvent, never, never>
}

// =============================================================================
// Load Balancer Interface
// =============================================================================

/**
 * Load balancer interface
 */
export interface LoadBalancer {
  readonly algorithm: LoadBalancingAlgorithm
  readonly workers: WorkerProcess[]
  
  // Worker selection
  selectWorker(task: PoolTask): WorkerProcess | null
  updateWorkerStatus(workerId: string, status: WorkerStatus): void
  addWorker(worker: WorkerProcess): void
  removeWorker(workerId: string): void
  
  // Balancing statistics
  getBalancingStats(): {
    readonly totalSelections: number
    readonly workerUtilization: Record<string, number>
    readonly averageLoadPerWorker: number
    readonly balancingEfficiency: number
  }
}

// =============================================================================
// Scaling Engine Interface
// =============================================================================

/**
 * Scaling engine interface
 */
export interface ScalingEngine {
  readonly strategy: PoolScalingStrategy
  readonly pool: WorkerPool
  
  // Scaling decisions
  shouldScaleUp(): boolean
  shouldScaleDown(): boolean
  calculateOptimalSize(): number
  
  // Scaling actions
  executeScaleUp(count?: number): Promise<void>
  executeScaleDown(count?: number): Promise<void>
  
  // Monitoring
  getScalingHistory(): Array<{
    readonly timestamp: Date
    readonly action: 'up' | 'down'
    readonly fromSize: number
    readonly toSize: number
    readonly reason: string
  }>
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Pool creation error
 */
export class PoolCreationError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'PoolCreationError'
  }
}

/**
 * Worker spawn error
 */
export class WorkerSpawnError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'WorkerSpawnError'
  }
}

/**
 * Task execution error
 */
export class TaskExecutionError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'TaskExecutionError'
  }
}

/**
 * Pool scaling error
 */
export class PoolScalingError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'PoolScalingError'
  }
}

/**
 * Load balancing error
 */
export class LoadBalancingError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'LoadBalancingError'
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Pool factory function type
 */
export type PoolFactory = (config: PoolConfig) => Promise<WorkerPool>

/**
 * Task queue interface
 */
export interface TaskQueue {
  readonly size: number
  readonly maxSize: number
  
  enqueue(task: PoolTask): Promise<void>
  dequeue(): Promise<PoolTask | null>
  peek(): PoolTask | null
  clear(): void
  isEmpty(): boolean
  isFull(): boolean
}

/**
 * Worker factory interface
 */
export interface WorkerFactory {
  readonly poolId: string
  readonly config: PoolConfig
  
  createWorker(): Promise<WorkerProcess>
  terminateWorker(worker: WorkerProcess): Promise<void>
  restartWorker(worker: WorkerProcess): Promise<WorkerProcess>
}