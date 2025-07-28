/**
 * Router Types and Interfaces
 */

import type { CommandConfig, Handler, LazyHandler } from '@cli/types'

/**
 * Result of routing a command
 */
export interface RouteResult {
  handler: Handler | LazyHandler | null
  config: CommandConfig | null
  isLazy: boolean
}

/**
 * Command hierarchy representation
 */
export interface CommandHierarchy {
  [commandName: string]: {
    path: string[]
    description: string
    hasHandler: boolean
    aliases: string[]
    hidden: boolean
    subcommands: CommandHierarchy
  }
}

/**
 * Middleware function type
 */
export type Middleware = (handler: Handler | LazyHandler) => Handler | LazyHandler

/**
 * Command suggestion result
 */
export interface CommandSuggestion {
  command: string
  distance: number
}
