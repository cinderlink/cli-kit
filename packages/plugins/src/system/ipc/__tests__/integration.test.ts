/**
 * IPC Integration Tests
 * 
 * Test the integration of IPC system with the process manager
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { ProcessManagerPlugin } from "../../process-manager"
import { ProcessIPCManager } from "../manager"
import { ProcessInfo } from "../../types"

test("IPC integration with process manager", async () => {
  // Create process manager with IPC enabled
  const processManager = new ProcessManagerPlugin({
    enableIPC: true,
    ipcConfig: {
      broker: {
        maxChannels: 10,
        maxClients: 10,
        messageRetention: 10000,
        heartbeatInterval: 1000,
        cleanupInterval: 5000,
      },
      client: {
        heartbeatInterval: 1000,
        reconnectAttempts: 2,
        reconnectDelay: 1000,
        requestTimeout: 5000,
      }
    }
  })

  // Initialize plugin
  await Effect.runPromise(processManager.init)

  // Get API with IPC methods
  const api = processManager.getAPI()
  
  // Verify IPC methods are available
  expect(api.sendIPCMessage).toBeDefined()
  expect(api.requestIPCResponse).toBeDefined()
  expect(api.broadcastIPCMessage).toBeDefined()
  expect(api.registerProcessForIPC).toBeDefined()
  expect(api.unregisterProcessFromIPC).toBeDefined()
  expect(api.getIPCConnections).toBeDefined()

  // Test process registration
  const mockProcess: ProcessInfo = {
    pid: 1234,
    ppid: 1,
    name: "test-process",
    command: "test-command",
    args: ["arg1", "arg2"],
    user: "testuser",
    cpu: 5.0,
    memory: 1024,
    vsz: 2048,
    rss: 1024,
    startTime: new Date(),
    status: "running"
  }

  const processId = await api.registerProcessForIPC!(mockProcess)
  expect(processId).toBeDefined()
  expect(processId).toMatch(/^process-1234$/)

  // Test IPC connections
  const connections = api.getIPCConnections!()
  expect(connections.length).toBe(1)
  expect(connections[0].processId).toBe(processId)
  expect(connections[0].connected).toBe(true)

  // Test broadcast (should not throw)
  await api.broadcastIPCMessage!({ type: "test", message: "hello" })

  // Clean up
  await api.unregisterProcessFromIPC!(processId)
  await Effect.runPromise(processManager.destroy)
})

test("IPC manager standalone functionality", async () => {
  const ipcManager = new ProcessIPCManager({
    broker: {
      maxChannels: 5,
      maxClients: 5,
      messageRetention: 5000,
      heartbeatInterval: 1000,
    }
  })

  // Start IPC manager
  await ipcManager.start()
  expect(ipcManager.isRunning).toBe(true)

  // Test process registration
  const mockProcess: ProcessInfo = {
    pid: 5678,
    ppid: 1,
    name: "standalone-process",
    command: "standalone-command",
    args: [],
    user: "testuser",
    cpu: 2.5,
    memory: 512,
    vsz: 1024,
    rss: 512,
    startTime: new Date(),
    status: "running"
  }

  const processId = await ipcManager.registerProcess(mockProcess)
  expect(processId).toBeDefined()
  expect(processId).toMatch(/^process-5678$/)

  // Test metrics
  const metrics = ipcManager.getIPCMetrics()
  expect(metrics.connectedProcesses).toBe(1)
  expect(metrics.processRegistrations).toBe(1)
  expect(metrics.totalChannels).toBeGreaterThan(0)

  // Test connections
  const connections = ipcManager.getProcessConnections()
  expect(connections.length).toBe(1)
  expect(connections[0].processId).toBe(processId)

  // Clean up
  await ipcManager.unregisterProcess(processId)
  await ipcManager.stop()
  expect(ipcManager.isRunning).toBe(false)
})

test("IPC disabled by default", async () => {
  // Create process manager without IPC
  const processManager = new ProcessManagerPlugin({
    enableIPC: false
  })

  await Effect.runPromise(processManager.init)
  
  const api = processManager.getAPI()
  
  // Verify IPC methods are not available
  expect(api.sendIPCMessage).toBeUndefined()
  expect(api.requestIPCResponse).toBeUndefined()
  expect(api.broadcastIPCMessage).toBeUndefined()
  expect(api.registerProcessForIPC).toBeUndefined()
  expect(api.unregisterProcessFromIPC).toBeUndefined()
  expect(api.getIPCConnections).toBeUndefined()

  await Effect.runPromise(processManager.destroy)
})

test("IPC error handling", async () => {
  const processManager = new ProcessManagerPlugin({
    enableIPC: true
  })

  await Effect.runPromise(processManager.init)
  const api = processManager.getAPI()

  // Test sending message to non-existent process
  try {
    await api.sendIPCMessage!("non-existent-process", { test: "data" })
    expect(false).toBe(true) // Should not reach here
  } catch (error) {
    expect(error).toBeDefined()
  }

  // Test requesting from non-existent process
  try {
    await api.requestIPCResponse!("non-existent-process", { test: "data" })
    expect(false).toBe(true) // Should not reach here
  } catch (error) {
    expect(error).toBeDefined()
  }

  await Effect.runPromise(processManager.destroy)
})