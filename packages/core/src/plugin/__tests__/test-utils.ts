/**
 * Plugin Testing Utilities - Comprehensive testing framework for plugins
 * 
 * This module provides comprehensive testing utilities for the plugin system
 * including mocking, stubbing, lifecycle testing, and performance benchmarking.
 * 
 * ## Key Features:
 * 
 * ### Plugin Testing
 * - Mock plugin creation and configuration
 * - Plugin lifecycle testing utilities
 * - Plugin interaction testing
 * - Plugin isolation testing
 * 
 * ### Hook Testing
 * - Hook registration and execution testing
 * - Hook priority and ordering testing
 * - Hook error handling testing
 * - Hook performance testing
 * 
 * ### Signal Testing
 * - Signal emission and subscription testing
 * - Signal schema validation testing
 * - Signal performance testing
 * - Signal error handling testing
 * 
 * ### Performance Testing
 * - Plugin operation benchmarking
 * - Memory usage testing
 * - Performance regression detection
 * - Load testing utilities
 * 
 * @module core/plugin/__tests__/test-utils
 */

import { Effect, Ref } from "effect"
import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test"
import type {
  Plugin,
  PluginRegistry,
  PluginLoader,
  HookManager,
  SignalManager,
  Hook,
  Signal,
  PluginProps,
  ProcessInfo,
} from "../types"
import { createPluginRegistry } from "../registry"
import { createHookManager } from "../hooks"
import { createSignalManager } from "../signals"
import { createPlugin } from "../types"

// =============================================================================
// Mock Plugin Factory
// =============================================================================

/**
 * Mock plugin configuration
 */
export interface MockPluginConfig {
  readonly name?: string
  readonly version?: string
  readonly description?: string
  readonly hooks?: Record<string, Hook>
  readonly signals?: Record<string, Signal>
  readonly initShouldFail?: boolean
  readonly destroyShouldFail?: boolean
  readonly services?: Record<string, unknown>
}

/**
 * Create a mock plugin for testing
 */
export function createMockPlugin(config: MockPluginConfig = {}): Plugin {
  const {
    name = 'test-plugin',
    version = '1.0.0',
    description = 'Test plugin',
    hooks = {},
    signals = {},
    initShouldFail = false,
    destroyShouldFail = false,
    services = {},
  } = config

  return createPlugin({
    name,
    version,
    description,
    hooks,
    signals,
    services,
  })
}

/**
 * Create multiple mock plugins
 */
export function createMockPlugins(count: number, baseConfig: MockPluginConfig = {}): Plugin[] {
  return Array.from({ length: count }, (_, i) => 
    createMockPlugin({
      ...baseConfig,
      name: `${baseConfig.name || 'test-plugin'}-${i}`,
    })
  )
}

// =============================================================================
// Plugin Testing Utilities
// =============================================================================

/**
 * Plugin test utilities
 */
export interface PluginTestUtils {
  readonly createMockPlugin: (config?: MockPluginConfig) => Plugin
  readonly createTestRegistry: () => Promise<PluginRegistry>
  readonly createTestHookManager: () => Promise<HookManager>
  readonly createTestSignalManager: () => Promise<SignalManager>
  readonly simulatePluginLoad: (plugin: Plugin) => Promise<void>
  readonly simulatePluginUnload: (pluginName: string) => Promise<void>
  readonly assertPluginRegistered: (registry: PluginRegistry, name: string) => Promise<void>
  readonly assertHookExecuted: (hookName: string, times: number) => void
  readonly assertSignalEmitted: (signalName: string, times: number) => void
  readonly measurePluginPerformance: <T>(operation: () => Promise<T>) => Promise<PerformanceResult<T>>
  readonly createPluginSandbox: () => PluginSandbox
}

/**
 * Performance result
 */
export interface PerformanceResult<T> {
  readonly result: T
  readonly duration: number
  readonly memoryUsage: {
    readonly before: NodeJS.MemoryUsage
    readonly after: NodeJS.MemoryUsage
    readonly delta: NodeJS.MemoryUsage
  }
}

/**
 * Plugin sandbox for isolated testing
 */
export interface PluginSandbox {
  readonly registry: PluginRegistry
  readonly hookManager: HookManager
  readonly signalManager: SignalManager
  readonly registerPlugin: (plugin: Plugin) => Promise<void>
  readonly unregisterPlugin: (name: string) => Promise<void>
  readonly cleanup: () => Promise<void>
}

/**
 * Create plugin test utilities
 */
