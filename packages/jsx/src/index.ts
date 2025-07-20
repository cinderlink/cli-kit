/**
 * TUIX JSX Runtime - Refactored Modular Implementation
 * Main export file that provides all JSX functionality
 */

// Core JSX runtime exports
export {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement
} from './runtime'

// Types
export type { JSX, View } from './types'

// CLI building components
export {
  CLI,
  Command,
  Scope,
  Arg,
  Flag,
  Help,
  Example,
  getCurrentCLIConfig,
  resetCLIState
} from './cli'

// Plugin system
export {
  PluginRegistry,
  pluginRegistry,
  RegisterPlugin,
  EnablePlugin,
  ConfigurePlugin,
  Plugin,
  LoadPlugin
} from './plugins'

// Configuration management
export {
  createConfigManager,
  setGlobalConfig,
  getGlobalConfig,
  initializeConfig,
  templates
} from './config'

// Reactivity
export {
  isBindableRune,
  isStateRune,
  isRune,
  processBindProps,
  createReactiveProperty,
  validateReactiveProps
} from './reactivity'

// Utilities
export {
  debug,
  createDebugLogger,
  isDebugEnabled,
  normalizeChildren,
  isPlainObject,
  deepMerge,
  safeString,
  generateId,
  capitalize
} from './utils'

// View factory (for advanced usage)
export {
  text,
  vstack,
  hstack,
  styledText,
  style
} from './runtime/view-factory'

/**
 * Helper function to process JSX elements for side effects (plugin registration)
 * This is needed when we want to register plugins without actually rendering
 */
export function processJSXForSideEffects(element: JSX.Element): void {
  // In the original implementation, this would traverse the JSX tree
  // For now, it's a no-op since our JSX components handle side effects during creation
  if (!element) return
}

/**
 * JSX Context utilities for component development
 * Provides access to CLI and plugin state within JSX components
 */
export const JSXContext = {
  /**
   * Get current CLI configuration
   */
  getCLIConfig() {
    return getCurrentCLIConfig()
  },
  
  /**
   * Get global configuration
   */
  getGlobalConfig() {
    return getGlobalConfig()
  },
  
  /**
   * Check if we're in debug mode
   */
  isDebugMode(): boolean {
    return isDebugEnabled()
  },
  
  /**
   * Get enabled plugins
   */
  getEnabledPlugins() {
    return pluginRegistry.getAllEnabled()
  }
}

// Re-export important types for convenience
export type {
  BindableRune,
  StateRune
} from './types'

export type {
  PluginRegistrationOptions
} from './plugins'

export type {
  ConfigManager
} from './config'