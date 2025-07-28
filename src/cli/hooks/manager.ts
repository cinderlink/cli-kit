/**
 * Hook Manager
 *
 * Central manager for all CLI hooks
 */

import { Effect } from 'effect'
import type { EventBus } from '@core/model/events/eventBus'
import { getGlobalEventBus } from '@core/model/events/eventBus'
import { createLifecycleHooks } from './lifecycle'
import { createPluginHooks } from './pluginHooks'
import type { HookEvent } from './types'

/**
 * Hook manager interface
 */
export interface Hooks {
  // Lifecycle hooks
  beforeInit: ReturnType<typeof createLifecycleHooks>['beforeInit']
  afterInit: ReturnType<typeof createLifecycleHooks>['afterInit']
  beforeCommand: ReturnType<typeof createLifecycleHooks>['beforeCommand']
  afterCommand: ReturnType<typeof createLifecycleHooks>['afterCommand']
  beforeExecute: ReturnType<typeof createLifecycleHooks>['beforeExecute']
  afterExecute: ReturnType<typeof createLifecycleHooks>['afterExecute']
  beforeRender: ReturnType<typeof createLifecycleHooks>['beforeRender']
  afterRender: ReturnType<typeof createLifecycleHooks>['afterRender']

  // Plugin hooks
  onPluginLoad: ReturnType<typeof createPluginHooks>['onPluginLoad']
  onPluginUnload: ReturnType<typeof createPluginHooks>['onPluginUnload']
  beforeParse: ReturnType<typeof createPluginHooks>['beforeParse']
  afterParse: ReturnType<typeof createPluginHooks>['afterParse']
  beforeValidate: ReturnType<typeof createPluginHooks>['beforeValidate']
  afterValidate: ReturnType<typeof createPluginHooks>['afterValidate']
  onError: ReturnType<typeof createPluginHooks>['onError']

  // Event emitters
  emit: <T extends HookEvent>(
    event: Omit<T, 'id' | 'source' | 'timestamp'> & { type: T['type'] }
  ) => Effect.Effect<void, never>
  emitSync: <T extends HookEvent>(
    event: Omit<T, 'id' | 'source' | 'timestamp'> & { type: T['type'] }
  ) => void
}

/**
 * Create a hook manager
 */
export function createHooks(eventBus: EventBus, source = 'cli'): Hooks {
  const lifecycleHooks = createLifecycleHooks(eventBus, source)
  const pluginHooks = createPluginHooks(eventBus, source)

  return {
    // Spread lifecycle hooks
    ...lifecycleHooks,

    // Spread plugin hooks
    ...pluginHooks,

    // Event emitters
    emit: <T extends HookEvent>(
      event: Omit<T, 'id' | 'source' | 'timestamp'> & { type: T['type'] }
    ) => {
      const fullEvent = {
        ...event,
        id: Date.now().toString(),
        source,
        timestamp: new Date(),
      } as T
      return eventBus.emit(event.type, fullEvent)
    },

    emitSync: <T extends HookEvent>(
      event: Omit<T, 'id' | 'source' | 'timestamp'> & { type: T['type'] }
    ) => {
      const fullEvent = {
        ...event,
        id: Date.now().toString(),
        source,
        timestamp: new Date(),
      } as T
      Effect.runSync(eventBus.emit(event.type, fullEvent))
    },
  }
}

/**
 * Global hook instance
 */
let globalHooks: Hooks | null = null

/**
 * Get the global hook manager
 */
export function getGlobalHooks(eventBus?: EventBus): Hooks {
  if (!globalHooks) {
    globalHooks = createHooks(eventBus || getGlobalEventBus())
  }
  return globalHooks
}

/**
 * Reset global hooks (for testing)
 */
export function resetGlobalHooks(): void {
  globalHooks = null
}
