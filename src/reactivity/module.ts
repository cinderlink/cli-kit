/**
 * Reactivity Module - Domain module for reactive state management
 * 
 * Manages Svelte 5 runes, reactive state, and effect coordination.
 */

import { Effect } from 'effect'
import { ModuleBase, ModuleError } from '../core/module-base'
import type { EventBus, BaseEvent } from '../core/event-bus'
import type { RuneEvent, StateEvent, EffectEvent, RuneHandle } from './events'
import { ReactivityEventChannels } from './events'
import { JSXEventChannels } from '../jsx/events'

/**
 * Rune creation error
 */
export class RuneError {
  readonly _tag = 'RuneError'
  constructor(
    readonly message: string,
    readonly runeName?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Rune implementation
 */
class RuneHandleImpl<T> implements RuneHandle<T> {
  private _value: T
  private subscribers = new Set<(value: T) => void>()
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    initialValue: T,
    private emitter: (event: RuneEvent) => Effect<void, never>
  ) {
    this._value = initialValue
  }
  
  get value(): T {
    return this._value
  }
  
  set value(newValue: T) {
    const previousValue = this._value
    this._value = newValue
    
    // Notify subscribers
    this.subscribers.forEach(callback => callback(newValue))
    
    // Emit update event
    Effect.runSync(this.emitter({
      type: 'rune-updated',
      timestamp: new Date(),
      source: 'reactivity',
      runeId: this.id,
      runeName: this.name,
      value: newValue,
      previousValue
    }))
  }
  
  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }
  
  destroy(): void {
    this.subscribers.clear()
    Effect.runSync(this.emitter({
      type: 'rune-destroyed',
      timestamp: new Date(),
      source: 'reactivity',
      runeId: this.id,
      runeName: this.name
    }))
  }
}

/**
 * Reactivity Module implementation
 */
