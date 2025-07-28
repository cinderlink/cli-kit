/**
 * CLI Module Error Definitions
 *
 * Centralized error types and factories for the CLI module.
 * All errors use tagged error patterns for proper Effect.ts integration.
 */

import { Effect } from 'effect'

/**
 * Base error class for all CLI module errors
 */
export abstract class CLIError {
  abstract readonly _tag: string
  abstract readonly message: string

  constructor(public readonly cause?: unknown) {}
}

/**
 * Command parsing and routing errors
 */
export class CommandError extends CLIError {
  readonly _tag = 'CommandError'

  constructor(
    public readonly message: string,
    public readonly command?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Plugin system errors
 */
export class PluginError extends CLIError {
  readonly _tag = 'PluginError'

  constructor(
    public readonly message: string,
    public readonly pluginName?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Configuration validation errors
 */
export class ConfigError extends CLIError {
  readonly _tag = 'ConfigError'

  constructor(
    public readonly message: string,
    public readonly configPath?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Command execution errors
 */
export class ExecutionError extends CLIError {
  readonly _tag = 'ExecutionError'

  constructor(
    public readonly message: string,
    public readonly command?: string,
    public readonly exitCode?: number,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Argument parsing errors
 */
export class ArgumentError extends CLIError {
  readonly _tag = 'ArgumentError'

  constructor(
    public readonly message: string,
    public readonly argument?: string,
    public readonly expectedType?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

/**
 * Help generation errors
 */
export class HelpError extends CLIError {
  readonly _tag = 'HelpError'

  constructor(
    public readonly message: string,
    public readonly command?: string,
    cause?: unknown
  ) {
    super(cause)
  }
}

// Error factories for common scenarios
export const CLIErrors = {
  command: (message: string, command?: string, cause?: unknown) =>
    new CommandError(message, command, cause),

  plugin: (message: string, pluginName?: string, cause?: unknown) =>
    new PluginError(message, pluginName, cause),

  config: (message: string, configPath?: string, cause?: unknown) =>
    new ConfigError(message, configPath, cause),

  execution: (message: string, command?: string, exitCode?: number, cause?: unknown) =>
    new ExecutionError(message, command, exitCode, cause),

  argument: (message: string, argument?: string, expectedType?: string, cause?: unknown) =>
    new ArgumentError(message, argument, expectedType, cause),

  help: (message: string, command?: string, cause?: unknown) =>
    new HelpError(message, command, cause),
} as const

// Type union for all CLI errors
export type CLIErrorType =
  | CommandError
  | PluginError
  | ConfigError
  | ExecutionError
  | ArgumentError
  | HelpError

// Effect helpers
export const failWithCLIError = <E extends CLIErrorType>(error: E) => Effect.fail(error)

export const catchCLIError = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, CLIError, R> =>
  Effect.catchAll(effect, (error): Effect.Effect<never, CLIError, never> => {
    if (error instanceof CLIError) {
      return Effect.fail(error)
    }
    return Effect.fail(CLIErrors.execution('Unknown CLI error', undefined, undefined, error))
  })

// Common error predicates
export const isCLIError = (error: unknown): error is CLIErrorType => error instanceof CLIError

export const isCommandError = (error: unknown): error is CommandError =>
  error instanceof CommandError

export const isPluginError = (error: unknown): error is PluginError => error instanceof PluginError

export const isConfigError = (error: unknown): error is ConfigError => error instanceof ConfigError

export const isExecutionError = (error: unknown): error is ExecutionError =>
  error instanceof ExecutionError
