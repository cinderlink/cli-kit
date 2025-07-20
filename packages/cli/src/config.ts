/**
 * CLI Configuration System - Complete configuration management for CLI applications
 * 
 * This module provides a comprehensive configuration system for building CLI applications
 * with the TUIX framework. It includes configuration definition, validation, merging,
 * lazy loading, and environment variable integration.
 * 
 * ## Key Features:
 * 
 * ### Configuration Definition
 * - Type-safe configuration builders with `defineConfig()`
 * - Command definition helpers with validation
 * - Lazy loading support for performance optimization
 * - Environment variable integration
 * 
 * ### Validation System
 * - Comprehensive configuration validation
 * - Reserved name checking to prevent conflicts
 * - Semver version validation
 * - Schema validation for options and arguments
 * 
 * ### Configuration Merging
 * - Plugin-friendly configuration merging
 * - Hook composition for middleware patterns
 * - Deep merging of nested command structures
 * - Conflict resolution strategies
 * 
 * ### Common Patterns
 * - Pre-defined option and argument schemas
 * - Standard CLI patterns (verbose, quiet, help, etc.)
 * - File and server configuration helpers
 * - Output formatting options
 * 
 * @example
 * ```typescript
 * import { defineConfig, defineCommand, commonOptions } from './config'
 * 
 * // Simple CLI configuration
 * const config = defineConfig({
 *   name: 'myapp',
 *   version: '1.0.0',
 *   description: 'My awesome CLI application',
 *   commands: {
 *     build: defineCommand({
 *       description: 'Build the application',
 *       options: {
 *         watch: commonOptions.watch,
 *         output: commonOptions.output
 *       },
 *       handler: async (args) => {
 *         console.log('Building with options:', args)
 *       }
 *     })
 *   }
 * })
 * 
 * // Environment-based configuration
 * const envConfig = createConfigFromEnv('MYAPP')
 * const finalConfig = mergeConfigs(config, envConfig)
 * ```
 * 
 * @module cli/config
 */

import { z } from "zod"
import type { CLIConfig, CommandConfig, LazyHandler, Handler } from "./types"

// Re-export types for convenience
export type { CLIConfig, CommandConfig, LazyHandler, Handler } from "./types"

/**
 * Define a CLI configuration with commands, options, and plugins
 * 
 * This function ensures that all required default properties are present
 * in the configuration object, making it safe to use throughout the CLI framework.
 * 
 * @param config - The CLI configuration object
 * @returns A complete CLI configuration with all defaults applied
 * 
 * @example
 * ```typescript
 * const config = defineConfig({
 *   name: "my-cli",
 *   version: "1.0.0",
 *   description: "My awesome CLI tool",
 *   commands: {
 *     hello: {
 *       description: "Say hello",
 *       handler: async () => console.log("Hello!")
 *     }
 *   }
 * })
 * ```
 */
export function defineConfig(config: CLIConfig): CLIConfig {
  return {
    ...config,
    // Ensure we have defaults
    options: config.options ?? {},
    commands: config.commands ?? {},
    plugins: config.plugins ?? [],
    hooks: config.hooks ?? {}
  }
}

/**
 * Create a lazy-loaded command handler for performance optimization
 * 
 * Wraps an import function to create a lazy-loaded handler that only loads
 * the actual handler code when the command is executed. This improves CLI
 * startup time for applications with many commands.
 * 
 * @param importFn - Function that dynamically imports the handler module
 * @param metadata - Optional metadata to attach to the lazy handler
 * @returns A lazy handler that loads on first execution
 * 
 * @example
 * ```typescript
 * const buildHandler = lazyLoad(
 *   () => import('./commands/build'),
 *   { category: 'development' }
 * )
 * ```
 */
