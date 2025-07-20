import { Effect } from 'effect'
import { EventBus } from '../../core/event-bus'
import { ComponentLifecycleManager } from '../lifecycle/lifecycle-manager'
import { generateId } from '../../core/event-bus'

// Error types
export class RenderError extends Error {
  readonly _tag = 'RenderError'
}

// Performance-optimized rendering with intelligent batching
export class OptimizedRenderer {
  private renderQueue = new Map<string, RenderTask>()
  private batchTimer: NodeJS.Timeout | null = null
  private renderCache = new Map<string, CachedRender>()
  private renderingStats: RenderingStats = {
    totalRenders: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchedRenders: 0,
    averageRenderTime: 0
  }
  
  constructor(
    private eventBus: EventBus,
    private lifecycleManager: ComponentLifecycleManager
  ) {}
  
  // Queue component for rendering with batching
  queueRender(
    componentId: string,
    element: JSX.Element,
    priority: RenderPriority = 'normal',
    reason: RenderReason = 'update'
  ): Effect.Effect<void, never> {
    return Effect.sync(() => {
      const task: RenderTask = {
        componentId,
        element,
        priority,
        reason,
        timestamp: Date.now()
      }
      
      this.renderQueue.set(componentId, task)
      
      // Schedule batch processing
      this.scheduleBatchRender()
    })
  }
  
  // Force immediate render (bypasses batching)
  forceRender(
    componentId: string,
    element: JSX.Element
  ): Effect.Effect<RenderResult, RenderError> {
    return Effect.gen(function* () {
      const startTime = Date.now()
      
      try {
        // Check cache first
        const cached = this.getCachedRender(componentId, element)
        if (cached) {
          this.renderingStats.cacheHits++
          yield* this.emitRenderEvent('render-cache-hit', componentId, element, startTime)
          return cached.result
        }
        
        this.renderingStats.cacheMisses++
        
        // Perform actual render
        const result = yield* this.performRender(componentId, element)
        const renderTime = Date.now() - startTime
        
        // Update stats
        this.updateRenderStats(renderTime)
        
        // Cache result if cacheable
        if (this.isCacheable(element, renderTime)) {
          this.cacheRender(componentId, element, result, renderTime)
        }
        
        yield* this.emitRenderEvent('render-complete', componentId, element, renderTime)
        return result
        
      } catch (error) {
        const renderTime = Date.now() - startTime
        yield* this.emitRenderEvent('render-error', componentId, element, renderTime, error as Error)
        return yield* Effect.fail(new RenderError(`Failed to render component ${componentId}: ${error}`))
      }
    }.bind(this))
  }
  
  // Get rendering statistics
  getRenderingStats(): Effect.Effect<RenderingStats, never> {
    return Effect.sync(() => ({ ...this.renderingStats }))
  }
  
  // Clear render cache
  clearCache(componentId?: string): Effect.Effect<void, never> {
    return Effect.sync(() => {
      if (componentId) {
        // Clear cache for specific component
        for (const [key] of this.renderCache) {
          if (key.startsWith(componentId)) {
            this.renderCache.delete(key)
          }
        }
      } else {
        // Clear all cache
        this.renderCache.clear()
      }
    })
  }
  
  private scheduleBatchRender(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    
    this.batchTimer = setTimeout(() => {
      Effect.runSync(this.processBatchRender())
    }, 16) // 60fps
  }
  
  private processBatchRender(): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      if (this.renderQueue.size === 0) return
      
      // Sort tasks by priority and timestamp
      const tasks = Array.from(this.renderQueue.values()).sort((a, b) => {
        const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        return a.timestamp - b.timestamp
      })
      
      // Clear queue
      this.renderQueue.clear()
      
      // Group tasks for batch processing
      const batches = this.groupTasksIntoBatches(tasks)
      
      for (const batch of batches) {
        yield* this.processBatch(batch)
      }
      
