/**
 * Base Module Class - Foundation for domain modules
 * 
 * Provides common functionality for all domain modules including
 * event emission, subscription management, and lifecycle hooks.
 */

import { Effect } from 'effect'
import type { EventBus, BaseEvent, EventHandler } from "./model/events/event-bus"

/**
 * Module lifecycle state
 */
export type ModuleState = 'uninitialized' | 'initializing' | 'ready' | 'shutting-down' | 'shutdown'

/**
 * Module error type
 */
export class ModuleError {
  readonly _tag = 'ModuleError'
  constructor(
    readonly module: string,
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Base class for all domain modules
 */
export abstract class ModuleBase {
  protected state: ModuleState = 'uninitialized'
  protected subscriptions: Array<() => Effect<void, never>> = []
  
  constructor(
    protected readonly eventBus: EventBus,
    public readonly name: string
  ) {}
  
  /**
   * Initialize the module
   */
  abstract initialize(): Effect<void, ModuleError>
  
  /**
   * Shutdown the module
   */
  shutdown(): Effect<void, never> {
    return Effect.gen(function* () {
      this.state = 'shutting-down'
      
      // Unsubscribe from all events
      yield* Effect.all(this.subscriptions.map(unsub => unsub()))
      this.subscriptions = []
      
      // Run any custom shutdown logic
      yield* this.onShutdown()
      
      this.state = 'shutdown'
    }.bind(this))
  }
  
  /**
   * Optional shutdown hook for subclasses
   */
  protected onShutdown(): Effect<void, never> {
    return Effect.void
  }
  
  /**
   * Emit an event to a specific channel
   */
  protected emitEvent<T extends BaseEvent>(
    channel: string,
    event: Omit<T, 'timestamp' | 'source'>
  ): Effect<void, never> {
    const fullEvent = {
      ...event,
      timestamp: new Date(),
      source: this.name
    } as T
    
    return this.eventBus.publish(channel, fullEvent)
  }
  
  /**
   * Subscribe to events on a channel
   */
  protected subscribe<T extends BaseEvent>(
    channel: string,
    handler: EventHandler<T>
  ): Effect<void, never> {
    return Effect.gen(function* () {
      const unsubscribe = yield* this.eventBus.subscribe(channel, handler)
      this.subscriptions.push(unsubscribe)
    }.bind(this))
  }
  
  /**
   * Subscribe to multiple channels
   */
  protected subscribeMany(
    subscriptions: Array<{
      channel: string
      handler: EventHandler<BaseEvent>
    }>
  ): Effect<void, never> {
    return Effect.all(
      subscriptions.map(({ channel, handler }) => 
        this.subscribe(channel, handler)
      )
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Get the current module state
   */
  getState(): ModuleState {
    return this.state
  }
  
  /**
   * Check if module is ready
   */
  isReady(): boolean {
    return this.state === 'ready'
  }
  
  /**
   * Wait for module to be ready
   */
  waitForReady(maxAttempts: number = 50): Effect<void, ModuleError> {
    return Effect.gen(function* () {
      let attempts = 0
      
      while (this.state !== 'ready' && attempts < maxAttempts) {
        if (this.state === 'shutdown' || this.state === 'shutting-down') {
          yield* Effect.fail(new ModuleError(
            this.name,
            'Module is shutting down or already shutdown'
          ))
        }
        
        yield* Effect.sleep(100) // 100ms delay
        attempts++
      }
      
      if (this.state !== 'ready') {
        yield* Effect.fail(new ModuleError(
          this.name,
          `Module did not become ready within ${maxAttempts * 100}ms`
        ))
      }
    }.bind(this))
  }
  
  /**
   * Mark module as ready
   */
  protected setReady(): Effect<void, never> {
    return Effect.sync(() => {
      this.state = 'ready'
    })
  }
  
  /**
   * Generate a unique ID for this module
   */
  protected generateId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}