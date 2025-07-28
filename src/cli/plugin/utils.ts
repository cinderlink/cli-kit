/**
 * Plugin Utilities
 *
 * Helper functions for plugin operations
 */

import type { Plugin } from './types'
import type { CLIConfig } from '@cli/types'

/**
 * Deep merge objects recursively
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target }

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        )
      } else {
        result[key] = source[key]
      }
    }
  }

  return result
}

/**
 * Merge plugin configurations
 */
export function mergePluginConfigs(base: CLIConfig, ...configs: Partial<CLIConfig>[]): CLIConfig
export function mergePluginConfigs(configs: CLIConfig[]): CLIConfig
export function mergePluginConfigs(...args: unknown[]): CLIConfig {
  let configs: Partial<CLIConfig>[]
  let base: CLIConfig

  if (args.length === 1 && Array.isArray(args[0])) {
    configs = args[0]
    base = configs[0] || {}
    configs = configs.slice(1)
  } else {
    base = args[0] as CLIConfig
    configs = args.slice(1) as Partial<CLIConfig>[]
  }

  let result = { ...base }

  for (const config of configs) {
    // Merge commands
    if (config.commands) {
      result.commands = {
        ...result.commands,
        ...config.commands,
      }
    }

    // Merge other properties
    const { commands, ...otherConfig } = config
    result = deepMerge(result, otherConfig) as CLIConfig
  }

  return result
}

/**
 * Compose multiple plugins into a single plugin
 */
export function composePlugins(plugins: Plugin[] | Plugin, ...morePlugins: Plugin[]): Plugin {
  const allPlugins = Array.isArray(plugins) ? plugins : [plugins, ...morePlugins]

  if (allPlugins.length === 0) {
    throw new Error('At least one plugin is required for composition')
  }

  if (allPlugins.length === 1) {
    return allPlugins[0]
  }

  const composed: Plugin = {
    metadata: {
      name: allPlugins.map(p => p.metadata.name).join('+'),
      version: '0.0.0',
      description: `Composition of: ${allPlugins.map(p => p.metadata.name).join(', ')}`,
    },
  }

  // Merge commands
  composed.commands = allPlugins.reduce(
    (acc, plugin) => ({
      ...acc,
      ...plugin.commands,
    }),
    {}
  )

  // Merge extensions
  composed.extensions = allPlugins.reduce(
    (acc, plugin) => ({
      ...acc,
      ...plugin.extensions,
    }),
    {}
  )

  // Combine wrappers
  const wrappers = allPlugins.flatMap(p => p.wrappers || [])
  if (wrappers.length > 0) {
    composed.wrappers = wrappers
  }

  // Merge services
  composed.services = allPlugins.reduce(
    (acc, plugin) => ({
      ...acc,
      ...plugin.services,
    }),
    {}
  )

  // Merge CLI configs
  const cliConfigs = allPlugins.filter(p => p.cliConfig).map(p => p.cliConfig!)
  if (cliConfigs.length > 0) {
    composed.cliConfig = mergePluginConfigs({} as CLIConfig, ...cliConfigs)
  }

  return composed
}

/**
 * Plugin utility collection
 */
export const PluginUtils = {
  /**
   * Check if a value is a valid plugin
   */
  isPlugin(value: unknown): value is Plugin {
    return (
      typeof value === 'object' &&
      value !== null &&
      'metadata' in value &&
      typeof (value as Plugin).metadata === 'object' &&
      'name' in (value as Plugin).metadata &&
      'version' in (value as Plugin).metadata
    )
  },

  /**
   * Get plugin by name from array
   */
  findPlugin(plugins: Plugin[], name: string): Plugin | undefined {
    return plugins.find(p => p.metadata.name === name)
  },

  /**
   * Sort plugins by name
   */
  sortByName(plugins: Plugin[]): Plugin[] {
    return [...plugins].sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
  },

  /**
   * Filter plugins by keyword
   */
  filterByKeyword(plugins: Plugin[], keyword: string): Plugin[] {
    const lowerKeyword = keyword.toLowerCase()
    return plugins.filter(
      p =>
        p.metadata.keywords?.some(k => k.toLowerCase().includes(lowerKeyword)) ||
        p.metadata.name.toLowerCase().includes(lowerKeyword) ||
        p.metadata.description?.toLowerCase().includes(lowerKeyword)
    )
  },
}
