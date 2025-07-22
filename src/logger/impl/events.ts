/**
 * Logger Event System
 * 
 * Defines events for logging operations, transport management,
 * and log aggregation across the application.
 */

import type { BaseEvent } from '../core/model/events/event-bus'

/**
 * Log entry events
 */
export interface LogEvent extends BaseEvent {
  readonly type: 'log-entry' | 'log-level-changed' | 'log-transport-added'
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly message: string
  readonly context?: Record<string, unknown>
  readonly transport?: string
}

/**
 * Log transport events
 */
export interface LogTransportEvent extends BaseEvent {
  readonly type: 'transport-connected' | 'transport-disconnected' | 'transport-error'
  readonly transportName: string
  readonly transportType: 'console' | 'file' | 'network'
  readonly error?: Error
}

/**
 * Log filter events
 */
export interface LogFilterEvent extends BaseEvent {
  readonly type: 'filter-applied' | 'filter-removed' | 'filter-updated'
  readonly filterName: string
  readonly criteria?: LogFilterCriteria
}

/**
 * Log filter criteria
 */
export interface LogFilterCriteria {
  readonly level?: 'debug' | 'info' | 'warn' | 'error'
  readonly module?: string
  readonly pattern?: string
  readonly exclude?: boolean
}

/**
 * Log rotation events
 */
export interface LogRotationEvent extends BaseEvent {
  readonly type: 'log-rotated' | 'log-archived' | 'rotation-error'
  readonly fileName: string
  readonly newFileName?: string
  readonly size?: number
  readonly error?: Error
}

/**
 * All logger event types
 */
export type LoggerEvent = 
  | LogEvent
  | LogTransportEvent
  | LogFilterEvent
  | LogRotationEvent

/**
 * Logger event channel names
 */
export const LoggerEventChannels = {
  LOG: 'log-events',
  TRANSPORT: 'log-transport',
  FILTER: 'log-filter',
  ROTATION: 'log-rotation'
} as const

export type LoggerEventChannel = typeof LoggerEventChannels[keyof typeof LoggerEventChannels]