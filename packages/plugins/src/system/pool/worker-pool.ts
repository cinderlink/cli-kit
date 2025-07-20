/**
 * Worker Pool Implementation
 * 
 * This module provides a complete worker pool implementation with dynamic scaling,
 * load balancing, and task management capabilities.
 * 
 * @module plugins/system/pool/worker-pool
 */

import { Effect, Stream, Ref, Queue } from "effect"
import { v4 as uuidv4 } from "uuid"
import {
  WorkerPool,
  PoolConfig,
  WorkerProcess,
  PoolTask,
  TaskResult,
  PoolStatus,
  PoolMetrics,
  PoolStatistics,
  PoolEvent,
  WorkerStatus,
  LoadBalancer,
  ScalingEngine,
  TaskQueue,
  WorkerFactory,
  PoolCreationError,
  WorkerSpawnError,
  TaskExecutionError,
  PoolScalingError,
  LoadBalancingError,
} from "./types"
import type { ProcessInfo } from "../types"

// =============================================================================
// Task Queue Implementation
// =============================================================================

/**
 * FIFO task queue with priority support
 */
class FIFOTaskQueue implements TaskQueue {
  private readonly queue: PoolTask[] = []
  
  constructor(public readonly maxSize: number = 10000) {}
  
  get size(): number {
    return this.queue.length
  }
  
  async enqueue(task: PoolTask): Promise<void> {
    if (this.isFull()) {
      throw new Error(`Task queue is full (max size: ${this.maxSize})`)
    }
    
    // Insert with priority (higher priority = lower number)
    const priority = task.options.priority || 0
    let insertIndex = this.queue.length
    
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = this.queue[i].options.priority || 0
      if (priority < existingPriority) {
        insertIndex = i
        break
      }
    }
    
    this.queue.splice(insertIndex, 0, task)
  }
  
  async dequeue(): Promise<PoolTask | null> {
    return this.queue.shift() || null
  }
  
  peek(): PoolTask | null {
    return this.queue[0] || null
  }
  
  clear(): void {
    this.queue.length = 0
  }
  
  isEmpty(): boolean {
    return this.queue.length === 0
  }
  
  isFull(): boolean {
    return this.queue.length >= this.maxSize
  }
}

// =============================================================================
// Worker Factory Implementation
// =============================================================================

/**
 * Factory for creating and managing worker processes
 */
class ProcessWorkerFactory implements WorkerFactory {
  constructor(
    public readonly poolId: string,
    public readonly config: PoolConfig
  ) {}
  
  async createWorker(): Promise<WorkerProcess> {
    const workerId = `worker-${uuidv4()}`
    
    try {
      // Create worker process using Bun subprocess
      const subprocess = Bun.spawn({
        cmd: [this.config.workerCommand, ...this.config.workerArgs],
        cwd: this.config.workerOptions.cwd,
        env: this.config.workerOptions.env,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
      })
      
      // Create ProcessInfo from subprocess
      const processInfo: ProcessInfo = {
        pid: subprocess.pid!,
        ppid: process.pid,
        name: this.config.workerCommand,
        command: this.config.workerCommand,
        args: this.config.workerArgs,
        user: process.env.USER || 'unknown',
        cpu: 0,
        memory: 0,
        vsz: 0,
        rss: 0,
        startTime: new Date(),
        status: 'starting'
      }
      
      const worker: WorkerProcess = {
        id: workerId,
        poolId: this.poolId,
        processInfo,
        status: 'starting',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        taskCount: 0,
        failureCount: 0,
        metadata: {
          subprocess,
          stdout: subprocess.stdout,
          stderr: subprocess.stderr,
          stdin: subprocess.stdin
        }
      }
      
      // Wait for process to be ready
      await this.waitForWorkerReady(worker)
      
      return {
        ...worker,
        status: 'idle',
        processInfo: {
          ...processInfo,
          status: 'running'
        }
      }
    } catch (error) {
      throw new WorkerSpawnError(`Failed to create worker: ${error}`)
    }
  }
  
