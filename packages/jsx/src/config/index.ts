/**
 * Configuration management for JSX runtime
 * Provides basic configuration handling capabilities
 */

import { debug } from '../utils/debug'
import { deepMerge } from '../utils'

/**
 * Configuration manager interface
 */
export interface ConfigManager {
  get(key: string): any
  set(key: string, value: any): void
  has(key: string): boolean
  merge(config: any): void
  toObject(): any
}

/**
 * Simple configuration manager implementation
 */
class ConfigManagerImpl implements ConfigManager {
  private data: any = {}
  
  constructor(initialConfig: any = {}) {
    this.data = { ...initialConfig }
  }
  
  get(key: string): any {
    const keys = key.split('.')
    let current = this.data
    
    for (const k of keys) {
      if (current === null || current === undefined) return undefined
      current = current[k]
    }
    
    return current
  }
  
  set(key: string, value: any): void {
    const keys = key.split('.')
    let current = this.data
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k]
    }
    
    current[keys[keys.length - 1]] = value
    debug(`[CONFIG] Set ${key} = ${JSON.stringify(value)}`)
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined
  }
  
  merge(config: any): void {
    this.data = deepMerge(this.data, config)
    debug(`[CONFIG] Merged configuration`)
  }
  
  toObject(): any {
    return { ...this.data }
  }
}

/**
 * Global configuration state
 */
let globalConfig: ConfigManager | null = null

/**
 * Create a new configuration manager
 */
export function createConfigManager(initialConfig: any = {}): ConfigManager {
  return new ConfigManagerImpl(initialConfig)
}

/**
 * Set the global configuration manager
 */
export function setGlobalConfig(configManager: ConfigManager): void {
  globalConfig = configManager
  debug(`[CONFIG] Global config manager set`)
}

/**
 * Get the global configuration manager
 */
export function getGlobalConfig(): ConfigManager | null {
  return globalConfig
}

/**
 * Initialize configuration for a CLI app
 * Simplified implementation - in real app would load from files
 */
export function initializeConfig(appName: string): ConfigManager {
  debug(`[CONFIG] Initializing config for app: ${appName}`)
  
  // Create basic default configuration
  const defaultConfig = {
    name: appName,
    version: '1.0.0',
    services: {},
    logger: {
      level: 'info',
      format: 'pretty',
      showEmoji: true
    },
    processManager: {
      tuixDir: '.tuix',
      autoRestart: true,
      maxRestarts: 5
    }
  }
  
  const configManager = createConfigManager(defaultConfig)
  setGlobalConfig(configManager)
  
  return configManager
}

/**
 * Template utilities for configuration generation
 */
export const templates = {
  typescript: (appName: string) => `// ${appName} configuration
export default {
  name: '${appName}',
  version: '1.0.0',
  
  services: {
    dev: {
      command: 'bun run dev',
      preset: 'vite',
      group: 'development',
      autorestart: true
    }
  },
  
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true
  }
}`,

  javascript: (appName: string) => `// ${appName} configuration
module.exports = {
  name: '${appName}',
  version: '1.0.0',
  
  services: {
    dev: {
      command: 'bun run dev',
      preset: 'vite',
      group: 'development',
      autorestart: true
    }
  },
  
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true
  }
}`,

  json: (appName: string) => JSON.stringify({
    name: appName,
    version: '1.0.0',
    services: {
      dev: {
        command: 'bun run dev',
        preset: 'vite',
        group: 'development',
        autorestart: true
      }
    },
    logger: {
      level: 'info',
      format: 'pretty',
      showEmoji: true
    }
  }, null, 2)
}