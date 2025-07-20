/**
 * CLI building components for JSX
 * Handles CLI, Command, and Scope JSX components
 */

import type { JSX } from '../types'
import { debug } from '../utils/debug'
import { text } from '../runtime/view-factory'

/**
 * CLI configuration interface
 */
export interface CLIConfig {
  name: string
  alias?: string
  description?: string
  version?: string
  configName?: string
}

/**
 * Command configuration interface
 */
export interface CommandConfig {
  name?: string
  description?: string
  aliases?: string[]
  hidden?: boolean
  handler?: (ctx: any) => any
  interactive?: boolean | ((ctx: any) => boolean)
  schema?: any
  args?: Record<string, any>
  flags?: Record<string, any>
}

/**
 * Scope configuration interface
 */
export interface ScopeConfig {
  name: string
  description?: string
}

/**
 * Global CLI state
 */
let currentCLIConfig: CLIConfig | null = null
let cliInitialized = false

/**
 * CLI component - top level application definition
 */
export function CLI(props: {
  name: string
  alias?: string
  description?: string
  version?: string
  configName?: string
  children?: JSX.Element | JSX.Element[] | ((context: { config: any }) => JSX.Element)
}): JSX.Element {
  debug(`[CLI] Initializing CLI: ${props.name}`)
  
  // Store CLI configuration
  currentCLIConfig = {
    name: props.name,
    alias: props.alias,
    description: props.description,
    version: props.version,
    configName: props.configName || props.name
  }
  
  // Initialize configuration system (would be implemented properly)
  if (!cliInitialized) {
    initializeCLI(currentCLIConfig)
    cliInitialized = true
  }
  
  // Process children - they may be a function that receives config
  if (typeof props.children === 'function') {
    // Mock config object for now
    const mockConfig = { 
      name: props.name,
      version: props.version || '1.0.0'
    }
    props.children({ config: mockConfig })
  }
  
  debug(`[CLI] CLI ${props.name} initialized`)
  
  // CLI is invisible - it sets up the environment
  return text('')
}

/**
 * Command component - defines a CLI command
 */
export function Command(props: {
  name?: string
  description?: string
  aliases?: string[]
  hidden?: boolean
  handler?: (ctx: any) => JSX.Element | Promise<JSX.Element>
  children?: JSX.Element | JSX.Element[] | ((context: any) => JSX.Element)
  interactive?: boolean | ((ctx: any) => boolean)
  schema?: any
  args?: Record<string, any>
  flags?: Record<string, any>
}): JSX.Element {
  debug(`[CLI] Defining command: ${props.name || 'anonymous'}`)
  
  const commandConfig: CommandConfig = {
    name: props.name,
    description: props.description,
    aliases: props.aliases,
    hidden: props.hidden,
    handler: props.handler,
    interactive: props.interactive,
    schema: props.schema,
    args: props.args,
    flags: props.flags
  }
  
  // Register command (would interface with actual CLI system)
  registerCommand(commandConfig)
  
  // Process children if they're a function
  if (typeof props.children === 'function') {
    // Mock context for now
    const mockContext = {
      args: {},
      flags: {},
      config: currentCLIConfig
    }
    props.children(mockContext)
  }
  
  debug(`[CLI] Command ${props.name || 'anonymous'} registered`)
  
  // Commands are invisible during JSX processing
  return text('')
}

/**
 * Scope component - groups related commands
 */
export function Scope(props: {
  name: string
  description?: string
  children?: JSX.Element | JSX.Element[]
}): JSX.Element {
  debug(`[CLI] Defining scope: ${props.name}`)
  
  const scopeConfig: ScopeConfig = {
    name: props.name,
    description: props.description
  }
  
  // Enter scope context
  enterScope(scopeConfig)
  
  // Process children (commands within this scope)
  // Children will automatically be in this scope context
  
  // Exit scope context
  exitScope()
  
  debug(`[CLI] Scope ${props.name} processed`)
  
  // Scopes are invisible during JSX processing
  return text('')
}

/**
 * Arg component - defines a command argument
 */
export function Arg(props: {
  name: string
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
  choices?: string[]
  default?: any
}): JSX.Element {
  debug(`[CLI] Defining argument: ${props.name}`)
  
  // Register argument with current command context
  registerArg(props)
  
  return text('')
}

/**
 * Flag component - defines a command flag
 */
export function Flag(props: {
  name: string
  description: string
  alias?: string
  type?: 'string' | 'number' | 'boolean'
  default?: any
  choices?: string[]
}): JSX.Element {
  debug(`[CLI] Defining flag: ${props.name}`)
  
  // Register flag with current command context
  registerFlag(props)
  
  return text('')
}

/**
 * Help component - adds help content to current command
 */
export function Help(props: {
  children?: string | JSX.Element | JSX.Element[]
}): JSX.Element {
  debug(`[CLI] Adding help content`)
  
  // Register help content with current command
  if (typeof props.children === 'string') {
    registerHelp(props.children)
  }
  
  return text('')
}

/**
 * Example component - adds usage example to current command
 */
export function Example(props: {
  children?: string
  description?: string
}): JSX.Element {
  debug(`[CLI] Adding example`)
  
  if (typeof props.children === 'string') {
    registerExample(props.children, props.description)
  }
  
  return text('')
}

// Internal functions that would interface with actual CLI system

function initializeCLI(config: CLIConfig): void {
  debug(`[CLI] Initializing CLI system for: ${config.name}`)
  // Would initialize the actual CLI framework here
}

function registerCommand(config: CommandConfig): void {
  debug(`[CLI] Registering command: ${config.name}`)
  // Would register with actual CLI system
}

function enterScope(config: ScopeConfig): void {
  debug(`[CLI] Entering scope: ${config.name}`)
  // Would push scope onto context stack
}

function exitScope(): void {
  debug(`[CLI] Exiting scope`)
  // Would pop scope from context stack
}

function registerArg(config: any): void {
  debug(`[CLI] Registering arg: ${config.name}`)
  // Would register with current command
}

function registerFlag(config: any): void {
  debug(`[CLI] Registering flag: ${config.name}`)
  // Would register with current command
}

function registerHelp(content: string): void {
  debug(`[CLI] Registering help content`)
  // Would add to current command
}

function registerExample(example: string, description?: string): void {
  debug(`[CLI] Registering example: ${example}`)
  // Would add to current command
}

/**
 * Get current CLI configuration
 */
export function getCurrentCLIConfig(): CLIConfig | null {
  return currentCLIConfig
}

/**
 * Reset CLI state (for testing)
 */
export function resetCLIState(): void {
  currentCLIConfig = null
  cliInitialized = false
}