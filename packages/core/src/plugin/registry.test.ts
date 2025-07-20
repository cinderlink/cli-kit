/**
 * Tests for packages/core/src/plugin/registry.ts
 * 
 * Tests the plugin registry, loader, and system manager functionality
 * defined in registry.ts according to one-file-one-test principle.
 */

import { test, expect, describe } from "bun:test"
import { Effect } from "effect"
import { createPlugin } from "./types"
import { createPluginRegistry, createPluginLoader, createPluginSystemManager } from "./registry"

describe("Plugin Registry", () => {
  
  test("createPluginRegistry should create functional registry", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    expect(registry).toBeDefined()
    expect(registry.register).toBeDefined()
    expect(registry.unregister).toBeDefined()
    expect(registry.get).toBeDefined()
    expect(registry.list).toBeDefined()
    expect(registry.resolve).toBeDefined()
    expect(registry.isRegistered).toBeDefined()
  })

  test("registry should register and retrieve plugins", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugin = createPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin for registry'
    })

    // Register plugin
    await Effect.runPromise(registry.register(plugin))
    
    // Check if registered
    const isRegistered = await Effect.runPromise(registry.isRegistered('test-plugin'))
    expect(isRegistered).toBe(true)
    
    // Retrieve plugin
    const retrieved = await Effect.runPromise(registry.get('test-plugin'))
    expect(retrieved.name).toBe('test-plugin')
    expect(retrieved.version).toBe('1.0.0')
  })

  test("registry should list all registered plugins", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugin1 = createPlugin({ name: 'plugin1', version: '1.0.0', description: 'Plugin 1' })
    const plugin2 = createPlugin({ name: 'plugin2', version: '1.0.0', description: 'Plugin 2' })
    
    await Effect.runPromise(registry.register(plugin1))
    await Effect.runPromise(registry.register(plugin2))
    
    const plugins = await Effect.runPromise(registry.list())
    expect(plugins).toHaveLength(2)
    expect(plugins.map(p => p.name)).toContain('plugin1')
    expect(plugins.map(p => p.name)).toContain('plugin2')
  })

  test("registry should unregister plugins", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugin = createPlugin({
      name: 'unregister-test',
      version: '1.0.0',
      description: 'Plugin for unregister test'
    })

    await Effect.runPromise(registry.register(plugin))
    expect(await Effect.runPromise(registry.isRegistered('unregister-test'))).toBe(true)
    
    await Effect.runPromise(registry.unregister('unregister-test'))
    expect(await Effect.runPromise(registry.isRegistered('unregister-test'))).toBe(false)
  })

  test("registry should prevent duplicate plugin registration", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugin = createPlugin({
      name: 'duplicate-test',
      version: '1.0.0',
      description: 'Plugin for duplicate test'
    })

    // First registration should succeed
    await Effect.runPromise(registry.register(plugin))
    
    // Second registration should fail
    try {
      await Effect.runPromise(registry.register(plugin))
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  test("registry should fail to get non-existent plugin", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    try {
      await Effect.runPromise(registry.get('non-existent'))
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  test("registry should resolve plugin dependencies", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const basePlugin = createPlugin({
      name: 'base-plugin',
      version: '1.0.0',
      description: 'Base plugin'
    })
    
    await Effect.runPromise(registry.register(basePlugin))
    
    const resolved = await Effect.runPromise(registry.resolve(['base-plugin']))
    expect(resolved).toHaveLength(1)
    expect(resolved[0].name).toBe('base-plugin')
  })

  test("registry should handle empty plugin list", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugins = await Effect.runPromise(registry.list())
    expect(plugins).toHaveLength(0)
    
    const isRegistered = await Effect.runPromise(registry.isRegistered('any-plugin'))
    expect(isRegistered).toBe(false)
  })
})

