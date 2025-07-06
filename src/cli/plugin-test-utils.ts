/**
 * Plugin Testing Utilities
 * 
 * Provides utilities for testing CLI plugins
 */

import { Effect } from "effect"
import type { Plugin } from "./types"
import type { PluginContext } from "./plugin"
import type { CLIConfig, ParsedArgs } from "./types"
import { CLIParser } from "./parser"
import { CLIRouter } from "./router"

/**
 * Mock plugin context for testing
 */
export function createMockPluginContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    command: [],
    config: {},
    plugins: [],
    metadata: { name: "test", version: "1.0.0" },
    services: new Map(),
    logger: {
      log: (...args: any[]) => console.log(...args),
      error: (...args: any[]) => console.error(...args),
      warn: (...args: any[]) => console.warn(...args),
      debug: (...args: any[]) => console.debug(...args)
    },
    ...overrides
  }
}

/**
 * Test a plugin's installation
 */
export async function testPluginInstall(
  plugin: Plugin | any,
  context?: PluginContext
): Promise<void> {
  const ctx = context || createMockPluginContext()
  
  if (plugin.install) {
    // Handle both simple Plugin (no context) and full Plugin (with context)
    if (plugin.install.length === 0) {
      await plugin.install()
    } else {
      await plugin.install(ctx)
    }
  }
}

/**
 * Test a plugin's uninstallation
 */
export async function testPluginUninstall(
  plugin: Plugin | any,
  context?: PluginContext
): Promise<void> {
  const ctx = context || createMockPluginContext()
  
  if (plugin.uninstall) {
    // Handle both simple Plugin (no context) and full Plugin (with context)
    if (plugin.uninstall.length === 0) {
      await plugin.uninstall()
    } else {
      await plugin.uninstall(ctx)
    }
  }
}

/**
 * Test a plugin command
 */
export async function testPluginCommand(
  plugin: Plugin | any, // Accept both plugin types
  commandPath: string[],
  args: Record<string, any> = {}
): Promise<any> {
  // Find the command in the plugin
  let commands = plugin.commands || {}
  let handler: any = null
  
  for (const cmd of commandPath) {
    const cmdConfig = commands[cmd]
    if (!cmdConfig) {
      throw new Error(`Command not found: ${commandPath.join(' ')}`)
    }
    
    if (commandPath.indexOf(cmd) === commandPath.length - 1) {
      handler = cmdConfig.handler
    } else {
      commands = cmdConfig.commands || {}
    }
  }
  
  if (!handler) {
    throw new Error(`No handler found for command: ${commandPath.join(' ')}`)
  }
  
  // Execute the handler
  return await handler(args)
}

/**
 * Test plugin hooks
 */
export interface HookTestResult {
  called: boolean
  args: any[]
  error?: Error
}

export async function testPluginHook(
  plugin: Plugin | any,
  hookName: string, // Use string instead of keyof for compatibility
  ...args: any[]
): Promise<HookTestResult> {
  const result: HookTestResult = {
    called: false,
    args: []
  }
  
  const hook = (plugin as any).hooks?.[hookName]
  if (!hook) {
    return result
  }
  
  try {
    await (hook as Function)(...args)
    result.called = true
    result.args = args
  } catch (error) {
    result.called = true
    result.args = args
    result.error = error as Error
  }
  
  return result
}

/**
 * Test plugin middleware
 */
export async function testPluginMiddleware(
  plugin: Plugin | any,
  middlewareName: string, // Use string instead of keyof for compatibility
  ...args: any[]
): Promise<HookTestResult> {
  const result: HookTestResult = {
    called: false,
    args: []
  }
  
  const middleware = (plugin as any).middleware?.[middlewareName]
  if (!middleware) {
    return result
  }
  
  try {
    await (middleware as Function)(...args)
    result.called = true
    result.args = args
  } catch (error) {
    result.called = true
    result.args = args
    result.error = error as Error
  }
  
  return result
}

/**
 * Create a test CLI with a plugin
 */
export function createTestCLI(
  baseConfig: CLIConfig,
  plugins: Plugin[]
): CLIConfig {
  const enhanced = { ...baseConfig }
  
  // Merge commands
  enhanced.commands = { ...baseConfig.commands }
  for (const plugin of plugins) {
    if (plugin.commands) {
      enhanced.commands = { ...enhanced.commands, ...plugin.commands }
    }
  }
  
  // Chain hooks
  const originalHooks = baseConfig.hooks || {}
  enhanced.hooks = {}
  
  for (const hookName of ['beforeCommand', 'afterCommand', 'onError'] as const) {
    const handlers: any[] = []
    
    if (originalHooks[hookName]) {
      handlers.push(originalHooks[hookName])
    }
    
    for (const plugin of plugins) {
      if ((plugin as any).hooks?.[hookName]) {
        handlers.push((plugin as any).hooks[hookName])
      }
      if ((plugin as any).middleware?.[hookName]) {
        handlers.push((plugin as any).middleware[hookName])
      }
    }
    
    if (handlers.length > 0) {
      enhanced.hooks[hookName] = async (...args: any[]) => {
        for (const handler of handlers) {
          await handler(...args)
        }
      }
    }
  }
  
  return enhanced
}

/**
 * Parse and execute a command with plugins
 */
export async function executeWithPlugins(
  config: CLIConfig,
  plugins: Plugin[],
  argv: string[]
): Promise<any> {
  const enhancedConfig = createTestCLI(config, plugins)
  const parser = new CLIParser(enhancedConfig)
  const router = new CLIRouter(enhancedConfig)
  
  const parsedArgs = parser.parse(argv)
  const route = router.route(parsedArgs)
  
  if (!route.handler) {
    throw new Error(`Unknown command: ${parsedArgs.command.join(' ')}`)
  }
  
  // Execute hooks
  if (enhancedConfig.hooks?.beforeCommand) {
    await enhancedConfig.hooks.beforeCommand(parsedArgs.command, parsedArgs)
  }
  
  try {
    const result = await router.executeHandler(
      route.handler,
      { ...parsedArgs.args, ...parsedArgs.options },
      route.isLazy
    )
    
    if (enhancedConfig.hooks?.afterCommand) {
      await enhancedConfig.hooks.afterCommand(parsedArgs.command, parsedArgs, result)
    }
    
    return result
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    if (enhancedConfig.hooks?.onError) {
      await enhancedConfig.hooks.onError(errorObj, parsedArgs.command, parsedArgs)
    }
    throw error
  }
}

/**
 * Mock service for testing plugin service providers
 */
export function createMockService<T>(implementation: T): T {
  return implementation
}

/**
 * Test plugin service registration
 */
export function testServiceRegistration(
  plugin: Plugin | any, // Accept both plugin types
  context?: PluginContext
): Map<string, any> {
  const ctx = context || createMockPluginContext()
  const services = new Map<string, any>()
  
  // Mock the provideService function
  const originalProvideService = (ctx as any).provideService
  ;(ctx as any).provideService = (name: string, service: any) => {
    services.set(name, service)
  }
  
  // Run plugin installation to register services
  if (plugin.install) {
    // Handle both simple Plugin (no context) and full Plugin (with context)
    if (plugin.install.length === 0) {
      plugin.install()
    } else {
      plugin.install(ctx)
    }
  }
  
  // Restore original
  if (originalProvideService) {
    ;(ctx as any).provideService = originalProvideService
  }
  
  return services
}