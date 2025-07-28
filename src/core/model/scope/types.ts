/**
 * Core Scope Types
 *
 * Defines the fundamental types for the scope management system
 */

/**
 * Scope definition that describes a scope in the hierarchy
 */
export interface ScopeDef {
  /** Unique identifier for this scope */
  id: string

  /** Type of scope */
  type: 'cli' | 'plugin' | 'command' | 'arg' | 'flag' | 'option' | 'component'

  /** Name of the scope (used in path) */
  name: string

  /** Full path from root to this scope */
  path: string[]

  /** User-friendly description */
  description?: string

  /** Whether this scope can be executed (commands/plugins) */
  executable?: boolean

  /** Handler function for executable scopes */
  handler?: Handler // Will be properly typed when integrated with CLI

  /** Arguments definition for commands */
  args?: Record<string, ArgDef>

  /** Flags definition for commands */
  flags?: Record<string, FlagDef>

  /** Command aliases */
  aliases?: string[]

  /** Additional metadata */
  metadata?: Record<string, unknown>

  /** Child scopes (populated by scope manager) */
  children: ScopeDef[]
}

/**
 * Scope status tracking
 */
export type ScopeStatus = 'unmounted' | 'mounted' | 'rendered' | 'executed'

/**
 * Scope state managed by the scope manager
 */
export interface ScopeState {
  /** The scope definition */
  def: ScopeDef

  /** Current status */
  status: ScopeStatus

  /** Whether this scope is currently active */
  isActive: boolean

  /** Context data for this scope */
  context: Record<string, unknown>

  /** Transient state (reset between renders) */
  transient: Record<string, unknown>

  /** Parent scope ID */
  parentId?: string

  /** Child scope IDs */
  childIds: string[]
}

/**
 * Scope manager errors
 */
export class ScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly scopeId?: string
  ) {
    super(message)
    this.name = 'ScopeError'
  }
}

/**
 * Scope not found error
 */
export class ScopeNotFoundError extends ScopeError {
  constructor(scopeId: string) {
    super(`Scope not found: ${scopeId}`, 'SCOPE_NOT_FOUND', scopeId)
  }
}

/**
 * Scope already exists error
 */
export class ScopeExistsError extends ScopeError {
  constructor(scopeId: string) {
    super(`Scope already exists: ${scopeId}`, 'SCOPE_EXISTS', scopeId)
  }
}

/**
 * Legacy ScopeContext type for backwards compatibility
 * Maps to the new ScopeDef structure
 */
export interface ScopeContext extends Omit<ScopeDef, 'children'> {
  // Keep the same structure but allow both interfaces to be used
  parent?: ScopeContext
  children: ScopeContext[]
  hidden?: boolean
  options?: Record<string, OptionDef>
}

/**
 * Argument definition for CLI commands
 */
export interface ArgDef {
  type: 'string' | 'number' | 'boolean'
  description?: string
  required?: boolean
  default?: unknown
  validate?: (value: unknown) => boolean
}

/**
 * Flag definition for CLI commands
 */
export interface FlagDef {
  shortName?: string
  description?: string
  conflicts?: string[]
  dependsOn?: string[]
}

/**
 * Option definition for CLI commands
 */
export interface OptionDef {
  type: 'string' | 'number' | 'boolean'
  shortName?: string
  description?: string
  required?: boolean
  default?: unknown
  choices?: readonly unknown[]
}

/**
 * Handler function type for executable scopes
 */
export interface Handler {
  (args: ParsedArgs, scope: ScopeContext): Effect.Effect<ExitCode, ExecutionError>
}

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  command: string[]
  args: Record<string, unknown>
  flags: Set<string>
  options: Record<string, unknown>
  _: string[] // Positional args
  __: string[] // Everything after --
}

/**
 * Process exit codes
 */
export type ExitCode = 0 | 1 | 2 | 3 | number

/**
 * Execution error that can occur during command handling
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: ExitCode = 1,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ExecutionError'
  }
}

/**
 * Command tree structure for CLI routing
 */
export interface CommandTree {
  [command: string]: CommandNode
}

/**
 * Node in the command tree
 */
export interface CommandNode {
  scope?: ScopeContext
  handler?: ScopeContext['handler']
  description?: string
  subcommands?: CommandTree
}

// Re-export Effect for convenience
import { Effect } from 'effect'
export { Effect }
