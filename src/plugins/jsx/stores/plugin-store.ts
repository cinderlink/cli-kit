/**
 * Plugin Store
 * 
 * Manages plugin state using Svelte 5 runes
 */

import { $state, $derived } from '../../../reactivity/runes'
import { Effect } from 'effect'
import { scopeManager } from '../../../scope/manager'
import type { ScopeDef } from '../../../scope/types'
import type { JSXPlugin } from '../types'

export interface PluginRegistration {
  id: string
  name: string
  version?: string
  description?: string
  enabled: boolean
  config: Record<string, any>
  plugin: JSXPlugin
}

class PluginStore {
  // State
  #plugins = $state<Map<string, PluginRegistration>>(new Map())
  #activePlugin = $state<string | null>(null)
  #loadingPlugins = $state<Set<string>>(new Set())

  // Derived state
  get all() {
    return $derived(() => Array.from(this.#plugins.values()))
  }

  get enabled() {
    return $derived(() => this.all.filter(p => p.enabled))
  }

  get disabled() {
    return $derived(() => this.all.filter(p => !p.enabled))
  }

  get activePlugin() {
    return this.#activePlugin ? this.#plugins.get(this.#activePlugin) : null
  }

  get isLoading() {
    return $derived(() => this.#loadingPlugins.size > 0)
  }

  get loadingPlugins() {
    return Array.from(this.#loadingPlugins)
  }

  get availablePlugins() {
    return $derived(() => {
      // Get plugin scopes from scope manager
      const allScopes = Effect.runSync(scopeManager.getAllScopes())
      return allScopes.filter(s => s.type === 'plugin')
    })
  }

  // Methods
  register(plugin: JSXPlugin): void {
    const registration: PluginRegistration = {
      id: plugin.id || plugin.name,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      enabled: false,
      config: {},
      plugin
    }
    
    this.#plugins.set(registration.id, registration)
  }

  unregister(id: string): void {
    this.#plugins.delete(id)
    if (this.#activePlugin === id) {
      this.#activePlugin = null
    }
  }

  enable(id: string): void {
    const plugin = this.#plugins.get(id)
    if (plugin) {
      plugin.enabled = true
      this.#plugins.set(id, { ...plugin })
    }
  }

  disable(id: string): void {
    const plugin = this.#plugins.get(id)
    if (plugin) {
      plugin.enabled = false
      this.#plugins.set(id, { ...plugin })
    }
  }

  configure(id: string, config: Record<string, any>): void {
    const plugin = this.#plugins.get(id)
    if (plugin) {
      plugin.config = { ...plugin.config, ...config }
      this.#plugins.set(id, { ...plugin })
    }
  }

  setActive(id: string | null): void {
    this.#activePlugin = id
  }

  startLoading(id: string): void {
    this.#loadingPlugins.add(id)
  }

  stopLoading(id: string): void {
    this.#loadingPlugins.delete(id)
  }

  getPlugin(id: string): PluginRegistration | undefined {
    return this.#plugins.get(id)
  }

  getPluginConfig(id: string): Record<string, any> {
    return this.#plugins.get(id)?.config || {}
  }

  hasPlugin(id: string): boolean {
    return this.#plugins.has(id)
  }

  clear(): void {
    this.#plugins.clear()
    this.#activePlugin = null
    this.#loadingPlugins.clear()
  }
}

// Export singleton instance
export const pluginStore = new PluginStore()