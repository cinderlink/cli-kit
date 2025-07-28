/**
 * CLI Configuration Module
 *
 * Provides configuration management for CLI applications
 */

// Type exports
export type {
  CLIConfig,
  CommandConfig,
  Handler,
  LazyHandler,
  CLIConfigOptions,
  EnvConfig,
} from './types'

// Configuration definition
export { defineConfig, defineCommand, getDefaultConfig, createDefaultConfig } from './defaults'

// Lazy loading
export { lazyLoad } from './lazy'

// Schema and validation
export { commonOptions, commonArgs, RESERVED_NAMES, VERSION_PATTERN } from './schema'
export { validateConfig, normalizeCommand } from './validation'

// Environment variables
export { parseEnvVars, createConfigFromEnv } from './env'

// Configuration merging
export { mergeConfigs, expandAliases } from './merge'

// File loading
export { loadConfig, resolveConfigPath } from './loader'
