/**
 * Hook System for CLI Framework
 * 
 * Provides a single, consistent hook API that wraps the event system.
 * 
 * The hook system enables:
 * - Lifecycle management for CLI commands
 * - Plugin middleware and extensions
 * - Error handling and recovery
 * - Custom event-driven behaviors
 * 
 * @module
 */

// Export all types
export * from "./types"

// Export hook manager
export { 
  createHooks, 
  getGlobalHooks, 
  resetGlobalHooks,
  type Hooks 
} from "./manager"

// Export lifecycle events
export { LifecycleEvents } from "./lifecycle"

// Export plugin events
export { PluginEvents } from "./pluginHooks"

// Export utilities
export { 
  createHookEvent,
  isHookEvent,
  getHookCategory
} from "./utils"