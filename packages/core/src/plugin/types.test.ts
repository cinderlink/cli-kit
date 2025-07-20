/**
 * Tests for packages/core/src/plugin/types.ts
 * 
 * Tests the plugin type definitions, interfaces, and utility functions
 * defined in types.ts according to one-file-one-test principle.
 */

import { test, expect, describe } from "bun:test"
import { Effect } from "effect"
import { createPlugin, PluginSchema } from "./types"

describe("Plugin Types", () => {
  
  test("createPlugin should create valid plugin with all required properties", () => {
    const plugin = createPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin for types validation'
    })

    expect(plugin.name).toBe('test-plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.metadata.name).toBe('test-plugin')
    expect(plugin.metadata.version).toBe('1.0.0')
    expect(plugin.metadata.description).toBe('Test plugin for types validation')
    expect(plugin.init).toBeDefined()
    expect(plugin.destroy).toBeDefined()
    expect(plugin.hooks).toBeDefined()
    expect(plugin.signals).toBeDefined()
  })

  test("createPlugin should support optional metadata fields", () => {
    const plugin = createPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test Author',
      dependencies: {
        'other-plugin': '1.0.0'
      }
    })

    expect(plugin.metadata.author).toBe('Test Author')
    expect(plugin.metadata.dependencies).toEqual({
      'other-plugin': '1.0.0'
    })
  })

  test("createPlugin should support hooks configuration", () => {
    const plugin = createPlugin({
      name: 'hooks-plugin',
      version: '1.0.0',
      description: 'Plugin with hooks',
      hooks: {
        'test:hook': {
          before: Effect.succeed(void 0),
          priority: 5
        }
      }
    })

    expect(plugin.hooks['test:hook']).toBeDefined()
    expect(plugin.hooks['test:hook'].before).toBeDefined()
    expect(plugin.hooks['test:hook'].priority).toBe(5)
  })

  test("createPlugin should support signals configuration", () => {
    const plugin = createPlugin({
      name: 'signals-plugin',
      version: '1.0.0',
      description: 'Plugin with signals',
      signals: {
        'test:signal': {
          name: 'test:signal',
          description: 'Test signal'
        }
      }
    })

    expect(plugin.signals['test:signal']).toBeDefined()
    expect(plugin.signals['test:signal'].name).toBe('test:signal')
    expect(plugin.signals['test:signal'].description).toBe('Test signal')
  })

  test("createPlugin should support services configuration", () => {
    const testService = {
      doSomething: () => 'result'
    }

    const plugin = createPlugin({
      name: 'services-plugin',
      version: '1.0.0',
      description: 'Plugin with services',
      services: {
        testService
      }
    })

    expect(plugin.services?.testService).toBe(testService)
  })

  test("createPlugin should support component configuration", () => {
    const TestComponent = () => null

    const plugin = createPlugin({
      name: 'component-plugin',
      version: '1.0.0',
      description: 'Plugin with component',
      component: TestComponent
    })

    expect(plugin.Component).toBe(TestComponent)
  })

  test("createPlugin should support config and defaultConfig", () => {
    const defaultConfig = { setting: 'default' }
    const config = { setting: 'custom' }

    const plugin = createPlugin({
      name: 'config-plugin',
      version: '1.0.0',
      description: 'Plugin with config',
      config,
      defaultConfig
    })

    expect(plugin.config).toBe(config)
    expect(plugin.defaultConfig).toBe(defaultConfig)
  })

  test("plugin should have Effect-based lifecycle methods", async () => {
    const plugin = createPlugin({
      name: 'lifecycle-plugin',
      version: '1.0.0',
      description: 'Plugin for lifecycle testing'
    })

    // Test that init and destroy are Effect types
    expect(plugin.init).toBeDefined()
    expect(plugin.destroy).toBeDefined()

    // Test that they can be executed (they should succeed with void)
    const destroyResult = await Effect.runPromise(plugin.destroy)
    expect(destroyResult).toBeUndefined()
  })

  test("PluginSchema should validate plugin structure", () => {
    const validPlugin = {
      name: 'valid-plugin',
      version: '1.0.0',
      metadata: {
        name: 'valid-plugin',
        version: '1.0.0'
      },
      init: Effect.succeed(void 0),
      destroy: Effect.succeed(void 0),
      hooks: {},
      signals: {}
    }

    const result = PluginSchema.safeParse(validPlugin)
    expect(result.success).toBe(true)
  })

  test("PluginSchema should reject invalid plugin structure", () => {
    const invalidPlugin = {
      name: 'invalid-plugin',
      // Missing required fields
    }

    const result = PluginSchema.safeParse(invalidPlugin)
    expect(result.success).toBe(false)
  })

  test("plugin types should support kitchen-sink demo patterns", () => {
    // Test ProcessManagerPlugin pattern
    const processManagerPlugin = createPlugin({
      name: 'process-manager',
      version: '1.0.0',
      description: 'Process manager plugin',
      services: {
        processManager: {
          startProcess: () => Effect.succeed({
            id: 'test-id',
            name: 'test-process',
            command: 'echo',
            args: ['hello'],
            status: 'running' as const,
            pid: 12345,
            startTime: new Date()
          }),
          stopProcess: () => Effect.succeed(void 0),
          listProcesses: () => Effect.succeed([])
        }
      }
    })

    expect(processManagerPlugin.name).toBe('process-manager')
    expect(processManagerPlugin.services?.processManager).toBeDefined()
  })

  test("plugin types should support customization (as='pm' pattern)", () => {
    const customPlugin = createPlugin({
      name: 'pm', // Custom name simulating as="pm"
      version: '1.0.0',
      description: 'Custom process manager instance'
    })

    expect(customPlugin.name).toBe('pm')
    expect(customPlugin.metadata.name).toBe('pm')
  })
})

