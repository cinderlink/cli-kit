/**
 * CLI Argument Parser
 * 
 * Zod-based argument parsing with type safety and validation
 */

import { z } from "zod"
import type { CLIConfig, CommandConfig, ParsedArgs } from "./types"

/**
 * CLI Argument Parser
 * 
 * A powerful, type-safe command line argument parser built on Zod schemas.
 * Supports nested commands, options, arguments, and validation.
 * 
 * @example
 * ```typescript
 * const config = {
 *   name: "my-cli",
 *   version: "1.0.0",
 *   commands: {
 *     deploy: {
 *       description: "Deploy application",
 *       args: { target: z.string() },
 *       options: { force: z.boolean().default(false) }
 *     }
 *   }
 * }
 * 
 * const parser = new CLIParser(config)
 * const result = parser.parse(["deploy", "production", "--force"])
 * // result.command = ["deploy"]
 * // result.args = { target: "production" }
 * // result.options = { force: true }
 * ```
 */
export class CLIParser {
  /**
   * Create a new CLI parser instance
   * @param config - The CLI configuration defining commands, options, and validation schemas
   */
  constructor(private config: CLIConfig) {}
  
  /**
   * Parse command line arguments into a structured format
   */
  parse(argv: string[]): ParsedArgs {
    const result: ParsedArgs = {
      command: [],
      args: {},
      options: {},
      rawArgs: [...argv]
    }
    
    let i = 0
    let currentConfig: CLIConfig | CommandConfig = this.config
    let currentCommands = this.config.commands || {}
    
    // Parse commands first
    while (i < argv.length) {
      const arg = argv[i]
      if (!arg) break
      
      // Stop parsing commands when we hit an option
      if (arg.startsWith('-')) break
      
      // Check if this is a valid command (including aliases)
      const resolvedCommand = this.resolveCommand(arg, currentCommands)
      if (resolvedCommand) {
        result.command.push(resolvedCommand)
        currentConfig = currentCommands[resolvedCommand] as CommandConfig
        currentCommands = currentConfig.commands || {}
        i++
      } else {
        // Not a command, must be a positional argument
        break
      }
    }
    
    // Parse remaining arguments first (before validation)
    while (i < argv.length) {
      const arg = argv[i]
      
      if (arg === '--') {
        // Everything after -- is treated as raw arguments
        i++
        while (i < argv.length) {
          const rawArg = argv[i]
          if (rawArg !== undefined) {
            result.rawArgs.push(rawArg)
          }
          i++
        }
        break
      }
      
      if (arg && arg.startsWith('--')) {
        // Long option
        const [name, value] = this.parseLongOption(arg)
        const nextArg = argv[i + 1]
        
        if (value !== undefined) {
          this.addOptionValue(result.options, name, this.parseValue(value))
        } else if (nextArg && !nextArg.startsWith('-')) {
          this.addOptionValue(result.options, name, this.parseValue(nextArg))
          i++
        } else {
          this.addOptionValue(result.options, name, true)
        }
      } else if (arg && arg.startsWith('-') && arg.length > 1) {
        // Short option(s)
        this.parseShortOptions(arg.slice(1), result.options, argv, i)
        // Note: parseShortOptions handles incrementing i if needed
      } else if (arg) {
        // Positional argument - will be processed later
        const argIndex = Object.keys(result.args).length
        result.args[argIndex] = this.parseValue(arg)
      }
      
      i++
    }
    
    // Check for help/version before validation
    if (result.options.help || result.options.version) {
      return result
    }
    
    // Parse options and arguments schemas
    const optionSchemas = {
      ...this.config.options,
      ...this.getCommandOptionSchemas(result.command),
      // Add built-in options
      help: z.boolean().default(false),
      version: z.boolean().default(false)
    }
    
    const argSchemas = this.getCommandArgSchemas(result.command)
    
    // Validate and transform arguments using Zod schemas
    this.validateAndTransform(result, optionSchemas, argSchemas)
    
    return result
  }
  
  /**
   * Add a value to an option, handling multiple values by creating arrays
   */
  private addOptionValue(options: Record<string, unknown>, name: string, value: unknown): void {
    if (name in options) {
      // Option already exists - convert to array or append to array
      if (Array.isArray(options[name])) {
        options[name].push(value)
      } else {
        options[name] = [options[name], value]
      }
    } else {
      options[name] = value
    }
  }

