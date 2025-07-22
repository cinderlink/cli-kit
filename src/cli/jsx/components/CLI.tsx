/**
 * CLI Component
 * 
 * Top-level CLI component that establishes the root scope
 */

import { jsx } from '@jsx/runtime'
import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '@jsx/runtime'

export interface CLIProps {
  name: string
  alias?: string
  description?: string
  version?: string
  children?: JSX.Element | JSX.Element[]
}

export function CLI(props: CLIProps): JSX.Element {
  return (
    <CommandLineScope
      type="cli"
      name={props.name}
      path={[props.name]}
      description={props.description}
      metadata={{
        alias: props.alias,
        version: props.version
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}