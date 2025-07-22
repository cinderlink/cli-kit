/**
 * Plugin Store Tests
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { PluginStore } from "./pluginStore"
import type { Plugin } from "@cli/plugin"

describe("PluginStore", () => {
  let store: PluginStore
  
  const createPlugin = (name: string, deps: Record<string, string> = {}): Plugin => ({
    metadata: {
      name,
      version: "1.0.0",
      dependencies: deps
    }
  })
  
  beforeEach(() => {
    store = new PluginStore()
  })
  
  describe("constructor", () => {
    it("should set default options", () => {
      const options = store.getOptions()
      expect(options.autoEnable).toBe(true)
      expect(options.validateDependencies).toBe(true)
      expect(options.allowDuplicates).toBe(false)
    })
    
    it("should accept custom options", () => {
      store = new PluginStore({
        autoEnable: false,
        validateDependencies: false,
        allowDuplicates: true
      })
      
      const options = store.getOptions()
      expect(options.autoEnable).toBe(false)
      expect(options.validateDependencies).toBe(false)
      expect(options.allowDuplicates).toBe(true)
    })
  })
  
  describe("add", () => {
    it("should add a plugin", () => {
      const plugin = createPlugin("test-plugin")
      const registered = store.add(plugin)
      
      expect(registered).not.toBeNull()
      expect(registered?.plugin).toBe(plugin)
      expect(registered?.enabled).toBe(true)
      expect(registered?.loadTime).toBeInstanceOf(Date)
      expect(registered?.dependencies).toEqual([])
      expect(registered?.dependents).toEqual([])
    })
    
    it("should extract dependencies", () => {
      const plugin = createPlugin("test-plugin", { "dep-a": "1.0.0", "dep-b": "2.0.0" })
      const registered = store.add(plugin)
      
      expect(registered?.dependencies).toEqual(["dep-a", "dep-b"])
    })
    
    it("should reject duplicates by default", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      const duplicate = store.add(plugin)
      expect(duplicate).toBeNull()
    })
    
    it("should allow duplicates when configured", () => {
      store = new PluginStore({ allowDuplicates: true })
      const plugin = createPlugin("test-plugin")
      
      const first = store.add(plugin)
      const second = store.add(plugin)
      
      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
    })
    
    it("should store config with plugin", () => {
      const plugin = createPlugin("test-plugin")
      const config = { foo: "bar" }
      const registered = store.add(plugin, config)
      
      expect(registered?.config).toEqual(config)
    })
  })
  
  describe("get/has/remove", () => {
    it("should get registered plugin", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      const registered = store.get("test-plugin")
      expect(registered?.plugin).toBe(plugin)
    })
    
    it("should get plugin instance", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      expect(store.getPlugin("test-plugin")).toBe(plugin)
    })
    
    it("should check if plugin exists", () => {
      const plugin = createPlugin("test-plugin")
      
      expect(store.has("test-plugin")).toBe(false)
      store.add(plugin)
      expect(store.has("test-plugin")).toBe(true)
    })
    
    it("should remove plugin", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      expect(store.remove("test-plugin")).toBe(true)
      expect(store.has("test-plugin")).toBe(false)
    })
    
    it("should return false when removing non-existent plugin", () => {
      expect(store.remove("non-existent")).toBe(false)
    })
  })
  
  describe("enabled state", () => {
    it("should check if plugin is enabled", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      expect(store.isEnabled("test-plugin")).toBe(true)
    })
    
    it("should set enabled state", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      expect(store.setEnabled("test-plugin", false)).toBe(true)
      expect(store.isEnabled("test-plugin")).toBe(false)
      
      expect(store.setEnabled("test-plugin", true)).toBe(true)
      expect(store.isEnabled("test-plugin")).toBe(true)
    })
    
    it("should return false for non-existent plugin", () => {
      expect(store.setEnabled("non-existent", true)).toBe(false)
    })
    
    it("should get enabled plugins", () => {
      const plugin1 = createPlugin("plugin-1")
      const plugin2 = createPlugin("plugin-2")
      const plugin3 = createPlugin("plugin-3")
      
      store.add(plugin1)
      store.add(plugin2)
      store.add(plugin3)
      
      store.setEnabled("plugin-2", false)
      
      const enabled = store.getEnabled()
      expect(enabled).toHaveLength(2)
      expect(enabled).toContain(plugin1)
      expect(enabled).toContain(plugin3)
    })
  })
  
  describe("dependents management", () => {
    it("should add dependent", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      store.addDependent("test-plugin", "dependent-1")
      store.addDependent("test-plugin", "dependent-2")
      
      const registered = store.get("test-plugin")
      expect(registered?.dependents).toEqual(["dependent-1", "dependent-2"])
    })
    
    it("should not add duplicate dependents", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      store.addDependent("test-plugin", "dependent-1")
      store.addDependent("test-plugin", "dependent-1")
      
      const registered = store.get("test-plugin")
      expect(registered?.dependents).toEqual(["dependent-1"])
    })
    
    it("should remove dependent", () => {
      const plugin = createPlugin("test-plugin")
      store.add(plugin)
      
      store.addDependent("test-plugin", "dependent-1")
      store.addDependent("test-plugin", "dependent-2")
      store.removeDependent("test-plugin", "dependent-1")
      
      const registered = store.get("test-plugin")
      expect(registered?.dependents).toEqual(["dependent-2"])
    })
    
    it("should get active dependents", () => {
      const plugin = createPlugin("test-plugin")
      const dep1 = createPlugin("dependent-1")
      const dep2 = createPlugin("dependent-2")
      
      store.add(plugin)
      store.add(dep1)
      store.add(dep2)
      
      store.addDependent("test-plugin", "dependent-1")
      store.addDependent("test-plugin", "dependent-2")
      
      store.setEnabled("dependent-1", false)
      
      const activeDeps = store.getActiveDependents("test-plugin")
      expect(activeDeps).toEqual(["dependent-2"])
    })
  })
  
  describe("getAll/getNames", () => {
    it("should get all registered plugins", () => {
      const plugin1 = createPlugin("plugin-1")
      const plugin2 = createPlugin("plugin-2")
      
      store.add(plugin1)
      store.add(plugin2)
      
      const all = store.getAll()
      expect(all).toHaveLength(2)
      expect(all[0].plugin).toBe(plugin1)
      expect(all[1].plugin).toBe(plugin2)
    })
    
    it("should get all plugin names", () => {
      const plugin1 = createPlugin("plugin-1")
      const plugin2 = createPlugin("plugin-2")
      
      store.add(plugin1)
      store.add(plugin2)
      
      const names = store.getNames()
      expect(names).toEqual(["plugin-1", "plugin-2"])
    })
  })
})