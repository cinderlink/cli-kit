/**
 * Option Component
 * 
 * Defines a command option (similar to flag but with values)
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '@jsx/runtime'

export interface OptionProps {
  name: string
  description: string
  alias?: string
  type?: 'string' | 'number' | 'boolean'
  default?: string | number | boolean
  choices?: string[]
  required?: boolean
  children?: JSX.Element | JSX.Element[]
}

export function Option(props: OptionProps): JSX.Element {
  return (
    <CommandLineScope
      type="option"
      name={props.name}
      description={props.description}
      metadata={{
        alias: props.alias,
        type: props.type,
        default: props.default,
        choices: props.choices,
        required: props.required
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}