export function createPluginTestUtils(): PluginTestUtils {
  const hookExecutions = new Map<string, number>()
  const signalEmissions = new Map<string, number>()

  const createTestRegistry = async (): Promise<PluginRegistry> => {
    return await Effect.runPromise(createPluginRegistry())
  }

  const createTestHookManager = async (): Promise<HookManager> => {
    return await Effect.runPromise(createHookManager())
  }

  const createTestSignalManager = async (): Promise<SignalManager> => {
    return await Effect.runPromise(createSignalManager())
  }

  const simulatePluginLoad = async (plugin: Plugin): Promise<void> => {
    const registry = await createTestRegistry()
    await Effect.runPromise(registry.register(plugin))
  }

  const simulatePluginUnload = async (pluginName: string): Promise<void> => {
    const registry = await createTestRegistry()
    await Effect.runPromise(registry.unregister(pluginName))
  }

  const assertPluginRegistered = async (registry: PluginRegistry, name: string): Promise<void> => {
    const isRegistered = await Effect.runPromise(registry.isRegistered(name))
    expect(isRegistered).toBe(true)
  }

  const assertHookExecuted = (hookName: string, times: number): void => {
    const executions = hookExecutions.get(hookName) || 0
    expect(executions).toBe(times)
  }

  const assertSignalEmitted = (signalName: string, times: number): void => {
    const emissions = signalEmissions.get(signalName) || 0
    expect(emissions).toBe(times)
  }

  const measurePluginPerformance = async <T>(operation: () => Promise<T>): Promise<PerformanceResult<T>> => {
    const memoryBefore = process.memoryUsage()
    const startTime = performance.now()
    
    const result = await operation()
    
    const endTime = performance.now()
    const memoryAfter = process.memoryUsage()
    
    const memoryDelta: NodeJS.MemoryUsage = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
    }

    return {
      result,
      duration: endTime - startTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryDelta,
      },
    }
  }

  const createPluginSandbox = (): PluginSandbox => {
    let registry: PluginRegistry
    let hookManager: HookManager
    let signalManager: SignalManager
    let initialized = false

    const initialize = async () => {
      if (initialized) return
      
      registry = await createTestRegistry()
      hookManager = await createTestHookManager()
      signalManager = await createTestSignalManager()
      initialized = true
    }

    return {
      get registry() {
        if (!initialized) throw new Error('Sandbox not initialized')
        return registry
      },
      get hookManager() {
        if (!initialized) throw new Error('Sandbox not initialized')
        return hookManager
      },
      get signalManager() {
        if (!initialized) throw new Error('Sandbox not initialized')
        return signalManager
      },
      
      registerPlugin: async (plugin: Plugin) => {
        await initialize()
        await Effect.runPromise(registry.register(plugin))
      },
      
      unregisterPlugin: async (name: string) => {
        await initialize()
        await Effect.runPromise(registry.unregister(name))
      },
      
      cleanup: async () => {
        if (!initialized) return
        
        const plugins = await Effect.runPromise(registry.list())
        for (const plugin of plugins) {
          await Effect.runPromise(registry.unregister(plugin.name))
        }
        
        initialized = false
      },
    }
  }

  return {
    createMockPlugin,
    createTestRegistry,
    createTestHookManager,
    createTestSignalManager,
    simulatePluginLoad,
    simulatePluginUnload,
    assertPluginRegistered,
    assertHookExecuted,
    assertSignalEmitted,
    measurePluginPerformance,
    createPluginSandbox,
  }
}

// =============================================================================
// Test Data Generators
// =============================================================================

/**
 * Test data generators
 */
export const TestDataGenerators = {
  /**
   * Generate test plugin metadata
   */
  pluginMetadata: (overrides: Partial<any> = {}) => ({
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin for unit testing',
    author: 'Test Author',
    ...overrides,
  }),

  /**
   * Generate test hook
   */
  hook: (type: 'before' | 'after' | 'around' = 'before'): Hook => {
    switch (type) {
      case 'before':
        return {
          before: Effect.succeed(void 0),
          priority: 0,
        }
      case 'after':
        return {
          after: Effect.succeed(void 0),
          priority: 0,
        }
      case 'around':
        return {
          around: (next) => next,
          priority: 0,
        }
    }
  },

  /**
   * Generate test signal
   */
  signal: (name: string = 'test-signal'): Signal => ({
    name,
    description: `Test signal: ${name}`,
  }),

  /**
   * Generate test process info
   */
  processInfo: (overrides: Partial<ProcessInfo> = {}): ProcessInfo => ({
    id: crypto.randomUUID(),
    name: 'test-process',
    command: 'echo',
    args: ['hello', 'world'],
    status: 'running',
    pid: 12345,
    startTime: new Date(),
    ...overrides,
  }),

  /**
   * Generate test plugin props
   */
  pluginProps: (overrides: Partial<PluginProps> = {}): PluginProps => ({
    as: 'test-plugin',
    ...overrides,
  }),
}

