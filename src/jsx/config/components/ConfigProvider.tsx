/**
 * Configuration Provider Component
 */

import type { Config, ConfigObject, ConfigSchema } from "@config/types"
import { createConfig } from "@config/index"
import { setGlobalConfig } from "@jsx/config/stores/configStore"
import { createConsoleLogger } from "@logger/index"
import { Effect } from "effect"

const logger = createConsoleLogger("error")

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
 * 
 * Sets up global configuration for child components to access
 */
export function ConfigProvider(props: ConfigProviderProps): JSX.Element {
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
    createConfigAsync().catch((error) => {
      Effect.runSync(logger.error('Failed to create config', error instanceof Error ? error : undefined, {
        context: 'ConfigProvider'
      }))
    })
  }
  
  // Return children wrapped in a fragment
  return <>{props.children}</>
}