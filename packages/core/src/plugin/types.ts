/**
 * Plugin Types - Core plugin interface and type system
 * 
 * This module defines the complete type system for TUIX plugins, enabling
 * extensible component-based plugin architecture with hooks, signals, and
 * lifecycle management. Based on kitchen-sink demo patterns.
 * 
 * ## Key Features:
 * 
 * ### Plugin Interface
 * - Component-based plugin registration with JSX patterns
 * - Plugin lifecycle management (init, destroy, activate, deactivate)
 * - Plugin metadata and versioning system
 * - Effect.ts integration throughout
 * 
 * ### Hook System
 * - Before/after/around hook patterns
 * - Type-safe hook context and parameter passing
 * - Plugin-specific and system-wide hooks
 * - Async hook execution with Effect.ts
 * 
 * ### Signal System
 * - Type-safe inter-plugin communication
 * - Publish/subscribe patterns with schema validation
 * - Signal routing and filtering
 * - Event replay and history
 * 
 * ### Plugin Components
 * - JSX-based plugin registration: <ProcessManagerPlugin as="pm" />
 * - Plugin customization via props
 * - Plugin composition and dependencies
 * - Integration with TUIX component system
 * 
 * @example
 * ```typescript
 * // Define a plugin
 * const processPlugin: Plugin = {
 *   name: 'process-manager',
 *   version: '1.0.0',
 *   init: Effect.succeed(void 0),
 *   destroy: Effect.succeed(void 0),
 *   hooks: {
 *     'process:start': {
 *       before: Effect.succeed(void 0)
 *     }
 *   },
 *   signals: {
 *     'process:started': processStartedSignal
 *   },
 *   metadata: {
 *     description: 'Process management plugin',
 *     author: 'TUIX Team'
 *   }
 * }
 * 
 * // Use plugin component
 * <ProcessManagerPlugin 
 *   as="pm"
 *   processWrapper={({ children, process }) => (
 *     <CustomLayout>{children}</CustomLayout>
 *   )}
 * />
 * ```
 * 
 * @module core/plugin/types
 */

import { Effect, Context, Data } from "effect"
import { z } from "zod"
import type { ComponentError } from "../errors"

// JSX types
declare global {
  namespace JSX {
    interface Element {
      type: string
      props: any
      key?: string | number
    }
  }
}

// =============================================================================
// Plugin Error Types
// =============================================================================

/**
 * Plugin-specific error types
 */
export class PluginError extends Data.TaggedError("PluginError")<{
  readonly pluginName: string
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly pluginName: string
    readonly operation: string
    readonly message: string
    readonly cause?: unknown
  }) {
    super({
      timestamp: new Date(),
      ...props
    })
  }
}

export class PluginLoadError extends Data.TaggedError("PluginLoadError")<{
  readonly pluginName: string
  readonly path: string
  readonly message: string
  readonly cause?: unknown
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly pluginName: string
    readonly path: string
    readonly message: string
    readonly cause?: unknown
  }) {
    super({
      timestamp: new Date(),
      ...props
    })
  }
}

export class PluginDependencyError extends Data.TaggedError("PluginDependencyError")<{
  readonly pluginName: string
  readonly dependencies: string[]
  readonly message: string
  readonly cause?: unknown
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly pluginName: string
    readonly dependencies: string[]
    readonly message: string
    readonly cause?: unknown
  }) {
    super({
      timestamp: new Date(),
      ...props
    })
  }
}

export class HookError extends Data.TaggedError("HookError")<{
  readonly pluginName: string
  readonly hookName: string
  readonly message: string
  readonly cause?: unknown
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly pluginName: string
    readonly hookName: string
    readonly message: string
    readonly cause?: unknown
  }) {
    super({
      timestamp: new Date(),
      ...props
    })
  }
}

export class SignalError extends Data.TaggedError("SignalError")<{
  readonly pluginName?: string
  readonly signalName: string
  readonly message: string
  readonly cause?: unknown
  readonly timestamp: Date
}> {
  constructor(props: {
    readonly pluginName?: string
    readonly signalName: string
    readonly message: string
    readonly cause?: unknown
  }) {
    super({
      timestamp: new Date(),
      ...props
    })
  }
}

// =============================================================================
// Plugin Dependencies
// =============================================================================

