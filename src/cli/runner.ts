/**
 * CLI Runner
 * 
 * Main execution engine for CLI applications
 */

import { Effect } from "effect"
import { runApp } from "../core/runtime"
import { LiveServices } from "../services/impl/index"
import type { CLIConfig, CLIContext, ParsedArgs, Plugin, PluginContext } from "./types"
import { CLIParser } from "./parser"
import { CLIRouter, CommandSuggestions } from "./router"
import { validateConfig } from "./config"

export class CLIRunner {
  private parser: CLIParser
  private router: CLIRouter
  private suggestions: CommandSuggestions
  
  constructor(private config: CLIConfig) {
    validateConfig(config)
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
        return
      }
      
      // Route to command handler
      const route = this.router.route(parsedArgs)
      
      
      if (!route.handler) {
        this.handleUnknownCommand(parsedArgs.command)
        return
      }
      
      // Load plugins
      const plugins = await this.loadPlugins()
      
      // Create CLI context
      const context: CLIContext = {
        config: this.config,
        parsedArgs,
        plugins
      }
      
      // Execute hooks
      await this.executeHooks('beforeCommand', parsedArgs.command, parsedArgs)
      
      try {
        // Execute the command handler
        const handlerArgs = {
          ...parsedArgs.args,
          ...parsedArgs.options,
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
    console.log(`${this.config.name} v${this.config.version}`)
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
  private handleError(error: any): void {
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
        else if (typeof pluginConfig === 'object' && pluginConfig.metadata) {
          plugins.push(pluginConfig as Plugin)
        }
      } catch (error) {
        console.warn(`Failed to load plugin:`, error)
      }
    }
    
    // Initialize plugins
    for (const plugin of plugins) {
      if (plugin.init) {
        try {
          await plugin.init({
            config: this.config,
            router: this.router,
            parser: this.parser
          } as PluginContext)
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
    ...args: any[]
  ): Promise<void> {
    const hook = this.config.hooks?.[hookName]
    if (hook) {
      try {
        await (hook as Function)(...args)
      } catch (error) {
        console.warn(`Hook '${hookName}' failed:`, error)
      }
    }
  }
  
  /**
   * Check if a value is a TUI component
   */
  private isComponent(value: any): boolean {
    return value && 
           typeof value === 'object' &&
           (typeof value.init === 'function' ||
            typeof value.update === 'function' ||
            typeof value.view === 'function')
  }
  
  /**
   * Check if a value is a View
   */
  private isView(value: any): boolean {
    return value && 
           typeof value === 'object' &&
           typeof value.render === 'function'
  }
  
  /**
   * Convert a View to a simple Component
   */
  private viewToComponent(view: any): any {
    return {
      init: Effect.succeed([{ done: false }, []]),
      update: (model: any, msg: any) => {
        // Exit on any key press or after initial render
        if (msg && (msg._tag === 'KeyPress' || model.done)) {
          return Effect.succeed([{ ...model, done: true }, [Effect.succeed({ _tag: 'Quit' })]])
        }
        // Mark as done after first render to allow immediate exit
        return Effect.succeed([{ ...model, done: true }, []])
      },
      view: () => view
    }
  }
}

/**
 * Convenience function to run a CLI configuration
 */
export async function runCLI(config: CLIConfig, argv?: string[]): Promise<void> {
  const runner = new CLIRunner(config)
  await runner.run(argv)
}

/**
 * Create and run a CLI in one go
 */
export async function cli(config: CLIConfig): Promise<void> {
  await runCLI(config)
}