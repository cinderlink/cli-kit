/**
 * CommandLineHelp Component
 *
 * Displays help text based on current scope information.
 * Sources data from scope stores.
 */

import { scopeManager } from '@core/model/scope/manager'
import { useCurrentScope } from '@core/model/scope/jsx/hooks'
import { text, vstack, hstack } from '@core/view/primitives/view'
import { Colors, toAnsiSequence, ColorProfile, type Color } from '@core/terminal/ansi/styles'
import type { JSX } from '@jsx/runtime'
import type { View } from '@core/types'
import { isDebugEnabled } from '@core/debug'

export interface CommandLineHelpProps {
  scopeId?: string
}

// Helper to create styled text
function styledText(content: string, styles: any): View {
  // Apply styles using ANSI escape codes
  const styleSeq: string[] = []

  if (styles.foreground) {
    // If it's a Color object, convert to ANSI sequence
    if (typeof styles.foreground === 'object' && styles.foreground._tag) {
      styleSeq.push(toAnsiSequence(styles.foreground, ColorProfile.ANSI, false))
    } else {
      // If it's already a string, use it directly
      styleSeq.push(styles.foreground)
    }
  }
  if (styles.bold) {
    styleSeq.push('\x1b[1m')
  }
  if (styles.faint) {
    styleSeq.push('\x1b[2m')
  }
  if (styles.italic) {
    styleSeq.push('\x1b[3m')
  }

  const styledContent = styleSeq.length > 0 ? `${styleSeq.join('')}${content}\x1b[0m` : content

  return text(styledContent)
}

export function CommandLineHelp(props: CommandLineHelpProps): View {
  const currentScope = props.scopeId ? scopeManager.getScopeDef(props.scopeId) : useCurrentScope()

  if (!currentScope) {
    return text('No help available')
  }

  const elements: View[] = []

  // Get the full command path for display
  const commandPath = currentScope.path.length > 0 ? currentScope.path.join(' ') : currentScope.name

  // Title section with name and description
  elements.push(
    vstack(
      styledText(commandPath, { foreground: Colors.cyan, bold: true }),
      currentScope.description
        ? styledText(currentScope.description, { foreground: Colors.white, faint: true })
        : text('')
    )
  )

  // Get child scopes - use both direct children and path-based lookup for missing hierarchies
  const directChildren = scopeManager.getChildScopes(currentScope.id)

  // Also find scopes that should be children based on path patterns
  // This handles cases where JSX processing order breaks parent-child relationships
  const allScopes = scopeManager.getAllScopes()
  const expectedChildren = allScopes.filter(scope => {
    // Skip self and direct children (already found)
    if (scope.id === currentScope.id || directChildren.find(child => child.id === scope.id)) {
      return false
    }

    // For root CLI scopes, look for plugins that should be direct children
    if (currentScope.type === 'cli') {
      // Only include plugins with simple paths like ["ai"] - these should be children of CLI ["exemplar"]
      // Don't include commands directly - they should be under their plugins
      return scope.path.length === 1 && scope.type === 'plugin'
    }

    // For other scopes, check if path starts with current scope's path
    if (currentScope.path.length > 0) {
      return (
        scope.path.length === currentScope.path.length + 1 &&
        scope.path
          .slice(0, currentScope.path.length)
          .every((part, i) => part === currentScope.path[i]) &&
        (scope.type === 'plugin' || scope.type === 'command')
      )
    }

    return false
  })

  // Remove duplicates by ID and name (in case same scope registered multiple times)
  const seenIds = new Set()
  const seenNames = new Set()
  const uniqueChildren = [...directChildren, ...expectedChildren].filter(scope => {
    if (seenIds.has(scope.id) || seenNames.has(scope.name)) return false
    seenIds.add(scope.id)
    seenNames.add(scope.name)
    return true
  })

  const childScopes = uniqueChildren

  // Show child commands if any
  if (childScopes.length > 0) {
    elements.push(text('')) // Empty line
    elements.push(styledText('COMMANDS:', { foreground: Colors.yellow, bold: true }))

    const maxNameLength = Math.max(...childScopes.map(cmd => cmd.name.length))

    childScopes
      .filter(child => !child.metadata?.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(child => {
        const paddedName = child.name.padEnd(maxNameLength + 4)
        elements.push(
          hstack(
            styledText(`  ${paddedName}`, { foreground: Colors.green }),
            styledText(child.description || '', { foreground: Colors.white, faint: true })
          )
        )

        // Show aliases if any
        if (child.aliases && child.aliases.length > 0) {
          elements.push(
            styledText(`      (alias: ${child.aliases.join(', ')})`, {
              foreground: Colors.gray,
              italic: true,
            })
          )
        }
      })

    // Usage hint
    elements.push(text('')) // Empty line

    // Get the root scope to find the CLI name
    let rootScope = currentScope
    let parent = scopeManager.getParentScope(rootScope.id)
    while (parent) {
      rootScope = parent
      parent = scopeManager.getParentScope(rootScope.id)
    }

    const cliName = rootScope.name
    elements.push(
      styledText(
        `Run '${cliName} ${commandPath} COMMAND --help' for more information on a command.`,
        { foreground: Colors.gray, italic: true }
      )
    )
  } else if (currentScope.type === 'command') {
    // For commands without subcommands, show usage info
    elements.push(text('')) // Empty line

    // Show args if any
    if (currentScope.args && Object.keys(currentScope.args).length > 0) {
      elements.push(styledText('ARGUMENTS:', { foreground: Colors.yellow, bold: true }))
      Object.entries(currentScope.args).forEach(([name, arg]) => {
        elements.push(
          hstack(
            styledText(`  ${name}`, { foreground: arg.required ? Colors.red : Colors.green }),
            styledText(arg.description || '', { foreground: Colors.white, faint: true })
          )
        )
      })
      elements.push(text(''))
    }

    // Show flags if any
    if (currentScope.flags && Object.keys(currentScope.flags).length > 0) {
      elements.push(styledText('FLAGS:', { foreground: Colors.yellow, bold: true }))
      Object.entries(currentScope.flags).forEach(([name, flag]) => {
        const flagText = flag.shortName ? `--${name}, -${flag.shortName}` : `--${name}`
        elements.push(
          hstack(
            styledText(`  ${flagText.padEnd(20)}`, { foreground: Colors.blue }),
            styledText(flag.description || '', { foreground: Colors.white, faint: true })
          )
        )
      })
    }
  }

  return vstack(...elements)
}
