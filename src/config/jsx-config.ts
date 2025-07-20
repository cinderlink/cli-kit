/**
 * JSX Configuration Integration
 * 
 * Components and hooks for using configuration in JSX apps
 */

import { z } from "zod"
import { Effect } from "effect"
import type { Config, ConfigObject, ConfigSchema } from "./types"
import { createConfig } from "./config"

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
    throw new Error("No global config set. Call setGlobalConfig() first or use createJSXConfigApp()")
  }
  return globalConfig
}

/**
 * Configuration provider component props
 */
export interface ConfigProviderProps {
  config?: Config
  defaults?: ConfigObject
  schema?: ConfigSchema
  envPrefix?: string
  loadUserConfig?: boolean
  loadProjectConfig?: boolean
  children: JSX.Element | JSX.Element[]
}

/**
 * JSX Component for providing configuration context
 */
export function ConfigProvider(props: ConfigProviderProps): null {
  // Set up the global config if provided
  if (props.config) {
    setGlobalConfig(props.config)
  } else {
    // Create config from props
    const createConfigAsync = async () => {
      const builder = createConfig()
      
      if (props.defaults) builder.defaults(props.defaults)
      if (props.schema) builder.schema(props.schema)
      if (props.envPrefix) builder.envPrefix(props.envPrefix)
      if (props.loadUserConfig) builder.withUserConfig()
      if (props.loadProjectConfig) builder.withProjectConfig()
      
      const config = await builder.build()
      setGlobalConfig(config)
    }
    
    // Note: This should be called before JSX processing in real implementation
    createConfigAsync().catch(console.error)
  }
  
  // This is a setup component, doesn't render anything
  return null
}

/**
 * Get configuration (replaces useConfig hook)
 */
export function getConfig(): Config {
  return getGlobalConfig()
}

/**
 * Get a specific config value (replaces useConfigValue hook)
 */
export function getConfigValue<T = any>(key: string, defaultValue?: T): T {
  const config = getGlobalConfig()
  return config.getOrDefault(key, defaultValue as T)
}

/**
 * Get multiple config values (replaces useConfigValues hook)
 */
export function getConfigValues<T extends Record<string, any>>(
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
 * Configuration schema builder for JSX
 */
export interface ConfigFieldProps {
  name: string
  type: "string" | "number" | "boolean" | "object" | "array"
  required?: boolean
  default?: any
  description?: string
  min?: number
  max?: number
  pattern?: string
  choices?: any[]
}

/**
 * JSX Component for defining config schema
 */
export function ConfigField(props: ConfigFieldProps): null {
  // This component doesn't render anything
  // It's used to declaratively define config schema
  return null
}

/**
 * JSX Component for config definition
 */
export interface ConfigDefinitionProps {
  name?: string
  version?: string
  description?: string
  children?: JSX.Element | JSX.Element[]
}

export function ConfigDefinition(props: ConfigDefinitionProps): null {
  // This component processes its children to build a schema
  return null
}

/**
 * Integrate config with CLI options
 */
export interface ConfigOptionsHelper {
  getDefault: (key: string) => any
  applyDefaults: <T extends Record<string, any>>(options: T) => T
  validateOptions: <T extends Record<string, any>>(options: T) => T
}

export function getConfigOptions(): ConfigOptionsHelper {
  const config = getGlobalConfig()
  
  return {
    getDefault: (key: string) => {
      // Look for option defaults in config
      return config.get(`cli.defaults.${key}`)
    },
    
    applyDefaults: (options) => {
      const defaults = config.get("cli.defaults") as ConfigObject || {}
      return { ...defaults, ...options }
    },
    
    validateOptions: (options) => {
      // Validate against schema if available
      const schema = config.get("cli.schema") as any
      if (schema) {
        const result = schema.safeParse(options)
        if (!result.success) {
          throw result.error
        }
        return result.data
      }
      return options
    }
  }
}

/**
 * Effect layer for configuration
 */
export const ConfigLayer = (options?: {
  name?: string
  defaults?: ConfigObject
  schema?: ConfigSchema
  envPrefix?: string
  loadUserConfig?: boolean
  loadProjectConfig?: boolean
}) => Effect.gen(function* (_) {
  const builder = createConfig()
  
  if (options?.name) builder.name(options.name)
  if (options?.defaults) builder.defaults(options.defaults)
  if (options?.schema) builder.schema(options.schema)
  if (options?.envPrefix) builder.envPrefix(options.envPrefix)
  if (options?.loadUserConfig) builder.withUserConfig()
  if (options?.loadProjectConfig) builder.withProjectConfig()
  
  const config = yield* _(Effect.promise(() => builder.build()))
  
  return config
}).pipe(
  Effect.map(config => ({
    Config: config
  }))
)

/**
 * JSX component for setting config values
 */
export interface SetConfigProps {
  [key: string]: any
}

export function SetConfig(props: SetConfigProps): null {
  const config = getGlobalConfig()
  
  // Set all props as config values
  for (const [key, value] of Object.entries(props)) {
    if (key !== "children") {
      config.set(key, value)
    }
  }
  
  return null
}

/**
 * JSX component for loading config from file
 */
export interface LoadConfigProps {
  file: string
  required?: boolean
}

export function LoadConfig(props: LoadConfigProps): null {
  const config = getGlobalConfig()
  
  // Load the file asynchronously
  config.loadFile(props.file).catch(error => {
    if (props.required) {
      throw error
    }
    console.warn(`Failed to load config file ${props.file}:`, error)
  })
  
  return null
}

/**
 * Helper to define config schema with Zod
 */
export function defineConfigSchema<T extends ConfigSchema>(
  schema: T
): T {
  return schema
}

/**
 * Helper to create typed config accessors
 */
export function createTypedConfig<T extends ConfigObject>() {
  return {
    getConfig: (): Config => getGlobalConfig(),
    getValue: <K extends keyof T>(key: K): T[K] | undefined => {
      const config = getGlobalConfig()
      return config.get(String(key)) as T[K] | undefined
    },
    getValues: (): T => {
      const config = getGlobalConfig()
      return config.toObject() as T
    }
  }
}

/**
 * Create a JSX app with configuration
 */
export async function createJSXConfigApp(
  AppComponent: (() => JSX.Element) | JSX.Element,
  configOptions?: {
    name?: string
    defaults?: ConfigObject
    schema?: ConfigSchema
    envPrefix?: string
    loadUserConfig?: boolean
    loadProjectConfig?: boolean
  }
): Promise<{ config: Config; app: JSX.Element }> {
  // Create config
  const builder = createConfig()
  
  if (configOptions?.name) builder.name(configOptions.name)
  if (configOptions?.defaults) builder.defaults(configOptions.defaults)
  if (configOptions?.schema) builder.schema(configOptions.schema)
  if (configOptions?.envPrefix) builder.envPrefix(configOptions.envPrefix)
  if (configOptions?.loadUserConfig) builder.withUserConfig()
  if (configOptions?.loadProjectConfig) builder.withProjectConfig()
  
  const config = await builder.build()
  setGlobalConfig(config)
  
  // Get app element
  const app = typeof AppComponent === 'function' ? AppComponent() : AppComponent
  
  return { config, app }
}