/**
 * Module Coordination Integration Tests
 *
 * Tests for cross-module communication and coordination patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect, Duration } from 'effect'
import type { BaseEvent } from '@core/model/events/event-bus'
import { getGlobalEventBus, resetGlobalEventBus } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { bootstrapWithModules } from '@core/runtime/bootstrap'

import type {
  UIUpdateEvent,
  ErrorDetectionEvent,
  PerformanceReportEvent,
  WorkflowResult,
} from './types'

describe('Module Coordination', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Event-driven coordination', () => {
    it('should coordinate CLI command execution with JSX rendering', async () => {
      const events: any[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: [],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Subscribe to events
          const subscription = yield* eventBus.subscribe('cli-command', event =>
            Effect.sync(() => {
              events.push(event)
            })
          )

          // Simulate CLI command triggering JSX render
          yield* eventBus.emit('cli-command', {
            type: 'cli-command-executed',
            command: 'render-ui',
            args: {},
            timestamp: new Date(),
          })

          // Give time for event propagation
          yield* Effect.sleep(Duration.millis(100))

          yield* subscription()
        })
      )

      expect(events.length).toBeGreaterThan(0)
    })

    it('should coordinate process lifecycle with UI updates', async () => {
      const processEvents: any[] = []
      const uiEvents: UIUpdateEvent[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: ['jsx'],
            serviceModules: ['processManager'],
            coordinationModules: [],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Subscribe to process events
          const processSub = yield* eventBus.subscribe('process-*', (event: any) =>
            Effect.sync(() => {
              processEvents.push(event)
            })
          )

          // Subscribe to UI events
          const uiSub = yield* eventBus.subscribe('jsx-*', (event: UIUpdateEvent) =>
            Effect.sync(() => {
              uiEvents.push(event)
            })
          )

          // Simulate process events
          yield* eventBus.publish('process-started', {
            type: 'process-started',
            pid: '12345',
            command: 'test-command',
            status: 'started',
            timestamp: new Date(),
            source: 'test',
            id: 'test-1',
          })

          yield* eventBus.publish('process-completed', {
            type: 'process-completed',
            pid: '12345',
            command: 'test-command',
            status: 'completed',
            timestamp: new Date(),
            source: 'test',
            id: 'test-2',
          })

          yield* Effect.sleep(Duration.millis(100))

          processSub()
          uiSub()
        })
      )

      expect(processEvents.length).toBeGreaterThan(0)
    })
  })

  describe('Configuration coordination', () => {
    it('should coordinate config changes across modules', async () => {
      const configChanges: any[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
            enableServices: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscription = yield* eventBus.subscribe('config-*', (event: any) => {
            Effect.sync(() => {
              configChanges.push(event)
            })
          })

          // Simulate config change
          yield* eventBus.publish('config-changed', {
            type: 'config-change',
            key: 'theme',
            value: 'dark',
            module: 'ui',
            timestamp: new Date(),
            source: 'test',
            id: 'test-3',
          })

          yield* Effect.sleep(Duration.millis(50))

          yield* subscription()
        })
      )

      expect(configChanges.length).toBeGreaterThan(0)
    })
  })

  describe('Error propagation', () => {
    it('should propagate errors across module boundaries', async () => {
      const errors: ErrorDetectionEvent[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
            enableServices: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscription = yield* eventBus.subscribe(
            'error:detected',
            (event: ErrorDetectionEvent) => {
              Effect.sync(() => {
                errors.push(event)
              })
            }
          )

          // Simulate error in one module
          yield* eventBus.publish('error:detected', {
            type: 'error:detected',
            error: new Error('Failed to render component'),
            indicator: {
              patternId: 'render-error',
              severity: 'high',
              confidence: 0.8,
            },
            timestamp: new Date(),
            source: 'test',
            id: 'test-4',
          })

          yield* Effect.sleep(Duration.millis(50))

          yield* subscription()
        })
      )

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].type).toBe('render-error')
    })

    it('should implement error recovery patterns', async () => {
      let recovered = false

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination'],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Set up error recovery
          const subscription = eventBus.subscribe('error', (event: any) => {
            if (event.type === 'render-error') {
              // Simulate recovery
              setTimeout(() => {
                recovered = true
              }, 10)
            }
          })

          // Trigger error
          yield* eventBus.emit('error', {
            type: 'render-error',
            module: 'jsx',
            message: 'Component failed',
            timestamp: new Date(),
          })

          yield* Effect.sleep(Duration.millis(100))

          yield* subscription()
        })
      )

      expect(recovered).toBe(true)
    })
  })

  describe('Performance monitoring', () => {
    it('should track performance metrics across modules', async () => {
      const metrics: PerformanceReportEvent[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
            enableServices: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscription = yield* eventBus.subscribe(
            'performance:report',
            (event: PerformanceReportEvent) => {
              Effect.sync(() => {
                metrics.push(event)
              })
            }
          )

          // Simulate performance events
          yield* eventBus.publish('performance:report', {
            type: 'performance:report',
            report: {
              timestamp: new Date(),
              throughput: [],
              responseTimes: [],
              memory: {
                heapUsed: 1000000,
                heapTotal: 2000000,
                external: 500000,
                timestamp: new Date(),
              },
              customMetrics: [],
            },
            timestamp: new Date(),
            source: 'test',
            id: 'test-5',
          })

          yield* Effect.sleep(Duration.millis(50))

          yield* subscription()
        })
      )

      expect(metrics.length).toBe(2)
      expect(metrics[0].type).toBe('render-performance')
      expect(metrics[1].type).toBe('command-performance')
    })
  })

  describe('State synchronization', () => {
    it('should synchronize state between CLI and JSX modules', async () => {
      let cliState: any = { currentCommand: null }
      let jsxState: any = { currentView: null }

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: [],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Set up state synchronization
          const cliSub = eventBus.subscribe('cli-*', (event: any) => {
            if (event.type === 'command-executed') {
              cliState.currentCommand = event.command
            }
          })

          const jsxSub = eventBus.subscribe('jsx-*', (event: any) => {
            if (event.type === 'view-rendered') {
              jsxState.currentView = event.component
            }
          })

          // Trigger state changes
          yield* eventBus.emit('cli-command', {
            type: 'command-executed',
            command: 'status',
            timestamp: new Date(),
          })

          yield* eventBus.emit('jsx-render', {
            type: 'view-rendered',
            component: 'StatusView',
            timestamp: new Date(),
          })

          yield* Effect.sleep(Duration.millis(50))

          cliSub()
          jsxSub()
        })
      )

      expect(cliState.currentCommand).toBe('status')
      expect(jsxState.currentView).toBe('StatusView')
    })
  })

  describe('Resource management', () => {
    it('should coordinate resource cleanup across modules', async () => {
      let resourcesCleanedUp = 0

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: [],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Listen for cleanup events
          const subscription = eventBus.subscribe('resource-cleanup', () => {
            resourcesCleanedUp++
            return Effect.void
          })

          // Simulate shutdown
          yield* eventBus.emit('shutdown', { timestamp: new Date() })

          yield* Effect.sleep(Duration.millis(50))

          yield* subscription()
        })
      )

      expect(resourcesCleanedUp).toBeGreaterThan(0)
    })

    it('should handle graceful shutdown of modules', async () => {
      let shutdownCompleted = false

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: [],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscription = eventBus.subscribe('shutdown-completed', () => {
            shutdownCompleted = true
            return Effect.void
          })

          // Trigger shutdown
          yield* eventBus.emit('shutdown', { timestamp: new Date() })

          yield* Effect.sleep(Duration.millis(100))

          yield* subscription()
        })
      )

      expect(shutdownCompleted).toBe(true)
    })
  })

  describe('Stream coordination', () => {
    it('should coordinate data streams between modules', async () => {
      const streamData: string[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscriptionEffect = eventBus.subscribe('stream-*', (event: any) => {
            // Extract data from the event
            if (event.type === 'input-stream') {
              streamData.push(event.data)
            }
            return Effect.void
          })
          const unsubscribe = yield* subscriptionEffect

          // Simulate stream events
          for (let i = 0; i < 5; i++) {
            yield* eventBus.publish({
              type: 'input-stream',
              data: `event-${i}`,
              timestamp: new Date(),
              source: 'test',
              id: `test-${i}`,
            })
            yield* Effect.sleep(Duration.millis(10))
          }

          yield* unsubscribe()
        })
      )

      expect(streamData).toHaveLength(5)
      expect(streamData[0]).toBe('event-0')
      expect(streamData[4]).toBe('event-4')
    })
  })

  describe('Integration patterns', () => {
    it('should implement publisher-subscriber pattern', async () => {
      const subscribers: string[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination'],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Multiple subscribers
          const sub1Effect = eventBus.subscribe('test-*', () => {
            subscribers.push('sub1')
            return Effect.void
          })
          const sub2Effect = eventBus.subscribe('test-*', () => {
            subscribers.push('sub2')
            return Effect.void
          })
          const sub3Effect = eventBus.subscribe('test-event', () => {
            subscribers.push('sub3')
            return Effect.void
          })

          const unsub1 = yield* sub1Effect
          const unsub2 = yield* sub2Effect
          const unsub3 = yield* sub3Effect

          // Publish event
          yield* eventBus.publish({
            type: 'test-event',
            data: 'test',
            timestamp: new Date(),
            source: 'test',
            id: 'test-pubsub',
          })

          yield* Effect.sleep(Duration.millis(50))

          yield* unsub1()
          yield* unsub2()
          yield* unsub3()
        })
      )

      expect(subscribers).toContain('sub1')
      expect(subscribers).toContain('sub2')
      expect(subscribers).toContain('sub3')
    })

    it('should implement request-response pattern', async () => {
      let response: WorkflowResult | null = null

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination'],
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          // Response handler
          const subscriptionEffect = eventBus.subscribe('request-*', (event: any) => {
            if (event.type === 'request-data') {
              // Send response
              eventBus.publish({
                type: 'response-data',
                requestId: event.requestId,
                payload: 'response-payload',
                timestamp: new Date(),
                source: 'test',
                id: 'test-response',
              })
            }
            return Effect.void
          })
          const subscriptionUnsub = yield* subscriptionEffect

          // Response listener
          let responseReceived = false
          const responseSubEffect = eventBus.subscribe('response-*', (event: any) => {
            if (event.type === 'response-data') {
              response = event.payload
            }
            responseReceived = true
            return Effect.void
          })
          const responseSubUnsub = yield* responseSubEffect

          // Send request
          yield* eventBus.publish({
            type: 'request-data',
            requestId: 'req-123',
            source: 'test',
            id: 'test-request',
            timestamp: new Date(),
          })

          // Wait for response
          yield* Effect.sleep(Duration.millis(100))

          // Clean up subscriptions
          yield* subscriptionUnsub()
          yield* responseSubUnsub()
        })
      )

      expect(response).toBe('response-payload')
    })
  })

  describe('Performance', () => {
    it('should handle high-frequency coordination efficiently', async () => {
      const eventCount = 1000
      const receivedEvents: BaseEvent[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscriptionEffect = eventBus.subscribe('perf-test', event => {
            receivedEvents.push(event)
            return Effect.void
          })
          const unsubscribe = yield* subscriptionEffect

          // Publish a burst of events
          for (let i = 0; i < eventCount; i++) {
            yield* eventBus.publish({
              type: 'perf-test',
              timestamp: new Date(),
              source: 'test',
              id: `perf-${i}`,
            })
          }

          // Wait for all events to be processed
          yield* Effect.sleep(Duration.millis(500))

          yield* unsubscribe()
        })
      )

      expect(receivedEvents.length).toBe(eventCount)
    })
  })

  describe('Workflow coordination', () => {
    it('should coordinate a multi-step workflow', async () => {
      const results: WorkflowResult[] = []

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* bootstrapWithModules({
            enableCoordination: true,
          })

          // Get the global event bus
          const eventBus = getGlobalEventBus()

          const subscriptionEffect = eventBus.subscribe('workflow-result', (event: any) => {
            results.push(event.result)
            return Effect.void
          })
          const unsubscribe = yield* subscriptionEffect

          // Start workflow
          yield* eventBus.publish({
            type: 'start-workflow',
            workflowId: 'wf-1',
            timestamp: new Date(),
            source: 'test',
            id: 'start-wf-1',
          })

          yield* Effect.sleep(Duration.millis(200))

          yield* unsubscribe()
        })
      )

      expect(results.length).toBe(1)
      expect(results[0].status).toBe('completed')
    })
  })
})
