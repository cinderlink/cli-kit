/**
 * CLI Runner
 * 
 * Main execution engine for CLI applications
 */

import type { CLIConfig, Plugin } from "@cli/types"
import type { TuixConfig } from "tuix/config"
import { CLIParser } from "@cli/core/parser"
import { CLIRouter, CommandSuggestions } from "@cli/router"
import { validateConfig } from "@cli/config"
import { EventBus } from "@core/model/events/eventBus"
import { createHooks, type Hooks } from "@cli/hooks"
import { Effect } from "effect"
import { Interactive } from "@core/runtime/interactive"

import { HelpDisplay } from "./helpDisplay"
import { ErrorHandler } from "./errorHandler"
import { PluginLoader } from "./pluginLoader"
import { ArgumentProcessor } from "./argumentProcessor"
import { CommandExecutor } from "./commandExecutor"

export class CLIRunner {
  private parser: CLIParser
  private router: CLIRouter
  private suggestions: CommandSuggestions
  private eventBus: EventBus
  private hooks: Hooks
  
  // Sub-modules
  private helpDisplay: HelpDisplay
  private errorHandler: ErrorHandler
  private pluginLoader: PluginLoader
  private argumentProcessor: ArgumentProcessor
  private commandExecutor: CommandExecutor
  
  constructor(private config: CLIConfig, private tuixConfig?: TuixConfig) {
    // Validate configuration
    validateConfig(config)
    
    // Initialize core components
    this.parser = new CLIParser(config)
    this.router = new CLIRouter(config)
    this.suggestions = new CommandSuggestions(this.router)
    
    // Initialize event system
    this.eventBus = new EventBus()
    this.hooks = createHooks(this.eventBus, config.name || 'cli')
    
    // Initialize sub-modules
    this.helpDisplay = new HelpDisplay(config, this.parser)
    this.errorHandler = new ErrorHandler(config, this.suggestions)
    this.pluginLoader = new PluginLoader(config)
    this.argumentProcessor = new ArgumentProcessor(config, this.parser)
    this.commandExecutor = new CommandExecutor(
      config,
      this.router,
      this.hooks,
      this.argumentProcessor,
      tuixConfig
    )
  }
  
  /**
   * Run the CLI with the given arguments
   */
  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    try {
      // Process arguments
      const processed = this.argumentProcessor.processArguments(argv)
      
      // Handle built-in options
      if (processed.shouldShowHelp) {
        this.helpDisplay.showHelp(
          processed.hasCommand ? processed.parsedArgs.command : undefined
        )
        return
      }
      
      if (processed.shouldShowVersion) {
        this.helpDisplay.showVersion()
        return
      }
      
      // If no command provided, show help
      if (!processed.hasCommand) {
        this.helpDisplay.showHelp()
        await Effect.runPromise(Interactive.exit(0))
        return
      }
      
      // Check if command exists
      const route = this.router.route(processed.parsedArgs)
      if (!route.handler) {
        this.errorHandler.handleUnknownCommand(processed.parsedArgs.command)
        await Effect.runPromise(Interactive.exit(1))
        return
      }
      
      // Load plugins
      const plugins = await this.pluginLoader.loadPlugins()
      
      // Execute the command
      await this.commandExecutor.executeCommand(processed.parsedArgs, plugins)
      
    } catch (error) {
      this.errorHandler.handleError(error)
      await Effect.runPromise(Interactive.exit(1))
    }
  }
  
  /**
   * Get the hooks instance for external use
   */
  getHooks(): Hooks {
    return this.hooks
  }
}