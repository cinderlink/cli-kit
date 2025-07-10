/**
 * Tests for Plugin Registry
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { PluginRegistry, type RegistryOptions, type RegisteredPlugin } from "@/cli/registry"
import type { Plugin } from "@/cli/plugin"

describe("Plugin Registry", () => {
  let registry: PluginRegistry
  let testPlugin: Plugin

  beforeEach(() => {
    registry = new PluginRegistry()
    testPlugin = {
      metadata: {
        name: "test-plugin",
        version: "1.0.0"
      },
      commands: {
        test: {
          description: "Test command",
          handler: async () => {}
        }
      }
    }
  })

  describe("constructor", () => {
    it("creates registry with default options", () => {
      expect(registry).toBeDefined()
    })

    it("creates registry with custom options", () => {
      const options: RegistryOptions = {
        autoEnable: false,
        validateDependencies: false,
        allowDuplicates: true
      }
      const customRegistry = new PluginRegistry(options)
      expect(customRegistry).toBeDefined()
    })
  })

  describe("register", () => {
    it("registers a valid plugin", () => {
      const result = registry.register(testPlugin)
      expect(result).toBe(true)
      expect(registry.get("test-plugin")).toBeDefined()
    })

    it("auto-enables plugin by default", () => {
      registry.register(testPlugin)
      const registered = registry.get("test-plugin")
      expect(registered?.enabled).toBe(true)
    })

    it("respects autoEnable option", () => {
      registry = new PluginRegistry({ autoEnable: false })
      registry.register(testPlugin)
      const registered = registry.get("test-plugin")
      expect(registered?.enabled).toBe(false)
    })

    it("prevents duplicate registration by default", () => {
      registry.register(testPlugin)
      const result = registry.register(testPlugin)
      expect(result).toBe(false)
    })

    it("allows duplicates when configured", () => {
      registry = new PluginRegistry({ allowDuplicates: true })
      registry.register(testPlugin)
      const result = registry.register(testPlugin)
      expect(result).toBe(true)
    })

    it("validates plugin dependencies", () => {
      const pluginWithDeps: Plugin = {
        metadata: {
          name: "dependent-plugin",
          version: "1.0.0",
          dependencies: { "missing-dep": "*" }
        },
        commands: {}
      }
      
      const result = registry.register(pluginWithDeps)
      expect(result).toBe(false)
    })

    it("registers plugin with satisfied dependencies", () => {
      registry.register(testPlugin)
      
      const dependentPlugin: Plugin = {
        metadata: {
          name: "dependent-plugin",
          version: "1.0.0",
          dependencies: { "test-plugin": "*" }
        },
        commands: {}
      }
      
      const result = registry.register(dependentPlugin)
      expect(result).toBe(true)
    })

    it("stores plugin config", () => {
      const config = { apiKey: "test-key" }
      registry.register(testPlugin, config)
      const registered = registry.get("test-plugin")
      expect(registered?.config).toEqual(config)
    })

    it("updates dependency graph", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin1",
          version: "1.0.0"
        },
        commands: {}
      }
      
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0",
          dependencies: { "plugin1": "*" }
        },
        commands: {}
      }
      
      registry.register(plugin1)
      registry.register(plugin2)
      
      const plugin1Info = registry.get("plugin1")
      expect(plugin1Info?.dependents).toContain("plugin2")
    })
  })

  describe("unregister", () => {
    it("removes registered plugin", () => {
      registry.register(testPlugin)
      const result = registry.unregister("test-plugin")
      expect(result).toBe(true)
      expect(registry.get("test-plugin")).toBeUndefined()
    })

    it("returns false for non-existent plugin", () => {
      const result = registry.unregister("non-existent")
      expect(result).toBe(false)
    })

    it("prevents unregistering with dependents", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin1",
          version: "1.0.0"
        },
        commands: {}
      }
      
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0",
          dependencies: { "plugin1": "*" }
        },
        commands: {}
      }
      
      registry.register(plugin1)
      registry.register(plugin2)
      
      const result = registry.unregister("plugin1")
      expect(result).toBe(false)
      expect(registry.get("plugin1")).toBeDefined()
    })

    it("allows force unregister", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin1",
          version: "1.0.0"
        },
        commands: {}
      }
      
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0",
          dependencies: { "plugin1": "*" }
        },
        commands: {}
      }
      
      registry.register(plugin1)
      registry.register(plugin2)
      
      const result = registry.unregister("plugin1", true)
      expect(result).toBe(true)
      expect(registry.get("plugin1")).toBeUndefined()
    })
  })

  describe("enable/disable", () => {
    beforeEach(() => {
      registry.register(testPlugin)
    })

    it("enables a disabled plugin", () => {
      registry.disable("test-plugin")
      const result = registry.enable("test-plugin")
      expect(result).toBe(true)
      expect(registry.get("test-plugin")?.enabled).toBe(true)
    })

    it("disables an enabled plugin", () => {
      const result = registry.disable("test-plugin")
      expect(result).toBe(true)
      expect(registry.get("test-plugin")?.enabled).toBe(false)
    })

    it("returns false for non-existent plugin", () => {
      expect(registry.enable("non-existent")).toBe(false)
      expect(registry.disable("non-existent")).toBe(false)
    })

    it("triggers lifecycle hooks", () => {
      let enabledCalled = false
      let disabledCalled = false
      
      const pluginWithHooks: Plugin = {
        metadata: {
          name: "hooks-plugin",
          version: "1.0.0"
        },
        commands: {},
        activate: async () => { enabledCalled = true },
        deactivate: async () => { disabledCalled = true }
      }
      
      registry.register(pluginWithHooks)
      registry.disable("hooks-plugin")
      expect(disabledCalled).toBe(true)
      
      registry.enable("hooks-plugin")
      expect(enabledCalled).toBe(true)
    })
  })

  describe("get/getAll", () => {
    it("retrieves registered plugin", () => {
      registry.register(testPlugin)
      const plugin = registry.get("test-plugin")
      expect(plugin?.plugin.metadata.name).toBe("test-plugin")
    })

    it("returns undefined for non-existent plugin", () => {
      const plugin = registry.get("non-existent")
      expect(plugin).toBeUndefined()
    })

    it("retrieves all plugins", () => {
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0"
        },
        commands: {}
      }
      
      registry.register(testPlugin)
      registry.register(plugin2)
      
      const all = registry.getAll()
      expect(all.length).toBe(2)
      expect(all.some(p => p.plugin.metadata.name === "test-plugin")).toBe(true)
      expect(all.some(p => p.plugin.metadata.name === "plugin2")).toBe(true)
    })

    it("filters by enabled status", () => {
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0"
        },
        commands: {}
      }
      
      registry.register(testPlugin)
      registry.register(plugin2)
      registry.disable("plugin2")
      
      const enabled = registry.getAll(true)
      expect(enabled.length).toBe(1)
      expect(enabled[0].plugin.metadata.name).toBe("test-plugin")
    })
  })

  describe("getCommands", () => {
    it("returns commands from all enabled plugins", () => {
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0"
        },
        commands: {
          cmd2: {
            description: "Command 2",
            handler: async () => {}
          }
        }
      }
      
      registry.register(testPlugin)
      registry.register(plugin2)
      
      const commands = registry.getCommands()
      expect(commands.test).toBeDefined()
      expect(commands.cmd2).toBeDefined()
    })

    it("excludes commands from disabled plugins", () => {
      registry.register(testPlugin)
      registry.disable("test-plugin")
      
      const commands = registry.getCommands()
      expect(commands.test).toBeUndefined()
    })

    it("handles command conflicts", () => {
      const conflictPlugin: Plugin = {
        metadata: {
          name: "conflict-plugin",
          version: "1.0.0"
        },
        commands: {
          test: {
            description: "Conflicting command",
            handler: async () => {}
          }
        }
      }
      
      registry.register(testPlugin)
      registry.register(conflictPlugin)
      
      const commands = registry.getCommands()
      // First plugin wins by default
      expect(commands.test.description).toBe("Test command")
    })
  })

  describe("getDependencyOrder", () => {
    it("returns plugins in dependency order", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin1",
          version: "1.0.0"
        },
        commands: {}
      }
      
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0",
          dependencies: { "plugin1": "*" }
        },
        commands: {}
      }
      
      const plugin3: Plugin = {
        metadata: {
          name: "plugin3",
          version: "1.0.0",
          dependencies: { "plugin2": "*" }
        },
        commands: {}
      }
      
      registry.register(plugin1)
      registry.register(plugin3)
      registry.register(plugin2)
      
      const order = registry.getDependencyOrder()
      const names = order.map(p => p.plugin.metadata.name)
      
      expect(names.indexOf("plugin1")).toBeLessThan(names.indexOf("plugin2"))
      expect(names.indexOf("plugin2")).toBeLessThan(names.indexOf("plugin3"))
    })

    it("handles circular dependencies", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin1",
          version: "1.0.0",
          dependencies: { "plugin2": "*" }
        },
        commands: {}
      }
      
      const plugin2: Plugin = {
        metadata: {
          name: "plugin2",
          version: "1.0.0",
          dependencies: { "plugin1": "*" }
        },
        commands: {}
      }
      
      // Should not register due to validation
      registry.register(plugin1)
      const result = registry.register(plugin2)
      expect(result).toBe(false)
    })
  })

  describe("applyMiddleware", () => {
    it("applies middleware to config", () => {
      const middleware: Plugin = {
        metadata: {
          name: "middleware-plugin",
          version: "1.0.0"
        },
        commands: {},
        middleware: {
          beforeConfig: (config) => ({
            ...config,
            modified: true
          })
        }
      }
      
      registry.register(middleware)
      
      const config: any = { name: "test-cli", version: "1.0.0" }
      const modified = registry.applyMiddleware("beforeConfig", config)
      
      expect(modified.modified).toBe(true)
    })

    it("applies multiple middleware in order", () => {
      const middleware1: Plugin = {
        metadata: {
          name: "middleware1",
          version: "1.0.0"
        },
        commands: {},
        middleware: {
          beforeConfig: (config) => ({
            ...config,
            step1: true
          })
        }
      }
      
      const middleware2: Plugin = {
        metadata: {
          name: "middleware2",
          version: "1.0.0"
        },
        commands: {},
        middleware: {
          beforeConfig: (config) => ({
            ...config,
            step2: true
          })
        }
      }
      
      registry.register(middleware1)
      registry.register(middleware2)
      
      const config: any = { name: "test-cli", version: "1.0.0" }
      const modified = registry.applyMiddleware("beforeConfig", config)
      
      expect(modified.step1).toBe(true)
      expect(modified.step2).toBe(true)
    })

    it("skips disabled plugin middleware", () => {
      const middleware: Plugin = {
        metadata: {
          name: "middleware-plugin",
          version: "1.0.0"
        },
        commands: {},
        middleware: {
          beforeConfig: (config) => ({
            ...config,
            modified: true
          })
        }
      }
      
      registry.register(middleware)
      registry.disable("middleware-plugin")
      
      const config: any = { name: "test-cli", version: "1.0.0" }
      const modified = registry.applyMiddleware("beforeConfig", config)
      
      expect(modified.modified).toBeUndefined()
    })
  })

  describe("validatePlugin", () => {
    it("validates plugin structure", () => {
      const valid = registry.validatePlugin(testPlugin)
      expect(valid).toBe(true)
    })

    it("rejects invalid plugin", () => {
      const invalid: any = {
        // Missing required fields
        commands: {}
      }
      
      const valid = registry.validatePlugin(invalid)
      expect(valid).toBe(false)
    })

    it("validates version format", () => {
      const invalidVersion: Plugin = {
        metadata: {
          name: "test",
          version: "invalid-version"
        },
        commands: {}
      }
      
      const valid = registry.validatePlugin(invalidVersion)
      expect(valid).toBe(false)
    })
  })

  describe("clear", () => {
    it("removes all plugins", () => {
      registry.register(testPlugin)
      registry.clear()
      expect(registry.getAll()).toEqual([])
    })

    it("triggers onDisable for all plugins", () => {
      let disableCalled = false
      
      const pluginWithHook: Plugin = {
        metadata: {
          name: "hook-plugin",
          version: "1.0.0"
        },
        commands: {},
        deactivate: async () => { disableCalled = true }
      }
      
      registry.register(pluginWithHook)
      registry.clear()
      expect(disableCalled).toBe(true)
    })
  })
})