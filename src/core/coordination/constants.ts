/**
 * Coordination Module Constants
 *
 * This file contains all constants used across the coordination module
 */

import { Duration } from 'effect'

// Event Stream Optimization Constants
export const STREAM_BATCH_SIZE = 100
export const STREAM_BATCH_WINDOW = Duration.millis(100)
export const STREAM_THROTTLE_RATE = Duration.millis(10)
export const STREAM_THROTTLE_UNITS = 1
export const STREAM_DEBOUNCE_DELAY = Duration.millis(50)
export const UI_UPDATE_BATCH_SIZE = 10
export const UI_UPDATE_BATCH_WINDOW = Duration.millis(16) // ~60fps

// Performance Monitoring Constants
export const DEFAULT_REPORTING_INTERVAL = Duration.minutes(5)
export const MEMORY_METRICS_INTERVAL = Duration.seconds(30)
export const METRICS_HISTORY_SIZE = 1000
export const PERCENTILE_VALUES = [0.5, 0.95, 0.99] as const

// Error Recovery Constants
export const CIRCUIT_BREAKER_CHECK_INTERVAL = Duration.seconds(30)
export const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5
export const DEFAULT_CIRCUIT_BREAKER_RESET_TIMEOUT = Duration.minutes(1)
export const DEFAULT_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = 3
export const DEFAULT_RETRY_MAX_ATTEMPTS = 3
export const DEFAULT_RETRY_BASE_DELAY = 1000 // milliseconds
export const DEFAULT_RETRY_MAX_DELAY = Duration.seconds(30)

// Workflow Constants
export const DEFAULT_WORKFLOW_TIMEOUT = Duration.minutes(30)
export const DEFAULT_STEP_TIMEOUT = Duration.minutes(5)
export const MAX_CONCURRENT_WORKFLOWS = 10
export const WORKFLOW_CLEANUP_INTERVAL = Duration.hours(1)

// Integration Pattern Constants
export const DASHBOARD_UPDATE_INTERVAL = Duration.seconds(1)
export const CLI_PREDICTION_DEBOUNCE = Duration.millis(300)
export const AUDIT_LOG_BATCH_SIZE = 50
export const AUDIT_LOG_BATCH_WINDOW = Duration.seconds(5)

// Event Type Constants
export const EVENT_TYPES = {
  // Choreography events
  UI_UPDATE: 'ui:update',
  NOTIFICATION: 'notification',
  CONFIG_CHANGE_NOTIFICATION: 'config:change-notification',

  // Performance events
  PERFORMANCE_REPORT: 'performance:report',

  // Error events
  ERROR_DETECTED: 'error:detected',
  ERROR_RECOVERY: 'error:recovery',

  // Integration events
  DASHBOARD_UPDATE: 'dashboard:update',
  CLI_PREDICTION: 'cli:prediction',
  AUDIT_LOG: 'audit:log',

  // Workflow events
  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',
  WORKFLOW_STEP_STARTED: 'workflow:step:started',
  WORKFLOW_STEP_COMPLETED: 'workflow:step:completed',
  WORKFLOW_STEP_FAILED: 'workflow:step:failed',
} as const

// Module Names
export const MODULE_NAME = 'coordination'
export const SUBMODULE_NAMES = {
  CHOREOGRAPHER: 'choreographer',
  ORCHESTRATOR: 'orchestrator',
  STREAM_OPTIMIZER: 'stream-optimizer',
  PERFORMANCE_MONITOR: 'performance-monitor',
  ERROR_RECOVERY: 'error-recovery',
  INTEGRATION_PATTERNS: 'integration-patterns',
} as const
