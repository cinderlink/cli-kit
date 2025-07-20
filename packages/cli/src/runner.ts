/**
 * CLI Runner
 * 
 * Main execution engine for CLI applications
 */

import { Effect } from "effect"
import { runApp } from "@tuix/core"
import { LiveServices } from "@tuix/services"
import type { CLIConfig, CLIContext, ParsedArgs } from "./types"
import type { Plugin, PluginContext } from "./plugin"
import { CLIParser } from "./parser"
import { CLIRouter, CommandSuggestions } from "./router"
import { validateConfig } from "./config"
import { loadConfig, createConfig, type TuixConfig } from "@tuix/core"

export class CLIRunner {
  private parser: CLIParser
  private router: CLIRouter
  private suggestions: CommandSuggestions
  private tuixConfig?: TuixConfig
  
  constructor(private config: CLIConfig, tuixConfig?: TuixConfig) {
    validateConfig(config)
    this.tuixConfig = tuixConfig
    this.parser = new CLIParser(config)
    this.router = new CLIRouter(config)
    this.suggestions = new CommandSuggestions(this.router)
  }
  
  /**
   * Run the CLI with the given arguments
   */
  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    try {
      // Parse arguments
      const parsedArgs = this.parser.parse(argv)
      
      // Handle built-in options
      if (parsedArgs.options.help) {
        this.showHelp(parsedArgs.command.length > 0 ? parsedArgs.command : undefined)
        return
      }
      
      if (parsedArgs.options.version) {
        this.showVersion()
        return
      }
      
      // If no command provided, show help
      if (parsedArgs.command.length === 0) {
        this.showHelp()
        process.exit(0)
        return
      }
      
      // Route to command handler
      const route = this.router.route(parsedArgs)
      
      
      if (!route.handler) {
        this.handleUnknownCommand(parsedArgs.command)
        process.exit(1)
        return
      }
      
      // Load plugins
      const plugins = await this.loadPlugins()
      
      // Create CLI context
      const context: CLIContext = {
        config: this.config,
        parsedArgs,
        plugins,
        tuixConfig: this.tuixConfig
      }
      
      // Execute hooks
      await this.executeHooks('beforeCommand', parsedArgs.command, parsedArgs)
      
      try {
        // Parse positional arguments based on command config
        const positionalArgs = parsedArgs.rawArgs.slice(parsedArgs.command.length)
        const parsedPositionalArgs: Record<string, any> = {}
        
        if (route.config?.args) {
          const argNames = Object.keys(route.config.args)
          argNames.forEach((argName, index) => {
            if (index < positionalArgs.length) {
              const argConfig = route.config.args[argName]
              let value = positionalArgs[index]
              
              // Parse the value based on type if Zod schema is provided
              if (argConfig && typeof argConfig.parse === 'function') {
                try {
                  value = argConfig.parse(value)
                } catch (error) {
                  // If parsing fails, keep the raw value
                  console.warn(`Failed to parse argument "${argName}":`, error)
                }
              }
              
              parsedPositionalArgs[argName] = value
            }
          })
        }
        
        // Execute the command handler
        const handlerArgs = {
          ...parsedPositionalArgs, // Named positional args
          ...parsedArgs.options,  // Flags/options
          _raw: {
            command: parsedArgs.command,
            args: positionalArgs,
            options: parsedArgs.options
          },
          _context: context
        }
        
        
        const result = await this.router.executeHandler(
          route.handler,
          handlerArgs,
          route.isLazy
        )
        
        // If result is a component or view, run it with our TUI runtime
        if (result) {
          if (this.isComponent(result)) {
            // Full component - run with TUI runtime
            await Effect.runPromise(
              runApp(result).pipe(
                Effect.provide(LiveServices),
                Effect.catchAll(() => Effect.void), // Handle any unknown errors
                Effect.orDie // Convert requirements to errors
              )
            )
          } else if (this.isView(result)) {
            // Simple view - just render and print
            const rendered = await Effect.runPromise(result.render())
            console.log(rendered)
          } else if (typeof result === 'object') {
            // Log result for debugging
            console.log("Command returned non-component result:", result)
          }
        }
        
        await this.executeHooks('afterCommand', parsedArgs.command, parsedArgs, result)
        
      } catch (error) {
        await this.executeHooks('onError', error, parsedArgs.command, parsedArgs)
        throw error
      }
      
    } catch (error) {
      this.handleError(error)
      process.exit(1)
    }
  }
  
  /**
   * Show help for the CLI or a specific command
   */
  private showHelp(commandPath?: string[]): void {
    const helpText = this.parser.generateHelp(commandPath)
    console.log(helpText)
  }
  
  /**
   * Show version information
   */
  private showVersion(): void {
    console.log(`${this.config.name} ${this.config.version}`)
  }
  
  /**
   * Handle unknown command with suggestions
   */
  private handleUnknownCommand(commandPath: string[]): void {
    const unknownCommand = commandPath[commandPath.length - 1] || '<unknown>'
    const parentPath = commandPath.slice(0, -1)
    
    console.error(`Error: Unknown command '${unknownCommand}'`)
    
    const suggestions = this.suggestions.getSuggestions(unknownCommand, parentPath)
    if (suggestions.length > 0) {
      console.error(`\nDid you mean:`)
      suggestions.forEach(suggestion => {
        console.error(`  ${[...parentPath, suggestion].join(' ')}`)
      })
    }
    
    console.error(`\nRun '${this.config.name} --help' for usage information`)
  }
  
  /**
   * Handle errors with user-friendly messages
   */
  private handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
      
      // Show stack trace in verbose mode
      if (process.env.CLI_VERBOSE === 'true') {
        console.error(error.stack)
      }
    } else {
      console.error(`Error: ${String(error)}`)
    }
  }
  
  /**
   * Load plugins from configuration
   */
  private async loadPlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = []
    
    if (!this.config.plugins || this.config.plugins.length === 0) {
      return plugins
    }
    
    for (const pluginConfig of this.config.plugins) {
      try {
        // Handle string plugin references (module names)
        if (typeof pluginConfig === 'string') {
          const plugin = await import(pluginConfig)
          if (plugin.default) {
            plugins.push(plugin.default)
          } else {
            console.warn(`Plugin ${pluginConfig} has no default export`)
          }
        }
        // Handle inline plugin objects
        else if (typeof pluginConfig === 'object' && pluginConfig !== null && 'metadata' in pluginConfig) {
          plugins.push(pluginConfig as Plugin)
        }
      } catch (error) {
        console.warn(`Failed to load plugin:`, error)
      }
    }
    
    // Initialize plugins
    for (const plugin of plugins) {
      if (plugin.install) {
        try {
          const context: PluginContext = {
            command: [],
            config: {},
            plugins: [],
            metadata: plugin.metadata
          }
          await plugin.install(context)
        } catch (error) {
          console.warn(`Failed to initialize plugin ${plugin.metadata.name}:`, error)
        }
      }
    }
    
    return plugins
  }
  
  /**
   * Execute CLI hooks
   */
  private async executeHooks(
    hookName: keyof NonNullable<CLIConfig['hooks']>,
    ...args: unknown[]
  ): Promise<void> {
    const hook = this.config.hooks?.[hookName]
    if (hook) {
      try {
        await hook.apply(null, args as Parameters<typeof hook>)
      } catch (error) {
        console.warn(`Hook '${hookName}' failed:`, error)
      }
    }
  }
  
  /**
   * Check if a value is a TUI component
   */
  private isComponent(value: unknown): value is { init?: Function; update?: Function; view?: Function } {
    return value !== null && 
           typeof value === 'object' &&
           'init' in value && typeof (value as Record<string, unknown>).init === 'function'
  }
  
  /**
   * Check if a value is a View
   */
  private isView(value: unknown): value is { render: Function } {
    return value !== null && 
           typeof value === 'object' &&
           'render' in value && typeof (value as Record<string, unknown>).render === 'function'
  }
  
  /**
   * Convert a View to a simple Component
   */
  private viewToComponent(view: unknown): unknown {
    return {
      init: Effect.succeed([{ done: false }, []]),
      update: (model: unknown, msg: unknown) => {
        // Exit on any key press or after initial render
        const modelObj = model as Record<string, unknown>
        const msgObj = msg as Record<string, unknown>
        if (msg && (msgObj._tag === 'KeyPress' || modelObj.done)) {
          return Effect.succeed([{ ...modelObj, done: true }, [Effect.succeed({ _tag: 'Quit' })]])
        }
        // Mark as done after first render to allow immediate exit
        return Effect.succeed([{ ...modelObj, done: true }, []])
      },
      view: () => view
    }
  }
}

