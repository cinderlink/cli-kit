/**
 * Main CLI Parser Implementation
 */

import { z } from 'zod'
import type { CLIConfig } from '@cli/types'
import type { ParsedArgs, ParserOptions } from './types'
import { parseValue, addOptionValue } from './value'
import { parseLongOption, parseShortOptions } from './options'
import { findCommand, getCommandOptionSchemas, getCommandArgSchemas } from './command'
import { validateAndTransform } from './schema'

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
   * @param options - Parser options
   */
  constructor(
    private config: CLIConfig,
    private options: ParserOptions = {}
  ) {}

  /**
   * Parse command line arguments into a structured format
   */
  parse(argv: string[]): ParsedArgs {
    const result: ParsedArgs = {
      command: [],
      args: {},
      options: {},
      rawArgs: [...argv],
    }

    let i = 0

    // Parse command path first
    while (i < argv.length && !argv[i].startsWith('-')) {
      const potentialCommand = [...result.command, argv[i]]
      if (findCommand(this.config, potentialCommand)) {
        result.command.push(argv[i])
        i++
      } else {
        break
      }
    }

    // Parse options and remaining arguments
    while (i < argv.length) {
      const arg = argv[i]

      if (arg === '--') {
        // End of options marker
        i++
        // Rest are positional arguments
        while (i < argv.length) {
          const argIndex = Object.keys(result.args).length
          result.args[argIndex] = argv[i]
          i++
        }
        break
      } else if (arg && arg.startsWith('--')) {
        // Long option
        const [name, value] = parseLongOption(arg)
        const nextArg = argv[i + 1]

        if (value !== undefined) {
          addOptionValue(
            result.options,
            name,
            this.options.valueParser ? this.options.valueParser(value) : parseValue(value)
          )
        } else if (nextArg && !nextArg.startsWith('-')) {
          addOptionValue(
            result.options,
            name,
            this.options.valueParser ? this.options.valueParser(nextArg) : parseValue(nextArg)
          )
          i++
        } else {
          addOptionValue(result.options, name, true)
        }
      } else if (arg && arg.startsWith('-') && arg.length > 1) {
        // Short option(s)
        const consumed = parseShortOptions(arg.slice(1), result.options, argv, i)
        i += consumed
      } else if (arg) {
        // Positional argument - keep as string for schema validation
        const argIndex = Object.keys(result.args).length
        result.args[argIndex] = arg
      }

      i++
    }

    // Check for help/version before validation
    if (result.options.help || result.options.version) {
      return result
    }

    // Get schemas for validation
    const optionSchemas = {
      ...this.config.options,
      ...getCommandOptionSchemas(this.config, result.command),
      // Add built-in options
      help: z.boolean().default(false),
      version: z.boolean().default(false),
    }

    const argSchemas = getCommandArgSchemas(this.config, result.command)

    // Validate and transform
    validateAndTransform(result, optionSchemas, argSchemas)

    return result
  }
}
