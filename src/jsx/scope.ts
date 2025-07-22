/**
 * Scope Component for JSX CLI Framework
 * 
 * A base component that provides command scope management and automatic help rendering
 * for CLI, Plugin, and Command components. Handles the common pattern of:
 * - Managing a command hierarchy
 * - Rendering help when no command is executed
 * - Providing context for child commands
 */

import type { JSX } from './runtime'
import { jsx as jsxFactory } from './runtime'
import type { View } from '@core/types'
import { text, vstack, hstack } from '@core/view'
import { style, Colors } from '@core/terminal/ansi/styles'

export interface ScopeProps {
  type: 'cli' | 'plugin' | 'command'
  name: string
  description?: string
  version?: string
  alias?: string | string[]
  hidden?: boolean
  handler?: (ctx: any) => JSX.Element | View | Promise<JSX.Element | View>
  children?: JSX.Element | JSX.Element[]
  
  // Internal state
  commands?: Record<string, any>
  args?: Record<string, any>
  flags?: Record<string, any>
  examples?: Array<{ example: string; description?: string }>
  help?: string
}

export interface ScopeContext {
  type: 'cli' | 'plugin' | 'command'
  name: string
  description?: string
  version?: string
  parent?: ScopeContext
  commands: Record<string, any>
  args: Record<string, any>
  flags: Record<string, any>
  examples: Array<{ example: string; description?: string }>
  help?: string
  hasExecuted: boolean
}

// Global scope stack for tracking nested scopes
const scopeStack: ScopeContext[] = []

export function getCurrentScope(): ScopeContext | undefined {
  return scopeStack[scopeStack.length - 1]
}

export function pushScope(scope: ScopeContext): void {
  scopeStack.push(scope)
}

export function popScope(): ScopeContext | undefined {
  return scopeStack.pop()
}

/**
 * Generate help content for a scope
 */
export function generateScopeHelp(scope: ScopeContext): View {
  const elements: JSX.Element[] = []
  
  // Title
  const title = scope.type === 'cli' 
    ? `${scope.name}${scope.version ? ` v${scope.version}` : ''}`
    : scope.name
    
  elements.push(
    jsxFactory('text', { 
      color: 'cyan', 
      bold: true,
      children: title
    })
  )
  
  // Description
  if (scope.description) {
    elements.push(jsxFactory('text', { children: scope.description }))
    elements.push(jsxFactory('text', { children: '' }))
  }
  
  // Usage
  const usage = scope.type === 'cli'
    ? `${scope.name} <command> [options]`
    : scope.type === 'plugin'
    ? `${scope.parent?.name || 'cli'} ${scope.name} <command> [options]`
    : `${scope.parent?.name || 'cli'} ${scope.name} [options]`
    
  elements.push(jsxFactory('text', { 
    color: 'yellow',
    children: 'Usage:'
  }))
  elements.push(jsxFactory('text', { 
    children: `  ${usage}`
  }))
  elements.push(jsxFactory('text', { children: '' }))
  
  // Commands
  if (Object.keys(scope.commands).length > 0) {
    elements.push(jsxFactory('text', { 
      color: 'yellow',
      children: 'Commands:'
    }))
    
    Object.entries(scope.commands).forEach(([name, command]) => {
      if (!command.hidden) {
        elements.push(
          jsxFactory('hstack', {
            gap: 2,
            children: [
              jsxFactory('text', { 
                color: 'green',
                children: `  ${name.padEnd(15)}`
              }),
              jsxFactory('text', { 
                children: command.description || ''
              })
            ]
          })
        )
      }
    })
    
    elements.push(jsxFactory('text', { children: '' }))
  }
  
  // Arguments
  if (Object.keys(scope.args).length > 0) {
    elements.push(jsxFactory('text', { 
      color: 'yellow',
      children: 'Arguments:'
    }))
    
    Object.entries(scope.args).forEach(([name, arg]: [string, any]) => {
      elements.push(
        jsxFactory('hstack', {
          gap: 2,
          children: [
            jsxFactory('text', { 
              color: arg.required ? 'red' : 'gray',
              children: `  ${name}${arg.required ? '*' : ''}`
            }),
            jsxFactory('text', { 
              children: arg.description || ''
            })
          ]
        })
      )
    })
    
    elements.push(jsxFactory('text', { children: '' }))
  }
  
  // Flags
  if (Object.keys(scope.flags).length > 0) {
    elements.push(jsxFactory('text', { 
      color: 'yellow',
      children: 'Options:'
    }))
    
    Object.entries(scope.flags).forEach(([name, flag]: [string, any]) => {
      const flagText = flag.alias 
        ? `-${flag.alias}, --${name}`
        : `--${name}`
        
      elements.push(
        jsxFactory('hstack', {
          gap: 2,
          children: [
            jsxFactory('text', { 
              color: 'blue',
              children: `  ${flagText.padEnd(20)}`
            }),
            jsxFactory('text', { 
              children: flag.description || ''
            })
          ]
        })
      )
    })
    
    elements.push(jsxFactory('text', { children: '' }))
  }
  
  // Examples
  if (scope.examples.length > 0) {
    elements.push(jsxFactory('text', { 
      color: 'yellow',
      children: 'Examples:'
    }))
    
    scope.examples.forEach(({ example, description }) => {
      if (description) {
        elements.push(jsxFactory('text', { 
          color: 'gray',
          children: `  # ${description}`
        }))
      }
      elements.push(jsxFactory('text', { 
        children: `  $ ${example}`
      }))
      elements.push(jsxFactory('text', { children: '' }))
    })
  }
  
  // Custom help text
  if (scope.help) {
    elements.push(jsxFactory('text', { children: scope.help }))
    elements.push(jsxFactory('text', { children: '' }))
  }
  
  // Footer
  if (scope.type !== 'command' && Object.keys(scope.commands).length > 0) {
    elements.push(jsxFactory('text', { 
      color: 'gray',
      children: `Use '${scope.name} <command> --help' for more information about a command.`
    }))
  }
  
  return jsxFactory('vstack', { children: elements })
}

/**
 * Scope component that manages command context and help rendering
 */
export function Scope(props: ScopeProps): JSX.Element {
  const parent = getCurrentScope()
  
  // Create scope context
  const scope: ScopeContext = {
    type: props.type,
    name: props.name,
    description: props.description,
    version: props.version,
    parent,
    commands: props.commands || {},
    args: props.args || {},
    flags: props.flags || {},
    examples: props.examples || [],
    help: props.help,
    hasExecuted: false
  }
  
  // Push scope onto stack
  pushScope(scope)
  
  try {
    // Process children to collect commands
    if (props.children) {
      // Children processing happens in the JSX runtime
      // This is where Plugin and Command components register themselves
    }
    
    // If this is a command with a handler, it will be executed by the CLI runner
    // If no handler is executed and this is the top-level scope, show help
    if (!scope.hasExecuted && !parent) {
      return generateScopeHelp(scope)
    }
    
    // Scopes themselves don't render anything
    return jsxFactory('text', { children: '' })
  } finally {
    // Pop scope from stack
    popScope()
  }
}

/**
 * Mark the current scope as having executed a command
 */
export function markScopeExecuted(): void {
  const scope = getCurrentScope()
  if (scope) {
    scope.hasExecuted = true
  }
}