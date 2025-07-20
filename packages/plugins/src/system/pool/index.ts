/**
 * Process Pooling System Entry Point
 * 
 * This module exports the complete process pooling system for the Process Manager Plugin,
 * providing worker pool management, dynamic scaling, and load balancing capabilities.
 * 
 * @module plugins/system/pool
 */

// =============================================================================
// Core Pool Components
// =============================================================================

export { ProcessWorkerPool } from "./worker-pool"
export { ProcessPoolManager } from "./pool-manager"

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Core pool types
  WorkerPool,
  PoolManager,
  WorkerProcess,
  PoolTask,
  TaskResult,
  WorkerStatus,
  PoolScalingStrategy,
  LoadBalancingAlgorithm,
  
  // Configuration types
  PoolConfig,
  
  // Status and metrics
  PoolStatus,
  PoolMetrics,
  PoolStatistics,
  
  // Events
  PoolEvent,
  
  // Interfaces
  LoadBalancer,
  ScalingEngine,
  TaskQueue,
  WorkerFactory,
  
  // Utility types
  PoolFactory,
  
  // Error types
  PoolCreationError,
  WorkerSpawnError,
  TaskExecutionError,
  PoolScalingError,
  LoadBalancingError,
} from "./types"

// =============================================================================
// Schema Exports
// =============================================================================

export { PoolConfigSchema } from "./types"

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new pool manager
 */
export function createPoolManager(): ProcessPoolManager {
  return new ProcessPoolManager()
}

/**
 * Create a new worker pool with the specified configuration
 */
export function createWorkerPool(config: import("./types").PoolConfig): ProcessWorkerPool {
  return new ProcessWorkerPool(config)
}

/**
 * Create a pool configuration with default values
 */
export function createPoolConfig(
  id: string,
  name: string,
  workerCommand: string,
  options: Partial<import("./types").PoolConfig> = {}
): import("./types").PoolConfig {
  return {
    id,
    name,
    workerCommand,
    workerArgs: options.workerArgs || [],
    workerOptions: options.workerOptions || {},
    minWorkers: options.minWorkers || 1,
    maxWorkers: options.maxWorkers || 10,
    initialWorkers: options.initialWorkers || 2,
    scalingStrategy: options.scalingStrategy || 'dynamic',
    scaleUpThreshold: options.scaleUpThreshold || 0.8,
    scaleDownThreshold: options.scaleDownThreshold || 0.2,
    scaleUpCooldown: options.scaleUpCooldown || 30000,
    scaleDownCooldown: options.scaleDownCooldown || 60000,
    loadBalancingAlgorithm: options.loadBalancingAlgorithm || 'least_busy',
    weights: options.weights,
    healthCheckInterval: options.healthCheckInterval || 10000,
    workerIdleTimeout: options.workerIdleTimeout || 300000,
    workerMaxFailures: options.workerMaxFailures || 5,
    taskTimeout: options.taskTimeout || 60000,
    taskRetryDelay: options.taskRetryDelay || 1000,
    maxQueueSize: options.maxQueueSize || 10000,
    resourceLimits: options.resourceLimits || {},
    gracefulShutdownTimeout: options.gracefulShutdownTimeout || 30000,
    forceKillTimeout: options.forceKillTimeout || 5000,
    enablePersistence: options.enablePersistence || false,
    persistenceInterval: options.persistenceInterval || 60000
  }
}

// =============================================================================
// Configuration Templates
// =============================================================================

/**
 * Create a CPU-intensive pool configuration
 */
