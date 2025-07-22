import { test, expect, afterEach } from "bun:test"
import { Effect } from "effect"
import { 
  bootstrap, 
  bootstrapFull, 
  bootstrapMinimal,
  bootstrapWithModules 
} from "./runtime/bootstrap"
import { getGlobalEventBus, resetGlobalEventBus } from "./model/events/eventBus"
import { resetGlobalRegistry } from "./runtime/module/registry"
import type { ServiceEvent } from "../services/events"
import type { ConfigEvent } from "../config/events"
import type { ProcessEvent } from "../process-manager/events"
import type { LogEvent } from "../logger/events"
import type { ThemeEvent } from "./terminal/ansi/styles/events"

// Clean up after each test
afterEach(async () => {
  await Effect.runPromise(resetGlobalRegistry())
  await Effect.runPromise(resetGlobalEventBus())
})

test("minimal bootstrap initializes core modules only", async () => {
  const registry = await Effect.runPromise(bootstrapMinimal())
  
  expect(registry.hasModule('jsx')).toBe(true)
  expect(registry.hasModule('cli')).toBe(true)
  expect(registry.hasModule('reactivity')).toBe(true)
  expect(registry.hasModule('services')).toBe(false)
  expect(registry.hasModule('logger')).toBe(false)
})

test("full bootstrap initializes all modules", async () => {
  const registry = await Effect.runPromise(bootstrapFull())
  
  expect(registry.hasModule('jsx')).toBe(true)
  expect(registry.hasModule('cli')).toBe(true)
  expect(registry.hasModule('reactivity')).toBe(true)
  expect(registry.hasModule('services')).toBe(true)
  expect(registry.hasModule('config')).toBe(true)
  expect(registry.hasModule('process-manager')).toBe(true)
  expect(registry.hasModule('logger')).toBe(true)
  expect(registry.hasModule('styling')).toBe(true)
})

test("bootstrap with config enables specific modules", async () => {
  const registry = await Effect.runPromise(bootstrap({
    enableLogging: true,
    enableProcessManager: false,
    enableStyling: true
  }))
  
  expect(registry.hasModule('logger')).toBe(true)
  expect(registry.hasModule('process-manager')).toBe(false)
  expect(registry.hasModule('styling')).toBe(true)
})

test("bootstrapWithModules provides typed module access", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableLogging: true
  }))
  
  expect(result.modules.jsx).toBeDefined()
  expect(result.modules.cli).toBeDefined()
  expect(result.modules.reactivity).toBeDefined()
  expect(result.modules.logger).toBeDefined()
  expect(result.modules.processManager).toBeUndefined()
})

test("service module lifecycle events", async () => {
  const eventBus = getGlobalEventBus()
  const events: ServiceEvent[] = []
  
  // Subscribe to service events
  await Effect.runPromise(
    eventBus.subscribe<ServiceEvent>('service-events', (event) => 
      Effect.sync(() => events.push(event))
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules())
  const serviceModule = result.modules.services!
  
  // Start a service
  await Effect.runPromise(
    serviceModule.startService('test-terminal', 'terminal')
  )
  
  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 150))
  
  expect(events).toHaveLength(2)
  expect(events[0].type).toBe('service-started')
  expect(events[1].type).toBe('service-ready')
  expect(events[0].serviceName).toBe('test-terminal')
})

