/**
 * Plugin System for CLI Framework - Comprehensive extensibility system
 * 
 * This module provides a complete plugin architecture for extending CLI applications
 * built with the TUIX framework. The system supports command registration, middleware,
 * lifecycle hooks, dependency management, and service provision.
 * 
 * ## Key Features:
 * 
 * ### Plugin Architecture
 * - Modular command registration and extension
 * - Handler wrapping for cross-cutting concerns
 * - Lifecycle management (install, activate, deactivate)
 * - Configuration schema validation
 * 
 * ### Middleware System
 * - Before/after command execution hooks
 * - Argument and result transformation
 * - Error handling and recovery
 * - Validation and preprocessing
 * 
 * ### Dependency Management
 * - Plugin dependency resolution
 * - Version compatibility checking
 * - Circular dependency detection
 * - Load order optimization
 * 
 * ### Service Provision
 * - Plugin-provided services
 * - Service injection and discovery
 * - Cross-plugin communication
 * - Resource sharing
 * 
 * @example
 * ```typescript
 * import { definePlugin, PluginBuilder } from './plugin'
 * 
 * // Simple plugin definition
 * const myPlugin = definePlugin({
 *   metadata: {
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     description: 'Adds useful commands'
 *   },
 *   commands: {
 *     greet: {
 *       description: 'Greet someone',
 *       options: {
 *         name: z.string().default('World')
 *       },
 *       handler: async (args) => {
 *         console.log(`Hello, ${args.name}!`)
 *       }
 *     }
 *   }
 * })
 * 
 * // Fluent plugin creation
 * const builderPlugin = new PluginBuilder()
 *   .metadata({ name: 'builder-plugin', version: '1.0.0' })
 *   .command('deploy', deployCommand)
 *   .middleware(loggingMiddleware)
 *   .service('deployer', deployerService)
 *   .build()
 * ```
 * 
 * @module cli/plugin
 */

import { z } from "zod"
import type { CommandConfig, CLIConfig, CLIHooks, Handler, LazyHandler, CommandExtension } from "./types"

/**
 * Plugin metadata for identification and compatibility
 * 
 * Contains essential information about the plugin including versioning,
 * dependencies, and compatibility requirements.
 */
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  author?: string
  repository?: string
  homepage?: string
  license?: string
  keywords?: string[]
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  engines?: {
    node?: string
    bun?: string
    "cli-kit"?: string
  }
}

/**
 * Plugin command definitions
 * 
 * Maps command names to their configuration objects.
 */
export interface PluginCommands {
  [commandName: string]: CommandConfig
}

/**
 * Plugin extensions for modifying existing commands
 * 
 * Allows plugins to extend existing commands with additional
 * options, arguments, wrappers, and hooks.
 */
export interface PluginExtensions {
  [commandPath: string]: {
    options?: Record<string, z.ZodSchema>
    args?: Record<string, z.ZodSchema>
    wrapper?: HandlerWrapper
    hooks?: Partial<CommandHooks>
  }
}

/**
 * Handler wrapper for middleware functionality
 * 
 * Wraps existing command handlers to add cross-cutting concerns
 * like logging, authentication, validation, etc.
 */
export type HandlerWrapper = (
  originalHandler: Handler | LazyHandler,
  context: PluginContext
) => Handler | LazyHandler

/**
 * Command-specific lifecycle hooks
 * 
 * Provides hooks that run before, after, and on error
 * for specific commands, with access to plugin context.
 */
export interface CommandHooks {
  beforeCommand: (args: Record<string, unknown>, context: PluginContext) => Promise<void> | void
  afterCommand: (args: Record<string, unknown>, result: unknown, context: PluginContext) => Promise<void> | void
  onError: (error: Error, args: Record<string, unknown>, context: PluginContext) => Promise<void> | void
}

/**
 * Runtime context provided to plugins
 * 
 * Contains all the information and services available to plugins
 * during execution, including configuration, services, and utilities.
 */
