import { Effect } from 'effect'
import { ModuleBase } from '../core/module-base'
import { EventBus } from '../core/event-bus'
import { ComponentLifecycleManager, ComponentConfig, ComponentMetrics } from './lifecycle/lifecycle-manager'
import { ComponentCoordinator, MasterDetailPattern, DataFlowPattern } from './coordination/component-coordinator'
import { OptimizedRenderer, RenderResult, RenderError, RenderingStats } from './performance/optimized-renderer'
import { generateId } from '../core/event-bus'

// Error types
export class ComponentSystemError extends Error {
  readonly _tag = 'ComponentSystemError'
}

// Component performance monitor
class ComponentPerformanceMonitor {
  private metrics = new Map<string, ComponentPerformanceMetrics>()
  
  constructor(private eventBus: EventBus) {}
  
  initialize(): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      // Subscribe to render events
      yield* this.eventBus.subscribe('render-events', (event) => 
        Effect.sync(() => {
          if (event.type === 'render-complete') {
            this.recordRenderMetric(event.payload.componentId, event.payload.renderTime)
          }
        })
      )
      
      // Subscribe to lifecycle events
      yield* this.eventBus.subscribe('component-lifecycle', (event) =>
        Effect.sync(() => {
          if (event.type === 'component-updated') {
            this.recordUpdateMetric(event.payload.componentId)
          }
        })
      )
    }.bind(this))
  }
  
  getMetrics(): Effect.Effect<PerformanceMetrics, never> {
    return Effect.sync(() => {
      const componentMetrics = Array.from(this.metrics.values())
      const totalRenders = componentMetrics.reduce((sum, m) => sum + m.renderCount, 0)
      const totalUpdates = componentMetrics.reduce((sum, m) => sum + m.updateCount, 0)
      const avgRenderTime = componentMetrics.reduce((sum, m) => sum + m.averageRenderTime, 0) / componentMetrics.length
      
      return {
        totalComponents: this.metrics.size,
        totalRenders,
        totalUpdates,
        averageRenderTime: avgRenderTime || 0,
        componentBreakdown: componentMetrics.slice(0, 10) // Top 10
      }
    })
  }
  
  private recordRenderMetric(componentId: string, renderTime: number): void {
    const metrics = this.metrics.get(componentId) || {
      componentId,
      renderCount: 0,
      updateCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0
    }
    
    metrics.renderCount++
    metrics.lastRenderTime = renderTime
    metrics.averageRenderTime = 
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount
    
    this.metrics.set(componentId, metrics)
  }
  
  private recordUpdateMetric(componentId: string): void {
    const metrics = this.metrics.get(componentId) || {
      componentId,
      renderCount: 0,
      updateCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0
    }
    
    metrics.updateCount++
    this.metrics.set(componentId, metrics)
  }
}

