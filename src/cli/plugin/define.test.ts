import { test, expect, describe } from "bun:test"
import { definePlugin, createPlugin, PluginBuilder, createPluginFromBuilder, jsxToPlugin } from "./define"
import type { Plugin, JSXPlugin } from "./types"

describe("Plugin Definition", () => {
  describe("definePlugin", () => {
    test("accepts a valid plugin", () => {
      const plugin: Plugin = {
        metadata: {
          name: "test-plugin",
          version: "1.0.0"
        }
      }

      const defined = definePlugin(plugin)
      expect(defined).toBe(plugin)
    })

    test("throws on missing name", () => {
      const plugin = {
        metadata: {
          version: "1.0.0"
        }
      } as Plugin

      expect(() => definePlugin(plugin)).toThrow("Plugin must have a name in metadata")
    })

    test("throws on missing version", () => {
      const plugin = {
        metadata: {
          name: "test-plugin"
        }
      } as Plugin

      expect(() => definePlugin(plugin)).toThrow("Plugin must have a version in metadata")
    })

    test("throws on commands without handlers", () => {
      const plugin: Plugin = {
        metadata: {
          name: "test-plugin",
          version: "1.0.0"
        },
        commands: {
          hello: {
            description: "Say hello"
          } as Command
        }
      }

      expect(() => definePlugin(plugin)).toThrow("Command 'hello' must have a handler")
    })
  })

  describe("createPlugin", () => {
    test("creates plugin from object", () => {
      const plugin: Plugin = {
        metadata: {
          name: "test-plugin",
          version: "1.0.0"
        }
      }

      const created = createPlugin(plugin)
      expect(created.metadata.name).toBe("test-plugin")
    })

    test("creates plugin using builder function", () => {
      const plugin = createPlugin((api) => {
        api.metadata({
          name: "builder-plugin",
          version: "2.0.0"
        })
        api.command("hello", {
          description: "Say hello",
          handler: async () => {}
        })
      })

      expect(plugin.metadata.name).toBe("builder-plugin")
      expect(plugin.commands).toHaveProperty("hello")
    })
  })

  describe("PluginBuilder", () => {
    test("builds a complete plugin", () => {
      const builder = new PluginBuilder({
        name: "test-plugin",
        version: "1.0.0"
      })

      const plugin = builder
        .command("hello", {
          description: "Say hello",
          handler: async () => {}
        })
        .extend("app.build", () => ({
          preHook: async () => {}
        }))
        .service("logger", console)
        .build()

      expect(plugin.metadata.name).toBe("test-plugin")
      expect(plugin.commands).toHaveProperty("hello")
      expect(plugin.extensions).toBeDefined()
      expect(plugin.extensions!["app.build"]).toBeDefined()
      expect(plugin.services).toHaveProperty("logger")
    })

    test("allows chaining methods", () => {
      const builder = new PluginBuilder()
      
      const result = builder
        .metadata({ name: "chain-test", version: "1.0.0" })
        .command("cmd1", { description: "Command 1", handler: async () => {} })
        .command("cmd2", { description: "Command 2", handler: async () => {} })
        .wrapper(async (ctx, next) => await next())
        .onInstall(async () => {})
        .onActivate(async () => {})
        .onDeactivate(async () => {})
        .onUpdate(async () => {})
        .onUninstall(async () => {})

      expect(result).toBe(builder)
      
      const plugin = result.build()
      expect(plugin.commands).toHaveProperty("cmd1")
      expect(plugin.commands).toHaveProperty("cmd2")
      expect(plugin.wrappers).toHaveLength(1)
      expect(plugin.install).toBeDefined()
      expect(plugin.activate).toBeDefined()
      expect(plugin.deactivate).toBeDefined()
      expect(plugin.update).toBeDefined()
      expect(plugin.uninstall).toBeDefined()
    })

    test("merges metadata correctly", () => {
      const builder = new PluginBuilder({ name: "initial", version: "1.0.0" })
      builder.metadata({ description: "A test plugin" })
      
      const plugin = builder.build()
      expect(plugin.metadata.name).toBe("initial")
      expect(plugin.metadata.version).toBe("1.0.0")
      expect(plugin.metadata.description).toBe("A test plugin")
    })
  })

  describe("createPluginFromBuilder", () => {
    test("creates from builder instance", () => {
      const builder = new PluginBuilder({
        name: "builder-test",
        version: "1.0.0"
      })

      const plugin = createPluginFromBuilder(builder)
      expect(plugin.metadata.name).toBe("builder-test")
    })

    test("creates from builder function", () => {
      const plugin = createPluginFromBuilder((builder) => {
        builder.metadata({
          name: "function-test",
          version: "1.0.0"
        })
        return builder
      })

      expect(plugin.metadata.name).toBe("function-test")
    })

    test("throws on invalid argument", () => {
      expect(() => createPluginFromBuilder("invalid" as unknown as (api: PluginAPI) => Plugin)).toThrow("Invalid argument to createPluginFromBuilder")
    })
  })

  describe("jsxToPlugin", () => {
    test("converts JSX plugin format", () => {
      const jsxPlugin: JSXPlugin = {
        name: "jsx-plugin",
        version: "1.5.0",
        description: "A JSX plugin",
        commands: {
          hello: {
            description: "Say hello",
            handler: async () => {}
          }
        }
      }

      const plugin = jsxToPlugin(jsxPlugin)
      expect(plugin.metadata.name).toBe("jsx-plugin")
      expect(plugin.metadata.version).toBe("1.5.0")
      expect(plugin.metadata.description).toBe("A JSX plugin")
      expect(plugin.commands).toHaveProperty("hello")
    })

    test("uses default version when not provided", () => {
      const jsxPlugin: JSXPlugin = {
        name: "jsx-plugin"
      }

      const plugin = jsxToPlugin(jsxPlugin)
      expect(plugin.metadata.version).toBe("0.0.0")
    })

    test("converts lifecycle hooks", async () => {
      let installed = false
      let activated = false
      let deactivated = false

      const jsxPlugin: JSXPlugin = {
        name: "jsx-plugin",
        onInstall: async () => { installed = true },
        onActivate: async () => { activated = true },
        onDeactivate: async () => { deactivated = true }
      }

      const plugin = jsxToPlugin(jsxPlugin)
      
      await plugin.install?.({} as PluginContext)
      expect(installed).toBe(true)
      
      await plugin.activate?.({} as PluginContext)
      expect(activated).toBe(true)
      
      await plugin.deactivate?.({} as PluginContext)
      expect(deactivated).toBe(true)
    })

    test("converts nested subcommands", () => {
      const jsxPlugin: JSXPlugin = {
        name: "jsx-plugin",
        commands: {
          app: {
            description: "Application commands",
            subcommands: {
              build: {
                description: "Build the app",
                handler: async () => {}
              },
              test: {
                description: "Test the app",
                handler: async () => {}
              }
            }
          }
        }
      }

      const plugin = jsxToPlugin(jsxPlugin)
      expect(plugin.commands?.app.subcommands).toHaveProperty("build")
      expect(plugin.commands?.app.subcommands).toHaveProperty("test")
    })
  })
})