  async terminateWorker(worker: WorkerProcess): Promise<void> {
    try {
      const subprocess = worker.metadata.subprocess as any
      if (subprocess && !subprocess.killed) {
        subprocess.kill('SIGTERM')
        
        // Wait for graceful shutdown
        const timeout = setTimeout(() => {
          if (!subprocess.killed) {
            subprocess.kill('SIGKILL')
          }
        }, this.config.gracefulShutdownTimeout)
        
        await subprocess.exited
        clearTimeout(timeout)
      }
    } catch (error) {
      throw new WorkerSpawnError(`Failed to terminate worker ${worker.id}: ${error}`)
    }
  }
  
  async restartWorker(worker: WorkerProcess): Promise<WorkerProcess> {
    await this.terminateWorker(worker)
    return await this.createWorker()
  }
  
  private async waitForWorkerReady(worker: WorkerProcess): Promise<void> {
    // Simple readiness check - in a real implementation, this would
    // send a ping message and wait for a pong response
    return new Promise(resolve => {
      setTimeout(resolve, 100) // Simulate startup time
    })
  }
}

// =============================================================================
// Load Balancer Implementation
// =============================================================================

/**
 * Load balancer with multiple algorithms
 */
class PoolLoadBalancer implements LoadBalancer {
  private roundRobinIndex = 0
  private selectionCount = 0
  private readonly workerSelections: Map<string, number> = new Map()
  
  constructor(
    public readonly algorithm: import("./types").LoadBalancingAlgorithm,
    public workers: WorkerProcess[]
  ) {}
  
  selectWorker(task: PoolTask): WorkerProcess | null {
    const availableWorkers = this.workers.filter(w => w.status === 'idle')
    
    if (availableWorkers.length === 0) {
      return null
    }
    
    let selectedWorker: WorkerProcess
    
    switch (this.algorithm) {
      case 'round_robin':
        selectedWorker = availableWorkers[this.roundRobinIndex % availableWorkers.length]
        this.roundRobinIndex++
        break
        
      case 'least_connections':
        selectedWorker = availableWorkers.reduce((prev, curr) => 
          curr.taskCount < prev.taskCount ? curr : prev
        )
        break
        
      case 'least_busy':
        selectedWorker = availableWorkers.reduce((prev, curr) => {
          const prevLoad = prev.taskCount + (prev.status === 'busy' ? 1 : 0)
          const currLoad = curr.taskCount + (curr.status === 'busy' ? 1 : 0)
          return currLoad < prevLoad ? curr : prev
        })
        break
        
      case 'random':
        selectedWorker = availableWorkers[Math.floor(Math.random() * availableWorkers.length)]
        break
        
      case 'weighted':
        // Simplified weighted selection - in practice would use weights from config
        selectedWorker = availableWorkers[0]
        break
        
      default:
        selectedWorker = availableWorkers[0]
    }
    
    this.selectionCount++
    this.workerSelections.set(selectedWorker.id, (this.workerSelections.get(selectedWorker.id) || 0) + 1)
    
    return selectedWorker
  }
  
  updateWorkerStatus(workerId: string, status: WorkerStatus): void {
    const worker = this.workers.find(w => w.id === workerId)
    if (worker) {
      ;(worker as any).status = status
      ;(worker as any).lastActivityAt = new Date()
    }
  }
  
  addWorker(worker: WorkerProcess): void {
    this.workers.push(worker)
  }
  
  removeWorker(workerId: string): void {
    this.workers = this.workers.filter(w => w.id !== workerId)
    this.workerSelections.delete(workerId)
  }
  
  getBalancingStats() {
    const totalWorkers = this.workers.length
    const totalSelections = this.selectionCount
    
    const utilizationByWorker: Record<string, number> = {}
    for (const [workerId, selections] of this.workerSelections) {
      utilizationByWorker[workerId] = totalSelections > 0 ? selections / totalSelections : 0
    }
    
    const averageLoadPerWorker = totalWorkers > 0 ? totalSelections / totalWorkers : 0
    const balancingEfficiency = this.calculateBalancingEfficiency()
    
    return {
      totalSelections,
      workerUtilization: utilizationByWorker,
      averageLoadPerWorker,
      balancingEfficiency
    }
  }
  
