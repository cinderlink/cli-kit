/**
 * Registry Types and Interfaces
 */

import type { Plugin } from '@cli/plugin'

/**
 * Registered plugin with metadata
 */
export interface RegisteredPlugin {
  plugin: Plugin
  enabled: boolean
  loadTime: Date
  dependencies: string[]
  dependents: string[]
  config?: Record<string, unknown>
}

/**
 * Registry configuration options
 */
export interface RegistryOptions {
  autoEnable?: boolean
  validateDependencies?: boolean
  allowDuplicates?: boolean
}

/**
 * Plugin dependency graph structure
 */
export interface PluginDependencyGraph {
  nodes: Map<string, RegisteredPlugin>
  edges: Map<string, Set<string>>
}

/**
 * Result of dependency validation
 */
export interface DependencyValidation {
  valid: boolean
  missing: string[]
  circular: string[]
}
