/**
 * CLI Framework Types - Core type definitions for command-line interface system
 * 
 * This module defines the complete type system for the TUIX CLI framework,
 * providing a flexible, extensible architecture for building sophisticated
 * command-line applications with plugin support, validation, and hooks.
 * 
 * ## Key Features:
 * 
 * ### Configuration System
 * - Hierarchical command structure with subcommands
 * - Flexible option and argument validation using Zod schemas
 * - Plugin architecture for extensibility
 * - Hook system for lifecycle management
 * 
 * ### Command Handling
 * - Lazy loading for performance optimization
 * - Handler functions returning Components or void
 * - Support for aliases and hidden commands
 * - Nested command structures
 * 
 * ### Plugin Architecture
 * - Middleware system for cross-cutting concerns
 * - Command extensions and modifications
 * - Handler wrapping for enhanced functionality
 * - Dynamic plugin loading and configuration
 * 
 * ### Type Safety
 * - Zod schema validation for runtime type checking
 * - Strongly typed handler functions
 * - Comprehensive interface definitions
 * - Integration with TUIX Component system
 * 
 * @example
 * ```typescript
 * import { CLIConfig, CommandConfig, Handler } from './types'
 * 
 * // Define a command handler
 * const listHandler: Handler = async (args) => {
 *   const { filter } = args
 *   return myListComponent({ filter: filter as string })
 * }
 * 
 * // Define command configuration
 * const listCommand: CommandConfig = {
 *   description: 'List items with optional filtering',
 *   options: {
 *     filter: z.string().optional()
 *   },
 *   handler: listHandler
 * }
 * 
 * // Complete CLI configuration
 * const cliConfig: CLIConfig = {
 *   name: 'myapp',
 *   version: '1.0.0',
 *   description: 'My awesome CLI application',
 *   commands: {
 *     list: listCommand
 *   }
 * }
 * ```
 * 
 * @module cli/types
 */

import { z } from "zod"
import type { Component } from "@tuix/core"
import type { Plugin } from "./plugin"
import type { TuixConfig } from "@tuix/core"

// Re-export Plugin for external use
export type { Plugin } from "./plugin"

/**
 * Complete CLI application configuration
 * 
 * Defines the structure and behavior of a CLI application including
 * metadata, commands, plugins, hooks, and global settings.
 */
export interface CLIConfig {
  name: string
  version: string
  description?: string
  options?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig>
  plugins?: PluginReference[]
  hooks?: CLIHooks
  settings?: Record<string, unknown>
}

/**
 * Configuration for individual CLI commands
 * 
 * Defines command behavior including validation schemas, handlers,
 * subcommands, and metadata. Supports both synchronous and lazy loading.
 */
export interface CommandConfig {
  description: string
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  arguments?: z.ZodSchema[] // Alternative to args
  commands?: Record<string, CommandConfig> // Subcommands
  handler?: LazyHandler | Handler
  aliases?: string[]
  hidden?: boolean
  lazy?: boolean
}

/**
 * Lazy-loaded command handler for performance optimization
 * 
 * Allows commands to be loaded on-demand rather than at startup,
 * improving CLI application boot time for large command sets.
 */
export interface LazyHandler {
  (): Promise<Handler>
  _lazy: true
  _loader?: () => Promise<{ default: Handler }>
}

/**
 * Command handler function type
 * 
 * Handles command execution with validated arguments. Can return
 * a Component for interactive UI or void for simple operations.
 */
export type Handler = (args: Record<string, unknown>) => Promise<Component<unknown, unknown> | void> | Component<unknown, unknown> | void

/**
 * Lifecycle hooks for CLI command execution
 * 
 * Provides extension points for cross-cutting concerns like
 * logging, authentication, cleanup, and error handling.
 */
export interface CLIHooks {
  beforeCommand?: (command: string[], args: Record<string, unknown>) => Promise<void> | void
  afterCommand?: (command: string[], args: Record<string, unknown>, result: unknown) => Promise<void> | void
  onError?: (error: Error, command: string[], args: Record<string, unknown>) => Promise<void> | void
}

/**
 * Reference to a plugin (by name or direct instance)
 * 
 * Allows plugins to be specified as module names for lazy loading
 * or as direct Plugin instances for immediate registration.
 */
export type PluginReference = string | Plugin

// Plugin interface moved to plugin.ts to avoid duplication

/**
 * Extension capabilities for modifying existing commands
 * 
 * Allows plugins to add options, arguments, or wrap handlers
 * of existing commands without replacing them entirely.
 */
export interface CommandExtension {
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  wrapper?: import("./plugin").HandlerWrapper
}

/**
 * Middleware hooks provided by plugins
 * 
 * Similar to CLIHooks but specifically for plugin-provided
 * functionality that can be composed across multiple plugins.
 */
export interface PluginMiddleware {
  beforeCommand?: (command: string[], args: Record<string, unknown>) => Promise<void> | void
  afterCommand?: (command: string[], args: Record<string, unknown>, result: unknown) => Promise<void> | void
  onError?: (error: Error, command: string[], args: Record<string, unknown>) => Promise<void> | void
}

/**
 * Result of command-line argument parsing
 * 
 * Contains the parsed command path, validated arguments and options,
 * plus the original raw arguments for debugging or special handling.
 */
export interface ParsedArgs {
  command: string[]
  args: Record<string, unknown>
  options: Record<string, unknown>
  rawArgs: string[]
}

/**
 * Runtime context for CLI command execution
 * 
 * Provides access to configuration, parsed arguments, and loaded
 * plugins during command execution. Passed to handlers and hooks.
 */
export interface CLIContext {
  config: CLIConfig
  parsedArgs: ParsedArgs
  plugins: Plugin[]
  tuixConfig?: TuixConfig
}