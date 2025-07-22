/**
 * CLI Configuration Types
 */

import type { CLIConfig, CommandConfig, LazyHandler, Handler } from "@cli/types"

// Re-export core types
export type { CLIConfig, CommandConfig, LazyHandler, Handler } from "@cli/types"

/**
 * CLI-specific configuration options
 */
export interface CLIConfigOptions {
  /** Override config from CLI arguments */
  overrides?: Partial<CLIConfig>
  /** Environment variable prefix */
  envPrefix?: string
  /** Enable config file loading */
  loadConfigFile?: boolean
  /** Config file path */
  configPath?: string
}

/**
 * Environment variable configuration
 */
export interface EnvConfig {
  /** Environment variable prefix */
  prefix: string
  /** Environment variables */
  env?: Record<string, string | undefined>
}