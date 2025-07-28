/**
 * Plugin Validation and Compatibility
 *
 * Functions for validating plugins and checking compatibility
 */

import type { Plugin, PluginMetadata } from './types'

/**
 * Check if a plugin is compatible with the current environment
 */
export function checkPluginCompatibility(
  plugin: PluginMetadata,
  currentVersion: string,
  loadedPlugins: Map<string, PluginMetadata> = new Map()
): { compatible: boolean; issues: string[] } {
  const issues: string[] = []

  // Check TUIX version compatibility
  if (plugin.tuixVersion) {
    // Simple version check - in production you'd use a proper semver library
    if (currentVersion !== plugin.tuixVersion) {
      issues.push(
        `Plugin requires TUIX version ${plugin.tuixVersion}, but current version is ${currentVersion}`
      )
    }
  }

  // Check plugin dependencies
  if (plugin.dependencies) {
    for (const [depName, depVersion] of Object.entries(plugin.dependencies)) {
      const loadedPlugin = loadedPlugins.get(depName)

      if (!loadedPlugin) {
        issues.push(`Missing dependency: ${depName}`)
      } else if (loadedPlugin.version !== depVersion) {
        issues.push(
          `Dependency ${depName} requires version ${depVersion}, but ${loadedPlugin.version} is loaded`
        )
      }
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
  }
}

/**
 * Validate plugin structure and requirements
 */
export function validatePlugin(plugin: Plugin): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate metadata
  if (!plugin.metadata) {
    errors.push('Plugin must have metadata')
  } else {
    if (!plugin.metadata.name) {
      errors.push('Plugin metadata must include a name')
    } else if (!/^[a-z0-9-]+$/.test(plugin.metadata.name)) {
      errors.push('Plugin name must be lowercase alphanumeric with hyphens only')
    }

    if (!plugin.metadata.version) {
      errors.push('Plugin metadata must include a version')
    } else if (!/^\d+\.\d+\.\d+/.test(plugin.metadata.version)) {
      errors.push('Plugin version must be a valid semantic version (e.g., 1.0.0)')
    }
  }

  // Validate commands
  if (plugin.commands) {
    for (const [name, command] of Object.entries(plugin.commands)) {
      if (!command.handler) {
        errors.push(`Command '${name}' must have a handler`)
      }

      if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push(`Command name '${name}' must be lowercase alphanumeric with hyphens only`)
      }
    }
  }

  // Validate extensions
  if (plugin.extensions) {
    for (const [path, extension] of Object.entries(plugin.extensions)) {
      if (!path.includes('.')) {
        errors.push(`Extension path '${path}' must target a specific command (e.g., 'app.build')`)
      }
    }
  }

  // Validate services
  if (plugin.services) {
    for (const [name, service] of Object.entries(plugin.services)) {
      if (typeof service === 'undefined') {
        errors.push(`Service '${name}' cannot be undefined`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