/**
 * Plugin dependencies context
 */
export interface PluginDeps {
  readonly terminal: unknown
  readonly input: unknown
  readonly renderer: unknown
  readonly storage: unknown
  readonly config: unknown
}

/**
 * Plugin dependencies service
 */
export const PluginDepsService = Context.GenericTag<PluginDeps>("PluginDeps")

// =============================================================================
// Hook System Types
// =============================================================================

/**
 * Hook context provided to hook handlers
 */
export interface HookContext {
  readonly pluginName: string
  readonly hookName: string
  readonly args: unknown[]
  readonly result?: unknown
  readonly timestamp: Date
}

/**
 * Hook definition with before/after/around patterns
 */
export interface Hook {
  readonly before?: Effect.Effect<void, never, HookContext>
  readonly after?: Effect.Effect<void, never, HookContext>
  readonly around?: (next: Effect.Effect<void, never, never>) => Effect.Effect<void, never, HookContext>
  readonly priority?: number
}

/**
 * Hook registration information
 */
export interface HookRegistration {
  readonly pluginName: string
  readonly hookName: string
  readonly hook: Hook
  readonly priority: number
}

/**
 * Standard hook names used throughout the system
 */
export const HookNames = {
  // Component lifecycle
  COMPONENT_INIT: 'component:init',
  COMPONENT_UPDATE: 'component:update',
  COMPONENT_DESTROY: 'component:destroy',
  COMPONENT_RENDER: 'component:render',
  
  // CLI operations
  CLI_PARSE: 'cli:parse',
  CLI_EXECUTE: 'cli:execute',
  CLI_COMPLETE: 'cli:complete',
  
  // Rendering pipeline
  RENDER_BEFORE: 'render:before',
  RENDER_AFTER: 'render:after',
  RENDER_FRAME: 'render:frame',
  
  // Process management
  PROCESS_START: 'process:start',
  PROCESS_STOP: 'process:stop',
  PROCESS_RESTART: 'process:restart',
  
  // Input handling
  INPUT_KEY: 'input:key',
  INPUT_MOUSE: 'input:mouse',
  INPUT_RESIZE: 'input:resize',
  
  // Application lifecycle
  APP_INIT: 'app:init',
  APP_SHUTDOWN: 'app:shutdown',
  APP_ERROR: 'app:error',
} as const

export type HookName = typeof HookNames[keyof typeof HookNames]

// =============================================================================
// Signal System Types
// =============================================================================

/**
 * Signal subscription handle
 */
export interface Subscription {
  readonly id: string
  readonly pluginName: string
  readonly signalName: string
  readonly handler: SignalHandler<unknown>
  readonly once: boolean
  readonly timestamp: Date
}

/**
 * Signal handler function
 */
export interface SignalHandler<T> {
  (data: T): Effect.Effect<void, never, never>
}

/**
 * Signal definition with type safety
 */
export interface Signal<T = unknown> {
  readonly name: string
  readonly schema?: z.ZodSchema<T>
  readonly description?: string
}

/**
 * Signal registration information
 */
export interface SignalRegistration<T = unknown> {
  readonly pluginName: string
  readonly signal: Signal<T>
}

/**
 * Standard signal names used throughout the system
 */
export const SignalNames = {
  // Process lifecycle
  PROCESS_STARTED: 'process:started',
  PROCESS_STOPPED: 'process:stopped',
  PROCESS_ERROR: 'process:error',
  PROCESS_OUTPUT: 'process:output',
  
  // Log events
  LOG_MESSAGE: 'log:message',
  LOG_ERROR: 'log:error',
  LOG_DEBUG: 'log:debug',
  
  // User interactions
  USER_INPUT: 'user:input',
  USER_ACTION: 'user:action',
  USER_NAVIGATION: 'user:navigation',
  
  // Theme changes
  THEME_CHANGED: 'theme:changed',
  CONFIG_CHANGED: 'config:changed',
  
  // Application events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  APP_SHUTDOWN: 'app:shutdown',
  
  // Plugin events
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  PLUGIN_ERROR: 'plugin:error',
} as const

export type SignalName = typeof SignalNames[keyof typeof SignalNames]

// =============================================================================
// Plugin Metadata
// =============================================================================

/**
 * Plugin metadata for identification and discovery
 */
