/**
 * Plugin Registry
 * 
 * Central registry for managing loaded plugins and their interactions
 */

import { Effect } from "effect"
import type { Plugin, PluginContext, HandlerWrapper } from "@cli/plugin"
import type { CLIConfig } from "@cli/types"
import type { RegisteredPlugin, RegistryOptions } from "./types"

import { PluginStore } from "./pluginStore"
import { DependencyManager } from "./dependencyManager"
import { LifecycleManager } from "./lifecycleManager"
import { ConfigMerger } from "./configMerger"
import { ServiceCollector } from "./serviceCollector"

export class PluginRegistry {
  private store: PluginStore
  private dependencies: DependencyManager
  private lifecycle: LifecycleManager
  private configMerger: ConfigMerger
  private serviceCollector: ServiceCollector
  
  constructor(options: RegistryOptions = {}) {
    this.store = new PluginStore(options)
    this.dependencies = new DependencyManager(this.store)
    this.lifecycle = new LifecycleManager(this.store)
    this.configMerger = new ConfigMerger(this.store)
    this.serviceCollector = new ServiceCollector(this.store)
  }
  
  /**
   * Register a plugin
   */
  register(plugin: Plugin, config?: Record<string, unknown>): boolean {
    const name = plugin.metadata.name
    
    // Add to store
    const registered = this.store.add(plugin, config)
    if (!registered) {
      return false
    }
    
    // Update dependency graph
    this.dependencies.updateGraph(name)
    
    // Validate dependencies if required
    const options = this.store.getOptions()
    if (options.validateDependencies) {
      const validation = this.dependencies.validateDependencies(name)
      if (!validation.valid) {
        if (validation.missing.length > 0) {
          console.error(`Plugin '${name}' has missing dependencies: ${validation.missing.join(', ')}`)
        }
        if (validation.circular.length > 0) {
          console.error(`Plugin '${name}' has circular dependencies: ${validation.circular.join(' -> ')}`)
        }
        
        if (!options.autoEnable) {
          this.store.remove(name)
          this.dependencies.removeFromGraph(name)
          return false
        }
        
        // Disable if dependencies are invalid
        this.store.setEnabled(name, false)
      }
    }
    
    // Run install lifecycle if enabled
    if (registered.enabled) {
      this.lifecycle.install(name).then(success => {
        if (!success) {
          this.store.setEnabled(name, false)
        }
      })
    }
    
    return true
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<boolean> {
    const registered = this.store.get(name)
    if (!registered) {
      return false
    }
    
    // Check dependents
    if (registered.dependents.length > 0) {
      console.warn(`Cannot unregister plugin '${name}' - required by: ${registered.dependents.join(', ')}`)
      return false
    }
    
    // Run uninstall lifecycle
    await this.lifecycle.uninstall(name)
    
    // Remove from store and dependency graph
    this.store.remove(name)
    this.dependencies.removeFromGraph(name)
    
    return true
  }
  
  /**
   * Enable a plugin
   */
  async enable(name: string): Promise<boolean> {
    if (this.store.isEnabled(name)) {
      return true
    }
    
    // Check if we can enable
    const canEnable = this.dependencies.canEnable(name)
    if (!canEnable.canEnable) {
      console.error(`Cannot enable plugin '${name}':`, ...canEnable.reasons)
      return false
    }
    
    // Run activate lifecycle
    const activated = await this.lifecycle.activate(name)
    if (!activated) {
      return false
    }
    
    // Update state
    this.store.setEnabled(name, true)
    return true
  }
  
  /**
   * Disable a plugin
   */
  async disable(name: string): Promise<boolean> {
    if (!this.store.isEnabled(name)) {
      return false
    }
    
    // Check if we can disable
    const canDisable = this.dependencies.canDisable(name)
    if (!canDisable.canDisable) {
      console.warn(
        `Cannot disable plugin '${name}' - required by active plugins: ${canDisable.affectedPlugins.join(', ')}`
      )
      return false
    }
    
    // Run deactivate lifecycle
    await this.lifecycle.deactivate(name)
    
    // Update state
    this.store.setEnabled(name, false)
    return true
  }
  
  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return this.store.getAll()
  }
  
  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return this.store.getEnabled()
  }
  
  /**
   * Get plugin by name
   */
  get(name: string): Plugin | null {
    return this.store.getPlugin(name)
  }
  
  /**
   * Check if plugin is registered
   */
  has(name: string): boolean {
    return this.store.has(name)
  }
  
  /**
   * Check if plugin is enabled
   */
  isEnabled(name: string): boolean {
    return this.store.isEnabled(name)
  }
  
  /**
   * Apply plugins to CLI configuration
   */
  applyCLIConfig(config: CLIConfig): CLIConfig {
    return this.configMerger.applyCLIConfig(config)
  }
  
  /**
   * Get all handler wrappers from enabled plugins
   */
  getHandlerWrappers(): HandlerWrapper[] {
    return this.serviceCollector.getHandlerWrappers()
  }
  
  /**
   * Get all services provided by enabled plugins
   */
  getServices(): Record<string, unknown> {
    return this.serviceCollector.getServices()
  }
  
  /**
   * Get plugin dependency order (topological sort)
   */
  getDependencyOrder(): string[] {
    return this.dependencies.getDependencyOrder()
  }
}

// Export types
export type { RegisteredPlugin, RegistryOptions, PluginDependencyGraph } from "./types"

/**
 * Create a plugin registry with Effect integration
 */
export const createPluginRegistry = (options?: RegistryOptions) =>
  Effect.sync(() => new PluginRegistry(options))

/**
 * Register plugin as an Effect
 */
export const registerPlugin = (
  registry: PluginRegistry,
  plugin: Plugin,
  config?: Record<string, unknown>
) =>
  Effect.sync(() => registry.register(plugin, config))