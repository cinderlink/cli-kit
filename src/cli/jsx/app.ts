/**
 * CLI JSX App Runner
 * 
 * Handles CLI-specific application logic, command discovery, and execution
 */

import { Effect } from 'effect'
import { scopeManager } from '../../scope/manager'
import type { ScopeDef } from '../../scope/types'
import { setCommandContext, clearCommandContext, getCommandByPath, hasCliCommands, cliConfig, setCliConfig } from './stores'
import { runApp } from '../../core/runtime'
import { LiveServices } from '../../services/impl'
import type { View } from '../../core/types'
import type { JSXCommandConfig, JSXCommandHandler, JSXFlagConfig } from './types'

const DEBUG = process.env.TUIX_DEBUG === 'true'
const debug = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[CLI JSX APP] ${msg}`, ...args)
}

export interface CLIAppOptions {
  name?: string
  alias?: string
  version?: string
  description?: string
}

/**
 * Run a JSX component as a CLI application
 */
export async function runCLIApp(
  AppComponent: (() => JSX.Element) | JSX.Element,
  options: CLIAppOptions = {}
): Promise<void> {
  debug('runCLIApp called with options:', options)
  
  // Set CLI config
  setCliConfig(options)
  
  // Parse command line arguments
  const argv = process.argv.slice(2)
  debug('Command line args:', argv)
  
  // Determine command path from argv
  const commandPath: string[] = []
  const args: Record<string, any> = {}
  const flags: Record<string, any> = {}
  
  // Simple parsing - just extract command path for now
  // TODO: Integrate with proper CLI parser
  let i = 0
  let showHelpFlag = false
  while (i < argv.length && !argv[i].startsWith('-')) {
    // Check if this is a help request
    if (argv[i] === 'help' || argv[i] === '--help') {
      showHelpFlag = true
      break
    }
    commandPath.push(argv[i])
    i++
  }
  
  // Also check for --help flag
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelpFlag = true
  }
  
  debug('Command path:', commandPath)
  
  // Set command context BEFORE rendering
  // This allows JSX components to know what command is being requested
  setCommandContext(commandPath, args, flags)
  
  try {
    // Render the app to collect scope registrations
    debug('Rendering app to collect scopes...')
    const element = typeof AppComponent === 'function' ? AppComponent() : AppComponent
    
    // Process the JSX element to trigger scope registrations
    // This is where Plugin, Command, etc. components register their scopes
    if (element && typeof element === 'object' && 'render' in element) {
      // It's already a View, just trigger a render to process children
      await Effect.runPromise(
        element.render().pipe(
          Effect.provide(LiveServices),
          Effect.map(() => {}) // Discard output
        )
      )
    }
    
    debug('Scope collection complete')
    
    // Now check if we have CLI commands
    const hasCommands = hasCliCommands()
    debug('Has CLI commands:', hasCommands)
    
    if (!hasCommands) {
      // No CLI commands - run as regular app
      debug('No CLI commands found, running as CLI app without commands')
      clearCommandContext()
      return runAppWithContext(AppComponent)
    }
    
    // Activate scopes based on command path
    await activateScopesForCommand(commandPath)
    
    // We have CLI commands - execute the requested command
    debug('CLI commands found, executing command')
    return executeCommand(commandPath, args, flags, showHelpFlag, AppComponent)
    
  } finally {
    clearCommandContext()
  }
}

/**
 * Activate scopes for the given command path
 */
async function activateScopesForCommand(commandPath: string[]): Promise<void> {
  debug('Activating scopes for command path:', commandPath)
  
  // Find the CLI scope
  const allScopes = scopeManager.getAllScopes()
  const cliScope = allScopes.find(s => s.type === 'cli')
  
  if (!cliScope) {
    debug('No CLI scope found')
    return
  }
  
  // Activate the CLI scope
  await Effect.runPromise(
    scopeManager.activateScope(cliScope.id).pipe(
      Effect.catchAll(() => Effect.void)
    )
  )
  
  // Now activate the path from root to command
  let currentScope = cliScope
  
  for (const segment of commandPath) {
    // Find the child scope with this name
    const children = scopeManager.getChildScopes(currentScope.id)
    const childScope = children.find(child => child.name === segment)
    
    if (childScope) {
      // Activate this scope
      await Effect.runPromise(
        scopeManager.activateScope(childScope.id).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )
      currentScope = childScope
    } else {
      // No matching child found
      break
    }
  }
  
  debug('Scope activation complete')
}

/**
 * Run the app with proper command context
 */
async function runAppWithContext(AppComponent: (() => JSX.Element) | JSX.Element): Promise<void> {
  debug('Running CLI app with command context')
  
  const component = {
    init: Effect.succeed([{}, []] as const),
    update: () => Effect.succeed([{}, []] as const),
    view: () => typeof AppComponent === 'function' ? AppComponent() : AppComponent,
    subscription: () => Effect.succeed([])
  }
  
  return Effect.runPromise(
    runApp(component).pipe(
      Effect.provide(LiveServices),
      Effect.catchAll(() => Effect.void)
    )
  )
}

/**
 * Execute a CLI command
 */
async function executeCommand(
  path: string[],
  args: Record<string, any>,
  flags: Record<string, any>,
  helpRequested: boolean = false,
  AppComponent: (() => JSX.Element) | JSX.Element
): Promise<void> {
  debug('Executing command:', path, 'helpRequested:', helpRequested)
  
  // If help was requested, let the scope system handle it
  if (helpRequested) {
    // The scope system will render help for the active scope
    return runAppWithContext(AppComponent)
  }
  
  // Find the command in the scope tree
  const command = getCommandByPath(path)
  
  if (!command) {
    // Command not found
    if (path.length === 0) {
      // No command specified - let the scope system handle help rendering
      // by running the app with no active command
      return runAppWithContext(AppComponent)
    } else {
      console.error(`Command not found: ${path.join(' ')}`)
      process.exit(1)
    }
  }
  
  // Check if this is a plugin without a specific subcommand
  if (command.type === 'plugin' && !command.handler) {
    // Plugin without handler - let scope system show help
    // The plugin scope will be active but no command will execute
    return runAppWithContext(AppComponent)
  }
  
  // Check if command has a handler
  if (!command.handler) {
    // No handler - let scope system show help for this command
    return runAppWithContext(AppComponent)
  }
  
  // Execute the handler
  debug('Executing handler for command:', command.name)
  const context = {
    args,
    flags,
    command: command.name,
    commandPath: path,
    // Add other context properties as needed
  }
  
  try {
    const result = await command.handler(context)
    
    // Render the result if it's a JSX element
    if (result && typeof result === 'object' && 'render' in result) {
      const output = await Effect.runPromise(
        result.render().pipe(
          Effect.provide(LiveServices)
        )
      )
      process.stdout.write(output)
      process.stdout.write('\n')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Command failed:', error)
    process.exit(1)
  }
}

// Help rendering has been moved to the scope system
// The CommandLineHelp component now handles all help display

/**
 * Register a CLI command that returns JSX
 */
export function defineJSXCommand(config: JSXCommandConfig): JSXCommandConfig {
  return config
}

/**
 * Legacy helper for simple commands
 */
export function jsxCommand(name: string, handler: JSXCommandHandler): JSXCommandConfig {
  return {
    name,
    handler
  }
}

/**
 * Run a full CLI application with JSX commands
 */
export async function runJSXCLI(config: {
  name: string
  version?: string
  description?: string
  commands?: Record<string, JSXCommandConfig>
  globalFlags?: Record<string, JSXFlagConfig>
  onInit?: () => void | Promise<void>
  onExit?: () => void | Promise<void>
}): Promise<void> {
  debug('runJSXCLI called with config:', config.name)
  
  // For now, delegate to runCLIApp
  // TODO: Implement full CLI runner with command parsing and execution
  return runCLIApp(() => {
    // Create a simple component that represents the CLI
    const jsx = (type: string, props: any) => ({ type, props })
    return jsx('vstack', {
      children: [
        jsx('text', { children: config.name }),
        jsx('text', { children: config.description || '' })
      ]
    })
  }, config)
}