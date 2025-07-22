import { test, expect, afterEach } from "bun:test"
import { Effect, Duration, Fiber } from "effect"
import { getGlobalEventBus, resetGlobalEventBus } from "@core/model/events/eventBus"
import { resetGlobalRegistry } from "@core/runtime/module/registry"
import { bootstrapWithModules } from "@core/runtime/bootstrap"
import { CoordinationModule } from "./module"
import type { CLICommandEvent } from "../../cli/events"
import type { ProcessEvent } from "../../process-manager/events"
import type { ConfigEvent } from "../../config/events"

// Clean up after each test
afterEach(async () => {
  await Effect.runPromise(resetGlobalRegistry())
  await Effect.runPromise(resetGlobalEventBus())
})

test("coordination module initializes with all subsystems", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination
  expect(coordination).toBeDefined()
  expect(coordination?.getState()).toBe('ready')
})

test("workflow orchestration executes steps in order", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  const config = result.modules.config!
  
  // Load a test config first
  await Effect.runPromise(
    config.loadConfig('test.json', { version: '1.0.0', test: 'initial' })
  )
  
  // Track UI update events
  let uiUpdateReceived = false
  await Effect.runPromise(
    eventBus.subscribe('ui-update', () =>
      Effect.sync(() => { uiUpdateReceived = true })
    )
  )
  
  const workflowResult = await Effect.runPromise(
    coordination.startCoordinatedWorkflow('test-workflow', {
      name: 'Test Workflow',
      description: 'Test workflow execution',
      requiredModules: ['cli', 'config'],
      steps: [
        {
          id: 'step1',
          type: 'config-update',
          description: 'Update config',
          config: { 
            path: 'test.json',
            section: 'test',
            value: 'test-value'
          }
        },
        {
          id: 'step2',
          type: 'ui-update',
          description: 'Update UI',
          config: {
            type: 'test-update',
            payload: { message: 'Test' }
          },
          dependencies: ['step1']
        }
      ]
    })
  )
  
  expect(workflowResult.status).toBe('completed')
  expect(workflowResult.steps).toHaveLength(2)
  expect(workflowResult.steps[0].status).toBe('completed')
  expect(workflowResult.steps[1].status).toBe('completed')
  expect(uiUpdateReceived).toBe(true)
})

test("performance monitoring tracks event throughput", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  
  // Generate some events
  for (let i = 0; i < 10; i++) {
    await Effect.runPromise(
      eventBus.publish<CLICommandEvent>('cli-command', {
        type: 'cli-command-executed',
        source: 'test',
        timestamp: new Date(),
        id: `test-${i}`,
        path: ['test', 'command'],
        executionTime: 100 + i * 10
      })
    )
  }
  
  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const metrics = await Effect.runPromise(coordination.getPerformanceMetrics())
  
  expect(metrics.eventThroughput.length).toBeGreaterThan(0)
  const cliEvents = metrics.eventThroughput.find(m => m.channel.includes('cli-command'))
  expect(cliEvents?.count).toBe(10)
})

test("error recovery detects and handles errors", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  
  // Register custom error pattern
  await Effect.runPromise(
    coordination.registerErrorPattern({
      id: 'test-error',
      description: 'Test error pattern',
      eventTypes: ['test-error-event'],
      errorConditions: [{
        field: 'type',
        operator: 'equals',
        value: 'test-error-event'
      }],
      recoveryStrategyId: 'cli-fallback'
    })
  )
  
  let errorDetected = false
  
  // Subscribe to error detection events
  await Effect.runPromise(
    eventBus.subscribe('error-detection', (event) => 
      Effect.sync(() => { 
        if (event.type === 'error-detected') {
          errorDetected = true
        }
      })
    )
  )
  
  // Wait a bit for subscriptions to be set up
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Emit error event on a channel that's being monitored
  await Effect.runPromise(
    eventBus.publish('cli-command', {
      type: 'test-error-event',
      source: 'test',
      timestamp: new Date(),
      id: 'test-error-1'
    })
  )
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 200))
  
  expect(errorDetected).toBe(true)
  
  const errorStats = await Effect.runPromise(coordination.getErrorStatistics())
  expect(errorStats.totalErrors).toBe(1)
})

test("stream optimization configures properly", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  
  // Configure stream optimization
  await Effect.runPromise(
    coordination.configureCoordination({
      streamOptimization: {
        processOutput: true,
        cliCommands: true,
        uiUpdates: true
      }
    })
  )
  
  // Get optimization stats to verify configuration
  const coordinationWithOptimizer = coordination as { streamOptimizer: { getOptimizationStats: () => Effect.Effect<{ bufferSizes: Map<string, number>; rateLimits: Map<string, number> }, never> } }
  const optimizer = coordinationWithOptimizer.streamOptimizer
  const stats = await Effect.runPromise(optimizer.getOptimizationStats())
  
  expect(stats.bufferSizes.get('process-output')).toBe(100)
  expect(stats.rateLimits.get('cli-command')).toBe(20)
  expect(stats.rateLimits.get('ui-update')).toBe(60)
})

test("integration patterns enable process monitoring", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true,
    enableProcessManager: true
  }))
  
  const coordination = result.modules.coordination!
  
  // Configure to enable process monitoring
  await Effect.runPromise(
    coordination.configureCoordination({
      enableProcessMonitoring: true
    })
  )
  
  let dashboardUpdateReceived = false
  
  // Subscribe to dashboard updates
  await Effect.runPromise(
    eventBus.subscribe('dashboard-update', () =>
      Effect.sync(() => { dashboardUpdateReceived = true })
    )
  )
  
  // Emit process event
  await Effect.runPromise(
    eventBus.publish<ProcessEvent>('process-lifecycle', {
      type: 'process-started',
      source: 'test',
      timestamp: new Date(),
      id: 'test-process-1',
      processId: 'proc-123',
      processName: 'test-process',
      pid: 12345,
      config: { command: 'test' }
    })
  )
  
  // Wait for choreography
  await new Promise(resolve => setTimeout(resolve, 100))
  
  expect(dashboardUpdateReceived).toBe(true)
})

test("system health calculates overall status", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  
  const health = await Effect.runPromise(coordination.getSystemHealth())
  
  expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
  expect(health.performance).toBeDefined()
  expect(health.errors).toBeDefined()
  expect(health.throughput).toBeDefined()
  expect(health.activePatterns).toBeInstanceOf(Array)
})


test("coordination module shuts down cleanly", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableCoordination: true
  }))
  
  const coordination = result.modules.coordination!
  
  // Enable some patterns
  await Effect.runPromise(
    coordination.configureCoordination({
      enableProcessMonitoring: true,
      enableAuditTrail: true
    })
  )
  
  // Verify patterns are active
  const healthBefore = await Effect.runPromise(coordination.getSystemHealth())
  expect(healthBefore.activePatterns.length).toBeGreaterThan(0)
  
  // Shutdown
  await Effect.runPromise(coordination.shutdown())
  
  // Verify patterns are cleaned up
  const healthAfter = await Effect.runPromise(coordination.getSystemHealth())
  expect(healthAfter.activePatterns).toHaveLength(0)
})