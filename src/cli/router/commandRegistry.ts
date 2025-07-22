/**
 * Command Registry
 * 
 * Dynamic command management for adding, retrieving, and managing commands
 */

import type { CommandConfig } from "@cli/types"

export class CommandRegistry {
  private commands: Record<string, CommandConfig> = {}
  
  /**
   * Initialize with commands from config
   */
  initialize(commands: Record<string, CommandConfig> = {}): void {
    this.commands = { ...commands }
  }
  
  /**
   * Get all available command names
   */
  getCommands(): string[] {
    return Object.keys(this.commands)
  }
  
  /**
   * Add a command dynamically
   */
  addCommand(name: string, config: CommandConfig): void {
    this.commands[name] = config
  }
  
  /**
   * Get a specific command configuration
   */
  getCommand(name: string): CommandConfig | null {
    return this.commands[name] || null
  }
  
  /**
   * Remove a command
   */
  removeCommand(name: string): boolean {
    if (this.commands[name]) {
      delete this.commands[name]
      return true
    }
    return false
  }
  
  /**
   * Check if a command exists
   */
  hasCommand(name: string): boolean {
    return name in this.commands
  }
  
  /**
   * Get all commands as a record
   */
  getAllCommands(): Record<string, CommandConfig> {
    return { ...this.commands }
  }
  
  /**
   * Clear all commands
   */
  clearCommands(): void {
    this.commands = {}
  }
  
  /**
   * Update a command configuration
   */
  updateCommand(name: string, config: Partial<CommandConfig>): boolean {
    if (this.commands[name]) {
      this.commands[name] = { ...this.commands[name], ...config }
      return true
    }
    return false
  }
}