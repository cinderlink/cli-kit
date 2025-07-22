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
    return eventBus.emit({
      id: generateId(),
      type: 'hook:pluginLoad',
      source,
      timestamp: Date.now(),
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
    return eventBus.emit({
      id: generateId(),
      type: 'hook:pluginUnload',
      source,
      timestamp: Date.now(),
      pluginName,
      pluginVersion
    })
  },

  emitBeforeParse(
    eventBus: EventBus,
    argv: string[],
    source: string
  ) {
    return eventBus.emit({
      id: generateId(),
      type: 'hook:beforeParse',
      source,
      timestamp: Date.now(),
      argv
    })
  },

  emitAfterParse(
    eventBus: EventBus,
    argv: string[],
    parsed: Record<string, unknown>,
    source: string
  ) {
    return eventBus.emit({
      id: generateId(),
      type: 'hook:afterParse',
      source,
      timestamp: Date.now(),
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
    return eventBus.emit({
      id: generateId(),
      type: 'hook:beforeValidate',
      source,
      timestamp: Date.now(),
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
    return eventBus.emit({
      id: generateId(),
      type: 'hook:afterValidate',
      source,
      timestamp: Date.now(),
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
    return eventBus.emit({
      id: generateId(),
      type: 'hook:onError',
      source,
      timestamp: Date.now(),
      error,
      command,
      args
    })
  }
}