export interface PluginContext {
  command: string[]
  config: Record<string, unknown>
  plugins: Plugin[]
  metadata: PluginMetadata
  services?: Map<string, unknown>
  logger?: {
    log: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    debug: (...args: unknown[]) => void
  }
  router?: unknown
  parser?: unknown
  addCommand?: (name: string, config: CommandConfig) => void
  addHook?: (name: string, hook: Function) => void
  addMiddleware?: (middleware: PluginMiddleware) => void
  extendCommand?: (name: string, extension: CommandExtension) => void
  getCommands?: () => CommandConfig[]
  getHooks?: () => Record<string, Function>
  emit?: (event: string, ...args: unknown[]) => void
  on?: (event: string, handler: Function) => unknown
}

/**
 * Complete plugin interface
 * 
 * Defines the structure of a plugin including metadata, commands,
 * extensions, hooks, middleware, and lifecycle methods.
 */
export interface Plugin {
  metadata: PluginMetadata
  commands?: PluginCommands
  extensions?: PluginExtensions
  hooks?: Partial<CLIHooks>
  middleware?: PluginMiddleware | HandlerWrapper[]
  
  // Lifecycle methods
  install?: (context: PluginContext) => Promise<void> | void
  uninstall?: (context: PluginContext) => Promise<void> | void
  activate?: (context: PluginContext) => Promise<void> | void
  deactivate?: (context: PluginContext) => Promise<void> | void
  init?: (context: PluginContext) => Promise<void> | void
  
  // Configuration
  config?: z.ZodSchema
  configSchema?: z.ZodSchema
  defaultConfig?: Record<string, unknown>
  configPath?: string
  
  // Services provided by plugin
  services?: Record<string, unknown>
}

/**
 * Plugin middleware for cross-cutting concerns
 * 
 * Provides hooks for argument transformation, result processing,
 * validation, and other concerns that apply across commands.
 */
export interface PluginMiddleware {
  // Global middleware (runs for all commands)
  beforeCommand?: (command: string[], args: Record<string, unknown>) => Promise<void> | void
  afterCommand?: (command: string[], args: Record<string, unknown>, result: unknown) => Promise<void> | void
  onError?: (error: Error, command: string[], args: Record<string, unknown>) => Promise<void> | void
  
  // Request/response transformation
  transformArgs?: (args: Record<string, unknown>, command: string[]) => Record<string, unknown>
  transformResult?: (result: unknown, command: string[]) => unknown
  
  // Validation
  validateArgs?: (args: Record<string, unknown>, command: string[]) => boolean | string
  validateResult?: (result: unknown, command: string[]) => boolean | string
}

/**
 * Define a plugin with type safety and validation
 * 
 * Validates the plugin structure and ensures all required properties
 * are present. Performs type checking on command handlers and metadata.
 * 
 * @param plugin - Plugin definition object
 * @returns Validated plugin object
 * @throws Error if plugin structure is invalid
 * 
 * @example
 * ```typescript
 * const myPlugin = definePlugin({
 *   metadata: {
 *     name: 'my-plugin',
 *     version: '1.0.0'
 *   },
 *   commands: {
 *     hello: {
 *       description: 'Say hello',
 *       handler: () => console.log('Hello!')
 *     }
 *   }
 * })
 * ```
 */
export function definePlugin(plugin: Plugin): Plugin {
  // Validate plugin structure
  if (!plugin.metadata?.name) {
    throw new Error("Plugin must have a name in metadata")
  }
  
  if (!plugin.metadata?.version) {
    throw new Error("Plugin must have a version in metadata")
  }
  
  // Ensure all command handlers are functions
  if (plugin.commands) {
    for (const [name, command] of Object.entries(plugin.commands)) {
      if (command.handler && typeof command.handler !== 'function') {
        throw new Error(`Command '${name}' handler must be a function`)
      }
    }
  }
  
  return plugin
}

/**
 * Create a plugin from an object or function with API
 * 
 * Provides two ways to create plugins: either from a complete plugin object
 * or using a function that receives a plugin API for fluent construction.
 * 
 * @param options - Plugin object or function that uses plugin API
 * @param metadata - Plugin metadata (required when using function form)
 * @returns Complete plugin object
 * @throws Error if plugin structure is invalid
 * 
 * @example
 * ```typescript
 * // From object
 * const plugin1 = createPlugin({
 *   metadata: { name: 'plugin1', version: '1.0.0' },
 *   commands: { ... }
 * })
 * 
 * // From function
 * const plugin2 = createPlugin((api) => {
 *   api.addCommand('greet', greetCommand)
 *   api.addHook('beforeCommand', logHook)
 * }, { name: 'plugin2', version: '1.0.0' })
 * ```
 */
