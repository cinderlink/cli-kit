/**
 * Service Collector Module
 * 
 * Collects services and handler wrappers from enabled plugins
 */

import type { HandlerWrapper } from "@cli/plugin"
import type { PluginStore } from "./pluginStore"

export class ServiceCollector {
  constructor(private store: PluginStore) {}
  
  /**
   * Get all handler wrappers from enabled plugins
   */
  getHandlerWrappers(): HandlerWrapper[] {
    const wrappers: HandlerWrapper[] = []
    
    for (const plugin of this.store.getEnabled()) {
      if (plugin.wrappers && Array.isArray(plugin.wrappers)) {
        wrappers.push(...plugin.wrappers)
      }
    }
    
    return wrappers
  }
  
  /**
   * Get all services provided by enabled plugins
   */
  getServices(): Record<string, unknown> {
    const services: Record<string, unknown> = {}
    
    for (const plugin of this.store.getEnabled()) {
      if (plugin.services && typeof plugin.services === 'object') {
        Object.assign(services, plugin.services)
      }
    }
    
    return services
  }
  
  /**
   * Get service by name
   */
  getService(name: string): unknown | null {
    for (const plugin of this.store.getEnabled()) {
      if (plugin.services && name in plugin.services) {
        return plugin.services[name]
      }
    }
    
    return null
  }
  
  /**
   * Check if a service exists
   */
  hasService(name: string): boolean {
    return this.getService(name) !== null
  }
  
  /**
   * Get all service names
   */
  getServiceNames(): string[] {
    const names = new Set<string>()
    
    for (const plugin of this.store.getEnabled()) {
      if (plugin.services) {
        Object.keys(plugin.services).forEach(name => names.add(name))
      }
    }
    
    return Array.from(names)
  }
  
  /**
   * Get services grouped by plugin
   */
  getServicesByPlugin(): Map<string, Record<string, unknown>> {
    const serviceMap = new Map<string, Record<string, unknown>>()
    
    for (const plugin of this.store.getEnabled()) {
      if (plugin.services) {
        serviceMap.set(plugin.metadata.name, plugin.services)
      }
    }
    
    return serviceMap
  }
}