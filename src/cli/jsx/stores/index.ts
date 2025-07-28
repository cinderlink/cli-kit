/**
 * CLI JSX Stores
 *
 * Reactive stores for CLI state management using scope system integration
 * Now backed by unified MVU state management
 */

// Import stores from MVU implementation
import { commandStore, cliStore, hasCliCommands as hasCliCommandsFromMVU } from '../../mvu/app'

// Export stores
export { commandStore, cliStore }

/**
 * Set the current command path for the CLI
 *
 * Updates the active command path used for routing and command execution.
 *
 * @param args - Command path arguments
 * @returns Result of setting the command path
 *
 * @example
 * ```typescript
 * setCommandPath(['dev', 'start'])
 * ```
 */
export const setCommandPath = (...args: Parameters<typeof commandStore.setCommandPath>) =>
  commandStore.setCommandPath(...args)

/**
 * Execute a CLI command by path with provided arguments
 *
 * Finds and executes the registered command handler for the given path.
 *
 * @param args - Command execution arguments (path, args, flags)
 * @returns Result of command execution
 *
 * @example
 * ```typescript
 * await executeCommand(['build'], { target: 'production' }, { verbose: true })
 * ```
 */
export const executeCommand = (...args: Parameters<typeof commandStore.executeCommand>) =>
  commandStore.executeCommand(...args)

/**
 * Get a registered command by its path
 *
 * Retrieves the command definition and handler for the specified command path.
 *
 * @param args - Command path to look up
 * @returns Command definition or null if not found
 *
 * @example
 * ```typescript
 * const buildCommand = getCommandByPath(['build'])
 * if (buildCommand) {
 *   console.log('Build command found:', buildCommand.description)
 * }
 * ```
 */
export const getCommandByPath = (...args: Parameters<typeof commandStore.getCommandByPath>) =>
  commandStore.getCommandByPath(...args)

/**
 * Check if a command exists at the given path
 *
 * @param args - Command path to check
 * @returns True if command exists, false otherwise
 *
 * @example
 * ```typescript
 * if (commandExists(['dev', 'start'])) {
 *   console.log('Dev start command is available')
 * }
 * ```
 */
export const commandExists = (...args: Parameters<typeof commandStore.commandExists>) =>
  commandStore.commandExists(...args)

/**
 * Get all subcommands for a given command path
 *
 * Returns all commands that are nested under the specified path.
 *
 * @param args - Parent command path
 * @returns Array of subcommand definitions
 *
 * @example
 * ```typescript
 * const devCommands = getSubcommands(['dev'])
 * devCommands.forEach(cmd => console.log(`dev ${cmd.name}`))
 * ```
 */
export const getSubcommands = (...args: Parameters<typeof commandStore.getSubcommands>) =>
  commandStore.getSubcommands(...args)

/**
 * Reset the CLI command context to initial state
 *
 * Clears all command state and returns to the root command level.
 *
 * @example
 * ```typescript
 * resetContext() // Clear all command state
 * ```
 */
export const resetContext = () => commandStore.resetContext()

/**
 * Get the current CLI scope definition
 *
 * Returns the active CLI scope containing all registered commands and configuration.
 *
 * @returns Current CLI scope or null if not initialized
 *
 * @example
 * ```typescript
 * const scope = getCLIScope()
 * if (scope) {
 *   console.log('CLI name:', scope.name)
 * }
 * ```
 */
export const getCLIScope = () => commandStore.getCLIScope()

/**
 * Set the CLI configuration
 *
 * Updates the global CLI configuration with new settings.
 *
 * @param args - CLI configuration arguments
 * @returns Result of setting the configuration
 *
 * @example
 * ```typescript
 * setCliConfig({ name: 'myapp', version: '1.0.0' })
 * ```
 */
export const setCliConfig = (...args: Parameters<typeof cliStore.setConfig>) =>
  cliStore.setConfig(...args)

/**
 * Start the CLI application
 *
 * Initializes and starts the CLI with the current configuration.
 *
 * @returns Result of starting the CLI
 *
 * @example
 * ```typescript
 * await startCli()
 * ```
 */
export const startCli = () => cliStore.start()

/**
 * Stop the CLI application
 *
 * Gracefully shuts down the CLI and cleans up resources.
 *
 * @param args - Stop arguments (exit code, cleanup options)
 * @returns Result of stopping the CLI
 *
 * @example
 * ```typescript
 * await stopCli(0) // Exit with success code
 * ```
 */
export const stopCli = (...args: Parameters<typeof cliStore.stop>) => cliStore.stop(...args)

/**
 * Get the current command path
 *
 * @returns Array representing the current command path
 *
 * @example
 * ```typescript
 * const path = currentCommandPath()
 * console.log('Current command:', path.join(' '))
 * ```
 */
export const currentCommandPath = () => commandStore.currentPath

/**
 * Get the current command execution context
 *
 * @returns Current command context with args and flags
 *
 * @example
 * ```typescript
 * const context = commandContext()
 * console.log('Command args:', context.args)
 * ```
 */
export const commandContext = () => commandStore.context

/**
 * Get the currently active command definition
 *
 * @returns Active command object or null if none active
 *
 * @example
 * ```typescript
 * const active = activeCommand()
 * if (active) console.log('Running:', active.name)
 * ```
 */
export const activeCommand = () => commandStore.activeCommand

/**
 * Get all available commands in the CLI
 *
 * @returns Array of all registered command definitions
 *
 * @example
 * ```typescript
 * const commands = availableCommands()
 * commands.forEach(cmd => console.log(cmd.name))
 * ```
 */
export const availableCommands = () => commandStore.availableCommands

/**
 * Get the current CLI configuration
 *
 * @returns Current CLI configuration object
 *
 * @example
 * ```typescript
 * const config = cliConfig()
 * console.log('CLI version:', config.version)
 * ```
 */
export const cliConfig = () => cliStore.config

/**
 * Check if help was requested for the current command
 *
 * @returns True if help flag was provided, false otherwise
 *
 * @example
 * ```typescript
 * if (isHelpRequested()) {
 *   showHelpText()
 * }
 * ```
 */
export const isHelpRequested = () => commandStore.isHelpRequested()

/**
 * Set the command context (for backward compatibility)
 * Note: This is now handled internally by executeCommand
 */
export const setCommandContext = (
  path: string[],
  args: Record<string, any> = {},
  flags: Record<string, any> = {}
) => {
  // Store the context in the command store
  // Since the new store doesn't have this method, we'll use executeCommand pattern
  // This is a compatibility layer
  const context = { args, flags, path }
  // The actual setting happens when executeCommand is called
  return context
}

/**
 * Clear the command context (alias for resetContext)
 */
export const clearCommandContext = () => commandStore.resetContext()

/**
 * Check if the CLI has any commands registered
 */
export const hasCliCommands = hasCliCommandsFromMVU