/**
 * Convenience function to run a CLI configuration
 */
export async function runCLI(config: CLIConfig, argv?: string[]): Promise<void> {
  // Auto-load tuix config if available
  let tuixConfig: TuixConfig | undefined
  try {
    tuixConfig = await loadConfig()
  } catch (error) {
    // Config not found or invalid, that's okay - we'll run without it
    if (process.env.CLI_VERBOSE === 'true') {
      console.warn('No tuix config found, running without config:', error)
    }
  }
  
  const runner = new CLIRunner(config, tuixConfig)
  await runner.run(argv)
}

/**
 * Create and run a CLI in one go
 */
export async function cli(config: CLIConfig): Promise<void> {
  await runCLI(config)
}

/**
 * Create default config if none exists
 */
export async function ensureConfig(appName?: string): Promise<TuixConfig> {
  try {
    return await loadConfig()
  } catch (error) {
    // Config doesn't exist, create one
    const configName = appName || 'tuix'
    const defaultConfig = createConfig()
    
    // Save the config
    const configPath = `${configName}.config.ts`
    const configContent = `import { createConfig } from 'tuix'

export default createConfig({
  // Process manager services
  processManager: {
    services: {
      // Add your services here
      // Example:
      // 'my-service': {
      //   command: 'npm run dev',
      //   cwd: '.',
      //   env: {},
      //   autoRestart: true
      // }
    }
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    format: 'json',
    outputs: ['console']
  }
})
`
    
    await Bun.write(configPath, configContent)
    console.log(`✅ Created default config at ${configPath}`)
    
    return defaultConfig
  }
}