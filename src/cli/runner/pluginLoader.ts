/**
 * Plugin Loader Module
 *
 * Handles loading and initializing plugins from configuration
 */

import type { Plugin, PluginContext } from '@cli/plugin'
import type { CLIConfig } from '@cli/types'
import { Context } from 'effect'

export class PluginLoader {
  constructor(private config: CLIConfig) {}

  /**
   * Load plugins from configuration
   */
  async loadPlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = []

    if (!this.config.plugins || this.config.plugins.length === 0) {
      return plugins
    }

    for (const pluginConfig of this.config.plugins) {
      try {
        // Handle string plugin references (module names)
        if (typeof pluginConfig === 'string') {
          const plugin = await import(pluginConfig)
          if (plugin.default) {
            plugins.push(plugin.default)
          } else {
            console.warn(`Plugin ${pluginConfig} has no default export`)
          }
        }
        // Handle inline plugin objects
        else if (
          typeof pluginConfig === 'object' &&
          pluginConfig !== null &&
          'metadata' in pluginConfig
        ) {
          plugins.push(pluginConfig as Plugin)
        }
      } catch (error) {
        console.warn(`Failed to load plugin:`, error)
      }
    }

    // Initialize plugins
    await this.initializePlugins(plugins)

    return plugins
  }

  /**
   * Initialize loaded plugins
   */
  private async initializePlugins(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      if (plugin.install) {
        try {
          const context = this.createPluginContext(plugin)
          await plugin.install(context)
        } catch (error) {
          console.warn(`Failed to initialize plugin ${plugin.metadata.name}:`, error)
        }
      }
    }
  }

  /**
   * Create plugin context for initialization
   */
  private createPluginContext(plugin: Plugin): PluginContext {
    return {
      config: this.config,
      logger: console,
      storage: new Map(),
      events: new EventTarget(),
      services: Context.empty(),
      env: process.env as Record<string, string | undefined>,
      plugins: new Map([[plugin.metadata.name, plugin.metadata]]),
    }
  }

  /**
   * Validate plugin compatibility
   */
  validatePlugin(plugin: Plugin): boolean {
    // Add validation logic here if needed
    return true
  }
}
