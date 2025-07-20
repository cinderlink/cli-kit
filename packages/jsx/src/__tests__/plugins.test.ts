/**
 * Tests for plugin system
 * Covers PluginRegistry, RegisterPlugin, EnablePlugin, ConfigurePlugin, Plugin, LoadPlugin
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { 
  PluginRegistry, 
  pluginRegistry,
  RegisterPlugin, 
  EnablePlugin, 
  ConfigurePlugin, 
  Plugin, 
  LoadPlugin 
} from "../plugins"

describe("Plugin System", () => {
  let testRegistry: PluginRegistry

  beforeEach(() => {
    testRegistry = new PluginRegistry()
  })

  describe("PluginRegistry", () => {
    test("should register plugins", () => {
      const mockPlugin = { name: "test-plugin", version: "1.0.0" }
      
      testRegistry.register(mockPlugin, { as: "test" })
      
      expect(testRegistry.get("test")).toBe(mockPlugin)
      expect(testRegistry.isEnabled("test")).toBe(true)
    })

    test("should handle plugin registration options", () => {
      const mockPlugin = { name: "advanced-plugin" }
      
      testRegistry.register(mockPlugin, {
        as: "advanced",
        alias: "adv",
        enabled: false,
        config: { setting1: "value1" }
      })
      
      expect(testRegistry.get("advanced")).toBe(mockPlugin)
      expect(testRegistry.get("adv")).toBe(mockPlugin)
      expect(testRegistry.isEnabled("advanced")).toBe(false)
      expect(testRegistry.isEnabled("adv")).toBe(false)
      expect(testRegistry.getConfig("advanced")).toEqual({ setting1: "value1" })
    })

    test("should enable and disable plugins", () => {
      const mockPlugin = { name: "toggle-plugin" }
      testRegistry.register(mockPlugin, { as: "toggle", enabled: false })
      
      expect(testRegistry.isEnabled("toggle")).toBe(false)
      
      testRegistry.enable("toggle", true)
      expect(testRegistry.isEnabled("toggle")).toBe(true)
      
      testRegistry.enable("toggle", false)
      expect(testRegistry.isEnabled("toggle")).toBe(false)
    })

    test("should configure plugins", () => {
      const mockPlugin = { name: "config-plugin" }
      testRegistry.register(mockPlugin, { as: "config" })
      
      testRegistry.configure("config", { setting1: "value1" })
      expect(testRegistry.getConfig("config")).toEqual({ setting1: "value1" })
      
      testRegistry.configure("config", { setting2: "value2" })
      expect(testRegistry.getConfig("config")).toEqual({ 
        setting1: "value1", 
        setting2: "value2" 
      })
    })

    test("should get all enabled plugins", () => {
      const plugin1 = { name: "plugin1" }
      const plugin2 = { name: "plugin2" }
      const plugin3 = { name: "plugin3" }
      
      testRegistry.register(plugin1, { as: "p1", enabled: true })
      testRegistry.register(plugin2, { as: "p2", enabled: false })
      testRegistry.register(plugin3, { as: "p3", enabled: true, config: { test: true } })
      
      const enabled = testRegistry.getAllEnabled()
      
      expect(enabled).toHaveLength(2)
      expect(enabled[0].name).toBe("p1")
      expect(enabled[0].plugin).toBe(plugin1)
      expect(enabled[1].name).toBe("p3")
      expect(enabled[1].plugin).toBe(plugin3)
      expect(enabled[1].config).toEqual({ test: true })
    })

    test("should handle non-existent plugins", () => {
      expect(testRegistry.get("non-existent")).toBeUndefined()
      expect(testRegistry.isEnabled("non-existent")).toBe(false)
      expect(testRegistry.getConfig("non-existent")).toEqual({})
    })

    test("should default to plugin name when no 'as' option", () => {
      const mockPlugin = { name: "auto-named-plugin" }
      testRegistry.register(mockPlugin)
      
      expect(testRegistry.get("auto-named-plugin")).toBe(mockPlugin)
      expect(testRegistry.isEnabled("auto-named-plugin")).toBe(true)
    })

    test("should generate ID when plugin has no name", () => {
      const mockPlugin = { description: "No name plugin" }
      testRegistry.register(mockPlugin, { as: "manual-name" })
      
      expect(testRegistry.get("manual-name")).toBe(mockPlugin)
    })
  })

  describe("RegisterPlugin component", () => {
    test("should register plugin when rendered", () => {
      const mockPlugin = { name: "jsx-plugin", version: "1.0.0" }
      
      const result = RegisterPlugin({
        plugin: mockPlugin,
        as: "jsx-test",
        enabled: true
      })
      
      // Component should be invisible
      expect(result.render()).toBe("")
      
      // Plugin should be registered in global registry
      expect(pluginRegistry.get("jsx-test")).toBe(mockPlugin)
      expect(pluginRegistry.isEnabled("jsx-test")).toBe(true)
    })

    test("should handle registration with config", () => {
      const mockPlugin = { name: "config-plugin" }
      
      const result = RegisterPlugin({
        plugin: mockPlugin,
        as: "configured",
        config: { apiKey: "secret", timeout: 5000 }
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.getConfig("configured")).toEqual({
        apiKey: "secret",
        timeout: 5000
      })
    })

    test("should handle registration with alias", () => {
      const mockPlugin = { name: "alias-plugin" }
      
      const result = RegisterPlugin({
        plugin: mockPlugin,
        as: "aliased",
        alias: "short"
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.get("aliased")).toBe(mockPlugin)
      expect(pluginRegistry.get("short")).toBe(mockPlugin)
    })
  })

  describe("EnablePlugin component", () => {
    test("should enable plugin when rendered", () => {
      // First register a plugin
      const mockPlugin = { name: "enable-test" }
      pluginRegistry.register(mockPlugin, { as: "enable-test", enabled: false })
      
      const result = EnablePlugin({
        name: "enable-test",
        enabled: true
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.isEnabled("enable-test")).toBe(true)
    })

    test("should disable plugin when enabled=false", () => {
      const mockPlugin = { name: "disable-test" }
      pluginRegistry.register(mockPlugin, { as: "disable-test", enabled: true })
      
      const result = EnablePlugin({
        name: "disable-test",
        enabled: false
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.isEnabled("disable-test")).toBe(false)
    })

    test("should configure plugin while enabling", () => {
      const mockPlugin = { name: "config-enable-test" }
      pluginRegistry.register(mockPlugin, { as: "config-enable-test" })
      
      const result = EnablePlugin({
        name: "config-enable-test",
        config: { newSetting: "value" }
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.getConfig("config-enable-test")).toEqual({
        newSetting: "value"
      })
    })

    test("should default to enabled=true", () => {
      const mockPlugin = { name: "default-enable" }
      pluginRegistry.register(mockPlugin, { as: "default-enable", enabled: false })
      
      const result = EnablePlugin({
        name: "default-enable"
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.isEnabled("default-enable")).toBe(true)
    })
  })

  describe("ConfigurePlugin component", () => {
    test("should configure existing plugin", () => {
      const mockPlugin = { name: "configure-test" }
      pluginRegistry.register(mockPlugin, { as: "configure-test" })
      
      const result = ConfigurePlugin({
        name: "configure-test",
        config: { database: "mongodb", port: 27017 }
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.getConfig("configure-test")).toEqual({
        database: "mongodb",
        port: 27017
      })
    })

    test("should merge with existing configuration", () => {
      const mockPlugin = { name: "merge-test" }
      pluginRegistry.register(mockPlugin, { 
        as: "merge-test",
        config: { existing: "value", overwrite: "old" }
      })
      
      const result = ConfigurePlugin({
        name: "merge-test",
        config: { overwrite: "new", additional: "extra" }
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.getConfig("merge-test")).toEqual({
        existing: "value",
        overwrite: "new",
        additional: "extra"
      })
    })
  })

  describe("Plugin component", () => {
    test("should define declarative plugin", () => {
      const result = Plugin({
        name: "declarative-plugin",
        description: "A declarative plugin",
        version: "2.0.0"
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.get("declarative-plugin")).toBeDefined()
      expect(pluginRegistry.isEnabled("declarative-plugin")).toBe(true)
    })

    test("should handle plugin with children", () => {
      const childComponent = { render: () => "Child content" }
      
      const result = Plugin({
        name: "parent-plugin",
        children: [childComponent]
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.get("parent-plugin")).toBeDefined()
    })
  })

  describe("LoadPlugin component", () => {
    test("should load function component plugin", () => {
      const PluginComponent = (props: any) => {
        return { render: () => `Plugin loaded with name: ${props.name}` }
      }
      
      const result = LoadPlugin({
        from: PluginComponent,
        name: "loaded-plugin",
        description: "Loaded from component"
      })
      
      expect(result.render()).toBe("")
      expect(pluginRegistry.get("loaded-plugin")).toBeDefined()
    })

    test("should require 'from' prop", () => {
      expect(() => {
        LoadPlugin({
          name: "missing-from"
        })
      }).toThrow("LoadPlugin requires a \"from\" prop")
    })

    test("should handle non-function plugins", () => {
      const staticPlugin = { name: "static", data: "some data" }
      
      const result = LoadPlugin({
        from: staticPlugin,
        name: "static-plugin"
      })
      
      expect(result.render()).toBe("")
    })
  })

  describe("Global plugin registry integration", () => {
    test("should use global registry", () => {
      const mockPlugin = { name: "global-test" }
      
      RegisterPlugin({
        plugin: mockPlugin,
        as: "global-test"
      })
      
      expect(pluginRegistry.get("global-test")).toBe(mockPlugin)
    })

    test("should maintain state across components", () => {
      const mockPlugin = { name: "state-test" }
      
      // Register
      RegisterPlugin({
        plugin: mockPlugin,
        as: "state-test",
        enabled: false
      })
      
      expect(pluginRegistry.isEnabled("state-test")).toBe(false)
      
      // Enable
      EnablePlugin({
        name: "state-test",
        enabled: true
      })
      
      expect(pluginRegistry.isEnabled("state-test")).toBe(true)
      
      // Configure
      ConfigurePlugin({
        name: "state-test",
        config: { persistent: true }
      })
      
      expect(pluginRegistry.getConfig("state-test")).toEqual({
        persistent: true
      })
    })
  })

  describe("Error handling", () => {
    test("should handle invalid plugin registration gracefully", () => {
      // RegisterPlugin should handle null plugin gracefully
      const result = RegisterPlugin({
        plugin: null as any
      })
      expect(result.render()).toBe("")
    })

    test("should handle non-existent plugin operations", () => {
      expect(() => {
        EnablePlugin({ name: "non-existent" })
        ConfigurePlugin({ name: "non-existent", config: {} })
      }).not.toThrow()
    })

    test("should handle undefined configurations", () => {
      const mockPlugin = { name: "undefined-config" }
      
      expect(() => {
        RegisterPlugin({
          plugin: mockPlugin,
          config: undefined
        })
      }).not.toThrow()
      
      expect(pluginRegistry.getConfig(mockPlugin.name)).toEqual({})
    })
  })
})