/**
 * Plugin System - Main index file for the TUIX plugin system
 * 
 * This module provides the complete plugin system for TUIX including
 * plugin registration, lifecycle management, hooks, signals, components,
 * error handling, and built-in plugins.
 * 
 * @example
 * ```typescript
 * import { 
 *   createPluginRegistry, 
 *   createPlugin,
 *   PluginProvider,
 *   ProcessManagerPlugin,
 *   loggerPlugin 
 * } from '@tuix/core/plugin'
 * 
 * // Create plugin registry
 * const registry = await Effect.runPromise(createPluginRegistry())
 * 
 * // Register built-in plugins
 * await Effect.runPromise(registry.register(loggerPlugin))
 * 
 * // Use plugin components
 * <PluginProvider>
 *   <ProcessManagerPlugin as="pm" />
 * </PluginProvider>
 * ```
 * 
 * @module core/plugin
 */

// =============================================================================
// Core Plugin Types
// =============================================================================

export type {
  // Plugin interfaces
  Plugin,
  PluginMetadata,
  PluginProps,
  PluginComponent,
  PluginContext,
  PluginProviderProps,
  PluginConfig,
  PluginSystemConfig,
  PluginBuilderConfig,
  PluginSchemaType,
  
  // Hook types
  Hook,
  HookContext,
  HookRegistration,
  HookManager,
  HookName,
  
  // Signal types
  Signal,
  SignalHandler,
  SignalManager,
  SignalRegistration,
  Subscription,
  SignalName,
  
  // Registry types
  PluginRegistry,
  PluginLoader,
  
  // Process types
  ProcessInfo,
  ProcessManagerPluginProps,
  ProcessWrapperProps,
  
  // Error types
  PluginError,
  PluginLoadError,
  PluginDependencyError,
  HookError,
  SignalError,
  
  // Service contexts
  PluginDeps,
} from './types'

// =============================================================================
// Plugin Creation and Utilities
// =============================================================================

export {
  // Plugin creation
  createPlugin,
  PluginSchema,
  PluginConfigSchema,
  PluginSystemConfigSchema,
  
  // Plugin dependencies
  PluginDepsService,
  PluginContextService,
  
  // Hook names and signal names
  HookNames,
  SignalNames,
} from './types'

// =============================================================================
// Plugin Registry
// =============================================================================

export {
  createPluginRegistry,
  createPluginLoader,
  createPluginSystemManager,
} from './registry'

// =============================================================================
// Hook System
// =============================================================================

export {
  createHookManager,
  createBeforeHook,
  createAfterHook,
  createAroundHook,
  createLoggingHook,
  createTimingHook,
  createValidationHook,
  HookContext,
  getCurrentHookContext,
  getCurrentHookName,
  getCurrentPluginName,
  getCurrentHookArgs,
  HOOK_NAMES,
  isValidHookName,
  getStandardHookNames,
  getHookNamesByCategory,
} from './hooks'

// =============================================================================
// Signal System
// =============================================================================

export {
  createSignalManager,
  createSignal,
  createSimpleSignal,
  createSignalHandler,
  createEffectSignalHandler,
  createFilteredSignalHandler,
  createMappedSignalHandler,
  createDebouncedSignalHandler,
  createThrottledSignalHandler,
  StandardSignals,
  SIGNAL_NAMES,
  isValidSignalName,
  getStandardSignalNames,
  getSignalNamesByCategory,
} from './signals'

// =============================================================================
// Plugin Components
// =============================================================================

export {
  PluginProvider,
  PluginRegistrar,
  ProcessManagerPlugin,
  usePluginContext,
  usePlugin,
  useIsPluginRegistered,
  useSignalEmitter,
  useSignalSubscription,
  createPluginComponent,
  withPlugin,
  PluginConditional,
  PluginStatus,
  createCustomPluginComponent,
  PluginDebug,
  PluginContext,
  PluginContextService,
} from './components'

export type {
  PluginReactContext,
} from './components'

// =============================================================================
// Built-in Plugins
// =============================================================================

export {
  // Process Manager Plugin
  createProcessManagerPlugin,
  processManagerPlugin,
  ProcessManagerUtils,
  
  // Logger Plugin
  createLoggerPlugin,
  loggerPlugin,
  LoggerUtils,
  LogLevel,
  
  // Theme Plugin
  createThemePlugin,
  themePlugin,
  ThemeUtils,
  defaultLightTheme,
  defaultDarkTheme,
  highContrastTheme,
  
  // Plugin collections
  BuiltInPlugins,
  getAllBuiltInPlugins,
  getBuiltInPluginsByCategory,
  BuiltInPluginUtils,
} from './builtin'

export type {
  // Process Manager types
  ProcessConfig,
  ProcessManagerService,
  
  // Logger types
  LoggerConfig,
  LogEntry,
  LoggerService,
  
  // Theme types
  ThemeConfig,
  Theme,
  ColorPalette,
  ThemeService,
} from './builtin'

// =============================================================================
// Error Handling
// =============================================================================

export {
  createErrorRecoveryService,
  createPluginHealthMonitor,
  createPluginErrorBoundary,
  ErrorRecoveryStrategy,
  ErrorSeverity,
  PluginHealthStatus,
  PluginErrorUtils,
  ErrorRecoveryServiceContext,
  PluginHealthMonitorContext,
  PluginErrorBoundaryContext,
  ErrorHandlingLayer,
} from './errors'