export function lazyLoad(importFn: () => Promise<{ default: Handler }>, metadata?: Record<string, unknown>): LazyHandler {
  const lazyHandler = async (): Promise<Handler> => {
    const module = await importFn()
    return module.default
  }
  
  // Add metadata for testing/introspection
  Object.assign(lazyHandler, { _lazy: true, _loader: importFn })
  
  // Add metadata if provided
  if (metadata) {
    Object.assign(lazyHandler, metadata)
  }
  
  return lazyHandler as LazyHandler
}

/**
 * Helper to create a command configuration with type safety
 * 
 * Provides a convenient way to define command configurations with automatic
 * lazy loading detection and proper type checking.
 * 
 * @param config - Command configuration with handler
 * @returns Complete command configuration
 * 
 * @example
 * ```typescript
 * const deployCommand = defineCommand({
 *   description: 'Deploy the application',
 *   options: {
 *     environment: z.enum(['dev', 'staging', 'prod']),
 *     force: commonOptions.force
 *   },
 *   handler: async (args) => {
 *     console.log(`Deploying to ${args.environment}`)
 *   }
 * })
 * ```
 */
export function defineCommand(config: Omit<CommandConfig, 'handler'> & {
  handler: Handler | LazyHandler | (() => Promise<{ default: Handler }>)
}): CommandConfig {
  const { handler, ...rest } = config
  
  // If handler is a dynamic import function, wrap it with lazyLoad
  if (typeof handler === 'function' && handler.constructor.name === 'AsyncFunction' && !handler.length) {
    return {
      ...rest,
      handler: lazyLoad(handler as () => Promise<{ default: Handler }>)
    }
  }
  
  return {
    ...rest,
    handler: handler as Handler | LazyHandler
  }
}

/**
 * Create common option schemas
 */
export const commonOptions = {
  verbose: z.boolean().default(false).describe("Enable verbose output"),
  quiet: z.boolean().default(false).describe("Suppress output"),
  debug: z.boolean().default(false).describe("Enable debug output"),
  help: z.boolean().default(false).describe("Show help information"),
  version: z.boolean().default(false).describe("Show version information"),
  config: z.string().optional().describe("Path to config file"),
  output: z.string().optional().describe("Output file path"),
  force: z.boolean().default(false).describe("Force operation without confirmation"),
  yes: z.boolean().default(false).describe("Answer yes to all prompts"),
  no: z.boolean().default(false).describe("Answer no to all prompts"),
  
  // Common server options
  port: z.number().min(1).max(65535).default(3000).describe("Port number"),
  host: z.string().default("localhost").describe("Host to bind to"),
  
  // Common file options
  input: z.string().describe("Input file path"),
  watch: z.boolean().default(false).describe("Watch for file changes"),
  
  // Common logging options
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info").describe("Log level"),
  logFile: z.string().optional().describe("Log file path"),
  
  // Common format options
  format: z.enum(["json", "yaml", "table", "csv"]).default("table").describe("Output format"),
  pretty: z.boolean().default(false).describe("Pretty print output")
}

/**
 * Create common argument schemas
 */
export const commonArgs = {
  path: z.string().describe("File or directory path"),
  paths: z.array(z.string()).describe("Multiple file or directory paths"),
  file: z.string().describe("File path"),
  files: z.array(z.string()).describe("Multiple file paths"),
  directory: z.string().describe("Directory path"),
  name: z.string().describe("Name"),
  names: z.array(z.string()).describe("Multiple names"),
  value: z.string().describe("Value"),
  values: z.array(z.string()).describe("Multiple values"),
  id: z.string().describe("Identifier"),
  url: z.string().url().describe("URL"),
  email: z.string().email().describe("Email address")
}

/**
 * Validation helpers
 */
