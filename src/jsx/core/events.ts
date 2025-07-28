/**
 * JSX Domain Event System
 *
 * Defines events specific to the JSX rendering and lifecycle domain.
 * These events enable communication between JSX components and other
 * system modules without direct coupling.
 */

import type { ScopeContext } from '@jsx/scope'

/**
 * Base event interface for all JSX events
 */
export interface BaseJSXEvent {
  readonly timestamp: Date
  readonly source: 'jsx'
}

/**
 * JSX render lifecycle events
 */
export interface JSXRenderEvent extends BaseJSXEvent {
  readonly type: 'jsx-render-start' | 'jsx-render-end' | 'jsx-render-error'
  readonly component: JSX.Element
  readonly scope?: ScopeContext
  readonly renderTime?: number
  readonly error?: Error
}

/**
 * JSX component lifecycle events
 */
export interface JSXLifecycleEvent extends BaseJSXEvent {
  readonly type: 'jsx-mount' | 'jsx-unmount' | 'jsx-update'
  readonly componentId: string
  readonly componentType: string
  readonly scope: ScopeContext
}

/**
 * JSX scope registration events
 */
export interface JSXScopeEvent extends BaseJSXEvent {
  readonly type: 'jsx-scope-created' | 'jsx-scope-destroyed'
  readonly scope: ScopeContext
  readonly parentScope?: ScopeContext
}

/**
 * JSX plugin events
 */
export interface JSXPluginEvent extends BaseJSXEvent {
  readonly type: 'jsx-plugin-start' | 'jsx-plugin-end' | 'jsx-plugin-error'
  readonly pluginName: string
  readonly scope: ScopeContext
  readonly error?: Error
}

/**
 * JSX command registration events
 */
export interface JSXCommandEvent extends BaseJSXEvent {
  readonly type: 'jsx-command-registered' | 'jsx-command-unregistered'
  readonly commandPath: string[]
  readonly scope: ScopeContext
}

/**
 * All JSX event types
 */
export type JSXEvent =
  | JSXRenderEvent
  | JSXLifecycleEvent
  | JSXScopeEvent
  | JSXPluginEvent
  | JSXCommandEvent

/**
 * JSX event channel names - re-exported from core
 */
export { JSXEventChannels } from '@core/model/events/channels'
export type JSXEventChannel = (typeof JSXEventChannels)[keyof typeof JSXEventChannels]
