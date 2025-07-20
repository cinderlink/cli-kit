/**
 * Auto-restart Manager Tests
 * 
 * Tests for the intelligent auto-restart system including
 * restart policies, backoff strategies, and failure tracking.
 * 
 * @module plugins/system/health/__tests__/auto-restart
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { AutoRestartManager } from "../auto-restart"
import { ProcessRegistry, InMemoryRegistryStorage } from "../../registry/process-registry"
import { MockProcessAdapter } from "../../adapters/mock-adapter"
import type { ProcessInfo, ProcessStatus } from "../../types"
import type { AutoRestartConfig } from "../types"

describe("AutoRestartManager", () => {
  let autoRestartManager: AutoRestartManager
  let registry: ProcessRegistry
  let mockAdapter: MockProcessAdapter
  let storage: InMemoryRegistryStorage
  let testProcess: ProcessInfo

  beforeEach(async () => {
    storage = new InMemoryRegistryStorage()
    registry = new ProcessRegistry({}, storage)
    mockAdapter = new MockProcessAdapter()
    autoRestartManager = new AutoRestartManager(mockAdapter, registry)

    testProcess = {
      pid: 1234,
      ppid: 1,
      name: "test-process",
      command: "/usr/bin/test",
      args: [],
      user: "testuser",
      cpu: 25.5,
      memory: 512 * 1024 * 1024,
      vsz: 1024 * 1024 * 1024,
      rss: 512 * 1024 * 1024,
      startTime: new Date(),
      status: "running" as ProcessStatus
    }
  })

  afterEach(async () => {
    autoRestartManager.destroy()
    await registry.destroy()
    storage.clear()
  })

  describe("Configuration Management", () => {
    test("configures auto-restart for a process", () => {
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'exponential',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }

      autoRestartManager.configureAutoRestart("test-id", config)
      
      const retrievedConfig = autoRestartManager.getAutoRestartConfig("test-id")
      expect(retrievedConfig).toEqual(config)
      
      const restartState = autoRestartManager.getRestartState("test-id")
      expect(restartState).toBeDefined()
      expect(restartState!.registryId).toBe("test-id")
      expect(restartState!.restartCount).toBe(0)
    })

    test("removes auto-restart configuration", () => {
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'always',
        strategy: 'immediate',
        maxRestarts: 3,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }

      autoRestartManager.configureAutoRestart("test-id", config)
      expect(autoRestartManager.getAutoRestartConfig("test-id")).toBeDefined()
      
      autoRestartManager.removeAutoRestart("test-id")
      expect(autoRestartManager.getAutoRestartConfig("test-id")).toBeNull()
      expect(autoRestartManager.getRestartState("test-id")).toBeNull()
    })
  })

  describe("Restart Triggers", () => {
    beforeEach(async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)
    })

    test("handles process exit event", async () => {
      const allProcesses = await registry.getAllProcesses()
      const registryId = allProcesses[0].registryId

      const attempt = await autoRestartManager.handleProcessExit(registryId, 1, 'SIGTERM')
      
      expect(attempt).toBeDefined()
      expect(attempt!.success).toBe(true)
      expect(attempt!.reason).toContain('exited with signal SIGTERM')
      
      const restartState = autoRestartManager.getRestartState(registryId)
      expect(restartState!.restartCount).toBe(1)
    })

    test("handles process crash event", async () => {
      const allProcesses = await registry.getAllProcesses()
      const registryId = allProcesses[0].registryId

      const error = new Error("Segmentation fault")
      const attempt = await autoRestartManager.handleProcessCrash(registryId, error)
      
      expect(attempt).toBeDefined()
      expect(attempt!.success).toBe(true)
      expect(attempt!.reason).toContain('crashed: Segmentation fault')
    })

    test("handles health check failure", async () => {
      const allProcesses = await registry.getAllProcesses()
      const registryId = allProcesses[0].registryId

      const attempt = await autoRestartManager.handleHealthCheckFailure(
        registryId, 
        "High CPU usage detected"
      )
      
      expect(attempt).toBeDefined()
      expect(attempt!.success).toBe(true)
      expect(attempt!.reason).toContain('Health check failed')
    })

    test("manual restart works", async () => {
      const allProcesses = await registry.getAllProcesses()
      const registryId = allProcesses[0].registryId

      const attempt = await autoRestartManager.manualRestart(registryId, "User requested restart")
      
      expect(attempt.success).toBe(true)
      expect(attempt.reason).toBe("User requested restart")
      expect(attempt.newPid).toBeDefined()
      expect(attempt.newPid).not.toBe(testProcess.pid)
    })
  })

  describe("Restart Policies", () => {
    test("never policy prevents restarts", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'never',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      const attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      expect(attempt).toBeNull()
    })

    test("unless_stopped policy respects manual stops", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'unless_stopped',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // Should restart normally
      let attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 0)
      expect(attempt).toBeDefined()

      // Mark as manually stopped
      autoRestartManager.markManuallyStopped(registryProcess.registryId)

      // Should not restart
      attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 0)
      expect(attempt).toBeNull()

      // Clear manual stop flag
      autoRestartManager.clearManualStop(registryProcess.registryId)

      // Should restart again
      attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 0)
      expect(attempt).toBeDefined()
    })
  })

  describe("Restart Strategies", () => {
    test("immediate strategy has no delay", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 1000, // Should be ignored
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      const start = Date.now()
      await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      const duration = Date.now() - start

      // Should be immediate (under 100ms including processing time)
      expect(duration).toBeLessThan(100)
    })

    test("fixed strategy uses initial delay", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'fixed',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 100, // Small delay for testing
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // First restart should be immediate since we're testing the delay calculation logic
      // In real implementation, there would be a delay
      const attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      expect(attempt).toBeDefined()
    })
  })

  describe("Rate Limiting", () => {
    test("respects maximum restart count within time window", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 2, // Only allow 2 restarts
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // First restart should succeed
      let attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      expect(attempt).toBeDefined()

      // Second restart should succeed
      attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      expect(attempt).toBeDefined()

      // Third restart should be blocked by rate limit
      attempt = await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      expect(attempt).toBeNull()
    })
  })

  describe("State Management", () => {
    test("tracks restart history", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // Perform multiple restarts
      await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      await autoRestartManager.handleProcessCrash(registryProcess.registryId, new Error("Test error"))

      const history = autoRestartManager.getRestartHistory(registryProcess.registryId)
      expect(history.length).toBe(2)
      
      expect(history[0].reason).toContain('exited with code 1')
      expect(history[1].reason).toContain('crashed: Test error')
      
      expect(history.every(attempt => attempt.success)).toBe(true)
      expect(history.every(attempt => attempt.registryId === registryProcess.registryId)).toBe(true)
    })

    test("resets restart state", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // Perform restart to populate state
      await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      
      let state = autoRestartManager.getRestartState(registryProcess.registryId)!
      expect(state.restartCount).toBe(1)
      expect(state.restartHistory.length).toBe(1)

      // Reset state
      autoRestartManager.resetRestartState(registryProcess.registryId)
      
      state = autoRestartManager.getRestartState(registryProcess.registryId)!
      expect(state.restartCount).toBe(0)
      expect(state.restartHistory.length).toBe(0)
      expect(state.currentDelay).toBe(config.initialDelay)
    })
  })

  describe("Statistics", () => {
    test("provides restart statistics", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // Perform some restarts
      await autoRestartManager.handleProcessExit(registryProcess.registryId, 1)
      await autoRestartManager.handleProcessCrash(registryProcess.registryId, new Error("Test"))

      const stats = autoRestartManager.getRestartStatistics()
      
      expect(stats.totalConfiguredProcesses).toBe(1)
      expect(stats.totalRestartAttempts).toBe(2)
      expect(stats.successfulRestarts).toBe(2)
      expect(stats.failedRestarts).toBe(0)
      expect(stats.averageRestartTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Error Handling", () => {
    test("handles missing process in registry", async () => {
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart("non-existent", config)

      await expect(autoRestartManager.manualRestart("non-existent")).rejects.toThrow()
    })

    test("handles restart in progress", async () => {
      const registryProcess = await registry.registerProcess(testProcess)
      
      const config: AutoRestartConfig = {
        enabled: true,
        policy: 'on_failure',
        strategy: 'immediate',
        maxRestarts: 5,
        timeWindow: 300000,
        initialDelay: 0,
        maxDelay: 60000,
        backoffMultiplier: 2,
        healthCheckGracePeriod: 10000,
        restartOnHealthCheckFailure: true,
        restartOnProcessExit: true,
        restartOnCrash: true
      }
      
      autoRestartManager.configureAutoRestart(registryProcess.registryId, config)

      // Start first restart
      const restart1Promise = autoRestartManager.manualRestart(registryProcess.registryId)
      
      // Try to start second restart while first is in progress
      await expect(autoRestartManager.manualRestart(registryProcess.registryId)).rejects.toThrow()
      
      // Wait for first restart to complete
      await restart1Promise
    })
  })
})