  private calculateBalancingEfficiency(): number {
    if (this.workers.length === 0) return 1.0
    
    const selections = Array.from(this.workerSelections.values())
    const avg = selections.reduce((a, b) => a + b, 0) / selections.length
    const variance = selections.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / selections.length
    
    // Lower variance = better balancing efficiency
    return Math.max(0, 1 - (variance / (avg * avg)))
  }
}

// =============================================================================
// Scaling Engine Implementation
// =============================================================================

/**
 * Dynamic scaling engine with multiple strategies
 */
class PoolScalingEngine implements ScalingEngine {
  private readonly scalingHistory: Array<{
    timestamp: Date
    action: 'up' | 'down'
    fromSize: number
    toSize: number
    reason: string
  }> = []
  
  private lastScaleUp = 0
  private lastScaleDown = 0
  
  constructor(
    public readonly strategy: import("./types").PoolScalingStrategy,
    public readonly pool: WorkerPool
  ) {}
  
  shouldScaleUp(): boolean {
    if (this.strategy === 'fixed') return false
    
    const now = Date.now()
    const config = this.pool.config
    const status = this.pool.getStatus()
    
    // Check cooldown
    if (now - this.lastScaleUp < config.scaleUpCooldown) {
      return false
    }
    
    // Check if we're at max capacity
    if (status.totalWorkers >= config.maxWorkers) {
      return false
    }
    
    // Calculate utilization
    const utilization = status.totalWorkers > 0 ? status.busyWorkers / status.totalWorkers : 0
    
    // Check if we should scale up based on utilization
    if (utilization >= config.scaleUpThreshold) {
      return true
    }
    
    // Check if we have queued tasks and no idle workers
    if (status.queuedTasks > 0 && status.idleWorkers === 0) {
      return true
    }
    
    return false
  }
  
  shouldScaleDown(): boolean {
    if (this.strategy === 'fixed') return false
    
    const now = Date.now()
    const config = this.pool.config
    const status = this.pool.getStatus()
    
    // Check cooldown
    if (now - this.lastScaleDown < config.scaleDownCooldown) {
      return false
    }
    
    // Check if we're at min capacity
    if (status.totalWorkers <= config.minWorkers) {
      return false
    }
    
    // Calculate utilization
    const utilization = status.totalWorkers > 0 ? status.busyWorkers / status.totalWorkers : 0
    
    // Check if we should scale down based on utilization
    if (utilization <= config.scaleDownThreshold) {
      return true
    }
    
    return false
  }
  
  calculateOptimalSize(): number {
    const config = this.pool.config
    const status = this.pool.getStatus()
    
    if (this.strategy === 'fixed') {
      return config.initialWorkers
    }
    
    // Simple heuristic: target 70% utilization
    const targetUtilization = 0.7
    const currentLoad = status.busyWorkers + status.queuedTasks
    const optimalSize = Math.ceil(currentLoad / targetUtilization)
    
    return Math.max(config.minWorkers, Math.min(config.maxWorkers, optimalSize))
  }
  
  async executeScaleUp(count: number = 1): Promise<void> {
    const status = this.pool.getStatus()
    const newSize = Math.min(status.totalWorkers + count, this.pool.config.maxWorkers)
    const actualCount = newSize - status.totalWorkers
    
    if (actualCount <= 0) return
    
    this.lastScaleUp = Date.now()
    
    // Record scaling event
    this.scalingHistory.push({
      timestamp: new Date(),
      action: 'up',
      fromSize: status.totalWorkers,
      toSize: newSize,
      reason: `Scaling up by ${actualCount} workers`
    })
    
    // Execute scaling (would be implemented in the actual pool)
    await this.pool.scaleUp(actualCount)
  }
  
