/**
 * Plugin Component System - JSX-based plugin registration and configuration
 * 
 * This module provides a comprehensive component system for plugin registration
 * and configuration using JSX patterns. Enables the kitchen-sink demo patterns
 * like <ProcessManagerPlugin as="pm" /> with full React-like lifecycle management.
 * 
 * ## Key Features:
 * 
 * ### Plugin Components
 * - JSX-based plugin registration with props
 * - Plugin customization via component props
 * - Plugin composition and dependencies
 * - Integration with existing TUIX component system
 * 
 * ### Plugin Context
 * - Plugin provider for dependency injection
 * - Context-based plugin access
 * - Plugin lifecycle management
 * - Plugin state management
 * 
 * ### Component Integration
 * - Seamless integration with TUIX components
 * - Plugin-aware component rendering
 * - Component-level plugin configuration
 * - Plugin event handling
 * 
 * @example
 * ```tsx
 * import { PluginProvider, ProcessManagerPlugin } from './components'
 * 
 * // Plugin registration with JSX
 * <PluginProvider>
 *   <ProcessManagerPlugin 
 *     as="pm"
 *     processWrapper={({ children, process }) => (
 *       <CustomLayout>{children}</CustomLayout>
 *     )}
 *     onProcessStart={(process) => console.log('Started:', process.name)}
 *   />
 * </PluginProvider>
 * 
 * // Plugin composition
 * <PluginProvider>
 *   <ProcessManagerPlugin as="pm" />
 *   <LoggerPlugin />
 *   <ThemePlugin />
 * </PluginProvider>
 * ```
 * 
 * @module core/plugin/components
 */

import { Effect, Context, Ref, Map as IMap } from "effect"
import { createContext, useContext, useEffect, useState, ReactNode, createElement } from "react"
import type {
  Plugin,
  PluginProps,
  PluginComponent,
  PluginContext,
  PluginProviderProps,
  PluginError,
  ProcessManagerPluginProps,
  ProcessWrapperProps,
  ProcessInfo,
} from "./types"
import { createPluginRegistry } from "./registry"
import { createHookManager } from "./hooks"
import { createSignalManager } from "./signals"

// =============================================================================
// Plugin Context Implementation
// =============================================================================

/**
 * Plugin context for React components
 */
interface PluginReactContext {
  readonly plugins: Map<string, Plugin>
  readonly registerPlugin: (plugin: Plugin) => Promise<void>
  readonly unregisterPlugin: (name: string) => Promise<void>
  readonly getPlugin: (name: string) => Plugin | undefined
  readonly isPluginRegistered: (name: string) => boolean
  readonly emitSignal: <T>(signalName: string, data: T) => Promise<void>
  readonly subscribeToSignal: <T>(signalName: string, handler: (data: T) => void) => () => void
}

/**
 * React context for plugin system
 */
const PluginReactContextInstance = createContext<PluginReactContext | null>(null)

/**
 * Plugin context service for Effect.ts
 */
const PluginContextService = Context.GenericTag<PluginContext>("PluginContext")

// =============================================================================
// Plugin Provider Component
// =============================================================================

/**
 * Plugin provider component for managing plugin registration and context
 */
