/**
 * Command Executor Module
 *
 * Orchestrates command execution with hooks and context
 */

import { Effect } from 'effect'
import type { CLIConfig, CLIContext, ParsedArgs, Plugin } from '@cli/types'
import type { CLIRouter } from '@cli/router'
import type { Hooks } from '@cli/hooks'
import type { TuixConfig } from 'tuix/config'
import { createHookEvent } from '@cli/hooks'
import { ResultHandler } from './resultHandler'
import { ArgumentProcessor } from './argumentProcessor'

export class CommandExecutor {
  private resultHandler: ResultHandler

  constructor(
    private config: CLIConfig,
    private router: CLIRouter,
    private hooks: Hooks,
    private argumentProcessor: ArgumentProcessor,
    private tuixConfig?: TuixConfig
  ) {
    this.resultHandler = new ResultHandler()
  }

  /**
   * Execute a command with its handler
   */
  async executeCommand(parsedArgs: ParsedArgs, plugins: Plugin[]): Promise<void> {
    // Route to command handler
    const route = this.router.route(parsedArgs)

    if (!route.handler) {
      throw new Error(`No handler found for command: ${parsedArgs.command.join(' ')}`)
    }

    // Create CLI context
    const context = this.createContext(parsedArgs, plugins)

    // Execute beforeCommand hook
    await this.executeBeforeCommandHook(parsedArgs)

    try {
      // Get handler arguments with proper context
      let handlerArgs = this.argumentProcessor.updateHandlerArgs(
        {
          ...parsedArgs.options,
          _raw: {
            command: parsedArgs.command,
            args: parsedArgs.rawArgs.slice(parsedArgs.command.length),
            options: parsedArgs.options,
          },
        },
        route.config!
      )

      // Add context to handler args
      handlerArgs = {
        ...handlerArgs,
        _context: context,
      }

      // Execute the command handler
      const result = await this.router.executeHandler(route.handler, handlerArgs, route.isLazy)

      // Handle the result
      await this.resultHandler.handleResult(result)

      // Execute afterCommand hook
      await this.executeAfterCommandHook(parsedArgs, result)
    } catch (error) {
      // Execute error hook
      await this.executeErrorHook(parsedArgs, error)
      throw error
    }
  }

  /**
   * Create CLI context for command execution
   */
  private createContext(parsedArgs: ParsedArgs, plugins: Plugin[]): CLIContext {
    return {
      config: this.config,
      parsedArgs,
      plugins,
      tuixConfig: this.tuixConfig,
      debug: parsedArgs.options?.debug as boolean | undefined,
      options: parsedArgs.options,
    }
  }

  /**
   * Execute beforeCommand hook
   */
  private async executeBeforeCommandHook(parsedArgs: ParsedArgs): Promise<void> {
    await Effect.runPromise(
      this.hooks.emit(
        createHookEvent('hook:beforeCommand', {
          command: parsedArgs.command,
          args: parsedArgs.options,
        })
      )
    )
  }

  /**
   * Execute afterCommand hook
   */
  private async executeAfterCommandHook(parsedArgs: ParsedArgs, result: unknown): Promise<void> {
    await Effect.runPromise(
      this.hooks.emit(
        createHookEvent('hook:afterCommand', {
          command: parsedArgs.command,
          args: parsedArgs.options,
          result,
        })
      )
    )
  }

  /**
   * Execute error hook
   */
  private async executeErrorHook(parsedArgs: ParsedArgs, error: unknown): Promise<void> {
    await Effect.runPromise(
      this.hooks.emit(
        createHookEvent('hook:onError', {
          error: error instanceof Error ? error : new Error(String(error)),
          command: parsedArgs.command,
          args: parsedArgs.options,
        })
      )
    )
  }
}
