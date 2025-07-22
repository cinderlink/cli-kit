/**
 * Plugin System Public API
 * 
 * Re-exports all plugin-related functionality
 */

// Type definitions
export * from "./types"

// Plugin definition and creation
export {
  definePlugin,
  createPlugin,
  PluginBuilder,
  createPluginFromBuilder,
  jsxToPlugin
} from "./define"

// Plugin validation
export {
  validatePlugin,
  checkPluginCompatibility
} from "./validation"

// Plugin management
export {
  PluginManager,
  createPluginManager
} from "./manager"

// Dependency resolution
export {
  resolvePluginDependencies,
  checkDependencies,
  getPluginDependents
} from "./dependencies"

// Middleware functions
export {
  createMiddlewareFromPlugins,
  createMiddlewareChain,
  combineMiddleware
} from "./middleware"

// Utility functions
export {
  deepMerge,
  mergePluginConfigs,
  composePlugins,
  PluginUtils
} from "./utils"