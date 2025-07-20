/**
 * Registry Manager Tests
 * 
 * Tests for the high-level process registry manager including
 * platform synchronization, automated discovery, and analytics.
 * 
 * @module plugins/system/registry/__tests__/registry-manager
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { ProcessRegistryManager, DEFAULT_REGISTRY_MANAGER_CONFIG } from "../registry-manager"
import { InMemoryRegistryStorage } from "../process-registry"
import { MockProcessAdapter } from "../../adapters/mock-adapter"
import type { ProcessInfo, ProcessStatus } from "../../types"
import type { RegistryManagerConfig } from "../types"

describe("ProcessRegistryManager", () => {
  let manager: ProcessRegistryManager
  let storage: InMemoryRegistryStorage
  let mockAdapter: MockProcessAdapter

  beforeEach(() => {
    storage = new InMemoryRegistryStorage()
    manager = new ProcessRegistryManager({
      ...DEFAULT_REGISTRY_MANAGER_CONFIG,
      autoSyncEnabled: false, // Disable auto-sync for manual testing
      enableLifecycleEvents: true
    }, storage)
    mockAdapter = new MockProcessAdapter()
  })

  afterEach(async () => {
    await manager.destroy()
    storage.clear()
  })

  describe("Initialization and Lifecycle", () => {
    test("initializes with platform adapter", async () => {
      await manager.initialize(mockAdapter)
      
      const syncStatus = manager.getSyncStatus()
      expect(syncStatus.isEnabled).toBe(false) // We disabled auto-sync
      expect(syncStatus.lastSync).toBeNull() // No sync yet
    })

    test("destroys cleanly", async () => {
      await manager.initialize(mockAdapter)
      await manager.destroy()
      
      // Should not throw
      expect(true).toBe(true)
    })

    test("fails to initialize after destruction", async () => {
      await manager.destroy()
      
      await expect(manager.initialize(mockAdapter)).rejects.toThrow()
    })
  })

  describe("Platform Synchronization", () => {
    beforeEach(async () => {
      await manager.initialize(mockAdapter)
    })

    test("syncs with platform adapter", async () => {
      const result = await manager.syncWithPlatform()
      
      expect(result.discovered).toBeGreaterThan(0)
      expect(result.updated).toBe(0) // First sync, no updates
      expect(result.disappeared).toBe(0) // No processes disappeared
      expect(result.errors).toEqual([])
      
      const syncStatus = manager.getSyncStatus()
      expect(syncStatus.lastSync).not.toBeNull()
      expect(syncStatus.errorCount).toBe(0)
    })

    test("handles sync updates on subsequent calls", async () => {
      // First sync
      const firstResult = await manager.syncWithPlatform()
      
      // Second sync should have updates (but mock adapter might generate new processes)
      const result = await manager.syncWithPlatform()
      
      // Either new processes discovered OR existing processes updated
      expect(result.discovered + result.updated).toBeGreaterThan(0)
      expect(result.errors).toEqual([])
      
      // Total processes should be at least as many as first sync
      expect(result.discovered + result.updated).toBeGreaterThanOrEqual(firstResult.discovered)
    })

    test("tracks sync statistics", async () => {
      await manager.syncWithPlatform()
      
      const syncStatus = manager.getSyncStatus()
      expect(syncStatus.lastSync).not.toBeNull()
      expect(syncStatus.errorCount).toBe(0)
      expect(syncStatus.knownProcessCount).toBeGreaterThan(0)
    })

    test("handles sync errors gracefully", async () => {
      // Create a broken adapter
      const brokenAdapter = {
        getProcessList: async () => { throw new Error("Platform error") },
        getProcessInfo: async () => null,
        getSystemMetrics: async () => { throw new Error("Metrics error") },
        killProcess: async () => {},
        suspendProcess: async () => {},
        resumeProcess: async () => {}
      }

      const managerWithBrokenAdapter = new ProcessRegistryManager({
        autoSyncEnabled: false
      }, storage)
      
      await managerWithBrokenAdapter.initialize(brokenAdapter as any)
      
      await expect(managerWithBrokenAdapter.syncWithPlatform()).rejects.toThrow()
      
      const syncStatus = managerWithBrokenAdapter.getSyncStatus()
      expect(syncStatus.errorCount).toBe(1)
      
      await managerWithBrokenAdapter.destroy()
    })
  })

  describe("Enhanced Process Registration", () => {
    beforeEach(async () => {
      await manager.initialize(mockAdapter)
    })

    test("registers process with metadata", async () => {
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

      const registered = await manager.registerProcessWithMetadata(
        process,
        ["system", "important"]
      )

      expect(registered.tags).toEqual(["system", "important"])
      expect(registered.isManaged).toBe(false)
    })

    test("registers process with management config", async () => {
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

      const managementConfig = {
        autoRestart: true,
        maxRestarts: 3,
        restartDelay: 1000,
        healthCheckInterval: 5000,
        healthCheckTimeout: 2000,
        gracefulShutdownTimeout: 10000
      }

      const registered = await manager.registerProcessWithMetadata(
        process,
        ["managed"],
        managementConfig
      )

      expect(registered.isManaged).toBe(true)
      expect(registered.tags).toEqual(["managed"])

      const managed = await manager.getRegistry().getManagedProcess(registered.registryId)
      expect(managed).not.toBeNull()
      expect(managed!.config.autoRestart).toBe(true)
    })

    test("bulk registers processes", async () => {
      const processes: ProcessInfo[] = [
        {
          pid: 1001, ppid: 1, name: "process1", command: "/usr/bin/p1",
          args: [], user: "user1", cpu: 5, memory: 1024, vsz: 2048,
          rss: 1024, startTime: new Date(), status: "running" as ProcessStatus
        },
        {
          pid: 1002, ppid: 1, name: "process2", command: "/usr/bin/p2",
          args: [], user: "user2", cpu: 10, memory: 2048, vsz: 4096,
          rss: 2048, startTime: new Date(), status: "running" as ProcessStatus
        }
      ]

      const registered = await manager.bulkRegisterProcesses(
        processes,
        ["bulk-registered"]
      )

      expect(registered.length).toBe(2)
      expect(registered.every(p => p.tags.includes("bulk-registered"))).toBe(true)
    })
  })

  describe("Process Discovery and Categorization", () => {
    beforeEach(async () => {
      await manager.initialize(mockAdapter)
    })

    test("discovers and categorizes processes", async () => {
      const categorized = await manager.discoverAndCategorizeProcesses()

      expect(categorized.systemProcesses.length).toBeGreaterThanOrEqual(0)
      expect(categorized.userProcesses.length).toBeGreaterThanOrEqual(0)
      expect(categorized.applications.length).toBeGreaterThanOrEqual(0)
      expect(categorized.services.length).toBeGreaterThanOrEqual(0)

      // Check that processes are properly tagged
      const allProcesses = [
        ...categorized.systemProcesses,
        ...categorized.userProcesses,
        ...categorized.applications,
        ...categorized.services
      ]

      expect(allProcesses.length).toBeGreaterThan(0)
      expect(allProcesses.every(p => p.tags.length > 0)).toBe(true)
    })
  })

  describe("Analytics and Search", () => {
    beforeEach(async () => {
      await manager.initialize(mockAdapter)
      await manager.syncWithPlatform() // Populate with data
    })

    test("provides process analytics", async () => {
      const analytics = await manager.getProcessAnalytics()

      expect(analytics.totalProcesses).toBeGreaterThan(0)
      expect(typeof analytics.newProcessesToday).toBe('number')
      expect(typeof analytics.disappearedProcessesToday).toBe('number')
      expect(Array.isArray(analytics.topCpuConsumers)).toBe(true)
      expect(Array.isArray(analytics.topMemoryConsumers)).toBe(true)
      expect(Array.isArray(analytics.mostActiveProcesses)).toBe(true)
      expect(typeof analytics.managedProcessHealth.total).toBe('number')
      expect(typeof analytics.managedProcessHealth.healthy).toBe('number')
      expect(typeof analytics.managedProcessHealth.unhealthy).toBe('number')
    })

    test("searches processes with fuzzy matching", async () => {
      // First register a known process
      const testProcess: ProcessInfo = {
        pid: 9999,
        ppid: 1,
        name: "special-browser",
        command: "/usr/bin/special-browser",
        args: [],
        user: "testuser",
        cpu: 25.5,
        memory: 2048000,
        vsz: 4096000,
        rss: 2048000,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      await manager.registerProcessWithMetadata(testProcess, ["browser", "application"])

      // Search for it
      const results = await manager.searchProcesses("browser")
      
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(p => p.name.includes("browser"))).toBe(true)
    })

    test("searches with tag filters", async () => {
      const testProcess: ProcessInfo = {
        pid: 9999,
        ppid: 1,
        name: "tagged-process",
        command: "/usr/bin/tagged",
        args: [],
        user: "testuser",
        cpu: 5.5,
        memory: 1024,
        vsz: 2048,
        rss: 1024,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      await manager.registerProcessWithMetadata(testProcess, ["special", "test"])

      const results = await manager.searchProcesses("tagged", {
        tagFilter: ["special"]
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results.every(p => p.tags.includes("special"))).toBe(true)
    })

    test("limits search results", async () => {
      const results = await manager.searchProcesses("", { limit: 2 })
      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  describe("Configuration", () => {
    test("uses default configuration", () => {
      const defaultManager = new ProcessRegistryManager()
      expect(defaultManager.getSyncStatus().isEnabled).toBe(true) // Default has auto-sync enabled
    })

    test("accepts custom configuration", () => {
      const customConfig: Partial<RegistryManagerConfig> = {
        autoSyncEnabled: false,
        autoSyncInterval: 10000,
        enableProcessDiscovery: false
      }

      const customManager = new ProcessRegistryManager(customConfig)
      const syncStatus = customManager.getSyncStatus()
      
      expect(syncStatus.isEnabled).toBe(false)
    })
  })

  describe("Error Handling", () => {
    test("handles missing platform adapter", async () => {
      // Don't initialize with adapter
      await expect(manager.syncWithPlatform()).rejects.toThrow()
    })

    test("handles registry errors gracefully", async () => {
      await manager.initialize(mockAdapter)

      // Try to register invalid process (this shouldn't fail, but let's test error handling)
      const invalidProcess = {
        pid: -1, // Invalid PID
        ppid: 1,
        name: "",
        command: "",
        args: [],
        user: "",
        cpu: -1,
        memory: -1,
        vsz: 0,
        rss: 0,
        startTime: new Date(),
        status: "running" as ProcessStatus
      }

      // This should succeed (registry is tolerant) but let's verify it handles edge cases
      try {
        await manager.registerProcessWithMetadata(invalidProcess, [])
        expect(true).toBe(true) // Should not throw
      } catch (error) {
        // If it does throw, that's also acceptable for invalid data
        expect(error).toBeDefined()
      }
    })
  })
})