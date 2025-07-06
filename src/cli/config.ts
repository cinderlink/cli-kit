/**
 * CLI Configuration System
 * 
 * Provides the defineConfig API for creating CLI applications
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
    options: config.options || {},
    commands: config.commands || {},
    plugins: config.plugins || [],
    hooks: config.hooks || {}
  }
}

/**
 * Create a lazy-loaded command handler
 */
export function lazyLoad(importFn: () => Promise<{ default: any }>): LazyHandler {
  const lazyHandler = async () => {
    const module = await importFn()
    return module.default
  }
  
  // Add metadata for testing/introspection
  ;(lazyHandler as any)._lazy = true
  ;(lazyHandler as any)._loader = importFn
  
  return lazyHandler
}

/**
 * Helper to create a command configuration
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
        if (merged.commands![name]) {
          // Deep merge command config including nested commands
          merged.commands![name] = {
            ...merged.commands![name],
            ...command,
            options: {
              ...merged.commands![name].options,
              ...command.options
            },
            commands: command.commands ? {
              ...merged.commands![name].commands,
              ...command.commands
            } : merged.commands![name].commands
          }
        } else {
          merged.commands![name] = command
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
    
    // Merge hooks
    if (config.hooks) {
      const hooks = merged.hooks || {}
      if (config.hooks.beforeCommand) {
        const existing = hooks.beforeCommand
        hooks.beforeCommand = existing 
          ? async (cmd, args) => {
              await existing(cmd, args)
              await config.hooks!.beforeCommand!(cmd, args)
            }
          : config.hooks.beforeCommand
      }
      
      if (config.hooks.afterCommand) {
        const existing = hooks.afterCommand
        hooks.afterCommand = existing
          ? async (cmd, args, result) => {
              await existing(cmd, args, result)
              await config.hooks!.afterCommand!(cmd, args, result)
            }
          : config.hooks.afterCommand
      }
      
      if (config.hooks.onError) {
        const existing = hooks.onError
        hooks.onError = existing
          ? async (error, cmd, args) => {
              await existing(error, cmd, args)
              await config.hooks!.onError!(error, cmd, args)
            }
          : config.hooks.onError
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
 */
export function parseEnvVars(env: Record<string, string> | NodeJS.ProcessEnv, prefix: string): any {
  const result: any = {}
  
  Object.entries(env).forEach(([key, value]) => {
    if (key.startsWith(prefix) && value) {
      const cleanKey = key.slice(prefix.length).toLowerCase()
      
      // Handle special mappings for common CLI env vars
      const settingsKeys = ['colors', 'interactive', 'output']
      const globalOptionsKeys = ['verbose', 'debug', 'quiet']
      
      let targetObj = result
      let finalKey = cleanKey
      
      if (settingsKeys.includes(cleanKey)) {
        if (!result.settings) result.settings = {}
        targetObj = result.settings
      } else if (globalOptionsKeys.includes(cleanKey)) {
        if (!result.globalOptions) result.globalOptions = {}
        targetObj = result.globalOptions
      } else if (cleanKey.includes('_')) {
        // Handle nested keys like CLI_SETTINGS_COLORS -> settings.colors
        const parts = cleanKey.split('_')
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (!targetObj[part]) {
            targetObj[part] = {}
          }
          targetObj = targetObj[part]
        }
        finalKey = parts[parts.length - 1]
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
  const envVars = parseEnvVars(prefix)
  const config: Partial<CLIConfig> = {}
  
  if (envVars.name) config.name = envVars.name
  if (envVars.version) config.version = envVars.version
  if (envVars.description) config.description = envVars.description
  
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
export function createDefaultConfig(name?: string): CLIConfig {
  return {
    name: name || "cli",
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

/**
 * Expand command aliases in configuration
 */
export function expandAliases(config: CLIConfig): CLIConfig {
  const expandedConfig = { ...config, commands: { ...config.commands } }
  
  function expandCommandAliases(commands: Record<string, any>) {
    const expanded = { ...commands }
    
    Object.entries(commands).forEach(([commandName, commandConfig]) => {
      // Expand aliases for this command
      if (commandConfig.aliases) {
        commandConfig.aliases.forEach((alias: string) => {
          expanded[alias] = { ...commandConfig }
        })
      }
      
      // Recursively expand subcommands
      if (commandConfig.subcommands) {
        expanded[commandName] = {
          ...commandConfig,
          subcommands: expandCommandAliases(commandConfig.subcommands)
        }
        
        // Also expand for the alias commands
        if (commandConfig.aliases) {
          commandConfig.aliases.forEach((alias: string) => {
            expanded[alias] = {
              ...commandConfig,
              subcommands: expandCommandAliases(commandConfig.subcommands)
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
      // Snake_case to kebab-case
      return input.replace(/[_\s]+/g, '-').toLowerCase()
    } else if (/^[A-Z]/.test(input) || /[a-z][A-Z]/.test(input)) {
      // PascalCase or camelCase to lowercase
      return input.toLowerCase()
    } else {
      // Already normalized or kebab-case
      return input.toLowerCase()
    }
  }
  
  return {
    ...input,
    description: input.description || "",
    options: input.options || {},
    arguments: input.arguments || []
  }
}