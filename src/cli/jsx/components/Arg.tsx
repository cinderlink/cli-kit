/**
 * Arg Component
 *
 * Defines a command argument
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '@jsx/runtime'

export interface ArgProps {
  name: string
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
  choices?: string[]
  default?: string | number | boolean
  children?: JSX.Element | JSX.Element[]
}

export function Arg(props: ArgProps): JSX.Element {
  return (
    <CommandLineScope
      type="arg"
      name={props.name}
      description={props.description}
      metadata={{
        required: props.required,
        type: props.type,
        choices: props.choices,
        default: props.default,
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}
