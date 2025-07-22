/**
 * Service Layer Event System
 * 
 * Defines events for service-level operations including terminal, input,
 * renderer, and storage services. These events enable coordination between
 * low-level services and higher-level modules.
 */

import type { BaseEvent } from '../../model/events/event-bus'

/**
 * Service lifecycle events
 */
export interface ServiceEvent extends BaseEvent {
  readonly type: 'service-started' | 'service-stopped' | 'service-error' | 'service-ready'
  readonly serviceName: string
  readonly serviceType: 'terminal' | 'input' | 'renderer' | 'storage'
  readonly status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  readonly error?: Error
}

/**
 * Terminal service events
 */
export interface TerminalEvent extends BaseEvent {
  readonly type: 'terminal-resize' | 'terminal-output' | 'terminal-input'
  readonly dimensions?: { width: number; height: number }
  readonly data?: string
  readonly source?: 'user' | 'application'
}

/**
 * Input service events
 */
export interface InputEvent extends BaseEvent {
  readonly type: 'key-press' | 'mouse-click' | 'mouse-move'
  readonly key?: string
  readonly mousePosition?: { x: number; y: number }
  readonly modifiers?: string[]
}

/**
 * Renderer service events
 */
export interface RenderEvent extends BaseEvent {
  readonly type: 'render-requested' | 'render-completed' | 'render-failed'
  readonly component?: string
  readonly renderTime?: number
  readonly error?: Error
}

/**
 * Storage service events
 */
export interface StorageEvent extends BaseEvent {
  readonly type: 'storage-read' | 'storage-write' | 'storage-delete' | 'storage-error'
  readonly key: string
  readonly value?: unknown
  readonly error?: Error
}

/**
 * All service event types
 */
export type ServiceLayerEvent = 
  | ServiceEvent
  | TerminalEvent
  | InputEvent
  | RenderEvent
  | StorageEvent

/**
 * Service event channel names
 */
export const ServiceEventChannels = {
  SERVICE: 'service-events',
  TERMINAL: 'terminal-events',
  INPUT: 'input-events',
  RENDER: 'render-events',
  STORAGE: 'storage-events'
} as const

export type ServiceEventChannel = typeof ServiceEventChannels[keyof typeof ServiceEventChannels]