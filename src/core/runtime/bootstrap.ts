/**
 * Bootstrap - Application initialization with all modules
 *
 * Sets up the complete module ecosystem including core, domain,
 * and service modules with proper dependency ordering.
 */

import { Effect } from 'effect'
import { EventBus, getGlobalEventBus } from '@core/model/events/event-bus'
import { ModuleRegistry, getGlobalRegistry } from './module/registry'

// Core modules
import { JSXModule } from '@jsx/module'
import { CLIModule } from '@cli/module'
import { ReactivityModule } from '@core/update/reactivity/module'

// Service modules
import { ServiceModule } from '@core/services/module'
import { ConfigModule } from 'tuix/config/module'
import { ProcessManagerModule } from '@process-manager/module'
import { LoggerModule } from '@logger/module'
import { StylingModule } from '@core/terminal/ansi/styles/module'

// Coordination module
import { CoordinationModule } from '@core/coordination/module'

// Component system module
// Component system module removed - functionality moved to core/view

/**
 * Bootstrap configuration
 */
export interface BootstrapConfig {
  readonly enableLogging?: boolean
  readonly enableProcessManager?: boolean
  readonly enableStyling?: boolean
  readonly enableCoordination?: boolean
  readonly enableComponentSystem?: boolean
  readonly enableServices?: boolean
  readonly enableEventSystem?: boolean
  readonly configPath?: string
  readonly forceError?: boolean
}

/**
 * Bootstrap the application with all modules
 */
export function bootstrap(config: BootstrapConfig = {}): Effect<ModuleRegistry, Error> {
  return Effect.gen(function* () {
    // Force error for testing if requested
    if (config.forceError) {
      yield* Effect.fail(new Error('Forced bootstrap error for testing'))
    }

    const eventBus = getGlobalEventBus()
    const registry = getGlobalRegistry()

    // Core modules (always enabled)
    const jsxModule = new JSXModule(eventBus)
    const cliModule = new CLIModule(eventBus)
    const reactivityModule = new ReactivityModule(eventBus)

    yield* registry.registerMany([jsxModule, cliModule, reactivityModule])

    // Service layer modules
    const serviceModule = new ServiceModule(eventBus)
    const configModule = new ConfigModule(eventBus)

    yield* registry.registerMany([serviceModule, configModule])

    // Optional modules based on configuration
    if (config.enableLogging !== false) {
      const loggerModule = new LoggerModule(eventBus)
      yield* registry.register(loggerModule)
    }

    if (config.enableProcessManager) {
      const processManagerModule = new ProcessManagerModule(eventBus)
      yield* registry.register(processManagerModule)
    }

    if (config.enableStyling !== false) {
      const stylingModule = new StylingModule(eventBus)
      yield* registry.register(stylingModule)
    }

    if (config.enableCoordination) {
      const coordinationModule = new CoordinationModule(eventBus)
      yield* registry.register(coordinationModule)
    }

    // Component system is now integrated into core/view

    // Initialize all modules
    yield* registry.initialize()

    // Load initial configuration if provided
    if (config.configPath) {
      const configMod = registry.getModule<ConfigModule>('config')
      if (configMod) {
        yield* configMod.loadConfig(config.configPath)
      }
    }

    return registry
  })
}

/**
 * Create a minimal bootstrap for testing
 */
export function bootstrapMinimal(): Effect<ModuleRegistry, Error> {
  return Effect.gen(function* () {
    const eventBus = getGlobalEventBus()
    const registry = getGlobalRegistry()

    // Only core modules
    yield* registry.registerMany([
      new JSXModule(eventBus),
      new CLIModule(eventBus),
      new ReactivityModule(eventBus),
    ])

    yield* registry.initialize()

    return registry
  })
}

/**
 * Create a full bootstrap with all modules
 */
export function bootstrapFull(): Effect<ModuleRegistry, Error> {
  return bootstrap({
    enableLogging: true,
    enableProcessManager: true,
    enableStyling: true,
    enableCoordination: true,
    enableComponentSystem: true,
  })
}

/**
 * Bootstrap result with typed module access
 */
export interface BootstrapResult {
  readonly registry: ModuleRegistry
  readonly status: 'initialized' | 'partial' | 'failed'
  readonly modules: {
    readonly jsx: JSXModule
    readonly cli: CLIModule
    readonly reactivity: ReactivityModule
    readonly services?: ServiceModule
    readonly config?: ConfigModule
    readonly processManager?: ProcessManagerModule
    readonly logger?: LoggerModule
    readonly styling?: StylingModule
    readonly coordination?: CoordinationModule
    // Component system is now integrated into core/view
  }
}

/**
 * Bootstrap with typed module access
 */
export function bootstrapWithModules(config: BootstrapConfig = {}): Effect<BootstrapResult, Error> {
  return Effect.gen(function* () {
    // Handle potential errors from bootstrap
    const registryResult = yield* bootstrap(config).pipe(Effect.either)

    if (registryResult._tag === 'Left') {
      return {
        registry: getGlobalRegistry(),
        status: 'failed' as const,
        modules: {
          jsx: undefined as any,
          cli: undefined as any,
          reactivity: undefined as any,
        },
      }
    }

    const registry = registryResult.right

    // Check if bootstrap succeeded fully
    const requiredModules = ['jsx', 'cli', 'reactivity']
    const missingModules = requiredModules.filter(name => !registry.hasModule(name))

    const status = missingModules.length > 0 ? 'partial' : 'initialized'

    const result: BootstrapResult = {
      registry,
      status,
      modules: {
        jsx: registry.getModule<JSXModule>('jsx')!,
        cli: registry.getModule<CLIModule>('cli')!,
        reactivity: registry.getModule<ReactivityModule>('reactivity')!,
        services: registry.getModule<ServiceModule>('services'),
        config: registry.getModule<ConfigModule>('config'),
        processManager: registry.getModule<ProcessManagerModule>('process-manager'),
        logger: registry.getModule<LoggerModule>('logger'),
        styling: registry.getModule<StylingModule>('styling'),
        coordination: registry.getModule<CoordinationModule>('coordination'),
        // Component system is now integrated into core/view
      },
    }

    return result
  })
}