export function createCpuIntensivePoolConfig(
  id: string,
  name: string,
  workerCommand: string,
  options: {
    workerArgs?: string[]
    cpuCores?: number
  } = {}
): import("./types").PoolConfig {
  const cpuCores = options.cpuCores || require('os').cpus().length
  
  return createPoolConfig(id, name, workerCommand, {
    workerArgs: options.workerArgs,
    minWorkers: Math.max(1, Math.floor(cpuCores / 2)),
    maxWorkers: cpuCores,
    initialWorkers: Math.max(1, Math.floor(cpuCores / 2)),
    scalingStrategy: 'dynamic',
    scaleUpThreshold: 0.7,
    scaleDownThreshold: 0.3,
    scaleUpCooldown: 15000,
    scaleDownCooldown: 30000,
    loadBalancingAlgorithm: 'least_busy',
    healthCheckInterval: 5000,
    workerIdleTimeout: 180000,
    workerMaxFailures: 2,
    taskTimeout: 300000,
    taskRetryDelay: 2000,
    maxQueueSize: 500,
    resourceLimits: {
      cpu: 90,
      memory: 2048
    },
    gracefulShutdownTimeout: 45000,
    forceKillTimeout: 10000
  })
}

/**
 * Create an I/O-bound pool configuration
 */
export function createIoBoundPoolConfig(
  id: string,
  name: string,
  workerCommand: string,
  options: {
    workerArgs?: string[]
    maxConcurrency?: number
  } = {}
): import("./types").PoolConfig {
  const maxConcurrency = options.maxConcurrency || 20
  
  return createPoolConfig(id, name, workerCommand, {
    workerArgs: options.workerArgs,
    minWorkers: 2,
    maxWorkers: maxConcurrency,
    initialWorkers: 5,
    scalingStrategy: 'dynamic',
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2,
    scaleUpCooldown: 10000,
    scaleDownCooldown: 30000,
    loadBalancingAlgorithm: 'least_connections',
    healthCheckInterval: 10000,
    workerIdleTimeout: 600000,
    workerMaxFailures: 5,
    taskTimeout: 120000,
    taskRetryDelay: 1000,
    maxQueueSize: 2000,
    resourceLimits: {
      cpu: 50,
      memory: 1024
    }
  })
}

/**
 * Create a lightweight pool configuration
 */
