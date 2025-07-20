/**
 * JSX App Wrapper
 * 
 * Simplified JSX-based app creation for tuix
 */

import { Effect, FiberRef } from "effect"
import { runApp } from "@tuix/core"
import { LiveServices } from "@tuix/services"
import type { View } from "@tuix/core"
import type { CLIContext } from "@tuix/cli"
import type { TuixConfig } from "@tuix/core"
import { Interactive, InteractiveContextLive, InteractiveFiberRef } from "@tuix/core"

// Debug logging
const DEBUG = process.env.TUIX_DEBUG === 'true'
const debug = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[TUIX JSX] ${msg}`, ...args)
}


// Import JSX runtime for JSX syntax support
import { jsx as jsxFactory, JSXContext } from "./jsx-runtime"

// Re-export JSX context helpers for component development
export { JSXContext }

// Re-export runes for easy JSX development
export { $state, $bindable, $derived, $effect } from '@tuix/reactive'

// Re-export lifecycle hooks for component lifecycle management
export { 
  onMount, 
  onDestroy, 
  beforeUpdate, 
  afterUpdate, 
  tick,
  untrack,
  withLifecycle
} from '@tuix/reactive'

// Export JSX component factories - these will be processed as intrinsic elements by jsx runtime
export const CLI = (props: any) => jsxFactory('CLI', props)
export const Plugin = (props: any) => jsxFactory('Plugin', props)
export const Command = (props: any) => jsxFactory('Command', props)  
export const Arg = (props: any) => jsxFactory('Arg', props)
export const Flag = (props: any) => jsxFactory('Flag', props)
export const Help = (props: any) => jsxFactory('Help', props)
export const Example = (props: any) => jsxFactory('Example', props)
export const Exit = (props: any) => jsxFactory('Exit', props)
export const LoadPlugin = (props: any) => jsxFactory('LoadPlugin', props)

export interface JSXAppProps {
  children?: JSX.Element | JSX.Element[]
}

export interface JSXAppConfig {
  name?: string
  version?: string
  description?: string
  commands?: Record<string, JSXCommandHandler>
  plugins?: JSXPlugin[]
  onInit?: () => void | Promise<void>
  onExit?: () => void | Promise<void>
}

export interface JSXCommandConfig {
  name: string
  description?: string
  aliases?: string[]
  args?: Record<string, JSXArgConfig>
  flags?: Record<string, JSXFlagConfig>
  subcommands?: Record<string, JSXCommandConfig>
  handler?: JSXCommandHandler  // Made optional - if not provided, shows help for subcommands
  examples?: string[]
  hidden?: boolean
  interactive?: boolean | ((ctx: JSXCommandContext) => boolean) // Can be static or dynamic based on context
}

export interface JSXArgConfig {
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
  choices?: string[]
  default?: any
}

export interface JSXFlagConfig {
  description: string
  alias?: string
  type?: 'string' | 'number' | 'boolean'
  default?: any
  choices?: string[]
}

export interface JSXCommandHandler {
  (ctx: JSXCommandContext): JSX.Element | Promise<JSX.Element>
}

export interface JSXCommandContext {
  args: Record<string, any>
  flags: Record<string, any>
  command: string
  subcommand?: string
  raw: string[]
  // CLI context
  cliName: string
  tuixConfig?: TuixConfig
  // Helper functions
  prompt: (message: string) => Promise<string>
  confirm: (message: string) => Promise<boolean>
  select: (message: string, choices: string[]) => Promise<string>
  error: (message: string) => void
  success: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

export interface JSXPlugin {
  name: string
  description?: string
  version?: string
  commands?: Record<string, JSXCommandConfig>
  hooks?: {
    onInit?: () => void | Promise<void>
    onExit?: () => void | Promise<void>
    beforeCommand?: (ctx: JSXCommandContext) => void | Promise<void>
    afterCommand?: (ctx: JSXCommandContext, result: JSX.Element) => void | Promise<void>
  }
}

/**
 * Create and run a JSX-based tuix app
 */
export function createJSXApp(AppComponent: (() => JSX.Element) | JSX.Element, config?: JSXAppConfig & { interactive?: boolean | Partial<import('./core/interactive').InteractiveConfig> }): Promise<void> {
  debug('createJSXApp called')
  
  // Handle both function components and JSX elements
  const getAppElement = () => {
    if (typeof AppComponent === 'function') {
      return AppComponent()
    } else {
      return AppComponent
    }
  }
  
  // First render the component to collect plugin registrations
  try {
    getAppElement()
  } catch (error) {
    console.warn("Warning: Error during initial render for plugin collection:", error)
  }

  // Handle initialization
  if (config?.onInit) {
    const initResult = config.onInit()
    if (initResult instanceof Promise) {
      initResult.catch(console.error)
    }
  }

  // Initialize configured plugins from config
  if (config?.plugins) {
    for (const plugin of config.plugins) {
      if (plugin.hooks?.onInit) {
        const pluginInitResult = plugin.hooks.onInit()
        if (pluginInitResult instanceof Promise) {
          pluginInitResult.catch(console.error)
        }
      }
    }
  }

  // Initialize plugins from JSX registry
  const { pluginRegistry } = require("./jsx-runtime")
  const registeredPlugins = pluginRegistry.getAllEnabled()
  
  console.log(`🔌 Found ${registeredPlugins.length} registered plugins`)
  
  for (const { name, plugin, config: pluginConfig } of registeredPlugins) {
    if (plugin.hooks?.onInit) {
      const pluginInitResult = plugin.hooks.onInit()
      if (pluginInitResult instanceof Promise) {
        pluginInitResult.catch(console.error)
      }
    }
  }

  // Create component wrapper
  const component = {
    init: Effect.succeed([{}, []] as const),
    update: () => Effect.succeed([{}, []] as const),
    view: getAppElement,
    subscription: () => Effect.succeed([])
  }

  // Handle exit cleanup
  const cleanup = () => {
    if (config?.onExit) {
      const exitResult = config.onExit()
      if (exitResult instanceof Promise) {
        exitResult.catch(console.error)
      }
    }
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // Run the app
  debug('Running app...')
  return Effect.runPromise(
    Effect.gen(function* () {
      // Check if we're already in an interactive context (e.g., from a command)
      const isAlreadyInteractive = yield* FiberRef.get(InteractiveFiberRef)
      debug(`Is already interactive: ${isAlreadyInteractive}`)
      
      if (isAlreadyInteractive) {
        debug('Already in interactive context, running app with event loop')
        // We're already in an interactive context, just run the app normally
        yield* runApp(component).pipe(
          Effect.catchAll(() => Effect.void)
        )
      } else {
        debug('Not in interactive context, rendering once and exiting')
        // We're not in an interactive context, so render once and exit
        const view = getAppElement()
        const { renderToTerminal } = yield* Effect.promise(() => import('@tuix/core/jsx-render'))
        yield* Effect.promise(() => renderToTerminal(view))
        debug('Finished rendering')
        // Explicitly exit since we're done
        process.exit(0)
      }
    }).pipe(
      Effect.provide(InteractiveContextLive),
      Effect.provide(LiveServices),
      Effect.orDie
    )
  ).finally(cleanup)
}

/**
 * Parse command line arguments
 */
function parseCommandLine(argv: string[], commandConfig: JSXCommandConfig): {
  args: Record<string, any>
  flags: Record<string, any>
  subcommand?: string
  remaining: string[]
} {
  const args: Record<string, any> = {}
  const flags: Record<string, any> = {}
  let subcommand: string | undefined
  const remaining: string[] = []
  
  // Set defaults
  if (commandConfig.flags) {
    for (const [key, config] of Object.entries(commandConfig.flags)) {
      if (config.default !== undefined) {
        flags[key] = config.default
      }
    }
  }
  
  if (commandConfig.args) {
    for (const [key, config] of Object.entries(commandConfig.args)) {
      if (config.default !== undefined) {
        args[key] = config.default
      }
    }
  }
  
  let i = 0
  let positionalIndex = 0
  const positionalKeys = commandConfig.args ? Object.keys(commandConfig.args) : []
  
  while (i < argv.length) {
    const arg = argv[i]
    
    if (arg.startsWith('--')) {
      // Long flag
      const [key, value] = arg.slice(2).split('=', 2)
      if (value !== undefined) {
        flags[key] = parseValue(value, commandConfig.flags?.[key]?.type)
        i++
      } else {
        const nextArg = argv[i + 1]
        if (nextArg && !nextArg.startsWith('-')) {
          flags[key] = parseValue(nextArg, commandConfig.flags?.[key]?.type)
          i += 2
        } else {
          flags[key] = true
          i++
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag
      const flagChar = arg[1]
      const flagConfig = commandConfig.flags ? 
        Object.entries(commandConfig.flags).find(([_, config]) => config.alias === flagChar)?.[1] : undefined
      const flagName = commandConfig.flags ? 
        Object.entries(commandConfig.flags).find(([_, config]) => config.alias === flagChar)?.[0] : flagChar
      
      if (flagName) {
        const nextArg = argv[i + 1]
        if (nextArg && !nextArg.startsWith('-') && flagConfig?.type && flagConfig.type !== 'boolean') {
          flags[flagName] = parseValue(nextArg, flagConfig.type)
          i += 2
        } else {
          flags[flagName] = true
          i++
        }
      } else {
        remaining.push(arg)
        i++
      }
    } else {
      // Check if it's a subcommand
      if (!subcommand && commandConfig.subcommands && commandConfig.subcommands[arg]) {
        subcommand = arg
      } else if (positionalIndex < positionalKeys.length) {
        // Positional argument
        const key = positionalKeys[positionalIndex]
        args[key] = parseValue(arg, commandConfig.args?.[key]?.type)
        positionalIndex++
      } else {
        remaining.push(arg)
      }
      i++
    }
  }
  
  return { args, flags, subcommand, remaining }
}

function parseValue(value: string, type?: 'string' | 'number' | 'boolean'): any {
  if (type === 'number') {
    const num = Number(value)
    return isNaN(num) ? value : num
  }
  if (type === 'boolean') {
    return value.toLowerCase() === 'true' || value === '1' || value === 'yes'
  }
  return value
}

/**
 * Get the CLI binary name from process.argv
 */
function detectCLIName(): string {
  // process.argv[0] is the runtime (bun/node)
  // process.argv[1] is the script path
  const scriptPath = process.argv[1] || ''
  
  // Extract just the script name
  const scriptName = scriptPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'cli'
  
  // If it's run via npm/bun script, try to get the package script name
  if (process.env.npm_lifecycle_event) {
    return process.env.npm_lifecycle_event
  }
  
  return scriptName
}

/**
 * Create JSX command context with helper functions
 */
function createJSXContext(
  args: Record<string, any>,
  flags: Record<string, any>,
  command: string,
  subcommand: string | undefined,
  raw: string[],
  cliName?: string
): JSXCommandContext {
  const resolvedCLIName = cliName || detectCLIName()
  
  return {
    args,
    flags,
    command,
    subcommand,
    raw,
    cliName: resolvedCLIName,
    
    // Helper functions
    prompt: async (message: string) => {
      // Simple implementation - in a real CLI you'd use a proper prompt library
      process.stdout.write(message + ' ')
      return new Promise(resolve => {
        process.stdin.once('data', data => {
          resolve(data.toString().trim())
        })
      })
    },
    
    confirm: async (message: string) => {
      const answer = await createJSXContext(args, flags, command, subcommand, raw, resolvedCLIName).prompt(message + ' (y/N)')
      return answer.toLowerCase().startsWith('y')
    },
    
    select: async (message: string, choices: string[]) => {
      console.log(message)
      choices.forEach((choice, i) => console.log(`  ${i + 1}. ${choice}`))
      const answer = await createJSXContext(args, flags, command, subcommand, raw, resolvedCLIName).prompt('Select an option')
      const index = parseInt(answer) - 1
      return choices[index] || choices[0]
    },
    
    error: (message: string) => console.error(`❌ ${message}`),
    success: (message: string) => console.log(`✅ ${message}`),
    warning: (message: string) => console.log(`⚠️ ${message}`),
    info: (message: string) => console.log(`ℹ️ ${message}`)
  }
}

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
 * Simple wrapper for single-component apps
 * Automatically detects CLI commands if plugins are registered
 */
export function jsx(AppComponent: (() => JSX.Element) | JSX.Element): Promise<void> {
  debug('jsx() called')
  
  // Handle both function components and JSX elements
  const getAppElement = () => {
    if (typeof AppComponent === 'function') {
      return AppComponent()
    } else {
      return AppComponent
    }
  }
  
  // First render to collect plugin registrations
  debug('Rendering app to collect plugin registrations...')
  try {
    const element = getAppElement()
    // Actually process the JSX element to trigger plugin registrations
    // If it's a View (already processed), we're good
    // If it's raw JSX, we need to process it through the jsx runtime
    if (element && typeof element === 'object' && 'render' in element) {
      debug('Element already processed (has render method)')
    } else {
      debug('Element needs processing:', typeof element)
      debug('Element keys:', element ? Object.keys(element) : 'null')
    }
  } catch (error) {
    console.warn("Warning: Error during initial render for plugin collection:", error)
  }

  // Check if we have registered plugins that provide CLI commands
  const { pluginRegistry } = require("./jsx-runtime")
  const registeredPlugins = pluginRegistry.getAllEnabled()
  
  debug(`Found ${registeredPlugins.length} registered plugins`)
  registeredPlugins.forEach(({ name, plugin }) => {
    debug(`Plugin '${name}':`, {
      hasCommands: !!plugin.commands,
      commandCount: plugin.commands ? Object.keys(plugin.commands).length : 0,
      commands: plugin.commands ? Object.keys(plugin.commands) : []
    })
  })
  
  const hasCommandPlugins = registeredPlugins.some(({ plugin }) => 
    plugin.commands && Object.keys(plugin.commands).length > 0
  )
  
  debug(`Has command plugins: ${hasCommandPlugins}, argv length: ${process.argv.length}`)
  debug(`argv:`, process.argv)
  
  // If we have CLI commands available and there are command line arguments, run as CLI
  if (hasCommandPlugins && process.argv.length > 2) {
    debug('Running as CLI')
    
    // Build command list from all registered plugins with proper nesting
    const allCommands: Record<string, JSXCommandConfig> = {}
    
    for (const { name, plugin } of registeredPlugins) {
      if (plugin.commands) {
        // Create a parent command for the plugin that contains all its commands as subcommands
        const pluginCommand: JSXCommandConfig = {
          name: name,
          description: plugin.description || `${name} commands`,
          subcommands: {}
        }
        
        // Add all plugin commands as subcommands
        for (const [cmdName, command] of Object.entries(plugin.commands)) {
          pluginCommand.subcommands![cmdName] = command
        }
        
        // Register the plugin as a top-level command
        allCommands[name] = pluginCommand
      }
    }
    
    // Get CLI config if available
    const cliConfig = pluginRegistry.getCLIConfig()
    
    // Run as CLI
    return runJSXCLI({
      name: cliConfig.alias || cliConfig.name || detectCLIName(),
      cliName: cliConfig.name || detectCLIName(), // Full name for examples
      description: cliConfig.description || "JSX CLI Application",
      version: cliConfig.version,
      commands: allCommands,
      plugins: registeredPlugins.map(p => p.plugin)
    })
  }
  
  // Otherwise run as regular app
  debug('No CLI commands detected, running as regular app')
  return createJSXApp(() => getAppElement())
}

/**
 * Create a JSX plugin with commands
 */
export function createJSXPlugin(config: JSXPlugin): JSXPlugin {
  return config
}

/**
 * Run a full CLI application with JSX commands and plugins
 */
export async function runJSXCLI(config: {
  name: string
  cliName?: string // Full CLI name for examples (when name is an alias)
  version?: string
  description?: string
  commands?: Record<string, JSXCommandConfig>
  plugins?: JSXPlugin[]
  globalFlags?: Record<string, JSXFlagConfig>
  onInit?: () => void | Promise<void>
  onExit?: () => void | Promise<void>
}): Promise<void> {
  debug('runJSXCLI called with config:', config.name)
  const argv = process.argv.slice(2)
  debug('CLI argv:', argv)
  
  // Initialize
  if (config.onInit) {
    await config.onInit()
  }
  
  // Initialize plugins
  const allCommands: Record<string, JSXCommandConfig> = { ...config.commands }
  
  if (config.plugins) {
    for (const plugin of config.plugins) {
      if (plugin.hooks?.onInit) {
        await plugin.hooks.onInit()
      }
      
      if (plugin.commands) {
        // Create a parent command for the plugin that contains all its commands as subcommands
        const pluginCommand: JSXCommandConfig = {
          name: plugin.name,
          description: plugin.description || `${plugin.name} commands`,
          subcommands: plugin.commands
        }
        
        // Register the plugin as a top-level command
        allCommands[plugin.name] = pluginCommand
      }
    }
  }
  
  // Add built-in help command
  allCommands.help = defineJSXCommand({
    name: 'help',
    description: 'Show help information',
    interactive: false, // Ensure help command exits after rendering
    args: {
      command: {
        description: 'Command to show help for',
        required: false
      }
    },
    handler: (ctx) => HelpCommand({ 
      config, 
      commands: allCommands, 
      requestedCommand: ctx.args.command 
    })
  })
  
  if (argv.length === 0) {
    debug('No command specified, showing help')
    // Show main help
    return runJSXCommand(allCommands.help, [], allCommands, config)
  }
  
  const commandName = argv[0]
  debug(`Looking for command: ${commandName}`)
  debug('Available commands:', Object.keys(allCommands))
  const command = allCommands[commandName]
  
  if (!command) {
    console.error(`❌ Unknown command: ${commandName}`)
    console.log(`Run '${config.name} help' for available commands.`)
    process.exit(1)
  }
  
  debug(`Found command: ${command.name}`)
  
  // Run the command
  await runJSXCommand(command, argv.slice(1), allCommands, config)
  
  // Cleanup
  if (config.onExit) {
    await config.onExit()
  }
  
  if (config.plugins) {
    for (const plugin of config.plugins) {
      if (plugin.hooks?.onExit) {
        await plugin.hooks.onExit()
      }
    }
  }
}

/**
 * Execute a JSX command
 */
async function runJSXCommand(
  command: JSXCommandConfig,
  argv: string[],
  allCommands: Record<string, JSXCommandConfig>,
  appConfig: any,
  parentContext?: { args: Record<string, any>, flags: Record<string, any> }
): Promise<void> {
  debug(`runJSXCommand called for: ${command.name} with argv:`, argv)
  const parsed = parseCommandLine(argv, command)
  debug('Parsed command line:', parsed)
  
  // Merge parent context with current context (parent takes precedence for conflicts)
  const mergedArgs = { ...parsed.args, ...(parentContext?.args || {}) }
  const mergedFlags = { ...parsed.flags, ...(parentContext?.flags || {}) }
  
  // Handle subcommands
  if (parsed.subcommand && command.subcommands) {
    debug(`Command has subcommand: ${parsed.subcommand}`)
    const subcommand = command.subcommands[parsed.subcommand]
    if (subcommand) {
      debug(`Found subcommand, recursing...`)
      // Pass current context to subcommand
      return runJSXCommand(subcommand, parsed.remaining, allCommands, appConfig, {
        args: mergedArgs,
        flags: mergedFlags
      })
    }
    debug(`Subcommand not found: ${parsed.subcommand}`)
  }
  
  // Validate required args
  if (command.args) {
    for (const [key, config] of Object.entries(command.args)) {
      if (config.required && mergedArgs[key] === undefined) {
        console.error(`❌ Missing required argument: ${key}`)
        console.log(`Description: ${config.description}`)
        process.exit(1)
      }
    }
  }
  
  // Create context
  const ctx = createJSXContext(
    mergedArgs,
    mergedFlags,
    command.name,
    parsed.subcommand,
    argv,
    appConfig.cliName || appConfig.name || detectCLIName()
  )
  
  // Run plugin hooks
  if (appConfig.plugins) {
    for (const plugin of appConfig.plugins) {
      if (plugin.hooks?.beforeCommand) {
        await plugin.hooks.beforeCommand(ctx)
      }
    }
  }
  
  try {
    // Execute command
    debug(`Executing handler for command: ${command.name}`)
    
    let element: JSX.Element
    if (command.handler) {
      element = await command.handler(ctx)
      debug('Handler returned element')
    } else if (command.subcommands && Object.keys(command.subcommands).length > 0) {
      // No handler but has subcommands - show help
      debug('No handler found, showing subcommand help')
      element = DefaultCommandHelp({ command, commandPath: [appConfig.name, command.name].filter(Boolean).join(' ') })
    } else {
      // No handler and no subcommands
      throw new Error(`Command '${command.name}' has no handler and no subcommands`)
    }
    
    // Run plugin hooks
    if (appConfig.plugins) {
      for (const plugin of appConfig.plugins) {
        if (plugin.hooks?.afterCommand) {
          await plugin.hooks.afterCommand(ctx, element)
        }
      }
    }
    
    // Default to non-interactive (render and exit)
    // Commands can be:
    // - interactive: true (always interactive)
    // - interactive: false (never interactive) 
    // - interactive: function (dynamic based on context)
    // - interactive: undefined (default to false)
    const shouldBeInteractive = typeof command.interactive === 'function'
      ? command.interactive(ctx)
      : command.interactive === true
    
    debug(`Interactive determination for command '${command.name}':`)
    debug(`  command.interactive type: ${typeof command.interactive}`)
    debug(`  command.interactive value: ${command.interactive}`)
    debug(`  ctx.flags: ${JSON.stringify(ctx.flags)}`)
    debug(`  Final shouldBeInteractive: ${shouldBeInteractive}`)
    
    // Run the command with proper interactive context
    await Effect.runPromise(
      Effect.gen(function* () {
        debug(`📋 Lifecycle: Starting command execution (interactive: ${shouldBeInteractive})`)
        
        if (shouldBeInteractive) {
          debug('🔄 Lifecycle: Running in interactive mode with event loop')
          // Run in interactive mode with event loop
          yield* Interactive.runView(() => element)
          debug('🔄 Lifecycle: Interactive mode completed')
        } else {
          debug('⚡ Lifecycle: Running in non-interactive mode (render and exit)')
          // For non-interactive commands, render directly without service dependencies
          debug('⚡ Lifecycle: About to render directly to stdout')
          
          if (element && typeof element === 'object' && 'render' in element) {
            const content = yield* element.render()
            debug(`⚡ Lifecycle: Rendered content (${content.length} chars)`)
            process.stdout.write(content)
            process.stdout.write('\n')
          } else {
            debug('⚡ Lifecycle: Element is not a View, converting to string')
            process.stdout.write(String(element))
            process.stdout.write('\n')
          }
          
          debug('⚡ Lifecycle: Direct render completed')
        }
        
        debug('📋 Lifecycle: Command execution completed')
      }).pipe(
        Effect.provide(InteractiveContextLive),
        // Only provide full services for interactive commands
        shouldBeInteractive ? Effect.provide(LiveServices) : Effect.map(() => {}),
        Effect.catchAll((error) => {
          console.error(`❌ Command error: ${error}`)
          debug('❌ Lifecycle: Error in command execution')
          return Effect.fail(error)
        })
      )
    )
    
    debug('🏁 Lifecycle: Effect.runPromise completed, command should be done')
    
    // For non-interactive commands, explicitly exit the process
    if (!shouldBeInteractive) {
      debug('🚪 Lifecycle: Non-interactive command completed, calling process.exit(0)')
      process.exit(0)
    }
  } catch (error) {
    console.error(`❌ Command failed: ${error}`)
    debug('❌ Lifecycle: Error occurred, calling process.exit(1)')
    process.exit(1)
  }
}

/**
 * Built-in help command component
 */
const HelpCommand = ({ 
  config, 
  commands, 
  requestedCommand 
}: { 
  config: any
  commands: Record<string, JSXCommandConfig>
  requestedCommand?: string 
}) => {
  if (requestedCommand) {
    const command = commands[requestedCommand]
    if (!command) {
      return jsxFactory('vstack', {
        children: [
          jsxFactory('error', { children: `Unknown command: ${requestedCommand}` }),
          jsxFactory('text', { children: "Use 'help' to see all available commands." })
        ]
      })
    }
    
    const elements = [
      jsxFactory('text', { 
        color: 'cyan', 
        bold: true,
        children: `${config.name} ${command.name}` 
      })
    ]
    
    if (command.description) {
      elements.push(jsxFactory('text', { children: command.description }))
    }
    
    if (command.args && Object.keys(command.args).length > 0) {
      elements.push(jsxFactory('panel', {
        title: 'Arguments',
        border: 'single',
        children: jsxFactory('vstack', {
          children: Object.entries(command.args).map(([name, arg]) =>
            jsxFactory('hstack', {
              children: [
                jsxFactory('text', {
                  color: arg.required ? 'red' : 'gray',
                  children: `${name}${arg.required ? '*' : ''}`
                }),
                jsxFactory('text', { children: arg.description })
              ]
            })
          )
        })
      }))
    }
    
    if (command.flags && Object.keys(command.flags).length > 0) {
      elements.push(jsxFactory('panel', {
        title: 'Flags',
        border: 'single',
        children: jsxFactory('vstack', {
          children: Object.entries(command.flags).map(([name, flag]) =>
            jsxFactory('hstack', {
              children: [
                jsxFactory('text', {
                  color: 'blue',
                  children: `--${name}${flag.alias ? `, -${flag.alias}` : ''}`
                }),
                jsxFactory('text', { children: flag.description })
              ]
            })
          )
        })
      }))
    }
    
    if (command.subcommands && Object.keys(command.subcommands).length > 0) {
      elements.push(jsxFactory('panel', {
        title: 'Subcommands',
        border: 'single',
        children: jsxFactory('vstack', {
          children: Object.entries(command.subcommands).map(([name, sub]) =>
            jsxFactory('hstack', {
              children: [
                jsxFactory('text', { color: 'green', children: name }),
                jsxFactory('text', { children: sub.description || 'No description' })
              ]
            })
          )
        })
      }))
    }
    
    if (command.examples && command.examples.length > 0) {
      elements.push(jsxFactory('panel', {
        title: 'Examples',
        border: 'single',
        children: jsxFactory('vstack', {
          children: command.examples.map((example, i) =>
            jsxFactory('text', { color: 'gray', children: example })
          )
        })
      }))
    }
    
    return jsxFactory('vstack', { children: elements })
  }
  
  const elements = [
    jsxFactory('text', { color: 'cyan', bold: true, children: config.name })
  ]
  
  if (config.description) {
    elements.push(jsxFactory('text', { children: config.description }))
  }
  
  if (config.version) {
    elements.push(jsxFactory('text', { color: 'gray', children: `Version: ${config.version}` }))
  }
  
  // Calculate column width for proper alignment
  const commandEntries = Object.entries(commands).filter(([_, cmd]) => !cmd.hidden)
  const maxCommandLength = Math.max(...commandEntries.map(([name]) => name.length))
  const commandColumnWidth = Math.max(maxCommandLength + 4, 16) // At least 16 chars, plus padding
  
  elements.push(jsxFactory('panel', {
    title: 'Available Commands',
    border: 'rounded',
    children: jsxFactory('vstack', {
      children: commandEntries.map(([name, cmd]) => {
        const paddedCommand = name.padEnd(commandColumnWidth)
        return jsxFactory('hstack', {
          children: [
            jsxFactory('text', { color: 'green', children: paddedCommand }),
            jsxFactory('text', { children: cmd.description || 'No description' })
          ]
        })
      })
    })
  }))
  
  elements.push(jsxFactory('text', {
    color: 'gray',
    children: `Use '${config.name} help <command>' for detailed help on a command.`
  }))
  
  return jsxFactory('vstack', { children: elements })
}

/**
 * Default help display for commands without handlers
 */
const DefaultCommandHelp = ({ 
  command, 
  commandPath 
}: { 
  command: JSXCommandConfig
  commandPath: string 
}) => {
  const elements = [
    jsxFactory('text', { 
      color: 'cyan', 
      bold: true,
      children: command.description || `${command.name} commands` 
    }),
    jsxFactory('text', { children: '' })
  ]
  
  if (command.subcommands && Object.keys(command.subcommands).length > 0) {
    elements.push(jsxFactory('text', { children: 'Available commands:' }))
    elements.push(jsxFactory('text', { children: '' }))
    
    const maxNameLength = Math.max(
      ...Object.values(command.subcommands).map(cmd => cmd.name.length)
    )
    
    Object.entries(command.subcommands)
      .filter(([_, cmd]) => !cmd.hidden)
      .forEach(([name, subcommand]) => {
        const paddedName = subcommand.name.padEnd(maxNameLength + 2)
        elements.push(
          jsxFactory('hstack', {
            children: [
              jsxFactory('text', { color: 'green', children: `  ${commandPath} ${paddedName}` }),
              jsxFactory('text', { color: 'gray', children: subcommand.description || '' })
            ]
          })
        )
        
        // Show aliases if any
        if (subcommand.aliases && subcommand.aliases.length > 0) {
          elements.push(
            jsxFactory('text', { 
              color: 'gray', 
              children: `    aliases: ${subcommand.aliases.join(', ')}` 
            })
          )
        }
      })
    
    elements.push(jsxFactory('text', { children: '' }))
    elements.push(jsxFactory('text', { 
      color: 'gray', 
      children: `Use '${commandPath} <command> --help' for more information about a command.` 
    }))
  }
  
  return jsxFactory('vstack', { children: elements })
}

/**
 * Re-export JSX intrinsic element types for better developer experience
 * These are used as JSX elements and don't need to be imported, but having
 * the types available can be helpful
 */
export type {
  CLIProps as CLI,
  PluginProps as Plugin,
  CommandProps as Command,
  ArgProps as Arg,
  FlagProps as Flag,
  HelpProps as Help,
  ExampleProps as Example,
  LoadPluginProps as LoadPlugin,
  RegisterPluginProps as RegisterPlugin,
  EnablePluginProps as EnablePlugin,
  ConfigurePluginProps as ConfigurePlugin,
  StreamProps as Stream,
  PipeProps as Pipe,
  TransformProps as Transform,
  StreamBoxProps as StreamBox,
  SpawnProps as Spawn,
  ManagedSpawnProps as ManagedSpawn,
  CommandPipelineProps as CommandPipeline
} from "./jsx-runtime"

/**
 * Default export for convenience
 */
export default jsx