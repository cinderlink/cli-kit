/**
 * Health Monitoring Module
 * 
 * Exports the complete health monitoring and auto-restart system for
 * intelligent process supervision, health checks, and failure recovery.
 * 
 * @module plugins/system/health
 */

// Core health monitoring
export { HealthMonitoringManager } from "./health-monitor"
export { AutoRestartManager } from "./auto-restart"

// Health check system
export { 
  HealthCheckFactory,
  BaseHealthCheck,
  ProcessExistsHealthCheck,
  CpuUsageHealthCheck,
  MemoryUsageHealthCheck,
  HttpEndpointHealthCheck,
  CustomScriptHealthCheck,
} from "./health-checks"

// Type exports
export type {
  // Health check types
  HealthCheckStatus,
  HealthCheckType,
  HealthCheckConfig,
  HealthCheckResult,
  
  // Auto-restart types
  RestartPolicy,
  RestartStrategy,
  AutoRestartConfig,
  RestartAttempt,
  
  // Health monitoring types
  HealthMonitoringConfig,
  ProcessHealthState,
  HealthMonitoringStats,
  HealthMonitoringAPI,
} from "./types"

// Schema exports
export {
  ProcessExistsCheckSchema,
  CpuUsageCheckSchema,
  MemoryUsageCheckSchema,
  HttpEndpointCheckSchema,
  CustomScriptCheckSchema,
  AutoRestartConfigSchema,
  HealthMonitoringConfigSchema,
} from "./types"

// Error exports
export {
  HealthMonitoringError,
  HealthCheckError,
  ProcessRestartError,
  SupervisionConfigError,
} from "./types"