export function createLightweightPoolConfig(
  id: string,
  name: string,
  workerCommand: string,
  options: {
    workerArgs?: string[]
    maxWorkers?: number
  } = {}
): import("./types").PoolConfig {
  return createPoolConfig(id, name, workerCommand, {
    workerArgs: options.workerArgs,
    minWorkers: 1,
    maxWorkers: options.maxWorkers || 10,
    initialWorkers: 2,
    scalingStrategy: 'on_demand',
    scaleUpThreshold: 0.9,
    scaleDownThreshold: 0.1,
    scaleUpCooldown: 5000,
    scaleDownCooldown: 15000,
    loadBalancingAlgorithm: 'round_robin',
    healthCheckInterval: 15000,
    workerIdleTimeout: 120000,
    workerMaxFailures: 3,
    taskTimeout: 30000,
    taskRetryDelay: 500,
    maxQueueSize: 5000,
    resourceLimits: {
      cpu: 25,
      memory: 512
    },
    gracefulShutdownTimeout: 15000,
    forceKillTimeout: 3000
  })
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique pool ID
 */
export function generatePoolId(prefix: string = 'pool'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique worker ID
 */
export function generateWorkerId(prefix: string = 'worker'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(prefix: string = 'task'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate pool configuration
 */
export function validatePoolConfig(config: any): config is import("./types").PoolConfig {
  try {
    import("./types").PoolConfigSchema.parse(config)
    return true
  } catch {
    return false
  }
}

/**
 * Calculate optimal pool size based on system resources
 */
export function calculateOptimalPoolSize(
  workloadType: 'cpu' | 'io' | 'mixed' = 'mixed',
  options: {
    cpuCores?: number
    availableMemory?: number
    targetCpuUtilization?: number
    targetMemoryUtilization?: number
  } = {}
): {
  minWorkers: number
  maxWorkers: number
  initialWorkers: number
} {
  const cpuCores = options.cpuCores || require('os').cpus().length
  const availableMemory = options.availableMemory || (require('os').totalmem() / 1024 / 1024 / 1024) // GB
  const targetCpuUtilization = options.targetCpuUtilization || 0.8
  const targetMemoryUtilization = options.targetMemoryUtilization || 0.7
  
  let minWorkers: number
  let maxWorkers: number
  let initialWorkers: number
  
  switch (workloadType) {
    case 'cpu':
      minWorkers = Math.max(1, Math.floor(cpuCores * 0.25))
      maxWorkers = Math.floor(cpuCores * targetCpuUtilization)
      initialWorkers = Math.max(1, Math.floor(cpuCores * 0.5))
      break
      
    case 'io':
      minWorkers = Math.max(2, Math.floor(cpuCores * 0.5))
      maxWorkers = Math.min(50, Math.floor(availableMemory * targetMemoryUtilization))
      initialWorkers = Math.max(2, Math.floor(cpuCores))
      break
      
    case 'mixed':
    default:
      minWorkers = Math.max(1, Math.floor(cpuCores * 0.3))
      maxWorkers = Math.min(cpuCores * 2, Math.floor(availableMemory * targetMemoryUtilization * 0.5))
      initialWorkers = Math.max(1, Math.floor(cpuCores * 0.7))
      break
  }
  
  return {
    minWorkers,
    maxWorkers: Math.max(minWorkers, maxWorkers),
    initialWorkers: Math.max(minWorkers, Math.min(maxWorkers, initialWorkers))
  }
}

/**
 * Get system resource information
 */
export function getSystemResourceInfo(): {
  cpuCores: number
  totalMemory: number
  availableMemory: number
  platform: string
  architecture: string
} {
  const os = require('os')
  
  return {
    cpuCores: os.cpus().length,
    totalMemory: os.totalmem(),
    availableMemory: os.freemem(),
    platform: os.platform(),
    architecture: os.arch()
  }
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default pool configuration values
 */
export const DEFAULT_POOL_CONFIG = {
  minWorkers: 1,
  maxWorkers: 10,
  initialWorkers: 2,
  scalingStrategy: 'dynamic' as const,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.2,
  scaleUpCooldown: 30000,
  scaleDownCooldown: 60000,
  loadBalancingAlgorithm: 'least_busy' as const,
  healthCheckInterval: 10000,
  workerIdleTimeout: 300000,
  workerMaxFailures: 5,
  taskTimeout: 60000,
  taskRetryDelay: 1000,
  maxQueueSize: 10000,
  gracefulShutdownTimeout: 30000,
  forceKillTimeout: 5000,
  enablePersistence: false,
  persistenceInterval: 60000
}

/**
 * Pool scaling strategies
 */
export const SCALING_STRATEGIES = {
  FIXED: 'fixed' as const,
  DYNAMIC: 'dynamic' as const,
  ON_DEMAND: 'on_demand' as const,
  SCHEDULED: 'scheduled' as const
}

/**
 * Load balancing algorithms
 */
export const LOAD_BALANCING_ALGORITHMS = {
  ROUND_ROBIN: 'round_robin' as const,
  LEAST_CONNECTIONS: 'least_connections' as const,
  LEAST_BUSY: 'least_busy' as const,
  WEIGHTED: 'weighted' as const,
  RANDOM: 'random' as const
}

/**
 * Worker status values
 */
export const WORKER_STATUS = {
  IDLE: 'idle' as const,
  BUSY: 'busy' as const,
  STARTING: 'starting' as const,
  STOPPING: 'stopping' as const,
  FAILED: 'failed' as const,
  TERMINATED: 'terminated' as const
}

/**
 * Pool event types
 */
export const POOL_EVENT_TYPES = {
  POOL_STARTED: 'pool_started' as const,
  POOL_STOPPED: 'pool_stopped' as const,
  WORKER_SPAWNED: 'worker_spawned' as const,
  WORKER_TERMINATED: 'worker_terminated' as const,
  WORKER_FAILED: 'worker_failed' as const,
  TASK_QUEUED: 'task_queued' as const,
  TASK_ASSIGNED: 'task_assigned' as const,
  TASK_COMPLETED: 'task_completed' as const,
  TASK_FAILED: 'task_failed' as const,
  POOL_SCALED: 'pool_scaled' as const,
  POOL_ERROR: 'pool_error' as const
}

// =============================================================================
// Re-export for convenience
// =============================================================================

export { ProcessWorkerPool as WorkerPool }
export { ProcessPoolManager as PoolManager }