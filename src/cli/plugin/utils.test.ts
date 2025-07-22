import { test, expect, describe } from "bun:test"
import { deepMerge, mergePluginConfigs, composePlugins, PluginUtils } from "./utils"
import type { Plugin } from "./types"
import type { CLIConfig } from "@cli/types"

describe("Plugin Utils", () => {
  describe("deepMerge", () => {
    test("merges simple objects", () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      const result = deepMerge(target, source)
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    test("merges nested objects", () => {
      const target = { a: { x: 1, y: 2 }, b: 3 }
      const source = { a: { y: 3, z: 4 }, c: 5 }
      const result = deepMerge(target, source)
      
      expect(result).toEqual({
        a: { x: 1, y: 3, z: 4 },
        b: 3,
        c: 5
      })
    })

    test("handles arrays by replacement", () => {
      const target = { a: [1, 2], b: 3 }
      const source = { a: [3, 4, 5], c: 6 }
      const result = deepMerge(target, source)
      
      expect(result).toEqual({ a: [3, 4, 5], b: 3, c: 6 })
    })

    test("handles null values", () => {
      const target = { a: { x: 1 }, b: null }
      const source = { a: null, b: { y: 2 } }
      const result = deepMerge(target, source)
      
      expect(result).toEqual({ a: null, b: { y: 2 } })
    })
  })

  describe("mergePluginConfigs", () => {
    test("merges commands from multiple configs", () => {
      const base: CLIConfig = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          hello: {
            description: "Say hello",
            handler: async () => {}
          }
        }
      }

      const config1: Partial<CLIConfig> = {
        commands: {
          world: {
            description: "Say world",
            handler: async () => {}
          }
        }
      }

      const result = mergePluginConfigs(base, config1)
      expect(result.commands).toHaveProperty("hello")
      expect(result.commands).toHaveProperty("world")
    })

    test("handles array overload", () => {
      const configs: CLIConfig[] = [
        {
          name: "test-cli",
          version: "1.0.0",
          commands: {
            hello: {
              description: "Say hello",
              handler: async () => {}
            }
          }
        },
        {
          name: "test-cli",
          version: "1.0.0",
          commands: {
            world: {
              description: "Say world",
              handler: async () => {}
            }
          }
        }
      ]

      const result = mergePluginConfigs(configs)
      expect(result.commands).toHaveProperty("hello")
      expect(result.commands).toHaveProperty("world")
    })
  })

  describe("composePlugins", () => {
    test("composes multiple plugins", () => {
      const plugin1: Plugin = {
        metadata: {
          name: "plugin-1",
          version: "1.0.0"
        },
        commands: {
          hello: {
            description: "Say hello",
            handler: async () => {}
          }
        }
      }

      const plugin2: Plugin = {
        metadata: {
          name: "plugin-2",
          version: "1.0.0"
        },
        commands: {
          world: {
            description: "Say world",
            handler: async () => {}
          }
        }
      }

      const composed = composePlugins([plugin1, plugin2])
      expect(composed.metadata.name).toBe("plugin-1+plugin-2")
      expect(composed.commands).toHaveProperty("hello")
      expect(composed.commands).toHaveProperty("world")
    })

    test("merges extensions", () => {
      const plugin1: Plugin = {
        metadata: { name: "p1", version: "1.0.0" },
        extensions: {
          "app.build": () => ({ preHook: async () => {} })
        }
      }

      const plugin2: Plugin = {
        metadata: { name: "p2", version: "1.0.0" },
        extensions: {
          "app.test": () => ({ postHook: async () => {} })
        }
      }

      const composed = composePlugins(plugin1, plugin2)
      expect(composed.extensions).toBeDefined()
      expect(composed.extensions!["app.build"]).toBeDefined()
      expect(composed.extensions!["app.test"]).toBeDefined()
    })

    test("combines wrappers", () => {
      const wrapper1: HandlerWrapper = (handler) => handler
      const wrapper2: HandlerWrapper = (handler) => handler

      const plugin1: Plugin = {
        metadata: { name: "p1", version: "1.0.0" },
        wrappers: [wrapper1]
      }

      const plugin2: Plugin = {
        metadata: { name: "p2", version: "1.0.0" },
        wrappers: [wrapper2]
      }

      const composed = composePlugins([plugin1, plugin2])
      expect(composed.wrappers).toHaveLength(2)
      expect(composed.wrappers).toContain(wrapper1)
      expect(composed.wrappers).toContain(wrapper2)
    })

    test("returns single plugin unchanged", () => {
      const plugin: Plugin = {
        metadata: {
          name: "plugin",
          version: "1.0.0"
        }
      }

      const composed = composePlugins([plugin])
      expect(composed).toBe(plugin)
    })

    test("throws on empty array", () => {
      expect(() => composePlugins([])).toThrow("At least one plugin is required for composition")
    })
  })

  describe("PluginUtils", () => {
    test("isPlugin identifies valid plugins", () => {
      const validPlugin: Plugin = {
        metadata: {
          name: "test",
          version: "1.0.0"
        }
      }

      expect(PluginUtils.isPlugin(validPlugin)).toBe(true)
      expect(PluginUtils.isPlugin({})).toBe(false)
      expect(PluginUtils.isPlugin(null)).toBe(false)
      expect(PluginUtils.isPlugin({ metadata: {} })).toBe(false)
    })

    test("findPlugin finds by name", () => {
      const plugins: Plugin[] = [
        { metadata: { name: "plugin-a", version: "1.0.0" } },
        { metadata: { name: "plugin-b", version: "1.0.0" } }
      ]

      const found = PluginUtils.findPlugin(plugins, "plugin-b")
      expect(found?.metadata.name).toBe("plugin-b")
      expect(PluginUtils.findPlugin(plugins, "plugin-c")).toBeUndefined()
    })

    test("sortByName sorts alphabetically", () => {
      const plugins: Plugin[] = [
        { metadata: { name: "zebra", version: "1.0.0" } },
        { metadata: { name: "alpha", version: "1.0.0" } },
        { metadata: { name: "beta", version: "1.0.0" } }
      ]

      const sorted = PluginUtils.sortByName(plugins)
      expect(sorted[0].metadata.name).toBe("alpha")
      expect(sorted[1].metadata.name).toBe("beta")
      expect(sorted[2].metadata.name).toBe("zebra")
    })

    test("filterByKeyword searches multiple fields", () => {
      const plugins: Plugin[] = [
        {
          metadata: {
            name: "logger-plugin",
            version: "1.0.0",
            description: "Logging utilities"
          }
        },
        {
          metadata: {
            name: "auth-plugin",
            version: "1.0.0",
            keywords: ["authentication", "security"]
          }
        },
        {
          metadata: {
            name: "test-plugin",
            version: "1.0.0",
            description: "Testing framework integration"
          }
        }
      ]

      const loggerResults = PluginUtils.filterByKeyword(plugins, "log")
      expect(loggerResults).toHaveLength(1)
      expect(loggerResults[0].metadata.name).toBe("logger-plugin")

      const authResults = PluginUtils.filterByKeyword(plugins, "auth")
      expect(authResults).toHaveLength(1)
      expect(authResults[0].metadata.name).toBe("auth-plugin")

      const testResults = PluginUtils.filterByKeyword(plugins, "test")
      expect(testResults).toHaveLength(1)
      expect(testResults[0].metadata.name).toBe("test-plugin")
    })
  })
})