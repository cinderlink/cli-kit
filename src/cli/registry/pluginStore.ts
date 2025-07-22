/**
 * Plugin Store Module
 * 
 * Manages storage and retrieval of registered plugins
 */

import type { Plugin } from "@cli/plugin"
import type { RegisteredPlugin, RegistryOptions } from "./types"

export class PluginStore {
  private plugins: Map<string, RegisteredPlugin> = new Map()
  private options: Required<RegistryOptions>
  
  constructor(options: RegistryOptions = {}) {
    this.options = {
      autoEnable: options.autoEnable ?? true,
      validateDependencies: options.validateDependencies ?? true,
      allowDuplicates: options.allowDuplicates ?? false
    }
  }
  
  /**
   * Get registry options
   */
  getOptions(): Required<RegistryOptions> {
    return { ...this.options }
  }
  
  /**
   * Add a plugin to the store
   */
  add(plugin: Plugin, config?: Record<string, unknown>): RegisteredPlugin | null {
    const name = plugin.metadata.name
    
    // Check for duplicates
    if (this.has(name) && !this.options.allowDuplicates) {
      console.warn(`Plugin '${name}' is already registered`)
      return null
    }
    
    // Create registration entry
    const registered: RegisteredPlugin = {
      plugin,
      enabled: this.options.autoEnable,
      loadTime: new Date(),
      dependencies: this.extractDependencies(plugin),
      dependents: [],
      config
    }
    
    // Add to store
    this.plugins.set(name, registered)
    return registered
  }
  
  /**
   * Remove a plugin from the store
   */
  remove(name: string): boolean {
    return this.plugins.delete(name)
  }
  
  /**
   * Get a registered plugin by name
   */
  get(name: string): RegisteredPlugin | null {
    return this.plugins.get(name) || null
  }
  
  /**
   * Get the plugin instance by name
   */
  getPlugin(name: string): Plugin | null {
    return this.plugins.get(name)?.plugin || null
  }
  
  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }
  
  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values())
  }
  
  /**
   * Get all plugin names
   */
  getNames(): string[] {
    return Array.from(this.plugins.keys())
  }
  
  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(reg => reg.enabled)
      .map(reg => reg.plugin)
  }
  
  /**
   * Check if a plugin is enabled
   */
  isEnabled(name: string): boolean {
    return this.plugins.get(name)?.enabled || false
  }
  
  /**
   * Set plugin enabled state
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const registered = this.plugins.get(name)
    if (!registered) return false
    
    registered.enabled = enabled
    return true
  }
  
  /**
   * Update plugin dependents
   */
  addDependent(pluginName: string, dependentName: string): void {
    const registered = this.plugins.get(pluginName)
    if (registered && !registered.dependents.includes(dependentName)) {
      registered.dependents.push(dependentName)
    }
  }
  
  /**
   * Remove plugin dependent
   */
  removeDependent(pluginName: string, dependentName: string): void {
    const registered = this.plugins.get(pluginName)
    if (registered) {
      registered.dependents = registered.dependents.filter(d => d !== dependentName)
    }
  }
  
  /**
   * Get active dependents of a plugin
   */
  getActiveDependents(name: string): string[] {
    const registered = this.plugins.get(name)
    if (!registered) return []
    
    return registered.dependents.filter(dep => this.isEnabled(dep))
  }
  
  /**
   * Extract dependencies from plugin metadata
   */
  private extractDependencies(plugin: Plugin): string[] {
    const deps = plugin.metadata.dependencies || {}
    const peerDeps = plugin.metadata.peerDependencies || {}
    
    return [
      ...Object.keys(deps),
      ...Object.keys(peerDeps)
    ]
  }
}