/**
 * Default Configuration Values
 */

import type { CLIConfig, CommandConfig, Handler, LazyHandler } from '@cli/types'

/**
 * Get the default CLI configuration
 *
 * @returns Default configuration object
 */
export function getDefaultConfig(): CLIConfig {
  return {
    name: 'cli',
    version: '0.0.0',
    description: 'A CLI application',
    options: {},
    commands: {},
  }
}

/**
 * Create a default configuration with optional overrides
 *
 * @param config - Partial configuration or CLI name
 * @returns Complete CLI configuration with defaults
 */
export function createDefaultConfig(config?: Partial<CLIConfig> | string): CLIConfig {
  if (typeof config === 'string') {
    return {
      ...getDefaultConfig(),
      name: config,
    }
  }

  return {
    ...getDefaultConfig(),
    ...config,
  }
}

/**
 * Define a CLI configuration with commands, options, and plugins
 *
 * This function ensures that all required default properties are present
 * in the configuration object, making it safe to use throughout the CLI framework.
 *
 * @param config - The CLI configuration object
 * @returns A complete CLI configuration with all defaults applied
 */
export function defineConfig(config: CLIConfig): CLIConfig {
  return {
    ...config,
    // Ensure we have defaults
    options: config.options ?? {},
    commands: config.commands ?? {},
    plugins: config.plugins ?? [],
    hooks: config.hooks ?? {},
    // Merge with any provided plugin configurations
    ...config.plugins?.reduce((acc, plugin) => {
      if (typeof plugin !== 'string' && plugin.cliConfig) {
        // Merge plugin config
        return { ...acc, ...plugin.cliConfig }
      }
      return acc
    }, {}),
  }
}

/**
 * Define a command configuration with type checking
 */
export function defineCommand(
  config: Omit<CommandConfig, 'handler'> & {
    handler: Handler | LazyHandler | (() => Promise<{ default: Handler }>)
  }
): CommandConfig {
  const { handler, ...rest } = config

  // If handler is a dynamic import function, wrap it with lazyLoad
  if (
    typeof handler === 'function' &&
    handler.constructor.name === 'AsyncFunction' &&
    !handler.length
  ) {
    // This looks like an import function
    const importFn = handler as () => Promise<{ default: Handler }>
    const { lazyLoad } = require('./lazy') // Avoid circular dependency
    return {
      ...rest,
      handler: lazyLoad(importFn),
    }
  }

  return {
    ...rest,
    handler: handler as Handler | LazyHandler,
  }
}
