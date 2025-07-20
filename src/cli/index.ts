/**
 * CLI Framework Module - Complete command-line interface framework
 * 
 * This module provides a comprehensive CLI framework built on the TUIX architecture,
 * offering type-safe command definition, plugin extensibility, lazy loading,
 * and sophisticated argument parsing with validation.
 * 
 * ## Key Components:
 * 
 * ### Core System
 * - **Types**: Complete type system for CLI applications
 * - **Config**: Configuration management with validation
 * - **Parser**: Argument parsing with schema validation
 * - **Router**: Command routing and execution
 * 
 * ### Plugin Architecture
 * - **Plugin**: Extensible plugin system with lifecycle management
 * - **Registry**: Plugin registration and discovery
 * - **Hooks**: Lifecycle hooks for cross-cutting concerns
 * 
 * ### Performance Features
 * - **Lazy Loading**: On-demand command loading for faster startup
 * - **Lazy Cache**: Intelligent caching for lazy-loaded commands
 * - **Loader**: Dynamic module loading and resolution
 * 
 * ### User Experience
 * - **Help**: Automatic help generation and formatting
 * - **Runner**: Application execution and lifecycle management
 * - **Testing**: Utilities for testing CLI applications
 * 
 * @example
 * ```typescript
 * import { defineConfig, runCLI } from '@/cli'
 * 
 * const config = defineConfig({
 *   name: 'myapp',
 *   version: '1.0.0',
 *   commands: {
 *     build: {
 *       description: 'Build the application',
 *       handler: async () => console.log('Building...')
 *     }
 *   }
 * })
 * 
 * runCLI(config)
 * ```
 * 
 * @module cli
 */

// =============================================================================
// Core System
// =============================================================================

/** Complete type system for CLI applications */
export type {
  CLIConfig,
  CommandConfig,
  ParsedArgs,
  Handler,
  LazyHandler,
  Plugin,
  CLIContext,
  PluginReference,
  CommandExtension
} from "./types"

/** Configuration management with validation and merging */
export {
  defineConfig,
  defineCommand,
  lazyLoad,
  commonOptions,
  commonArgs
} from "./config"

/** Argument parsing with schema validation */
export { CLIParser } from "./parser"

/** Command routing and execution management */
export { CLIRouter, CommandSuggestions } from "./router"

// =============================================================================
// Plugin Architecture
// =============================================================================

/** Extensible plugin system with lifecycle management */
export {
  definePlugin,
  createPlugin,
  checkPluginCompatibility,
  composePlugins,
  validatePlugin,
  PluginManager,
  createPluginManager,
  PluginBuilder,
  PluginUtils
} from "./plugin"

// Testing utilities should be imported from @tuix/testing, not from production code

/** Plugin registration and discovery */
export { PluginRegistry, createPluginRegistry } from "./registry"

/** Event-driven hook system for cross-cutting concerns */
export {
  createHooks,
  getGlobalHooks,
  createHookEvent,
  type Hooks,
  type Hook,
  type HookEvent,
  type BeforeCommandEvent,
  type AfterCommandEvent,
  type OnErrorEvent,
  type Subscription
} from "./hooks"

// =============================================================================
// User Experience
// =============================================================================

/** Automatic help generation and formatting */
export { HelpGenerator } from "./help"

/** Application execution and lifecycle management */
export { CLIRunner, runCLI, cli, ensureConfig } from "./runner"

// =============================================================================
// Performance Features
// =============================================================================

/** On-demand command loading for faster startup */
export {
  lazyLoadCommand,
  lazyLoadPlugin,
  LazyCache as LazyCommandCache,
  globalLazyCache as globalCommandCache
} from "./lazy"

/** Intelligent caching for lazy-loaded commands */
export {
  createLazyHandler,
  LazyCache,
  globalLazyCache
} from "./lazy-cache"

/** Dynamic module loading and resolution */
export { PluginLoader, createPluginLoader, loadAllPlugins, loadPluginByName } from "./loader"

// =============================================================================
// CLI Components
// =============================================================================

/** Declarative components for building CLIs */
export * from "./jsx/components"