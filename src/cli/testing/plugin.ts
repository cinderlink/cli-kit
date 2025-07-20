/**
 * Plugin Testing Utilities
 * 
 * Provides utilities for testing CLI plugins
 */

import { Effect } from "effect"
import type { Plugin, PluginContext } from "../plugin"
import type { CLIConfig, ParsedArgs } from "../types"
import { CLIParser } from "../parser"
import { CLIRouter } from "../router"

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
      log: (...args: unknown[]) => console.log(...args),
      error: (...args: unknown[]) => console.error(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      debug: (...args: unknown[]) => console.debug(...args)
    },
    ...overrides
  }
}

/**
 * Test a plugin's installation
 */
export async function testPluginInstall(
  plugin: Plugin,
  context?: PluginContext
): Promise<void> {
  const ctx = context || createMockPluginContext()
  
  if (plugin.install) {
    // Plugin install always expects context according to Plugin interface
    await plugin.install(ctx)
  }
}

/**
 * Test a plugin's uninstallation
 */
export async function testPluginUninstall(
  plugin: Plugin,
  context?: PluginContext
): Promise<void> {
  const ctx = context || createMockPluginContext()
  
  if (plugin.uninstall) {
    // Plugin uninstall always expects context according to Plugin interface
    await plugin.uninstall(ctx)
  }
}

/**
 * Test a plugin command
 */
export async function testPluginCommand(
  plugin: Plugin,
  commandPath: string[],
  args: Record<string, unknown> = {}
): Promise<unknown> {
  // Find the command in the plugin
  let commands = plugin.commands || {}
  let handler: unknown = null
  
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
  args: unknown[]
  error?: Error
}

export async function testPluginHook(
  plugin: Plugin,
  hookName: string, // Use string instead of keyof for compatibility
  ...args: unknown[]
): Promise<HookTestResult> {
  // Hooks have been removed from plugins - use event-driven hooks instead
  return {
    called: false,
    args: []
  }
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
  
  // Hooks have been removed - use event-driven hooks instead
  
  return enhanced
}

/**
 * Parse and execute a command with plugins
 */
export async function executeWithPlugins(
  config: CLIConfig,
  plugins: Plugin[],
  argv: string[]
): Promise<unknown> {
  const enhancedConfig = createTestCLI(config, plugins)
  const parser = new CLIParser(enhancedConfig)
  const router = new CLIRouter(enhancedConfig)
  
  const parsedArgs = parser.parse(argv)
  const route = router.route(parsedArgs)
  
  if (!route.handler) {
    throw new Error(`Unknown command: ${parsedArgs.command.join(' ')}`)
  }
  
  // Use event-driven hooks instead of legacy hooks
  
  try {
    const result = await router.executeHandler(
      route.handler,
      { ...parsedArgs.args, ...parsedArgs.options },
      route.isLazy
    )
    
    // Use event-driven hooks instead of legacy hooks
    
    return result
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    // Use event-driven hooks instead of legacy hooks
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
  plugin: Plugin, // Accept both plugin types
  context?: PluginContext
): Map<string, unknown> {
  const ctx = context || createMockPluginContext()
  const services = new Map<string, unknown>()
  
  // Mock the provideService function
  const originalProvideService = (ctx as unknown as Record<string, unknown>).provideService
  ;(ctx as unknown as Record<string, unknown>).provideService = (name: string, service: unknown) => {
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
    ;(ctx as unknown as Record<string, unknown>).provideService = originalProvideService
  }
  
  return services
}