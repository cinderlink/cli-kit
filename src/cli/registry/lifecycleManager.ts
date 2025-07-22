/**
 * Lifecycle Manager Module
 * 
 * Manages plugin lifecycle hooks and state transitions
 */

import type { Plugin, PluginContext } from "@cli/plugin"
import type { PluginStore } from "./pluginStore"
import { Context } from "effect"

export class LifecycleManager {
  constructor(private store: PluginStore) {}
  
  /**
   * Run install lifecycle hook
   */
  async install(pluginName: string): Promise<boolean> {
    const registered = this.store.get(pluginName)
    if (!registered) return false
    
    const plugin = registered.plugin
    if (!plugin.install) return true
    
    const context = this.createPluginContext(pluginName)
    
    try {
      await plugin.install(context)
      return true
    } catch (error) {
      console.error(`Plugin '${pluginName}' install failed:`, error)
      return false
    }
  }
  
  /**
   * Run activate lifecycle hook
   */
  async activate(pluginName: string): Promise<boolean> {
    const registered = this.store.get(pluginName)
    if (!registered) return false
    
    const plugin = registered.plugin
    if (!plugin.activate) return true
    
    const context = this.createPluginContext(pluginName)
    
    try {
      await plugin.activate(context)
      return true
    } catch (error) {
      console.error(`Plugin '${pluginName}' activation failed:`, error)
      return false
    }
  }
  
  /**
   * Run deactivate lifecycle hook
   */
  async deactivate(pluginName: string): Promise<boolean> {
    const registered = this.store.get(pluginName)
    if (!registered) return false
    
    const plugin = registered.plugin
    if (!plugin.deactivate) return true
    
    const context = this.createPluginContext(pluginName)
    
    try {
      await plugin.deactivate(context)
      return true
    } catch (error) {
      console.error(`Plugin '${pluginName}' deactivation error:`, error)
      // Continue with deactivation even if hook fails
      return true
    }
  }
  
  /**
   * Run update lifecycle hook
   */
  async update(pluginName: string, fromVersion: string): Promise<boolean> {
    const registered = this.store.get(pluginName)
    if (!registered) return false
    
    const plugin = registered.plugin
    if (!plugin.update) return true
    
    const context = this.createPluginContext(pluginName)
    
    try {
      await plugin.update(context, fromVersion)
      return true
    } catch (error) {
      console.error(`Plugin '${pluginName}' update failed:`, error)
      return false
    }
  }
  
  /**
   * Run uninstall lifecycle hook
   */
  async uninstall(pluginName: string): Promise<boolean> {
    const registered = this.store.get(pluginName)
    if (!registered) return false
    
    const plugin = registered.plugin
    if (!plugin.uninstall) return true
    
    const context = this.createPluginContext(pluginName)
    
    try {
      await plugin.uninstall(context)
      return true
    } catch (error) {
      console.error(`Plugin '${pluginName}' uninstall error:`, error)
      // Continue with uninstall even if hook fails
      return true
    }
  }
  
  /**
   * Create plugin context for lifecycle hooks
   */
  private createPluginContext(pluginName: string): PluginContext {
    const registered = this.store.get(pluginName)
    if (!registered) {
      throw new Error(`Plugin '${pluginName}' not found`)
    }
    
    // Build minimal CLI config with plugin info
    const config = {
      name: "cli-kit",
      version: "1.0.0",
      plugins: this.store.getEnabled()
    }
    
    // Create plugins map
    const pluginsMap = new Map<string, import("../plugin").PluginMetadata>()
    for (const plugin of this.store.getEnabled()) {
      pluginsMap.set(plugin.metadata.name, plugin.metadata)
    }
    
    return {
      config,
      logger: console,
      storage: new Map(),
      events: new EventTarget(),
      services: Context.empty(),
      env: process.env as Record<string, string | undefined>,
      plugins: pluginsMap
    }
  }
}