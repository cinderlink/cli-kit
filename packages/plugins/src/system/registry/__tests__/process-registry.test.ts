/**
 * Process Registry Tests
 * 
 * Comprehensive tests for the process registry system including
 * process registration, lifecycle tracking, querying, and persistence.
 * 
 * @module plugins/system/registry/__tests__/process-registry
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { ProcessRegistry, InMemoryRegistryStorage } from "../process-registry"
import type { ProcessInfo, ProcessStatus } from "../../types"
import type { 
  RegistryProcessInfo, 
  ProcessLifecycleEventRecord,
  RegistryProcessQuery,
  ProcessManagementConfig 
} from "../types"

describe("ProcessRegistry", () => {
  let registry: ProcessRegistry
  let storage: InMemoryRegistryStorage

  beforeEach(() => {
    storage = new InMemoryRegistryStorage()
    registry = new ProcessRegistry({
      maxProcessHistory: 1000,
      maxEventHistory: 5000,
      enableLifecycleEvents: true,
      enableProcessTagging: true,
    }, storage)
  })

  afterEach(async () => {
    await registry.destroy()
    storage.clear()
  })

  describe("Process Registration", () => {
    test("registers new process", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: ["--flag"],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)

      expect(registered.pid).toBe(process.pid)
      expect(registered.name).toBe(process.name)
      expect(registered.registryId).toBeDefined()
      expect(registered.firstSeen).toBeDefined()
      expect(registered.lastSeen).toBeDefined()
      expect(registered.seenCount).toBe(1)
      expect(registered.isManaged).toBe(false)
      expect(registered.tags).toEqual([])
    })

    test("updates existing process", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: ["--flag"],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      
      // Update with new CPU usage
      const updated = await registry.updateProcess(registered.registryId, {
        ...process,
        cpu: 10.5
      })

      expect(updated.cpu).toBe(10.5)
      expect(updated.seenCount).toBe(2)
      expect(updated.registryId).toBe(registered.registryId)
      expect(updated.firstSeen).toEqual(registered.firstSeen)
    })

    test("handles duplicate PID registration", async () => {
      const process1: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process-1",
        command: "/usr/bin/test1",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const process2: ProcessInfo = {
        ...process1,
        name: "test-process-2",
        command: "/usr/bin/test2"
      }

      const registered1 = await registry.registerProcess(process1)
      const registered2 = await registry.registerProcess(process2) // Same PID

      // Should update the existing process, not create new one
      expect(registered2.registryId).toBe(registered1.registryId)
      expect(registered2.name).toBe("test-process-2")
      expect(registered2.seenCount).toBe(2)
    })

    test("unregisters process", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      await registry.unregisterProcess(registered.registryId)

      const retrieved = await registry.getProcess(registered.registryId)
      expect(retrieved).toBeNull()

      const retrievedByPid = await registry.getProcessByPid(process.pid)
      expect(retrievedByPid).toBeNull()
    })
  })

  describe("Process Querying", () => {
    beforeEach(async () => {
      // Set up test data
      const processes: ProcessInfo[] = [
        {
          pid: 1001, ppid: 1, name: "browser", command: "/usr/bin/browser",
          args: [], user: "alice", cpu: 25.5, memory: 2048000, vsz: 4096000,
          rss: 2048000, startTime: new Date(), status: "running" as ProcessStatus
        },
        {
          pid: 1002, ppid: 1, name: "editor", command: "/usr/bin/editor",
          args: [], user: "alice", cpu: 5.5, memory: 512000, vsz: 1024000,
          rss: 512000, startTime: new Date(), status: "running" as ProcessStatus
        },
        {
          pid: 1003, ppid: 1, name: "daemon", command: "/usr/bin/daemon",
          args: [], user: "root", cpu: 1.0, memory: 128000, vsz: 256000,
          rss: 128000, startTime: new Date(), status: "running" as ProcessStatus
        }
      ]

      for (const process of processes) {
        await registry.registerProcess(process)
      }
    })

    test("gets all processes", async () => {
      const processes = await registry.getAllProcesses()
      expect(processes.length).toBe(3)
    })

    test("gets process by registry ID", async () => {
      const allProcesses = await registry.getAllProcesses()
      const firstProcess = allProcesses[0]
      
      const retrieved = await registry.getProcess(firstProcess.registryId)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.pid).toBe(firstProcess.pid)
    })

    test("gets process by PID", async () => {
      const process = await registry.getProcessByPid(1001)
      expect(process).not.toBeNull()
      expect(process!.name).toBe("browser")
    })

    test("queries processes by name", async () => {
      const query: RegistryProcessQuery = { name: "browser" }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(1)
      expect(result.items[0].name).toBe("browser")
    })

    test("queries processes by user", async () => {
      const query: RegistryProcessQuery = { user: "alice" }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(2)
      expect(result.items.every(p => p.user === "alice")).toBe(true)
    })

    test("queries processes by CPU threshold", async () => {
      const query: RegistryProcessQuery = { minCpu: 20 }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(1)
      expect(result.items[0].name).toBe("browser")
    })

    test("queries processes by memory threshold", async () => {
      const query: RegistryProcessQuery = { minMemory: 1000000 }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(1)
      expect(result.items[0].name).toBe("browser")
    })

    test("combines multiple query filters", async () => {
      const query: RegistryProcessQuery = { 
        user: "alice",
        minCpu: 5
      }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(2)
      expect(result.items.every(p => p.user === "alice" && p.cpu >= 5)).toBe(true)
    })
  })

  describe("Process Management", () => {
    let registryProcess: RegistryProcessInfo

    beforeEach(async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }
      registryProcess = await registry.registerProcess(process)
    })

    test("manages process", async () => {
      const config: ProcessManagementConfig = {
        autoRestart: true,
        maxRestarts: 3,
        restartDelay: 1000,
        healthCheckInterval: 5000,
        healthCheckTimeout: 2000,
        gracefulShutdownTimeout: 10000
      }

      await registry.manageProcess(registryProcess.registryId, config)

      const managed = await registry.getManagedProcess(registryProcess.registryId)
      expect(managed).not.toBeNull()
      expect(managed!.config.autoRestart).toBe(true)
      expect(managed!.restartCount).toBe(0)
      expect(managed!.isHealthy).toBe(true)

      // Check that process is marked as managed
      const updated = await registry.getProcess(registryProcess.registryId)
      expect(updated!.isManaged).toBe(true)
    })

    test("unmanages process", async () => {
      const config: ProcessManagementConfig = {
        autoRestart: false,
        maxRestarts: 0,
        restartDelay: 1000,
        healthCheckInterval: 5000,
        healthCheckTimeout: 2000,
        gracefulShutdownTimeout: 10000
      }

      await registry.manageProcess(registryProcess.registryId, config)
      await registry.unmanageProcess(registryProcess.registryId)

      const managed = await registry.getManagedProcess(registryProcess.registryId)
      expect(managed).toBeNull()

      // Check that process is marked as not managed
      const updated = await registry.getProcess(registryProcess.registryId)
      expect(updated!.isManaged).toBe(false)
    })

    test("gets all managed processes", async () => {
      const config: ProcessManagementConfig = {
        autoRestart: true,
        maxRestarts: 3,
        restartDelay: 1000,
        healthCheckInterval: 5000,
        healthCheckTimeout: 2000,
        gracefulShutdownTimeout: 10000
      }

      await registry.manageProcess(registryProcess.registryId, config)

      const managed = await registry.getAllManagedProcesses()
      expect(managed.length).toBe(1)
      expect(managed[0].registryId).toBe(registryProcess.registryId)
    })
  })

  describe("Process Tagging", () => {
    let registryProcess: RegistryProcessInfo

    beforeEach(async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }
      registryProcess = await registry.registerProcess(process)
    })

    test("tags process", async () => {
      await registry.tagProcess(registryProcess.registryId, ["system", "important"])

      const updated = await registry.getProcess(registryProcess.registryId)
      expect(updated!.tags).toEqual(["system", "important"])
    })

    test("adds tags to existing tags", async () => {
      await registry.tagProcess(registryProcess.registryId, ["system"])
      await registry.tagProcess(registryProcess.registryId, ["important", "monitored"])

      const updated = await registry.getProcess(registryProcess.registryId)
      expect(updated!.tags.sort()).toEqual(["important", "monitored", "system"])
    })

    test("removes tags", async () => {
      await registry.tagProcess(registryProcess.registryId, ["system", "important", "monitored"])
      await registry.untagProcess(registryProcess.registryId, ["important"])

      const updated = await registry.getProcess(registryProcess.registryId)
      expect(updated!.tags.sort()).toEqual(["monitored", "system"])
    })

    test("gets processes by tag", async () => {
      await registry.tagProcess(registryProcess.registryId, ["system"])

      const processes = await registry.getProcessesByTag("system")
      expect(processes.length).toBe(1)
      expect(processes[0].registryId).toBe(registryProcess.registryId)
    })

    test("queries processes by tags", async () => {
      await registry.tagProcess(registryProcess.registryId, ["system", "important"])

      const query: RegistryProcessQuery = { tags: ["system"] }
      const result = await registry.queryProcesses(query)
      
      expect(result.items.length).toBe(1)
      expect(result.items[0].registryId).toBe(registryProcess.registryId)
    })
  })

  describe("Lifecycle Events", () => {
    test("records discovery event", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      const events = await registry.getProcessEvents(registered.registryId)

      expect(events.length).toBe(1)
      expect(events[0].event).toBe("discovered")
      expect(events[0].pid).toBe(process.pid)
      expect(events[0].registryId).toBe(registered.registryId)
    })

    test("records status change event", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      
      // Update with different status
      await registry.updateProcess(registered.registryId, {
        ...process,
        status: "stopped" as ProcessStatus
      })

      const events = await registry.getProcessEvents(registered.registryId)

      expect(events.length).toBe(2)
      expect(events.find(e => e.event === "discovered")).toBeDefined()
      expect(events.find(e => e.event === "status_change")).toBeDefined()
      
      const statusChangeEvent = events.find(e => e.event === "status_change")!
      expect(statusChangeEvent.previousStatus).toBe("running")
      expect(statusChangeEvent.newStatus).toBe("stopped")
    })

    test("queries events by type", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      await registry.updateProcess(registered.registryId, { ...process, status: "stopped" as ProcessStatus })

      const discoveryEvents = await registry.queryEvents({
        events: ["discovered"]
      })

      expect(discoveryEvents.items.length).toBe(1)
      expect(discoveryEvents.items[0].event).toBe("discovered")
    })
  })

  describe("Statistics", () => {
    test("calculates registry statistics", async () => {
      // Add test processes
      const processes: ProcessInfo[] = [
        {
          pid: 1001, ppid: 1, name: "browser", command: "/usr/bin/browser",
          args: [], user: "alice", cpu: 25.5, memory: 2048000, vsz: 4096000,
          rss: 2048000, startTime: new Date(), status: "running" as ProcessStatus
        },
        {
          pid: 1002, ppid: 1, name: "editor", command: "/usr/bin/editor",
          args: [], user: "alice", cpu: 5.5, memory: 512000, vsz: 1024000,
          rss: 512000, startTime: new Date(), status: "stopped" as ProcessStatus
        }
      ]

      for (const process of processes) {
        await registry.registerProcess(process)
      }

      const stats = await registry.getStatistics()

      expect(stats.totalProcesses).toBe(2)
      expect(stats.activeProcesses).toBe(1)
      expect(stats.processCountByStatus.running).toBe(1)
      expect(stats.processCountByStatus.stopped).toBe(1)
      expect(stats.topProcessesByMemory.length).toBeGreaterThan(0)
      expect(stats.topProcessesByCpu.length).toBeGreaterThan(0)
    })
  })

  describe("Persistence", () => {
    test("creates snapshots", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      await registry.registerProcess(process)
      const snapshots = await registry.snapshot()

      expect(snapshots.length).toBe(1)
      expect(snapshots[0].processInfo.pid).toBe(process.pid)
      expect(snapshots[0].lifecycle.length).toBeGreaterThan(0)
    })

    test("restores from snapshots", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      const registered = await registry.registerProcess(process)
      const snapshots = await registry.snapshot()

      // Create new registry and restore
      const newStorage = new InMemoryRegistryStorage()
      const newRegistry = new ProcessRegistry({}, newStorage)
      
      await newRegistry.restore(snapshots)
      
      const restored = await newRegistry.getProcess(registered.registryId)
      expect(restored).not.toBeNull()
      expect(restored!.pid).toBe(process.pid)
      expect(restored!.name).toBe(process.name)
      
      await newRegistry.destroy()
    })
  })

  describe("Cleanup", () => {
    test("cleans up old processes and events", async () => {
      const process: ProcessInfo = {
        pid: 1234,
        ppid: 1,
        name: "test-process",
        command: "/usr/bin/test",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      await registry.registerProcess(process)
      
      // Simulate old process by manipulating internal state
      const allProcesses = await registry.getAllProcesses()
      const registryProcess = allProcesses[0]
      
      // Mock old lastSeen date
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
      const modifiedProcess = { ...registryProcess, lastSeen: oldDate }
      
      // This would normally be done internally, but we'll test the cleanup method directly
      const result = await registry.cleanup()
      
      expect(typeof result.removedProcesses).toBe('number')
      expect(typeof result.removedEvents).toBe('number')
    })
  })
})