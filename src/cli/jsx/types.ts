/**
 * CLI JSX Type Definitions
 * 
 * Types for CLI-specific JSX components and functionality
 */

import type { TuixConfig } from '../../config'

// Component prop types
export interface CLIProps {
  name: string
  alias?: string
  version?: string
  description?: string
  children?: any
}

export interface PluginProps {
  name: string
  description?: string
  version?: string
  children?: any
}

export interface CommandProps {
  name: string
  description?: string
  aliases?: string[]
  handler?: JSXCommandHandler
  args?: Record<string, JSXArgConfig>
  flags?: Record<string, JSXFlagConfig>
  children?: any
  hidden?: boolean
  interactive?: boolean | ((ctx: JSXCommandContext) => boolean)
}

export interface ArgProps {
  name: string
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
  choices?: string[]
  default?: any
}

export interface FlagProps {
  name: string
  description: string
  alias?: string
  type?: 'string' | 'number' | 'boolean'
  default?: any
  choices?: string[]
}

export interface OptionProps {
  name: string
  description: string
  required?: boolean
  default?: any
  type?: 'string' | 'number' | 'boolean'
}

export interface HelpProps {
  command?: string
  description?: string
  examples?: string[]
  children?: any
}

export interface ExampleProps {
  code: string
  description?: string
}

export interface LoadPluginProps {
  name: string
  path?: string
  config?: Record<string, any>
}

// Command configuration types
export interface JSXCommandConfig {
  name: string
  description?: string
  aliases?: string[]
  args?: Record<string, JSXArgConfig>
  flags?: Record<string, JSXFlagConfig>
  subcommands?: Record<string, JSXCommandConfig>
  handler?: JSXCommandHandler
  examples?: string[]
  hidden?: boolean
  interactive?: boolean | ((ctx: JSXCommandContext) => boolean)
}

export interface JSXArgConfig {
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
  choices?: string[]
  default?: any
}

export interface JSXFlagConfig {
  description: string
  alias?: string
  type?: 'string' | 'number' | 'boolean'
  default?: any
  choices?: string[]
}

export interface JSXCommandHandler {
  (ctx: JSXCommandContext): JSX.Element | Promise<JSX.Element>
}

export interface JSXCommandContext {
  args: Record<string, any>
  flags: Record<string, any>
  command: string
  subcommand?: string
  raw: string[]
  // CLI context
  cliName: string
  tuixConfig?: TuixConfig
  // Helper functions
  prompt: (message: string) => Promise<string>
  confirm: (message: string) => Promise<boolean>
  select: (message: string, choices: string[]) => Promise<string>
  error: (message: string) => void
  success: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

export interface JSXPlugin {
  name: string
  description?: string
  version?: string
  commands?: Record<string, JSXCommandConfig>
  // Hooks removed - plugins should use event system
}