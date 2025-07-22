import { test, expect, afterEach } from "bun:test"
import { Effect } from "effect"
import { getGlobalEventBus, resetGlobalEventBus } from "@core/model/events/eventBus"
import { resetGlobalRegistry } from "@core/runtime/module/registry"
import { bootstrapWithModules, type BootstrapResult } from "@core/runtime/bootstrap"

// Clean up after each test
afterEach(async () => {
  await Effect.runPromise(resetGlobalRegistry())
  await Effect.runPromise(resetGlobalEventBus())
})

test("core system initializes with all subsystems", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({})) as BootstrapResult
  
  expect(result).toBeDefined()
  expect(result.modules.jsx).toBeDefined()
  expect(result.modules.cli).toBeDefined()
})

test("event bus works correctly", async () => {
  const eventBus = getGlobalEventBus()
  
  let eventReceived = false
  await Effect.runPromise(
    eventBus.subscribe('test-event', () =>
      Effect.sync(() => {
        eventReceived = true
      })
    )
  )
  
  await Effect.runPromise(
    eventBus.emit('test-event', { test: true })
  )
  
  // Wait for event to be processed
  await new Promise(resolve => setTimeout(resolve, 10))
  
  expect(eventReceived).toBe(true)
})

test("core modules work together", async () => {
  const result = await Effect.runPromise(bootstrapWithModules({
    enableServices: true,
    enableConfig: true
  })) as BootstrapResult
  
  expect(result.modules.jsx).toBeDefined()
  expect(result.modules.cli).toBeDefined()
  expect(result.modules.services).toBeDefined()
  expect(result.modules.config).toBeDefined()
})