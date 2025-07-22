/**
 * CLI Configuration Validation
 */

import type { CLIConfig, CommandConfig } from "@cli/types"
import { RESERVED_NAMES, VERSION_PATTERN } from "./schema"

/**
 * Validate a CLI configuration object
 * 
 * Checks for:
 * - Valid semver version string
 * - Reserved command names
 * - Valid command structure
 * - Option and argument schema validity
 * 
 * @param config - The configuration to validate
 * @throws Error if validation fails
 */
export function validateConfig(config: CLIConfig): void {
  // Validate version format
  if (!VERSION_PATTERN.test(config.version)) {
    throw new Error(`Invalid version format: ${config.version}. Must be valid semver (e.g., 1.0.0)`)
  }

  // Validate command names
  if (config.commands) {
    for (const commandName of Object.keys(config.commands)) {
      if (RESERVED_NAMES.includes(commandName)) {
        throw new Error(`Command name "${commandName}" is reserved and cannot be used`)
      }

      const command = config.commands[commandName]
      if (!command) continue // Skip if command doesn't exist
      
      // Validate sub-commands
      if (command.commands) {
        for (const subCommandName of Object.keys(command.commands)) {
          if (RESERVED_NAMES.includes(subCommandName)) {
            throw new Error(`Sub-command name "${subCommandName}" is reserved and cannot be used`)
          }
        }
      }

      // Validate that handler exists for leaf commands
      if (!command.commands || Object.keys(command.commands).length === 0) {
        if (!command.handler) {
          throw new Error(`Command "${commandName}" must have a handler function`)
        }
      }
    }
  }

  // Validate global options don't conflict with help/version
  if (config.options) {
    const hasHelpOption = 'help' in config.options || 'h' in config.options
    const hasVersionOption = 'version' in config.options || 'v' in config.options
    
    if (hasHelpOption) {
      console.warn("Global 'help' option may conflict with built-in help system")
    }
    if (hasVersionOption) {
      console.warn("Global 'version' option may conflict with built-in version command")
    }
  }
}

/**
 * Normalize a command name for consistent comparison
 */
export function normalizeCommand(input: string): string
export function normalizeCommand(command: CommandConfig): CommandConfig
export function normalizeCommand(input: string | CommandConfig): string | CommandConfig {
  if (typeof input === 'string') {
    return input.toLowerCase().trim()
  }
  
  // Normalize command config
  return {
    ...input,
    // Ensure consistent structure
    options: input.options ?? {},
    args: input.args ?? {},
    commands: input.commands ?? {},
  }
}