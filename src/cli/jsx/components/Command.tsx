/**
 * Command Component
 * 
 * Defines a CLI command within a scope
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '../../../jsx/runtime'
import { commandStore } from '../stores'
import { onMount } from '../../../reactivity/jsx-lifecycle'

export interface CommandProps {
  name: string
  description?: string
  aliases?: string[]
  hidden?: boolean
  handler?: (ctx: any) => JSX.Element | Promise<JSX.Element>
  interactive?: boolean | ((ctx: any) => boolean)
  args?: Record<string, {
    description: string
    required?: boolean
    type?: 'string' | 'number' | 'boolean'
    choices?: string[]
    default?: any
  }>
  flags?: Record<string, {
    description: string
    alias?: string
    type?: 'string' | 'number' | 'boolean'
    default?: any
    choices?: string[]
  }>
  children?: JSX.Element | JSX.Element[]
}

export function Command(props: CommandProps): JSX.Element {
  // Register command with store if it has a handler
  if (props.handler) {
    try {
      onMount(() => {
        commandStore.registerCommand({
          name: props.name,
          description: props.description,
          handler: props.handler,
          args: props.args,
          flags: props.flags,
          aliases: props.aliases,
          path: [] // Path will be computed by scope
        })
      })
    } catch {
      // Outside component context - register immediately
      commandStore.registerCommand({
        name: props.name,
        description: props.description,
        handler: props.handler,
        args: props.args,
        flags: props.flags,
        aliases: props.aliases,
        path: []
      })
    }
  }
  
  return (
    <CommandLineScope
      type="command"
      name={props.name}
      description={props.description}
      aliases={props.aliases}
      handler={props.handler}
      args={props.args}
      flags={props.flags}
      metadata={{
        hidden: props.hidden,
        interactive: props.interactive
      }}
    >
      {props.children}
    </CommandLineScope>
  )
}