export function PluginProvider({ children, plugins = [] }: PluginProviderProps): JSX.Element {
  const [pluginMap, setPluginMap] = useState<Map<string, Plugin>>(new Map())
  const [registry, setRegistry] = useState<any>(null)
  const [hookManager, setHookManager] = useState<any>(null)
  const [signalManager, setSignalManager] = useState<any>(null)

  // Initialize plugin system
  useEffect(() => {
    const initializePluginSystem = async () => {
      try {
        const pluginRegistry = await Effect.runPromise(createPluginRegistry())
        const hooks = await Effect.runPromise(createHookManager())
        const signals = await Effect.runPromise(createSignalManager())

        setRegistry(pluginRegistry)
        setHookManager(hooks)
        setSignalManager(signals)

        // Register initial plugins
        for (const plugin of plugins) {
          await Effect.runPromise(pluginRegistry.register(plugin))
          setPluginMap(prev => new Map(prev.set(plugin.name, plugin)))
        }
      } catch (error) {
        console.error('Failed to initialize plugin system:', error)
      }
    }

    initializePluginSystem()
  }, [plugins])

  const registerPlugin = async (plugin: Plugin): Promise<void> => {
    if (!registry) throw new Error('Plugin registry not initialized')
    
    try {
      await Effect.runPromise(registry.register(plugin))
      setPluginMap(prev => new Map(prev.set(plugin.name, plugin)))
    } catch (error) {
      console.error('Failed to register plugin:', error)
      throw error
    }
  }

  const unregisterPlugin = async (name: string): Promise<void> => {
    if (!registry) throw new Error('Plugin registry not initialized')
    
    try {
      await Effect.runPromise(registry.unregister(name))
      setPluginMap(prev => {
        const newMap = new Map(prev)
        newMap.delete(name)
        return newMap
      })
    } catch (error) {
      console.error('Failed to unregister plugin:', error)
      throw error
    }
  }

  const getPlugin = (name: string): Plugin | undefined => {
    return pluginMap.get(name)
  }

  const isPluginRegistered = (name: string): boolean => {
    return pluginMap.has(name)
  }

  const emitSignal = async <T>(signalName: string, data: T): Promise<void> => {
    if (!signalManager) throw new Error('Signal manager not initialized')
    
    try {
      await Effect.runPromise(signalManager.emit(signalName, data))
    } catch (error) {
      console.error('Failed to emit signal:', error)
      throw error
    }
  }

  const subscribeToSignal = <T>(signalName: string, handler: (data: T) => void): (() => void) => {
    if (!signalManager) throw new Error('Signal manager not initialized')
    
    let subscription: any = null
    
    const effectHandler = Effect.succeed((data: T) => {
      handler(data)
    })
    
    Effect.runPromise(signalManager.subscribe(signalName, effectHandler))
      .then(sub => {
        subscription = sub
      })
      .catch(error => {
        console.error('Failed to subscribe to signal:', error)
      })
    
    return () => {
      if (subscription && signalManager) {
        Effect.runPromise(signalManager.unsubscribe(subscription))
          .catch(error => {
            console.error('Failed to unsubscribe from signal:', error)
          })
      }
    }
  }

  const contextValue: PluginReactContext = {
    plugins: pluginMap,
    registerPlugin,
    unregisterPlugin,
    getPlugin,
    isPluginRegistered,
    emitSignal,
    subscribeToSignal,
  }

  return createElement(
    PluginReactContextInstance.Provider,
    { value: contextValue },
    children
  )
}

// =============================================================================
// Plugin Hooks
// =============================================================================

/**
 * Hook to access plugin context
 */
export function usePluginContext(): PluginReactContext {
  const context = useContext(PluginReactContextInstance)
  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider')
  }
  return context
}

/**
 * Hook to access a specific plugin
 */
export function usePlugin(name: string): Plugin | undefined {
  const context = usePluginContext()
  return context.getPlugin(name)
}

/**
 * Hook to check if a plugin is registered
 */
export function useIsPluginRegistered(name: string): boolean {
  const context = usePluginContext()
  return context.isPluginRegistered(name)
}

/**
 * Hook to emit signals from components
 */
export function useSignalEmitter() {
  const context = usePluginContext()
  return context.emitSignal
}

/**
 * Hook to subscribe to signals from components
 */
export function useSignalSubscription<T>(
  signalName: string,
  handler: (data: T) => void,
  deps: any[] = []
): void {
  const context = usePluginContext()
  
  useEffect(() => {
    const unsubscribe = context.subscribeToSignal(signalName, handler)
    return unsubscribe
  }, deps)
}

// =============================================================================
// Plugin Registration Component
// =============================================================================

/**
 * Generic plugin registration component
 */
export function PluginRegistrar({ plugin, children }: { plugin: Plugin; children?: ReactNode }): JSX.Element {
  const context = usePluginContext()
  const [isRegistered, setIsRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const registerPlugin = async () => {
      try {
        await context.registerPlugin(plugin)
        setIsRegistered(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register plugin')
        setIsRegistered(false)
      }
    }

    registerPlugin()

    return () => {
      context.unregisterPlugin(plugin.name).catch(err => {
        console.error('Failed to unregister plugin during cleanup:', err)
      })
    }
  }, [plugin, context])

  if (error) {
    return createElement('div', { 
      style: { color: 'red', padding: '8px', border: '1px solid red' } 
    }, `Plugin Error: ${error}`)
  }

  if (!isRegistered) {
    return createElement('div', { 
      style: { color: 'yellow', padding: '8px' } 
    }, 'Loading plugin...')
  }

  return createElement('div', {}, children)
}

// =============================================================================
// Process Manager Plugin Component
// =============================================================================

/**
 * Process manager plugin component matching kitchen-sink demo patterns
 */
