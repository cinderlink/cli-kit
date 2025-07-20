/**
 * Plugin Registry
 * 
 * Central registry for managing loaded plugins and their interactions
 */

import { Effect, Ref } from "effect"
import type { Plugin, PluginContext, HandlerWrapper } from "./plugin"
import type { CommandConfig, CLIConfig, Handler } from "./types"

export interface RegisteredPlugin {
  plugin: Plugin
  enabled: boolean
  loadTime: Date
  dependencies: string[]
  dependents: string[]
  config?: Record<string, unknown>
}

export interface RegistryOptions {
  autoEnable?: boolean
  validateDependencies?: boolean
  allowDuplicates?: boolean
}

export interface PluginDependencyGraph {
  nodes: Map<string, RegisteredPlugin>
  edges: Map<string, Set<string>>
}

export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map()
  private options: Required<RegistryOptions>
  private dependencyGraph: PluginDependencyGraph = {
    nodes: new Map(),
    edges: new Map()
  }
  
  constructor(options: RegistryOptions = {}) {
    this.options = {
      autoEnable: options.autoEnable ?? true,
      validateDependencies: options.validateDependencies ?? true,
      allowDuplicates: options.allowDuplicates ?? false
    }
  }
  
  /**
   * Register a plugin
   */
  register(plugin: Plugin, config?: Record<string, unknown>): boolean {
    const name = plugin.metadata.name
    
    // Check for duplicates
    if (this.plugins.has(name) && !this.options.allowDuplicates) {
      console.warn(`Plugin '${name}' is already registered`)
      return false
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
    
    // Validate dependencies if required
    if (this.options.validateDependencies) {
      const missingDeps = this.getMissingDependencies(registered.dependencies)
      if (missingDeps.length > 0) {
        console.error(`Plugin '${name}' has missing dependencies: ${missingDeps.join(', ')}`)
        if (!this.options.autoEnable) {
          return false
        }
        registered.enabled = false
      }
    }
    
    // Add to registry
    this.plugins.set(name, registered)
    this.updateDependencyGraph(name, registered)
    
    // Run install lifecycle if enabled
    if (registered.enabled && plugin.install) {
      const context = this.createPluginContext(name)
      try {
        const result = plugin.install(context)
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Plugin '${name}' install failed:`, error)
            registered.enabled = false
          })
        }
      } catch (error) {
        console.error(`Plugin '${name}' install failed:`, error)
        registered.enabled = false
      }
    }
    
    return true
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<boolean> {
    const registered = this.plugins.get(name)
    
    if (!registered) {
      return false
    }
    
    // Check dependents
    if (registered.dependents.length > 0) {
      console.warn(`Cannot unregister plugin '${name}' - required by: ${registered.dependents.join(', ')}`)
      return false
    }
    
    // Run uninstall lifecycle
    if (registered.plugin.uninstall) {
      const context = this.createPluginContext(name)
      try {
        await registered.plugin.uninstall(context)
      } catch (error) {
        console.error(`Plugin '${name}' uninstall error:`, error)
      }
    }
    
    // Remove from registry
    this.plugins.delete(name)
    this.removeDependencyGraph(name)
    
    return true
  }
  
  /**
   * Enable a plugin
   */
  async enable(name: string): Promise<boolean> {
    const registered = this.plugins.get(name)
    
    if (!registered) {
      return false
    }
    
    if (registered.enabled) {
      return true
    }
    
    // Check dependencies
    const missingDeps = this.getMissingDependencies(registered.dependencies)
    if (missingDeps.length > 0) {
      console.error(`Cannot enable plugin '${name}' - missing dependencies: ${missingDeps.join(', ')}`)
      return false
    }
    
    // Run activate lifecycle
    if (registered.plugin.activate) {
      const context = this.createPluginContext(name)
      try {
        await registered.plugin.activate(context)
      } catch (error) {
        console.error(`Plugin '${name}' activation failed:`, error)
        return false
      }
    }
    
    registered.enabled = true
    return true
  }
  
  /**
   * Disable a plugin
   */
  async disable(name: string): Promise<boolean> {
    const registered = this.plugins.get(name)
    
    if (!registered || !registered.enabled) {
      return false
    }
    
    // Check if other plugins depend on this
    const activeDependents = registered.dependents.filter(dep => 
      this.plugins.get(dep)?.enabled
    )
    
    if (activeDependents.length > 0) {
      console.warn(`Cannot disable plugin '${name}' - required by active plugins: ${activeDependents.join(', ')}`)
      return false
    }
    
    // Run deactivate lifecycle
    if (registered.plugin.deactivate) {
      const context = this.createPluginContext(name)
      try {
        await registered.plugin.deactivate(context)
      } catch (error) {
        console.error(`Plugin '${name}' deactivation error:`, error)
      }
    }
    
    registered.enabled = false
    return true
  }
  
  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values())
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
   * Get plugin by name
   */
  get(name: string): Plugin | null {
    return this.plugins.get(name)?.plugin || null
  }
  
  /**
   * Check if plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }
  
  /**
   * Check if plugin is enabled
   */
  isEnabled(name: string): boolean {
    return this.plugins.get(name)?.enabled || false
  }
  
  /**
   * Apply plugins to CLI configuration
   */
  applyCLIConfig(config: CLIConfig): CLIConfig {
    const enabledPlugins = this.getEnabled()
    
    // Deep clone the config
    const modifiedConfig = JSON.parse(JSON.stringify(config))
    
    // Merge commands from plugins
    for (const plugin of enabledPlugins) {
      if (plugin.commands) {
        Object.assign(modifiedConfig.commands || {}, plugin.commands)
      }
    }
    
    // Apply command extensions
    for (const plugin of enabledPlugins) {
      if (plugin.extensions) {
        for (const [commandPath, extension] of Object.entries(plugin.extensions)) {
          const command = this.findCommand(modifiedConfig, commandPath.split('.'))
          
          if (command) {
            // Merge options
            if (extension.options) {
              Object.assign(command.options || {}, extension.options)
            }
            
            // Merge args
            if (extension.args) {
              Object.assign(command.args || {}, extension.args)
            }
            
            // Wrap handler
            if (extension.wrapper && command.handler) {
              const originalHandler = command.handler
              const pluginContext = this.createPluginContext(plugin.metadata.name)
              command.handler = extension.wrapper(originalHandler, pluginContext)
            }
          }
        }
      }
    }
    
    
    return modifiedConfig
  }
  
  /**
   * Get all handler wrappers from enabled plugins
   */
  getHandlerWrappers(): HandlerWrapper[] {
    return this.getEnabled()
      .filter(plugin => plugin.extensions)
      .flatMap(plugin => 
        Object.values(plugin.extensions || {})
          .filter(ext => ext.wrapper)
          .map(ext => ext.wrapper!)
      )
  }
  
  /**
   * Get all services provided by enabled plugins
   */
  getServices(): Record<string, unknown> {
    const services: Record<string, unknown> = {}
    
    for (const plugin of this.getEnabled()) {
      if (plugin.services) {
        Object.assign(services, plugin.services)
      }
    }
    
    return services
  }
  
  /**
   * Get plugin dependency order (topological sort)
   */
  getDependencyOrder(): string[] {
    const visited = new Set<string>()
    const order: string[] = []
    
    const visit = (name: string) => {
      if (visited.has(name)) return
      
      visited.add(name)
      
      const registered = this.plugins.get(name)
      if (registered) {
        for (const dep of registered.dependencies) {
          visit(dep)
        }
        order.push(name)
      }
    }
    
    for (const name of this.plugins.keys()) {
      visit(name)
    }
    
    return order
  }
  
  // Private helper methods
  
  private extractDependencies(plugin: Plugin): string[] {
    return Object.keys(plugin.metadata.dependencies || {})
      .concat(Object.keys(plugin.metadata.peerDependencies || {}))
  }
  
  private getMissingDependencies(dependencies: string[]): string[] {
    return dependencies.filter(dep => !this.plugins.has(dep))
  }
  
  private createPluginContext(name: string): PluginContext {
    const registered = this.plugins.get(name)!
    
    return {
      command: [],
      config: registered.config || {},
      plugins: this.getEnabled(),
      metadata: registered.plugin.metadata
    }
  }
  
  private updateDependencyGraph(name: string, registered: RegisteredPlugin) {
    this.dependencyGraph.nodes.set(name, registered)
    this.dependencyGraph.edges.set(name, new Set(registered.dependencies))
    
    // Update dependents
    for (const dep of registered.dependencies) {
      const depRegistered = this.plugins.get(dep)
      if (depRegistered) {
        depRegistered.dependents.push(name)
      }
    }
  }
  
  private removeDependencyGraph(name: string) {
    const registered = this.dependencyGraph.nodes.get(name)
    
    if (registered) {
      // Remove from dependents
      for (const dep of registered.dependencies) {
        const depRegistered = this.plugins.get(dep)
        if (depRegistered) {
          depRegistered.dependents = depRegistered.dependents.filter(d => d !== name)
        }
      }
    }
    
    this.dependencyGraph.nodes.delete(name)
    this.dependencyGraph.edges.delete(name)
  }
  
  private findCommand(config: CLIConfig, path: string[]): CommandConfig | null {
    let commands = config.commands || {}
    let command: CommandConfig | null = null
    
    for (const segment of path) {
      command = commands[segment] || null
      if (!command) return null
      
      commands = command.commands || {}
    }
    
    return command
  }
  
}

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