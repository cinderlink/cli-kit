/**
 * Tuix Built-in Plugins
 *
 * Pre-built plugins for common CLI functionality
 */

export { LoggingPlugin } from './integrations/cli/builtin/logging'
export { ProcessManagerPlugin } from '@process-manager/index'

// Re-export core plugin types for convenience
export type { CorePlugin } from './api/jsx/app'

// Constants
export * from './constants'
