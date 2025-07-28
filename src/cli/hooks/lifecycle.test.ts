import { test, expect, describe, beforeEach } from 'bun:test'
import { createLifecycleHooks, LifecycleEvents } from './lifecycle'
import type { EventBus } from '../../core/model/events/eventBus'
import type {
  BeforeInitEvent,
  AfterInitEvent,
  BeforeCommandEvent,
  AfterCommandEvent,
  BeforeExecuteEvent,
  AfterExecuteEvent,
  BeforeRenderEvent,
  AfterRenderEvent,
} from './types'

// Mock EventBus
class MockEventBus {
  private events: Map<string, any[]> = new Map()
  private subscribers: Map<string, any[]> = new Map()

  emit(event: string, data: any) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(data)
    return Promise.resolve()
  }

  subscribe(channel: string, handler: any) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, [])
    }
    this.subscribers.get(channel)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(channel)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  getEvents(event: string) {
    return this.events.get(event) || []
  }

  clear() {
    this.events.clear()
    this.subscribers.clear()
  }
}

describe('Lifecycle Hooks', () => {
  let eventBus: MockEventBus
  const source = 'test-source'

  beforeEach(() => {
    eventBus = new MockEventBus()
  })

  describe('createLifecycleHooks', () => {
    test('should create all lifecycle hooks', () => {
      const hooks = createLifecycleHooks(eventBus, source)

      expect(hooks.beforeInit).toBeDefined()
      expect(hooks.afterInit).toBeDefined()
      expect(hooks.beforeCommand).toBeDefined()
      expect(hooks.afterCommand).toBeDefined()
      expect(hooks.beforeExecute).toBeDefined()
      expect(hooks.afterExecute).toBeDefined()
      expect(hooks.beforeRender).toBeDefined()
      expect(hooks.afterRender).toBeDefined()
    })

    test('should create hooks with correct event types', () => {
      const hooks = createLifecycleHooks(eventBus, source)

      // Each hook should be an object with hook methods
      expect(typeof hooks.beforeInit).toBe('object')
      expect(typeof hooks.afterInit).toBe('object')
      expect(typeof hooks.beforeCommand).toBe('object')
      expect(typeof hooks.afterCommand).toBe('object')
      expect(typeof hooks.beforeExecute).toBe('object')
      expect(typeof hooks.afterExecute).toBe('object')
      expect(typeof hooks.beforeRender).toBe('object')
      expect(typeof hooks.afterRender).toBe('object')

      // Each hook should have the tap method
      expect(typeof hooks.beforeInit.tap).toBe('function')
      expect(typeof hooks.afterInit.tap).toBe('function')
      expect(typeof hooks.beforeCommand.tap).toBe('function')
      expect(typeof hooks.afterCommand.tap).toBe('function')
      expect(typeof hooks.beforeExecute.tap).toBe('function')
      expect(typeof hooks.afterExecute.tap).toBe('function')
      expect(typeof hooks.beforeRender.tap).toBe('function')
      expect(typeof hooks.afterRender.tap).toBe('function')
    })
  })

  describe('LifecycleEvents', () => {
    describe('emitBeforeInit', () => {
      test('should emit beforeInit event with correct data', async () => {
        const config = { appName: 'test', version: '1.0.0' }

        await LifecycleEvents.emitBeforeInit(eventBus, config, source)

        const events = eventBus.getEvents('hook:beforeInit')
        expect(events).toHaveLength(1)

        const event = events[0] as BeforeInitEvent
        expect(event.type).toBe('hook:beforeInit')
        expect(event.source).toBe(source)
        expect(event.config).toEqual(config)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle empty config', async () => {
        const config = {}

        await LifecycleEvents.emitBeforeInit(eventBus, config, source)

        const events = eventBus.getEvents('hook:beforeInit')
        expect(events).toHaveLength(1)
        expect(events[0].config).toEqual({})
      })
    })

    describe('emitAfterInit', () => {
      test('should emit afterInit event with correct data', async () => {
        const config = {
          initialized: true,
          plugins: ['plugin1', 'plugin2'],
          timestamp: Date.now(),
        }

        await LifecycleEvents.emitAfterInit(eventBus, config, source)

        const events = eventBus.getEvents('hook:afterInit')
        expect(events).toHaveLength(1)

        const event = events[0] as AfterInitEvent
        expect(event.type).toBe('hook:afterInit')
        expect(event.source).toBe(source)
        expect(event.config).toEqual(config)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })
    })

    describe('emitBeforeCommand', () => {
      test('should emit beforeCommand event with command and args', async () => {
        const command = ['build', 'start']
        const args = {
          verbose: true,
          output: './dist',
          env: 'production',
        }

        await LifecycleEvents.emitBeforeCommand(eventBus, command, args, source)

        const events = eventBus.getEvents('hook:beforeCommand')
        expect(events).toHaveLength(1)

        const event = events[0] as BeforeCommandEvent
        expect(event.type).toBe('hook:beforeCommand')
        expect(event.source).toBe(source)
        expect(event.command).toEqual(command)
        expect(event.args).toEqual(args)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle empty command and args', async () => {
        const command: string[] = []
        const args = {}

        await LifecycleEvents.emitBeforeCommand(eventBus, command, args, source)

        const events = eventBus.getEvents('hook:beforeCommand')
        expect(events).toHaveLength(1)
        expect(events[0].command).toEqual([])
        expect(events[0].args).toEqual({})
      })
    })

    describe('emitAfterCommand', () => {
      test('should emit afterCommand event with result', async () => {
        const command = ['test', 'run']
        const args = { pattern: '*.spec.ts' }
        const result = {
          success: true,
          testCount: 42,
          duration: 1500,
          failures: [],
        }

        await LifecycleEvents.emitAfterCommand(eventBus, command, args, result, source)

        const events = eventBus.getEvents('hook:afterCommand')
        expect(events).toHaveLength(1)

        const event = events[0] as AfterCommandEvent
        expect(event.type).toBe('hook:afterCommand')
        expect(event.source).toBe(source)
        expect(event.command).toEqual(command)
        expect(event.args).toEqual(args)
        expect(event.result).toEqual(result)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle null result', async () => {
        const command = ['help']
        const args = {}
        const result = null

        await LifecycleEvents.emitAfterCommand(eventBus, command, args, result, source)

        const events = eventBus.getEvents('hook:afterCommand')
        expect(events).toHaveLength(1)
        expect(events[0].result).toBeNull()
      })
    })

    describe('emitBeforeExecute', () => {
      test('should emit beforeExecute event', async () => {
        const command = ['deploy', 'staging']
        const args = {
          force: false,
          backup: true,
          timeout: 30000,
        }

        await LifecycleEvents.emitBeforeExecute(eventBus, command, args, source)

        const events = eventBus.getEvents('hook:beforeExecute')
        expect(events).toHaveLength(1)

        const event = events[0] as BeforeExecuteEvent
        expect(event.type).toBe('hook:beforeExecute')
        expect(event.source).toBe(source)
        expect(event.command).toEqual(command)
        expect(event.args).toEqual(args)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })
    })

    describe('emitAfterExecute', () => {
      test('should emit afterExecute event with execution result', async () => {
        const command = ['migrate', 'up']
        const args = { steps: 3 }
        const result = {
          migrationsRun: ['001_initial', '002_users', '003_posts'],
          duration: 2500,
          status: 'completed',
        }

        await LifecycleEvents.emitAfterExecute(eventBus, command, args, result, source)

        const events = eventBus.getEvents('hook:afterExecute')
        expect(events).toHaveLength(1)

        const event = events[0] as AfterExecuteEvent
        expect(event.type).toBe('hook:afterExecute')
        expect(event.source).toBe(source)
        expect(event.command).toEqual(command)
        expect(event.args).toEqual(args)
        expect(event.result).toEqual(result)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle error result', async () => {
        const command = ['process']
        const args = {}
        const result = new Error('Processing failed')

        await LifecycleEvents.emitAfterExecute(eventBus, command, args, result, source)

        const events = eventBus.getEvents('hook:afterExecute')
        expect(events).toHaveLength(1)
        expect(events[0].result).toBeInstanceOf(Error)
      })
    })

    describe('emitBeforeRender', () => {
      test('should emit beforeRender event with component', async () => {
        const component = {
          name: 'UserList',
          props: { users: [], loading: false },
          state: { selectedUser: null },
        }

        await LifecycleEvents.emitBeforeRender(eventBus, component, source)

        const events = eventBus.getEvents('hook:beforeRender')
        expect(events).toHaveLength(1)

        const event = events[0] as BeforeRenderEvent
        expect(event.type).toBe('hook:beforeRender')
        expect(event.source).toBe(source)
        expect(event.component).toEqual(component)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle JSX component', async () => {
        const component = 'div'

        await LifecycleEvents.emitBeforeRender(eventBus, component, source)

        const events = eventBus.getEvents('hook:beforeRender')
        expect(events).toHaveLength(1)
        expect(events[0].component).toBe('div')
      })
    })

    describe('emitAfterRender', () => {
      test('should emit afterRender event with output', async () => {
        const component = {
          name: 'Dashboard',
          type: 'functional',
        }
        const output = `
          <div class="dashboard">
            <h1>Dashboard</h1>
            <div class="content">...</div>
          </div>
        `

        await LifecycleEvents.emitAfterRender(eventBus, component, output, source)

        const events = eventBus.getEvents('hook:afterRender')
        expect(events).toHaveLength(1)

        const event = events[0] as AfterRenderEvent
        expect(event.type).toBe('hook:afterRender')
        expect(event.source).toBe(source)
        expect(event.component).toEqual(component)
        expect(event.output).toBe(output)
        expect(event.id).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      test('should handle empty output', async () => {
        const component = { name: 'EmptyComponent' }
        const output = ''

        await LifecycleEvents.emitAfterRender(eventBus, component, output, source)

        const events = eventBus.getEvents('hook:afterRender')
        expect(events).toHaveLength(1)
        expect(events[0].output).toBe('')
      })
    })
  })

  describe('multiple events', () => {
    test('should handle multiple events of the same type', async () => {
      const config1 = { app: 'app1' }
      const config2 = { app: 'app2' }

      await LifecycleEvents.emitBeforeInit(eventBus, config1, source)
      await LifecycleEvents.emitBeforeInit(eventBus, config2, source)

      const events = eventBus.getEvents('hook:beforeInit')
      expect(events).toHaveLength(2)
      expect(events[0].config).toEqual(config1)
      expect(events[1].config).toEqual(config2)
    })

    test('should handle events with different sources', async () => {
      const config = { test: true }
      const source1 = 'plugin1'
      const source2 = 'plugin2'

      await LifecycleEvents.emitBeforeInit(eventBus, config, source1)
      await LifecycleEvents.emitBeforeInit(eventBus, config, source2)

      const events = eventBus.getEvents('hook:beforeInit')
      expect(events).toHaveLength(2)
      expect(events[0].source).toBe(source1)
      expect(events[1].source).toBe(source2)
    })
  })

  describe('event id generation', () => {
    test('should generate unique IDs for different events', async () => {
      const config = { test: true }

      await LifecycleEvents.emitBeforeInit(eventBus, config, source)
      await LifecycleEvents.emitAfterInit(eventBus, config, source)

      const beforeEvents = eventBus.getEvents('hook:beforeInit')
      const afterEvents = eventBus.getEvents('hook:afterInit')

      expect(beforeEvents[0].id).toBeDefined()
      expect(afterEvents[0].id).toBeDefined()
      expect(beforeEvents[0].id).not.toBe(afterEvents[0].id)
    })

    test('should generate unique IDs for same event type', async () => {
      const config = { test: true }

      await LifecycleEvents.emitBeforeInit(eventBus, config, source)
      await LifecycleEvents.emitBeforeInit(eventBus, config, source)

      const events = eventBus.getEvents('hook:beforeInit')
      expect(events).toHaveLength(2)
      expect(events[0].id).not.toBe(events[1].id)
    })
  })

  describe('timestamp handling', () => {
    test('should set timestamp for each event', async () => {
      const config = { test: true }
      const beforeTime = new Date()

      await LifecycleEvents.emitBeforeInit(eventBus, config, source)

      const afterTime = new Date()
      const events = eventBus.getEvents('hook:beforeInit')
      const eventTime = events[0].timestamp

      expect(eventTime).toBeInstanceOf(Date)
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })
})