export interface PluginMetadata {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly author?: string
  readonly homepage?: string
  readonly repository?: string
  readonly license?: string
  readonly keywords?: readonly string[]
  readonly dependencies?: Record<string, string>
  readonly peerDependencies?: Record<string, string>
  readonly engines?: {
    readonly node?: string
    readonly bun?: string
    readonly tuix?: string
  }
  readonly category?: 'system' | 'ui' | 'service' | 'development'
  readonly tags?: readonly string[]
}

// =============================================================================
// Plugin Interface
// =============================================================================

/**
 * Core plugin interface
 * 
 * Defines the structure of a TUIX plugin with lifecycle management,
 * hooks, signals, and metadata. All plugins must implement this interface.
 */
export interface Plugin {
  readonly name: string
  readonly version: string
  readonly metadata: PluginMetadata
  
  // Lifecycle methods
  readonly init: Effect.Effect<void, PluginError, PluginDeps>
  readonly destroy: Effect.Effect<void, PluginError, never>
  readonly activate?: Effect.Effect<void, PluginError, PluginDeps>
  readonly deactivate?: Effect.Effect<void, PluginError, never>
  
  // Hook and signal definitions
  readonly hooks: Record<string, Hook>
  readonly signals: Record<string, Signal>
  
  // Plugin configuration
  readonly config?: z.ZodSchema
  readonly defaultConfig?: Record<string, unknown>
  
  // Component integration
  readonly Component?: PluginComponent
  
  // Service provision
  readonly services?: Record<string, unknown>
}

// =============================================================================
// Plugin Component Types
// =============================================================================

/**
 * Plugin component props
 * 
 * Base props for all plugin components, supporting the kitchen-sink demo
 * pattern of <ProcessManagerPlugin as="pm" />
 */
export interface PluginProps {
  readonly as?: string
  readonly [key: string]: unknown
}

/**
 * Plugin component function
 * 
 * JSX component function for plugin registration and configuration
 */
export interface PluginComponent {
  (props: PluginProps): JSX.Element
}

/**
 * Plugin provider props
 * 
 * Props for the PluginProvider component that manages plugin registration
 */
export interface PluginProviderProps {
  readonly children: JSX.Element
  readonly plugins?: Plugin[]
}

/**
 * Plugin context for accessing registered plugins
 */
export interface PluginContext {
  readonly plugins: Map<string, Plugin>
  readonly hooks: Map<string, HookRegistration[]>
  readonly signals: Map<string, SignalRegistration>
  readonly subscriptions: Map<string, Subscription[]>
}

/**
 * Plugin context service
 */
export const PluginContextService = Context.GenericTag<PluginContext>("PluginContext")

// =============================================================================
// Process Manager Plugin Types (Kitchen-Sink Demo)
// =============================================================================

/**
 * Process wrapper props for custom process rendering
 */
export interface ProcessWrapperProps {
  readonly children: JSX.Element
  readonly process: ProcessInfo
}

/**
 * Process information
 */
export interface ProcessInfo {
  readonly id: string
  readonly name: string
  readonly command: string
  readonly args: readonly string[]
  readonly status: 'running' | 'stopped' | 'error'
  readonly pid?: number
  readonly startTime?: Date
  readonly endTime?: Date
}

/**
 * Process manager plugin props
 * 
 * Props for the ProcessManagerPlugin component matching kitchen-sink demo patterns
 */
export interface ProcessManagerPluginProps extends PluginProps {
  readonly processWrapper?: (props: ProcessWrapperProps) => JSX.Element
  readonly onProcessStart?: (process: ProcessInfo) => void
  readonly onProcessStop?: (process: ProcessInfo) => void
  readonly onProcessError?: (process: ProcessInfo, error: Error) => void
  readonly maxProcesses?: number
  readonly autoRestart?: boolean
}

// =============================================================================
// Plugin Registry Types
// =============================================================================

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  readonly register: (plugin: Plugin) => Effect.Effect<void, PluginError, never>
  readonly unregister: (name: string) => Effect.Effect<void, PluginError, never>
  readonly get: (name: string) => Effect.Effect<Plugin, PluginError, never>
  readonly list: () => Effect.Effect<Plugin[], never, never>
  readonly resolve: (dependencies: string[]) => Effect.Effect<Plugin[], PluginError, never>
  readonly isRegistered: (name: string) => Effect.Effect<boolean, never, never>
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  readonly load: (path: string) => Effect.Effect<Plugin, PluginLoadError, never>
  readonly loadMany: (paths: string[]) => Effect.Effect<Plugin[], PluginLoadError, never>
  readonly discover: (directory: string) => Effect.Effect<string[], PluginLoadError, never>
}

