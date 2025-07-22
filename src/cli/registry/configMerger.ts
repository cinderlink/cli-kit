/**
 * Config Merger Module
 * 
 * Handles merging plugin configurations into the main CLI config
 */

import type { CLIConfig, CommandConfig } from "@cli/types"
import type { PluginStore } from "./pluginStore"

export class ConfigMerger {
  constructor(private store: PluginStore) {}
  
  /**
   * Apply plugins to CLI configuration
   */
  applyCLIConfig(config: CLIConfig): CLIConfig {
    const enabledPlugins = this.store.getEnabled()
    
    // Deep clone the config to avoid mutations
    const modifiedConfig = this.deepClone(config)
    
    // Ensure commands object exists
    if (!modifiedConfig.commands) {
      modifiedConfig.commands = {}
    }
    
    // Merge commands from plugins
    for (const plugin of enabledPlugins) {
      if (plugin.commands) {
        Object.assign(modifiedConfig.commands, plugin.commands)
      }
    }
    
    // Apply command extensions
    for (const plugin of enabledPlugins) {
      if (plugin.extensions) {
        for (const [commandPath, extension] of Object.entries(plugin.extensions)) {
          const command = this.findCommand(modifiedConfig, commandPath.split('.'))
          
          if (command) {
            // Merge options
            if (extension.options) {
              if (!command.options) command.options = {}
              Object.assign(command.options, extension.options)
            }
            
            // Merge args
            if (extension.args) {
              if (!command.args) command.args = {}
              Object.assign(command.args, extension.args)
            }
            
            // Merge flags (if present in extension)
            if (extension.flags) {
              if (!command.options) command.options = {}
              Object.assign(command.options, extension.flags)
            }
            
            // Add subcommands
            if (extension.subcommands) {
              if (!command.commands) command.commands = {}
              Object.assign(command.commands, extension.subcommands)
            }
          }
        }
      }
    }
    
    // Apply CLI config modifications from plugins
    for (const plugin of enabledPlugins) {
      if (plugin.cliConfig) {
        // Merge top-level properties
        if (plugin.cliConfig.options) {
          if (!modifiedConfig.options) modifiedConfig.options = {}
          Object.assign(modifiedConfig.options, plugin.cliConfig.options)
        }
        
        if (plugin.cliConfig.settings) {
          if (!modifiedConfig.settings) modifiedConfig.settings = {}
          Object.assign(modifiedConfig.settings, plugin.cliConfig.settings)
        }
        
        if (plugin.cliConfig.aliases) {
          if (!modifiedConfig.aliases) modifiedConfig.aliases = {}
          Object.assign(modifiedConfig.aliases, plugin.cliConfig.aliases)
        }
      }
    }
    
    return modifiedConfig
  }
  
  /**
   * Find a command in the configuration by path
   */
  private findCommand(config: CLIConfig, path: string[]): CommandConfig | null {
    let commands = config.commands || {}
    let command: CommandConfig | null = null
    
    for (const segment of path) {
      command = commands[segment] || null
      if (!command) return null
      
      // If not the last segment, continue to subcommands
      if (path.indexOf(segment) < path.length - 1) {
        commands = command.commands || {}
      }
    }
    
    return command
  }
  
  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    // Simple deep clone using JSON (handles most cases)
    // For production, consider using a proper deep clone library
    return JSON.parse(JSON.stringify(obj))
  }
}