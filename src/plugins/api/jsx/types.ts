/**
 * Plugin JSX Type Definitions
 * 
 * Types for plugin-specific JSX components
 */

export interface RegisterPluginProps {
  name: string
  path?: string
  config?: Record<string, any>
}

export interface EnablePluginProps {
  name: string
  enabled?: boolean
}

export interface ConfigurePluginProps {
  name: string
  config: Record<string, any>
}