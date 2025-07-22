/**
 * Load Config Component
 */

import { getGlobalConfig } from "@jsx/config/stores/configStore"

/**
 * JSX component for loading config from file
 */
export interface LoadConfigProps {
  file: string
  required?: boolean
  children?: JSX.Element | JSX.Element[]
}

/**
 * Component that loads configuration from a file
 * 
 * @example
 * ```tsx
 * <LoadConfig file="./config.json" required>
 *   <App />
 * </LoadConfig>
 * ```
 */
export function LoadConfig(props: LoadConfigProps): JSX.Element | null {
  const config = getGlobalConfig()
  
  // Load the file asynchronously
  config.loadFile(props.file).catch(error => {
    if (props.required) {
      throw error
    }
    console.warn(`Failed to load config file ${props.file}:`, error)
  })
  
  return props.children ? <>{props.children}</> : null
}