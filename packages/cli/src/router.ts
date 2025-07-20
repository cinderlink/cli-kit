/**
 * CLI Command Router
 * 
 * Routes parsed commands to their handlers with support for lazy loading
 */

import type { CLIConfig, CommandConfig, ParsedArgs, Handler, LazyHandler } from "./types"

export interface RouteResult {
  handler: Handler | LazyHandler | null
  config: CommandConfig | null
  isLazy: boolean
}

export class CLIRouter {
  private _commands: Record<string, CommandConfig> = {}
  private _middleware: Array<(handler: Handler | LazyHandler) => Handler | LazyHandler> = []

  constructor(private config: CLIConfig) {
    // Initialize with commands from config
    this._commands = { ...(config.commands || {}) }
  }
  
  /**
   * Route a parsed command to its handler
   */
  route(parsedArgs: ParsedArgs): RouteResult {
    if (parsedArgs.command.length === 0) {
      return {
        handler: null,
        config: null,
        isLazy: false
      }
    }
    
    const commandConfig = this.findCommandConfig(parsedArgs.command)
    if (!commandConfig) {
      return {
        handler: null,
        config: null,
        isLazy: false
      }
    }
    
    const handler = commandConfig.handler
    if (!handler) {
      return {
        handler: null,
        config: commandConfig,
        isLazy: false
      }
    }
    
    // Check if handler is lazy (function that returns Promise)
    const isLazy = this.isLazyHandler(handler)
    
    return {
      handler,
      config: commandConfig,
      isLazy
    }
  }
  
  /**
   * Find command configuration for a command path
   */
  findCommandConfig(commandPath: string[]): CommandConfig | null {
    let currentCommands = this.config.commands || {}
    let currentConfig: CommandConfig | null = null
    
    for (const command of commandPath) {
      currentConfig = currentCommands[command] || null
      if (!currentConfig) {
        return null
      }
      
      // If this is not the last command, continue to subcommands
      if (commandPath.indexOf(command) < commandPath.length - 1) {
        currentCommands = currentConfig.commands || {}
      }
    }
    
    return currentConfig
  }
  
  /**
   * Get all available commands at a given path
   */
  getAvailableCommands(commandPath: string[] = []): string[] {
    let currentCommands = this.config.commands || {}
    
    // Navigate to the command path
    for (const command of commandPath) {
      const commandConfig = currentCommands[command]
      if (!commandConfig) {
        return []
      }
      currentCommands = commandConfig.commands || {}
    }
    
    return Object.keys(currentCommands).filter(name => {
      const config = currentCommands[name]
      return config && !config.hidden
    })
  }
  
  /**
   * Get command aliases
   */
  getCommandAliases(commandName: string): string[] {
    const commands = this.config.commands || {}
    const config = commands[commandName]
    return config?.aliases || []
  }
  
  /**
   * Resolve command name (including aliases)
   */
  resolveCommandName(name: string, currentCommands?: Record<string, CommandConfig>): string | null {
    const commands = currentCommands || this.config.commands || {}
    
    // Direct match
    if (commands[name]) {
      return name
    }
    
    // Check aliases
    for (const [commandName, config] of Object.entries(commands)) {
      if (config.aliases?.includes(name)) {
        return commandName
      }
    }
    
    return null
  }
  
  /**
   * Check if a handler is lazy (returns a Promise<Handler>)
   */
  private isLazyHandler(handler: Handler | LazyHandler): boolean {
    // A lazy handler should be a function with no parameters that returns another function
    // Regular handlers take args as parameter
    return typeof handler === 'function' && handler.length === 0
  }
  
