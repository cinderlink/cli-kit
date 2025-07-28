/**
 * Load Config Component
 */

import { getGlobalConfig } from '@jsx/config/stores/configStore'
import { createConsoleLogger } from '@logger/index'
import { Effect } from 'effect'

const logger = createConsoleLogger('warn')

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
    Effect.runSync(
      logger.warn(`Failed to load config file ${props.file}`, {
        file: props.file,
        error: error instanceof Error ? error.message : String(error),
      })
    )
  })

  return props.children ? <>{props.children}</> : null
}
