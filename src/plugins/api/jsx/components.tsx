/**
 * Plugin JSX Components
 * 
 * Components for plugin management within the JSX runtime
 */

import { Scope } from '@core/model/scope/jsx/components'
import { pluginStore } from './stores'
import type { RegisterPluginProps, EnablePluginProps, ConfigurePluginProps } from './types'

/**
 * Register a plugin dynamically
 */
export function RegisterPlugin(props: RegisterPluginProps): JSX.Element {
  // Register the plugin with the store
  pluginStore.register({
    id: props.name,
    name: props.name,
    description: props.description,
    version: props.version,
    commands: []
  })
  
  // Configure if config provided
  if (props.config) {
    pluginStore.configure(props.name, props.config)
  }
  
  return (
    <Scope
      type="component"
      name={`register-plugin-${props.name}`}
      path={[]}
      metadata={{
        action: 'register',
        pluginName: props.name,
        pluginPath: props.path,
        config: props.config
      }}
    />
  )
}

/**
 * Enable or disable a plugin
 */
export function EnablePlugin(props: EnablePluginProps): JSX.Element {
  const enabled = props.enabled ?? true
  
  // Update plugin state in store
  if (enabled) {
    pluginStore.enable(props.name)
  } else {
    pluginStore.disable(props.name)
  }
  
  return (
    <Scope
      type="component"
      name={`enable-plugin-${props.name}`}
      path={[]}
      metadata={{
        action: 'enable',
        pluginName: props.name,
        enabled
      }}
    />
  )
}

/**
 * Configure a plugin
 */
export function ConfigurePlugin(props: ConfigurePluginProps): JSX.Element {
  // Update plugin configuration in store
  pluginStore.configure(props.name, props.config)
  
  return (
    <Scope
      type="component"
      name={`configure-plugin-${props.name}`}
      path={[]}
      metadata={{
        action: 'configure',
        pluginName: props.name,
        config: props.config
      }}
    />
  )
}