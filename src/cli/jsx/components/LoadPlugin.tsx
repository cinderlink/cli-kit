/**
 * LoadPlugin Component
 * 
 * Dynamically loads plugins at runtime
 */

import { Effect } from 'effect'
import { onMount } from '@core/update/reactivity/jsxLifecycle'
import { text } from '@core/view/primitives/view'
import type { JSX } from '@jsx/runtime'

export interface LoadPluginProps {
  path: string
  name?: string
}

export function LoadPlugin(props: LoadPluginProps): JSX.Element {
  let loaded = false
  let error: Error | null = null
  
  onMount(async () => {
    try {
      // Dynamic import of the plugin
      const plugin = await import(props.path)
      
      // If the plugin exports a default function, call it
      if (typeof plugin.default === 'function') {
        await plugin.default()
      }
      
      loaded = true
    } catch (e) {
      error = e as Error
      console.error(`Failed to load plugin from ${props.path}:`, e)
    }
  })
  
  // Return loading/error status
  if (error) {
    return text(`Failed to load plugin: ${error.message}`)
  }
  
  return text(`Loading plugin from ${props.path}...`)
}