export class ReactivityModule extends ModuleBase {
  private runes = new Map<string, RuneHandleImpl<any>>()
  private effects = new Map<string, Fiber.RuntimeFiber<any, any>>()
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'reactivity')
  }
  
  /**
   * Initialize the reactivity module
   */
  initialize(): Effect<void, ModuleError> {
    return Effect.gen(function* () {
      this.state = 'initializing'
      
      // Subscribe to relevant events
      yield* this.subscribeToEvents()
      
      // Mark as ready
      yield* this.setReady()
    }.bind(this))
  }
  
  /**
   * Subscribe to events from other modules
   */
  private subscribeToEvents(): Effect<void, never> {
    return this.subscribeMany([
      {
        channel: JSXEventChannels.LIFECYCLE,
        handler: (event) => this.handleJSXLifecycle(event)
      },
      {
        channel: 'cli-command',
        handler: (event) => this.handleCLICommand(event)
      }
    ])
  }
  
  /**
   * Handle JSX lifecycle events
   */
  private handleJSXLifecycle(event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      if (event.type === 'jsx-mount' && 'componentId' in event) {
        // Initialize reactive state for component
        yield* this.initializeComponentState((event as any).componentId)
      } else if (event.type === 'jsx-unmount' && 'componentId' in event) {
        // Clean up reactive subscriptions
        yield* this.cleanupComponentState((event as any).componentId)
      }
    }.bind(this))
  }
  
  /**
   * Handle CLI command events
   */
  private handleCLICommand(event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      // Potentially update reactive state based on commands
    })
  }
  
  /**
   * Initialize component reactive state
   */
  private initializeComponentState(componentId: string): Effect<void, never> {
    return this.emitEvent<LifecycleEvent>(ReactivityEventChannels.LIFECYCLE, {
      type: 'lifecycle-mount',
      componentId
    })
  }
  
  /**
   * Cleanup component reactive state
   */
  private cleanupComponentState(componentId: string): Effect<void, never> {
    return Effect.gen(function* () {
      // Clean up any runes associated with this component
      const componentRunes = Array.from(this.runes.entries())
        .filter(([id]) => id.startsWith(componentId))
      
      for (const [id, rune] of componentRunes) {
        rune.destroy()
        this.runes.delete(id)
      }
      
      yield* this.emitEvent<LifecycleEvent>(ReactivityEventChannels.LIFECYCLE, {
        type: 'lifecycle-unmount',
        componentId
      })
    }.bind(this))
  }
  
  /**
   * Create a new rune
   */
  createRune<T>(name: string, initialValue: T): Effect<RuneHandle<T>, RuneError> {
    return Effect.gen(function* () {
      const runeId = this.generateId()
      
      const rune = new RuneHandleImpl<T>(
        runeId,
        name,
        initialValue,
        (event) => this.eventBus.publish(ReactivityEventChannels.RUNE, event)
      )
      
      this.runes.set(runeId, rune)
      
      yield* this.emitRuneCreated(runeId, name, initialValue)
      
      return rune
    }.bind(this))
  }
  
  /**
   * Get a rune by ID
   */
  getRune<T>(runeId: string): RuneHandle<T> | undefined {
    return this.runes.get(runeId) as RuneHandle<T> | undefined
  }
  
  /**
   * Create a reactive effect
   */
  createEffect(
    effectId: string,
    effect: () => Effect<void, never>,
    dependencies?: unknown[]
  ): Effect<void, never> {
    return Effect.gen(function* () {
      // Cancel existing effect if any
      const existing = this.effects.get(effectId)
      if (existing) {
        yield* Fiber.interrupt(existing)
      }
      
      // Schedule new effect
      yield* this.emitEffectScheduled(effectId, dependencies)
      
      // Run effect
      const fiber = yield* Effect.fork(
        effect().pipe(
          Effect.tap(() => this.emitEffectExecuted(effectId, dependencies)),
          Effect.catchAll((error) => this.emitEffectError(effectId, error as Error, dependencies))
        )
      )
      
      this.effects.set(effectId, fiber)
    }.bind(this))
  }
  
  /**
   * Clean up an effect
   */
  cleanupEffect(effectId: string): Effect<void, never> {
    return Effect.gen(function* () {
      const fiber = this.effects.get(effectId)
      if (fiber) {
        yield* Fiber.interrupt(fiber)
        this.effects.delete(effectId)
        yield* this.emitEffectCleanup(effectId)
      }
    }.bind(this))
  }
  
  /**
   * Create state change event
   */
  emitStateChange(stateId: string, value: unknown, source: 'user' | 'effect' | 'prop' | 'sync'): Effect<void, never> {
    return this.emitEvent<StateEvent>(ReactivityEventChannels.STATE, {
      type: 'state-change',
      stateId,
      value,
      source
    })
  }
  
  // Event emission helpers
  
  private emitRuneCreated(runeId: string, runeName: string, value: unknown): Effect<void, never> {
    return this.emitEvent<RuneEvent>(ReactivityEventChannels.RUNE, {
      type: 'rune-created',
      runeId,
      runeName,
      value
    })
  }
  
  private emitEffectScheduled(effectId: string, dependencies?: unknown[]): Effect<void, never> {
    return this.emitEvent<EffectEvent>(ReactivityEventChannels.EFFECT, {
      type: 'effect-scheduled',
      effectId,
      dependencies
    })
  }
  
  private emitEffectExecuted(effectId: string, dependencies?: unknown[]): Effect<void, never> {
    return this.emitEvent<EffectEvent>(ReactivityEventChannels.EFFECT, {
      type: 'effect-executed',
      effectId,
      dependencies
    })
  }
  
  private emitEffectError(effectId: string, error: Error, dependencies?: unknown[]): Effect<void, never> {
    return this.emitEvent<EffectEvent>(ReactivityEventChannels.EFFECT, {
      type: 'effect-executed',
      effectId,
      dependencies,
      error
    })
  }
  
  private emitEffectCleanup(effectId: string): Effect<void, never> {
    return this.emitEvent<EffectEvent>(ReactivityEventChannels.EFFECT, {
      type: 'effect-cleanup',
      effectId
    })
  }
  
  /**
   * Cleanup on shutdown
   */
  protected onShutdown(): Effect<void, never> {
    return Effect.gen(function* () {
      // Destroy all runes
      for (const rune of this.runes.values()) {
        rune.destroy()
      }
      this.runes.clear()
      
      // Interrupt all effects
      yield* Effect.all(
        Array.from(this.effects.values()).map(fiber => Fiber.interrupt(fiber))
      )
      this.effects.clear()
    }.bind(this))
  }
}

import { Fiber } from 'effect'
import type { LifecycleEvent } from './events'