// =============================================================================
// Test Assertions
// =============================================================================

/**
 * Plugin-specific test assertions
 */
export const PluginAssertions = {
  /**
   * Assert plugin structure is valid
   */
  isValidPlugin: (plugin: Plugin) => {
    expect(plugin).toBeDefined()
    expect(plugin.name).toBeTruthy()
    expect(plugin.version).toBeTruthy()
    expect(plugin.metadata).toBeDefined()
    expect(plugin.init).toBeDefined()
    expect(plugin.destroy).toBeDefined()
    expect(plugin.hooks).toBeDefined()
    expect(plugin.signals).toBeDefined()
  },

  /**
   * Assert hook is properly structured
   */
  isValidHook: (hook: Hook) => {
    expect(hook).toBeDefined()
    expect(hook.before || hook.after || hook.around).toBeTruthy()
    expect(typeof hook.priority).toBe('number')
  },

  /**
   * Assert signal is properly structured
   */
  isValidSignal: (signal: Signal) => {
    expect(signal).toBeDefined()
    expect(signal.name).toBeTruthy()
    expect(typeof signal.name).toBe('string')
  },

  /**
   * Assert plugin performance meets requirements
   */
  meetsPerformanceRequirements: (result: PerformanceResult<unknown>) => {
    expect(result.duration).toBeLessThan(10) // <10ms requirement
    expect(result.memoryUsage.delta.heapUsed).toBeLessThan(10 * 1024 * 1024) // <10MB
  },

  /**
   * Assert plugin error handling
   */
  handlesErrors: async (operation: () => Promise<unknown>) => {
    let errorThrown = false
    try {
      await operation()
    } catch (error) {
      errorThrown = true
      expect(error).toBeInstanceOf(Error)
    }
    expect(errorThrown).toBe(true)
  },
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Common test fixtures
 */
export const TestFixtures = {
  /**
   * Basic plugin fixture
   */
  basicPlugin: createMockPlugin({
    name: 'basic-plugin',
    version: '1.0.0',
    description: 'Basic test plugin',
  }),

  /**
   * Plugin with hooks fixture
   */
  pluginWithHooks: createMockPlugin({
    name: 'hooks-plugin',
    version: '1.0.0',
    hooks: {
      'test:hook': TestDataGenerators.hook('before'),
    },
  }),

  /**
   * Plugin with signals fixture
   */
  pluginWithSignals: createMockPlugin({
    name: 'signals-plugin',
    version: '1.0.0',
    signals: {
      'test:signal': TestDataGenerators.signal('test:signal'),
    },
  }),

  /**
   * Plugin with services fixture
   */
  pluginWithServices: createMockPlugin({
    name: 'services-plugin',
    version: '1.0.0',
    services: {
      testService: {
        doSomething: () => 'test result',
      },
    },
  }),

  /**
   * Complex plugin fixture
   */
  complexPlugin: createMockPlugin({
    name: 'complex-plugin',
    version: '1.0.0',
    description: 'Complex test plugin with all features',
    hooks: {
      'test:before': TestDataGenerators.hook('before'),
      'test:after': TestDataGenerators.hook('after'),
      'test:around': TestDataGenerators.hook('around'),
    },
    signals: {
      'test:signal1': TestDataGenerators.signal('test:signal1'),
      'test:signal2': TestDataGenerators.signal('test:signal2'),
    },
    services: {
      service1: { method: () => 'result1' },
      service2: { method: () => 'result2' },
    },
  }),
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Test helper functions
 */
export const TestHelpers = {
  /**
   * Wait for a specified duration
   */
  wait: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Create a delayed promise
   */
  delay: <T>(value: T, ms: number): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(value), ms))
  },

  /**
   * Simulate async operation
   */
  simulateAsync: async <T>(value: T, duration: number = 10): Promise<T> => {
    await TestHelpers.wait(duration)
    return value
  },

  /**
   * Create a failing promise
   */
  createFailingPromise: (error: Error, delay: number = 0): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(error), delay)
    })
  },

  /**
   * Run test with timeout
   */
  withTimeout: async <T>(promise: Promise<T>, timeout: number): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    })
    
    return Promise.race([promise, timeoutPromise])
  },

  /**
   * Cleanup test resources
   */
  cleanup: async (...cleanupFns: Array<() => Promise<void> | void>): Promise<void> => {
    for (const fn of cleanupFns) {
      try {
        await fn()
      } catch (error) {
        console.warn('Cleanup error:', error)
      }
    }
  },
}