export function validateConfig(config: CLIConfig): void {
  if (!config.name || config.name.trim() === "") {
    throw new Error("CLI config must have a name")
  }
  
  if (!config.version || config.version.trim() === "") {
    throw new Error("CLI config must have a version")
  }
  
  // Basic semver validation
  const semverRegex = /^\d+\.\d+\.\d+/
  if (!semverRegex.test(config.version)) {
    throw new Error("CLI config version must be a valid semver format")
  }
  
  if (config.description !== undefined && config.description.trim() === "") {
    throw new Error("CLI config description cannot be empty string")
  }
  
  // Validate commands type
  if (config.commands !== undefined && (typeof config.commands !== 'object' || Array.isArray(config.commands))) {
    throw new Error("CLI config commands must be an object")
  }
  
  // Validate plugins type
  if (config.plugins !== undefined && !Array.isArray(config.plugins)) {
    throw new Error("CLI config plugins must be an array")
  }
  
  // Validate command names don't conflict with built-in options
  const reservedNames = ['help', 'version', 'h', 'v']
  Object.keys(config.commands || {}).forEach(name => {
    if (reservedNames.includes(name)) {
      throw new Error(`Command name "${name}" is reserved`)
    }
  })
}

/**
 * Merge multiple CLI configs (useful for plugins)
 * 
 * This function combines multiple CLI configurations, with later configurations
 * taking precedence over earlier ones. Useful for plugin systems where
 * plugins need to extend or override base configuration.
 * 
 * @param base - The base CLI configuration
 * @param configs - Additional configurations to merge (later configs override earlier ones)
 * @returns A merged CLI configuration
 * 
 * @example
 * ```typescript
 * const baseConfig = defineConfig({
 *   name: "my-cli",
 *   version: "1.0.0",
 *   commands: { help: helpCommand }
 * })
 * 
 * const pluginConfig = {
 *   commands: { deploy: deployCommand },
 *   options: { verbose: z.boolean() }
 * }
 * 
 * const merged = mergeConfigs(baseConfig, pluginConfig)
 * // merged now has both help and deploy commands
 * ```
 */
export function mergeConfigs(base: CLIConfig, ...configs: Partial<CLIConfig>[]): CLIConfig {
  const merged: CLIConfig = { ...base }
  
  for (const config of configs) {
    // Merge top-level properties
    if (config.name !== undefined) merged.name = config.name
    if (config.version !== undefined) merged.version = config.version
    if (config.description !== undefined) merged.description = config.description
    
    if (config.commands) {
      merged.commands = merged.commands || {}
      Object.entries(config.commands).forEach(([name, command]) => {
        const existingCommands = merged.commands
        if (existingCommands && existingCommands[name]) {
          // Deep merge command config including nested commands
          const existingCommand = existingCommands[name]
          existingCommands[name] = {
            ...existingCommand,
            ...command,
            options: {
              ...existingCommand.options,
              ...command.options
            },
            commands: command.commands ? {
              ...existingCommand.commands,
              ...command.commands
            } : existingCommand.commands
          }
        } else if (existingCommands) {
          existingCommands[name] = command
        }
      })
    }
    
    if (config.options) {
      merged.options = { ...merged.options, ...config.options }
    }
    
    if (config.settings) {
      merged.settings = { ...merged.settings, ...config.settings }
    }
    
    if (config.plugins) {
      merged.plugins = [...(merged.plugins || []), ...config.plugins]
    }
    
    // Merge aliases (if present in extended configuration)
    const configWithAliases = config as CLIConfig & { aliases?: Record<string, string> }
    const mergedWithAliases = merged as CLIConfig & { aliases?: Record<string, string> }
    if (configWithAliases.aliases) {
      mergedWithAliases.aliases = { ...mergedWithAliases.aliases, ...configWithAliases.aliases }
    }
    
    // Merge hooks
    if (config.hooks) {
      const hooks = merged.hooks || {}
      if (config.hooks.beforeCommand) {
        const existing = hooks.beforeCommand
        const newHook = config.hooks.beforeCommand
        hooks.beforeCommand = existing 
          ? async (cmd, args) => {
              await existing(cmd, args)
              await newHook(cmd, args)
            }
          : newHook
      }
      
      if (config.hooks.afterCommand) {
        const existing = hooks.afterCommand
        const newHook = config.hooks.afterCommand
        hooks.afterCommand = existing
          ? async (cmd, args, result) => {
              await existing(cmd, args, result)
              await newHook(cmd, args, result)
            }
          : newHook
      }
      
      if (config.hooks.onError) {
        const existing = hooks.onError
        const newHook = config.hooks.onError
        hooks.onError = existing
          ? async (error, cmd, args) => {
              await existing(error, cmd, args)
              await newHook(error, cmd, args)
            }
          : newHook
      }
      
      merged.hooks = hooks
    }
  }
  
  return merged
}