  /**
   * Execute a handler (lazy or synchronous)
   */
  async executeHandler(
    handler: Handler | LazyHandler,
    args: Record<string, unknown>,
    isLazy: boolean = false
  ): Promise<unknown> {
    try {
      if (isLazy) {
        // Lazy handler - first call returns the actual handler
        const actualHandler = await (handler as LazyHandler)()
        return await this.callHandler(actualHandler, args)
      } else {
        // Direct handler
        return await this.callHandler(handler as Handler, args)
      }
    } catch (error) {
      // Enhance error with context
      if (error instanceof Error) {
        error.message = `Command execution failed: ${error.message}`
      }
      throw error
    }
  }
  
  /**
   * Call a handler function with proper error handling
   */
  private async callHandler(handler: Handler, args: Record<string, unknown>): Promise<unknown> {
    const result = handler(args)
    
    // Handle both sync and async handlers
    if (result instanceof Promise) {
      return await result
    }
    
    return result
  }
  
  /**
   * Validate that a command path exists
   */
  validateCommandPath(commandPath: string[]): boolean {
    return this.findCommandConfig(commandPath) !== null
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
        subcommands: config.commands 
          ? this.buildHierarchy(config.commands, currentPath)
          : {}
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
    return Object.keys(this._commands || {})
  }

  /**
   * Add a command dynamically
   */
  addCommand(name: string, config: CommandConfig): void {
    if (!this._commands) {
      this._commands = {}
    }
    this._commands[name] = config
  }

  /**
   * Get a specific command configuration
   */
  getCommand(name: string): CommandConfig | null {
    return this._commands?.[name] || null
  }

  /**
   * Execute a command by name
   */
  async execute(commandName: string, args: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<unknown> {
    const command = this.getCommand(commandName)
    if (!command) {
      throw new Error(`Unknown command: ${commandName}`)
    }

    if (!command.handler) {
      throw new Error(`Command ${commandName} has no handler`)
    }

    // Apply middleware to handler (in reverse order so first added is outermost)
    let handler = command.handler
    for (let i = this._middleware.length - 1; i >= 0; i--) {
      handler = this._middleware[i](handler)
    }

    // Execute the handler
    if (typeof handler === 'function') {
      // For test compatibility, merge args and options
      const combinedArgs = { ...args, ...options }
      
      // Check if it's a zero-argument function (could be lazy or regular)
      if (handler.length === 0) {
        // Could be lazy handler or zero-arg regular handler
        const result = await (handler as () => Promise<unknown> | unknown)()
        if (typeof result === 'function') {
          // It's a lazy handler, result is the actual handler
          return (result as Handler)(combinedArgs)
        } else {
          // It's a regular zero-arg handler, result is the final result
          return result
        }
      } else {
        // Regular handler with args - always use combined args per Handler type
        return (handler as Handler)(combinedArgs)
      }
    }

    throw new Error(`Invalid handler for command: ${commandName}`)
  }

  /**
   * Add middleware that wraps command handlers
   */
  addMiddleware(middleware: (handler: Handler | LazyHandler) => Handler | LazyHandler): void {
    this._middleware.push(middleware)
  }
}

export interface CommandHierarchy {
  [commandName: string]: {
    path: string[]
    description: string
    hasHandler: boolean
    aliases: string[]
    hidden: boolean
    subcommands: CommandHierarchy
  }
}

/**
 * Route suggestion system for handling unknown commands
 */
export class CommandSuggestions {
  constructor(private router: CLIRouter) {}
  
  /**
   * Get suggestions for a misspelled or unknown command
   */
  getSuggestions(unknownCommand: string, commandPath: string[] = []): string[] {
    const availableCommands = this.router.getAvailableCommands(commandPath)
    
    // Calculate edit distance and return closest matches
    const suggestions = availableCommands
      .map(cmd => ({
        command: cmd,
        distance: this.levenshteinDistance(unknownCommand, cmd)
      }))
      .filter(item => item.distance <= 3) // Only suggest close matches
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3) // Top 3 suggestions
      .map(item => item.command)
    
    return suggestions
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,     // deletion
          matrix[j - 1]![i]! + 1,     // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length]![str1.length]!
  }
}

// Alias for test compatibility
export { CLIRouter as Router }