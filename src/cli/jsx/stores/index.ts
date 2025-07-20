/**
 * CLI JSX Stores
 * 
 * Reactive stores for CLI state management using scope system integration
 */

// Import stores using scope system
import { scopeCommandStore } from './scope-command-store'
import { cliStore } from './cli-store'

// Export new scope-based store as primary
export { scopeCommandStore as commandStore, cliStore }

// Keep old command store for compatibility during transition
import { commandStore as legacyCommandStore } from './command-store'
export { legacyCommandStore }

// Re-export commonly used functions for convenience (updated for scope-based store)
export const setCommandPath = (...args: Parameters<typeof scopeCommandStore.setCommandPath>) => 
  scopeCommandStore.setCommandPath(...args)
export const executeCommand = (...args: Parameters<typeof scopeCommandStore.executeCommand>) => 
  scopeCommandStore.executeCommand(...args)
export const getCommandByPath = (...args: Parameters<typeof scopeCommandStore.getCommandByPath>) => 
  scopeCommandStore.getCommandByPath(...args)
export const commandExists = (...args: Parameters<typeof scopeCommandStore.commandExists>) => 
  scopeCommandStore.commandExists(...args)
export const getSubcommands = (...args: Parameters<typeof scopeCommandStore.getSubcommands>) => 
  scopeCommandStore.getSubcommands(...args)
export const resetContext = () => scopeCommandStore.resetContext()
export const getCLIScope = () => scopeCommandStore.getCLIScope()

export const setCliConfig = (...args: Parameters<typeof cliStore.setConfig>) => 
  cliStore.setConfig(...args)
export const startCli = () => cliStore.start()
export const stopCli = (...args: Parameters<typeof cliStore.stop>) => cliStore.stop(...args)

// Direct access to store values
export const currentCommandPath = () => scopeCommandStore.currentPath
export const commandContext = () => scopeCommandStore.context
export const activeCommand = () => scopeCommandStore.activeCommand
export const availableCommands = () => scopeCommandStore.availableCommands
export const cliConfig = () => cliStore.getConfig()
export const isHelpRequested = () => scopeCommandStore.isHelpRequested()