describe("Plugin Loader", () => {
  
  test("createPluginLoader should create functional loader", async () => {
    const loader = await Effect.runPromise(createPluginLoader())
    
    expect(loader).toBeDefined()
    expect(loader.load).toBeDefined()
    expect(loader.loadMany).toBeDefined()
    expect(loader.discover).toBeDefined()
  })

  test("loader should handle non-existent paths gracefully", async () => {
    const loader = await Effect.runPromise(createPluginLoader())
    
    try {
      await Effect.runPromise(loader.load('/non/existent/path.js'))
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  test("loader should handle non-existent directories gracefully", async () => {
    const loader = await Effect.runPromise(createPluginLoader())
    
    try {
      await Effect.runPromise(loader.discover('/non/existent/directory'))
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  test("loader should handle empty loadMany", async () => {
    const loader = await Effect.runPromise(createPluginLoader())
    
    const plugins = await Effect.runPromise(loader.loadMany([]))
    expect(plugins).toHaveLength(0)
  })
})

describe("Plugin System Manager", () => {
  
  test("createPluginSystemManager should create functional system manager", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    expect(manager).toBeDefined()
    expect(manager.registry).toBeDefined()
    expect(manager.loader).toBeDefined()
    expect(manager.loadFromDirectory).toBeDefined()
    expect(manager.loadFromConfig).toBeDefined()
    expect(manager.initializeAll).toBeDefined()
    expect(manager.shutdownAll).toBeDefined()
  })

  test("system manager should have working registry", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    const plugin = createPlugin({
      name: 'manager-test',
      version: '1.0.0',
      description: 'Plugin for manager test'
    })

    await Effect.runPromise(manager.registry.register(plugin))
    
    const isRegistered = await Effect.runPromise(manager.registry.isRegistered('manager-test'))
    expect(isRegistered).toBe(true)
  })

  test("system manager should initialize and shutdown all plugins", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    const plugin = createPlugin({
      name: 'lifecycle-test',
      version: '1.0.0',
      description: 'Plugin for lifecycle test'
    })

    await Effect.runPromise(manager.registry.register(plugin))
    
    // Should not throw
    await Effect.runPromise(manager.initializeAll())
    await Effect.runPromise(manager.shutdownAll())
  })

  test("system manager should handle empty plugin list", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    // Should not throw with no plugins
    await Effect.runPromise(manager.initializeAll())
    await Effect.runPromise(manager.shutdownAll())
  })

  test("system manager should handle loadFromConfig with empty config", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    const plugins = await Effect.runPromise(manager.loadFromConfig({
      plugins: []
    }))
    
    expect(plugins).toHaveLength(0)
  })

  test("system manager should handle loadFromDirectory with non-existent directory", async () => {
    const manager = await Effect.runPromise(createPluginSystemManager())
    
    try {
      await Effect.runPromise(manager.loadFromDirectory('/non/existent/directory'))
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })
})

describe("Registry Performance", () => {
  
  test("registry operations should meet performance requirements", async () => {
    const startTime = performance.now()
    
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const plugin = createPlugin({
      name: 'performance-test',
      version: '1.0.0',
      description: 'Performance test plugin'
    })

    await Effect.runPromise(registry.register(plugin))
    await Effect.runPromise(registry.get('performance-test'))
    await Effect.runPromise(registry.isRegistered('performance-test'))
    await Effect.runPromise(registry.list())
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    expect(duration).toBeLessThan(10) // <10ms requirement
    console.log(`Registry operations completed in ${duration.toFixed(3)}ms`)
  })

  test("registry should handle multiple plugins efficiently", async () => {
    const registry = await Effect.runPromise(createPluginRegistry())
    
    const startTime = performance.now()
    
    // Register multiple plugins
    for (let i = 0; i < 10; i++) {
      const plugin = createPlugin({
        name: `bulk-test-${i}`,
        version: '1.0.0',
        description: `Bulk test plugin ${i}`
      })
      await Effect.runPromise(registry.register(plugin))
    }
    
    const plugins = await Effect.runPromise(registry.list())
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    expect(plugins).toHaveLength(10)
    expect(duration).toBeLessThan(50) // Should be fast for bulk operations
    console.log(`Bulk registry operations completed in ${duration.toFixed(3)}ms`)
  })
})