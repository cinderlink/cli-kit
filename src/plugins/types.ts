/**
 * Plugins Module Type Definitions
 *
 * Centralized type definitions for the plugin system, providing interfaces
 * for plugin creation, lifecycle management, and inter-plugin communication.
 */

import { Effect } from 'effect'

/**
 * Plugin lifecycle states
 */
export enum PluginLifecycleState {
  REGISTERED = 'registered',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  TEARING_DOWN = 'tearing_down',
  TORN_DOWN = 'torn_down',
  FAILED = 'failed',
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Unique identifier for the plugin */
  id: string
  /** Human-readable name */
  name: string
  /** Semantic version */
  version: string
  /** Plugin description */
  description?: string
  /** Author information */
  author?: string
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[]
  /** Plugin configuration options */
  config?: Record<string, unknown>
  /** Whether plugin is enabled by default */
  enabled?: boolean
}

/**
 * Plugin instance interface
 */
export interface Plugin extends PluginConfig {
  /** Initialize the plugin */
  initialize(): Effect.Effect<void, PluginError>
  /** Teardown the plugin */
  teardown(): Effect.Effect<void, PluginError>
  /** Plugin-specific API methods */
  api?: Record<string, (...args: any[]) => Effect.Effect<unknown, PluginError>>
  /** Event handlers */
  handlers?: Record<string, (event: PluginEvent) => Effect.Effect<void, PluginError>>
}

/**
 * Plugin factory function type
 */
export type PluginFactory = (config: PluginConfig) => Effect.Effect<Plugin, PluginError>

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /** Register a plugin */
  register(plugin: Plugin): Effect.Effect<void, PluginError>
  /** Unregister a plugin */
  unregister(id: string): Effect.Effect<void, PluginError>
  /** Get a registered plugin */
  get(id: string): Plugin | undefined
  /** List all registered plugins */
  list(): Plugin[]
  /** Check if a plugin is registered */
  has(id: string): boolean
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /** Initialize a plugin */
  initialize(id: string): Effect.Effect<void, PluginError>
  /** Teardown a plugin */
  teardown(id: string): Effect.Effect<void, PluginError>
  /** Initialize all plugins */
  initializeAll(): Effect.Effect<void, PluginError>
  /** Teardown all plugins */
  teardownAll(): Effect.Effect<void, PluginError>
  /** Get plugin state */
  getState(id: string): Effect.Effect<PluginLifecycleState, PluginError>
  /** Get plugin metrics */
  getMetrics(id: string): Effect.Effect<PluginMetrics, PluginError>
}

/**
 * Plugin event interface
 */
export interface PluginEvent {
  /** Event type */
  type: string
  /** Source plugin ID */
  source: string
  /** Target plugin ID (optional) */
  target?: string
  /** Event payload */
  payload: Record<string, unknown>
  /** Event timestamp */
  timestamp: number
}

/**
 * Plugin metrics interface
 */
export interface PluginMetrics {
  /** Plugin ID */
  id: string
  /** Initialization time */
  initializationTime: number
  /** Memory usage in bytes */
  memoryUsage: number
  /** Number of events handled */
  eventsHandled: number
  /** Number of API calls */
  apiCalls: number
  /** Last activity timestamp */
  lastActivity: number
  /** Current state */
  state: PluginLifecycleState
}

/**
 * Plugin hook types for lifecycle events
 */
export type PluginHook<T = void> = (plugin: Plugin) => Effect.Effect<T, PluginError>

/**
 * Plugin hooks interface
 */
export interface PluginHooks {
  /** Called before plugin initialization */
  beforeInit?: PluginHook
  /** Called after plugin initialization */
  afterInit?: PluginHook
  /** Called before plugin teardown */
  beforeTeardown?: PluginHook
  /** Called after plugin teardown */
  afterTeardown?: PluginHook
  /** Called on plugin error */
  onError?: (plugin: Plugin, error: PluginError) => Effect.Effect<void, PluginError>
}

/**
 * Plugin communication interface
 */
export interface PluginCommunication {
  /** Send event to another plugin */
  sendEvent(
    targetId: string,
    event: Omit<PluginEvent, 'source' | 'timestamp'>
  ): Effect.Effect<void, PluginError>
  /** Broadcast event to all plugins */
  broadcastEvent(event: Omit<PluginEvent, 'source' | 'timestamp'>): Effect.Effect<void, PluginError>
  /** Subscribe to events */
  subscribe(
    eventType: string,
    handler: (event: PluginEvent) => Effect.Effect<void, PluginError>
  ): Effect.Effect<void, PluginError>
  /** Unsubscribe from events */
  unsubscribe(eventType: string): Effect.Effect<void, PluginError>
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  /** Load plugin from file path */
  loadFromFile(path: string): Effect.Effect<Plugin, PluginError>
  /** Load plugin from module */
  loadFromModule(moduleName: string): Effect.Effect<Plugin, PluginError>
  /** Load plugin from configuration */
  loadFromConfig(config: PluginConfig): Effect.Effect<Plugin, PluginError>
}

/**
 * Plugin error base class
 */
export class PluginError {
  readonly _tag = 'PluginError'

  constructor(
    public readonly message: string,
    public readonly pluginId?: string,
    public readonly cause?: unknown
  ) {}
}
