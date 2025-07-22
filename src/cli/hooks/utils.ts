/**
 * Hook Utilities
 * 
 * Helper functions for creating and managing hooks
 */

import { Effect } from "effect"
import type { EventBus, BaseEvent } from "@core/model/events/eventBus"
import { generateId } from "@core/model/events/eventBus"
import type { Hook, Subscription, HookEvent } from "./types"

/**
 * Create a hook for a specific event type
 */
export function createHook<T extends BaseEvent>(
  eventBus: EventBus,
  eventType: T['type']
): Hook<T> {
  const handlers = new Map<string, (event: T) => Effect<void, never> | void | Promise<void>>()

  return {
    tap(name: string, fn: (event: T) => Effect<void, never> | void): Effect<Subscription, never> {
      handlers.set(name, fn)
      
      return Effect.gen(function* () {
        const unsubscribe = yield* eventBus.subscribe(eventType, (event) => {
          const handler = handlers.get(name)
          if (handler) {
            const result = handler(event as T)
            if (Effect.isEffect(result)) {
              return result
            }
            return Effect.void
          }
          return Effect.void
        })

        return {
          unsubscribe: () => {
            handlers.delete(name)
            Effect.runSync(unsubscribe())
          }
        }
      })
    },

    tapAsync(name: string, fn: (event: T) => Promise<void>): Effect<Subscription, never> {
      return this.tap(name, (event) => 
        Effect.tryPromise({
          try: () => fn(event),
          catch: (error) => new Error(`Hook ${name} failed: ${error}`)
        })
      )
    },

    untap(name: string): void {
      handlers.delete(name)
    }
  }
}

/**
 * Create a hook event
 */
export function createHookEvent<T extends HookEvent>(
  type: T['type'],
  data: Omit<T, 'id' | 'type' | 'source' | 'timestamp'>,
  source: string = 'cli'
): T {
  return {
    id: generateId(),
    type,
    source,
    timestamp: new Date(),
    ...data
  } as T
}

/**
 * Type guard for hook events
 */
export function isHookEvent(event: BaseEvent): event is HookEvent {
  return event.type.startsWith('hook:')
}

/**
 * Get hook event category
 */
export function getHookCategory(event: HookEvent): 'lifecycle' | 'plugin' | 'error' {
  switch (event.type) {
    case 'hook:beforeInit':
    case 'hook:afterInit':
    case 'hook:beforeCommand':
    case 'hook:afterCommand':
    case 'hook:beforeExecute':
    case 'hook:afterExecute':
    case 'hook:beforeRender':
    case 'hook:afterRender':
      return 'lifecycle'
    
    case 'hook:pluginLoad':
    case 'hook:pluginUnload':
    case 'hook:beforeParse':
    case 'hook:afterParse':
    case 'hook:beforeValidate':
    case 'hook:afterValidate':
      return 'plugin'
    
    case 'hook:onError':
      return 'error'
  }
}