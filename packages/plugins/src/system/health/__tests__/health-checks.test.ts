/**
 * Health Checks Tests
 * 
 * Tests for various health check implementations including
 * process existence, resource usage, and endpoint checks.
 * 
 * @module plugins/system/health/__tests__/health-checks
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { MockProcessAdapter } from "../../adapters/mock-adapter"
import {
  HealthCheckFactory,
  ProcessExistsHealthCheck,
  CpuUsageHealthCheck,
  MemoryUsageHealthCheck,
  HttpEndpointHealthCheck,
  CustomScriptHealthCheck,
} from "../health-checks"
import type { ProcessInfo, ProcessStatus } from "../../types"
import type { HealthCheckConfig } from "../types"

describe("Health Check System", () => {
  let mockAdapter: MockProcessAdapter
  let testProcess: ProcessInfo

  beforeEach(() => {
    mockAdapter = new MockProcessAdapter()
    testProcess = {
      pid: 1234,
      ppid: 1,
      name: "test-process",
      command: "/usr/bin/test",
      args: [],
      user: "testuser",
      cpu: 25.5,
      memory: 512 * 1024 * 1024, // 512MB in bytes
      vsz: 1024 * 1024 * 1024, // 1GB
      rss: 512 * 1024 * 1024,
      startTime: new Date(),
      status: "running" as ProcessStatus
    }
  })

  describe("HealthCheckFactory", () => {
    test("creates process exists health check", () => {
      const config: HealthCheckConfig = {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      }

      const healthCheck = HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)
      expect(healthCheck).toBeInstanceOf(ProcessExistsHealthCheck)
    })

    test("creates CPU usage health check", () => {
      const config: HealthCheckConfig = {
        type: 'cpu_usage',
        enabled: true,
        interval: 10000,
        timeout: 2000,
        retries: 1,
        parameters: { maxCpuPercent: 80 }
      }

      const healthCheck = HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)
      expect(healthCheck).toBeInstanceOf(CpuUsageHealthCheck)
    })

    test("creates memory usage health check", () => {
      const config: HealthCheckConfig = {
        type: 'memory_usage',
        enabled: true,
        interval: 15000,
        timeout: 2000,
        retries: 1,
        parameters: { maxMemoryMB: 1024 }
      }

      const healthCheck = HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)
      expect(healthCheck).toBeInstanceOf(MemoryUsageHealthCheck)
    })

    test("creates HTTP endpoint health check", () => {
      const config: HealthCheckConfig = {
        type: 'http_endpoint',
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 2,
        parameters: { url: 'http://localhost:8080/health' }
      }

      const healthCheck = HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)
      expect(healthCheck).toBeInstanceOf(HttpEndpointHealthCheck)
    })

    test("creates custom script health check", () => {
      const config: HealthCheckConfig = {
        type: 'custom_script',
        enabled: true,
        interval: 60000,
        timeout: 10000,
        retries: 1,
        parameters: { scriptPath: '/usr/bin/check-health.sh' }
      }

      const healthCheck = HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)
      expect(healthCheck).toBeInstanceOf(CustomScriptHealthCheck)
    })

    test("throws error for unknown health check type", () => {
      const config = {
        type: 'unknown_type',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      } as any

      expect(() => HealthCheckFactory.createHealthCheck("test-id", config, mockAdapter)).toThrow()
    })

    test("returns default health check configurations", () => {
      const defaults = HealthCheckFactory.getDefaultHealthChecks()
      
      expect(defaults.length).toBeGreaterThan(0)
      expect(defaults.some(config => config.type === 'process_exists')).toBe(true)
      expect(defaults.some(config => config.type === 'cpu_usage')).toBe(true)
      expect(defaults.some(config => config.type === 'memory_usage')).toBe(true)
    })
  })

  describe("ProcessExistsHealthCheck", () => {
    test("reports healthy when process exists", async () => {
      const config: HealthCheckConfig = {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      }

      // Create a mock adapter that returns the process
      const mockAdapterWithProcess = {
        ...mockAdapter,
        getProcessInfo: async (pid: number) => {
          if (pid === testProcess.pid) {
            return testProcess
          }
          return null
        }
      }

      const healthCheck = new ProcessExistsHealthCheck("test-id", config, mockAdapterWithProcess as any)
      const result = await healthCheck.execute(testProcess)

      expect(result.status).toBe('healthy')
      expect(result.type).toBe('process_exists')
      expect(result.pid).toBe(testProcess.pid)
      expect(result.registryId).toBe("test-id")
    })

    test("reports unhealthy when process does not exist", async () => {
      const config: HealthCheckConfig = {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      }

      // Create a mock adapter that returns null for getProcessInfo
      const mockAdapterWithMissingProcess = {
        ...mockAdapter,
        getProcessInfo: async () => null
      }

      const healthCheck = new ProcessExistsHealthCheck("test-id", config, mockAdapterWithMissingProcess as any)
      const result = await healthCheck.execute(testProcess)

      expect(result.status).toBe('unhealthy')
    })
  })

  describe("CpuUsageHealthCheck", () => {
    test("reports healthy when CPU usage is below threshold", async () => {
      const config: HealthCheckConfig = {
        type: 'cpu_usage',
        enabled: true,
        interval: 10000,
        timeout: 2000,
        retries: 1,
        parameters: { maxCpuPercent: 80, sustainedDuration: 30000 }
      }

      const healthCheck = new CpuUsageHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess) // 25.5% CPU

      expect(result.status).toBe('healthy')
      expect(result.details).toHaveProperty('currentCpuUsage', 25.5)
      expect(result.details).toHaveProperty('maxAllowedCpu', 80)
    })

    test("reports healthy when CPU spikes briefly above threshold", async () => {
      const config: HealthCheckConfig = {
        type: 'cpu_usage',
        enabled: true,
        interval: 10000,
        timeout: 2000,
        retries: 1,
        parameters: { maxCpuPercent: 20, sustainedDuration: 30000 }
      }

      const highCpuProcess = { ...testProcess, cpu: 85 }
      const healthCheck = new CpuUsageHealthCheck("test-id", config, mockAdapter)
      
      // Single high reading should not trigger unhealthy
      const result = await healthCheck.execute(highCpuProcess)
      expect(result.status).toBe('healthy')
    })
  })

  describe("MemoryUsageHealthCheck", () => {
    test("reports healthy when memory usage is below absolute limit", async () => {
      const config: HealthCheckConfig = {
        type: 'memory_usage',
        enabled: true,
        interval: 15000,
        timeout: 2000,
        retries: 1,
        parameters: { maxMemoryMB: 1024 } // 1GB limit
      }

      const healthCheck = new MemoryUsageHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess) // 512MB usage

      expect(result.status).toBe('healthy')
      expect(result.details).toHaveProperty('currentMemoryMB', 512)
      expect(result.details).toHaveProperty('maxAllowedMemoryMB', 1024)
    })

    test("reports unhealthy when memory usage exceeds absolute limit", async () => {
      const config: HealthCheckConfig = {
        type: 'memory_usage',
        enabled: true,
        interval: 15000,
        timeout: 2000,
        retries: 1,
        parameters: { maxMemoryMB: 256 } // 256MB limit
      }

      const healthCheck = new MemoryUsageHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess) // 512MB usage

      expect(result.status).toBe('unhealthy')
    })

    test("handles memory percentage limits", async () => {
      const config: HealthCheckConfig = {
        type: 'memory_usage',
        enabled: true,
        interval: 15000,
        timeout: 2000,
        retries: 1,
        parameters: { maxMemoryPercent: 50 }
      }

      const healthCheck = new MemoryUsageHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess)

      // Should be healthy since mock adapter provides system metrics
      expect(result.status).toBe('healthy')
    })
  })

  describe("HttpEndpointHealthCheck", () => {
    test("reports healthy for successful HTTP response", async () => {
      // Mock fetch globally for this test
      const originalFetch = global.fetch
      global.fetch = async () => {
        return {
          status: 200,
          text: async () => "OK"
        } as Response
      }

      try {
        const config: HealthCheckConfig = {
          type: 'http_endpoint',
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 2,
          parameters: { 
            url: 'http://localhost:8080/health',
            expectedStatusCode: 200
          }
        }

        const healthCheck = new HttpEndpointHealthCheck("test-id", config, mockAdapter)
        const result = await healthCheck.execute(testProcess)

        expect(result.status).toBe('healthy')
        expect(result.details).toHaveProperty('endpointUrl', 'http://localhost:8080/health')
      } finally {
        global.fetch = originalFetch
      }
    })

    test("reports unhealthy for wrong status code", async () => {
      // Mock fetch to return wrong status
      const originalFetch = global.fetch
      global.fetch = async () => {
        return {
          status: 500,
          text: async () => "Internal Server Error"
        } as Response
      }

      try {
        const config: HealthCheckConfig = {
          type: 'http_endpoint',
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 2,
          parameters: { 
            url: 'http://localhost:8080/health',
            expectedStatusCode: 200
          }
        }

        const healthCheck = new HttpEndpointHealthCheck("test-id", config, mockAdapter)
        const result = await healthCheck.execute(testProcess)

        expect(result.status).toBe('unhealthy')
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe("CustomScriptHealthCheck", () => {
    test("reports healthy for mock script execution", async () => {
      const config: HealthCheckConfig = {
        type: 'custom_script',
        enabled: true,
        interval: 60000,
        timeout: 10000,
        retries: 1,
        parameters: { 
          scriptPath: '/usr/bin/health-check.sh',
          arguments: ['--process', testProcess.name],
          expectedExitCode: 0
        }
      }

      const healthCheck = new CustomScriptHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess)

      // Mock implementation always returns healthy
      expect(result.status).toBe('healthy')
      expect(result.details).toHaveProperty('scriptPath', '/usr/bin/health-check.sh')
    })
  })

  describe("Configuration Validation", () => {
    test("validates valid health check configurations", () => {
      const validConfigs: HealthCheckConfig[] = [
        {
          type: 'process_exists',
          enabled: true,
          interval: 5000,
          timeout: 1000,
          retries: 2,
          parameters: {}
        },
        {
          type: 'cpu_usage',
          enabled: true,
          interval: 10000,
          timeout: 2000,
          retries: 1,
          parameters: { maxCpuPercent: 80 }
        },
        {
          type: 'http_endpoint',
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 2,
          parameters: { url: 'https://example.com/health' }
        }
      ]

      for (const config of validConfigs) {
        expect(HealthCheckFactory.validateHealthCheckConfig(config)).toBe(true)
      }
    })

    test("rejects invalid health check configurations", () => {
      const invalidConfigs = [
        // Missing required fields
        {
          type: 'process_exists',
          enabled: true,
          // Missing interval and timeout
          retries: 2,
          parameters: {}
        },
        // Invalid interval
        {
          type: 'process_exists',
          enabled: true,
          interval: 500, // Too low
          timeout: 1000,
          retries: 2,
          parameters: {}
        },
        // Invalid HTTP URL
        {
          type: 'http_endpoint',
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 2,
          parameters: { url: 'not-a-url' }
        },
        // Invalid CPU percentage
        {
          type: 'cpu_usage',
          enabled: true,
          interval: 10000,
          timeout: 2000,
          retries: 1,
          parameters: { maxCpuPercent: 150 } // > 100%
        }
      ]

      for (const config of invalidConfigs) {
        expect(HealthCheckFactory.validateHealthCheckConfig(config as any)).toBe(false)
      }
    })
  })

  describe("Health Check Results", () => {
    test("includes comprehensive result information", async () => {
      const config: HealthCheckConfig = {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      }

      const healthCheck = new ProcessExistsHealthCheck("test-id", config, mockAdapter)
      const result = await healthCheck.execute(testProcess, 3)

      expect(result).toHaveProperty('checkId')
      expect(result).toHaveProperty('registryId', "test-id")
      expect(result).toHaveProperty('pid', testProcess.pid)
      expect(result).toHaveProperty('type', 'process_exists')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('duration')
      expect(result).toHaveProperty('attempt', 3)
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('details')
      
      expect(typeof result.duration).toBe('number')
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.timestamp instanceof Date).toBe(true)
    })

    test("captures error information in results", async () => {
      const config: HealthCheckConfig = {
        type: 'process_exists',
        enabled: true,
        interval: 5000,
        timeout: 1000,
        retries: 2,
        parameters: {}
      }

      // Create a mock adapter that throws an error
      const errorAdapter = {
        ...mockAdapter,
        getProcessInfo: async () => { throw new Error("Connection failed") }
      }

      const healthCheck = new ProcessExistsHealthCheck("test-id", config, errorAdapter as any)
      const result = await healthCheck.execute(testProcess)

      expect(result.status).toBe('error')
      expect(result.message).toContain('Health check failed')
      expect(result.details).toHaveProperty('error')
    })
  })
})