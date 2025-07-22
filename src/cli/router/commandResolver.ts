/**
 * Command Resolution Logic
 * 
 * Handles finding commands in the hierarchy, resolving aliases,
 * and validating command paths
 */

import type { CLIConfig, CommandConfig } from "@cli/types"

export class CommandResolver {
  constructor(private config: CLIConfig) {}
  
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
   * Validate that a command path exists
   */
  validateCommandPath(commandPath: string[]): boolean {
    return this.findCommandConfig(commandPath) !== null
  }
}