/**
 * Process Manager Unit Tests
 * 
 * Tests for process lifecycle management, error handling, and state persistence
 */

import { test, expect, beforeEach, afterEach, describe } from "bun:test"
import { Effect, Layer } from "effect"
import { ProcessManager } from "../../../src/process-manager/manager"
import { createTestLogger } from "../../../src/logger/test-logger"
import type { ProcessConfig, ProcessManagerConfig } from "../../../src/process-manager/types"
import { join } from "path"
import { rm } from "fs/promises"

describe("ProcessManager", () => {
  let manager: ProcessManager
  let testDir: string
  let logger: any

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(import.meta.dir, `.test-${Date.now()}`)
    logger = createTestLogger()
    
    const config: ProcessManagerConfig = {
      logDir: join(testDir, "logs"),
      pidDir: join(testDir, "pids"),
      configPath: join(testDir, "processes.json"),
      logger,
      autoSave: false,
      skipShutdownHandlers: true // Prevent test interference
    }
    
    manager = new ProcessManager(config)
    await manager.init()
  })

  afterEach(async () => {
    // Clean up all processes
    await manager.shutdown()
    
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {}
  })

  describe("Basic Operations", () => {
    test("should add a process", async () => {
      const config: ProcessConfig = {
        name: "test-echo",
        command: "echo",
        args: ["hello"],
        autostart: false
      }
      
      const state = await manager.add(config)
      expect(state.name).toBe("test-echo")
      expect(state.status).toBe("stopped")
      expect(state.config).toEqual(config)
    })

    test("should prevent duplicate process names", async () => {
      const config: ProcessConfig = {
        name: "test-echo",
        command: "echo",
        args: ["hello"]
      }
      
      await manager.add(config)
      
      await expect(manager.add(config)).rejects.toThrow("Process test-echo already exists")
    })

    test("should start a simple process", async () => {
      const config: ProcessConfig = {
        name: "test-echo",
        command: "echo",
        args: ["hello world"]
      }
      
      await manager.add(config)
      await manager.start("test-echo")
      
      const state = manager.status("test-echo") as any
      expect(state.status).toBe("running")
      expect(state.pid).toBeDefined()
      
      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const finalState = manager.status("test-echo") as any
      expect(finalState.status).toBe("stopped")
      expect(finalState.logs.some((log: any) => log.message.includes("hello world"))).toBe(true)
    })

    test("should stop a running process", async () => {
      const config: ProcessConfig = {
        name: "test-sleep",
        command: "sleep",
        args: ["10"]
      }
      
      await manager.add(config)
      await manager.start("test-sleep")
      
      const runningState = manager.status("test-sleep") as any
      expect(runningState.status).toBe("running")
      
      await manager.stop("test-sleep")
      
      const stoppedState = manager.status("test-sleep") as any
      expect(stoppedState.status).toBe("stopped")
      expect(stoppedState.pid).toBeUndefined()
    })

    test("should restart a process", async () => {
      const config: ProcessConfig = {
        name: "test-date",
        command: "date"
      }
      
      await manager.add(config)
      await manager.start("test-date")
      
      // Wait for first run to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const firstLogs = await manager.getLogs("test-date")
      const firstLogCount = firstLogs.length
      
      await manager.restart("test-date")
      
      // Wait for restart to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const secondLogs = await manager.getLogs("test-date")
      expect(secondLogs.length).toBeGreaterThan(firstLogCount)
    })

    test("should remove a process", async () => {
      const config: ProcessConfig = {
        name: "test-remove",
        command: "echo",
        args: ["test"]
      }
      
      await manager.add(config)
      await manager.remove("test-remove")
      
      expect(() => manager.status("test-remove")).toThrow("Process test-remove not found")
    })
  })

  describe("Process Groups", () => {
    test("should create and manage process groups", async () => {
      await manager.add({ name: "group-1", command: "echo", args: ["1"] })
      await manager.add({ name: "group-2", command: "echo", args: ["2"] })
      await manager.add({ name: "group-3", command: "echo", args: ["3"] })
      
      manager.createGroup({
        name: "test-group",
        processes: ["group-1", "group-2", "group-3"]
      })
      
      const groups = manager.getGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe("test-group")
      
      await manager.startGroup("test-group")
      
      // Wait for processes to start
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const statuses = manager.list()
      const groupStatuses = statuses.filter(s => s.name.startsWith("group-"))
      expect(groupStatuses).toHaveLength(3)
      expect(groupStatuses.every(s => s.status === "running" || s.status === "stopped")).toBe(true)
    })

    test("should stop group in reverse order", async () => {
      // Create simple processes
      for (let i = 1; i <= 3; i++) {
        await manager.add({
          name: `order-${i}`,
          command: "sleep",
          args: ["5"]
        })
      }
      
      manager.createGroup({
        name: "ordered-group",
        processes: ["order-1", "order-2", "order-3"],
        stopOrder: "sequential"
      })
      
      await manager.startGroup("ordered-group")
      
      // Give processes time to start
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Track stop order through events
      const stopOrder: string[] = []
      manager.on("process:stopped", event => {
        stopOrder.push(event.process)
      })
      
      await manager.stopGroup("ordered-group")
      
      // Wait for all stops to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // In sequential mode with reverse order, should stop 3, 2, 1
      expect(stopOrder.length).toBeGreaterThanOrEqual(2)
      expect(stopOrder[0]).toBe("order-3") // Last should stop first
    })
  })

  describe("Auto-restart", () => {
    test("should auto-restart crashed process", async () => {
      const config: ProcessConfig = {
        name: "test-crash",
        command: "sh",
        args: ["-c", "exit 1"],
        autorestart: true,
        restartDelay: 50,
        maxRestarts: 2
      }
      
      await manager.add(config)
      await manager.start("test-crash")
      
      // Wait for crashes and restarts
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const state = manager.status("test-crash") as any
      expect(state.restarts).toBeGreaterThanOrEqual(1)
      expect(state.restarts).toBeLessThanOrEqual(2)
    })

    test("should respect max restarts limit", async () => {
      const config: ProcessConfig = {
        name: "test-max-restarts",
        command: "sh",
        args: ["-c", "exit 1"],
        autorestart: true,
        restartDelay: 20,
        maxRestarts: 1
      }
      
      await manager.add(config)
      await manager.start("test-max-restarts")
      
      // Wait for crashes
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const state = manager.status("test-max-restarts") as any
      expect(state.status).toBe("error")
      expect(state.restarts).toBe(1) // 1 restart (initial start doesn't count)
    })
  })

  describe("Environment and Working Directory", () => {
    test("should pass environment variables", async () => {
      const config: ProcessConfig = {
        name: "test-env",
        command: "sh",
        args: ["-c", "echo $TEST_VAR"],
        env: { TEST_VAR: "hello-from-env" }
      }
      
      await manager.add(config)
      await manager.start("test-env")
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const logs = await manager.getLogs("test-env")
      expect(logs.some(log => log.message.includes("hello-from-env"))).toBe(true)
    })

    test("should use custom working directory", async () => {
      const config: ProcessConfig = {
        name: "test-cwd",
        command: "pwd",
        cwd: testDir
      }
      
      await manager.add(config)
      await manager.start("test-cwd")
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const logs = await manager.getLogs("test-cwd")
      expect(logs.some(log => log.message.includes(testDir))).toBe(true)
    })
  })

  describe("State Persistence", () => {
    test("should save and load configuration", async () => {
      const config1: ProcessConfig = {
        name: "persist-1",
        command: "echo",
        args: ["test"],
        autostart: true
      }
      
      const config2: ProcessConfig = {
        name: "persist-2",
        command: "date",
        autostart: false
      }
      
      await manager.add(config1)
      await manager.add(config2)
      
      manager.createGroup({
        name: "persist-group",
        processes: ["persist-1", "persist-2"]
      })
      
      // Save state
      await manager.save()
      
      // Create new manager instance
      const manager2 = new ProcessManager({
        logDir: join(testDir, "logs"),
        pidDir: join(testDir, "pids"),
        configPath: join(testDir, "processes.json"),
        logger,
        skipShutdownHandlers: true
      })
      
      await manager2.init()
      
      // Check loaded state
      const processes = manager2.list()
      expect(processes).toHaveLength(2)
      expect(processes.find(p => p.name === "persist-1")).toBeDefined()
      expect(processes.find(p => p.name === "persist-2")).toBeDefined()
      
      const groups = manager2.getGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe("persist-group")
      
      await manager2.shutdown()
    })

    test("should handle previously running processes on load", async () => {
      const config: ProcessConfig = {
        name: "test-running",
        command: "sleep",
        args: ["10"]
      }
      
      await manager.add(config)
      await manager.start("test-running")
      
      const runningState = manager.status("test-running") as any
      expect(runningState.status).toBe("running")
      
      // Save while running
      await manager.save()
      
      // Create new manager (simulating restart)
      const manager2 = new ProcessManager({
        logDir: join(testDir, "logs"),
        pidDir: join(testDir, "pids"),
        configPath: join(testDir, "processes.json"),
        logger,
        skipShutdownHandlers: true
      })
      
      await manager2.init()
      
      // Should mark as stopped since we can't reconnect
      const loadedState = manager2.status("test-running") as any
      expect(loadedState.status).toBe("stopped")
      expect(loadedState.pid).toBeUndefined()
      
      // Clean up original process
      await manager.stop("test-running")
      await manager2.shutdown()
    })
  })

  describe("Error Handling", () => {
    test("should handle invalid command", async () => {
      const config: ProcessConfig = {
        name: "test-invalid",
        command: "this-command-does-not-exist"
      }
      
      await manager.add(config)
      
      await expect(manager.start("test-invalid")).rejects.toThrow()
      
      const state = manager.status("test-invalid") as any
      expect(state.status).toBe("error")
      expect(state.lastError).toBeDefined()
    })

    test("should handle process that fails to start", async () => {
      const config: ProcessConfig = {
        name: "test-fail",
        command: "sh",
        args: ["-c", "exit 1"]
      }
      
      await manager.add(config)
      await manager.start("test-fail")
      
      // Wait for exit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const state = manager.status("test-fail") as any
      expect(state.status).toBe("crashed")
    })
  })

  describe("Event Emission", () => {
    test("should emit lifecycle events", async () => {
      const events: any[] = []
      
      manager.on("process:starting", event => events.push(event))
      manager.on("process:started", event => events.push(event))
      manager.on("process:stopped", event => events.push(event))
      
      const config: ProcessConfig = {
        name: "test-events",
        command: "echo",
        args: ["test"]
      }
      
      await manager.add(config)
      await manager.start("test-events")
      
      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(events.length).toBeGreaterThan(0)
      expect(events.some(e => e.process === "test-events")).toBe(true)
      
      // Check we have the expected events
      const hasStarting = events.some(e => e.type === "start" && e.process === "test-events")
      const hasStarted = events.some(e => e.type === "start" && e.data?.pid !== undefined)
      const hasStopped = events.some(e => e.type === "stop")
      
      expect(hasStarting || hasStarted).toBe(true)
      expect(hasStopped).toBe(true)
    })

    test("should emit log events", async () => {
      const logs: any[] = []
      
      manager.on("process:log", event => logs.push(event))
      
      const config: ProcessConfig = {
        name: "test-log-events",
        command: "echo",
        args: ["log message"]
      }
      
      await manager.add(config)
      await manager.start("test-log-events")
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(logs.some(l => l.process === "test-log-events" && l.data.message.includes("log message"))).toBe(true)
    })
  })

  describe("Cleanup", () => {
    test("should clean up PID files on exit", async () => {
      const config: ProcessConfig = {
        name: "test-pid-cleanup",
        command: "sleep",
        args: ["5"]
      }
      
      await manager.add(config)
      await manager.start("test-pid-cleanup")
      
      const pidFile = join(testDir, "pids", "test-pid-cleanup.pid")
      const file = Bun.file(pidFile)
      
      // PID file should exist while running
      expect(await file.exists()).toBe(true)
      
      await manager.stop("test-pid-cleanup")
      
      // Wait a bit for file cleanup and check multiple times
      let cleaned = false
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))
        if (!(await file.exists())) {
          cleaned = true
          break
        }
      }
      
      // PID file should be cleaned up
      expect(cleaned).toBe(true)
    })

    test("should clean up orphaned PID files on init", async () => {
      // Create an orphaned PID file
      const pidFile = join(testDir, "pids", "orphaned.pid")
      await Bun.write(pidFile, "99999") // Non-existent PID
      
      // Create new manager which should clean it up
      const manager2 = new ProcessManager({
        logDir: join(testDir, "logs"),
        pidDir: join(testDir, "pids"),
        configPath: join(testDir, "processes.json"),
        logger,
        skipShutdownHandlers: true
      })
      
      await manager2.init()
      
      // Wait and check for cleanup
      let cleaned = false
      const file = Bun.file(pidFile)
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))
        if (!(await file.exists())) {
          cleaned = true
          break
        }
      }
      
      expect(cleaned).toBe(true)
      
      await manager2.shutdown()
    })
  })

  describe("Concurrent Operations", () => {
    test("should handle concurrent starts", async () => {
      const configs: ProcessConfig[] = []
      for (let i = 0; i < 5; i++) {
        configs.push({
          name: `concurrent-${i}`,
          command: "echo",
          args: [`test-${i}`]
        })
      }
      
      // Add all processes
      for (const config of configs) {
        await manager.add(config)
      }
      
      // Start all concurrently
      await Promise.all(configs.map(c => manager.start(c.name)))
      
      // Check all started
      const statuses = manager.list()
      expect(statuses.filter(s => s.name.startsWith("concurrent-"))).toHaveLength(5)
    })

    test("should handle startAll and stopAll", async () => {
      // Add multiple processes
      for (let i = 0; i < 3; i++) {
        await manager.add({
          name: `batch-${i}`,
          command: "sleep",
          args: ["5"]
        })
      }
      
      await manager.startAll()
      
      const runningStates = manager.list()
      expect(runningStates.every(s => s.status === "running")).toBe(true)
      
      await manager.stopAll()
      
      const stoppedStates = manager.list()
      expect(stoppedStates.every(s => s.status === "stopped")).toBe(true)
    })
  })
})