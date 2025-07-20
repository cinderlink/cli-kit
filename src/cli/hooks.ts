/**
 * Hook System for CLI Framework
 * 
 * Provides a single, consistent hook API that wraps the event system.
 * 
 * The hook system enables:
 * - Lifecycle management for CLI commands
 * - Plugin middleware and extensions
 * - Error handling and recovery
 * - Custom event-driven behaviors
 */

import { Effect } from "effect"
import { EventBus, BaseEvent, generateId } from "../core/event-bus"

/**
 * Hook event types
 */
export interface BeforeInitEvent extends BaseEvent {
  type: 'hook:beforeInit'
  config: Record<string, unknown>
}

export interface AfterInitEvent extends BaseEvent {
  type: 'hook:afterInit'
  config: Record<string, unknown>
}

export interface BeforeCommandEvent extends BaseEvent {
  type: 'hook:beforeCommand'
  command: string[]
  args: Record<string, unknown>
}

export interface AfterCommandEvent extends BaseEvent {
  type: 'hook:afterCommand'
  command: string[]
  args: Record<string, unknown>
  result: unknown
}

export interface OnErrorEvent extends BaseEvent {
  type: 'hook:onError'
  error: Error
  command: string[]
  args: Record<string, unknown>
}

export interface PluginLoadEvent extends BaseEvent {
  type: 'hook:pluginLoad'
  pluginName: string
  pluginVersion: string
}

export interface PluginUnloadEvent extends BaseEvent {
  type: 'hook:pluginUnload'
  pluginName: string
  pluginVersion: string
}

export interface BeforeParseEvent extends BaseEvent {
  type: 'hook:beforeParse'
  argv: string[]
}

export interface AfterParseEvent extends BaseEvent {
  type: 'hook:afterParse'
  argv: string[]
  parsed: Record<string, unknown>
}

export interface BeforeValidateEvent extends BaseEvent {
  type: 'hook:beforeValidate'
  args: Record<string, unknown>
  command: string[]
}

export interface AfterValidateEvent extends BaseEvent {
  type: 'hook:afterValidate'
  args: Record<string, unknown>
  command: string[]
  valid: boolean
}

export interface BeforeExecuteEvent extends BaseEvent {
  type: 'hook:beforeExecute'
  command: string[]
  args: Record<string, unknown>
}

export interface AfterExecuteEvent extends BaseEvent {
  type: 'hook:afterExecute'
  command: string[]
  args: Record<string, unknown>
  result: unknown
}

export interface BeforeRenderEvent extends BaseEvent {
  type: 'hook:beforeRender'
  component: unknown
}

export interface AfterRenderEvent extends BaseEvent {
  type: 'hook:afterRender'
  component: unknown
  output: string
}

/**
 * All hook event types union
 */
export type HookEvent = 
  | BeforeInitEvent
  | AfterInitEvent
  | BeforeCommandEvent
  | AfterCommandEvent
  | OnErrorEvent
  | PluginLoadEvent
  | PluginUnloadEvent
  | BeforeParseEvent
  | AfterParseEvent
  | BeforeValidateEvent
  | AfterValidateEvent
  | BeforeExecuteEvent
  | AfterExecuteEvent
  | BeforeRenderEvent
  | AfterRenderEvent

/**
 * Hook subscription that can be unsubscribed
 */
export interface Subscription {
  unsubscribe: () => Effect<void, never>
}

/**
 * Hook wrapper providing a clean API over event subscriptions
 */
export interface Hook<T extends BaseEvent> {
  /**
   * Subscribe to the hook
   */
  subscribe: (handler: (event: T) => Effect<void, never> | Promise<void> | void) => Effect<Subscription, never>
  
  /**
   * Subscribe to the hook for one event only
   */
  once: (handler: (event: T) => Effect<void, never> | Promise<void> | void) => Effect<Subscription, never>
  
  /**
   * Filter events before they reach handlers
   */
  filter: (predicate: (event: T) => boolean) => Hook<T>
}

/**
 * Create a hook wrapper around an event channel
 */
function createHook<T extends BaseEvent>(
  eventBus: EventBus,
  channel: string,
  source: string
): Hook<T> {
  const hook: Hook<T> = {
    subscribe: (handler) => {
      return Effect.gen(function* () {
        // Wrap handler to support sync/async/Effect functions
        const effectHandler = (event: T) => {
          const result = handler(event)
          
          if (Effect.isEffect(result)) {
            return result as Effect<void, never>
          } else if (result instanceof Promise) {
            return Effect.tryPromise({
              try: () => result,
              catch: () => new Error('Hook handler failed')
            }).pipe(Effect.asVoid)
          } else {
            return Effect.void
          }
        }
        
        const unsubscribe = yield* eventBus.subscribe(channel, effectHandler)
        return { unsubscribe }
      })
    },
    
    once: (handler) => {
      return Effect.gen(function* () {
        let unsubscribe: (() => Effect<void, never>) | null = null
        
        const effectHandler = (event: T) => {
          return Effect.gen(function* () {
            // Run the handler
            const result = handler(event)
            
            if (Effect.isEffect(result)) {
              yield* result as Effect<void, never>
            } else if (result instanceof Promise) {
              yield* Effect.tryPromise({
                try: () => result,
                catch: () => new Error('Hook handler failed')
              })
            }
            
            // Unsubscribe after first execution
            if (unsubscribe) {
              yield* unsubscribe()
            }
          })
        }
        
        unsubscribe = yield* eventBus.subscribe(channel, effectHandler)
        return { unsubscribe }
      })
    },
    
    filter: (predicate) => {
      return {
        subscribe: (handler) => {
          return hook.subscribe((event) => {
            if (predicate(event)) {
              return handler(event)
            }
            return Effect.void
          })
        },
        
        once: (handler) => {
          return hook.once((event) => {
            if (predicate(event)) {
              return handler(event)
            }
            return Effect.void
          })
        },
        
        filter: (nextPredicate) => {
          return hook.filter((event) => predicate(event) && nextPredicate(event))
        }
      }
    }
  }
  
  return hook
}

