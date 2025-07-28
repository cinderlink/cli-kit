/**
 * CommandLineScope Component
 *
 * CLI-aware scope that handles command execution and help rendering.
 * Automatically shows help when no command matches or help is requested.
 */

import { jsx } from '@jsx/runtime'
import { Scope, type ScopeProps, ScopeContent } from '@core/model/scope/jsx/components'
import { CommandLineHelp } from './CommandLineHelp'
import { commandStore } from '@cli/jsx/stores/commandStore'
import { scopeManager } from '@core/model/scope/manager'
import type { JSX } from '@jsx/runtime'

export interface CommandLineScopeProps extends ScopeProps {
  // Additional CLI-specific props can go here
}

export function CommandLineScope(props: CommandLineScopeProps): JSX.Element {
  return (
    <Scope {...props} executable={true}>
      {props.children}

      {/* Always add help as a child command */}
      <Scope
        id={`${props.id || `scope_${props.type}_${props.name}`}_help`}
        type="command"
        name="help"
        description={`Show help for ${props.name || 'command'}`}
        path={[...(props.path || []), 'help']}
        handler={() => <CommandLineHelp scopeId={props.id} />}
      />
    </Scope>
  )
}
