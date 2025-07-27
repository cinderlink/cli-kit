/**
 * Debug CLI Integration
 * 
 * Provides debug mode support for CLI applications
 */

import { debug } from '../core/store'

export async function patchCLICommands() {
  try {
    // Patch command execution to track timing
    const cliModule = await import('@cli/core/runner')
    const originalExecute = cliModule.execute
    
    cliModule.execute = async function(command: unknown, context: unknown) {
      const commandName = command.name || 'unknown'
      debug.match(`Executing command: ${commandName}`, { command, context })
      
      const start = performance.now()
      try {
        const result = await originalExecute.call(this, command, context)
        const duration = performance.now() - start
        debug.performance(`Command ${commandName}`, duration, { componentName: commandName })
        return result
      } catch (error) {
        const duration = performance.now() - start
        debug.error(`Command ${commandName} failed after ${duration}ms`, error as Error)
        throw error
      }
    }
    
    debug.system('CLI commands patched for debug mode')
  } catch (error) {
    debug.error('Failed to patch CLI commands', error as Error)
  }
}