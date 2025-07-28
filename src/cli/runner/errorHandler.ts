/**
 * Error Handler Module
 *
 * Handles error formatting, suggestions for unknown commands,
 * and verbose error output
 */

import type { CLIConfig } from '@cli/types'
import type { CommandSuggestions } from '@cli/router'

export class ErrorHandler {
  constructor(
    private config: CLIConfig,
    private suggestions: CommandSuggestions
  ) {}

  /**
   * Handle unknown command with suggestions
   */
  handleUnknownCommand(commandPath: string[]): void {
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
  handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)

      // Show stack trace in verbose mode
      if (this.isVerboseMode()) {
        console.error(error.stack)
      }
    } else {
      console.error(`Error: ${String(error)}`)
    }
  }

  /**
   * Format validation errors from Zod
   */
  formatValidationError(error: Error): string {
    // Extract meaningful error message from Zod validation errors
    if (error.message.includes('validation')) {
      return error.message.replace(/^.*?:/, 'Validation error:')
    }
    return error.message
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerboseMode(): boolean {
    return process.env.CLI_VERBOSE === 'true'
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args)
  }
}