// =============================================================================
// Export Plugin Test Suite
// =============================================================================

/**
 * Plugin test suite runner
 */
export class PluginTestSuite {
  private utils: PluginTestUtils
  private sandbox: PluginSandbox

  constructor() {
    this.utils = createPluginTestUtils()
    this.sandbox = this.utils.createPluginSandbox()
  }

  /**
   * Run plugin registration tests
   */
  async testPluginRegistration(plugin: Plugin): Promise<void> {
    await this.sandbox.registerPlugin(plugin)
    await this.utils.assertPluginRegistered(this.sandbox.registry, plugin.name)
  }

  /**
   * Run plugin lifecycle tests
   */
  async testPluginLifecycle(plugin: Plugin): Promise<void> {
    // Test registration
    await this.testPluginRegistration(plugin)
    
    // Test unregistration
    await this.sandbox.unregisterPlugin(plugin.name)
    const isRegistered = await Effect.runPromise(this.sandbox.registry.isRegistered(plugin.name))
    expect(isRegistered).toBe(false)
  }

  /**
   * Run plugin performance tests
   */
  async testPluginPerformance(plugin: Plugin): Promise<void> {
    const registrationResult = await this.utils.measurePluginPerformance(async () => {
      await this.sandbox.registerPlugin(plugin)
    })
    
    PluginAssertions.meetsPerformanceRequirements(registrationResult)
  }

  /**
   * Run hook system tests
   */
  async testHookSystem(plugin: Plugin): Promise<void> {
    await this.sandbox.registerPlugin(plugin)
    
    // Test hook execution
    for (const [hookName, hook] of Object.entries(plugin.hooks)) {
      PluginAssertions.isValidHook(hook)
      
      if (hook.before) {
        await Effect.runPromise(this.sandbox.hookManager.executeBefore(hookName))
      }
      
      if (hook.after) {
        await Effect.runPromise(this.sandbox.hookManager.executeAfter(hookName, 'test-result'))
      }
    }
  }

  /**
   * Run signal system tests
   */
  async testSignalSystem(plugin: Plugin): Promise<void> {
    await this.sandbox.registerPlugin(plugin)
    
    // Test signal emission and subscription
    for (const [signalName, signal] of Object.entries(plugin.signals)) {
      PluginAssertions.isValidSignal(signal)
      
      let signalReceived = false
      const handler = (data: unknown) => Effect.sync(() => {
        signalReceived = true
      })
      
      await Effect.runPromise(this.sandbox.signalManager.subscribe(signalName, handler))
      await Effect.runPromise(this.sandbox.signalManager.emit(signalName, 'test-data'))
      
      expect(signalReceived).toBe(true)
    }
  }

  /**
   * Run complete plugin test suite
   */
  async runFullTestSuite(plugin: Plugin): Promise<void> {
    try {
      PluginAssertions.isValidPlugin(plugin)
      
      await this.testPluginRegistration(plugin)
      await this.testPluginLifecycle(plugin)
      await this.testPluginPerformance(plugin)
      await this.testHookSystem(plugin)
      await this.testSignalSystem(plugin)
      
      console.log(`✅ Plugin ${plugin.name} passed all tests`)
    } catch (error) {
      console.error(`❌ Plugin ${plugin.name} failed tests:`, error)
      throw error
    } finally {
      await this.sandbox.cleanup()
    }
  }
}

// =============================================================================
// Export Testing API
// =============================================================================

// Main exports are at the function definitions above
// This section is for re-exporting if needed

/**
 * Helper function to run plugin init with mock PluginDeps
 */
export async function runPluginInit(plugin: Plugin): Promise<void> {
  const { Effect, Layer } = await import("effect")
  const { PluginDepsService } = await import("../types")
  
  const mockPluginDeps = {
    terminal: {},
    input: {},
    renderer: {},
    storage: {},
    config: {}
  }
  const pluginDepsLayer = Layer.succeed(PluginDepsService, mockPluginDeps)
  return await Effect.runPromise(Effect.provide(plugin.init, pluginDepsLayer))
}