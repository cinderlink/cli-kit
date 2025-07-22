/**
 * Configuration System Types
 * 
 * Type definitions for the configuration system
 */

import { Effect, Context } from "effect"
import { z } from "zod"

/**
 * Configuration provider service
 */
export interface Config {
  /**
   * Get a configuration value
   */
  readonly get: <T>(key: string, defaultValue?: T) => Effect.Effect<T, ConfigError>
  
  /**
   * Get all configuration values
   */
  readonly getAll: () => Effect.Effect<Record<string, any>, ConfigError>
  
  /**
   * Set a configuration value
   */
  readonly set: (key: string, value: any) => Effect.Effect<void, ConfigError>
  
  /**
   * Check if a key exists
   */
  readonly has: (key: string) => Effect.Effect<boolean>
  
  /**
   * Watch for configuration changes
   */
  readonly watch: (key: string, callback: (value: any) => void) => Effect.Effect<() => void, ConfigError>
  
  /**
   * Reload configuration from sources
   */
  readonly reload: () => Effect.Effect<void, ConfigError>
}

export const Config = Context.GenericTag<Config>("tuix/Config")

/**
 * Configuration error types
 */
export class ConfigError {
  readonly _tag = "ConfigError"
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export class ConfigNotFoundError extends ConfigError {
  readonly _tag = "ConfigNotFoundError"
  constructor(readonly key: string) {
    super(`Configuration key not found: ${key}`)
  }
}

export class ConfigValidationError extends ConfigError {
  readonly _tag = "ConfigValidationError"
  constructor(readonly key: string, readonly validationError: z.ZodError) {
    super(`Configuration validation failed for key ${key}: ${validationError.message}`)
  }
}

/**
 * Configuration builder options
 */
export interface ConfigOptions {
  /** Configuration name */
  name?: string
  /** Default values */
  defaults?: Record<string, any>
  /** Validation schema */
  schema?: z.ZodSchema
  /** Environment variable prefix */
  envPrefix?: string
  /** Load user configuration */
  loadUserConfig?: boolean
  /** Load project configuration */
  loadProjectConfig?: boolean
  /** Watch for changes */
  watch?: boolean
  /** Configuration files to load */
  files?: string[]
  /** Search paths for config files */
  searchPaths?: string[]
}

/**
 * Configuration source types
 */
export interface ConfigSource {
  readonly name: string
  readonly priority: number
  readonly load: () => Effect.Effect<Record<string, any>, ConfigError>
  readonly watch?: (callback: () => void) => Effect.Effect<() => void, ConfigError>
}

/**
 * Main Tuix configuration interface
 */
export interface TuixConfig {
  /** Application name */
  name: string
  
  /** Application version */
  version?: string
  
  /** Logger configuration */
  logger?: {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
    format?: 'pretty' | 'json' | 'compact' | 'cli'
    showEmoji?: boolean
    colorize?: boolean
    logFile?: string
  }
  
  /** Process manager configuration */
  processManager?: {
    tuixDir?: string
    autoRestart?: boolean
    maxRestarts?: number
    healthCheck?: {
      enabled?: boolean
      interval?: number
      timeout?: number
    }
  }
  
  /** CLI configuration */
  cli?: {
    defaults?: Record<string, any>
    aliases?: Record<string, string[]>
  }
  
  /** JSX configuration */
  jsx?: {
    pragma?: string
    pragmaFrag?: string
  }
  
  /** Styling configuration */
  styling?: {
    colorProfile?: 'none' | '16' | '256' | 'truecolor'
    theme?: string
  }
  
  /** Custom configuration */
  custom?: Record<string, any>
  
  /** Plugin configuration */
  plugins?: Array<{
    name: string
    enabled?: boolean
    options?: Record<string, any>
  }>
}

/**
 * Configuration file formats
 */
export type ConfigFormat = 'json' | 'yaml' | 'toml' | 'js' | 'ts'

/**
 * Configuration loader interface
 */
export interface ConfigLoader {
  readonly supports: (filename: string) => boolean
  readonly load: (filename: string) => Effect.Effect<Record<string, any>, ConfigError>
}