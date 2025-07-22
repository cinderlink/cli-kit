/**
 * Command Parsing Utilities
 */

import type { CLIConfig, CommandConfig } from "@cli/types"
import type { ZodTypeAny } from "zod"

/**
 * Find a command configuration by path
 * 
 * @param config - CLI configuration
 * @param commandPath - Command path to find
 * @returns Command configuration if found
 */
export function findCommand(
  config: CLIConfig,
  commandPath: string[]
): CommandConfig | undefined {
  let current = config.commands
  let command: CommandConfig | undefined

  for (const part of commandPath) {
    if (!current || !current[part]) {
      return undefined
    }
    command = current[part]
    current = command.commands
  }

  return command
}

/**
 * Get option schemas for a command path
 * 
 * @param config - CLI configuration
 * @param commandPath - Command path
 * @returns Combined option schemas
 */
export function getCommandOptionSchemas(
  config: CLIConfig,
  commandPath: string[]
): Record<string, ZodTypeAny> {
  let schemas: Record<string, ZodTypeAny> = {}
  let current = config.commands

  // Collect schemas from each level
  for (const part of commandPath) {
    if (!current || !current[part]) break
    
    const command = current[part]
    if (command.options) {
      schemas = { ...schemas, ...command.options }
    }
    
    current = command.commands
  }

  return schemas
}

/**
 * Get argument schemas for a command path
 * 
 * @param config - CLI configuration
 * @param commandPath - Command path
 * @returns Argument schemas
 */
export function getCommandArgSchemas(
  config: CLIConfig,
  commandPath: string[]
): Record<string, ZodTypeAny> {
  const command = findCommand(config, commandPath)
  return command?.args ?? {}
}