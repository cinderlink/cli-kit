/**
 * Simple Process Manager Plugin Tests
 * 
 * Basic tests for the Process Manager Plugin that don't require
 * full Effect runtime initialization.
 * 
 * @module plugins/system/__tests__/simple-process-manager
 */

import { test, expect, describe } from "bun:test"
import { ProcessManagerPlugin } from "../process-manager"
import { MockProcessAdapter } from "../adapters/mock-adapter"
import type { ProcessManagerConfig, ProcessQuery } from "../types"

describe("ProcessManagerPlugin - Simple Tests", () => {
  
  test("creates plugin with correct metadata", () => {
    const plugin = new ProcessManagerPlugin()
    
    expect(plugin.name).toBe("process-manager")
    expect(plugin.version).toBe("1.0.0")
    expect(plugin.metadata.name).toBe("process-manager")
    expect(plugin.metadata.version).toBe("1.0.0")
    expect(plugin.metadata.description).toBe("System process management and monitoring")
    expect(plugin.metadata.author).toBe("TUIX Team")
    expect(plugin.metadata.category).toBe("system")
  })
  
  test("accepts valid configuration", () => {
    const config: ProcessManagerConfig = {
      refreshInterval: 1000,
      enableProcessTree: true,
      monitorSystemMetrics: true,
      bufferSize: 1000,
      enableAutoRestart: false,
      maxProcessHistory: 10000,
      platformAdapter: "auto",
    }
    
    expect(() => new ProcessManagerPlugin(config)).not.toThrow()
  })
  
  test("validates configuration schema", () => {
    // Invalid refresh interval - too low
    expect(() => new ProcessManagerPlugin({ refreshInterval: 50 })).toThrow()
    
    // Invalid refresh interval - too high
    expect(() => new ProcessManagerPlugin({ refreshInterval: 15000 })).toThrow()
    
    // Invalid buffer size - too low
    expect(() => new ProcessManagerPlugin({ bufferSize: 5 })).toThrow()
    
    // Invalid buffer size - too high
    expect(() => new ProcessManagerPlugin({ bufferSize: 15000 })).toThrow()
  })
  
  test("provides complete API interface", () => {
    const plugin = new ProcessManagerPlugin()
    const api = plugin.getAPI()
    
    // Process management methods
    expect(typeof api.getProcessList).toBe("function")
    expect(typeof api.getProcessTree).toBe("function")
    expect(typeof api.findProcesses).toBe("function")
    expect(typeof api.killProcess).toBe("function")
    expect(typeof api.suspendProcess).toBe("function")
    expect(typeof api.resumeProcess).toBe("function")
    
    // System metrics methods
    expect(typeof api.getSystemMetrics).toBe("function")
    expect(typeof api.getMetricsHistory).toBe("function")
    expect(typeof api.getAggregatedMetrics).toBe("function")
    
    // Streaming methods
    expect(typeof api.subscribeToProcessUpdates).toBe("function")
    expect(typeof api.subscribeToMetrics).toBe("function")
    expect(typeof api.watchProcess).toBe("function")
  })
  
  test("has correct initialization status", () => {
    const plugin = new ProcessManagerPlugin()
    expect(plugin.getInitializationStatus()).toBe(false)
  })
  
  test("can get and update configuration", () => {
    const plugin = new ProcessManagerPlugin({ refreshInterval: 500 })
    
    const config = plugin.getConfig()
    expect(config).toBeDefined()
    
    plugin.updateConfig({ enableProcessTree: false })
    const updatedConfig = plugin.getConfig()
    expect(updatedConfig).toHaveProperty("enableProcessTree", false)
  })
  
  test("metrics history starts empty", () => {
    const plugin = new ProcessManagerPlugin()
    const api = plugin.getAPI()
    
    const history = api.getMetricsHistory()
    expect(Array.isArray(history)).toBe(true)
    expect(history.length).toBe(0)
  })
  
  test("aggregated metrics throws on empty data", () => {
    const plugin = new ProcessManagerPlugin()
    const api = plugin.getAPI()
    
    const timeRange = {
      start: new Date(Date.now() - 3600000),
      end: new Date(),
    }
    
    expect(() => api.getAggregatedMetrics(timeRange)).toThrow("No metrics available")
  })
})

