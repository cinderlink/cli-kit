/**
 * CLI Plugin Store - CLI Integration
 *
 * Manages CLI-integrated plugin state
 */

import type { JSXPlugin } from '@cli/jsx/types'

export interface CLIPluginRegistration {
  id: string
  name: string
  version?: string
  description?: string
  enabled: boolean
  config: Record<string, any>
  plugin: JSXPlugin
}

class CLIPluginStore {
  // State
  private plugins: Map<string, CLIPluginRegistration> = new Map()
  private activePlugin: string | null = null

  // Getters
  get all(): CLIPluginRegistration[] {
    return Array.from(this.plugins.values())
  }

  get enabled(): CLIPluginRegistration[] {
    return this.all.filter(p => p.enabled)
  }

  get disabled(): CLIPluginRegistration[] {
    return this.all.filter(p => !p.enabled)
  }

  // Methods
  register(plugin: JSXPlugin): void {
    const registration: CLIPluginRegistration = {
      id: plugin.name,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      enabled: false,
      config: {},
      plugin,
    }

    this.plugins.set(registration.id, registration)
  }

  unregister(id: string): void {
    this.plugins.delete(id)
    if (this.activePlugin === id) {
      this.activePlugin = null
    }
  }

  enable(id: string): void {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.enabled = true
    }
  }

  disable(id: string): void {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.enabled = false
    }
  }

  configure(id: string, config: Record<string, any>): void {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.config = { ...plugin.config, ...config }
    }
  }

  setActive(id: string | null): void {
    this.activePlugin = id
  }

  getPlugin(id: string): CLIPluginRegistration | undefined {
    return this.plugins.get(id)
  }

  getPluginConfig(id: string): Record<string, any> {
    return this.plugins.get(id)?.config || {}
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id)
  }

  isEnabled(id: string): boolean {
    return this.plugins.get(id)?.enabled || false
  }

  listEnabled(): string[] {
    return this.enabled.map(p => p.id)
  }

  clear(): void {
    this.plugins.clear()
    this.activePlugin = null
  }
}

// Export singleton instance
export const cliPluginStore = new CLIPluginStore()