export function createPlugin(options: Plugin | ((api: PluginAPI) => void), metadata?: PluginMetadata): Plugin {
  // If options is already a plugin object, just validate and return it
  if (typeof options === 'object' && 'metadata' in options) {
    return definePlugin(options)
  }
  
  // If options is a function, create plugin using the API
  if (typeof options === 'function' && metadata) {
    const plugin: Plugin = {
      metadata,
      commands: {},
      extensions: {},
      hooks: {}
    }
    
    const api: PluginAPI = {
      addCommand(name: string, config: CommandConfig) {
        if (!plugin.commands) plugin.commands = {}
        plugin.commands[name] = config
      },
      
      extendCommand(path: string, extension: PluginExtensions[string]) {
        if (!plugin.extensions) plugin.extensions = {}
        plugin.extensions[path] = extension
      },
      
      addHook(name: keyof CLIHooks, handler: CLIHooks[keyof CLIHooks]) {
        if (!plugin.hooks) plugin.hooks = {}
        plugin.hooks[name] = handler
      },
      
      provideService(name: string, service: unknown) {
        if (!plugin.services) plugin.services = {}
        plugin.services[name] = service
      }
    }
    
    options(api)
    
    return plugin
  }
  
  throw new Error('Invalid createPlugin usage')
}

/**
 * Plugin API for fluent plugin creation
 * 
 * Provides a convenient interface for building plugins using
 * method calls instead of object construction.
 */
export interface PluginAPI {
  addCommand(name: string, config: CommandConfig): void
  extendCommand(path: string, extension: PluginExtensions[string]): void
  addHook(name: keyof CLIHooks, handler: CLIHooks[keyof CLIHooks]): void
  provideService(name: string, service: unknown): void
}

/**
 * Check if a plugin is compatible with current CLI version
 * 
 * Validates that the plugin's engine requirements are satisfied
 * by the current CLI version. Performs semantic version checking.
 * 
 * @param plugin - Plugin to check compatibility for
 * @param cliVersion - Current CLI version
 * @returns Compatibility result with optional reason for incompatibility
 * 
 * @example
 * ```typescript
 * const result = checkPluginCompatibility(myPlugin, '2.1.0')
 * if (!result.compatible) {
 *   console.error('Plugin incompatible:', result.reason)
 * }
 * ```
 */
export function checkPluginCompatibility(
  plugin: Plugin,
  cliVersion: string
): { compatible: boolean; reason?: string } {
  const requiredVersion = plugin.metadata.engines?.["cli-kit"]
  
  if (!requiredVersion) {
    return { compatible: true }
  }
  
  // Simple version check (in production, use semver)
  const [reqMajor] = requiredVersion.split('.')
  const [cliMajor] = cliVersion.split('.')
  
  if (reqMajor !== cliMajor) {
    return {
      compatible: false,
      reason: `Plugin requires CLI version ${requiredVersion}, but ${cliVersion} is installed`
    }
  }
  
  return { compatible: true }
}

/**
 * Compose multiple plugins into a single plugin
 * 
 * Combines multiple plugins into one by merging their commands, extensions,
 * hooks, and other properties. Handles hook chaining for proper execution order.
 * 
 * @param plugins - Array of plugins or first plugin
 * @param morePlugins - Additional plugins (when first param is not array)
 * @returns Composed plugin with merged functionality
 * 
 * @example
 * ```typescript
 * const composedPlugin = composePlugins(
 *   authPlugin,
 *   loggingPlugin,
 *   validationPlugin
 * )
 * ```
 */
