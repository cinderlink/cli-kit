/**
 * CLI Command Router
 *
 * Routes parsed commands to their handlers with support for lazy loading
 */

import type { CLIConfig, CommandConfig, ParsedArgs, Handler, LazyHandler } from '@cli/types'
import type { RouteResult, CommandHierarchy, Middleware } from './types'
import { CommandResolver } from './commandResolver'
import { HandlerExecutor } from './handlerExecutor'
import { CommandSuggestions } from './suggestions'
import { MiddlewareManager } from './middleware'
import { CommandRegistry } from './commandRegistry'
import { EventIntegration } from './eventIntegration'

export class CLIRouter {
  private resolver: CommandResolver
  private executor: HandlerExecutor
  private suggestions: CommandSuggestions
  private middleware: MiddlewareManager
  private registry: CommandRegistry
  private events: EventIntegration

  constructor(private config: CLIConfig) {
    // Initialize sub-modules
    this.resolver = new CommandResolver(config)
    this.executor = new HandlerExecutor()
    this.suggestions = new CommandSuggestions(path => this.resolver.getAvailableCommands(path))
    this.middleware = new MiddlewareManager()
    this.registry = new CommandRegistry()
    this.events = new EventIntegration()

    // Initialize with commands from config
    this.registry.initialize(config.commands || {})

    // Initialize event integration
    this.events.initialize()
  }

  /**
   * Route a parsed command to its handler
   */
  route(parsedArgs: ParsedArgs): RouteResult {
    if (parsedArgs.command.length === 0) {
      return {
        handler: null,
        config: null,
        isLazy: false,
      }
    }

    const commandConfig = this.resolver.findCommandConfig(parsedArgs.command)
    if (!commandConfig) {
      // Emit route not found event
      this.events.emitRouteNotFound(parsedArgs.command)

      return {
        handler: null,
        config: null,
        isLazy: false,
      }
    }

    const handler = commandConfig.handler
    if (!handler) {
      return {
        handler: null,
        config: commandConfig,
        isLazy: false,
      }
    }

    // Check if handler is lazy
    const isLazy = this.executor.isLazyHandler(handler)

    // Emit route found event
    this.events.emitRouteFound(parsedArgs.command, handler as Function)

    return {
      handler,
      config: commandConfig,
      isLazy,
    }
  }

  /**
   * Find command configuration for a command path
   */
  findCommandConfig(commandPath: string[]): CommandConfig | null {
    return this.resolver.findCommandConfig(commandPath)
  }

  /**
   * Get all available commands at a given path
   */
  getAvailableCommands(commandPath: string[] = []): string[] {
    return this.resolver.getAvailableCommands(commandPath)
  }

  /**
   * Get command aliases
   */
  getCommandAliases(commandName: string): string[] {
    return this.resolver.getCommandAliases(commandName)
  }

  /**
   * Resolve command name (including aliases)
   */
  resolveCommandName(name: string, currentCommands?: Record<string, CommandConfig>): string | null {
    return this.resolver.resolveCommandName(name, currentCommands)
  }

  /**
   * Execute a handler (lazy or synchronous)
   */
  async executeHandler(
    handler: Handler | LazyHandler,
    args: Record<string, unknown>,
    isLazy: boolean = false
  ): Promise<unknown> {
    return this.executor.executeHandler(handler, args, isLazy)
  }

  /**
   * Validate that a command path exists
   */
  validateCommandPath(commandPath: string[]): boolean {
    return this.resolver.validateCommandPath(commandPath)
  }

  /**
   * Get the complete command hierarchy
   */
  getCommandHierarchy(): CommandHierarchy {
    return this.buildHierarchy(this.config.commands || {}, [])
  }

  private buildHierarchy(
    commands: Record<string, CommandConfig>,
    path: string[]
  ): CommandHierarchy {
    const hierarchy: CommandHierarchy = {}

    for (const [name, config] of Object.entries(commands)) {
      const currentPath = [...path, name]

      hierarchy[name] = {
        path: currentPath,
        description: config.description,
        hasHandler: !!config.handler,
        aliases: config.aliases || [],
        hidden: config.hidden || false,
        subcommands: config.commands ? this.buildHierarchy(config.commands, currentPath) : {},
      }
    }

    return hierarchy
  }

  // =============================================================================
  // Command Management API (for test compatibility)
  // =============================================================================

  /**
   * Get all available command names
   */
  getCommands(): string[] {
    return this.registry.getCommands()
  }

  /**
   * Add a command dynamically
   */
  addCommand(name: string, config: CommandConfig): void {
    this.registry.addCommand(name, config)
  }

  /**
   * Get a specific command configuration
   */
  getCommand(name: string): CommandConfig | null {
    return this.registry.getCommand(name)
  }

  /**
   * Execute a command by name
   */
  async execute(
    commandName: string,
    args: Record<string, unknown> = {},
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const command = this.registry.getCommand(commandName)
    if (!command) {
      throw new Error(`Unknown command: ${commandName}`)
    }

    if (!command.handler) {
      throw new Error(`Command ${commandName} has no handler`)
    }

    // For test compatibility, merge args and options
    const combinedArgs = { ...args, ...options }

    // Execute with middleware
    return this.executor.executeWithMiddleware(
      command.handler,
      combinedArgs,
      this.middleware.getMiddleware()
    )
  }

  /**
   * Add middleware that wraps command handlers
   */
  addMiddleware(middleware: Middleware): void {
    this.middleware.addMiddleware(middleware)
  }
}

// Export the suggestions system for direct use
export { CommandSuggestions } from './suggestions'

// Export types
export type { RouteResult, CommandHierarchy, Middleware, CommandSuggestion } from './types'

// Alias for test compatibility
export { CLIRouter as Router }
