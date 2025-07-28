/**
 * Help Data Structure
 *
 * View-agnostic data structures for help generation.
 * View runtimes can transform this data into their preferred format.
 */

import type { CommandConfig, CLIConfig } from '@cli/types'
import { z } from 'zod'

/**
 * Abstract help section that can be rendered by any view runtime
 */
export interface HelpSection {
  type:
    | 'header'
    | 'usage'
    | 'description'
    | 'commands'
    | 'options'
    | 'arguments'
    | 'examples'
    | 'footer'
  title?: string
  content?: string
  items?: HelpItem[]
}

/**
 * Individual help item (command, option, argument)
 */
export interface HelpItem {
  name: string
  description?: string
  aliases?: string[]
  required?: boolean
  type?: string
  defaultValue?: unknown
}

/**
 * Complete help data structure
 */
export interface HelpData {
  name: string
  version?: string
  description?: string
  sections: HelpSection[]
  commandPath?: string[]
}

/**
 * Generate help data from CLI configuration
 */
export function generateHelpData(config: CLIConfig, commandPath?: string[]): HelpData {
  if (!commandPath || commandPath.length === 0) {
    return generateGlobalHelpData(config)
  }

  return generateCommandHelpData(config, commandPath)
}

/**
 * Generate global help data
 */
function generateGlobalHelpData(config: CLIConfig): HelpData {
  const sections: HelpSection[] = []

  // Header section
  sections.push({
    type: 'header',
    content: config.name,
  })

  // Description
  if (config.description) {
    sections.push({
      type: 'description',
      content: config.description,
    })
  }

  // Usage
  sections.push({
    type: 'usage',
    content: `${config.name} [OPTIONS] <COMMAND>`,
  })

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    sections.push({
      type: 'options',
      title: 'OPTIONS',
      items: Object.entries(config.options).map(([name, schema]) => ({
        name: `--${name}`,
        description: getSchemaDescription(schema),
        type: getSchemaType(schema),
        defaultValue: getSchemaDefault(schema),
      })),
    })
  }

  // Commands
  if (config.commands && Object.keys(config.commands).length > 0) {
    sections.push({
      type: 'commands',
      title: 'COMMANDS',
      items: Object.entries(config.commands)
        .filter(([, cmd]) => !cmd.hidden)
        .map(([name, cmd]) => ({
          name,
          description: cmd.description,
          aliases: cmd.aliases,
        })),
    })
  }

  // Examples
  sections.push({
    type: 'examples',
    title: 'EXAMPLES',
    items: [
      { name: `${config.name} --help`, description: 'Show this help' },
      { name: `${config.name} --version`, description: 'Show version' },
    ],
  })

  return {
    name: config.name,
    version: config.version,
    description: config.description,
    sections,
  }
}

/**
 * Generate command-specific help data
 */
function generateCommandHelpData(config: CLIConfig, commandPath: string[]): HelpData {
  const command = getCommandByPath(config, commandPath)
  if (!command) {
    return {
      name: config.name,
      commandPath,
      sections: [
        {
          type: 'description',
          content: `Unknown command: ${commandPath.join(' ')}`,
        },
      ],
    }
  }

  const sections: HelpSection[] = []
  const fullCommand = [config.name, ...commandPath].join(' ')

  // Header
  sections.push({
    type: 'header',
    content: fullCommand,
  })

  // Description
  if (command.description) {
    sections.push({
      type: 'description',
      content: command.description,
    })
  }

  // Usage
  const usageParts = [fullCommand]
  if (command.options && Object.keys(command.options).length > 0) {
    usageParts.push('[OPTIONS]')
  }
  if (command.args) {
    Object.keys(command.args).forEach(arg => {
      usageParts.push(`<${arg}>`)
    })
  }
  if (command.commands && Object.keys(command.commands).length > 0) {
    usageParts.push('<COMMAND>')
  }

  sections.push({
    type: 'usage',
    content: usageParts.join(' '),
  })

  // Arguments
  if (command.args && Object.keys(command.args).length > 0) {
    sections.push({
      type: 'arguments',
      title: 'ARGUMENTS',
      items: Object.entries(command.args).map(([name, schema]) => ({
        name: `<${name}>`,
        description: getSchemaDescription(schema),
        type: getSchemaType(schema),
        required: isSchemaRequired(schema),
      })),
    })
  }

  // Options
  if (command.options && Object.keys(command.options).length > 0) {
    sections.push({
      type: 'options',
      title: 'OPTIONS',
      items: Object.entries(command.options).map(([name, schema]) => ({
        name: `--${name}`,
        description: getSchemaDescription(schema),
        type: getSchemaType(schema),
        defaultValue: getSchemaDefault(schema),
      })),
    })
  }

  // Subcommands
  if (command.commands && Object.keys(command.commands).length > 0) {
    sections.push({
      type: 'commands',
      title: 'COMMANDS',
      items: Object.entries(command.commands)
        .filter(([, cmd]) => !cmd.hidden)
        .map(([name, cmd]) => ({
          name,
          description: cmd.description,
          aliases: cmd.aliases,
        })),
    })
  }

  return {
    name: config.name,
    commandPath,
    sections,
  }
}

/**
 * Get command by path
 */
function getCommandByPath(config: CLIConfig, commandPath: string[]): CommandConfig | null {
  let current = config.commands || {}
  let command: CommandConfig | null = null

  for (const part of commandPath) {
    command = current[part] ?? null
    if (!command) return null
    current = command.commands || {}
  }

  return command
}

/**
 * Extract description from Zod schema
 */
function getSchemaDescription(schema: z.ZodSchema): string {
  if (
    '_def' in schema &&
    typeof schema._def === 'object' &&
    schema._def &&
    'description' in schema._def
  ) {
    return String(schema._def.description || '')
  }
  return ''
}

/**
 * Get schema type name
 */
function getSchemaType(schema: z.ZodSchema): string {
  if ('_def' in schema && schema._def && 'typeName' in schema._def) {
    const typeName = String(schema._def.typeName || '')
    // Convert Zod type names to user-friendly names
    switch (typeName) {
      case 'ZodString':
        return 'string'
      case 'ZodNumber':
        return 'number'
      case 'ZodBoolean':
        return 'boolean'
      case 'ZodArray':
        return 'array'
      case 'ZodObject':
        return 'object'
      case 'ZodEnum':
        return 'enum'
      case 'ZodUnion':
        return 'union'
      case 'ZodOptional':
        return getSchemaType((schema as z.ZodOptional<any>).unwrap()) + '?'
      default:
        return 'unknown'
    }
  }
  return 'unknown'
}

/**
 * Check if schema is required
 */
function isSchemaRequired(schema: z.ZodSchema): boolean {
  if ('_def' in schema && schema._def && 'typeName' in schema._def) {
    return schema._def.typeName !== 'ZodOptional'
  }
  return true
}

/**
 * Get default value from schema
 */
function getSchemaDefault(schema: z.ZodSchema): unknown {
  if ('_def' in schema && schema._def && 'defaultValue' in schema._def) {
    return (schema._def as any).defaultValue?.()
  }
  return undefined
}