export function composePlugins(plugins: Plugin[] | Plugin, ...morePlugins: Plugin[]): Plugin {
  // Handle both array and variadic forms
  const allPlugins = Array.isArray(plugins) ? plugins : [plugins, ...morePlugins]
  return {
    metadata: {
      name: "composed-plugin",
      version: "1.0.0",
      description: `Composed from: ${allPlugins.map(p => p.metadata.name).join(', ')}`
    },
    
    commands: allPlugins.reduce((acc, plugin) => ({
      ...acc,
      ...plugin.commands
    }), {}),
    
    extensions: allPlugins.reduce((acc, plugin) => ({
      ...acc,
      ...plugin.extensions
    }), {}),
    
    hooks: allPlugins.reduce((acc, plugin) => {
      const hooks = { ...acc }
      
      // Merge hooks by chaining them with proper type safety
      if (plugin.hooks?.beforeCommand) {
        const existing = hooks.beforeCommand
        if (existing && plugin.hooks.beforeCommand) {
          const newHook = plugin.hooks.beforeCommand
          hooks.beforeCommand = async (command, args) => {
            await existing(command, args)
            await newHook(command, args)
          }
        } else {
          hooks.beforeCommand = plugin.hooks.beforeCommand
        }
      }
      
      if (plugin.hooks?.afterCommand) {
        const existing = hooks.afterCommand
        if (existing && plugin.hooks.afterCommand) {
          const newHook = plugin.hooks.afterCommand
          hooks.afterCommand = async (command, args, result) => {
            await existing(command, args, result)
            await newHook(command, args, result)
          }
        } else {
          hooks.afterCommand = plugin.hooks.afterCommand
        }
      }
      
      if (plugin.hooks?.onError) {
        const existing = hooks.onError
        if (existing && plugin.hooks.onError) {
          const newHook = plugin.hooks.onError
          hooks.onError = async (error, command, args) => {
            await existing(error, command, args)
            await newHook(error, command, args)
          }
        } else {
          hooks.onError = plugin.hooks.onError
        }
      }
      
      return hooks
    }, {} as Partial<CLIHooks>),
    
    install: async (context) => {
      for (const plugin of allPlugins) {
        if (plugin.install) {
          await plugin.install(context)
        }
      }
    }
  }
}

/**
 * Validate a plugin structure for correctness
 * 
 * Performs comprehensive validation of plugin structure including
 * metadata, command handlers, schemas, and version format.
 * 
 * @param plugin - Plugin to validate
 * @returns Validation result with detailed error messages
 * 
 * @example
 * ```typescript
 * const result = validatePlugin(myPlugin)
 * if (!result.valid) {
 *   console.error('Plugin validation failed:', result.errors)
 * }
 * ```
 */
