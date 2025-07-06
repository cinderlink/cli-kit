/**
 * Comprehensive tests for CLI Router
 */

import { describe, it, expect } from "bun:test"
import { z } from "zod"
import { Router } from "@/cli/router"
import type { CLIConfig, CommandConfig } from "@/cli/types"

describe("CLI Router", () => {
  const createTestConfig = (commands: Record<string, CommandConfig>): CLIConfig => ({
    name: "test-cli",
    version: "1.0.0",
    description: "Test CLI",
    commands
  })

  describe("Command registration", () => {
    it("registers commands from config", () => {
      const config = createTestConfig({
        cmd1: {
          description: "Command 1",
          handler: async () => ({ result: "cmd1" })
        },
        cmd2: {
          description: "Command 2",
          handler: async () => ({ result: "cmd2" })
        }
      })

      const router = new Router(config)
      const commands = router.getCommands()
      
      expect(commands).toContain("cmd1")
      expect(commands).toContain("cmd2")
      expect(commands.length).toBe(2)
    })

    it("adds commands dynamically", () => {
      const router = new Router(createTestConfig({}))
      
      router.addCommand("dynamic", {
        description: "Dynamic command",
        handler: async () => ({ dynamic: true })
      })

      const commands = router.getCommands()
      expect(commands).toContain("dynamic")
    })

    it("overwrites existing commands", () => {
      const config = createTestConfig({
        test: {
          description: "Original",
          handler: async () => ({ version: 1 })
        }
      })

      const router = new Router(config)
      
      router.addCommand("test", {
        description: "Updated",
        handler: async () => ({ version: 2 })
      })

      const command = router.getCommand("test")
      expect(command?.description).toBe("Updated")
    })
  })

  describe("Command execution", () => {
    it("executes simple commands", async () => {
      const config = createTestConfig({
        greet: {
          description: "Greet",
          handler: async () => ({ message: "Hello!" })
        }
      })

      const router = new Router(config)
      const result = await router.execute("greet", {}, {})
      
      expect(result).toEqual({ message: "Hello!" })
    })

    it("passes arguments to handler", async () => {
      const config = createTestConfig({
        echo: {
          description: "Echo input",
          args: {
            text: z.string()
          },
          handler: async ({ text }) => ({ echo: text })
        }
      })

      const router = new Router(config)
      const result = await router.execute("echo", { text: "Hello" }, {})
      
      expect(result).toEqual({ echo: "Hello" })
    })

    it("passes options to handler", async () => {
      const config = createTestConfig({
        format: {
          description: "Format text",
          options: {
            upper: z.boolean().default(false)
          },
          handler: async (args, { upper }) => {
            return { formatted: upper ? "TEXT" : "text" }
          }
        }
      })

      const router = new Router(config)
      const result = await router.execute("format", {}, { upper: true })
      
      expect(result).toEqual({ formatted: "TEXT" })
    })

    it("executes async handlers", async () => {
      const config = createTestConfig({
        delay: {
          description: "Delayed response",
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
            return { delayed: true }
          }
        }
      })

      const router = new Router(config)
      const result = await router.execute("delay", {}, {})
      
      expect(result).toEqual({ delayed: true })
    })
  })

  describe("Middleware", () => {
    it("applies middleware in order", async () => {
      const log: string[] = []
      
      const router = new Router(createTestConfig({
        test: {
          description: "Test",
          handler: async () => {
            log.push("handler")
            return { ok: true }
          }
        }
      }))

      router.addMiddleware((handler) => async (args, options) => {
        log.push("middleware1-before")
        const result = await handler(args, options)
        log.push("middleware1-after")
        return result
      })

      router.addMiddleware((handler) => async (args, options) => {
        log.push("middleware2-before")
        const result = await handler(args, options)
        log.push("middleware2-after")
        return result
      })

      await router.execute("test", {}, {})
      
      expect(log).toEqual([
        "middleware1-before",
        "middleware2-before",
        "handler",
        "middleware2-after",
        "middleware1-after"
      ])
    })

    it("allows middleware to modify args", async () => {
      const router = new Router(createTestConfig({
        greet: {
          description: "Greet",
          args: { name: z.string() },
          handler: async ({ name }) => ({ greeting: `Hello, ${name}!` })
        }
      }))

      router.addMiddleware((handler) => async (args, options) => {
        const modifiedArgs = { ...args, name: args.name.toUpperCase() }
        return handler(modifiedArgs, options)
      })

      const result = await router.execute("greet", { name: "alice" }, {})
      expect(result).toEqual({ greeting: "Hello, ALICE!" })
    })

    it("allows middleware to short-circuit", async () => {
      const router = new Router(createTestConfig({
        protected: {
          description: "Protected command",
          handler: async () => ({ secret: "data" })
        }
      }))

      router.addMiddleware((handler) => async (args, options) => {
        if (!options.auth) {
          return { error: "Unauthorized" }
        }
        return handler(args, options)
      })

      const result1 = await router.execute("protected", {}, {})
      expect(result1).toEqual({ error: "Unauthorized" })

      const result2 = await router.execute("protected", {}, { auth: true })
      expect(result2).toEqual({ secret: "data" })
    })
  })

  describe("Command retrieval", () => {
    it("gets command by name", () => {
      const config = createTestConfig({
        test: {
          description: "Test command",
          handler: async () => ({ ok: true })
        }
      })

      const router = new Router(config)
      const command = router.getCommand("test")
      
      expect(command).not.toBeNull()
      expect(command?.description).toBe("Test command")
    })

    it("returns null for unknown command", () => {
      const router = new Router(createTestConfig({}))
      const command = router.getCommand("unknown")
      
      expect(command).toBeNull()
    })

    it("lists all commands", () => {
      const config = createTestConfig({
        cmd1: { description: "1", handler: async () => ({}) },
        cmd2: { description: "2", handler: async () => ({}) },
        cmd3: { description: "3", handler: async () => ({}) }
      })

      const router = new Router(config)
      const commands = router.getCommands()
      
      expect(commands).toHaveLength(3)
      expect(commands.sort()).toEqual(["cmd1", "cmd2", "cmd3"])
    })
  })

  describe("Error handling", () => {
    it("throws on unknown command execution", async () => {
      const router = new Router(createTestConfig({}))
      
      await expect(
        router.execute("unknown", {}, {})
      ).rejects.toThrow("Unknown command: unknown")
    })

    it("propagates handler errors", async () => {
      const config = createTestConfig({
        failing: {
          description: "Failing command",
          handler: async () => {
            throw new Error("Command failed")
          }
        }
      })

      const router = new Router(config)
      
      await expect(
        router.execute("failing", {}, {})
      ).rejects.toThrow("Command failed")
    })
  })

  describe("Global options", () => {
    it("merges global options with command options", async () => {
      const config: CLIConfig = {
        ...createTestConfig({
          test: {
            description: "Test",
            options: {
              local: z.boolean().default(false)
            },
            handler: async (args, options) => options
          }
        }),
        globalOptions: {
          verbose: z.boolean().default(false),
          config: z.string().optional()
        }
      }

      const router = new Router(config)
      const result = await router.execute(
        "test",
        {},
        { local: true, verbose: true, config: "test.json" }
      )
      
      expect(result).toEqual({
        local: true,
        verbose: true,
        config: "test.json"
      })
    })
  })
})