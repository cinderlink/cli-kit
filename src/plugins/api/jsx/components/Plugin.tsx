/**
 * Plugin Component - Core API
 * 
 * Defines a basic plugin scope that can contain commands
 * For CLI integration, use Plugin from '@plugins/integrations/cli/Plugin'
 */

import { Scope } from '@core/model/scope/jsx/components'
import type { JSX } from '@jsx/runtime'

export interface PluginProps {
  name: string
  description?: string
  version?: string
  children?: JSX.Element | JSX.Element[]
}

export function Plugin(props: PluginProps): JSX.Element {
  return (
    <Scope
      type="plugin"
      name={props.name}
      description={props.description}
      metadata={{
        version: props.version
      }}
    >
      {props.children}
    </Scope>
  )
}