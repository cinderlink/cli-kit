/**
 * Set Config Component
 */

import { getGlobalConfig } from '@jsx/config/stores/configStore'

/**
 * JSX component for setting config values
 */
export interface SetConfigProps {
  [key: string]: any
  children?: JSX.Element | JSX.Element[]
}

/**
 * Component that sets configuration values
 *
 * @example
 * ```tsx
 * <SetConfig apiUrl="https://api.example.com" debug={true}>
 *   <App />
 * </SetConfig>
 * ```
 */
export function SetConfig(props: SetConfigProps): JSX.Element | null {
  const { children, ...configValues } = props
  const config = getGlobalConfig()

  // Set all props as config values
  for (const [key, value] of Object.entries(configValues)) {
    config.set(key, value)
  }

  return children ? <>{children}</> : null
}