// Main component system module
export class ComponentSystemModule extends ModuleBase {
  private lifecycleManager: ComponentLifecycleManager
  private coordinator: ComponentCoordinator
  private renderer: OptimizedRenderer
  private performanceMonitor: ComponentPerformanceMonitor
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'component-system')
    
    this.lifecycleManager = new ComponentLifecycleManager(eventBus)
    this.coordinator = new ComponentCoordinator(eventBus)
    this.renderer = new OptimizedRenderer(eventBus, this.lifecycleManager)
    this.performanceMonitor = new ComponentPerformanceMonitor(eventBus)
  }
  
  initialize(): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      this.state = 'initializing'
      
      // Initialize subsystems
      yield* this.performanceMonitor.initialize()
      
      // Register default coordination patterns
      yield* this.registerDefaultCoordinationPatterns()
      
      // Set up component event monitoring
      yield* this.setupComponentEventMonitoring()
      
      // Register lifecycle hooks
      yield* this.registerDefaultLifecycleHooks()
      
      yield* this.emitEvent('component-system-events', {
        type: 'component-system-initialized',
        timestamp: new Date(),
        id: generateId()
      })
      
      // Mark module as ready
      yield* this.setReady()
    }.bind(this))
  }
  
  // Main API for component management
  createComponent(
    componentId: string,
    element: JSX.Element,
    config?: ComponentConfig
  ): Effect.Effect<ComponentHandle, ComponentSystemError> {
    return Effect.gen(function* () {
      // Register with lifecycle manager
      yield* this.lifecycleManager.registerComponent(componentId, element, undefined, config)
        .pipe(Effect.mapError(e => new ComponentSystemError(e.message)))
      
      // Queue for initial render
      yield* this.renderer.queueRender(componentId, element, 'high', 'mount')
      
      // Create component handle
      const handle: ComponentHandle = {
        id: componentId,
        update: (newProps: Record<string, unknown>, reason = 'update') =>
          this.updateComponent(componentId, newProps, reason),
        destroy: () => this.destroyComponent(componentId),
        getMetrics: () => this.lifecycleManager.getComponentMetrics(componentId),
        forceRender: () => this.renderer.forceRender(componentId, element)
      }
      
      return handle
    }.bind(this))
  }
  
  // Update component
  private updateComponent(
    componentId: string,
    newProps: Record<string, unknown>,
    reason: string
  ): Effect.Effect<void, ComponentSystemError> {
    return Effect.gen(function* () {
      // Update lifecycle
      yield* this.lifecycleManager.updateComponent(
        componentId,
        newProps,
        reason === 'force' ? 'force-update' : 'props-change'
      ).pipe(Effect.mapError(e => new ComponentSystemError(e.message)))
      
      // Queue render
      yield* this.renderer.queueRender(
        componentId,
        { type: 'div', props: newProps } as any,
        'normal',
        'update'
      )
    }.bind(this))
  }
  
  // Destroy component
  private destroyComponent(componentId: string): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      // Clear render cache
      yield* this.renderer.clearCache(componentId)
      
      // Unmount component
      yield* this.lifecycleManager.unmountComponent(componentId)
    }.bind(this))
  }
  
  // Start component coordination
  startComponentCoordination(
    coordinationId: string,
    patternId: string,
    participants: string[],
    config?: Record<string, unknown>
  ): Effect.Effect<void, ComponentSystemError> {
    return this.coordinator.startCoordination(coordinationId, patternId, participants, config)
      .pipe(Effect.mapError(e => new ComponentSystemError(e.message)))
  }
  
  // Stop component coordination
  stopComponentCoordination(coordinationId: string): Effect.Effect<void, never> {
    return this.coordinator.stopCoordination(coordinationId)
  }
  
  // Performance API
  getSystemPerformanceMetrics(): Effect.Effect<ComponentSystemMetrics, never> {
    return Effect.gen(function* () {
      const performanceMetrics = yield* this.performanceMonitor.getMetrics()
      const activeComponents = yield* this.getActiveComponentCount()
      const memoryUsage = yield* this.estimateSystemMemoryUsage()
      const renderingStats = yield* this.renderer.getRenderingStats()
      
      return {
        timestamp: new Date(),
        performance: performanceMetrics,
        activeComponents,
        memoryUsage,
        renderingStats
      }
    }.bind(this))
  }
  
  private registerDefaultCoordinationPatterns(): Effect.Effect<void, never> {
    return Effect.all([
      this.coordinator.registerPattern(MasterDetailPattern),
      this.coordinator.registerPattern(DataFlowPattern)
    ]).pipe(Effect.asVoid)
  }
  
  private setupComponentEventMonitoring(): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      // Monitor component errors
      yield* this.eventBus.subscribe('component-lifecycle', (event) =>
        Effect.sync(() => {
          if (event.type === 'component-error') {
            console.error('Component error:', event.payload)
          }
        })
      )
      
      // Monitor performance issues
      yield* this.eventBus.subscribe('render-events', (event) =>
        Effect.sync(() => {
          if (event.type === 'render-error' || 
              (event.type === 'render-complete' && event.payload.renderTime > 100)) {
            console.warn('Render performance issue:', event.payload)
          }
        })
      )
    }.bind(this))
  }
  
  private registerDefaultLifecycleHooks(): Effect.Effect<void, never> {
    return Effect.all([
      // Log component mounting
      this.lifecycleManager.registerLifecycleHook('post-mount', (instance) =>
        Effect.sync(() => {
          console.log(`Component ${instance.id} mounted`)
        })
      ),
      
      // Validate updates
      this.lifecycleManager.registerLifecycleHook('pre-update', (instance, context) =>
        Effect.sync(() => {
          if (context?.reason === 'force-update') {
            console.log(`Force update on component ${instance.id}`)
          }
        })
      )
    ]).pipe(Effect.asVoid)
  }
  
  private getActiveComponentCount(): Effect.Effect<number, never> {
    return Effect.sync(() => {
      // This would query the lifecycle manager for active components
      return 0 // Placeholder
    })
  }
  
  private estimateSystemMemoryUsage(): Effect.Effect<number, never> {
    return Effect.sync(() => {
      // This would calculate total memory usage
      return 0 // Placeholder
    })
  }
}

export interface ComponentHandle {
  id: string
  update: (newProps: Record<string, unknown>, reason?: string) => Effect.Effect<void, ComponentSystemError>
  destroy: () => Effect.Effect<void, never>
  getMetrics: () => Effect.Effect<ComponentMetrics | null, never>
  forceRender: () => Effect.Effect<RenderResult, RenderError>
}

interface ComponentPerformanceMetrics {
  componentId: string
  renderCount: number
  updateCount: number
  averageRenderTime: number
  lastRenderTime: number
}

interface PerformanceMetrics {
  totalComponents: number
  totalRenders: number
  totalUpdates: number
  averageRenderTime: number
  componentBreakdown: ComponentPerformanceMetrics[]
}

export interface ComponentSystemMetrics {
  timestamp: Date
  performance: PerformanceMetrics
  activeComponents: number
  memoryUsage: number
  renderingStats: RenderingStats
}