/**
 * Lifecycle Hooks
 * 
 * Hooks for CLI application lifecycle events
 */

import { Effect } from "effect"
import type { EventBus } from "@core/model/events/eventBus"
import { generateId } from "@core/model/events/eventBus"
import type {
  BeforeInitEvent,
  AfterInitEvent,
  BeforeCommandEvent,
  AfterCommandEvent,
  BeforeExecuteEvent,
  AfterExecuteEvent,
  BeforeRenderEvent,
  AfterRenderEvent,
  Hook
} from "./types"
import { createHook } from "./utils"

/**
 * Create lifecycle hooks
 */
export function createLifecycleHooks(eventBus: EventBus, source: string) {
  return {
    beforeInit: createHook<BeforeInitEvent>(eventBus, 'hook:beforeInit'),
    afterInit: createHook<AfterInitEvent>(eventBus, 'hook:afterInit'),
    beforeCommand: createHook<BeforeCommandEvent>(eventBus, 'hook:beforeCommand'),
    afterCommand: createHook<AfterCommandEvent>(eventBus, 'hook:afterCommand'),
    beforeExecute: createHook<BeforeExecuteEvent>(eventBus, 'hook:beforeExecute'),
    afterExecute: createHook<AfterExecuteEvent>(eventBus, 'hook:afterExecute'),
    beforeRender: createHook<BeforeRenderEvent>(eventBus, 'hook:beforeRender'),
    afterRender: createHook<AfterRenderEvent>(eventBus, 'hook:afterRender')
  }
}

/**
 * Emit lifecycle events
 */
export const LifecycleEvents = {
  emitBeforeInit(eventBus: EventBus, config: Record<string, unknown>, source: string) {
    return eventBus.emit('hook:beforeInit', {
      id: generateId(),
      type: 'hook:beforeInit' as const,
      source,
      timestamp: new Date(),
      config
    })
  },

  emitAfterInit(eventBus: EventBus, config: Record<string, unknown>, source: string) {
    return eventBus.emit('hook:afterInit', {
      id: generateId(),
      type: 'hook:afterInit' as const,
      source,
      timestamp: new Date(),
      config
    })
  },

  emitBeforeCommand(
    eventBus: EventBus,
    command: string[],
    args: Record<string, unknown>,
    source: string
  ) {
    return eventBus.emit('hook:beforeCommand', {
      id: generateId(),
      type: 'hook:beforeCommand' as const,
      source,
      timestamp: new Date(),
      command,
      args
    })
  },

  emitAfterCommand(
    eventBus: EventBus,
    command: string[],
    args: Record<string, unknown>,
    result: unknown,
    source: string
  ) {
    return eventBus.emit('hook:afterCommand', {
      id: generateId(),
      type: 'hook:afterCommand' as const,
      source,
      timestamp: new Date(),
      command,
      args,
      result
    })
  },

  emitBeforeExecute(
    eventBus: EventBus,
    command: string[],
    args: Record<string, unknown>,
    source: string
  ) {
    return eventBus.emit('hook:beforeExecute', {
      id: generateId(),
      type: 'hook:beforeExecute' as const,
      source,
      timestamp: new Date(),
      command,
      args
    })
  },

  emitAfterExecute(
    eventBus: EventBus,
    command: string[],
    args: Record<string, unknown>,
    result: unknown,
    source: string
  ) {
    return eventBus.emit('hook:afterExecute', {
      id: generateId(),
      type: 'hook:afterExecute' as const,
      source,
      timestamp: new Date(),
      command,
      args,
      result
    })
  },

  emitBeforeRender(
    eventBus: EventBus,
    component: unknown,
    source: string
  ) {
    return eventBus.emit('hook:beforeRender', {
      id: generateId(),
      type: 'hook:beforeRender' as const,
      source,
      timestamp: new Date(),
      component
    })
  },

  emitAfterRender(
    eventBus: EventBus,
    component: unknown,
    output: string,
    source: string
  ) {
    return eventBus.emit('hook:afterRender', {
      id: generateId(),
      type: 'hook:afterRender' as const,
      source,
      timestamp: new Date(),
      component,
      output
    })
  }
}