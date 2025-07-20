/**
 * CLI Domain Event System
 * 
 * Defines events specific to the CLI command processing domain.
 * These events track command registration, execution, parsing, and routing.
 */

import type { ParsedArgs, ScopeContext, ExitCode } from '../scope'

/**
 * Base event interface for all CLI events
 */
export interface BaseCLIEvent {
  readonly timestamp: Date
  readonly source: 'cli'
}

/**
 * CLI command lifecycle events
 */
export interface CLICommandEvent extends BaseCLIEvent {
  readonly type: 'cli-command-registered' | 'cli-command-executed' | 'cli-command-failed'
  readonly path: string[]
  readonly args?: ParsedArgs
  readonly result?: unknown
  readonly error?: Error
  readonly executionTime?: number
  readonly exitCode?: ExitCode
}

/**
 * CLI parsing events
 */
export interface CLIParseEvent extends BaseCLIEvent {
  readonly type: 'cli-parse-start' | 'cli-parse-success' | 'cli-parse-error'
  readonly input: string[]
  readonly result?: ParsedArgs
  readonly error?: Error
}

/**
 * CLI routing events
 */
export interface CLIRouteEvent extends BaseCLIEvent {
  readonly type: 'cli-route-found' | 'cli-route-not-found'
  readonly path: string[]
  readonly handler?: Function
  readonly scope?: ScopeContext
}

/**
 * CLI plugin events
 */
export interface CLIPluginEvent extends BaseCLIEvent {
  readonly type: 'cli-plugin-loaded' | 'cli-plugin-unloaded' | 'cli-plugin-error'
  readonly pluginName: string
  readonly pluginPath?: string
  readonly error?: Error
}

/**
 * CLI help events
 */
export interface CLIHelpEvent extends BaseCLIEvent {
  readonly type: 'cli-help-requested' | 'cli-help-displayed'
  readonly path: string[]
  readonly scope?: ScopeContext
}

/**
 * All CLI event types
 */
export type CLIEvent = 
  | CLICommandEvent
  | CLIParseEvent
  | CLIRouteEvent
  | CLIPluginEvent
  | CLIHelpEvent

/**
 * CLI event channel names
 */
export const CLIEventChannels = {
  COMMAND: 'cli-command',
  PARSE: 'cli-parse',
  ROUTE: 'cli-route',
  PLUGIN: 'cli-plugin',
  HELP: 'cli-help'
} as const

export type CLIEventChannel = typeof CLIEventChannels[keyof typeof CLIEventChannels]

/**
 * Parse error details
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly input: string[],
    public readonly position?: number
  ) {
    super(message)
    this.name = 'ParseError'
  }
}