      this.renderingStats.batchedRenders += tasks.length
    }.bind(this))
  }
  
  private groupTasksIntoBatches(tasks: RenderTask[]): RenderTask[][] {
    // Group by priority for now, could be more sophisticated
    const batches: RenderTask[][] = []
    let currentBatch: RenderTask[] = []
    let currentPriority: RenderPriority | null = null
    
    for (const task of tasks) {
      if (currentPriority !== task.priority && currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
      }
      currentPriority = task.priority
      currentBatch.push(task)
      
      // Limit batch size
      if (currentBatch.length >= 10) {
        batches.push(currentBatch)
        currentBatch = []
        currentPriority = null
      }
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }
    
    return batches
  }
  
  private processBatch(batch: RenderTask[]): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      const startTime = Date.now()
      
      // Render all components in batch
      const results = yield* Effect.all(
        batch.map(task => 
          this.forceRender(task.componentId, task.element).pipe(
            Effect.catchAll(() => Effect.succeed(null))
          )
        )
      )
      
      const batchTime = Date.now() - startTime
      
      // Emit batch complete event
      yield* this.eventBus.publish('render-batch', {
        type: 'batch-rendered',
        source: 'optimized-renderer',
        timestamp: new Date(),
        id: generateId(),
        payload: {
          batchSize: batch.length,
          batchTime,
          averageTime: batchTime / batch.length
        }
      })
    }.bind(this))
  }
  
  private performRender(componentId: string, element: JSX.Element): Effect.Effect<RenderResult, never> {
    return Effect.sync(() => {
      // Simulate render (in real implementation, this would do actual rendering)
      const nodeCount = this.countNodes(element)
      const memoryUsage = nodeCount * 64 // Rough estimate
      
      return {
        componentId,
        output: `<div id="${componentId}">${JSON.stringify(element.props)}</div>`,
        metrics: {
          renderTime: Math.random() * 10, // Simulated
          nodeCount,
          memoryUsage
        }
      }
    })
  }
  
  private getCachedRender(componentId: string, element: JSX.Element): CachedRender | null {
    const cacheKey = this.getCacheKey(componentId, element)
    const cached = this.renderCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached
    }
    
    return null
  }
  
  private cacheRender(
    componentId: string,
    element: JSX.Element,
    result: RenderResult,
    renderTime: number
  ): void {
    const cacheKey = this.getCacheKey(componentId, element)
    this.renderCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      renderTime
    })
    
    // Limit cache size
    if (this.renderCache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.renderCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      for (let i = 0; i < 100; i++) {
        this.renderCache.delete(entries[i][0])
      }
    }
  }
  
  private getCacheKey(componentId: string, element: JSX.Element): string {
    return `${componentId}-${JSON.stringify(element.props)}`
  }
  
  private isCacheable(element: JSX.Element, renderTime: number): boolean {
    // Don't cache if render was too slow or props are too large
    const propsSize = JSON.stringify(element.props || {}).length
    return renderTime < 50 && propsSize < 10000
  }
  
  private countNodes(element: JSX.Element): number {
    // Simple node counting (would be more sophisticated in real implementation)
    return 1 + Object.keys(element.props || {}).length
  }
  
  private updateRenderStats(renderTime: number): void {
    this.renderingStats.totalRenders++
    const total = this.renderingStats.averageRenderTime * (this.renderingStats.totalRenders - 1)
    this.renderingStats.averageRenderTime = (total + renderTime) / this.renderingStats.totalRenders
  }
  
  private emitRenderEvent(
    type: string,
    componentId: string,
    element: JSX.Element,
    renderTime: number,
    error?: Error
  ): Effect.Effect<void, never> {
    return this.eventBus.publish('render-events', {
      type,
      source: 'optimized-renderer',
      timestamp: new Date(),
      id: generateId(),
      payload: {
        componentId,
        renderTime,
        elementType: element.type,
        error: error?.message
      }
    })
  }
}

type RenderPriority = 'high' | 'normal' | 'low'
type RenderReason = 'mount' | 'update' | 'force' | 'batch'

interface RenderTask {
  componentId: string
  element: JSX.Element
  priority: RenderPriority
  reason: RenderReason
  timestamp: number
}

export interface RenderResult {
  componentId: string
  output: string
  metrics: {
    renderTime: number
    nodeCount: number
    memoryUsage: number
  }
}

interface CachedRender {
  result: RenderResult
  timestamp: number
  renderTime: number
}

export interface RenderingStats {
  totalRenders: number
  cacheHits: number
  cacheMisses: number
  batchedRenders: number
  averageRenderTime: number
}