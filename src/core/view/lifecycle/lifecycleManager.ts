import { Effect, Ref, Duration } from 'effect'
import { EventBus } from '../../model/events/event-bus'
import type { ScopeContext } from '../../scope'
import { generateId } from '../../model/events/event-bus'

// Error types
export class ComponentError extends Error {
  readonly _tag = 'ComponentError'
}

export class ComponentNotFoundError extends ComponentError {
  constructor(componentId: string) {
    super(`Component not found: ${componentId}`)
  }
}

// Advanced lifecycle management for components
export class ComponentLifecycleManager {
  private components = new Map<string, ComponentInstance>()
  private lifecycleHooks = new Map<string, LifecycleHook[]>()
  
  constructor(private eventBus: EventBus) {}
  
  // Register a component with advanced lifecycle management
  registerComponent(
    componentId: string,
    element: JSX.Element,
    scope?: ScopeContext,
    config?: ComponentConfig
  ): Effect.Effect<void, ComponentError> {
    return Effect.gen(function* () {
      const instance: ComponentInstance = {
        id: componentId,
        element,
        scope,
        config: config || {},
        state: 'initializing',
        mountTime: new Date(),
        updateCount: 0,
        errorCount: 0
      }
      
      this.components.set(componentId, instance)
      
      // Execute pre-mount hooks
      yield* this.executeHooks('pre-mount', instance)
      
      // Set up automatic lifecycle monitoring
      yield* this.setupLifecycleMonitoring(instance)
      
      // Execute post-mount hooks
      yield* this.executeHooks('post-mount', instance)
      
      instance.state = 'mounted'
      
      // Emit component mounted event
      yield* this.eventBus.publish('component-lifecycle', {
        type: 'component-mounted',
        source: 'lifecycle-manager',
        timestamp: new Date(),
        id: generateId(),
        payload: {
          componentId,
          elementType: element.type,
          scope: scope?.path
        }
      })
    }.bind(this))
  }
  
  // Update component with change detection
  updateComponent(
    componentId: string,
    newProps: Record<string, unknown>,
    reason: 'props-change' | 'state-change' | 'force-update'
  ): Effect.Effect<void, ComponentError> {
    return Effect.gen(function* () {
      const instance = this.components.get(componentId)
      if (!instance) {
        yield* Effect.fail(new ComponentNotFoundError(componentId))
        return
      }
      
      const oldProps = instance.element.props
      const hasPropsChanged = this.hasPropsChanged(oldProps, newProps)
      
      if (!hasPropsChanged && reason !== 'force-update') {
        return // Skip unnecessary update
      }
      
      // Execute pre-update hooks
      yield* this.executeHooks('pre-update', instance, { oldProps, newProps, reason })
      
      // Update the instance
      instance.element = { ...instance.element, props: newProps }
      instance.updateCount++
      instance.lastUpdate = new Date()
      
      // Execute post-update hooks
      yield* this.executeHooks('post-update', instance, { oldProps, newProps, reason })
      
      // Emit component updated event
      yield* this.eventBus.publish('component-lifecycle', {
        type: 'component-updated',
        source: 'lifecycle-manager',
        timestamp: new Date(),
        id: generateId(),
        payload: {
          componentId,
          reason,
          updateCount: instance.updateCount,
          propsChanged: hasPropsChanged
        }
      })
    }.bind(this))
  }
  
  // Unmount component
  unmountComponent(componentId: string): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      const instance = this.components.get(componentId)
      if (!instance) return
      
      instance.state = 'unmounting'
      
      // Execute pre-unmount hooks
      yield* this.executeHooks('pre-unmount', instance)
      
      // Cleanup
      this.components.delete(componentId)
      
      // Execute post-unmount hooks
      yield* this.executeHooks('post-unmount', instance)
      
      instance.state = 'unmounted'
      
