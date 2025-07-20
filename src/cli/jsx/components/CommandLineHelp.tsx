/**
 * CommandLineHelp Component
 * 
 * Displays help text based on current scope information.
 * Sources data from scope stores.
 */

import { scopeManager } from '../../../scope/manager'
import { useCurrentScope } from '../../../scope/jsx/hooks'
import { text, vstack, hstack, styledText } from '../../../core/view'
import { style, Colors } from '../../../styling'
import type { JSX } from '../../../jsx/runtime'
import type { View } from '../../../core/types'

export interface CommandLineHelpProps {
  scopeId?: string
}

export function CommandLineHelp(props: CommandLineHelpProps): View {
  const currentScope = props.scopeId 
    ? scopeManager.getScopeDef(props.scopeId)
    : useCurrentScope()
    
  if (!currentScope) {
    return text('No help available')
  }
  
  const elements: View[] = []
  
  // Get the full command path for display
  const commandPath = currentScope.path.length > 0 
    ? currentScope.path.join(' ')
    : currentScope.name
  
  // Title section with name and description
  elements.push(vstack(
    styledText(
      commandPath,
      style({ foreground: Colors.cyan, bold: true })
    ),
    currentScope.description ? styledText(
      currentScope.description,
      style({ foreground: Colors.white, faint: true })
    ) : text('')
  ))
  
  // Get child scopes
  const childScopes = scopeManager.getChildScopes(currentScope.id)
  
  // Show child commands if any
  if (childScopes.length > 0) {
    elements.push(text('')) // Empty line
    elements.push(styledText('COMMANDS:', style({ foreground: Colors.yellow, bold: true })))
    
    const maxNameLength = Math.max(
      ...childScopes.map(cmd => cmd.name.length)
    )
    
    childScopes
      .filter(child => !child.metadata?.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(child => {
        const paddedName = child.name.padEnd(maxNameLength + 4)
        elements.push(
          hstack(
            styledText(`  ${paddedName}`, style({ foreground: Colors.green })),
            styledText(child.description || '', style({ foreground: Colors.white, faint: true }))
          )
        )
        
        // Show aliases if any
        if (child.aliases && child.aliases.length > 0) {
          elements.push(
            styledText(
              `      (alias: ${child.aliases.join(', ')})`,
              style({ foreground: Colors.gray, italic: true })
            )
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
    elements.push(styledText(
      `Run '${cliName} ${commandPath} COMMAND --help' for more information on a command.`,
      style({ foreground: Colors.gray, italic: true })
    ))
  } else if (currentScope.type === 'command') {
    // For commands without subcommands, show usage info
    elements.push(text('')) // Empty line
    
    // Show args if any
    if (currentScope.args && Object.keys(currentScope.args).length > 0) {
      elements.push(styledText('ARGUMENTS:', style({ foreground: Colors.yellow, bold: true })))
      Object.entries(currentScope.args).forEach(([name, arg]: [string, any]) => {
        elements.push(
          hstack(
            styledText(`  ${name}`, style({ foreground: arg.required ? Colors.red : Colors.green })),
            styledText(arg.description || '', style({ foreground: Colors.white, faint: true }))
          )
        )
      })
      elements.push(text(''))
    }
    
    // Show flags if any
    if (currentScope.flags && Object.keys(currentScope.flags).length > 0) {
      elements.push(styledText('FLAGS:', style({ foreground: Colors.yellow, bold: true })))
      Object.entries(currentScope.flags).forEach(([name, flag]: [string, any]) => {
        const flagText = flag.alias ? `--${name}, -${flag.alias}` : `--${name}`
        elements.push(
          hstack(
            styledText(`  ${flagText.padEnd(20)}`, style({ foreground: Colors.blue })),
            styledText(flag.description || '', style({ foreground: Colors.white, faint: true }))
          )
        )
      })
    }
  }
  
  return vstack(...elements)
}