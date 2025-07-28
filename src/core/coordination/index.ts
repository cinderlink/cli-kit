/**
 * Coordination Module Exports
 *
 * Re-exports all coordination components for easy importing
 */

// Export types
export * from './types'

// Export errors
export * from './errors'

// Export constants
export * from './constants'

// Export implementations
export { EventChoreographer } from './choreography'
export { WorkflowOrchestrator } from './orchestrator'
export { EventStreamOptimizer } from './streamOptimizer'
export { PerformanceMonitor } from './performanceMonitor'
export { ErrorRecoveryManager } from './errorRecovery'
export { IntegrationPatterns } from './integrationPatterns'
export { CoordinationModule } from './module'
