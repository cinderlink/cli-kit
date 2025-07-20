/**
 * Process Registry Module
 * 
 * Exports the central process registry system for tracking, managing,
 * and monitoring system processes with lifecycle events and state persistence.
 * 
 * @module plugins/system/registry
 */

// Core registry implementation
export { ProcessRegistry, InMemoryRegistryStorage } from "./process-registry"
export { ProcessRegistryManager, DEFAULT_REGISTRY_MANAGER_CONFIG } from "./registry-manager"

// Type exports
export type {
  // Core types
  RegistryProcessInfo,
  ProcessLifecycleEvent,
  ProcessLifecycleEventRecord,
  ProcessSnapshot,
  
  // Configuration
  ProcessRegistryConfig,
  RegistryManagerConfig,
  
  // Query interfaces
  RegistryProcessQuery,
  ProcessEventQuery,
  RegistryQueryResult,
  
  // Management interfaces
  ProcessManagementConfig,
  ManagedProcess,
  
  // Statistics and monitoring
  RegistryStatistics,
  
  // API interfaces
  ProcessRegistryAPI,
  RegistryStorage,
} from "./types"

// Schema exports
export { ProcessRegistryConfigSchema } from "./types"

// Error exports
export {
  RegistryError,
  ProcessNotFoundInRegistryError,
  RegistryPersistenceError,
  RegistryValidationError,
} from "./types"