export function ProcessManagerPlugin(props: ProcessManagerPluginProps): JSX.Element {
  const {
    as = 'process-manager',
    processWrapper,
    onProcessStart,
    onProcessStop,
    onProcessError,
    maxProcesses = 10,
    autoRestart = false,
    ...otherProps
  } = props

  const context = usePluginContext()
  const [processes, setProcesses] = useState<ProcessInfo[]>([])

  // Create the plugin instance
  const plugin: Plugin = {
    name: as,
    version: '1.0.0',
    metadata: {
      name: as,
      version: '1.0.0',
      description: 'Process manager plugin for TUIX',
      category: 'system',
    },
    init: Effect.succeed(void 0),
    destroy: Effect.succeed(void 0),
    hooks: {
      'process:start': {
        before: Effect.succeed(void 0),
        after: Effect.succeed(void 0),
      },
      'process:stop': {
        before: Effect.succeed(void 0),
        after: Effect.succeed(void 0),
      },
    },
    signals: {
      'process:started': {
        name: 'process:started',
        description: 'Emitted when a process starts',
      },
      'process:stopped': {
        name: 'process:stopped',
        description: 'Emitted when a process stops',
      },
      'process:error': {
        name: 'process:error',
        description: 'Emitted when a process encounters an error',
      },
    },
    Component: ProcessManagerPlugin,
    services: {
      processManager: {
        startProcess: async (config: any) => {
          const process: ProcessInfo = {
            id: crypto.randomUUID(),
            name: config.name,
            command: config.command,
            args: config.args || [],
            status: 'running',
            startTime: new Date(),
          }

          setProcesses(prev => [...prev, process])
          onProcessStart?.(process)
          
          await context.emitSignal('process:started', process)
          return process
        },
        stopProcess: async (id: string) => {
          setProcesses(prev => prev.map(p => 
            p.id === id ? { ...p, status: 'stopped' as const, endTime: new Date() } : p
          ))
          
          const process = processes.find(p => p.id === id)
          if (process) {
            const stoppedProcess = { ...process, status: 'stopped' as const, endTime: new Date() }
            onProcessStop?.(stoppedProcess)
            await context.emitSignal('process:stopped', stoppedProcess)
          }
        },
        listProcesses: () => processes,
        getProcess: (id: string) => processes.find(p => p.id === id),
      },
    },
  }

  // Subscribe to process signals
  useSignalSubscription<ProcessInfo>('process:started', (process) => {
    console.log(`Process started: ${process.name}`)
  }, [])

  useSignalSubscription<ProcessInfo>('process:stopped', (process) => {
    console.log(`Process stopped: ${process.name}`)
  }, [])

  useSignalSubscription<ProcessInfo>('process:error', (process) => {
    console.error(`Process error: ${process.name}`)
    onProcessError?.(process, new Error('Process error'))
  }, [])

  // Render process list
  const renderProcesses = () => {
    return processes.map(process => {
      const processElement = createElement('div', {
        key: process.id,
        style: {
          padding: '8px',
          border: '1px solid #ccc',
          margin: '4px 0',
          backgroundColor: process.status === 'running' ? '#e8f5e8' : '#f5f5f5',
        }
      }, [
        createElement('div', { key: 'name' }, `Name: ${process.name}`),
        createElement('div', { key: 'status' }, `Status: ${process.status}`),
        createElement('div', { key: 'command' }, `Command: ${process.command}`),
        createElement('div', { key: 'pid' }, process.pid ? `PID: ${process.pid}` : 'PID: N/A'),
      ])

      if (processWrapper) {
        return processWrapper({ children: processElement, process })
      }

      return processElement
    })
  }

  return createElement(PluginRegistrar, { plugin }, [
    createElement('div', { key: 'header', style: { fontWeight: 'bold', marginBottom: '8px' } }, 
      `Process Manager (${as})`
    ),
    createElement('div', { key: 'processes' }, renderProcesses()),
    createElement('div', { key: 'controls', style: { marginTop: '8px' } }, [
      createElement('button', {
        key: 'add',
        onClick: () => {
          const processManager = plugin.services?.processManager as any
          processManager?.startProcess({
            name: `process-${Date.now()}`,
            command: 'echo',
            args: ['Hello World'],
          })
        },
        style: { marginRight: '8px' }
      }, 'Add Process'),
      createElement('div', { key: 'info' }, 
        `Running: ${processes.filter(p => p.status === 'running').length}/${maxProcesses}`
      ),
    ]),
  ])
}

// =============================================================================
// Plugin Component Factory
// =============================================================================

/**
 * Create a plugin component from a plugin definition
 */
export function createPluginComponent(plugin: Plugin): PluginComponent {
  return function PluginComponent(props: PluginProps): JSX.Element {
    const { as = plugin.name, ...otherProps } = props
    
    const pluginInstance = {
      ...plugin,
      name: as,
      metadata: {
        ...plugin.metadata,
        name: as,
      },
    }

    return createElement(PluginRegistrar, { plugin: pluginInstance }, [
      createElement('div', { key: 'plugin-wrapper' }, [
        createElement('div', { key: 'plugin-name' }, `Plugin: ${as}`),
        createElement('div', { key: 'plugin-version' }, `Version: ${plugin.version}`),
        plugin.metadata.description && createElement('div', { key: 'plugin-description' }, plugin.metadata.description),
      ])
    ])
  }
}

