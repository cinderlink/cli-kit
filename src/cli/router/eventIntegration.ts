/**
 * Event Integration
 * 
 * Handles integration with CLI module and event emission
 */

import { Effect } from "effect"
import { getGlobalEventBus } from "@core/model/events/eventBus"
import { getGlobalRegistry } from "@core/runtime/module/registry"
import { CLIModule } from "@cli/impl/module"

export class EventIntegration {
  private cliModule: CLIModule | null = null
  
  /**
   * Initialize CLI module integration
   */
  initialize(): void {
    try {
      const registry = getGlobalRegistry()
      this.cliModule = registry.getModule<CLIModule>('cli')
      
      if (!this.cliModule) {
        // Create and register CLI module
        const eventBus = getGlobalEventBus()
        this.cliModule = new CLIModule(eventBus)
        Effect.runSync(registry.register(this.cliModule))
        Effect.runSync(this.cliModule.initialize())
      }
    } catch (error) {
      // Continue without event support
      console.debug('CLI module initialization failed, continuing without event support')
    }
  }
  
  /**
   * Emit route found event
   */
  emitRouteFound(commandPath: string[], handler: Function): void {
    if (this.cliModule) {
      Effect.runSync(this.cliModule.emitRouteFound(commandPath, handler))
    }
  }
  
  /**
   * Emit route not found event
   */
  emitRouteNotFound(commandPath: string[]): void {
    if (this.cliModule) {
      Effect.runSync(this.cliModule.emitRouteNotFound(commandPath))
    }
  }
  
  /**
   * Check if event support is available
   */
  hasEventSupport(): boolean {
    return this.cliModule !== null
  }
  
  /**
   * Get the CLI module instance
   */
  getCLIModule(): CLIModule | null {
    return this.cliModule
  }
}