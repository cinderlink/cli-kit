/**
 * Debug Module
 * 
 * Interactive debugging tools for tuix applications
 */

// Core debug functionality
export { debugStore, debug } from './core/store'
export type { DebugEvent, DebugState, DebugTab } from './types'

// Debug components
export { DebugWrapper } from './jsx/components/DebugWrapper'
export { EventList } from './jsx/components/EventList'
export { PerformanceView } from './jsx/components/PerformanceView'
export { StateInspector } from './jsx/components/StateInspector'
export { ScopeExplorer } from './jsx/components/ScopeExplorer'
export { DebugToolbar } from './jsx/components/DebugToolbar'
export { LogsView } from './jsx/components/LogsView'
export { OutputView } from './jsx/components/OutputView'

// CLI integration (removed - handled by JSX runtime)

// Debug constants
export { DEBUG_DEFAULTS } from './constants'

// MVU debug integration
export * from './mvu/integration'