  /**
   * Parse a value to the appropriate type
   */
  private parseValue(value: string): string | number | boolean {
    // Try to parse as number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10)
    }
    
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value)
    }
    
    // Try to parse as boolean
    if (value === 'true') return true
    if (value === 'false') return false
    
    // Return as string
    return value
  }
  
  /**
   * Parse long option (--name or --name=value)
   */
  private parseLongOption(arg: string): [string, string | undefined] {
    const equalIndex = arg.indexOf('=')
    if (equalIndex !== -1) {
      return [arg.slice(2, equalIndex), arg.slice(equalIndex + 1)]
    }
    return [arg.slice(2), undefined]
  }
  
  /**
   * Parse short options (-abc becomes a=true, b=true, c=true)
   */
  private parseShortOptions(
    flags: string, 
    options: Record<string, any>,
    argv: string[],
    currentIndex: number
  ): void {
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i]
      if (!flag) continue
      
      // For the last flag, check if next arg is a value
      if (i === flags.length - 1) {
        const nextArg = argv[currentIndex + 1]
        if (nextArg && !nextArg.startsWith('-')) {
          this.addOptionValue(options, flag, this.parseValue(nextArg))
          // Caller will increment currentIndex
        } else {
          this.addOptionValue(options, flag, true)
        }
      } else {
        this.addOptionValue(options, flag, true)
      }
    }
  }
  
  /**
   * Get option schemas for a command path
   */
  private getCommandOptionSchemas(commandPath: string[]): Record<string, z.ZodSchema> {
    let schemas = { ...this.config.options }
    let currentCommands = this.config.commands || {}
    
    for (const command of commandPath) {
      const commandConfig = currentCommands[command]
      if (commandConfig?.options) {
        schemas = { ...schemas, ...commandConfig.options }
      }
      currentCommands = commandConfig?.commands || {}
    }
    
    return schemas
  }
  
  /**
   * Get argument schemas for a command path
   */
  private getCommandArgSchemas(commandPath: string[]): Record<string, z.ZodSchema> {
    let currentCommands = this.config.commands || {}
    
    for (const command of commandPath) {
      const commandConfig = currentCommands[command]
      if (commandPath.indexOf(command) === commandPath.length - 1) {
        // This is the final command, return its args
        return commandConfig?.args || {}
      }
      currentCommands = commandConfig?.commands || {}
    }
    
    return {}
  }
  
  /**
   * Resolve command name (including aliases)
   */
  private resolveCommand(name: string, commands: Record<string, CommandConfig>): string | null {
    // Direct match
    if (commands[name]) {
      return name
    }
    
    // Check aliases
    for (const [commandName, config] of Object.entries(commands)) {
      if (config.aliases?.includes(name)) {
        return commandName
      }
    }
    
    return null
  }
  
  /**
   * Validate and transform parsed arguments using Zod schemas
   */
  private validateAndTransform(
    result: ParsedArgs,
    optionSchemas: Record<string, z.ZodSchema>,
    argSchemas: Record<string, z.ZodSchema>
  ): void {
    // Validate options
    for (const [name, schema] of Object.entries(optionSchemas)) {
      try {
        if (name in result.options) {
          result.options[name] = schema.parse(result.options[name])
        } else {
          // Check if schema has a default
          const defaultResult = schema.safeParse(undefined)
          if (defaultResult.success) {
            result.options[name] = defaultResult.data
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid option --${name}: ${error.errors[0]?.message || 'validation failed'}`)
        }
        throw error
      }
    }
    
    // Reorganize positional arguments by name
    const argNames = Object.keys(argSchemas)
    const positionalArgs = Object.values(result.args)
    const newArgs: Record<string, any> = {}
    
    // Map positional args to named args
    argNames.forEach((name, index) => {
      const schema = argSchemas[name]
      
      if (schema && schema instanceof z.ZodArray) {
        // This is an array argument - collect all remaining positional args
        if (index < positionalArgs.length) {
          newArgs[name] = positionalArgs.slice(index)
        }
      } else {
        // Regular single argument
        if (index < positionalArgs.length) {
          newArgs[name] = positionalArgs[index]
        }
      }
    })
    
    // Validate arguments
    for (const [name, schema] of Object.entries(argSchemas)) {
      try {
        if (name in newArgs) {
          newArgs[name] = schema.parse(newArgs[name])
        } else {
          // Check if schema has a default or is optional
          const defaultResult = schema.safeParse(undefined)
          if (defaultResult.success) {
            newArgs[name] = defaultResult.data
          } else {
            throw new Error(`Missing required argument: ${name}`)
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid argument ${name}: ${error.errors[0]?.message || 'validation failed'}`)
        }
        throw error
      }
    }
    
    result.args = newArgs
  }
  
  /**
   * Generate help text for the CLI or a specific command
   */
  generateHelp(commandPath?: string[]): string {
    const lines: string[] = []
    
    if (!commandPath || commandPath.length === 0) {
      // Global help
      lines.push(`${this.config.name} v${this.config.version}`)
      if (this.config.description) {
        lines.push(`${this.config.description}`)
      }
      lines.push("")
      
      lines.push("USAGE:")
      lines.push(`  ${this.config.name} [OPTIONS] <COMMAND>`)
      lines.push("")
      
      // Global options
      if (Object.keys(this.config.options || {}).length > 0) {
        lines.push("OPTIONS:")
        this.addOptionsHelp(lines, this.config.options || {})
        lines.push("")
      }
      
      // Commands
      if (Object.keys(this.config.commands || {}).length > 0) {
        lines.push("COMMANDS:")
        this.addCommandsHelp(lines, this.config.commands || {})
      }
    } else {
      // Command-specific help
      const commandConfig = this.getCommandConfig(commandPath)
      if (!commandConfig) {
        return `Unknown command: ${commandPath.join(' ')}`
      }
      
      lines.push(`${this.config.name} ${commandPath.join(' ')}`)
      if (commandConfig.description) {
        lines.push(`${commandConfig.description}`)
      }
      lines.push("")
      
      lines.push("USAGE:")
      const usage = [`${this.config.name}`, ...commandPath]
      
      if (commandConfig.options && Object.keys(commandConfig.options).length > 0) {
        usage.push("[OPTIONS]")
      }
      
      if (commandConfig.args) {
        Object.keys(commandConfig.args).forEach(arg => {
          usage.push(`<${arg}>`)
        })
      }
      
      if (commandConfig.commands && Object.keys(commandConfig.commands).length > 0) {
        usage.push("<COMMAND>")
      }
      
      lines.push(`  ${usage.join(' ')}`)
      lines.push("")
      
      // Command options
      if (commandConfig.options && Object.keys(commandConfig.options).length > 0) {
        lines.push("OPTIONS:")
        this.addOptionsHelp(lines, commandConfig.options)
        lines.push("")
      }
      
      // Subcommands
      if (commandConfig.commands && Object.keys(commandConfig.commands).length > 0) {
        lines.push("COMMANDS:")
        this.addCommandsHelp(lines, commandConfig.commands)
      }
    }
    
    return lines.join('\n')
  }
  
  private getSchemaDescription(schema: z.ZodSchema): string {
    // Safely extract description from Zod schema
    if ('_def' in schema && typeof schema._def === 'object' && schema._def && 'description' in schema._def) {
      return String(schema._def.description || "")
    }
    return ""
  }

  private addOptionsHelp(lines: string[], options: Record<string, z.ZodSchema>): void {
    Object.entries(options).forEach(([name, schema]) => {
      const description = this.getSchemaDescription(schema)
      lines.push(`  --${name.padEnd(20)} ${description}`)
    })
  }
  
  private addCommandsHelp(lines: string[], commands: Record<string, CommandConfig>): void {
    Object.entries(commands).forEach(([name, config]) => {
      if (!config.hidden) {
        lines.push(`  ${name.padEnd(20)} ${config.description || ""}`)
      }
    })
  }
  
  private getCommandConfig(commandPath: string[]): CommandConfig | null {
    let currentCommands = this.config.commands || {}
    let currentConfig: CommandConfig | null = null
    
    for (const command of commandPath) {
      currentConfig = currentCommands[command] || null
      if (!currentConfig) return null
      currentCommands = currentConfig.commands || {}
    }
    
    return currentConfig
  }
}

// Alias for test compatibility
export { CLIParser as Parser }