describe("MockProcessAdapter", () => {
  test("generates mock processes", async () => {
    const adapter = new MockProcessAdapter()
    const processes = await adapter.getProcessList()
    
    expect(Array.isArray(processes)).toBe(true)
    expect(processes.length).toBeGreaterThan(0)
    
    // Check process structure
    const process = processes[0]
    expect(process).toHaveProperty("pid")
    expect(process).toHaveProperty("ppid")
    expect(process).toHaveProperty("name")
    expect(process).toHaveProperty("command")
    expect(process).toHaveProperty("args")
    expect(process).toHaveProperty("user")
    expect(process).toHaveProperty("cpu")
    expect(process).toHaveProperty("memory")
    expect(process).toHaveProperty("vsz")
    expect(process).toHaveProperty("rss")
    expect(process).toHaveProperty("startTime")
    expect(process).toHaveProperty("status")
    
    expect(typeof process.pid).toBe("number")
    expect(typeof process.name).toBe("string")
    expect(typeof process.user).toBe("string")
    expect(typeof process.cpu).toBe("number")
    expect(typeof process.memory).toBe("number")
  })
  
  test("generates mock system metrics", async () => {
    const adapter = new MockProcessAdapter()
    const metrics = await adapter.getSystemMetrics()
    
    expect(metrics).toHaveProperty("cpu")
    expect(metrics).toHaveProperty("memory")
    expect(metrics).toHaveProperty("disk")
    expect(metrics).toHaveProperty("timestamp")
    
    // Check CPU metrics
    expect(metrics.cpu).toHaveProperty("overall")
    expect(metrics.cpu).toHaveProperty("cores")
    expect(metrics.cpu).toHaveProperty("loadAverage")
    expect(Array.isArray(metrics.cpu.cores)).toBe(true)
    
    // Check memory metrics
    expect(metrics.memory).toHaveProperty("total")
    expect(metrics.memory).toHaveProperty("used")
    expect(metrics.memory).toHaveProperty("available")
    expect(metrics.memory).toHaveProperty("percent")
    expect(metrics.memory).toHaveProperty("swap")
    
    // Check disk metrics
    expect(metrics.disk).toHaveProperty("totalReads")
    expect(metrics.disk).toHaveProperty("totalWrites")
    expect(metrics.disk).toHaveProperty("utilization")
    
    // Verify ranges
    expect(metrics.cpu.overall).toBeGreaterThanOrEqual(0)
    expect(metrics.cpu.overall).toBeLessThanOrEqual(100)
    expect(metrics.memory.percent).toBeGreaterThanOrEqual(0)
    expect(metrics.memory.percent).toBeLessThanOrEqual(100)
  })
  
  test("can find process by PID", async () => {
    const adapter = new MockProcessAdapter()
    const processes = await adapter.getProcessList()
    
    if (processes.length > 0) {
      const firstProcess = processes[0]
      const foundProcess = await adapter.getProcessInfo(firstProcess.pid)
      
      expect(foundProcess).toBeDefined()
      expect(foundProcess?.pid).toBe(firstProcess.pid)
    }
  })
  
  test("returns null for non-existent PID", async () => {
    const adapter = new MockProcessAdapter()
    const foundProcess = await adapter.getProcessInfo(999999)
    
    expect(foundProcess).toBeNull()
  })
  
  test("can mock kill process", async () => {
    const adapter = new MockProcessAdapter()
    const processes = await adapter.getProcessList()
    
    if (processes.length > 0) {
      const process = processes.find(p => p.status === 'running')
      if (process) {
        await adapter.killProcess(process.pid, 'TERM')
        expect(process.status).toBe('stopped')
      }
    }
  })
  
  test("can mock suspend/resume process", async () => {
    const adapter = new MockProcessAdapter()
    const processes = await adapter.getProcessList()
    
    if (processes.length > 0) {
      const process = processes.find(p => p.status === 'running')
      if (process) {
        await adapter.suspendProcess(process.pid)
        expect(process.status).toBe('stopped')
        
        await adapter.resumeProcess(process.pid)
        expect(process.status).toBe('running')
      }
    }
  })
})