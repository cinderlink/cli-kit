/**
 * CommandLineScope Component
 * 
 * CLI-aware scope that handles command execution and help rendering.
 * Automatically shows help when no command matches or help is requested.
 */

import { jsx } from '../../../jsx/runtime'
import { Scope, type ScopeProps, ScopeContent } from '../../../scope/jsx/components'
import { CommandLineHelp } from './CommandLineHelp'
import { commandStore } from '../stores'
import { scopeManager } from '../../../scope/manager'
import type { JSX } from '../../../jsx/runtime'

export interface CommandLineScopeProps extends ScopeProps {
  // Additional CLI-specific props can go here
}

export function CommandLineScope(props: CommandLineScopeProps): JSX.Element {
  const currentCommandPath = commandStore.currentPath
  const scopePath = props.path || []
  
  // Check if this scope's path matches the active command path
  const isActive = currentCommandPath.length >= scopePath.length &&
    scopePath.every((segment, i) => segment === currentCommandPath[i])
  
  // Check if help was specifically requested for this scope
  const isHelpRequested = isActive && 
    currentCommandPath.length === scopePath.length + 1 &&
    currentCommandPath[currentCommandPath.length - 1] === 'help'
  
  // Check if a child command will handle this
  const childWillHandle = isActive && 
    currentCommandPath.length > scopePath.length &&
    !isHelpRequested
  
  // Should we show help?
  const shouldShowHelp = isActive && (isHelpRequested || !childWillHandle)
  
  // Custom handler that shows help when appropriate
  const handler = shouldShowHelp ? () => <CommandLineHelp /> : props.handler
  
  return (
    <Scope {...props} executable={true} handler={handler}>
      {/* Process children normally */}
      {props.children}
      
      {/* Always add help as a child command */}
      <Scope
        type="command"
        name="help"
        description={`Show help for ${props.name}`}
        handler={() => <CommandLineHelp />}
      />
    </Scope>
  )
}