/**
 * Configuration Hooks for JSX
 * 
 * Note: These are synchronous accessors since JSX doesn't have
 * React-style hooks. They simply access the global config store.
 */

import { getGlobalConfig } from "@jsx/config/stores/configStore"
import type { Config, ConfigObject } from "@config/types"

/**
 * Get configuration instance
 */
export function useConfig(): Config {
  return getGlobalConfig()
}

/**
 * Get a specific config value
 */
export function useConfigValue<T = any>(key: string, defaultValue?: T): T {
  const config = getGlobalConfig()
  return config.getOrDefault(key, defaultValue as T)
}

/**
 * Get multiple config values
 */
export function useConfigValues<T extends Record<string, any>>(
  keys: string[]
): T {
  const config = getGlobalConfig()
  const values: any = {}
  
  for (const key of keys) {
    values[key] = config.get(key)
  }
  
  return values as T
}

/**
 * Get all config values as object
 */
export function useConfigObject(): ConfigObject {
  const config = getGlobalConfig()
  return config.toObject()
}

/**
 * Helper to create typed config accessors
 */
export function createTypedConfig<T extends ConfigObject>() {
  return {
    useConfig: (): Config => getGlobalConfig(),
    useValue: <K extends keyof T>(key: K): T[K] | undefined => {
      const config = getGlobalConfig()
      return config.get(String(key)) as T[K] | undefined
    },
    useValues: (): T => {
      const config = getGlobalConfig()
      return config.toObject() as T
    }
  }
}