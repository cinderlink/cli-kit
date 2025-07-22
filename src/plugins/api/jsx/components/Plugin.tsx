/**
 * Plugin Component
 * 
 * Defines a plugin scope that can contain commands
 */

import { CommandLineScope } from '@cli/jsx/components/CommandLineScope'
import type { JSX } from '@jsx/runtime'

export interface PluginProps {
  name: string
  description?: string
  version?: string
  children?: JSX.Element | JSX.Element[]
}

export function Plugin(props: PluginProps): JSX.Element {
  return (
    <CommandLineScope
      type="plugin"
      name={props.name}
      description={props.description}
      metadata={{
        version: props.version
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}