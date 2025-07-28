/**
 * JSX Config Integration Utilities
 */

import { Effect } from 'effect'
import type { Config, ConfigObject, ConfigSchema } from 'tuix/config/types'
import { createConfig } from 'tuix/config'
import { setGlobalConfig, getGlobalConfig } from './stores/configStore'

/**
 * Effect layer for configuration
 */
export const ConfigLayer = (options?: {
  name?: string
  defaults?: ConfigObject
  schema?: ConfigSchema
  envPrefix?: string
  loadUserConfig?: boolean
  loadProjectConfig?: boolean
}) =>
  Effect.gen(function* (_) {
    const builder = createConfig()

    if (options?.name) builder.name(options.name)
    if (options?.defaults) builder.defaults(options.defaults)
    if (options?.schema) builder.schema(options.schema)
    if (options?.envPrefix) builder.envPrefix(options.envPrefix)
    if (options?.loadUserConfig) builder.withUserConfig()
    if (options?.loadProjectConfig) builder.withProjectConfig()

    const config = yield* _(Effect.promise(() => builder.build()))

    return config
  }).pipe(
    Effect.map(config => ({
      Config: config,
    }))
  )

/**
 * Create a JSX app with configuration
 */
export async function createJSXConfigApp(
  AppComponent: (() => JSX.Element) | JSX.Element,
  configOptions?: {
    name?: string
    defaults?: ConfigObject
    schema?: ConfigSchema
    envPrefix?: string
    loadUserConfig?: boolean
    loadProjectConfig?: boolean
  }
): Promise<{ config: Config; app: JSX.Element }> {
  // Create config
  const builder = createConfig()

  if (configOptions?.name) builder.name(configOptions.name)
  if (configOptions?.defaults) builder.defaults(configOptions.defaults)
  if (configOptions?.schema) builder.schema(configOptions.schema)
  if (configOptions?.envPrefix) builder.envPrefix(configOptions.envPrefix)
  if (configOptions?.loadUserConfig) builder.withUserConfig()
  if (configOptions?.loadProjectConfig) builder.withProjectConfig()

  const config = await builder.build()
  setGlobalConfig(config)

  // Get app element
  const app = typeof AppComponent === 'function' ? AppComponent() : AppComponent

  return { config, app }
}

/**
 * Integrate config with CLI options
 */
export interface ConfigOptionsHelper {
  getDefault: (key: string) => any
  applyDefaults: <T extends Record<string, any>>(options: T) => T
  validateOptions: <T extends Record<string, any>>(options: T) => T
}

export function getConfigOptions(): ConfigOptionsHelper {
  const config = getGlobalConfig()

  return {
    getDefault: (key: string) => {
      // Look for option defaults in config
      return config.get(`cli.defaults.${key}`)
    },

    applyDefaults: options => {
      const defaults = (config.get('cli.defaults') as ConfigObject) || {}
      return { ...defaults, ...options }
    },

    validateOptions: options => {
      // Validate against schema if available
      const schema = config.get('cli.schema') as any
      if (schema) {
        const result = schema.safeParse(options)
        if (!result.success) {
          throw result.error
        }
        return result.data
      }
      return options
    },
  }
}
