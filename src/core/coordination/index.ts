/**
 * Coordination Module Exports
 * 
 * Re-exports all coordination components for easy importing
 */

export { EventChoreographer, type ChoreographyError } from './choreography'
export { 
  WorkflowOrchestrator, 
  type WorkflowConfig,
  type WorkflowStep,
  type WorkflowResult,
  type WorkflowError,
  type WorkflowInstance,
  type RetryPolicy
} from './orchestrator'
export { 
  EventStreamOptimizer,
  type UIUpdateEvent,
  type RelevanceCriteria,
  type OptimizationStats
} from './stream-optimizer'
export { 
  PerformanceMonitor,
  type PerformanceMetric,
  type PerformanceReport,
  type ThroughputMetric,
  type ResponseTimeMetric,
  type MemoryUsageMetric,
  type WorkflowMetrics
} from './performance-monitor'
export { 
  ErrorRecoveryManager,
  type ErrorPattern,
  type ErrorCondition,
  type RecoveryStrategy,
  type RecoveryConfig,
  type RetryConfig,
  type FallbackConfig,
  type CircuitBreakConfig,
  type NotifyConfig,
  type ErrorStatistics,
  type CircuitBreaker
} from './error-recovery'
export { 
  IntegrationPatterns,
  type PatternHandle,
  type DashboardUpdateEvent,
  type CLIPredictionEvent,
  type AuditLogEvent
} from './integration-patterns'
export { 
  CoordinationModule,
  type CoordinationConfig,
  type CoordinationError,
  type SystemHealth
} from './module'