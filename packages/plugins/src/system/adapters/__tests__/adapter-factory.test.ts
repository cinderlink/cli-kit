/**
 * Platform Adapter Factory Tests
 * 
 * Tests for the platform adapter factory system including platform detection,
 * adapter creation, and validation.
 * 
 * @module plugins/system/adapters/__tests__/adapter-factory
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { 
  ProcessAdapterFactory, 
  createProcessAdapter, 
  createAdapterForPlatform,
  isCurrentPlatformSupported,
  getPlatformCapabilities,
  validateAdapterRequirements,
  type SupportedPlatform 
} from "../index"

describe("ProcessAdapterFactory", () => {
  let factory: ProcessAdapterFactory

  beforeEach(() => {
    factory = new ProcessAdapterFactory()
    factory.clearCache()
  })

  describe("Platform Detection", () => {
    test("detects current platform", () => {
      const platform = factory.detectPlatform()
      expect(['darwin', 'linux', 'mock']).toContain(platform)
    })

    test("uses override platform when specified", () => {
      const factoryWithOverride = new ProcessAdapterFactory({ platform: 'mock' })
      const platform = factoryWithOverride.detectPlatform()
      expect(platform).toBe('mock')
    })

    test("checks platform support correctly", () => {
      expect(factory.isPlatformSupported('darwin')).toBe(true)
      expect(factory.isPlatformSupported('linux')).toBe(true)
      expect(factory.isPlatformSupported('win32')).toBe(false)
      expect(factory.isPlatformSupported('unknown')).toBe(false)
    })

    test("returns supported platforms list", () => {
      const platforms = factory.getSupportedPlatforms()
      expect(platforms).toEqual(['darwin', 'linux', 'mock'])
    })
  })

  describe("Adapter Creation", () => {
    test("creates mock adapter", () => {
      const adapter = factory.createAdapter('mock')
      expect(adapter).toBeDefined()
      expect(typeof adapter.getProcessList).toBe('function')
      expect(typeof adapter.getSystemMetrics).toBe('function')
    })

    test("creates adapter with auto-detection", () => {
      const adapter = factory.createAdapter()
      expect(adapter).toBeDefined()
    })

    test("caches adapters correctly", () => {
      const adapter1 = factory.createAdapter('mock')
      const adapter2 = factory.createAdapter('mock')
      expect(adapter1).toBe(adapter2) // Should be same instance
    })

    test("clears cache correctly", () => {
      const adapter1 = factory.createAdapter('mock')
      factory.clearCache()
      const adapter2 = factory.createAdapter('mock')
      expect(adapter1).not.toBe(adapter2) // Should be different instances
    })

    test("handles configuration updates", () => {
      const initialConfig = factory.getConfig()
      factory.updateConfig({ enableLogging: true })
      const updatedConfig = factory.getConfig()
      
      expect(initialConfig.enableLogging).toBe(false)
      expect(updatedConfig.enableLogging).toBe(true)
    })
  })

  describe("Error Handling", () => {
    test("falls back to mock on unsupported platform", () => {
      const factoryWithFallback = new ProcessAdapterFactory({ 
        platform: 'unknown' as SupportedPlatform,
        fallbackToMock: true 
      })
      
      // Should not throw and should return mock adapter
      expect(() => factoryWithFallback.createAdapter()).not.toThrow()
    })

    test("throws on unsupported platform without fallback", () => {
      const factoryWithoutFallback = new ProcessAdapterFactory({ 
        platform: 'unknown' as SupportedPlatform,
        fallbackToMock: false 
      })
      
      expect(() => factoryWithoutFallback.createAdapter()).toThrow()
    })
  })

  describe("Singleton Pattern", () => {
    test("returns same instance", () => {
      const instance1 = ProcessAdapterFactory.getInstance()
      const instance2 = ProcessAdapterFactory.getInstance()
      expect(instance1).toBe(instance2)
    })

    test("uses initial configuration", () => {
      // Clear the singleton first to test initial configuration
      (ProcessAdapterFactory as any).instance = null
      
      const config = { enableLogging: true }
      const instance = ProcessAdapterFactory.getInstance(config)
      expect(instance.getConfig().enableLogging).toBe(true)
    })
  })
})

describe("Convenience Functions", () => {
  test("createProcessAdapter works", () => {
    const adapter = createProcessAdapter()
    expect(adapter).toBeDefined()
    expect(typeof adapter.getProcessList).toBe('function')
  })

  test("createAdapterForPlatform works", () => {
    const adapter = createAdapterForPlatform('mock')
    expect(adapter).toBeDefined()
  })

  test("isCurrentPlatformSupported works", () => {
    const supported = isCurrentPlatformSupported()
    expect(typeof supported).toBe('boolean')
  })
})

describe("Platform Capabilities", () => {
  test("returns correct capabilities for mock platform", () => {
    const capabilities = getPlatformCapabilities('mock')
    
    expect(capabilities.platform).toBe('mock')
    expect(capabilities.processEnumeration).toBe(true)
    expect(capabilities.processManagement).toBe(false) // Mock doesn't actually manage processes
    expect(capabilities.systemMetrics).toBe(true)
    expect(capabilities.realTimeMonitoring).toBe(true)
    expect(capabilities.crossPlatformCompatible).toBe(true)
  })

  test("returns correct capabilities for darwin platform", () => {
    const capabilities = getPlatformCapabilities('darwin')
    
    expect(capabilities.platform).toBe('darwin')
    expect(capabilities.processEnumeration).toBe(true)
    expect(capabilities.processManagement).toBe(true)
    expect(capabilities.systemMetrics).toBe(true)
    expect(capabilities.realTimeMonitoring).toBe(true)
    expect(capabilities.crossPlatformCompatible).toBe(true)
  })

  test("returns correct capabilities for linux platform", () => {
    const capabilities = getPlatformCapabilities('linux')
    
    expect(capabilities.platform).toBe('linux')
    expect(capabilities.processEnumeration).toBe(true)
    expect(capabilities.processManagement).toBe(true)
    expect(capabilities.systemMetrics).toBe(true)
    expect(capabilities.realTimeMonitoring).toBe(true)
    expect(capabilities.crossPlatformCompatible).toBe(true)
  })
})

describe("Adapter Validation", () => {
  test("validates mock adapter successfully", async () => {
    const adapter = createAdapterForPlatform('mock')
    const validation = await validateAdapterRequirements(adapter)
    
    expect(validation.valid).toBe(true)
    expect(validation.issues.length).toBe(0)
    expect(Array.isArray(validation.warnings)).toBe(true)
  })

  test("handles validation errors gracefully", async () => {
    // Create a broken adapter for testing
    const brokenAdapter = {
      getProcessList: async () => { throw new Error('Test error') },
      getProcessInfo: async () => null,
      getSystemMetrics: async () => { throw new Error('Test error') },
      killProcess: async () => {},
      suspendProcess: async () => {},
      resumeProcess: async () => {}
    }

    const validation = await validateAdapterRequirements(brokenAdapter)
    
    expect(validation.valid).toBe(false)
    expect(validation.issues.length).toBeGreaterThan(0)
  })

  test("detects invalid return types", async () => {
    // Create an adapter with invalid return types
    const invalidAdapter = {
      getProcessList: async () => "not an array" as any,
      getProcessInfo: async () => null,
      getSystemMetrics: async () => ({ invalid: true }) as any,
      killProcess: async () => {},
      suspendProcess: async () => {},
      resumeProcess: async () => {}
    }

    const validation = await validateAdapterRequirements(invalidAdapter)
    
    expect(validation.valid).toBe(false)
    expect(validation.issues.some(issue => issue.includes('array'))).toBe(true)
  })
})