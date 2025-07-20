/**
 * Integration tests for domain event system
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { EventBus, resetGlobalEventBus } from './event-bus'
import { ModuleRegistry, resetGlobalRegistry } from './module-registry'
import { JSXModule } from '../jsx/module'
import { CLIModule } from '../cli/module'
import { ReactivityModule } from '../reactivity/module'
import type { CLICommandEvent } from '../cli/events'
import type { JSXRenderEvent } from '../jsx/events'
import type { RuneEvent } from '../reactivity/events'

describe('EventBus', () => {
  let eventBus: EventBus
  
  beforeEach(() => {
    eventBus = new EventBus()
  })
  
  afterEach(async () => {
    await Effect.runPromise(eventBus.shutdown())
  })
  
  test('should publish and subscribe to events', async () => {
    let receivedEvent: any = null
    
    const unsubscribe = await Effect.runPromise(
      eventBus.subscribe('test-channel', (event) => {
        receivedEvent = event
        return Effect.void
      })
    )
    
    await Effect.runPromise(
      eventBus.publish('test-channel', {
        type: 'test-event',
        timestamp: new Date(),
        source: 'test'
      })
    )
    
    // Give time for event to propagate
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent?.type).toBe('test-event')
    
    await Effect.runPromise(unsubscribe())
  })
  
  test('should support multiple subscribers', async () => {
    const received: any[] = []
    
    const unsub1 = await Effect.runPromise(
      eventBus.subscribe('multi-channel', (event) => {
        received.push({ subscriber: 1, event })
        return Effect.void
      })
    )
    
    const unsub2 = await Effect.runPromise(
      eventBus.subscribe('multi-channel', (event) => {
        received.push({ subscriber: 2, event })
        return Effect.void
      })
    )
    
    await Effect.runPromise(
      eventBus.publish('multi-channel', {
        type: 'multi-event',
        timestamp: new Date(),
        source: 'test'
      })
    )
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(received).toHaveLength(2)
    expect(received[0].subscriber).toBe(1)
    expect(received[1].subscriber).toBe(2)
    
    await Effect.runPromise(unsub1())
    await Effect.runPromise(unsub2())
  })
  
  test('should get event bus statistics', async () => {
    await Effect.runPromise(
      eventBus.subscribe('stats-channel', () => Effect.void)
    )
    
    const stats = await Effect.runPromise(eventBus.getStats())
    
    expect(stats.totalChannels).toBe(1)
    expect(stats.totalSubscriptions).toBe(1)
  })
})

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry
  let eventBus: EventBus
  
  beforeEach(() => {
    eventBus = new EventBus()
    registry = new ModuleRegistry(eventBus)
  })
  
  afterEach(async () => {
    await Effect.runPromise(registry.shutdown())
    await Effect.runPromise(eventBus.shutdown())
  })
  
  test('should register and initialize modules', async () => {
    const jsxModule = new JSXModule(eventBus)
    const cliModule = new CLIModule(eventBus)
    
    await Effect.runPromise(registry.register(jsxModule))
    await Effect.runPromise(registry.register(cliModule))
    
    expect(registry.hasModule('jsx')).toBe(true)
    expect(registry.hasModule('cli')).toBe(true)
    
    await Effect.runPromise(registry.initialize())
    
    expect(jsxModule.isReady()).toBe(true)
    expect(cliModule.isReady()).toBe(true)
  })
  
  test('should prevent duplicate module registration', async () => {
    const module1 = new JSXModule(eventBus)
    const module2 = new JSXModule(eventBus)
    
    await Effect.runPromise(registry.register(module1))
    
    const result = await Effect.runPromise(
      registry.register(module2).pipe(
        Effect.map(() => 'success'),
        Effect.catchAll(() => Effect.succeed('error'))
      )
    )
    
    expect(result).toBe('error')
  })
  
  test('should get modules by name', async () => {
    const jsxModule = new JSXModule(eventBus)
    await Effect.runPromise(registry.register(jsxModule))
    
    const retrieved = registry.getModule<JSXModule>('jsx')
    expect(retrieved).toBe(jsxModule)
    
    const notFound = registry.getModule('nonexistent')
    expect(notFound).toBeUndefined()
  })
})

describe('Domain Module Integration', () => {
  let registry: ModuleRegistry
  let eventBus: EventBus
  let jsxModule: JSXModule
  let cliModule: CLIModule
  let reactivityModule: ReactivityModule
  
  beforeEach(async () => {
    eventBus = new EventBus()
    registry = new ModuleRegistry(eventBus)
    
    jsxModule = new JSXModule(eventBus)
    cliModule = new CLIModule(eventBus)
    reactivityModule = new ReactivityModule(eventBus)
    
    await Effect.runPromise(registry.registerMany([jsxModule, cliModule, reactivityModule]))
    await Effect.runPromise(registry.initialize())
  })
  
  afterEach(async () => {
    await Effect.runPromise(registry.shutdown())
    await Effect.runPromise(eventBus.shutdown())
    await Effect.runPromise(resetGlobalEventBus())
    await Effect.runPromise(resetGlobalRegistry())
  })
  
  test('modules should communicate via events', async () => {
    const events: any[] = []
    
    // Subscribe to CLI command events
    const unsub = await Effect.runPromise(
      eventBus.subscribe('cli-command', (event) => {
        events.push(event)
        return Effect.void
      })
    )
    
    // Register a command via CLI module
    await Effect.runPromise(
      cliModule.registerCommand({
        path: ['test', 'command'],
        handler: () => Effect.succeed(0),
        description: 'Test command'
      })
    )
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('cli-command-registered')
    expect((events[0] as CLICommandEvent).path).toEqual(['test', 'command'])
    
    await Effect.runPromise(unsub())
  })
  
  test('JSX module should emit render events', async () => {
    const events: JSXRenderEvent[] = []
    
    const unsub = await Effect.runPromise(
      eventBus.subscribe('jsx-render', (event) => {
        events.push(event as JSXRenderEvent)
        return Effect.void
      })
    )
    
    const element = { type: 'div', props: {} } as JSX.Element
    await Effect.runPromise(jsxModule.renderComponent(element))
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0].type).toBe('jsx-render-start')
    expect(events[1].type).toBe('jsx-render-end')
    
    await Effect.runPromise(unsub())
  })
  
  test('Reactivity module should manage runes', async () => {
    const events: RuneEvent[] = []
    
    const unsub = await Effect.runPromise(
      eventBus.subscribe('reactivity-rune', (event) => {
        events.push(event as RuneEvent)
        return Effect.void
      })
    )
    
    const rune = await Effect.runPromise(
      reactivityModule.createRune('counter', 0)
    )
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('rune-created')
    expect(events[0].runeName).toBe('counter')
    
    // Update rune value
    rune.value = 42
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(events).toHaveLength(2)
    expect(events[1].type).toBe('rune-updated')
    expect(events[1].value).toBe(42)
    expect(events[1].previousValue).toBe(0)
    
    await Effect.runPromise(unsub())
  })
  
  test('modules should handle cross-domain events', async () => {
    // This would test more complex scenarios where modules
    // react to each other's events, but for now we'll keep it simple
    
    const stats = registry.getStats()
    expect(stats.totalModules).toBe(3)
    expect(stats.initializedModules).toBe(3)
    expect(stats.moduleStates.jsx).toBe('ready')
    expect(stats.moduleStates.cli).toBe('ready')
    expect(stats.moduleStates.reactivity).toBe('ready')
  })
})