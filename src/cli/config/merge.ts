/**
 * Configuration Merging Utilities
 */

import type { CLIConfig, CommandConfig, CLIContext } from '@cli/types'

/**
 * Deep merge multiple CLI configurations
 *
 * This function combines multiple CLI configurations, with later configurations
 * taking precedence. It handles:
 * - Deep merging of nested command structures
 * - Hook composition (all hooks are called in order)
 * - Option and argument merging
 * - Plugin configuration combination
 *
 * @param base - The base configuration
 * @param configs - Additional configurations to merge
 * @returns Merged configuration
 */
export function mergeConfigs(base: CLIConfig, ...configs: Partial<CLIConfig>[]): CLIConfig {
  let result = { ...base }

  for (const config of configs) {
    if (!config) continue

    // Merge top-level properties
    result = {
      ...result,
      ...config,
      // Special handling for objects that need deep merging
      options: { ...result.options, ...config.options },
      commands: mergeCommands(result.commands ?? {}, config.commands ?? {}),
      // Compose hooks
      hooks: mergeHooks(result.hooks, config.hooks),
    }
  }

  return result
}

/**
 * Merge command configurations recursively
 */
function mergeCommands(
  base: Record<string, CommandConfig>,
  override: Record<string, CommandConfig>
): Record<string, CommandConfig> {
  const result = { ...base }

  for (const [name, command] of Object.entries(override)) {
    if (!result[name]) {
      result[name] = command
    } else {
      // Deep merge the command
      result[name] = {
        ...result[name],
        ...command,
        options: { ...result[name].options, ...command.options },
        args: { ...result[name].args, ...command.args },
        // Recursively merge sub-commands
        commands: command.commands
          ? mergeCommands(result[name].commands ?? {}, command.commands)
          : result[name].commands,
      }
    }
  }

  return result
}

/**
 * Merge hook configurations
 */
function mergeHooks(
  base?: CLIConfig['hooks'],
  override?: CLIConfig['hooks']
): CLIConfig['hooks'] | undefined {
  if (!base && !override) return undefined
  if (!base) return override
  if (!override) return base

  return {
    preCommand: composePreCommandHooks(base.preCommand, override.preCommand),
    postCommand: composePostCommandHooks(base.postCommand, override.postCommand),
  }
}

/**
 * Compose preCommand hooks
 */
function composePreCommandHooks(
  base?: (context: CLIContext) => Promise<void> | void,
  override?: (context: CLIContext) => Promise<void> | void
): ((context: CLIContext) => Promise<void> | void) | undefined {
  if (!base && !override) return undefined
  if (!base) return override
  if (!override) return base

  return async (context: CLIContext) => {
    await Promise.resolve(base(context))
    await Promise.resolve(override(context))
  }
}

/**
 * Compose postCommand hooks
 */
function composePostCommandHooks(
  base?: (context: CLIContext, result: unknown) => Promise<void> | void,
  override?: (context: CLIContext, result: unknown) => Promise<void> | void
): ((context: CLIContext, result: unknown) => Promise<void> | void) | undefined {
  if (!base && !override) return undefined
  if (!base) return override
  if (!override) return base

  return async (context: CLIContext, result: unknown) => {
    await Promise.resolve(base(context, result))
    await Promise.resolve(override(context, result))
  }
}

/**
 * Expand command aliases in configuration
 */
export function expandAliases(config: CLIConfig): CLIConfig
export function expandAliases(commandName: string, aliases: Record<string, string>): string
export function expandAliases(
  configOrCommand: CLIConfig | string,
  aliases?: Record<string, string>
): CLIConfig | string {
  // Single command alias expansion
  if (typeof configOrCommand === 'string' && aliases) {
    let command = configOrCommand

    function expandAlias(cmd: string): string {
      if (aliases && aliases[cmd]) {
        // Prevent infinite recursion
        const visited = new Set([cmd])
        let expanded = aliases[cmd]

        while (aliases && aliases[expanded] && !visited.has(expanded)) {
          visited.add(expanded)
          expanded = aliases[expanded] || expanded
        }

        return expanded
      }
      return cmd
    }

    return expandAlias(command)
  }

  // Original functionality for config objects
  const config = configOrCommand as CLIConfig
  if (!config.aliases || Object.keys(config.aliases).length === 0) {
    return config
  }

  function expandCommandAliases(
    commands: Record<string, CommandConfig>
  ): Record<string, CommandConfig> {
    const expanded: Record<string, CommandConfig> = {}

    for (const [name, command] of Object.entries(commands)) {
      expanded[name] = command

      // Recursively expand sub-commands
      if (command.commands) {
        expanded[name] = {
          ...command,
          commands: expandCommandAliases(command.commands),
        }
      }
    }

    // Add aliased commands
    for (const [alias, target] of Object.entries(config.aliases ?? {})) {
      if (expanded[target] && !expanded[alias]) {
        expanded[alias] = { ...expanded[target], hidden: true }
      }
    }

    return expanded
  }

  return {
    ...config,
    commands: config.commands ? expandCommandAliases(config.commands) : {},
  }
}
