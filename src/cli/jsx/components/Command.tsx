/**
 * Command Component
 * 
 * Defines a CLI command within a scope
 */

import { CommandLineScope } from './CommandLineScope'
import type { JSX } from '../../../jsx/runtime'

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
  // Extract handler from children if it's a function
  let handler = props.handler
  let children = props.children
  
  // If children is a function, use it as the handler
  if (typeof props.children === 'function') {
    handler = props.children as (ctx: any) => JSX.Element | Promise<JSX.Element>
    children = undefined
  }
  
  return (
    <CommandLineScope
      type="command"
      name={props.name}
      description={props.description}
      aliases={props.aliases}
      handler={handler}
      args={props.args}
      flags={props.flags}
      metadata={{
        hidden: props.hidden,
        interactive: props.interactive
      }}
    >
      {children}
    </CommandLineScope>
  )
}