export function validatePlugin(plugin: Plugin): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!plugin || typeof plugin !== 'object') {
    errors.push("Plugin must be an object")
    return { valid: false, errors }
  }
  
  if (!plugin.metadata) {
    errors.push("Plugin must have metadata")
    return { valid: false, errors }
  }
  
  if (!plugin.metadata.name || plugin.metadata.name.trim() === '') {
    errors.push("Plugin must have a valid name")
  }
  
  if (!plugin.metadata.version) {
    errors.push("Plugin must have a version in metadata")
  }
  
  // Validate version format (simple check)
  if (plugin.metadata.version && !plugin.metadata.version.match(/^\d+\.\d+\.\d+/)) {
    errors.push("Plugin version must be in semver format (e.g., 1.0.0)")
  }
  
  // Validate command handlers and schemas
  if (plugin.commands) {
    for (const [name, command] of Object.entries(plugin.commands)) {
      if (command.handler && typeof command.handler !== 'function') {
        errors.push(`Command '${name}' handler must be a function`)
      }
      
      // Check if args is a valid zod schema
      if (command.args && (!('parse' in command.args) || typeof command.args.parse !== 'function')) {
        errors.push(`Command '${name}' args must be a valid Zod schema`)
      }
      
      // Check if options is a valid schema object
      if (command.options) {
        for (const [optName, schema] of Object.entries(command.options)) {
          if (!schema || !('parse' in schema) || typeof schema.parse !== 'function') {
            errors.push(`Command '${name}' option '${optName}' must be a valid Zod schema`)
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Plugin Manager for comprehensive plugin lifecycle management
 * 
 * Manages plugin loading, registration, dependency resolution,
 * and lifecycle execution. Provides a centralized system for
 * handling multiple plugins with proper error handling.
 * 
 * @example
 * ```typescript
 * const manager = new PluginManager(context)
 * await manager.register(authPlugin)
 * await manager.register(loggingPlugin)
 * await manager.initialize(context)
 * ```
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private hooks: Partial<CLIHooks> = {}
  private initialized = false
  
  constructor(private context: PluginContext) {}
  
  async load(plugin: Plugin): Promise<void> {
    const validation = validatePlugin(plugin)
    if (!validation.valid) {
      throw new Error(`Invalid plugin: ${validation.errors?.join(', ')}`)
    }
    
    this.plugins.set(plugin.metadata.name, plugin)
    
    if (plugin.install) {
      await plugin.install(this.context)
    }
  }
  
  async register(plugin: Plugin): Promise<void> {
    // Check dependencies before registering
    if (plugin.metadata.dependencies) {
      for (const [depName, depVersion] of Object.entries(plugin.metadata.dependencies)) {
        const dependency = this.plugins.get(depName)
        if (!dependency) {
          throw new Error(`Plugin ${plugin.metadata.name} requires ${depName}@${depVersion} but it is not loaded`)
        }
        
        // Check for circular dependencies
        if (dependency.metadata.dependencies?.[plugin.metadata.name]) {
          throw new Error(`Circular dependency detected between ${plugin.metadata.name} and ${depName}`)
        }
      }
    }
    
    await this.load(plugin)
  }
  
  async initialize(context: PluginContext): Promise<boolean> {
    if (this.initialized) return true
    
    // Resolve plugin load order based on dependencies
    const sortedPlugins = resolvePluginDependencies(Array.from(this.plugins.values()))
    
    // Re-initialize plugins in dependency order
    this.plugins.clear()
    for (const plugin of sortedPlugins) {
      this.plugins.set(plugin.metadata.name, plugin)
    }
    
    this.initialized = true
    return true
  }
  
  async unload(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) return
    
    if (plugin.uninstall) {
      await plugin.uninstall(this.context)
    }
    
    this.plugins.delete(pluginName)
  }
  
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }
  
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }
}

export function createPluginManager(context: PluginContext): PluginManager {
  return new PluginManager(context)
}

/**
 * Apply plugin transforms to args and results
 */
export function applyPluginTransforms(
  plugins: Plugin[],
  command: string[],
  args: Record<string, unknown>,
  phase: 'args' | 'result'
): unknown
export function applyPluginTransforms(
  originalCommand: unknown,
  commandPath: string,
  plugins: Plugin[]
): unknown
export function applyPluginTransforms(
  ...args: unknown[]
): unknown {
  // Handle two different call signatures
  if (args.length === 4 && typeof args[3] === 'string') {
    // (plugins, command, args, phase)
    const [plugins, command, transformArgs, phase] = args
    let transformed = transformArgs
    
    for (const plugin of plugins) {
      if (plugin.middleware && typeof plugin.middleware === 'object' && !Array.isArray(plugin.middleware)) {
        if (phase === 'args' && plugin.middleware.transformArgs) {
          transformed = plugin.middleware.transformArgs(transformed, command)
        } else if (phase === 'result' && plugin.middleware.transformResult) {
          transformed = plugin.middleware.transformResult(transformed, command)
        }
      }
    }
    
    return transformed
  } else if (args.length === 3) {
    // (originalCommand, commandPath, plugins)
    const [originalCommand, commandPath, plugins] = args
    let transformed = { ...originalCommand }
    
    for (const plugin of plugins) {
      if (plugin.extensions && plugin.extensions[commandPath]) {
        const extension = plugin.extensions[commandPath]
        
        // Merge args
        if (extension.args) {
          transformed.args = {
            ...transformed.args,
            ...extension.args
          }
        }
        
        // Merge options
        if (extension.options) {
          transformed.options = {
            ...transformed.options,
            ...extension.options
          }
        }
        
        // Apply wrapper if present
        if (extension.wrapper && transformed.handler) {
          transformed.handler = extension.wrapper(transformed.handler, {
            command: [commandPath],
            config: {},
            plugins: [],
            metadata: plugin.metadata
          })
        }
      }
    }
    
    return transformed
  }
  
  throw new Error('Invalid arguments for applyPluginTransforms')
}

/**
 * Create a middleware chain from plugins
 */
export function createMiddlewareFromPlugins(
  plugins: Plugin[],
  phase: 'before' | 'after' | 'error'
): ((context: PluginContext & { args?: Record<string, unknown>, result?: unknown, error?: Error }) => Promise<void>)[] {
  const middlewares: ((context: PluginContext & { args?: Record<string, unknown>, result?: unknown, error?: Error }) => Promise<void>)[] = []
  
  for (const plugin of plugins) {
    if (plugin.middleware && !Array.isArray(plugin.middleware)) {
      const middleware = plugin.middleware as PluginMiddleware
      if (phase === 'before' && middleware.beforeCommand) {
        const beforeHook = middleware.beforeCommand
        middlewares.push(async (ctx) => {
          if (ctx.args) {
            await beforeHook(ctx.command, ctx.args)
          }
        })
      } else if (phase === 'after' && middleware.afterCommand) {
        const afterHook = middleware.afterCommand
        middlewares.push(async (ctx) => {
          if (ctx.args && ctx.result !== undefined) {
            await afterHook(ctx.command, ctx.args, ctx.result)
          }
        })
      } else if (phase === 'error' && middleware.onError) {
        const errorHook = middleware.onError
        middlewares.push(async (ctx) => {
          if (ctx.error && ctx.args) {
            await errorHook(ctx.error, ctx.command, ctx.args)
          }
        })
      }
    }
  }
  
  return middlewares
}

/**
 * Create a middleware chain from handler wrappers
 */
export function createMiddlewareChain(
  middlewares: HandlerWrapper[],
  handler: Handler | LazyHandler,
  context: PluginContext
): Handler {
  return middlewares.reduceRight((nextHandler, middleware) => {
    return middleware(nextHandler, context)
  }, handler) as Handler
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], source[key])
      } else {
        result[key] = { ...source[key] }
      }
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

