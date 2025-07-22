/**
 * Plugin Manager
 * 
 * Manages plugin lifecycle and registration
 */

import type { Plugin, PluginContext } from "./types"
import { validatePlugin } from "./validation"
import { resolvePluginDependencies } from "./dependencies"
import { mergePluginConfigs } from "./utils"
import type { CLIConfig } from "@cli/types"

/**
 * Plugin manager for handling plugin lifecycle
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private activatedPlugins: Set<string> = new Set()
  private context: PluginContext

  constructor(context: PluginContext) {
    this.context = context
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    const validation = validatePlugin(plugin)
    if (!validation.valid) {
      throw new Error(`Plugin validation failed:\n${validation.errors.join('\n')}`)
    }

    const name = plugin.metadata.name
    
    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`)
    }

    this.plugins.set(name, plugin)
    this.context.plugins.set(name, plugin.metadata)

    // Run install hook if present
    if (plugin.install) {
      await plugin.install(this.context)
    }
  }

  /**
   * Activate a plugin
   */
  async activate(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`)
    }

    if (this.activatedPlugins.has(name)) {
      return // Already activated
    }

    // Activate dependencies first
    if (plugin.metadata.dependencies) {
      for (const depName of Object.keys(plugin.metadata.dependencies)) {
        await this.activate(depName)
      }
    }

    // Run activate hook
    if (plugin.activate) {
      await plugin.activate(this.context)
    }

    this.activatedPlugins.add(name)
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`)
    }

    if (!this.activatedPlugins.has(name)) {
      return // Not activated
    }

    // Run deactivate hook
    if (plugin.deactivate) {
      await plugin.deactivate(this.context)
    }

    this.activatedPlugins.delete(name)
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      return // Not registered
    }

    // Deactivate if active
    if (this.activatedPlugins.has(name)) {
      await this.deactivate(name)
    }

    // Run uninstall hook
    if (plugin.uninstall) {
      await plugin.uninstall(this.context)
    }

    this.plugins.delete(name)
    this.context.plugins.delete(name)
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get activated plugins
   */
  getActivatedPlugins(): Plugin[] {
    return Array.from(this.activatedPlugins)
      .map(name => this.plugins.get(name)!)
      .filter(Boolean)
  }

  /**
   * Get merged CLI configuration from all plugins
   */
  getMergedConfig(): CLIConfig {
    const configs = this.getActivatedPlugins()
      .filter(p => p.cliConfig)
      .map(p => p.cliConfig as CLIConfig)
    
    return mergePluginConfigs(this.context.config, ...configs)
  }

  /**
   * Load multiple plugins in dependency order
   */
  async loadPlugins(plugins: Plugin[]): Promise<void> {
    const ordered = resolvePluginDependencies(plugins)
    
    for (const plugin of ordered) {
      await this.register(plugin)
      await this.activate(plugin.metadata.name)
    }
  }
}

/**
 * Create a new plugin manager with context
 */
export function createPluginManager(context: PluginContext): PluginManager {
  return new PluginManager(context)
}