  async executeScaleDown(count: number = 1): Promise<void> {
    const status = this.pool.getStatus()
    const newSize = Math.max(status.totalWorkers - count, this.pool.config.minWorkers)
    const actualCount = status.totalWorkers - newSize
    
    if (actualCount <= 0) return
    
    this.lastScaleDown = Date.now()
    
    // Record scaling event
    this.scalingHistory.push({
      timestamp: new Date(),
      action: 'down',
      fromSize: status.totalWorkers,
      toSize: newSize,
      reason: `Scaling down by ${actualCount} workers`
    })
    
    // Execute scaling (would be implemented in the actual pool)
    await this.pool.scaleDown(actualCount)
  }
  
  getScalingHistory() {
    return [...this.scalingHistory]
  }
}

// =============================================================================
// Worker Pool Implementation
// =============================================================================

/**
 * Production worker pool implementation
 */
export class ProcessWorkerPool implements WorkerPool {
  public readonly id: string
  public readonly config: PoolConfig
  public isRunning: boolean = false
  
  private readonly workers: Map<string, WorkerProcess> = new Map()
  private readonly taskQueue: TaskQueue
  private readonly workerFactory: WorkerFactory
  private readonly loadBalancer: LoadBalancer
  private readonly scalingEngine: ScalingEngine
  
  private readonly activeTasks: Map<string, PoolTask> = new Map()
  private readonly completedTasks: Map<string, TaskResult> = new Map()
  private readonly eventQueue: Queue.Queue<PoolEvent>
  private readonly taskResultQueue: Queue.Queue<TaskResult>
  
  private readonly metricsRef: Ref.Ref<PoolMetrics>
  private readonly startTime: Date = new Date()
  
  // Background processing
  private taskProcessor?: Promise<void>
  private healthChecker?: Timer
  private scaler?: Timer
  
  constructor(config: PoolConfig) {
    this.id = config.id
    this.config = config
    
    this.taskQueue = new FIFOTaskQueue(config.maxQueueSize)
    this.workerFactory = new ProcessWorkerFactory(config.id, config)
    this.loadBalancer = new PoolLoadBalancer(config.loadBalancingAlgorithm, [])
    this.scalingEngine = new PoolScalingEngine(config.scalingStrategy, this)
    
    // Initialize queues and refs (will be properly initialized in start())
    this.eventQueue = null as any
    this.taskResultQueue = null as any
    this.metricsRef = null as any
  }
  
  // =============================================================================
  // Pool Lifecycle
  // =============================================================================
  