/**
 * Load configuration from a file path
 */
export async function loadConfig(filePath: string): Promise<CLIConfig> {
  try {
    const config = await import(filePath)
    const configData = config.default || config
    validateConfig(configData)
    return configData
  } catch (error) {
    throw new Error(`Failed to load config from ${filePath}: ${error}`)
  }
}

/**
 * Parse environment variables with a given prefix
 * 
 * Converts environment variables into a configuration object by parsing
 * variables that start with the given prefix. Handles type conversion
 * and nested key structures.
 * 
 * @param env - Environment variables object
 * @param prefix - Prefix to filter environment variables
 * @returns Parsed configuration object
 * 
 * @example
 * ```typescript
 * // Environment: MYAPP_VERBOSE=true, MYAPP_PORT=3000
 * const config = parseEnvVars(process.env, 'MYAPP_')
 * // Returns: { verbose: true, port: '3000' }
 * ```
 */
export function parseEnvVars(env: Record<string, string> | NodeJS.ProcessEnv, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  Object.entries(env).forEach(([key, value]) => {
    if (key.startsWith(prefix) && value) {
      const cleanKey = key.slice(prefix.length).toLowerCase()
      
      // Handle special mappings for common CLI env vars
      const settingsKeys = ['colors', 'interactive', 'output']
      
      let targetObj: Record<string, unknown> = result
      let finalKey = cleanKey
      
      if (settingsKeys.includes(cleanKey)) {
        if (!result.settings) result.settings = {}
        targetObj = result.settings as Record<string, unknown>
      } else if (cleanKey.includes('_')) {
        // Handle nested keys like CLI_SETTINGS_COLORS -> settings_colors
        finalKey = cleanKey
      }
      
      // Convert string values to appropriate types
      if (value === 'true') {
        targetObj[finalKey] = true
      } else if (value === 'false') {
        targetObj[finalKey] = false
      } else {
        // For settings keys, validate the value makes sense
        if (settingsKeys.includes(cleanKey) && !['true', 'false'].includes(value)) {
          // Skip invalid boolean values for settings
          return
        }
        targetObj[finalKey] = value
      }
    }
  })
  
  return result
}

/**
 * Create configuration from environment variables
 */
export function createConfigFromEnv(prefix = "CLI"): Partial<CLIConfig> {
  const envVars = parseEnvVars(process.env, prefix)
  const config: Partial<CLIConfig> = {}
  
  if (envVars.name && typeof envVars.name === 'string') config.name = envVars.name
  if (envVars.version && typeof envVars.version === 'string') config.version = envVars.version
  if (envVars.description && typeof envVars.description === 'string') config.description = envVars.description
  
  return config
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): CLIConfig {
  return {
    name: "cli",
    version: "1.0.0",
    description: "A CLI application",
    commands: {},
    options: {},
    plugins: [],
    hooks: {}
  }
}

/**
 * Alias for getDefaultConfig - for backwards compatibility
 */
