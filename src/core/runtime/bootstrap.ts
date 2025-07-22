/**
 * Bootstrap - Application initialization with all modules
 * 
 * Sets up the complete module ecosystem including core, domain,
 * and service modules with proper dependency ordering.
 */

import { Effect } from 'effect'
import { EventBus, getGlobalEventBus } from "@core/model/events/eventBus"
import { ModuleRegistry, getGlobalRegistry } from './module/registry'

// Core modules
import { JSXModule } from '@jsx/module'
import { CLIModule } from '@cli/module'
import { ReactivityModule } from '@core/update/reactivity/reactivityModule'

// Service modules
import { ServiceModule } from '@core/services/serviceModule'
import { ConfigModule } from 'tuix/config/module'
import { ProcessManagerModule } from '@process-manager/module'
import { LoggerModule } from '@logger/module'
import { StylingModule } from '@core/terminal/ansi/styles/stylingModule'

// Coordination module
import { CoordinationModule } from '@core/coordination/coordinationModule'

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
  readonly configPath?: string
}

/**
 * Bootstrap the application with all modules
 */
export function bootstrap(config: BootstrapConfig = {}): Effect<ModuleRegistry, Error> {
  return Effect.gen(function* () {
    const eventBus = getGlobalEventBus()
    const registry = getGlobalRegistry()
    
    // Core modules (always enabled)
    const jsxModule = new JSXModule(eventBus)
    const cliModule = new CLIModule(eventBus)
    const reactivityModule = new ReactivityModule(eventBus)
    
    yield* registry.registerMany([
      jsxModule,
      cliModule,
      reactivityModule
    ])
    
    // Service layer modules
    const serviceModule = new ServiceModule(eventBus)
    const configModule = new ConfigModule(eventBus)
    
    yield* registry.registerMany([
      serviceModule,
      configModule
    ])
    
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
      new ReactivityModule(eventBus)
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
    enableComponentSystem: true
  })
}

/**
 * Bootstrap result with typed module access
 */
export interface BootstrapResult {
  readonly registry: ModuleRegistry
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
    const registry = yield* bootstrap(config)
    
    const result: BootstrapResult = {
      registry,
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
      }
    }
    
    return result
  })
}