/**
 * Tuix Configuration System
 * 
 * Flexible, hierarchical configuration management with multiple sources
 */

export * from "./types"
export type { TuixConfig } from "./types"
export * from "./config"
export * from "./loaders"
export * from "./utils"
export * from "./jsx-config"

import { Effect, Layer } from "effect"
import { Config as IConfig, ConfigOptions } from "./types"
import { createConfig } from "./config"

/**
 * Create the default configuration layer
 */
export const ConfigLayer = (options?: ConfigOptions) =>
  Layer.effect(
    IConfig,
    Effect.gen(function* (_) {
      const builder = createConfig()
      
      if (options?.name) builder.name(options.name)
      if (options?.defaults) builder.defaults(options.defaults)
      if (options?.schema) builder.schema(options.schema)
      if (options?.envPrefix) builder.envPrefix(options.envPrefix)
      if (options?.loadUserConfig) builder.withUserConfig()
      if (options?.loadProjectConfig) builder.withProjectConfig()
      if (options?.watch) builder.withWatch()
      if (options?.files) {
        for (const file of options.files) {
          builder.file(file)
        }
      }
      if (options?.searchPaths) {
        for (const path of options.searchPaths) {
          builder.searchPath(path)
        }
      }
      
      return yield* _(Effect.promise(() => builder.build()))
    })
  )

/**
 * Quick config creation helpers
 */
export const config = {
  /**
   * Create a simple config with defaults
   */
  simple: (defaults: Record<string, any>) =>
    createConfig().defaults(defaults).build(),
  
  /**
   * Create a config that loads from standard locations
   */
  standard: (name: string) =>
    createConfig()
      .name(name)
      .withUserConfig()
      .withProjectConfig()
      .envPrefix(`${name.toUpperCase()}_`)
      .build(),
  
  /**
   * Create a config for CLI applications
   */
  cli: (name: string, defaults?: Record<string, any>) =>
    createConfig()
      .name(name)
      .defaults(defaults || {})
      .withUserConfig()
      .withProjectConfig()
      .envPrefix(`${name.toUpperCase()}_`)
      .searchPath(process.cwd())
      .build(),
  
  /**
   * Create a config from environment variables only
   */
  env: (prefix?: string) =>
    createConfig()
      .envPrefix(prefix || "")
      .build(),
  
  /**
   * Create a config from a specific file
   */
  file: (path: string) =>
    createConfig()
      .file(path)
      .build()
}

/**
 * Configuration file templates
 */
export const templates = {
  /**
   * Generate a basic tuix.config.ts template
   */
  typescript: (appName: string) => `/**
 * Tuix Configuration
 * 
 * Configuration for ${appName}
 */

import { defineConfig } from 'tuix/config'

export default defineConfig({
  // Application name
  name: '${appName}',
  
  // Version
  version: '1.0.0',
  
  // Logger configuration
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true
  },
  
  // Process manager configuration
  processManager: {
    tuixDir: '.tuix',
    autoRestart: true,
    maxRestarts: 5
  },
  
  // CLI configuration
  cli: {
    // Default values for CLI options
    defaults: {
      verbose: false,
      quiet: false
    }
  },
  
  // Custom configuration
  custom: {
    // Add your app-specific config here
  }
})
`,

  /**
   * Generate a JSON config template
   */
  json: (appName: string) => JSON.stringify({
    name: appName,
    version: "1.0.0",
    logger: {
      level: "info",
      format: "pretty",
      showEmoji: true
    },
    processManager: {
      tuixDir: ".tuix",
      autoRestart: true,
      maxRestarts: 5
    },
    cli: {
      defaults: {
        verbose: false,
        quiet: false
      }
    },
    custom: {}
  }, null, 2),

  /**
   * Generate a .env template
   */
  env: (appName: string) => `# ${appName} Environment Configuration

# Logger
${appName.toUpperCase()}_LOGGER_LEVEL=info
${appName.toUpperCase()}_LOGGER_FORMAT=pretty
${appName.toUpperCase()}_LOGGER_SHOW_EMOJI=true

# Process Manager
${appName.toUpperCase()}_PROCESS_MANAGER_TUIX_DIR=.tuix
${appName.toUpperCase()}_PROCESS_MANAGER_AUTO_RESTART=true
${appName.toUpperCase()}_PROCESS_MANAGER_MAX_RESTARTS=5

# Custom configuration
# ${appName.toUpperCase()}_CUSTOM_KEY=value
`
}

/**
 * Helper to define a typed config
 */
export function defineConfig<T extends Record<string, any>>(
  config: T
): T {
  return config
}

/**
 * Load configuration from standard locations
 */
export async function loadConfig(appName: string = 'tuix'): Promise<Config> {
  const configBuilder = createConfig()
    .name(appName)
    .withUserConfig()
    .withProjectConfig()
    .envPrefix(`${appName.toUpperCase()}_`)
    .searchPath(process.cwd())
  
  return await configBuilder.build()
}