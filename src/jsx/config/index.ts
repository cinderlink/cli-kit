/**
 * JSX Configuration Module
 *
 * Provides configuration integration for JSX applications
 */

// Components
export {
  ConfigProvider,
  SetConfig,
  LoadConfig,
} from './components'

export type {
  ConfigProviderProps,
  SetConfigProps,
  LoadConfigProps,
} from './components'

// Hooks
export {
  useConfig,
  useConfigValue,
  useConfigValues,
  useConfigObject,
  createTypedConfig,
} from './hooks'

// Stores
export {
  getGlobalConfig,
  setGlobalConfig,
  hasGlobalConfig,
} from './stores'

// Integration utilities
export {
  ConfigLayer,
  createJSXConfigApp,
  getConfigOptions,
} from './integration'

export type { ConfigOptionsHelper } from './integration'
