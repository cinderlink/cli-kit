import { test, expect, afterEach } from "bun:test"
import { Effect } from "effect"
import { getGlobalEventBus, resetGlobalEventBus } from "../core/event-bus"
import { resetGlobalRegistry } from "../core/module-registry"
import { bootstrapWithModules } from "../core/bootstrap"
import { ComponentSystemModule } from "./module"
import { ComponentConfig } from "./lifecycle/lifecycle-manager"

// Clean up after each test
afterEach(async () => {
  await Effect.runPromise(resetGlobalRegistry())
  await Effect.runPromise(resetGlobalEventBus())
})

test("component system module initializes with all subsystems", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem
  expect(componentSystem).toBeDefined()
  expect(componentSystem?.getState()).toBe('ready')
})

test("create and manage component lifecycle", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Track lifecycle events
  const lifecycleEvents: any[] = []
  await Effect.runPromise(
    eventBus.subscribe('component-lifecycle', (event) =>
      Effect.sync(() => lifecycleEvents.push(event))
    )
  )
  
  // Create a component
  const handle = await Effect.runPromise(
    componentSystem.createComponent('test-component', {
      type: 'div',
      props: { id: 'test', className: 'test-class' }
    } as any)
  )
  
  expect(handle.id).toBe('test-component')
  
  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have mounted event
  const mountEvent = lifecycleEvents.find(e => e.type === 'component-mounted')
  expect(mountEvent).toBeDefined()
  expect(mountEvent.payload.componentId).toBe('test-component')
  
  // Update component
  await Effect.runPromise(
    handle.update({ id: 'test', className: 'updated-class' })
  )
  
  // Wait for update
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have update event
  const updateEvent = lifecycleEvents.find(e => e.type === 'component-updated')
  expect(updateEvent).toBeDefined()
  expect(updateEvent.payload.componentId).toBe('test-component')
  
  // Get metrics
  const metrics = await Effect.runPromise(handle.getMetrics())
  expect(metrics).toBeDefined()
  expect(metrics?.updateCount).toBe(1)
  
  // Destroy component
  await Effect.runPromise(handle.destroy())
  
  // Wait for unmount
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have unmount event
  const unmountEvent = lifecycleEvents.find(e => e.type === 'component-unmounted')
  expect(unmountEvent).toBeDefined()
  expect(unmountEvent.payload.componentId).toBe('test-component')
})

test("component coordination patterns work correctly", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Create two components
  const master = await Effect.runPromise(
    componentSystem.createComponent('master-component', {
      type: 'div',
      props: { role: 'master' }
    } as any)
  )
  
  const detail = await Effect.runPromise(
    componentSystem.createComponent('detail-component', {
      type: 'div',
      props: { role: 'detail' }
    } as any)
  )
  
  // Track coordination events
  let coordinationStarted = false
  await Effect.runPromise(
    eventBus.subscribe('component-coordination', (event) =>
      Effect.sync(() => {
        if (event.type === 'coordination-started') {
          coordinationStarted = true
        }
      })
    )
  )
  
  // Set up master-detail coordination
  await Effect.runPromise(
    componentSystem.startComponentCoordination(
      'test-coordination',
      'master-detail',
      ['master-component', 'detail-component'],
      {
        masterId: 'master-component',
        detailId: 'detail-component'
      }
    )
  )
  
  // Wait for event to be processed
  await new Promise(resolve => setTimeout(resolve, 50))
  
  expect(coordinationStarted).toBe(true)
  
  // Stop coordination
  await Effect.runPromise(
    componentSystem.stopComponentCoordination('test-coordination')
  )
})

test("performance monitoring tracks render metrics", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Create and render multiple components
  for (let i = 0; i < 5; i++) {
    const handle = await Effect.runPromise(
      componentSystem.createComponent(`perf-component-${i}`, {
        type: 'div',
        props: { id: `perf-${i}` }
      } as any)
    )
    
    // Force render
    await Effect.runPromise(handle.forceRender())
  }
  
  // Get performance metrics
  const metrics = await Effect.runPromise(
    componentSystem.getSystemPerformanceMetrics()
  )
  
  expect(metrics.renderingStats.totalRenders).toBeGreaterThanOrEqual(5)
  expect(metrics.performance.totalComponents).toBeGreaterThanOrEqual(5)
})

test("render caching improves performance", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Create component
  const handle = await Effect.runPromise(
    componentSystem.createComponent('cache-test', {
      type: 'div',
      props: { content: 'test' }
    } as any)
  )
  
  // First render (cache miss)
  await Effect.runPromise(handle.forceRender())
  
  // Second render with same props (should hit cache)
  await Effect.runPromise(handle.forceRender())
  
  // Get metrics
  const metrics = await Effect.runPromise(
    componentSystem.getSystemPerformanceMetrics()
  )
  
  expect(metrics.renderingStats.cacheHits).toBeGreaterThan(0)
})

test("component system integrates with event bus", async () => {
  const eventBus = getGlobalEventBus()
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // The system is already initialized from bootstrap
  // Let's verify by checking the module state
  expect(componentSystem?.getState()).toBe('ready')
  
  // Create component and track render events
  const renderEvents: any[] = []
  await Effect.runPromise(
    eventBus.subscribe('render-events', (event) =>
      Effect.sync(() => renderEvents.push(event))
    )
  )
  
  const handle = await Effect.runPromise(
    componentSystem.createComponent('event-test', {
      type: 'div',
      props: {}
    } as any)
  )
  
  await Effect.runPromise(handle.forceRender())
  
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Should have render events
  expect(renderEvents.length).toBeGreaterThan(0)
  const completeEvent = renderEvents.find(e => e.type === 'render-complete')
  expect(completeEvent).toBeDefined()
})

test("component configuration affects behavior", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Create component with health monitoring enabled
  const config: ComponentConfig = {
    enableHealthMonitoring: true,
    updateBatchingEnabled: true,
    errorRecoveryEnabled: true
  }
  
  const handle = await Effect.runPromise(
    componentSystem.createComponent('configured-component', {
      type: 'div',
      props: {}
    } as any, config)
  )
  
  // Component should be created with config
  const metrics = await Effect.runPromise(handle.getMetrics())
  expect(metrics).toBeDefined()
  expect(metrics?.componentId).toBe('configured-component')
})

test("system handles multiple component updates efficiently", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableComponentSystem: true
  }))
  
  const componentSystem = result.modules.componentSystem!
  
  // Create multiple components
  const handles = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => 
      Effect.runPromise(
        componentSystem.createComponent(`batch-${i}`, {
          type: 'div',
          props: { index: i }
        } as any)
      )
    )
  )
  
  // Update all components rapidly (this should trigger batching)
  await Promise.all(
    handles.map((handle, i) => 
      Effect.runPromise(handle.update({ index: i, updated: true }))
    )
  )
  
  // Wait for batch processing (16ms frame time + buffer)
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Get performance metrics
  const metrics = await Effect.runPromise(
    componentSystem.getSystemPerformanceMetrics()
  )
  
  // Should have batched renders
  expect(metrics.renderingStats.batchedRenders).toBeGreaterThan(0)
  expect(metrics.performance.totalUpdates).toBeGreaterThanOrEqual(10)
})