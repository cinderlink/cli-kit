/**
 * Parser Types
 */

import type { CLIConfig } from "@cli/types"

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  /** The command path that was matched */
  command: string[]
  /** Parsed options/flags */
  options: Record<string, unknown>
  /** Parsed positional arguments */
  args: Record<string, unknown>
  /** Raw unparsed arguments */
  rawArgs: string[]
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** Stop parsing at first unknown option */
  stopAtUnknown?: boolean
  /** Allow unknown options */
  allowUnknown?: boolean
  /** Custom value parser */
  valueParser?: (value: string) => unknown
}