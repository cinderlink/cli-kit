/**
 * Integration tests for domain event system
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { EventBus, resetGlobalEventBus, type BaseEvent } from '../../core/model/events/event-bus'
import { ModuleRegistry, resetGlobalRegistry } from '../../core/runtime/module/registry'
import { JSXModule } from '../../jsx/module'
import { CLIModule } from '../../cli/module'
import { ReactivityModule } from '../../core/update/reactivity/module'
import type { CLICommandEvent } from '../../cli/impl/events'
import type { JSXRenderEvent } from '../../jsx/events'
import type { RuneEvent } from '../../core/update/reactivity/events'
import type { StateRune } from '../../core/update/reactivity/runes'

type Unsubscribe = () => Effect.Effect<void>

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

    await expect(Effect.succeed(jsxModule.isReady())).resolves.toBe(true)
    await expect(Effect.succeed(cliModule.isReady())).resolves.toBe(true)
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
    const events: BaseEvent[] = []

    // Subscribe to CLI command events
    const unsub = (await Effect.runPromise(
      eventBus.subscribe('cli-command', (event: BaseEvent) => {
        events.push(event)
        return Effect.void
      })
    )) as Unsubscribe

    // Register a command via CLI module
    await Effect.runPromise(
      cliModule.registerCommand({
        path: ['test', 'command'],
        handler: () => Effect.succeed(0),
        description: 'Test command',
      })
    )

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('cli-command-registered')
    expect((events[0]! as CLICommandEvent).path).toEqual(['test', 'command'])

    await Effect.runPromise(unsub())
  })

  test('JSX module should emit render events', async () => {
    const events: JSXRenderEvent[] = []

    const unsub = (await Effect.runPromise(
      eventBus.subscribe('jsx-render', (event: BaseEvent) => {
        events.push(event as unknown as JSXRenderEvent)
        return Effect.void
      })
    )) as Unsubscribe

    const element = { type: 'div', props: {} } as any // Cast to any to bypass JSX namespace issue
    await Effect.runPromise(jsxModule.renderComponent(element))

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0]!.type).toBe('jsx-render-start')
    expect(events[1]!.type).toBe('jsx-render-end')

    await Effect.runPromise(unsub())
  })

  test('Reactivity module should manage runes', async () => {
    const events: RuneEvent[] = []

    const unsub = (await Effect.runPromise(
      eventBus.subscribe('reactivity-rune', (event: BaseEvent) => {
        events.push(event as unknown as RuneEvent)
        return Effect.void
      })
    )) as Unsubscribe

    const rune = (await Effect.runPromise(
      reactivityModule.createRune('counter', 0)
    )) as StateRune<number>

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('rune-created')
    expect(events[0]!.runeName).toBe('counter')

    // Update rune value
    rune.$set(42)

    await new Promise(resolve => setTimeout(resolve, 10))

    const updateEvent = events.find(e => e.type === 'rune-updated')
    expect(updateEvent).toBeDefined()
    expect(updateEvent!.runeName).toBe('counter')

    await Effect.runPromise(unsub())
  })
})
