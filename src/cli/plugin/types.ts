/**
 * Plugin System Type Definitions
 * 
 * Core types and interfaces for the CLI plugin system
 */

import type { z } from "zod"
import type { Command, CLIConfig } from "@cli/types"
import type { Context } from "effect"

/**
 * Plugin metadata containing identification and compatibility information
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  name: string
  /** Semantic version string */
  version: string
  /** Human-readable description */
  description?: string
  /** Plugin author information */
  author?: string | { name: string; email?: string; url?: string }
  /** Required TUIX framework version */
  tuixVersion?: string
  /** Plugin dependencies with version constraints */
  dependencies?: Record<string, string>
  /** Keywords for plugin discovery */
  keywords?: string[]
  /** Plugin homepage URL */
  homepage?: string
  /** Plugin license */
  license?: string
}

/**
 * Plugin command definitions
 */
export interface PluginCommands {
  [commandName: string]: Command
}

/**
 * Plugin extensions for existing commands
 */
export interface PluginExtensions {
  [commandPath: string]: {
    subcommands?: PluginCommands
    options?: Record<string, z.ZodSchema>
    flags?: Record<string, z.ZodSchema>
    arguments?: z.ZodSchema[]
  }
}

/**
 * Handler wrapper function type
 */
export type HandlerWrapper = (
  handler: Command['handler'],
  command: Command,
  commandPath: string[]
) => Command['handler']

/**
 * Plugin execution context
 */
export interface PluginContext {
  /** CLI configuration */
  config: CLIConfig
  /** Logger instance */
  logger: Console
  /** Storage for plugin data */
  storage: Map<string, unknown>
  /** Event emitter for plugin communication */
  events: EventTarget
  /** Service container for dependency injection */
  services: Context.Context<never>
  /** Environment variables */
  env: Record<string, string | undefined>
  /** Plugin metadata registry */
  plugins: Map<string, PluginMetadata>
}

/**
 * JSX command configuration
 */
export interface JSXCommandConfig {
  name: string
  description?: string
  handler: (args: Record<string, unknown>) => JSX.Element | Promise<JSX.Element>
  options?: Record<string, z.ZodSchema>
  flags?: Record<string, z.ZodSchema>
  arguments?: z.ZodSchema[]
  subcommands?: Record<string, JSXCommandConfig>
}

/**
 * Core plugin interface
 */
export interface Plugin {
  /** Plugin metadata */
  metadata: PluginMetadata
  /** Commands provided by the plugin */
  commands?: PluginCommands
  /** Extensions to existing commands */
  extensions?: PluginExtensions
  /** Handler wrappers for middleware */
  wrappers?: HandlerWrapper[]
  /** Configuration schema */
  configSchema?: z.ZodSchema
  /** Default configuration */
  defaultConfig?: Record<string, unknown>
  /** CLI configuration modifications */
  cliConfig?: Partial<CLIConfig>
  /** Services provided by the plugin */
  services?: Record<string, unknown>
  /** Installation hook */
  install?: (context: PluginContext) => void | Promise<void>
  /** Activation hook */
  activate?: (context: PluginContext) => void | Promise<void>
  /** Deactivation hook */
  deactivate?: (context: PluginContext) => void | Promise<void>
  /** Update hook */
  update?: (context: PluginContext, fromVersion: string) => void | Promise<void>
  /** Uninstallation hook */
  uninstall?: (context: PluginContext) => void | Promise<void>
}

/**
 * Plugin API for programmatic plugin creation
 */
export interface PluginAPI {
  metadata(metadata: PluginMetadata): PluginAPI
  command(name: string, command: Command): PluginAPI
  extend(commandPath: string, extension: PluginExtensions[string]): PluginAPI
  wrapper(wrapper: HandlerWrapper): PluginAPI
  config(schema: z.ZodSchema, defaults?: Record<string, unknown>): PluginAPI
  cliConfig(config: Partial<CLIConfig>): PluginAPI
  service(name: string, service: unknown): PluginAPI
  onInstall(hook: (context: PluginContext) => void | Promise<void>): PluginAPI
  onActivate(hook: (context: PluginContext) => void | Promise<void>): PluginAPI
  onDeactivate(hook: (context: PluginContext) => void | Promise<void>): PluginAPI
  onUpdate(hook: (context: PluginContext, fromVersion: string) => void | Promise<void>): PluginAPI
  onUninstall(hook: (context: PluginContext) => void | Promise<void>): PluginAPI
  build(): Plugin
}

/**
 * JSX Plugin interface for JSX-based command definitions
 */
export interface JSXPlugin {
  name: string
  version?: string
  description?: string
  commands?: Record<string, JSXCommandConfig>
  onInstall?: () => void | Promise<void>
  onActivate?: () => void | Promise<void>
  onDeactivate?: () => void | Promise<void>
}