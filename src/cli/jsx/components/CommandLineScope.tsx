/**
 * CommandLineScope Component
 * 
 * CLI-aware scope that handles command execution and help rendering.
 * Automatically shows help when no command matches or help is requested.
 */

import { jsx } from '../../../jsx/runtime'
import { Scope, type ScopeProps, ScopeContent } from '../../../scope/jsx/components'
import { CommandLineHelp } from './CommandLineHelp'
import { scopeCommandStore } from '../stores/scope-command-store'
import { scopeManager } from '../../../scope/manager'
import type { JSX } from '../../../jsx/runtime'

export interface CommandLineScopeProps extends ScopeProps {
  // Additional CLI-specific props can go here
}

export function CommandLineScope(props: CommandLineScopeProps): JSX.Element {
  // CLI scopes are executable and can have handlers
  // The scope system will handle activation/deactivation
  // Help fallback is handled by ScopeFallback component automatically
  
  return (
    <Scope {...props} executable={true}>
      {/* Process children normally */}
      {props.children}
      
      {/* Always add help as a child command */}
      <Scope
        type="command"
        name="help"
        description={`Show help for ${props.name || 'command'}`}
        path={[...(props.path || []), 'help']}
        handler={() => <CommandLineHelp scopeId={props.id} />}
      />
    </Scope>
  )
}