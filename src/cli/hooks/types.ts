/**
 * Hook Event Types
 * 
 * Type definitions for all hook events in the CLI framework
 */

import type { Effect } from "effect"
import type { BaseEvent } from "@core/model/events/eventBus"

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
 * Union type of all hook events
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
 * Hook subscription
 */
export interface Subscription {
  unsubscribe(): void
}

/**
 * Hook interface
 */
export interface Hook<T extends BaseEvent> {
  tap(name: string, fn: (event: T) => Effect<void, never> | void): Effect<Subscription, never>
  tapAsync(name: string, fn: (event: T) => Promise<void>): Effect<Subscription, never>
  untap(name: string): void
}