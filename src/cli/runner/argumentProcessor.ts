/**
 * Argument Processor Module
 * 
 * Handles parsing and processing of command line arguments
 */

import type { CLIConfig, ParsedArgs, CommandConfig } from "@cli/types"
import type { CLIParser } from "@cli/core/parser"

export interface ProcessedArguments {
  parsedArgs: ParsedArgs
  handlerArgs: Record<string, unknown>
  shouldShowHelp: boolean
  shouldShowVersion: boolean
  hasCommand: boolean
}

export class ArgumentProcessor {
  constructor(
    private config: CLIConfig,
    private parser: CLIParser
  ) {}
  
  /**
   * Process command line arguments
   */
  processArguments(argv: string[] = process.argv.slice(2)): ProcessedArguments {
    // Parse arguments
    const parsedArgs = this.parser.parse(argv)
    
    // Check for built-in options
    const shouldShowHelp = parsedArgs.options.help === true
    const shouldShowVersion = parsedArgs.options.version === true
    const hasCommand = parsedArgs.command.length > 0
    
    // Process handler arguments
    const handlerArgs = this.buildHandlerArgs(parsedArgs)
    
    return {
      parsedArgs,
      handlerArgs,
      shouldShowHelp,
      shouldShowVersion,
      hasCommand
    }
  }
  
  /**
   * Build handler arguments from parsed args
   */
  private buildHandlerArgs(parsedArgs: ParsedArgs, commandConfig?: CommandConfig): Record<string, unknown> {
    // Extract positional arguments
    const positionalArgs = this.extractPositionalArgs(parsedArgs, commandConfig)
    
    // Merge all arguments
    return {
      ...positionalArgs,       // Named positional args
      ...parsedArgs.options,   // Flags/options
      _raw: {
        command: parsedArgs.command,
        args: parsedArgs.rawArgs.slice(parsedArgs.command.length),
        options: parsedArgs.options
      }
    }
  }
  
  /**
   * Extract and parse positional arguments
   */
  private extractPositionalArgs(
    parsedArgs: ParsedArgs, 
    commandConfig?: CommandConfig
  ): Record<string, unknown> {
    const positionalArgs = parsedArgs.rawArgs.slice(parsedArgs.command.length)
    const result: Record<string, unknown> = {}
    
    if (!commandConfig?.args) {
      return result
    }
    
    const argNames = Object.keys(commandConfig.args)
    argNames.forEach((argName, index) => {
      if (index < positionalArgs.length) {
        const argConfig = commandConfig.args![argName]
        let value: unknown = positionalArgs[index]
        
        // Parse the value based on type if Zod schema is provided
        if (argConfig && typeof argConfig.parse === 'function') {
          try {
            value = argConfig.parse(value)
          } catch (error) {
            // If parsing fails, keep the raw value
            console.warn(`Failed to parse argument "${argName}":`, error)
          }
        }
        
        result[argName] = value
      }
    })
    
    return result
  }
  
  /**
   * Update handler args with command config
   */
  updateHandlerArgs(
    handlerArgs: Record<string, unknown>,
    commandConfig: CommandConfig
  ): Record<string, unknown> {
    const parsedArgs = handlerArgs._raw as {
      command: string[]
      args: string[]
      options: Record<string, unknown>
    }
    
    // Re-parse positional args with command config
    const positionalArgs = this.extractPositionalArgs(
      {
        command: parsedArgs.command,
        args: {},
        options: parsedArgs.options,
        rawArgs: [...parsedArgs.command, ...parsedArgs.args]
      },
      commandConfig
    )
    
    return {
      ...positionalArgs,
      ...parsedArgs.options,
      _raw: handlerArgs._raw
    }
  }
}