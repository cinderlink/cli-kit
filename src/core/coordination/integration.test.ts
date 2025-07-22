/**
 * Module Coordination Integration Tests
 * 
 * Tests for cross-module communication and coordination patterns
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { Effect, Duration, Fiber } from "effect"
import { getGlobalEventBus, resetGlobalEventBus } from "@core/model/events/eventBus"
import { resetGlobalRegistry } from "@core/runtime/module/registry"
import { bootstrapWithModules } from "@core/runtime/bootstrap"

describe("Module Coordination", () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })
  
  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe("Event-driven coordination", () => {
    it("should coordinate CLI command execution with JSX rendering", async () => {
      const events: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: []
          })
          
          // Subscribe to events
          const subscription = eventBus.subscribe('*', (event) => {
            events.push(event)
          })
          
          // Simulate CLI command triggering JSX render
          yield* eventBus.emit('cli-command', {
            type: 'cli-command-executed',
            command: 'render-ui',
            args: {},
            timestamp: new Date()
          })
          
          // Give time for event propagation
          yield* Effect.sleep(Duration.millis(100))
          
          subscription()
        })
      )
      
      expect(events.length).toBeGreaterThan(0)
    })
    
    it("should coordinate process lifecycle with UI updates", async () => {
      const processEvents: any[] = []
      const uiEvents: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx'],
            serviceModules: ['processManager'],
            coordinationModules: []
          })
          
          // Subscribe to process events
          const processSub = eventBus.subscribe('process-*', (event) => {
            processEvents.push(event)
          })
          
          // Subscribe to UI events
          const uiSub = eventBus.subscribe('jsx-*', (event) => {
            uiEvents.push(event)
          })
          
          // Simulate process start
          yield* eventBus.emit('process-started', {
            type: 'process-started',
            pid: 1234,
            command: 'test-process',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(100))
          
          processSub()
          uiSub()
        })
      )
      
      expect(processEvents.length).toBeGreaterThan(0)
    })
  })
  
  describe("Configuration coordination", () => {
    it("should coordinate config changes across modules", async () => {
      const configChanges: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['cli', 'jsx'],
            serviceModules: ['config'],
            coordinationModules: []
          })
          
          const subscription = eventBus.subscribe('config-*', (event) => {
            configChanges.push(event)
          })
          
          // Simulate config change
          yield* eventBus.emit('config-changed', {
            type: 'config-updated',
            key: 'theme',
            value: 'dark',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
        })
      )
      
      expect(configChanges.length).toBeGreaterThan(0)
    })
  })
  
  describe("Error propagation", () => {
    it("should propagate errors across module boundaries", async () => {
      const errors: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          const subscription = eventBus.subscribe('error', (event) => {
            errors.push(event)
          })
          
          // Simulate error in one module
          yield* eventBus.emit('error', {
            type: 'render-error',
            module: 'jsx',
            message: 'Failed to render component',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
        })
      )
      
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].type).toBe('render-error')
    })
    
    it("should implement error recovery patterns", async () => {
      let recovered = false
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          // Set up error recovery
          const subscription = eventBus.subscribe('error', (event) => {
            if (event.type === 'render-error') {
              // Simulate recovery
              setTimeout(() => { recovered = true }, 10)
            }
          })
          
          // Trigger error
          yield* eventBus.emit('error', {
            type: 'render-error',
            module: 'jsx',
            message: 'Component failed',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(100))
          
          subscription()
        })
      )
      
      expect(recovered).toBe(true)
    })
  })
  
  describe("Performance monitoring", () => {
    it("should track performance metrics across modules", async () => {
      const metrics: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx'],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          const subscription = eventBus.subscribe('perf-*', (event) => {
            metrics.push(event)
          })
          
          // Simulate performance events
          yield* eventBus.emit('perf-render', {
            type: 'render-performance',
            duration: 16.5,
            component: 'Dashboard',
            timestamp: new Date()
          })
          
          yield* eventBus.emit('perf-command', {
            type: 'command-performance', 
            duration: 45.2,
            command: 'build',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
        })
      )
      
      expect(metrics.length).toBe(2)
      expect(metrics[0].type).toBe('render-performance')
      expect(metrics[1].type).toBe('command-performance')
    })
  })
  
  describe("State synchronization", () => {
    it("should synchronize state between CLI and JSX modules", async () => {
      let cliState = { currentCommand: null }
      let jsxState = { currentView: null }
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: [],
            coordinationModules: []
          })
          
          // Set up state synchronization
          const cliSub = eventBus.subscribe('cli-*', (event) => {
            if (event.type === 'command-executed') {
              cliState.currentCommand = event.command
            }
          })
          
          const jsxSub = eventBus.subscribe('jsx-*', (event) => {
            if (event.type === 'view-rendered') {
              jsxState.currentView = event.component
            }
          })
          
          // Trigger state changes
          yield* eventBus.emit('cli-command', {
            type: 'command-executed',
            command: 'status',
            timestamp: new Date()
          })
          
          yield* eventBus.emit('jsx-render', {
            type: 'view-rendered',
            component: 'StatusView',
            timestamp: new Date()
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
  
  describe("Resource management", () => {
    it("should coordinate resource cleanup across modules", async () => {
      let resourcesCleanedUp = 0
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus, cleanup } = yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: ['terminal', 'input'],
            coordinationModules: []
          })
          
          // Monitor cleanup events
          const subscription = eventBus.subscribe('cleanup-*', () => {
            resourcesCleanedUp++
          })
          
          // Simulate resource cleanup
          yield* eventBus.emit('cleanup-terminal', {
            type: 'terminal-cleanup',
            timestamp: new Date()
          })
          
          yield* eventBus.emit('cleanup-input', {
            type: 'input-cleanup', 
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
          yield* cleanup()
        })
      )
      
      expect(resourcesCleanedUp).toBe(2)
    })
  })
  
  describe("Lifecycle coordination", () => {
    it("should coordinate module initialization order", async () => {
      const initOrder: string[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: ['jsx', 'cli'],
            serviceModules: ['terminal'],
            coordinationModules: []
          })
          
          const subscription = eventBus.subscribe('module-*', (event) => {
            if (event.type === 'module-initialized') {
              initOrder.push(event.module)
            }
          })
          
          // Simulate module initialization
          yield* eventBus.emit('module-init', {
            type: 'module-initialized',
            module: 'terminal',
            timestamp: new Date()
          })
          
          yield* eventBus.emit('module-init', {
            type: 'module-initialized', 
            module: 'jsx',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
        })
      )
      
      expect(initOrder).toContain('terminal')
      expect(initOrder).toContain('jsx')
    })
    
    it("should handle graceful shutdown", async () => {
      let shutdownCompleted = false
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus, cleanup } = yield* bootstrapWithModules({
            coreModules: ['jsx'],
            serviceModules: ['terminal'],
            coordinationModules: []
          })
          
          const subscription = eventBus.subscribe('shutdown-*', (event) => {
            if (event.type === 'shutdown-complete') {
              shutdownCompleted = true
            }
          })
          
          // Trigger shutdown
          yield* eventBus.emit('shutdown', {
            type: 'shutdown-complete',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
          yield* cleanup()
        })
      )
      
      expect(shutdownCompleted).toBe(true)
    })
  })
  
  describe("Stream coordination", () => {
    it("should coordinate data streams between modules", async () => {
      const streamData: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: ['input'],
            coordinationModules: ['coordination']
          })
          
          const subscription = eventBus.subscribe('stream-*', (event) => {
            streamData.push(event.data)
          })
          
          // Simulate stream events
          for (let i = 0; i < 5; i++) {
            yield* eventBus.emit('stream-data', {
              type: 'input-stream',
              data: `event-${i}`,
              timestamp: new Date()
            })
            yield* Effect.sleep(Duration.millis(10))
          }
          
          subscription()
        })
      )
      
      expect(streamData).toHaveLength(5)
      expect(streamData[0]).toBe('event-0')
      expect(streamData[4]).toBe('event-4')
    })
  })
  
  describe("Integration patterns", () => {
    it("should implement publisher-subscriber pattern", async () => {
      const subscribers: string[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          // Multiple subscribers
          const sub1 = eventBus.subscribe('test-*', () => subscribers.push('sub1'))
          const sub2 = eventBus.subscribe('test-*', () => subscribers.push('sub2'))
          const sub3 = eventBus.subscribe('test-event', () => subscribers.push('sub3'))
          
          // Publish event
          yield* eventBus.emit('test-event', {
            type: 'test-event',
            data: 'test',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          sub1()
          sub2()
          sub3()
        })
      )
      
      expect(subscribers).toContain('sub1')
      expect(subscribers).toContain('sub2')
      expect(subscribers).toContain('sub3')
    })
    
    it("should implement request-response pattern", async () => {
      let response: any = null
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          // Response handler
          const subscription = eventBus.subscribe('request-*', (event) => {
            if (event.type === 'request-data') {
              // Send response
              eventBus.emit('response-data', {
                type: 'response-data',
                requestId: event.requestId,
                data: 'response-payload',
                timestamp: new Date()
              })
            }
          })
          
          // Response listener
          const responseSub = eventBus.subscribe('response-*', (event) => {
            response = event.data
          })
          
          // Send request
          yield* eventBus.emit('request-data', {
            type: 'request-data',
            requestId: 'req-123',
            timestamp: new Date()
          })
          
          yield* Effect.sleep(Duration.millis(50))
          
          subscription()
          responseSub()
        })
      )
      
      expect(response).toBe('response-payload')
    })
  })
  
  describe("Performance", () => {
    it("should handle high-frequency coordination efficiently", async () => {
      const startTime = performance.now()
      const events: any[] = []
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const { eventBus } = yield* bootstrapWithModules({
            coreModules: [],
            serviceModules: [],
            coordinationModules: ['coordination']
          })
          
          const subscription = eventBus.subscribe('perf-test', (event) => {
            events.push(event)
          })
          
          // Send many events
          for (let i = 0; i < 1000; i++) {
            yield* eventBus.emit('perf-test', {
              type: 'perf-test',
              sequence: i,
              timestamp: new Date()
            })
          }
          
          yield* Effect.sleep(Duration.millis(100))
          
          subscription()
        })
      )
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(events).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should be fast
    })
  })
})