describe("Plugin Type Definitions", () => {
  
  test("Plugin interface should enforce required fields", () => {
    const plugin = createPlugin({
      name: 'interface-test',
      version: '1.0.0',
      description: 'Interface validation test'
    })

    // TypeScript should enforce these exist
    expect(typeof plugin.name).toBe('string')
    expect(typeof plugin.version).toBe('string')
    expect(typeof plugin.metadata).toBe('object')
    expect(typeof plugin.init).toBe('object') // Effect object
    expect(typeof plugin.destroy).toBe('object') // Effect object
    expect(typeof plugin.hooks).toBe('object')
    expect(typeof plugin.signals).toBe('object')
  })

  test("Hook interface should support before/after/around patterns", () => {
    const plugin = createPlugin({
      name: 'hook-patterns-test',
      version: '1.0.0',
      description: 'Hook patterns test',
      hooks: {
        'before-hook': {
          before: Effect.succeed(void 0),
          priority: 0
        },
        'after-hook': {
          after: Effect.succeed(void 0),
          priority: 0
        },
        'around-hook': {
          around: (next) => next,
          priority: 0
        }
      }
    })

    expect(plugin.hooks['before-hook'].before).toBeDefined()
    expect(plugin.hooks['after-hook'].after).toBeDefined()
    expect(plugin.hooks['around-hook'].around).toBeDefined()
  })

  test("Signal interface should support typed signals", () => {
    const plugin = createPlugin({
      name: 'signal-types-test',
      version: '1.0.0',
      description: 'Signal types test',
      signals: {
        'typed-signal': {
          name: 'typed-signal',
          description: 'A typed signal for testing'
        }
      }
    })

    const signal = plugin.signals['typed-signal']
    expect(signal.name).toBe('typed-signal')
    expect(signal.description).toBe('A typed signal for testing')
  })

  test("plugin types should support performance requirements", () => {
    const startTime = performance.now()
    
    const plugin = createPlugin({
      name: 'performance-test',
      version: '1.0.0',
      description: 'Performance test plugin'
    })
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    expect(duration).toBeLessThan(1) // <1ms requirement
    expect(plugin).toBeDefined()
  })
})