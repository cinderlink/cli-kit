/**
 * Plugin Component
 * 
 * Defines a plugin with its commands and subcommands
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '../../../jsx/runtime'
import { pluginStore } from '../../../plugins/jsx/stores'
import { onMount } from '../../../reactivity/jsx-lifecycle'

export interface PluginProps {
  name: string
  description: string
  version?: string
  children?: JSX.Element | JSX.Element[]
}

export function Plugin(props: PluginProps): JSX.Element {
  // Register plugin with store
  try {
    onMount(() => {
      pluginStore.register({
        id: props.name,
        name: props.name,
        version: props.version,
        description: props.description,
        commands: []
      })
    })
  } catch {
    // Outside component context - register immediately
    pluginStore.register({
      id: props.name,
      name: props.name,
      version: props.version,
      description: props.description,
      commands: []
    })
  }
  
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