      // Emit component unmounted event
      yield* this.eventBus.publish('component-lifecycle', {
        type: 'component-unmounted',
        source: 'lifecycle-manager',
        timestamp: new Date(),
        id: generateId(),
        payload: {
          componentId,
          lifetime: Date.now() - instance.mountTime.getTime(),
          updateCount: instance.updateCount,
          errorCount: instance.errorCount
        }
      })
    }.bind(this))
  }
  
  // Get component metrics
  getComponentMetrics(componentId: string): Effect.Effect<ComponentMetrics | null, never> {
    return Effect.sync(() => {
      const instance = this.components.get(componentId)
      if (!instance) return null
      
      return {
        componentId,
        state: instance.state,
        lifetime: Date.now() - instance.mountTime.getTime(),
        updateCount: instance.updateCount,
        errorCount: instance.errorCount,
        lastUpdate: instance.lastUpdate,
        memoryUsage: this.estimateComponentMemoryUsage(instance)
      }
    })
  }
  
  // Register lifecycle hook
  registerLifecycleHook(phase: LifecyclePhase, hook: LifecycleHook): Effect.Effect<void, never> {
    return Effect.sync(() => {
      const hooks = this.lifecycleHooks.get(phase) || []
      hooks.push(hook)
      this.lifecycleHooks.set(phase, hooks)
    })
  }
  
  private executeHooks(
    phase: LifecyclePhase,
    instance: ComponentInstance,
    context?: Record<string, unknown>
  ): Effect.Effect<void, never> {
    const hooks = this.lifecycleHooks.get(phase) || []
    
    return Effect.all(
      hooks.map(hook => 
        hook(instance, context).pipe(
          Effect.catchAll(error => 
            Effect.sync(() => {
              instance.errorCount++
              console.error(`Lifecycle hook error in ${phase}:`, error)
            })
          )
        )
      )
    ).pipe(Effect.asVoid)
  }
  
  private setupLifecycleMonitoring(instance: ComponentInstance): Effect.Effect<void, never> {
    return Effect.sync(() => {
      // Setup monitoring if enabled
      if (instance.config.enableHealthMonitoring) {
        // This would set up health checks, memory monitoring, etc.
        // For now, just log
        console.log(`Monitoring enabled for component ${instance.id}`)
      }
    })
  }
  
  private hasPropsChanged(oldProps: Record<string, unknown>, newProps: Record<string, unknown>): boolean {
    const oldKeys = Object.keys(oldProps || {})
    const newKeys = Object.keys(newProps || {})
    
    if (oldKeys.length !== newKeys.length) return true
    
    return oldKeys.some(key => oldProps[key] !== newProps[key])
  }
  
  private estimateComponentMemoryUsage(instance: ComponentInstance): number {
    // Rough estimation based on props size and update count
    const propsSize = JSON.stringify(instance.element.props || {}).length
    const baseSize = 1024 // Base component overhead
    const updateOverhead = instance.updateCount * 64 // Memory for update tracking
    
    return baseSize + propsSize + updateOverhead
  }
}

type LifecyclePhase = 'pre-mount' | 'post-mount' | 'pre-update' | 'post-update' | 'pre-unmount' | 'post-unmount'
type LifecycleHook = (instance: ComponentInstance, context?: Record<string, unknown>) => Effect.Effect<void, never>

interface ComponentInstance {
  id: string
  element: JSX.Element
  scope?: ScopeContext
  config: ComponentConfig
  state: 'initializing' | 'mounted' | 'unmounting' | 'unmounted'
  mountTime: Date
  lastUpdate?: Date
  updateCount: number
  errorCount: number
}

export interface ComponentConfig {
  enableHealthMonitoring?: boolean
  updateBatchingEnabled?: boolean
  errorRecoveryEnabled?: boolean
}

export interface ComponentMetrics {
  componentId: string
  state: ComponentInstance['state']
  lifetime: number
  updateCount: number
  errorCount: number
  lastUpdate?: Date
  memoryUsage: number
}