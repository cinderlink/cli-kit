/**
 * Flag Component
 *
 * Defines a command flag (boolean option)
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '@jsx/runtime'

export interface FlagProps {
  name: string
  description: string
  alias?: string
  default?: boolean
  children?: JSX.Element | JSX.Element[]
}

export function Flag(props: FlagProps): JSX.Element {
  return (
    <CommandLineScope
      type="flag"
      name={props.name}
      description={props.description}
      metadata={{
        alias: props.alias,
        default: props.default,
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}