// =============================================================================
// Plugin Component Utilities
// =============================================================================

/**
 * Higher-order component to make any component plugin-aware
 */
export function withPlugin<P extends object>(
  Component: React.ComponentType<P>,
  pluginName: string
): React.ComponentType<P> {
  return function PluginAwareComponent(props: P): JSX.Element {
    const plugin = usePlugin(pluginName)
    const isRegistered = useIsPluginRegistered(pluginName)
    
    if (!isRegistered) {
      return createElement('div', { style: { color: 'red' } }, 
        `Plugin ${pluginName} is not registered`
      )
    }

    return createElement(Component, { ...props, plugin })
  }
}

/**
 * Component to conditionally render based on plugin availability
 */
export function PluginConditional({ 
  pluginName, 
  children, 
  fallback 
}: { 
  pluginName: string
  children: ReactNode
  fallback?: ReactNode 
}): JSX.Element {
  const isRegistered = useIsPluginRegistered(pluginName)
  
  if (!isRegistered) {
    return createElement('div', {}, fallback || 
      createElement('div', { style: { color: 'gray' } }, 
        `Plugin ${pluginName} not available`
      )
    )
  }

  return createElement('div', {}, children)
}

/**
 * Plugin status indicator component
 */
export function PluginStatus({ pluginName }: { pluginName: string }): JSX.Element {
  const plugin = usePlugin(pluginName)
  const isRegistered = useIsPluginRegistered(pluginName)
  
  return createElement('div', {
    style: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      backgroundColor: isRegistered ? '#e8f5e8' : '#f5e8e8',
      color: isRegistered ? '#2d5d2d' : '#5d2d2d',
      border: `1px solid ${isRegistered ? '#4a7c4a' : '#7c4a4a'}`,
    }
  }, [
    createElement('span', { key: 'name' }, pluginName),
    createElement('span', { key: 'status', style: { marginLeft: '8px' } }, 
      isRegistered ? 'Active' : 'Inactive'
    ),
    plugin && createElement('span', { key: 'version', style: { marginLeft: '8px' } }, 
      `v${plugin.version}`
    ),
  ])
}

// =============================================================================
// Plugin Development Utilities
// =============================================================================

/**
 * Plugin development helper for creating custom plugin components
 */
export function createCustomPluginComponent(
  name: string,
  version: string,
  renderFunction: (props: PluginProps, context: PluginReactContext) => JSX.Element
): PluginComponent {
  return function CustomPluginComponent(props: PluginProps): JSX.Element {
    const context = usePluginContext()
    const { as = name, ...otherProps } = props
    
    const plugin: Plugin = {
      name: as,
      version,
      metadata: {
        name: as,
        version,
        description: `Custom plugin: ${as}`,
      },
      init: Effect.succeed(void 0),
      destroy: Effect.succeed(void 0),
      hooks: {},
      signals: {},
    }

    return createElement(PluginRegistrar, { plugin }, 
      renderFunction({ as, ...otherProps }, context)
    )
  }
}

/**
 * Plugin debug component for development
 */
export function PluginDebug(): JSX.Element {
  const context = usePluginContext()
  const plugins = Array.from(context.plugins.values())
  
  return createElement('div', {
    style: {
      padding: '16px',
      border: '2px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      fontFamily: 'monospace',
      fontSize: '12px',
    }
  }, [
    createElement('h3', { key: 'title' }, 'Plugin Debug Info'),
    createElement('div', { key: 'count' }, `Total plugins: ${plugins.length}`),
    createElement('div', { key: 'plugins' }, plugins.map(plugin => 
      createElement('div', {
        key: plugin.name,
        style: { padding: '8px', margin: '4px 0', backgroundColor: '#fff' }
      }, [
        createElement('div', { key: 'name' }, `Name: ${plugin.name}`),
        createElement('div', { key: 'version' }, `Version: ${plugin.version}`),
        createElement('div', { key: 'hooks' }, `Hooks: ${Object.keys(plugin.hooks).length}`),
        createElement('div', { key: 'signals' }, `Signals: ${Object.keys(plugin.signals).length}`),
      ])
    )),
  ])
}

// =============================================================================
// Export Public API
// =============================================================================

export {
  PluginReactContextInstance as PluginContext,
  PluginContextService,
}

export type {
  PluginReactContext,
}