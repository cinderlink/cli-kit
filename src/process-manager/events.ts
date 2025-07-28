/**
 * Process Manager Event System
 *
 * Defines events for process lifecycle, output, and health monitoring.
 * Enables reactive process management and coordination.
 */

import type { BaseEvent } from '@core/model/events/event-bus'

/**
 * Process configuration
 */
export interface ProcessConfig {
  readonly name: string
  readonly command: string
  readonly args?: string[]
  readonly env?: Record<string, string>
  readonly cwd?: string
  readonly restart?: boolean
  readonly maxRestarts?: number
}

/**
 * Process lifecycle events
 */
export interface ProcessEvent extends BaseEvent {
  readonly type: 'process-started' | 'process-stopped' | 'process-crashed' | 'process-restarted'
  readonly processId: string
  readonly processName: string
  readonly pid?: number
  readonly exitCode?: number
  readonly config: ProcessConfig
}

/**
 * Process output events
 */
export interface ProcessOutputEvent extends BaseEvent {
  readonly type: 'process-stdout' | 'process-stderr'
  readonly processId: string
  readonly data: string
  readonly timestamp: Date
}

/**
 * Process health events
 */
export interface ProcessHealthEvent extends BaseEvent {
  readonly type: 'process-health-check' | 'process-unhealthy' | 'process-recovered'
  readonly processId: string
  readonly healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  readonly metrics?: HealthMetrics
}

/**
 * Health metrics
 */
export interface HealthMetrics {
  readonly cpu?: number
  readonly memory?: number
  readonly uptime?: number
  readonly restartCount?: number
}

/**
 * Process group events
 */
export interface ProcessGroupEvent extends BaseEvent {
  readonly type: 'group-created' | 'group-started' | 'group-stopped' | 'group-updated'
  readonly groupId: string
  readonly groupName: string
  readonly processIds: string[]
}

/**
 * All process manager event types
 */
export type ProcessManagerEvent =
  | ProcessEvent
  | ProcessOutputEvent
  | ProcessHealthEvent
  | ProcessGroupEvent

/**
 * Process manager event channel names
 */
export const ProcessEventChannels = {
  LIFECYCLE: 'process-lifecycle',
  OUTPUT: 'process-output',
  HEALTH: 'process-health',
  GROUP: 'process-group',
} as const

export type ProcessEventChannel = (typeof ProcessEventChannels)[keyof typeof ProcessEventChannels]
