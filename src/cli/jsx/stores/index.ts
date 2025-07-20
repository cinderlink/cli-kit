/**
 * CLI JSX Stores
 * 
 * Reactive stores for CLI state management using Svelte 5 runes
 */

// Import stores using Svelte 5 runes
import { commandStore } from './command-store'
import { cliStore } from './cli-store'

export { commandStore, cliStore }

// Re-export commonly used functions for convenience
export const setCommandContext = (...args: Parameters<typeof commandStore.setCommandContext>) => 
  commandStore.setCommandContext(...args)
export const clearCommandContext = () => commandStore.clearCommandContext()
export const getCommandByPath = (...args: Parameters<typeof commandStore.getCommandByPath>) => 
  commandStore.getCommandByPath(...args)
export const commandExists = (...args: Parameters<typeof commandStore.commandExists>) => 
  commandStore.commandExists(...args)
export const getSubcommands = (...args: Parameters<typeof commandStore.getSubcommands>) => 
  commandStore.getSubcommands(...args)
export const registerCommand = (...args: Parameters<typeof commandStore.registerCommand>) => 
  commandStore.registerCommand(...args)
export const getCommandConfig = (...args: Parameters<typeof commandStore.getCommandConfig>) => 
  commandStore.getCommandConfig(...args)

export const setCliConfig = (...args: Parameters<typeof cliStore.setConfig>) => 
  cliStore.setConfig(...args)
export const startCli = () => cliStore.start()
export const stopCli = (...args: Parameters<typeof cliStore.stop>) => cliStore.stop(...args)

// Direct access to store values
export const currentCommandPath = () => commandStore.currentPath
export const commandContext = () => commandStore.context
export const cliConfig = () => cliStore.getConfig()
export const hasCliCommands = () => commandStore.hasCommands
export const availableCommands = () => commandStore.availableCommands