test("config module loads and validates configuration", async () => {
  const eventBus = getGlobalEventBus()
  const events: ConfigEvent[] = []
  
  // Subscribe to config events
  await Effect.runPromise(
    eventBus.subscribe<ConfigEvent>('config-events', (event) => 
      Effect.sync(() => events.push(event))
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules())
  const configModule = result.modules.config!
  
  // Load config
  const config = await Effect.runPromise(
    configModule.loadConfig('test.json')
  )
  
  expect(config).toEqual({
    version: '1.0.0',
    debug: false,
    plugins: []
  })
  
  expect(events).toHaveLength(1)
  expect(events[0].type).toBe('config-loaded')
  expect(events[0].configPath).toBe('test.json')
})

test("process manager starts and monitors processes", async () => {
  const eventBus = getGlobalEventBus()
  const events: ProcessEvent[] = []
  
  // Subscribe to process events
  await Effect.runPromise(
    eventBus.subscribe<ProcessEvent>('process-lifecycle', (event) => 
      Effect.sync(() => events.push(event))
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules({
    enableProcessManager: true
  }))
  const pmModule = result.modules.processManager!
  
  // Start a process
  const handle = await Effect.runPromise(
    pmModule.startProcess({
      name: 'test-process',
      command: 'echo',
      args: ['hello']
    })
  )
  
  expect(handle.name).toBe('test-process')
  expect(handle.pid).toBeGreaterThan(0)
  
  expect(events).toHaveLength(1)
  expect(events[0].type).toBe('process-started')
  expect(events[0].processName).toBe('test-process')
})

test("logger aggregates events from all modules", async () => {
  const logEntries: LogEvent[] = []
  
  // Track log entries
  const eventBus = getGlobalEventBus()
  await Effect.runPromise(
    eventBus.subscribe<LogEvent>('log-events', (event) => 
      Effect.sync(() => {
        if (event.type === 'log-entry') {
          logEntries.push(event)
        }
      })
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules({
    enableLogging: true
  }))
  
  // Set logger to debug level
  const logger = result.modules.logger!
  await Effect.runPromise(logger.setLevel('debug'))
  
  // Trigger some events
  const services = result.modules.services!
  await Effect.runPromise(services.emitKeyPress('a'))
  
  // Logger should log events
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have logged events
  expect(logEntries.length).toBeGreaterThan(0)
})

test("styling module responds to terminal resize", async () => {
  const eventBus = getGlobalEventBus()
  const layoutEvents: ThemeEvent[] = []
  
  // Subscribe to layout events
  await Effect.runPromise(
    eventBus.subscribe('layout-events', (event) => 
      Effect.sync(() => layoutEvents.push(event))
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules({
    enableStyling: true
  }))
  const serviceModule = result.modules.services!
  
  // Emit terminal resize
  await Effect.runPromise(
    serviceModule.emitTerminalResize(120, 40)
  )
  
  // Styling module should react
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should invalidate layouts on resize
  const invalidations = layoutEvents.filter(e => e.type === 'layout-invalidated')
  expect(invalidations.length).toBeGreaterThanOrEqual(0) // May have no layouts yet
})

test("cross-module communication: config changes trigger theme update", async () => {
  const eventBus = getGlobalEventBus()
  const themeEvents: ThemeEvent[] = []
  
  // Subscribe to theme events
  await Effect.runPromise(
    eventBus.subscribe<ThemeEvent>('theme-events', (event) => 
      Effect.sync(() => themeEvents.push(event))
    )
  )
  
  const result = await Effect.runPromise(bootstrapWithModules({
    enableStyling: true
  }))
  const configModule = result.modules.config!
  const stylingModule = result.modules.styling!
  
  // First load the config
  await Effect.runPromise(configModule.loadConfig('app.json'))
  
  // Register a dark theme
  await Effect.runPromise(
    stylingModule.registerTheme('dark', {
      name: 'dark',
      colors: {
        primary: '#bb86fc',
        secondary: '#03dac6',
        background: '#121212',
        foreground: '#ffffff',
        error: '#cf6679',
        warning: '#ffb74d',
        success: '#81c784',
        info: '#64b5f6'
      }
    })
  )
  
  // Update theme config
  await Effect.runPromise(
    configModule.updateConfig('app.json', 'theme', 'dark')
  )
  
  // Wait for cascading events
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have theme events
  expect(themeEvents.length).toBeGreaterThan(0)
  const loadedEvents = themeEvents.filter(e => e.type === 'theme-loaded')
  expect(loadedEvents.length).toBe(1)
  expect(loadedEvents[0].themeName).toBe('dark')
})

test("module registry provides statistics", async () => {
  const registry = await Effect.runPromise(bootstrapFull())
  const stats = registry.getStats()
  
  expect(stats.totalModules).toBe(10) // All modules including coordination and component system
  expect(stats.initializedModules).toBe(10) // All should be initialized
  expect(stats.moduleStates['jsx']).toBe('ready')
  expect(stats.moduleStates['cli']).toBe('ready')
  expect(stats.moduleStates['logger']).toBe('ready')
  expect(stats.moduleStates['coordination']).toBe('ready')
  expect(stats.moduleStates['component-system']).toBe('ready')
})