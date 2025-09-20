/**
 * Tests for CLI Plugin Implementation
 */

import { describe, it, expect } from "bun:test"
import { z } from "zod"
import {
  Plugin,
  PluginBuilder,
  createPlugin,
  createPluginFromBuilder
} from "@/cli/plugin"
import type { PluginContext, PluginMetadata } from "@/cli/types"

describe("CLI Plugin Implementation", () => {
  describe("PluginBuilder", () => {
    it("builds a plugin with metadata", () => {
      const builder = new PluginBuilder()
        .metadata({
          name: "test-plugin",
          version: "1.0.0",
          description: "Test plugin"
        })
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.metadata.name).toBe("test-plugin")
      expect(plugin.metadata.version).toBe("1.0.0")
    })

    it("adds commands to plugin", () => {
      const builder = new PluginBuilder()
        .metadata({ name: "cmd-plugin", version: "1.0.0" })
        .command("test", {
          description: "Test command",
          handler: async () => ({ success: true })
        })
        .command("another", {
          description: "Another command",
          args: { input: z.string() },
          handler: async (args) => ({ input: args.input })
        })
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.commands).toBeDefined()
      expect(plugin.commands?.test).toBeDefined()
      expect(plugin.commands?.another).toBeDefined()
    })

    it("adds hooks to plugin", () => {
      const beforeHook = () => console.log("before")
      const afterHook = () => console.log("after")
      
      const builder = new PluginBuilder()
        .metadata({ name: "hook-plugin", version: "1.0.0" })
        .hook("beforeCommand", beforeHook)
        .hook("afterCommand", afterHook)
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.hooks?.beforeCommand).toBe(beforeHook)
      expect(plugin.hooks?.afterCommand).toBe(afterHook)
    })

    it("adds middleware to plugin", () => {
      const middleware1 = (handler: any) => handler
      const middleware2 = (handler: any) => handler
      
      const builder = new PluginBuilder()
        .metadata({ name: "middleware-plugin", version: "1.0.0" })
        .middleware(middleware1)
        .middleware(middleware2)
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.middleware).toHaveLength(2)
      expect(plugin.middleware?.[0]).toBe(middleware1)
      expect(plugin.middleware?.[1]).toBe(middleware2)
    })

    it("adds services to plugin", () => {
      const logger = { log: (msg: string) => console.log(msg) }
      const api = { fetch: async (url: string) => ({ data: "test" }) }
      
      const builder = new PluginBuilder()
        .metadata({ name: "service-plugin", version: "1.0.0" })
        .service("logger", logger)
        .service("api", api)
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.services?.logger).toBe(logger)
      expect(plugin.services?.api).toBe(api)
    })

    it("adds extensions to plugin", () => {
      const builder = new PluginBuilder()
        .metadata({ name: "extension-plugin", version: "1.0.0" })
        .extend("existing-command", {
          options: { extra: z.boolean() },
          wrapper: (handler) => async (args) => {
            const result = await handler(args)
            return { ...result, extended: true }
          }
        })
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.extensions?.["existing-command"]).toBeDefined()
      expect(plugin.extensions?.["existing-command"].options?.extra).toBeDefined()
    })

    it("sets init function", () => {
      const initFn = async (context: PluginContext) => {
        console.log("Initializing plugin")
      }
      
      const builder = new PluginBuilder()
        .metadata({ name: "init-plugin", version: "1.0.0" })
        .init(initFn)
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.init).toBe(initFn)
    })

    it("sets config schema", () => {
      const configSchema = z.object({
        apiKey: z.string(),
        timeout: z.number().default(5000)
      })
      
      const builder = new PluginBuilder()
        .metadata({ name: "config-plugin", version: "1.0.0" })
        .config(configSchema)
      
      const plugin = createPluginFromBuilder(builder)
      expect(plugin.configSchema).toBe(configSchema)
    })

    it("creates complete plugin", () => {
      const builder = new PluginBuilder()
        .metadata({
          name: "complete-plugin",
          version: "2.0.0",
          description: "A complete plugin",
          author: "Test Author",
          repository: "https://github.com/test/plugin",
          keywords: ["cli", "plugin", "test"]
        })
        .command("greet", {
          description: "Greet someone",
          args: { name: z.string() },
          options: { loud: z.boolean().default(false) },
          handler: async ({ name, loud }) => {
            const greeting = `Hello, ${name}!`
            return { greeting: loud ? greeting.toUpperCase() : greeting }
          }
        })
        .hook("beforeCommand", (cmd, args) => {
          console.log(`Running command: ${cmd}`)
        })
        .middleware((handler) => async (args) => {
          console.log("Middleware: before")
          const result = await handler(args)
          console.log("Middleware: after")
          return result
        })
        .service("utils", {
          formatDate: (date: Date) => date.toISOString()
        })
      
      const plugin = createPluginFromBuilder(builder)
      
      expect(plugin.metadata.name).toBe("complete-plugin")
      expect(plugin.metadata.version).toBe("2.0.0")
      expect(plugin.metadata.author).toBe("Test Author")
      expect(plugin.commands?.greet).toBeDefined()
      expect(plugin.hooks?.beforeCommand).toBeDefined()
      expect(plugin.middleware).toHaveLength(1)
      expect(plugin.services?.utils).toBeDefined()
    })
  })

  describe("createPlugin function", () => {
    it("creates plugin from config object", () => {
      const plugin = createPlugin({
        metadata: {
          name: "simple-plugin",
          version: "1.0.0"
        },
        commands: {
          hello: {
            description: "Say hello",
            handler: async () => ({ message: "Hello!" })
          }
        }
      })
      
      expect(plugin.metadata.name).toBe("simple-plugin")
      expect(plugin.commands?.hello).toBeDefined()
    })

    it("validates metadata", () => {
      const validPlugin = createPlugin({
        metadata: {
          name: "valid-name",
          version: "1.0.0",
          description: "Valid description"
        }
      })
      
      expect(validPlugin.metadata.name).toBe("valid-name")
    })
  })

  describe("Plugin lifecycle", () => {
    it("initializes plugin with context", async () => {
      let initialized = false
      let receivedContext: PluginContext | null = null
      
      const plugin = createPlugin({
        metadata: { name: "lifecycle-plugin", version: "1.0.0" },
        init: async (context) => {
          initialized = true
          receivedContext = context
        }
      })
      
      const mockContext: PluginContext = {
        config: { name: "test-cli", version: "1.0.0", description: "Test" },
        router: {} as any,
        parser: {} as any,
        addCommand: () => {},
        addHook: () => {},
        addMiddleware: () => {},
        extendCommand: () => {},
        getCommands: () => [],
        getHooks: () => ({}),
        emit: () => {},
        on: () => () => {}
      }
      
      if (plugin.init) {
        await plugin.init(mockContext)
      }
      
      expect(initialized).toBe(true)
      expect(receivedContext).toBe(mockContext)
    })

    it("provides uninstall capability", async () => {
      let uninstalled = false
      
      const plugin = createPlugin({
        metadata: { name: "uninstall-plugin", version: "1.0.0" },
        uninstall: async () => {
          uninstalled = true
        }
      })
      
      if (plugin.uninstall) {
        await plugin.uninstall()
      }
      
      expect(uninstalled).toBe(true)
    })
  })

  describe("Plugin interactions", () => {
    it("extends existing commands", () => {
      const plugin = createPlugin({
        metadata: { name: "extender", version: "1.0.0" },
        extensions: {
          "deploy": {
            options: {
              dryRun: z.boolean().default(false),
              verbose: z.boolean().default(false)
            },
            hooks: {
              beforeExecute: async (args) => {
                console.log("Before deploy:", args)
              }
            }
          }
        }
      })
      
      expect(plugin.extensions?.deploy).toBeDefined()
      expect(plugin.extensions?.deploy.options?.dryRun).toBeDefined()
    })

    it("provides middleware wrapping", () => {
      const plugin = createPlugin({
        metadata: { name: "wrapper", version: "1.0.0" },
        extensions: {
          "api-call": {
            wrapper: (originalHandler) => async (args) => {
              // Add authentication
              const enhancedArgs = { ...args, auth: "Bearer token" }
              const result = await originalHandler(enhancedArgs)
              // Add timestamp
              return { ...result, timestamp: new Date().toISOString() }
            }
          }
        }
      })
      
      expect(plugin.extensions?.["api-call"]?.wrapper).toBeDefined()
    })
  })

  describe("Plugin dependencies", () => {
    it("declares dependencies", () => {
      const plugin = createPlugin({
        metadata: {
          name: "dependent",
          version: "1.0.0",
          dependencies: {
            "auth-plugin": "^1.0.0",
            "logger-plugin": "^2.0.0"
          }
        }
      })
      
      expect(plugin.metadata.dependencies).toBeDefined()
      expect(plugin.metadata.dependencies?.["auth-plugin"]).toBe("^1.0.0")
    })

    it("declares peer dependencies", () => {
      const plugin = createPlugin({
        metadata: {
          name: "peer-dependent",
          version: "1.0.0",
          peerDependencies: {
            "tuix": "^1.0.0"
          }
        }
      })
      
      expect(plugin.metadata.peerDependencies?.["tuix"]).toBe("^1.0.0")
    })
  })

  describe("Plugin configuration", () => {
    it("validates config with schema", () => {
      const plugin = createPlugin({
        metadata: { name: "configured", version: "1.0.0" },
        configSchema: z.object({
          apiUrl: z.string().url(),
          timeout: z.number().min(0).default(5000),
          retries: z.number().min(0).max(5).default(3)
        })
      })
      
      if (plugin.configSchema) {
        const validConfig = plugin.configSchema.parse({
          apiUrl: "https://api.example.com"
        })
        
        expect(validConfig.apiUrl).toBe("https://api.example.com")
        expect(validConfig.timeout).toBe(5000)
        expect(validConfig.retries).toBe(3)
        
        expect(() => {
          plugin.configSchema?.parse({
            apiUrl: "not-a-url"
          })
        }).toThrow()
      }
    })
  })
})