/**
 * Main hooks interface for the CLI framework
 */
export interface Hooks {
  // Lifecycle hooks
  onBeforeInit: Hook<BeforeInitEvent>
  onAfterInit: Hook<AfterInitEvent>
  
  // Command hooks  
  onBeforeCommand: Hook<BeforeCommandEvent>
  onAfterCommand: Hook<AfterCommandEvent>
  
  // Error handling
  onError: Hook<OnErrorEvent>
  
  // Plugin hooks
  onPluginLoad: Hook<PluginLoadEvent>
  onPluginUnload: Hook<PluginUnloadEvent>
  
  // Parsing hooks
  onBeforeParse: Hook<BeforeParseEvent>
  onAfterParse: Hook<AfterParseEvent>
  
  // Validation hooks
  onBeforeValidate: Hook<BeforeValidateEvent>
  onAfterValidate: Hook<AfterValidateEvent>
  
  // Execution hooks
  onBeforeExecute: Hook<BeforeExecuteEvent>
  onAfterExecute: Hook<AfterExecuteEvent>
  
  // Rendering hooks
  onBeforeRender: Hook<BeforeRenderEvent>
  onAfterRender: Hook<AfterRenderEvent>
  
  // Custom hooks via event system
  on: <T extends BaseEvent>(channel: string) => Hook<T>
  
  // Emit events (for triggering hooks)
  emit: <T extends HookEvent>(event: T) => Effect<void, never>
}

/**
 * Create the hooks system
 */
export function createHooks(eventBus: EventBus, source = 'cli'): Hooks {
  return {
    // Lifecycle hooks
    onBeforeInit: createHook<BeforeInitEvent>(eventBus, 'hook:beforeInit', source),
    onAfterInit: createHook<AfterInitEvent>(eventBus, 'hook:afterInit', source),
    
    // Command hooks
    onBeforeCommand: createHook<BeforeCommandEvent>(eventBus, 'hook:beforeCommand', source),
    onAfterCommand: createHook<AfterCommandEvent>(eventBus, 'hook:afterCommand', source),
    
    // Error handling
    onError: createHook<OnErrorEvent>(eventBus, 'hook:onError', source),
    
    // Plugin hooks
    onPluginLoad: createHook<PluginLoadEvent>(eventBus, 'hook:pluginLoad', source),
    onPluginUnload: createHook<PluginUnloadEvent>(eventBus, 'hook:pluginUnload', source),
    
    // Parsing hooks
    onBeforeParse: createHook<BeforeParseEvent>(eventBus, 'hook:beforeParse', source),
    onAfterParse: createHook<AfterParseEvent>(eventBus, 'hook:afterParse', source),
    
    // Validation hooks
    onBeforeValidate: createHook<BeforeValidateEvent>(eventBus, 'hook:beforeValidate', source),
    onAfterValidate: createHook<AfterValidateEvent>(eventBus, 'hook:afterValidate', source),
    
    // Execution hooks
    onBeforeExecute: createHook<BeforeExecuteEvent>(eventBus, 'hook:beforeExecute', source),
    onAfterExecute: createHook<AfterExecuteEvent>(eventBus, 'hook:afterExecute', source),
    
    // Rendering hooks
    onBeforeRender: createHook<BeforeRenderEvent>(eventBus, 'hook:beforeRender', source),
    onAfterRender: createHook<AfterRenderEvent>(eventBus, 'hook:afterRender', source),
    
    // Custom hooks
    on: <T extends BaseEvent>(channel: string) => createHook<T>(eventBus, channel, source),
    
    // Emit events
    emit: <T extends HookEvent>(event: T) => {
      return eventBus.emit(event.type, event)
    }
  }
}

/**
 * Helper to create hook events with proper metadata
 */
export function createHookEvent<T extends HookEvent>(
  type: T['type'],
  data: Omit<T, 'type' | 'timestamp' | 'source' | 'id'>,
  source = 'cli'
): T {
  return {
    ...data,
    type,
    timestamp: new Date(),
    source,
    id: generateId()
  } as T
}

/**
 * Global hooks instance (singleton)
 */
let globalHooks: Hooks | null = null

/**
 * Get or create the global hooks instance
 */
export function getGlobalHooks(eventBus?: EventBus): Hooks {
  if (!globalHooks) {
    if (!eventBus) {
      throw new Error('Global hooks not initialized. Please provide an EventBus on first call.')
    }
    globalHooks = createHooks(eventBus)
  }
  return globalHooks
}

