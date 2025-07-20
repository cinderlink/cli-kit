/**
 * Reactive Component System for TUIX
 * 
 * Provides event-driven reactivity for TUIX components using:
 * - Svelte 5 Runes for state management
 * - Effect.ts for async operations
 * - EventBus for component communication
 * - Scope system for hierarchical context
 */

import { Effect } from 'effect'
import { EventBus, BaseEvent, generateId } from '../../core/event-bus'
import type { ScopeContext } from '../../scope'
import { $state, $derived, $effect, type StateRune, type DerivedRune } from '../../reactivity/runes'
import type { UIComponent, CommonMessage } from '../../tea/base'
import type { View } from '../../core/types'

/**
 * Base interface for reactive components that respond to events
 */
export interface ReactiveComponent<Model, Msg extends CommonMessage> extends UIComponent<Model, Msg> {
  /**
   * Event channels this component subscribes to
   */
  readonly eventChannels: string[]
  
  /**
   * Handle incoming events from the event bus
   */
  handleEvent(event: BaseEvent): Effect.Effect<Msg | null, never>
  
  /**
   * Optional scope context for hierarchical organization
   */
  scope?: ScopeContext
}

/**
 * Reactive component state manager
 */
export class ReactiveComponentManager {
  private components = new Map<string, ReactiveComponentState<any, any>>()
  private subscriptions = new Map<string, (() => void)[]>()
  
  constructor(private eventBus: EventBus) {}
  
  /**
   * Register a reactive component
   */
  registerComponent<Model, Msg extends CommonMessage>(
    componentId: string,
    component: ReactiveComponent<Model, Msg>,
    initialModel: Model
  ): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      // Create reactive state for the component
      const state: ReactiveComponentState<Model, Msg> = {
        id: componentId,
        component,
        model: $state(initialModel),
        eventSubscriptions: []
      }
      
      this.components.set(componentId, state)
      
      // Subscribe to component's event channels
      const subscriptions: (() => void)[] = []
      
      for (const channel of component.eventChannels) {
        const unsubscribe = yield* this.eventBus.subscribe(channel, (event) =>
          this.handleComponentEvent(componentId, event)
        )
        subscriptions.push(unsubscribe)
      }
      
      this.subscriptions.set(componentId, subscriptions)
      
      // Emit component registered event
      yield* this.eventBus.publish('component-lifecycle', {
        type: 'component-registered',
        source: 'reactive-component-manager',
        timestamp: new Date(),
        id: generateId(),
        componentId,
        eventChannels: component.eventChannels
      })
    }.bind(this))
  }
  
  /**
   * Unregister a component
   */
  unregisterComponent(componentId: string): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      const subscriptions = this.subscriptions.get(componentId)
      if (subscriptions) {
        // Unsubscribe from all event channels
        subscriptions.forEach(unsub => unsub())
        this.subscriptions.delete(componentId)
      }
      
      this.components.delete(componentId)
      
      // Emit component unregistered event
      yield* this.eventBus.publish('component-lifecycle', {
        type: 'component-unregistered',
        source: 'reactive-component-manager',
        timestamp: new Date(),
        id: generateId(),
        componentId
      })
    }.bind(this))
  }
  
  /**
   * Handle event for a specific component
   */
  private handleComponentEvent<Model, Msg extends CommonMessage>(
    componentId: string,
    event: BaseEvent
  ): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      const state = this.components.get(componentId)
      if (!state) return
      
      // Let component handle the event
      const msg = yield* state.component.handleEvent(event)
      
      if (msg) {
        // Update component model using the message
        const [newModel, cmd] = state.component.update(msg, state.model())
        state.model.$set(newModel)
        
        // Handle any commands
        if (cmd) {
          yield* cmd
        }
      }
    }.bind(this))
  }
  
  /**
   * Get reactive model for a component
   */
  getComponentModel<Model>(componentId: string): StateRune<Model> | null {
    const state = this.components.get(componentId)
    return state ? state.model : null
  }
}

/**
 * Internal state for reactive components
 */
interface ReactiveComponentState<Model, Msg extends CommonMessage> {
  id: string
  component: ReactiveComponent<Model, Msg>
  model: StateRune<Model>
  eventSubscriptions: (() => void)[]
}

/**
 * Create a reactive component wrapper
 */
export function createReactiveComponent<Model, Msg extends CommonMessage>(
  component: UIComponent<Model, Msg>,
  eventChannels: string[],
  handleEvent: (event: BaseEvent) => Effect.Effect<Msg | null, never>
): ReactiveComponent<Model, Msg> {
  return {
    ...component,
    eventChannels,
    handleEvent
  }
}

/**
 * Hook for using reactive state in components
 */
export function useReactiveState<T>(
  eventBus: EventBus,
  channel: string,
  initialValue: T,
  selector?: (event: BaseEvent) => T | undefined
): StateRune<T> {
  const state = $state(initialValue)
  
  // Subscribe to events and update state
  $effect(() => {
    const unsubscribe = Effect.runSync(
      eventBus.subscribe(channel, (event) =>
        Effect.sync(() => {
          const newValue = selector ? selector(event) : (event as any).payload as T
          if (newValue !== undefined) {
            state.$set(newValue)
          }
        })
      )
    )
    
    // Cleanup on destroy
    return () => unsubscribe()
  })
  
  return state
}

/**
 * Hook for emitting events from components
 */
export function useEventEmitter(
  eventBus: EventBus,
  componentName: string
): <T extends BaseEvent>(channel: string, event: Omit<T, 'id' | 'source' | 'timestamp'>) => void {
  return <T extends BaseEvent>(channel: string, event: Omit<T, 'id' | 'source' | 'timestamp'>) => {
    const fullEvent = {
      ...event,
      source: componentName,
      timestamp: new Date(),
      id: generateId()
    } as T
    
    Effect.runSync(eventBus.publish(channel, fullEvent))
  }
}

/**
 * Create a derived state that reacts to events
 */
export function useReactiveDerived<T, D>(
  eventBus: EventBus,
  channel: string,
  baseValue: StateRune<T>,
  derive: (base: T, event?: BaseEvent) => D
): DerivedRune<D> {
  let lastEvent: BaseEvent | undefined
  
  // Subscribe to events
  $effect(() => {
    const unsubscribe = Effect.runSync(
      eventBus.subscribe(channel, (event) =>
        Effect.sync(() => {
          lastEvent = event
        })
      )
    )
    
    return () => unsubscribe()
  })
  
  // Create derived value
  return $derived(() => derive(baseValue(), lastEvent))
}