export function createDefaultConfig(config?: Partial<CLIConfig> | string): CLIConfig {
  if (typeof config === 'string') {
    return {
      name: config,
      version: "0.0.1",
      description: "A CLI application",
      commands: {},
      options: {},
      plugins: [],
      hooks: {},
      settings: {
        colors: true,
        interactive: true
      }
    }
  }
  
  const name = config?.name || "cli"
  return {
    name,
    version: config?.version || "0.0.1",
    description: config?.description || `${name} CLI`,
    commands: config?.commands || {},
    options: config?.options || {},
    plugins: config?.plugins || [],
    hooks: config?.hooks || {},
    settings: {
      colors: true,
      interactive: true,
      ...config?.settings
    }
  }
}

/**
 * Expand command aliases in configuration
 */
export function expandAliases(config: CLIConfig): CLIConfig;
export function expandAliases(commandName: string, aliases: Record<string, string>): string;
export function expandAliases(configOrCommand: CLIConfig | string, aliases?: Record<string, string>): CLIConfig | string {
  // If called with a string command name and aliases object
  if (typeof configOrCommand === 'string' && aliases) {
    const commandName = configOrCommand
    const visited = new Set<string>()
    
    function expandAlias(cmd: string): string {
      if (visited.has(cmd)) {
        return cmd // Prevent infinite loops
      }
      visited.add(cmd)
      
      if (aliases && aliases[cmd]) {
        const expanded = aliases[cmd]
        if (expanded) {
          // Handle nested aliases like "ta" -> "t --all"
          const parts = expanded.split(' ')
          const baseCmd = parts[0]
          if (baseCmd) {
            const expandedBase = expandAlias(baseCmd)
            return parts.length > 1 ? `${expandedBase} ${parts.slice(1).join(' ')}` : expandedBase
          }
        }
      }
      
      return cmd
    }
    
    return expandAlias(commandName)
  }
  
  // Original functionality for config objects
  const config = configOrCommand as CLIConfig
  const expandedConfig = { ...config, commands: { ...config.commands } }
  
  function expandCommandAliases(commands: Record<string, CommandConfig>): Record<string, CommandConfig> {
    const expanded = { ...commands }
    
    Object.entries(commands).forEach(([commandName, commandConfig]) => {
      // Expand aliases for this command
      if (commandConfig.aliases) {
        commandConfig.aliases.forEach((alias: string) => {
          expanded[alias] = { ...commandConfig }
        })
      }
      
      // Recursively expand subcommands
      if (commandConfig.commands) {
        expanded[commandName] = {
          ...commandConfig,
          commands: expandCommandAliases(commandConfig.commands)
        }
        
        // Also expand for the alias commands
        if (commandConfig.aliases) {
          commandConfig.aliases.forEach((alias: string) => {
            expanded[alias] = {
              ...commandConfig,
              commands: commandConfig.commands ? expandCommandAliases(commandConfig.commands) : undefined
            }
          })
        }
      }
    })
    
    return expanded
  }
  
  expandedConfig.commands = expandCommandAliases(config.commands || {})
  return expandedConfig
}

/**
 * Resolve configuration file path
 */
export function resolveConfigPath(path?: string): string {
  return path || "./cli.config.js"
}

/**
 * Normalize command configuration - overload for string input
 */
export function normalizeCommand(input: string): string
export function normalizeCommand(command: CommandConfig): CommandConfig
export function normalizeCommand(input: string | CommandConfig): string | CommandConfig {
  if (typeof input === 'string') {
    // Handle different naming conventions
    if (input.includes('_')) {
      // Keep snake_case as is since some systems prefer it
      return input.toLowerCase()
    } else if (/^[A-Z]/.test(input) || /[a-z][A-Z]/.test(input)) {
      // PascalCase or camelCase to lowercase
      return input.toLowerCase()
    } else {
      // Already normalized or kebab-case, also handle spaces
      return input.replace(/\s+/g, '').toLowerCase()
    }
  }
  
  return {
    ...input,
    description: input.description || "",
    options: input.options || {},
    arguments: input.arguments || []
  }
}