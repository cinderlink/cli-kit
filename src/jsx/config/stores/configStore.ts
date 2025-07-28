/**
 * Configuration Store for JSX
 *
 * Global configuration state management
 */

import type { Config } from '@config/types'

// Global config instance for JSX components
let globalConfig: Config | null = null

/**
 * Set the global config instance
 */
export function setGlobalConfig(config: Config): void {
  globalConfig = config
}

/**
 * Get the global config instance
 */
export function getGlobalConfig(): Config {
  if (!globalConfig) {
    throw new Error('No global config set. Call setGlobalConfig() first or use ConfigProvider')
  }
  return globalConfig
}

/**
 * Check if config is initialized
 */
export function hasGlobalConfig(): boolean {
  return globalConfig !== null
}
