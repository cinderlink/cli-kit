/**
 * CLI JSX App Runner
 * 
 * Handles CLI-specific application logic, command discovery, and execution
 */

import { Effect } from 'effect'
import { scopeManager } from '@core/model/scope/manager'
import type { ScopeDef } from '@core/model/scope/types'
import { setCommandContext, clearCommandContext, getCommandByPath, hasCliCommands, cliConfig, setCliConfig } from './stores'
import { runApp } from '@core/runtime'
import { LiveServices } from '@core/services/impl'
import type { View } from '@core/types'
import type { JSXCommandConfig, JSXCommandHandler, JSXFlagConfig } from './types'
import { ScopeDebugView } from '@core/model/scope/jsx/components/ScopeDebugView'
import { renderScopeDebugOverlay } from '@core/model/scope/jsx/components/ScopeDebugOverlay'
import { isDebugEnabled, cliDebug } from '@core/debug'

const debug = cliDebug.debug

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
  const args: Record<string, string | number | boolean | undefined> = {}
  const flags: Record<string, string | number | boolean | undefined> = {}
  
  // Simple parsing - just extract command path for now
  // TODO: Integrate with proper CLI parser
  let i = 0
  let showHelpFlag = false
  while (i < argv.length && !argv[i].startsWith('-')) {
    // Handle help as both a command path element and a help flag
    if (argv[i] === 'help') {
      showHelpFlag = true
      // If help is the last argument or followed by flags, treat as help flag
      // Otherwise, include in command path (for commands named "help")
      if (i === argv.length - 1 || (i + 1 < argv.length && argv[i + 1].startsWith('-'))) {
        break
      }
    }
    if (argv[i] === '--help') {
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
    
    // Show debug view if enabled
    if (isDebugEnabled()) {
      debug('Debug is enabled, showing scope debug view')
      await showScopeDebugView()
    } else {
      debug('Debug is disabled, skipping scope debug view')
    }
    
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
 * Render help for the specified scope path and exit (non-interactive)
 */
async function renderHelpAndExit(AppComponent: (() => JSX.Element) | JSX.Element, scopePath?: string[]): Promise<void> {
  debug('Rendering help statically and exiting for scope path:', scopePath)
  
  try {
    debug('Getting app element...')
    const element = typeof AppComponent === 'function' ? AppComponent() : AppComponent
    debug('Got app element:', element ? 'valid' : 'null/undefined')
    
    // Import the static render function
    debug('Importing render function...')
    const { renderToTerminal } = await import('../../jsx/impl/render')
    debug('Imported render function successfully')
    
    // If a specific scope path is requested, try to render help for that scope
    if (scopePath && scopePath.length > 0) {
      debug('Looking for help for specific scope:', scopePath)
      
      // Find the target scope
      const allScopes = scopeManager.getAllScopes()
      const targetScope = allScopes.find(scope => {
        // Match by path or name
        return scope.path.join(' ') === scopePath.join(' ') || 
               (scope.path.length === 1 && scope.path[0] === scopePath[scopePath.length - 1])
      })
      
      if (targetScope) {
        debug('Found target scope for help:', targetScope.id, targetScope.path)
        
        // Try to find help content for this scope or create a scope-specific help view
        const CommandLineHelp = (await import('./components/CommandLineHelp')).CommandLineHelp
        const helpView = CommandLineHelp({ scopeId: targetScope.id })
        
        debug('Starting scope-specific help render...')
        await renderToTerminal(helpView)
        debug('Scope-specific help render completed')
        
        debug('Help rendered successfully, exiting')
        process.exit(0)
      } else {
        debug('Target scope not found, falling back to root help')
      }
    }
    
    // Fallback to full app help
    debug('Starting root app help render...')
    await renderToTerminal(element)
    debug('Root app help render completed')
    
    debug('Help rendered successfully, exiting')
    process.exit(0)
  } catch (error) {
    console.error('Failed to render help:', error)
    console.error('Error details:', error)
    process.exit(1)
  }
}

/**
 * Execute a CLI command
 */
async function executeCommand(
  path: string[],
  args: Record<string, string | number | boolean | undefined>,
  flags: Record<string, string | number | boolean | undefined>,
  helpRequested: boolean = false,
  AppComponent: (() => JSX.Element) | JSX.Element
): Promise<void> {
  debug('Executing command:', path, 'helpRequested:', helpRequested)
  
  // If help was requested, render help statically and exit
  if (helpRequested) {
    return renderHelpAndExit(AppComponent, path)
  }
  
  // Find the command in the scope tree
  const command = getCommandByPath(path)
  
  if (!command) {
    // Command not found - check if this is a plugin scope that should show help
    if (path.length === 0) {
      // No command specified - render help statically and exit
      return renderHelpAndExit(AppComponent, [])
    } else {
      // Check if this path corresponds to a plugin scope
      const allScopes = scopeManager.getAllScopes()
      const targetScope = allScopes.find(scope => {
        return scope.path.join(' ') === path.join(' ') || 
               (scope.path.length === 1 && scope.path[0] === path[path.length - 1])
      })
      
      if (targetScope && targetScope.type === 'plugin') {
        // Found a plugin scope - render help for it
        return renderHelpAndExit(AppComponent, path)
      }
      
      console.error(`Command not found: ${path.join(' ')}`)
      process.exit(1)
    }
  }
  
  // Check if this is a plugin without a specific subcommand
  if (command.type === 'plugin' && !command.handler) {
    // Plugin without handler - render help statically and exit
    return renderHelpAndExit(AppComponent, path)
  }
  
  // Check if command has a handler
  if (!command.handler) {
    // No handler - render help statically and exit
    return renderHelpAndExit(AppComponent)
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
    
    // Show debug overlay if enabled - but this is the OLD debug system
    // The new debug module should handle this via the DebugWrapper
    if (isDebugEnabled() && !process.env.TUIX_DEBUG) {
      // Only use old debug system if new debug module is not enabled
      await Effect.runPromise(
        renderScopeDebugOverlay(path).pipe(
          Effect.provide(LiveServices),
          Effect.catchAll(error => {
            debug('Failed to render debug overlay:', error)
            return Effect.void
          })
        )
      )
      
      // Give user time to see the overlay
      await new Promise(resolve => setTimeout(resolve, 3000))
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
    const jsx = (type: string, props: Record<string, unknown>) => ({ type, props })
    return jsx('vstack', {
      children: [
        jsx('text', { children: config.name }),
        jsx('text', { children: config.description || '' })
      ]
    })
  }, config)
}

/**
 * Show the scope debug view
 */
async function showScopeDebugView(): Promise<void> {
  // Check if we're using the new debug mode - if so, skip the old debug output
  if (process.env.TUIX_DEBUG === 'true' && process.env.TUIX_DEBUG_AUTO_WRAP !== 'false') {
    debug('Skipping old debug view - using new debug module')
    return
  }
  
  try {
    // Show debug information immediately
    console.log('\n' + '='.repeat(60))
    console.log('TUIX DEBUG MODE - SCOPE REGISTRATION PHASE')
    console.log('='.repeat(60))
    
    const allScopes = scopeManager.getAllScopes()
    console.log(`\nTotal scopes registered: ${allScopes.length}`)
    
    if (allScopes.length > 0) {
      console.log('\nRegistered Scopes:')
      allScopes.forEach(scope => {
        const indent = '  '.repeat(scope.path.length)
        console.log(`${indent}- ${scope.name} [${scope.type}] id=${scope.id}`)
        if (scope.description) {
          console.log(`${indent}  desc: ${scope.description}`)
        }
      })
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Also try to render the debug view component
    const debugView = ScopeDebugView()
    debug('Created debug view:', debugView)
    
    if (debugView && typeof debugView === 'object' && 'render' in debugView) {
      const output = await Effect.runPromise(
        debugView.render().pipe(
          Effect.provide(LiveServices),
          Effect.catchAll(error => {
            console.error('Failed to render debug view:', error)
            return Effect.succeed('')
          })
        )
      )
      
      if (output) {
        console.log('Debug View Output:')
        console.log(output)
        console.log('\n')
      }
    }
  } catch (error) {
    console.error('Error in showScopeDebugView:', error)
  }
}