// =============================================================================
// Hook Manager Types
// =============================================================================

/**
 * Hook manager interface
 */
export interface HookManager {
  readonly register: (pluginName: string, hookName: string, hook: Hook) => Effect.Effect<void, HookError, never>
  readonly unregister: (pluginName: string, hookName: string) => Effect.Effect<void, HookError, never>
  readonly execute: (hookName: string, ...args: unknown[]) => Effect.Effect<unknown, HookError, never>
  readonly executeBefore: (hookName: string, ...args: unknown[]) => Effect.Effect<void, HookError, never>
  readonly executeAfter: (hookName: string, result: unknown, ...args: unknown[]) => Effect.Effect<void, HookError, never>
  readonly executeAround: (hookName: string, next: Effect.Effect<unknown, never, never>) => Effect.Effect<unknown, HookError, never>
  readonly listHooks: (hookName?: string) => Effect.Effect<HookRegistration[], never, never>
}

// =============================================================================
// Signal Manager Types
// =============================================================================

/**
 * Signal manager interface
 */
export interface SignalManager {
  readonly emit: <T>(signalName: string, data: T) => Effect.Effect<void, SignalError, never>
  readonly subscribe: <T>(signalName: string, handler: SignalHandler<T>) => Effect.Effect<Subscription, SignalError, never>
  readonly subscribeOnce: <T>(signalName: string, handler: SignalHandler<T>) => Effect.Effect<Subscription, SignalError, never>
  readonly unsubscribe: (subscription: Subscription) => Effect.Effect<void, SignalError, never>
  readonly listSignals: () => Effect.Effect<SignalRegistration[], never, never>
  readonly listSubscriptions: (signalName?: string) => Effect.Effect<Subscription[], never, never>
}

// =============================================================================
// Plugin Configuration
// =============================================================================

/**
 * Plugin configuration schema
 */
export const PluginConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  priority: z.number().default(0),
})

export type PluginConfig = z.infer<typeof PluginConfigSchema>

/**
 * Plugin system configuration
 */
export const PluginSystemConfigSchema = z.object({
  pluginDir: z.string().optional(),
  autoLoad: z.boolean().default(true),
  enableHotReload: z.boolean().default(false),
  maxPlugins: z.number().default(100),
  plugins: z.array(PluginConfigSchema).default([]),
})

export type PluginSystemConfig = z.infer<typeof PluginSystemConfigSchema>

// =============================================================================
// Plugin Development Utilities
// =============================================================================

/**
 * Plugin builder configuration
 */
export interface PluginBuilderConfig {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly author?: string
  readonly dependencies?: Record<string, string>
  readonly hooks?: Record<string, Hook>
  readonly signals?: Record<string, Signal>
  readonly component?: PluginComponent
  readonly services?: Record<string, unknown>
  readonly config?: z.ZodSchema
  readonly defaultConfig?: Record<string, unknown>
}

/**
 * Plugin creation helper
 */
export function createPlugin(config: PluginBuilderConfig): Plugin {
  return {
    name: config.name,
    version: config.version,
    metadata: {
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      dependencies: config.dependencies,
    },
    init: Effect.succeed(void 0) as Effect.Effect<void, PluginError, PluginDeps>,
    destroy: Effect.succeed(void 0),
    hooks: config.hooks || {},
    signals: config.signals || {},
    Component: config.component,
    services: config.services,
    config: config.config,
    defaultConfig: config.defaultConfig,
  }
}

/**
 * Plugin validation schema
 */
export const PluginSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    dependencies: z.record(z.string()).optional(),
  }),
  hooks: z.record(z.object({
    before: z.function().optional(),
    after: z.function().optional(),
    around: z.function().optional(),
    priority: z.number().optional(),
  })).optional(),
  signals: z.record(z.object({
    name: z.string(),
    schema: z.any().optional(),
    description: z.string().optional(),
  })).optional(),
})

export type PluginSchemaType = z.infer<typeof PluginSchema>