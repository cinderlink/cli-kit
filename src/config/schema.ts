/**
 * Configuration System Types
 * 
 * Flexible configuration management with inheritance and validation
 */

import { z } from "zod"
import { Context } from "effect"

/**
 * Configuration value types
 */
export type ConfigValue = string | number | boolean | null | ConfigObject | ConfigArray
export type ConfigObject = { [key: string]: ConfigValue }
export type ConfigArray = ConfigValue[]

/**
 * Configuration source types
 */
export type ConfigSource = 
  | "default"      // Default values in code
  | "env"          // Environment variables
  | "user"         // User config (~/.config/tuix/settings.json)
  | "project"      // Project config (tuix.config.*)
  | "app"          // Application config
  | "cli"          // CLI flags/options
  | "runtime"      // Runtime overrides

/**
 * Configuration entry with source tracking
 */
export interface ConfigEntry<T = ConfigValue> {
  value: T
  source: ConfigSource
  timestamp: Date
  schema?: z.ZodSchema<T>
}

/**
 * Configuration schema definition
 */
export interface ConfigSchema {
  [key: string]: z.ZodSchema<any> | ConfigSchema
}

/**
 * Configuration options
 */
/**
 * Base Tuix configuration structure
 */
export interface TuixConfig {
  /**
   * Enable debug logging for Tuix framework internals
   */
  enableTuixDebug?: boolean
  
  /**
   * Logger configuration
   */
  logger?: {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
    format?: 'pretty' | 'json' | 'compact'
    colorize?: boolean
    prettyPrint?: boolean
    showEmoji?: boolean
  }
  
  /**
   * Process manager configuration
   */
  processManager?: {
    services?: Record<string, any>
    logDir?: string
    tuixDir?: string
    autoSave?: boolean
    cwd?: string
  }
  
  /**
   * Application-specific configuration
   */
  [key: string]: any
}

export interface ConfigOptions {
  /**
   * Name of the configuration (e.g., "my-app")
   */
  name?: string
  
  /**
   * Configuration file paths to load
   */
  files?: string[]
  
  /**
   * Load user config from ~/.config/tuix/
   */
  loadUserConfig?: boolean
  
  /**
   * Load project config from tuix.config.*
   */
  loadProjectConfig?: boolean
  
  /**
   * Environment variable prefix (e.g., "MYAPP_")
   */
  envPrefix?: string
  
  /**
   * Configuration schema for validation
   */
  schema?: ConfigSchema
  
  /**
   * Default configuration values
   */
  defaults?: ConfigObject
  
  /**
   * Watch config files for changes
   */
  watch?: boolean
  
  /**
   * Config file search paths
   */
  searchPaths?: string[]
}

/**
 * Configuration manager interface
 */
export interface Config {
  /**
   * Get a configuration value
   */
  get<T = ConfigValue>(key: string): T | undefined
  
  /**
   * Get a configuration value with default
   */
  getOrDefault<T = ConfigValue>(key: string, defaultValue: T): T
  
  /**
   * Get a configuration value with source info
   */
  getWithSource<T = ConfigValue>(key: string): ConfigEntry<T> | undefined
  
  /**
   * Set a configuration value
   */
  set(key: string, value: ConfigValue, source?: ConfigSource): void
  
  /**
   * Delete a configuration value
   */
  delete(key: string): void
  
  /**
   * Check if a key exists
   */
  has(key: string): boolean
  
  /**
   * Get all configuration keys
   */
  keys(): string[]
  
  /**
   * Get all configuration as object
   */
  toObject(): ConfigObject
  
  /**
   * Merge configuration from another source
   */
  merge(config: ConfigObject, source?: ConfigSource): void
  
  /**
   * Validate configuration against schema
   */
  validate(): { success: boolean; errors?: z.ZodError[] }
  
  /**
   * Watch for configuration changes
   */
  watch(callback: (key: string, value: ConfigValue, source: ConfigSource) => void): () => void
  
  /**
   * Load configuration from file
   */
  loadFile(path: string): Promise<void>
  
  /**
   * Save configuration to file
   */
  saveFile(path: string, keys?: string[]): Promise<void>
  
  /**
   * Reload all configuration sources
   */
  reload(): Promise<void>
  
  /**
   * Get configuration for a specific namespace
   */
  namespace(ns: string): Config
}

/**
 * Configuration file format
 */
export interface ConfigFile {
  $schema?: string
  extends?: string | string[]
  env?: Record<string, string>
  [key: string]: ConfigValue
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  name: string
  enabled?: boolean
  config?: ConfigObject
}

/**
 * Configuration loader interface
 */
export interface ConfigLoader {
  /**
   * Check if this loader can handle the file
   */
  canLoad(path: string): boolean
  
  /**
   * Load configuration from file
   */
  load(path: string): Promise<ConfigObject>
  
  /**
   * Save configuration to file
   */
  save(path: string, config: ConfigObject): Promise<void>
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  key: string
  oldValue?: ConfigValue
  newValue: ConfigValue
  source: ConfigSource
  timestamp: Date
}

/**
 * Effect Context for Config
 */
export const Config = Context.GenericTag<Config>("tuix/Config")

/**
 * Configuration builder interface
 */
export interface ConfigBuilder {
  /**
   * Set configuration name
   */
  name(name: string): ConfigBuilder
  
  /**
   * Add configuration file
   */
  file(path: string): ConfigBuilder
  
  /**
   * Add search path
   */
  searchPath(path: string): ConfigBuilder
  
  /**
   * Set environment prefix
   */
  envPrefix(prefix: string): ConfigBuilder
  
  /**
   * Set schema
   */
  schema(schema: ConfigSchema): ConfigBuilder
  
  /**
   * Set defaults
   */
  defaults(defaults: ConfigObject): ConfigBuilder
  
  /**
   * Enable user config
   */
  withUserConfig(): ConfigBuilder
  
  /**
   * Enable project config
   */
  withProjectConfig(): ConfigBuilder
  
  /**
   * Enable file watching
   */
  withWatch(): ConfigBuilder
  
  /**
   * Build the configuration
   */
  build(): Promise<Config>
}