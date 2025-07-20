/**
 * Pool Manager Implementation
 * 
 * This module provides a high-level pool manager that orchestrates multiple
 * worker pools and provides global pool management capabilities.
 * 
 * @module plugins/system/pool/pool-manager
 */

import { Effect, Stream, Ref } from "effect"
import { ProcessWorkerPool } from "./worker-pool"
import {
  PoolManager,
  WorkerPool,
  PoolConfig,
  PoolTask,
  PoolEvent,
  PoolCreationError,
  TaskExecutionError,
} from "./types"

// =============================================================================
// Pool Manager Implementation
// =============================================================================

/**
 * Production pool manager for orchestrating multiple worker pools
 */
export class ProcessPoolManager implements PoolManager {
  public readonly pools: Map<string, WorkerPool> = new Map()
  public isRunning: boolean = false
  
  private readonly eventSubscriptions: Map<string, Stream.Stream<PoolEvent, never, never>> = new Map()
  private readonly globalEventRef: Ref.Ref<PoolEvent[]>
  
  constructor() {
    // Initialize global event ref (will be properly initialized in start())
    this.globalEventRef = null as any
  }
  
  // =============================================================================
  // Manager Lifecycle
  // =============================================================================
  
  async start(): Promise<void> {
    if (this.isRunning) return
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessPoolManager) {
        try {
          console.log('Starting Pool Manager...')
          
          // Initialize global event tracking
          this.globalEventRef = yield* Ref.make<PoolEvent[]>([])
          
          this.isRunning = true
          
          console.log('Pool Manager started successfully')
        } catch (error) {
          throw new PoolCreationError(`Failed to start Pool Manager: ${error}`)
        }
      }).bind(this))
    )
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) return
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessPoolManager) {
        try {
          console.log('Stopping Pool Manager...')
          
          this.isRunning = false
          
          // Stop all pools
          const stopPromises = Array.from(this.pools.values()).map(pool =>
            Effect.tryPromise(() => pool.stop())
          )
          
          yield* Effect.all(stopPromises)
          
          // Clear collections
          this.pools.clear()
          this.eventSubscriptions.clear()
          
          console.log('Pool Manager stopped successfully')
        } catch (error) {
          throw new PoolCreationError(`Failed to stop Pool Manager: ${error}`)
        }
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Pool Management
  // =============================================================================
  
  async createPool(config: PoolConfig): Promise<WorkerPool> {
    if (!this.isRunning) {
      throw new PoolCreationError('Pool Manager is not running')
    }
    
    if (this.pools.has(config.id)) {
      throw new PoolCreationError(`Pool ${config.id} already exists`)
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessPoolManager) {
        try {
          console.log(`Creating pool: ${config.id}`)
          
          // Create the pool
          const pool = new ProcessWorkerPool(config)
          
          // Start the pool
          yield* Effect.tryPromise(() => pool.start())
          
          // Register the pool
          this.pools.set(config.id, pool)
          
          // Subscribe to pool events
          this.subscribeToPoolEvents(pool)
          
          console.log(`Pool created successfully: ${config.id}`)
          return pool
        } catch (error) {
          throw new PoolCreationError(`Failed to create pool ${config.id}: ${error}`)
        }
      }).bind(this))
    )
  }
  
  async removePool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId)
    if (!pool) {
      throw new PoolCreationError(`Pool ${poolId} not found`)
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessPoolManager) {
        try {
          console.log(`Removing pool: ${poolId}`)
          
          // Stop the pool
          yield* Effect.tryPromise(() => pool.stop())
          
          // Unsubscribe from events
          this.eventSubscriptions.delete(poolId)
          
          // Remove from collection
          this.pools.delete(poolId)
          
          console.log(`Pool removed successfully: ${poolId}`)
        } catch (error) {
          throw new PoolCreationError(`Failed to remove pool ${poolId}: ${error}`)
        }
      }).bind(this))
    )
  }
  
  getPool(poolId: string): WorkerPool | null {
    return this.pools.get(poolId) || null
  }
  
  // =============================================================================
  // Global Operations
  // =============================================================================
  
  async submitTaskToPool(poolId: string, task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string> {
    const pool = this.pools.get(poolId)
    if (!pool) {
      throw new TaskExecutionError(`Pool ${poolId} not found`)
    }
    
    if (!pool.isRunning) {
      throw new TaskExecutionError(`Pool ${poolId} is not running`)
    }
    
    return pool.submitTask(task)
  }
  
  async submitTaskToAnyPool(task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string> {
    const runningPools = Array.from(this.pools.values()).filter(pool => pool.isRunning)
    
    if (runningPools.length === 0) {
      throw new TaskExecutionError('No running pools available')
    }
    
    // Simple load balancing - select pool with least queue size
    const selectedPool = runningPools.reduce((prev, curr) => {
      const prevStatus = prev.getStatus()
      const currStatus = curr.getStatus()
      return currStatus.queuedTasks < prevStatus.queuedTasks ? curr : prev
    })
    
    return selectedPool.submitTask(task)
  }
  
  // =============================================================================
  // Monitoring
  // =============================================================================
  
  getGlobalStatus() {
    const pools = Array.from(this.pools.values())
    const runningPools = pools.filter(pool => pool.isRunning)
    
    let totalWorkers = 0
    let totalTasks = 0
    let totalQueueSize = 0
    
    for (const pool of pools) {
      const status = pool.getStatus()
      totalWorkers += status.totalWorkers
      totalTasks += status.runningTasks + status.completedTasks
      totalQueueSize += status.queuedTasks
    }
    
    return {
      totalPools: pools.length,
      runningPools: runningPools.length,
      totalWorkers,
      totalTasks,
      totalQueueSize
    }
  }
  
  getGlobalMetrics() {
    const pools = Array.from(this.pools.values())
    
    let totalTasksProcessed = 0
    let totalTasksCompleted = 0
    let totalTasksFailed = 0
    let totalDuration = 0
    let totalCpu = 0
    let totalMemory = 0
    let totalDiskSpace = 0
    
    for (const pool of pools) {
      const metrics = pool.getMetrics()
      totalTasksProcessed += metrics.totalTasksProcessed
      totalTasksCompleted += metrics.totalTasksCompleted
      totalTasksFailed += metrics.totalTasksFailed
      totalDuration += metrics.averageTaskDuration * metrics.totalTasksCompleted
      totalCpu += metrics.resourceUsage.cpu
      totalMemory += metrics.resourceUsage.memory
      totalDiskSpace += metrics.resourceUsage.diskSpace
    }
    
    const averageTaskDuration = totalTasksCompleted > 0 ? totalDuration / totalTasksCompleted : 0
    const globalThroughput = totalTasksCompleted > 0 ? totalTasksCompleted / (Date.now() / 1000) : 0
    
    return {
      totalTasksProcessed,
      totalTasksCompleted,
      totalTasksFailed,
      averageTaskDuration,
      globalThroughput,
      totalResourceUsage: {
        cpu: totalCpu,
        memory: totalMemory,
        diskSpace: totalDiskSpace
      }
    }
  }
  
  // =============================================================================
  // Event Streaming
  // =============================================================================
  
  subscribeToGlobalEvents(): Stream.Stream<PoolEvent, never, never> {
    return Stream.async<PoolEvent>(emit => {
      const subscriptions: (() => void)[] = []
      
      // Subscribe to all existing pools
      for (const [poolId, pool] of this.pools) {
        const subscription = Stream.runForEach(
          pool.subscribeToEvents(),
          (event: PoolEvent) => {
            emit(Effect.succeed(event))
            return Effect.succeed(void 0)
          }
        )
        
        Effect.runFork(subscription)
      }
      
      // Return cleanup function
      return Effect.sync(() => {
        subscriptions.forEach(cleanup => cleanup())
      })
    })
  }
  
  // =============================================================================
  // Private Implementation Methods
  // =============================================================================
  
  private subscribeToPoolEvents(pool: WorkerPool): void {
    const eventStream = pool.subscribeToEvents()
    this.eventSubscriptions.set(pool.id, eventStream)
    
    // Process events for global tracking
    Effect.runFork(
      Stream.runForEach(eventStream, (event: PoolEvent) => {
        return Effect.gen((function* (this: ProcessPoolManager) {
          // Add to global event history
          const currentEvents = yield* Ref.get(this.globalEventRef)
          const updatedEvents = [...currentEvents, event].slice(-1000) // Keep last 1000 events
          yield* Ref.set(this.globalEventRef, updatedEvents)
          
          // Log significant events
          if (event.type === 'pool_error' || event.type === 'worker_failed') {
            console.warn(`Pool event: ${event.type}`, event)
          }
        }).bind(this))
      })
    )
  }
  
  // =============================================================================
  // Pool Templates and Factory Methods
  // =============================================================================
  
  /**
   * Create a pool with common configuration presets
   */
  async createStandardPool(
    id: string,
    name: string,
    workerCommand: string,
    options: {
      workerArgs?: string[]
      minWorkers?: number
      maxWorkers?: number
      scalingStrategy?: 'fixed' | 'dynamic' | 'on_demand'
      loadBalancing?: 'round_robin' | 'least_busy' | 'least_connections'
    } = {}
  ): Promise<WorkerPool> {
    const config: PoolConfig = {
      id,
      name,
      workerCommand,
      workerArgs: options.workerArgs || [],
      workerOptions: {},
      minWorkers: options.minWorkers || 1,
      maxWorkers: options.maxWorkers || 5,
      initialWorkers: options.minWorkers || 1,
      scalingStrategy: options.scalingStrategy || 'dynamic',
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.2,
      scaleUpCooldown: 30000,
      scaleDownCooldown: 60000,
      loadBalancingAlgorithm: options.loadBalancing || 'least_busy',
      healthCheckInterval: 10000,
      workerIdleTimeout: 300000,
      workerMaxFailures: 3,
      taskTimeout: 60000,
      taskRetryDelay: 1000,
      maxQueueSize: 1000,
      resourceLimits: {},
      gracefulShutdownTimeout: 30000,
      forceKillTimeout: 5000,
      enablePersistence: false,
      persistenceInterval: 60000
    }
    
    return this.createPool(config)
  }
  
  /**
   * Create a high-performance pool for CPU-intensive tasks
   */
  async createCpuIntensivePool(
    id: string,
    name: string,
    workerCommand: string,
    options: {
      workerArgs?: string[]
      cpuCores?: number
    } = {}
  ): Promise<WorkerPool> {
    const cpuCores = options.cpuCores || require('os').cpus().length
    
    const config: PoolConfig = {
      id,
      name,
      workerCommand,
      workerArgs: options.workerArgs || [],
      workerOptions: {},
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
      taskTimeout: 300000, // 5 minutes for CPU-intensive tasks
      taskRetryDelay: 2000,
      maxQueueSize: 500,
      resourceLimits: {
        cpu: 90, // 90% CPU limit per worker
        memory: 2048 // 2GB memory limit per worker
      },
      gracefulShutdownTimeout: 45000,
      forceKillTimeout: 10000,
      enablePersistence: false,
      persistenceInterval: 30000
    }
    
    return this.createPool(config)
  }
  
  /**
   * Create a pool optimized for I/O-bound tasks
   */
  async createIoBoundPool(
    id: string,
    name: string,
    workerCommand: string,
    options: {
      workerArgs?: string[]
      maxConcurrency?: number
    } = {}
  ): Promise<WorkerPool> {
    const maxConcurrency = options.maxConcurrency || 20
    
    const config: PoolConfig = {
      id,
      name,
      workerCommand,
      workerArgs: options.workerArgs || [],
      workerOptions: {},
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
      workerIdleTimeout: 600000, // 10 minutes for I/O tasks
      workerMaxFailures: 5,
      taskTimeout: 120000, // 2 minutes for I/O tasks
      taskRetryDelay: 1000,
      maxQueueSize: 2000,
      resourceLimits: {
        cpu: 50, // Lower CPU limit for I/O tasks
        memory: 1024 // 1GB memory limit per worker
      },
      gracefulShutdownTimeout: 30000,
      forceKillTimeout: 5000,
      enablePersistence: false,
      persistenceInterval: 60000
    }
    
    return this.createPool(config)
  }
  
  /**
   * Create a pool for short-lived, lightweight tasks
   */
  async createLightweightPool(
    id: string,
    name: string,
    workerCommand: string,
    options: {
      workerArgs?: string[]
      maxWorkers?: number
    } = {}
  ): Promise<WorkerPool> {
    const config: PoolConfig = {
      id,
      name,
      workerCommand,
      workerArgs: options.workerArgs || [],
      workerOptions: {},
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
      workerIdleTimeout: 120000, // 2 minutes for lightweight tasks
      workerMaxFailures: 3,
      taskTimeout: 30000, // 30 seconds for lightweight tasks
      taskRetryDelay: 500,
      maxQueueSize: 5000,
      resourceLimits: {
        cpu: 25, // Very low CPU limit
        memory: 512 // 512MB memory limit per worker
      },
      gracefulShutdownTimeout: 15000,
      forceKillTimeout: 3000,
      enablePersistence: false,
      persistenceInterval: 120000
    }
    
    return this.createPool(config)
  }
  
  // =============================================================================
  // Utility Methods
  // =============================================================================
  
  /**
   * Get pool statistics across all pools
   */
  getAllPoolStatistics(): Array<{
    poolId: string
    name: string
    status: ReturnType<WorkerPool['getStatus']>
    metrics: ReturnType<WorkerPool['getMetrics']>
  }> {
    return Array.from(this.pools.values()).map(pool => ({
      poolId: pool.id,
      name: pool.config.name,
      status: pool.getStatus(),
      metrics: pool.getMetrics()
    }))
  }
  
  /**
   * Find pools by criteria
   */
  findPools(criteria: {
    running?: boolean
    minWorkers?: number
    maxWorkers?: number
    scalingStrategy?: string
    loadBalancing?: string
  }): WorkerPool[] {
    return Array.from(this.pools.values()).filter(pool => {
      if (criteria.running !== undefined && pool.isRunning !== criteria.running) {
        return false
      }
      
      if (criteria.minWorkers !== undefined && pool.config.minWorkers < criteria.minWorkers) {
        return false
      }
      
      if (criteria.maxWorkers !== undefined && pool.config.maxWorkers > criteria.maxWorkers) {
        return false
      }
      
      if (criteria.scalingStrategy && pool.config.scalingStrategy !== criteria.scalingStrategy) {
        return false
      }
      
      if (criteria.loadBalancing && pool.config.loadBalancingAlgorithm !== criteria.loadBalancing) {
        return false
      }
      
      return true
    })
  }
  
  /**
   * Get global event history
   */
  async getGlobalEventHistory(): Promise<PoolEvent[]> {
    if (!this.globalEventRef) {
      return []
    }
    
    return Effect.runPromise(Ref.get(this.globalEventRef))
  }
}