/**
 * Debug Module
 * 
 * Interactive debugging tools for tuix applications
 */

// Core debug functionality
export { debugStore, debug } from './core/store'
export type { DebugEvent, DebugState, DebugTab } from './types'

// Debug components - these should not be exported from main module
// Use debug/jsx/components directly for JSX usage

// CLI integration (removed - handled by JSX runtime)

// Debug constants
export { DEBUG_DEFAULTS } from './constants'

// MVU debug integration
export * from './mvu/integration'