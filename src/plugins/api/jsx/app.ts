/**
 * Plugin JSX Application Helpers
 * 
 * Utilities for creating and managing core plugins
 * For CLI integration, use '@plugins/integrations/cli/app'
 */

// Define basic plugin structure without CLI dependencies
export interface CorePlugin {
  name: string
  version?: string
  description?: string
  commands?: any[]
}

/**
 * Create a basic JSX plugin
 */
export function createJSXPlugin(config: CorePlugin): CorePlugin {
  return config
}