export type {
  ErrorRecoveryConfig,
  PluginHealthMetrics,
  ErrorReport,
  ErrorBoundaryConfig,
  ErrorRecoveryService,
  PluginHealthMonitor,
  PluginErrorBoundary,
} from './errors'

// =============================================================================
// Testing Utilities
// =============================================================================

export {
  createMockPlugin,
  createMockPlugins,
  createPluginTestUtils,
  TestFixtures,
  TestHelpers,
  PluginAssertions,
  TestDataGenerators,
  PluginTestSuite,
} from './__tests__/test-utils'

// =============================================================================
// Plugin System Factory
// =============================================================================

/**
 * Create a complete plugin system with all components
 */
export async function createPluginSystem(config: Partial<PluginSystemConfig> = {}) {
  const { Effect } = await import("effect")
  
  const registry = await Effect.runPromise(createPluginRegistry())
  const hookManager = await Effect.runPromise(createHookManager())
  const signalManager = await Effect.runPromise(createSignalManager())
  const loader = await Effect.runPromise(createPluginLoader())
  
  return {
    registry,
    hookManager,
    signalManager,
    loader,
    
    // Convenience methods
    registerPlugin: (plugin: Plugin) => Effect.runPromise(registry.register(plugin)),
    unregisterPlugin: (name: string) => Effect.runPromise(registry.unregister(name)),
    loadPlugin: (path: string) => Effect.runPromise(loader.load(path)),
    
    // Built-in plugins
    builtInPlugins: {
      processManager: processManagerPlugin,
      logger: loggerPlugin,
      theme: themePlugin,
    },
    
    // Register all built-in plugins
    registerBuiltInPlugins: async () => {
      await Effect.runPromise(registry.register(processManagerPlugin))
      await Effect.runPromise(registry.register(loggerPlugin))
      await Effect.runPromise(registry.register(themePlugin))
    },
  }
}

// =============================================================================
// Plugin System Configuration
// =============================================================================

/**
 * Default plugin system configuration
 */
export const DEFAULT_PLUGIN_SYSTEM_CONFIG: PluginSystemConfig = {
  pluginDir: './plugins',
  autoLoad: true,
  enableHotReload: false,
  maxPlugins: 100,
  plugins: [],
}

/**
 * Plugin system initialization helper
 */
export async function initializePluginSystem(config: Partial<PluginSystemConfig> = {}) {
  const finalConfig = { ...DEFAULT_PLUGIN_SYSTEM_CONFIG, ...config }
  const pluginSystem = await createPluginSystem(finalConfig)
  
  // Auto-register built-in plugins
  await pluginSystem.registerBuiltInPlugins()
  
  // Auto-load plugins from directory if enabled
  if (finalConfig.autoLoad && finalConfig.pluginDir) {
    try {
      const pluginPaths = await Effect.runPromise(
        pluginSystem.loader.discover(finalConfig.pluginDir)
      )
      
      for (const path of pluginPaths) {
        try {
          const plugin = await pluginSystem.loadPlugin(path)
          await pluginSystem.registerPlugin(plugin)
        } catch (error) {
          console.warn(`Failed to load plugin from ${path}:`, error)
        }
      }
    } catch (error) {
      console.warn('Failed to discover plugins:', error)
    }
  }
  
  return pluginSystem
}

// =============================================================================
// Plugin System Version
// =============================================================================

/**
 * Plugin system version information
 */
export const PLUGIN_SYSTEM_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  version: '1.0.0',
  name: 'TUIX Plugin System',
  description: 'Comprehensive plugin system for TUIX TUI framework',
} as const

// =============================================================================
// Plugin System Health Check
// =============================================================================

/**
 * Check plugin system health
 */
export async function checkPluginSystemHealth() {
  const pluginSystem = await createPluginSystem()
  
  const health = {
    version: PLUGIN_SYSTEM_VERSION.version,
    timestamp: new Date().toISOString(),
    components: {
      registry: true,
      hookManager: true,
      signalManager: true,
      loader: true,
      builtInPlugins: true,
    },
    plugins: {
      registered: 0,
      active: 0,
      errors: 0,
    },
    performance: {
      registrationTime: 0,
      hookExecutionTime: 0,
      signalEmissionTime: 0,
    },
  }
  
  try {
    // Check registered plugins
    const plugins = await Effect.runPromise(pluginSystem.registry.list())
    health.plugins.registered = plugins.length
    health.plugins.active = plugins.filter(p => p.metadata.name).length
    
    // Performance checks
    const startTime = performance.now()
    
    // Test plugin registration
    const testPlugin = createPlugin({
      name: 'health-check-plugin',
      version: '1.0.0',
      description: 'Health check test plugin',
    })
    
    await pluginSystem.registerPlugin(testPlugin)
    health.performance.registrationTime = performance.now() - startTime
    
    // Test hook execution
    const hookStartTime = performance.now()
    await Effect.runPromise(pluginSystem.hookManager.executeBefore('test:hook'))
    health.performance.hookExecutionTime = performance.now() - hookStartTime
    
    // Test signal emission
    const signalStartTime = performance.now()
    await Effect.runPromise(pluginSystem.signalManager.emit('test:signal', {}))
    health.performance.signalEmissionTime = performance.now() - signalStartTime
    
    // Cleanup
    await pluginSystem.unregisterPlugin(testPlugin.name)
    
  } catch (error) {
    health.plugins.errors++
    console.error('Plugin system health check failed:', error)
  }
  
  return health
}

// =============================================================================
// Re-export Effect for convenience
// =============================================================================

export { Effect } from "effect"