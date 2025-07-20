/**
 * Plugin system for JSX runtime
 * Provides plugin registration and management capabilities
 */

import { debug } from '../utils/debug'
import { generateId } from '../utils'
import type { JSX } from '../types'
import { text } from '../runtime/view-factory'

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  as?: string
  alias?: string
  prefix?: string
  enabled?: boolean
  config?: Record<string, any>
}

/**
 * Simple plugin registry for JSX components
 */
export class PluginRegistry {
  private plugins: Map<string, any> = new Map()
  private configurations: Map<string, Record<string, any>> = new Map()
  private enabled: Map<string, boolean> = new Map()

  register(plugin: any, options: PluginRegistrationOptions = {}): void {
    const name = options.as || plugin.name || generateId()
    
    this.plugins.set(name, plugin)
    this.enabled.set(name, options.enabled !== false)
    
    if (options.config) {
      this.configurations.set(name, options.config)
    }
    
    // Register with alias if provided
    if (options.alias) {
      this.plugins.set(options.alias, plugin)
      this.enabled.set(options.alias, options.enabled !== false)
    }
    
    debug(`[PLUGINS] Plugin registered: ${name}${options.alias ? ` (alias: ${options.alias})` : ''}`)
  }
  
  get(name: string): any {
    return this.plugins.get(name)
  }
  
  isEnabled(name: string): boolean {
    return this.enabled.get(name) ?? false
  }
  
  enable(name: string, enabled: boolean = true): void {
    this.enabled.set(name, enabled)
    debug(`[PLUGINS] Plugin ${name} ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  configure(name: string, config: Record<string, any>): void {
    const existing = this.configurations.get(name) || {}
    this.configurations.set(name, { ...existing, ...config })
    debug(`[PLUGINS] Plugin ${name} configured`)
  }
  
  getConfig(name: string): Record<string, any> {
    return this.configurations.get(name) || {}
  }
  
  getAllEnabled(): Array<{ name: string; plugin: any; config: Record<string, any> }> {
    const enabled: Array<{ name: string; plugin: any; config: Record<string, any> }> = []
    
    for (const [name, plugin] of this.plugins.entries()) {
      if (this.isEnabled(name)) {
        enabled.push({
          name,
          plugin,
          config: this.getConfig(name)
        })
      }
    }
    
    return enabled
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry()

/**
 * RegisterPlugin component for JSX
 */
export function RegisterPlugin(props: {
  plugin: any
  as?: string
  alias?: string
  prefix?: string
  enabled?: boolean
  config?: Record<string, any>
}): JSX.Element {
  if (!props.plugin) {
    debug(`[PLUGINS] Skipping null plugin registration`)
    return text('')
  }
  
  debug(`[PLUGINS] Registering plugin via JSX: ${props.as || props.plugin.name}`)
  
  pluginRegistry.register(props.plugin, {
    as: props.as,
    alias: props.alias,
    prefix: props.prefix,
    enabled: props.enabled,
    config: props.config
  })
  
  // Plugin registration is invisible
  return text('')
}

/**
 * EnablePlugin component for JSX
 */
export function EnablePlugin(props: {
  name: string
  enabled?: boolean
  config?: Record<string, any>
}): JSX.Element {
  debug(`[PLUGINS] Enabling plugin via JSX: ${props.name}`)
  
  pluginRegistry.enable(props.name, props.enabled !== false)
  
  if (props.config) {
    pluginRegistry.configure(props.name, props.config)
  }
  
  // Plugin enabling is invisible
  return text('')
}

/**
 * ConfigurePlugin component for JSX
 */
export function ConfigurePlugin(props: {
  name: string
  config: Record<string, any>
}): JSX.Element {
  debug(`[PLUGINS] Configuring plugin via JSX: ${props.name}`)
  
  pluginRegistry.configure(props.name, props.config)
  
  // Plugin configuration is invisible
  return text('')
}

/**
 * Plugin component for declarative plugin definition
 */
export function Plugin(props: {
  name: string
  description?: string
  version?: string
  children?: JSX.Element | JSX.Element[]
}): JSX.Element {
  debug(`[PLUGINS] Defining plugin via JSX: ${props.name}`)
  
  // For now, just register the plugin with basic info
  // In a full implementation, this would handle the children to build commands
  const plugin = {
    name: props.name,
    description: props.description,
    version: props.version,
    commands: {},
    hooks: {}
  }
  
  pluginRegistry.register(plugin, { as: props.name })
  
  // Plugin definition is invisible
  return text('')
}

/**
 * LoadPlugin component for loading external plugins
 */
export function LoadPlugin(props: {
  from: any
  name?: string
  description?: string
  version?: string
}): JSX.Element {
  debug(`[PLUGINS] Loading plugin via JSX: ${props.name || 'unnamed'}`)
  
  if (!props.from) {
    throw new Error('LoadPlugin requires a "from" prop specifying the plugin to load')
  }
  
  // If the plugin is a function component, we could process it here
  // For now, just register it
  if (typeof props.from === 'function') {
    const plugin = {
      name: props.name || 'loaded-plugin',
      description: props.description,
      version: props.version,
      component: props.from
    }
    
    pluginRegistry.register(plugin, { as: props.name })
  }
  
  // Plugin loading is invisible
  return text('')
}