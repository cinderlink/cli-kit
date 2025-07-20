/**
 * Base Plugin Implementation
 * 
 * This module provides the base plugin class that extends the TUIX plugin system
 * to provide a foundation for system plugins like Process Manager.
 * 
 * @module plugins/system/base-plugin
 */

import { Effect, Context } from "effect"
import type { Plugin, PluginMetadata, PluginError, PluginDeps } from "../../../core/src/plugin"

// =============================================================================
// Base Plugin Abstract Class
// =============================================================================

/**
 * Abstract base class for system plugins
 */
export abstract class BasePlugin implements Plugin {
  /**
   * Plugin metadata
   */
  public abstract readonly metadata: PluginMetadata
  
  /**
   * Plugin name (derived from metadata)
   */
  public get name(): string {
    return this.metadata.name
  }
  
  /**
   * Plugin version (derived from metadata)
   */
  public get version(): string {
    return this.metadata.version
  }
  
  /**
   * Plugin initialization status
   */
  protected isInitialized = false
  
  /**
   * Plugin configuration
   */
  protected config: Record<string, unknown> = {}
  
  /**
   * Plugin dependencies
   */
  protected deps?: PluginDeps
  
  constructor(config: Record<string, unknown> = {}) {
    this.config = config
  }
  
  /**
   * Initialize the plugin
   */
  public init: Effect.Effect<void, PluginError, PluginDeps> = Effect.gen((function* (this: BasePlugin) {
    if (this.isInitialized) {
      return
    }
    
    // Get dependencies
    this.deps = yield* Context.GenericTag<PluginDeps>("PluginDeps")
    
    // Call implementation-specific initialization
    yield* this.doInit()
    
    this.isInitialized = true
    this.onInitialized()
  }).bind(this))
  
  /**
   * Destroy the plugin
   */
  public destroy: Effect.Effect<void, PluginError, never> = Effect.gen((function* (this: BasePlugin) {
    if (!this.isInitialized) {
      return
    }
    
    // Call implementation-specific cleanup
    yield* this.doDestroy()
    
    this.isInitialized = false
    this.onDestroyed()
  }).bind(this))
  
  /**
   * Activate the plugin (optional lifecycle method)
   */
  public activate?: Effect.Effect<void, PluginError, PluginDeps> = Effect.gen((function* (this: BasePlugin) {
    if (!this.isInitialized) {
      yield* Effect.fail(new Error(`Plugin ${this.name} must be initialized before activation`) as PluginError)
      return
    }
    
    yield* this.doActivate()
    this.onActivated()
  }).bind(this))
  
  /**
   * Deactivate the plugin (optional lifecycle method)
   */
  public deactivate?: Effect.Effect<void, PluginError, never> = Effect.gen((function* (this: BasePlugin) {
    yield* this.doDeactivate()
    this.onDeactivated()
  }).bind(this))
  
  /**
   * Hook definitions (override in subclasses)
   */
  public hooks: Record<string, any> = {}
  
  /**
   * Signal definitions (override in subclasses)
   */
  public signals: Record<string, any> = {}
  
  /**
   * Plugin API (override in subclasses)
   */
  public abstract getAPI(): unknown
  
  /**
   * Services provided by the plugin (override in subclasses)
   */
  public services?: Record<string, unknown>
  
  // =============================================================================
  // Abstract Methods (implement in subclasses)
  // =============================================================================
  
  /**
   * Implementation-specific initialization
   */
  protected abstract doInit(): Effect.Effect<void, PluginError, never>
  
  /**
   * Implementation-specific cleanup
   */
  protected abstract doDestroy(): Effect.Effect<void, PluginError, never>
  
  /**
   * Implementation-specific activation (optional)
   */
  protected doActivate(): Effect.Effect<void, PluginError, never> {
    return Effect.succeed(void 0)
  }
  
  /**
   * Implementation-specific deactivation (optional)
   */
  protected doDeactivate(): Effect.Effect<void, PluginError, never> {
    return Effect.succeed(void 0)
  }
  
  // =============================================================================
  // Lifecycle Event Hooks (override in subclasses)
  // =============================================================================
  
  /**
   * Called after successful initialization
   */
  protected onInitialized(): void {
    // Override in subclasses
  }
  
  /**
   * Called after successful destruction
   */
  protected onDestroyed(): void {
    // Override in subclasses
  }
  
  /**
   * Called after successful activation
   */
  protected onActivated(): void {
    // Override in subclasses
  }
  
  /**
   * Called after successful deactivation
   */
  protected onDeactivated(): void {
    // Override in subclasses
  }
  
  // =============================================================================
  // Utility Methods
  // =============================================================================
  
  /**
   * Check if the plugin is initialized
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized
  }
  
  /**
   * Get plugin configuration
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.config }
  }
  
  /**
   * Update plugin configuration
   */
  public updateConfig(newConfig: Partial<Record<string, unknown>>): void {
    this.config = { ...this.config, ...newConfig }
  }
  
  /**
   * Get plugin dependencies
   */
  public getDependencies(): PluginDeps | undefined {
    return this.deps
  }
  
  /**
   * Emit a plugin event (if event system is available)
   */
  protected emit(event: string, data?: unknown): void {
    // This would integrate with the plugin event system
    console.log(`Plugin ${this.name} emitted event: ${event}`, data)
  }
  
  /**
   * Log a message with plugin context
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown): void {
    console[level](`[${this.name}] ${message}`, data)
  }
}