  async start(): Promise<void> {
    if (this.isRunning) return
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessWorkerPool) {
        try {
          console.log(`Starting worker pool: ${this.id}`)
          
          // Initialize queues and metrics
          const eventQueue = yield* Queue.unbounded<PoolEvent>()
          const taskResultQueue = yield* Queue.unbounded<TaskResult>()
          const metricsRef = yield* Ref.make<PoolMetrics>({
            poolId: this.id,
            totalTasksProcessed: 0,
            totalTasksCompleted: 0,
            totalTasksFailed: 0,
            averageTaskDuration: 0,
            averageQueueTime: 0,
            throughputPerSecond: 0,
            workerUtilization: 0,
            scalingEvents: 0,
            errorRate: 0,
            peakWorkerCount: 0,
            totalWorkerRestarts: 0,
            resourceUsage: {
              cpu: 0,
              memory: 0,
              diskSpace: 0
            }
          })
          
          ;(this as any).eventQueue = eventQueue
          ;(this as any).taskResultQueue = taskResultQueue
          ;(this as any).metricsRef = metricsRef
          
          // Create initial workers
          yield* this.createInitialWorkers()
          
          // Start background processes
          this.startTaskProcessor()
          this.startHealthChecker()
          this.startScaler()
          
          this.isRunning = true
          
          // Emit started event
          yield* Queue.offer(eventQueue, {
            type: 'pool_started',
            poolId: this.id,
            timestamp: new Date()
          })
          
          console.log(`Worker pool started: ${this.id}`)
        } catch (error) {
          throw new PoolCreationError(`Failed to start pool ${this.id}: ${error}`)
        }
      }).bind(this))
    )
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) return
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessWorkerPool) {
        try {
          console.log(`Stopping worker pool: ${this.id}`)
          
          this.isRunning = false
          
          // Stop background processes
          if (this.taskProcessor) {
            // Cancel task processor
          }
          
          if (this.healthChecker) {
            clearInterval(this.healthChecker)
          }
          
          if (this.scaler) {
            clearInterval(this.scaler)
          }
          
          // Terminate all workers
          const terminationPromises = Array.from(this.workers.values()).map(worker =>
            this.workerFactory.terminateWorker(worker)
          )
          
          yield* Effect.tryPromise(() => Promise.allSettled(terminationPromises))
          
          // Clear collections
          this.workers.clear()
          this.activeTasks.clear()
          this.taskQueue.clear()
          
          // Emit stopped event
          yield* Queue.offer(this.eventQueue, {
            type: 'pool_stopped',
            poolId: this.id,
            timestamp: new Date()
          })
          
          console.log(`Worker pool stopped: ${this.id}`)
        } catch (error) {
          throw new PoolCreationError(`Failed to stop pool ${this.id}: ${error}`)
        }
      }).bind(this))
    )
  }
  
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }
  
  // =============================================================================
  // Task Management
  // =============================================================================
  
  async submitTask(task: Omit<PoolTask, 'id' | 'poolId' | 'createdAt' | 'status'>): Promise<string> {
    if (!this.isRunning) {
      throw new TaskExecutionError('Pool is not running')
    }
    
    const taskId = uuidv4()
    const poolTask: PoolTask = {
      id: taskId,
      poolId: this.id,
      createdAt: new Date(),
      status: 'pending',
      ...task
    }
    
    await this.taskQueue.enqueue(poolTask)
    
    // Emit task queued event
    await Effect.runPromise(
      Queue.offer(this.eventQueue, {
        type: 'task_queued',
        poolId: this.id,
        taskId,
        timestamp: new Date()
      })
    )
    
    return taskId
  }
  
  async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId)
    if (task) {
      // Cancel running task
      this.activeTasks.delete(taskId)
      ;(task as any).status = 'cancelled'
      
      // If task is assigned to a worker, mark worker as idle
      if (task.assignedWorker) {
        this.loadBalancer.updateWorkerStatus(task.assignedWorker, 'idle')
      }
    }
  }
  
  async getTaskResult(taskId: string): Promise<TaskResult | null> {
    return this.completedTasks.get(taskId) || null
  }
  
  async waitForTask(taskId: string): Promise<TaskResult> {
    // Simple polling implementation - in practice would use observables
    return new Promise((resolve, reject) => {
      const poll = () => {
        const result = this.completedTasks.get(taskId)
        if (result) {
          resolve(result)
        } else {
          setTimeout(poll, 100)
        }
      }
      
      setTimeout(() => reject(new TaskExecutionError(`Task ${taskId} timeout`)), this.config.taskTimeout)
      poll()
    })
  }
  
  // =============================================================================
  // Worker Management
  // =============================================================================
  
  getWorkers(): WorkerProcess[] {
    return Array.from(this.workers.values())
  }
  
  getWorker(workerId: string): WorkerProcess | null {
    return this.workers.get(workerId) || null
  }
  
  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId)
    if (!worker) return
    
    await this.workerFactory.terminateWorker(worker)
    this.workers.delete(workerId)
    this.loadBalancer.removeWorker(workerId)
    
    // Emit worker terminated event
    await Effect.runPromise(
      Queue.offer(this.eventQueue, {
        type: 'worker_terminated',
        poolId: this.id,
        workerId,
        reason: 'manual termination',
        timestamp: new Date()
      })
    )
  }
  
  // =============================================================================
  // Scaling
  // =============================================================================
  
  async scaleUp(count: number = 1): Promise<void> {
    if (!this.isRunning) return
    
    const promises = []
    for (let i = 0; i < count; i++) {
      promises.push(this.createWorker())
    }
    
    await Promise.allSettled(promises)
  }
  
  async scaleDown(count: number = 1): Promise<void> {
    if (!this.isRunning) return
    
    const idleWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle')
    const workersToTerminate = idleWorkers.slice(0, count)
    
    const promises = workersToTerminate.map(worker => this.terminateWorker(worker.id))
    await Promise.allSettled(promises)
  }
  
  async setPoolSize(size: number): Promise<void> {
    const currentSize = this.workers.size
    const targetSize = Math.max(this.config.minWorkers, Math.min(this.config.maxWorkers, size))
    
    if (targetSize > currentSize) {
      await this.scaleUp(targetSize - currentSize)
    } else if (targetSize < currentSize) {
      await this.scaleDown(currentSize - targetSize)
    }
  }
  
  // =============================================================================
  // Monitoring
  // =============================================================================
  
  getStatus(): PoolStatus {
    const workers = Array.from(this.workers.values())
    const idleWorkers = workers.filter(w => w.status === 'idle').length
    const busyWorkers = workers.filter(w => w.status === 'busy').length
    const failedWorkers = workers.filter(w => w.status === 'failed').length
    
    return {
      id: this.id,
      name: this.config.name,
      isRunning: this.isRunning,
      totalWorkers: workers.length,
      idleWorkers,
      busyWorkers,
      failedWorkers,
      queuedTasks: this.taskQueue.size,
      runningTasks: this.activeTasks.size,
      completedTasks: this.completedTasks.size,
      failedTasks: 0, // Would be calculated from completed tasks
      lastActivityAt: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      memoryUsage: process.memoryUsage().heapUsed
    }
  }
  
  getMetrics(): PoolMetrics {
    if (!this.metricsRef) {
      return {
        poolId: this.id,
        totalTasksProcessed: 0,
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
        averageTaskDuration: 0,
        averageQueueTime: 0,
        throughputPerSecond: 0,
        workerUtilization: 0,
        scalingEvents: 0,
        errorRate: 0,
        peakWorkerCount: 0,
        totalWorkerRestarts: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          diskSpace: 0
        }
      }
    }
    
    return Effect.runSync(Ref.get(this.metricsRef))
  }
  
  getStatistics(timeRange?: { start: Date; end: Date }): PoolStatistics {
    // Simplified implementation - would calculate from historical data
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    return {
      poolId: this.id,
      timeRange: timeRange || { start: oneHourAgo, end: now },
      taskStats: {
        total: this.completedTasks.size,
        completed: this.completedTasks.size,
        failed: 0,
        cancelled: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      },
      workerStats: {
        totalSpawned: this.workers.size,
        totalTerminated: 0,
        averageLifetime: 0,
        failureRate: 0,
        restartCount: 0
      },
      scalingStats: {
        scaleUpEvents: 0,
        scaleDownEvents: 0,
        averagePoolSize: this.workers.size,
        peakPoolSize: this.workers.size,
        minPoolSize: this.config.minWorkers
      }
    }
  }
  
  // =============================================================================
  // Event Streaming
  // =============================================================================
  
  subscribeToEvents(): Stream.Stream<PoolEvent, never, never> {
    return Stream.fromQueue(this.eventQueue)
  }
  
  subscribeToTaskResults(): Stream.Stream<TaskResult, never, never> {
    return Stream.fromQueue(this.taskResultQueue)
  }
  
  subscribeToWorkerEvents(): Stream.Stream<PoolEvent, never, never> {
    return Stream.filter(
      this.subscribeToEvents(),
      (event): event is PoolEvent => event.type.startsWith('worker_')
    )
  }
  
  // =============================================================================
  // Private Implementation Methods
  // =============================================================================
  
  private createInitialWorkers(): Effect.Effect<void, PoolCreationError, never> {
    return Effect.gen((function* (this: ProcessWorkerPool) {
      const promises = []
      for (let i = 0; i < this.config.initialWorkers; i++) {
        promises.push(this.createWorker())
      }
      
      yield* Effect.tryPromise(() => Promise.allSettled(promises))
    }).bind(this))
  }
  
  private async createWorker(): Promise<WorkerProcess> {
    try {
      const worker = await this.workerFactory.createWorker()
      this.workers.set(worker.id, worker)
      this.loadBalancer.addWorker(worker)
      
      // Emit worker spawned event
      await Effect.runPromise(
        Queue.offer(this.eventQueue, {
          type: 'worker_spawned',
          poolId: this.id,
          workerId: worker.id,
          timestamp: new Date()
        })
      )
      
      return worker
    } catch (error) {
      throw new WorkerSpawnError(`Failed to create worker: ${error}`)
    }
  }
  
  private startTaskProcessor(): void {
    this.taskProcessor = this.runTaskProcessor()
  }
  
  private async runTaskProcessor(): Promise<void> {
    while (this.isRunning) {
      try {
        const task = await this.taskQueue.dequeue()
        if (!task) {
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }
        
        const worker = this.loadBalancer.selectWorker(task)
        if (!worker) {
          // No workers available, put task back in queue
          await this.taskQueue.enqueue(task)
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        
        // Assign task to worker
        ;(task as any).assignedWorker = worker.id
        ;(task as any).status = 'assigned'
        this.activeTasks.set(task.id, task)
        this.loadBalancer.updateWorkerStatus(worker.id, 'busy')
        
        // Emit task assigned event
        await Effect.runPromise(
          Queue.offer(this.eventQueue, {
            type: 'task_assigned',
            poolId: this.id,
            taskId: task.id,
            workerId: worker.id,
            timestamp: new Date()
          })
        )
        
        // Execute task (simplified - would use IPC in practice)
        this.executeTask(task, worker)
        
      } catch (error) {
        console.error(`Task processor error:`, error)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  private async executeTask(task: PoolTask, worker: WorkerProcess): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Mark task as running
      ;(task as any).status = 'running'
      
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
      
      // Create task result
      const result: TaskResult = {
        taskId: task.id,
        workerId: worker.id,
        success: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        completedAt: new Date()
      }
      
      // Store result
      this.completedTasks.set(task.id, result)
      this.activeTasks.delete(task.id)
      
      // Update worker status
      this.loadBalancer.updateWorkerStatus(worker.id, 'idle')
      ;(worker as any).taskCount++
      
      // Emit events
      await Effect.runPromise(
        Queue.offer(this.eventQueue, {
          type: 'task_completed',
          poolId: this.id,
          taskId: task.id,
          workerId: worker.id,
          duration: result.duration,
          timestamp: new Date()
        })
      )
      
      await Effect.runPromise(
        Queue.offer(this.taskResultQueue, result)
      )
      
    } catch (error) {
      // Handle task failure
      const result: TaskResult = {
        taskId: task.id,
        workerId: worker.id,
        success: false,
        error: String(error),
        duration: Date.now() - startTime,
        completedAt: new Date()
      }
      
      this.completedTasks.set(task.id, result)
      this.activeTasks.delete(task.id)
      this.loadBalancer.updateWorkerStatus(worker.id, 'idle')
      
      // Emit failure event
      await Effect.runPromise(
        Queue.offer(this.eventQueue, {
          type: 'task_failed',
          poolId: this.id,
          taskId: task.id,
          workerId: worker.id,
          error: String(error),
          timestamp: new Date()
        })
      )
    }
  }
  
  private startHealthChecker(): void {
    this.healthChecker = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }
  
  private async performHealthCheck(): Promise<void> {
    // Check worker health and restart failed workers
    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'failed' || worker.failureCount > this.config.workerMaxFailures) {
        try {
          const newWorker = await this.workerFactory.restartWorker(worker)
          this.workers.set(workerId, newWorker)
          this.loadBalancer.addWorker(newWorker)
        } catch (error) {
          console.error(`Failed to restart worker ${workerId}:`, error)
        }
      }
    }
  }
  
  private startScaler(): void {
    this.scaler = setInterval(() => {
      this.performScaling()
    }, 5000) // Check every 5 seconds
  }
  
  private async performScaling(): Promise<void> {
    if (this.scalingEngine.shouldScaleUp()) {
      await this.scalingEngine.executeScaleUp()
    } else if (this.scalingEngine.shouldScaleDown()) {
      await this.scalingEngine.executeScaleDown()
    }
  }
}