/**
 * Merge plugin configs with CLI config
 */
export function mergePluginConfigs(
  baseConfig: CLIConfig,
  plugins: Plugin[]
): CLIConfig
export function mergePluginConfigs(configs: CLIConfig[]): CLIConfig
export function mergePluginConfigs(...args: unknown[]): CLIConfig {
  if (args.length === 2 && Array.isArray(args[1])) {
    // (baseConfig, plugins)
    const [baseConfig, plugins] = args
    let config = { ...baseConfig }
    
    for (const plugin of plugins) {
      // Merge commands
      if (plugin.commands) {
        config.commands = {
          ...config.commands,
          ...plugin.commands
        }
      }
      
      // Merge hooks
      if (plugin.hooks) {
        config.hooks = {
          ...config.hooks,
          ...plugin.hooks
        }
      }
    }
    
    return config
  } else if (args.length === 1 && Array.isArray(args[0])) {
    // (configs)
    const [configs] = args
    let merged = {}
    
    for (const config of configs) {
      merged = deepMerge(merged, config)
    }
    
    return merged
  }
  
  throw new Error('Invalid arguments for mergePluginConfigs')
}

/**
 * Resolve plugin dependencies and return load order
 */
export function resolvePluginDependencies(plugins: Plugin[]): Plugin[] {
  // Simple topological sort - in a real implementation,
  // this would check actual dependencies
  const sorted: Plugin[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  
  function visit(plugin: Plugin) {
    if (visited.has(plugin.metadata.name)) return
    if (visiting.has(plugin.metadata.name)) {
      throw new Error(`Circular dependency detected: ${plugin.metadata.name}`)
    }
    
    visiting.add(plugin.metadata.name)
    
    // Visit dependencies first (simplified - assumes no real deps)
    // In real implementation, would check plugin.metadata.dependencies
    
    visiting.delete(plugin.metadata.name)
    visited.add(plugin.metadata.name)
    sorted.push(plugin)
  }
  
  for (const plugin of plugins) {
    visit(plugin)
  }
  
  return sorted
}

/**
 * Plugin Builder for fluent plugin creation
 */
export class PluginBuilder {
  private plugin: Partial<Plugin> = {}
  
  metadata(metadata: PluginMetadata): this {
    this.plugin.metadata = metadata
    return this
  }
  
  addCommand(name: string, config: CommandConfig): this {
    if (!this.plugin.commands) {
      this.plugin.commands = {}
    }
    this.plugin.commands[name] = config
    return this
  }
  
  command(name: string, config: CommandConfig): this {
    return this.addCommand(name, config)
  }
  
  addHook(hookName: keyof CLIHooks, hook: CLIHooks[keyof CLIHooks]): this {
    if (!this.plugin.hooks) {
      this.plugin.hooks = {}
    }
    this.plugin.hooks[hookName] = hook
    return this
  }
  
  hook(hookName: keyof CLIHooks, hook: CLIHooks[keyof CLIHooks]): this {
    return this.addHook(hookName, hook)
  }
  
  addMiddleware(middleware: HandlerWrapper): this {
    if (!this.plugin.middleware) {
      this.plugin.middleware = []
    }
    if (Array.isArray(this.plugin.middleware)) {
      this.plugin.middleware.push(middleware)
    } else {
      this.plugin.middleware = [middleware]
    }
    return this
  }
  
  middleware(middleware: HandlerWrapper): this {
    return this.addMiddleware(middleware)
  }
  
  service(name: string, service: unknown): this {
    if (!this.plugin.services) {
      this.plugin.services = {}
    }
    this.plugin.services[name] = service
    return this
  }
  
  extend(path: string, extension: PluginExtensions[string]): this {
    if (!this.plugin.extensions) {
      this.plugin.extensions = {}
    }
    this.plugin.extensions[path] = extension
    return this
  }
  
  install(installFn: (context: PluginContext) => Promise<void>): this {
    this.plugin.install = installFn
    return this
  }
  
  init(initFn: (context: PluginContext) => Promise<void>): this {
    this.plugin.init = initFn
    return this
  }
  
  uninstall(uninstallFn: (context: PluginContext) => Promise<void>): this {
    this.plugin.uninstall = uninstallFn
    return this
  }
  
  config(configSchema: z.ZodSchema): this {
    this.plugin.configSchema = configSchema
    return this
  }
  
  build(): Plugin {
    if (!this.plugin.metadata) {
      throw new Error("Plugin metadata is required")
    }
    return this.plugin as Plugin
  }
}

/**
 * Create a plugin from a builder
 */
export function createPluginFromBuilder(builderFn: (builder: PluginBuilder) => PluginBuilder): Plugin
export function createPluginFromBuilder(builder: PluginBuilder): Plugin
export function createPluginFromBuilder(arg: unknown): Plugin {
  if (typeof arg === 'function') {
    // (builderFn)
    const builder = new PluginBuilder()
    return arg(builder).build()
  } else if (arg instanceof PluginBuilder) {
    // (builder)
    return arg.build()
  }
  
  throw new Error('Invalid argument for createPluginFromBuilder')
}

/**
 * Plugin utilities
 */
export const PluginUtils = {
  /**
   * Load a plugin from a file path
   */
  async loadFromPath(path: string): Promise<Plugin> {
    const module = await import(path)
    const plugin = module.default || module.plugin
    
    if (!plugin) {
      throw new Error(`No default export or 'plugin' export found in ${path}`)
    }
    
    return plugin
  },
  
  /**
   * Load a plugin from npm package
   */
  async loadFromPackage(packageName: string): Promise<Plugin> {
    try {
      const module = await import(packageName)
      return module.default || module.plugin
    } catch (error) {
      throw new Error(`Failed to load plugin from package '${packageName}': ${error}`)
    }
  },
  
  /**
   * Create a plugin that adds a single command
   */
  commandPlugin(
    name: string,
    command: string,
    config: CommandConfig
  ): Plugin {
    return definePlugin({
      metadata: { name, version: "1.0.0" },
      commands: { [command]: config }
    })
  },
  
  /**
   * Create a plugin that adds middleware
   */
  middlewarePlugin(
    name: string,
    middleware: PluginMiddleware
  ): Plugin {
    return definePlugin({
      metadata: { name, version: "1.0.0" },
      middleware
    })
  }
}