/**
 * Config Domain Event System
 *
 * Defines events for configuration loading, validation, and updates.
 * Enables reactive configuration management across the application.
 */

import type { BaseEvent } from '@core/model/events/event-bus'

/**
 * Configuration events
 */
export interface ConfigEvent extends BaseEvent {
  readonly type: 'config-loaded' | 'config-changed' | 'config-reloaded'
  readonly configPath?: string
  readonly section?: string
  readonly value?: unknown
  readonly previousValue?: unknown
  readonly error?: Error
}

/**
 * Configuration validation events
 */
export interface ConfigValidationEvent extends BaseEvent {
  readonly type: 'config-validation-passed' | 'config-validation-failed'
  readonly schema: string
  readonly errors?: ValidationError[]
}

/**
 * Validation error details
 */
export interface ValidationError {
  readonly path: string
  readonly message: string
  readonly value?: unknown
  readonly rule?: string
}

/**
 * Configuration schema events
 */
export interface ConfigSchemaEvent extends BaseEvent {
  readonly type: 'schema-registered' | 'schema-updated' | 'schema-removed'
  readonly schemaName: string
  readonly schema?: unknown
}

/**
 * All config event types
 */
export type ConfigDomainEvent = ConfigEvent | ConfigValidationEvent | ConfigSchemaEvent

/**
 * Config event channel names
 */
export const ConfigEventChannels = {
  CONFIG: 'config-events',
  VALIDATION: 'config-validation',
  SCHEMA: 'config-schema',
} as const

export type ConfigEventChannel = (typeof ConfigEventChannels)[keyof typeof ConfigEventChannels]
