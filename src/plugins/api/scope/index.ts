/**
 * Plugin Scope Integration
 * 
 * Plugins are scopes with type='plugin' and additional helpers
 */

import { Effect } from 'effect'
import { scopeManager } from '@core/model/scope/manager'
import type { ScopeDef } from '@core/model/scope/types'
import { currentScopeStore, parentScopeStore } from '@core/model/scope/jsx/stores'

/**
 * Get all plugin scopes from the scope tree
 */
export function getPluginScopes(): ScopeDef[] {
  return Effect.runSync(
    scopeManager.getAllScopes().pipe(
      Effect.map(scopes => scopes.filter(scope => scope.type === 'plugin'))
    )
  )
}

/**
 * Get a specific plugin scope by name
 */
export function getPluginScope(name: string): ScopeDef | undefined {
  return getPluginScopes().find(scope => scope.name === name)
}

/**
 * Check if a plugin is enabled (exists in scope tree)
 */
export function isPluginEnabled(name: string): boolean {
  return !!getPluginScope(name)
}

/**
 * Get all commands for a plugin
 */
export function getPluginCommands(pluginName: string): ScopeDef[] {
  const plugin = getPluginScope(pluginName)
  if (!plugin) return []
  
  return plugin.children.filter(child => child.type === 'command')
}

/**
 * Plugin state management using scope metadata
 */
export function getPluginState(pluginName: string, key: string, defaultValue?: any): any {
  const plugin = getPluginScope(pluginName)
  if (!plugin) return defaultValue
  
  return plugin.metadata?.[key] ?? defaultValue
}

export function setPluginState(pluginName: string, key: string, value: any): void {
  const plugin = getPluginScope(pluginName)
  if (!plugin) return
  
  Effect.runSync(
    scopeManager.updateScopeMetadata(plugin.id, {
      ...plugin.metadata,
      [key]: value
    })
  )
}

/**
 * Get plugin configuration from scope metadata
 */
export function getPluginConfig(pluginName: string): Record<string, any> {
  const plugin = getPluginScope(pluginName)
  return plugin?.metadata?.config || {}
}

/**
 * Update plugin configuration
 */
export function configurePlugin(pluginName: string, config: Record<string, any>): void {
  const plugin = getPluginScope(pluginName)
  if (!plugin) return
  
  Effect.runSync(
    scopeManager.updateScopeMetadata(plugin.id, {
      ...plugin.metadata,
      config: {
        ...plugin.metadata?.config,
        ...config
      }
    })
  )
}

/**
 * Check if we're currently within a plugin scope
 */
export function isInPluginScope(): boolean {
  let scope = currentScopeStore.get()
  while (scope) {
    if (scope.type === 'plugin') return true
    // Walk up the scope tree
    scope = parentScopeStore.get()
  }
  return false
}

/**
 * Get the current plugin scope (if any)
 */
export function getCurrentPluginScope(): ScopeDef | null {
  let scope = currentScopeStore.get()
  while (scope) {
    if (scope.type === 'plugin') return scope
    // Walk up the scope tree
    scope = parentScopeStore.get()
  }
  return null
}