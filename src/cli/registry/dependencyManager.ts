/**
 * Dependency Manager Module
 * 
 * Handles plugin dependency validation and resolution
 */

import type { PluginStore } from "./pluginStore"
import type { PluginDependencyGraph, DependencyValidation } from "./types"

export class DependencyManager {
  private dependencyGraph: PluginDependencyGraph = {
    nodes: new Map(),
    edges: new Map()
  }
  
  constructor(private store: PluginStore) {}
  
  /**
   * Validate dependencies for a plugin
   */
  validateDependencies(pluginName: string): DependencyValidation {
    const registered = this.store.get(pluginName)
    if (!registered) {
      return { valid: false, missing: [pluginName], circular: [] }
    }
    
    const missing = this.getMissingDependencies(registered.dependencies)
    const circular = this.detectCircularDependencies(pluginName)
    
    return {
      valid: missing.length === 0 && circular.length === 0,
      missing,
      circular
    }
  }
  
  /**
   * Get missing dependencies
   */
  getMissingDependencies(dependencies: string[]): string[] {
    return dependencies.filter(dep => !this.store.has(dep))
  }
  
  /**
   * Update dependency graph when a plugin is added
   */
  updateGraph(pluginName: string): void {
    const registered = this.store.get(pluginName)
    if (!registered) return
    
    // Update graph nodes and edges
    this.dependencyGraph.nodes.set(pluginName, registered)
    this.dependencyGraph.edges.set(pluginName, new Set(registered.dependencies))
    
    // Update dependents in related plugins
    for (const dep of registered.dependencies) {
      this.store.addDependent(dep, pluginName)
    }
  }
  
  /**
   * Remove plugin from dependency graph
   */
  removeFromGraph(pluginName: string): void {
    const registered = this.dependencyGraph.nodes.get(pluginName)
    
    if (registered) {
      // Remove from dependents
      for (const dep of registered.dependencies) {
        this.store.removeDependent(dep, pluginName)
      }
    }
    
    this.dependencyGraph.nodes.delete(pluginName)
    this.dependencyGraph.edges.delete(pluginName)
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
      
      const registered = this.store.get(name)
      if (registered) {
        for (const dep of registered.dependencies) {
          visit(dep)
        }
        order.push(name)
      }
    }
    
    for (const name of this.store.getNames()) {
      visit(name)
    }
    
    return order
  }
  
  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(pluginName: string): string[] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const circular: string[] = []
    
    const detectCycle = (name: string, path: string[] = []): boolean => {
      visited.add(name)
      recursionStack.add(name)
      path.push(name)
      
      const dependencies = this.dependencyGraph.edges.get(name) || new Set()
      
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (detectCycle(dep, [...path])) {
            return true
          }
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep)
          circular.push(...path.slice(cycleStart))
          return true
        }
      }
      
      recursionStack.delete(name)
      return false
    }
    
    detectCycle(pluginName)
    return circular
  }
  
  /**
   * Check if enabling a plugin would create issues
   */
  canEnable(pluginName: string): { canEnable: boolean; reasons: string[] } {
    const reasons: string[] = []
    const validation = this.validateDependencies(pluginName)
    
    if (validation.missing.length > 0) {
      reasons.push(`Missing dependencies: ${validation.missing.join(', ')}`)
    }
    
    if (validation.circular.length > 0) {
      reasons.push(`Circular dependencies detected: ${validation.circular.join(' -> ')}`)
    }
    
    return {
      canEnable: reasons.length === 0,
      reasons
    }
  }
  
  /**
   * Check if disabling a plugin would affect others
   */
  canDisable(pluginName: string): { canDisable: boolean; affectedPlugins: string[] } {
    const activeDependents = this.store.getActiveDependents(pluginName)
    
    return {
      canDisable: activeDependents.length === 0,
      affectedPlugins: activeDependents
    }
  }
}