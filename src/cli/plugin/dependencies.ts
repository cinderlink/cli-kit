/**
 * Plugin Dependency Resolution
 *
 * Functions for resolving plugin dependencies and load order
 */

import type { Plugin } from './types'

/**
 * Resolve plugin dependencies and return load order
 *
 * Uses topological sort to determine the correct order to load plugins
 * based on their dependencies.
 */
export function resolvePluginDependencies(plugins: Plugin[]): Plugin[] {
  const pluginMap = new Map(plugins.map(p => [p.metadata.name, p]))
  const visited = new Set<string>()
  const sorted: Plugin[] = []

  function visit(name: string, ancestors: Set<string> = new Set()): void {
    if (visited.has(name)) return

    const plugin = pluginMap.get(name)
    if (!plugin) {
      throw new Error(`Plugin dependency '${name}' not found`)
    }

    if (ancestors.has(name)) {
      throw new Error(
        `Circular dependency detected: ${Array.from(ancestors).join(' -> ')} -> ${name}`
      )
    }

    ancestors.add(name)

    // Visit dependencies first
    if (plugin.metadata.dependencies) {
      for (const depName of Object.keys(plugin.metadata.dependencies)) {
        visit(depName, new Set(ancestors))
      }
    }

    visited.add(name)
    sorted.push(plugin)
  }

  // Visit all plugins
  for (const plugin of plugins) {
    visit(plugin.metadata.name)
  }

  return sorted
}

/**
 * Check if a plugin's dependencies are satisfied
 */
export function checkDependencies(
  plugin: Plugin,
  availablePlugins: Map<string, Plugin>
): { satisfied: boolean; missing: string[] } {
  const missing: string[] = []

  if (plugin.metadata.dependencies) {
    for (const depName of Object.keys(plugin.metadata.dependencies)) {
      if (!availablePlugins.has(depName)) {
        missing.push(depName)
      }
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  }
}

/**
 * Get all dependents of a plugin
 */
export function getPluginDependents(pluginName: string, plugins: Plugin[]): Plugin[] {
  return plugins.filter(p => {
    if (p.metadata.dependencies) {
      return Object.keys(p.metadata.dependencies).includes(pluginName)
    }
    return false
  })
}
