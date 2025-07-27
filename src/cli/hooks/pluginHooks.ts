/**
 * Plugin Hooks
 * 
 * Hooks for plugin lifecycle and management
 */

import { Effect } from "effect"
import type { EventBus } from "@core/model/events/eventBus"
import { generateId } from "@core/model/events/eventBus"
import type {
  PluginLoadEvent,
  PluginUnloadEvent,
  BeforeParseEvent,
  AfterParseEvent,
  BeforeValidateEvent,
  AfterValidateEvent,
  OnErrorEvent
} from "./types"
import { createHook } from "./utils"

/**
 * Create plugin hooks
 */
export function createPluginHooks(eventBus: EventBus, source: string) {
  return {
    onPluginLoad: createHook<PluginLoadEvent>(eventBus, 'hook:pluginLoad'),
    onPluginUnload: createHook<PluginUnloadEvent>(eventBus, 'hook:pluginUnload'),
    beforeParse: createHook<BeforeParseEvent>(eventBus, 'hook:beforeParse'),
    afterParse: createHook<AfterParseEvent>(eventBus, 'hook:afterParse'),
    beforeValidate: createHook<BeforeValidateEvent>(eventBus, 'hook:beforeValidate'),
    afterValidate: createHook<AfterValidateEvent>(eventBus, 'hook:afterValidate'),
    onError: createHook<OnErrorEvent>(eventBus, 'hook:onError')
  }
}

/**
 * Emit plugin events
 */
export const PluginEvents = {
  emitPluginLoad(
    eventBus: EventBus,
    pluginName: string,
    pluginVersion: string,
    source: string
  ) {
    return eventBus.emit('hook:pluginLoad', {
      id: generateId(),
      type: 'hook:pluginLoad',
      source,
      timestamp: new Date(),
      pluginName,
      pluginVersion
    })
  },

  emitPluginUnload(
    eventBus: EventBus,
    pluginName: string,
    pluginVersion: string,
    source: string
  ) {
    return eventBus.emit('hook:pluginUnload', {
      id: generateId(),
      type: 'hook:pluginUnload',
      source,
      timestamp: new Date(),
      pluginName,
      pluginVersion
    })
  },

  emitBeforeParse(
    eventBus: EventBus,
    argv: string[],
    source: string
  ) {
    return eventBus.emit('hook:beforeParse', {
      id: generateId(),
      type: 'hook:beforeParse',
      source,
      timestamp: new Date(),
      argv
    })
  },

  emitAfterParse(
    eventBus: EventBus,
    argv: string[],
    parsed: Record<string, unknown>,
    source: string
  ) {
    return eventBus.emit('hook:afterParse', {
      id: generateId(),
      type: 'hook:afterParse',
      source,
      timestamp: new Date(),
      argv,
      parsed
    })
  },

  emitBeforeValidate(
    eventBus: EventBus,
    args: Record<string, unknown>,
    command: string[],
    source: string
  ) {
    return eventBus.emit('hook:beforeValidate', {
      id: generateId(),
      type: 'hook:beforeValidate',
      source,
      timestamp: new Date(),
      args,
      command
    })
  },

  emitAfterValidate(
    eventBus: EventBus,
    args: Record<string, unknown>,
    command: string[],
    valid: boolean,
    source: string
  ) {
    return eventBus.emit('hook:afterValidate', {
      id: generateId(),
      type: 'hook:afterValidate',
      source,
      timestamp: new Date(),
      args,
      command,
      valid
    })
  },

  emitError(
    eventBus: EventBus,
    error: Error,
    command: string[],
    args: Record<string, unknown>,
    source: string
  ) {
    return eventBus.emit('hook:onError', {
      id: generateId(),
      type: 'hook:onError',
      source,
      timestamp: new Date(),
      error,
      command,
      args
    })
  }
}