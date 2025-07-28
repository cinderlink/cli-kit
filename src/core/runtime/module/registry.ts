/**
 * Module Registry - Central coordination for domain modules
 *
 * Manages the lifecycle and coordination of all domain modules
 * in the system, providing a unified interface for module interaction.
 */

import { Effect } from 'effect'
import { ModuleBase, ModuleError } from './base'
import { EventBus, getGlobalEventBus } from '@core/model/events/event-bus'

/**
 * Module registration entry
 */
interface ModuleEntry {
  module: ModuleBase
  initialized: boolean
}

/**
 * Module registry for managing domain modules
 */
export class ModuleRegistry {
  private modules = new Map<string, ModuleEntry>()

  constructor(private eventBus: EventBus = getGlobalEventBus()) {}

  /**
   * Register a module with the registry
   */
  register(module: ModuleBase): Effect<void, ModuleError> {
    return Effect.gen(
      function* () {
        if (this.modules.has(module.name)) {
          yield* Effect.fail(
            new ModuleError(module.name, `Module '${module.name}' is already registered`)
          )
        }

        this.modules.set(module.name, {
          module,
          initialized: false,
        })
      }.bind(this)
    )
  }

  /**
   * Register multiple modules
   */
  registerMany(modules: ModuleBase[]): Effect<void, ModuleError> {
    return Effect.all(modules.map(module => this.register(module))).pipe(Effect.asVoid)
  }

  /**
   * Initialize all registered modules
   */
  initialize(): Effect<void, ModuleError> {
    return Effect.gen(
      function* () {
        const entries = Array.from(this.modules.entries())

        // Initialize modules in registration order
        for (const [name, entry] of entries) {
          if (!entry.initialized) {
            yield* entry.module
              .initialize()
              .pipe(
                Effect.catchAll(error =>
                  Effect.fail(
                    new ModuleError(name, `Failed to initialize module: ${error.message}`, error)
                  )
                )
              )
            entry.initialized = true
          }
        }

        // Wait for all modules to be ready
        yield* Effect.all(entries.map(([_, entry]) => entry.module.waitForReady()))
      }.bind(this)
    )
  }

  /**
   * Get a module by name
   */
  getModule<T extends ModuleBase>(name: string): T | undefined {
    const entry = this.modules.get(name)
    return entry?.module as T | undefined
  }

  /**
   * Get a required module by name
   */
  requireModule<T extends ModuleBase>(name: string): Effect<T, ModuleError> {
    return Effect.gen(
      function* () {
        const module = this.getModule<T>(name)
        if (!module) {
          yield* Effect.fail(new ModuleError(name, `Required module '${name}' not found`))
        }
        return module
      }.bind(this)
    )
  }

  /**
   * Check if a module is registered
   */
  hasModule(name: string): boolean {
    return this.modules.has(name)
  }

  /**
   * Get all registered modules
   */
  getAllModules(): ModuleBase[] {
    return Array.from(this.modules.values()).map(entry => entry.module)
  }

  /**
   * Get module names
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Shutdown all modules
   */
  shutdown(): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Shutdown in reverse order of initialization
        const modules = Array.from(this.modules.values()).reverse()

        yield* Effect.all(modules.map(entry => entry.module.shutdown()))

        this.modules.clear()
      }.bind(this)
    )
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const modules = Array.from(this.modules.entries())

    return {
      totalModules: modules.length,
      initializedModules: modules.filter(([_, entry]) => entry.initialized).length,
      moduleStates: Object.fromEntries(
        modules.map(([name, entry]) => [name, entry.module.getState()])
      ),
    }
  }

  /**
   * Wait for all modules to be ready
   */
  waitForAllReady(): Effect<void, ModuleError> {
    return Effect.all(
      Array.from(this.modules.values()).map(entry => entry.module.waitForReady())
    ).pipe(Effect.asVoid)
  }
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalModules: number
  initializedModules: number
  moduleStates: Record<string, string>
}

/**
 * Global module registry instance
 */
let globalRegistry: ModuleRegistry | null = null

export function getGlobalRegistry(): ModuleRegistry {
  if (!globalRegistry) {
    globalRegistry = new ModuleRegistry()
  }
  return globalRegistry
}

export function resetGlobalRegistry(): Effect<void, never> {
  if (globalRegistry) {
    return globalRegistry.shutdown().pipe(
      Effect.tap(() => {
        globalRegistry = null
      })
    )
  }
  return Effect.void
}
