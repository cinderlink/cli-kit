/**
 * Comprehensive tests for CLI Parser
 */

import { describe, it, expect } from "bun:test"
import { z } from "zod"
import { Parser } from "@/cli/parser"
import type { CLIConfig, CommandConfig } from "@/cli/types"

describe("CLI Parser", () => {
  const createTestConfig = (commands: Record<string, CommandConfig>): CLIConfig => ({
    name: "test-cli",
    version: "1.0.0",
    description: "Test CLI",
    commands
  })

  describe("Basic parsing", () => {
    it("parses simple command", () => {
      const config = createTestConfig({
        greet: {
          description: "Greet someone",
          args: {
            name: z.string()
          },
          handler: async ({ name }) => {
            return { greeting: `Hello, ${name}!` }
          }
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["greet", "Alice"])
      
      expect(result.command).toEqual(["greet"])
      expect(result.args).toEqual({ name: "Alice" })
      expect(result.options).toEqual({ help: false, version: false })
    })

    it("parses command with options", () => {
      const config = createTestConfig({
        deploy: {
          description: "Deploy application",
          options: {
            env: z.enum(["dev", "prod"]).default("dev"),
            force: z.boolean().default(false)
          },
          handler: async () => ({ success: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["deploy", "--env", "prod", "--force"])
      
      expect(result.command).toEqual(["deploy"])
      expect(result.options.env).toBe("prod")
      expect(result.options.force).toBe(true)
      expect(result.options.help).toBe(false)
      expect(result.options.version).toBe(false)
    })

    it("parses global options", () => {
      const config: CLIConfig = {
        ...createTestConfig({
          test: {
            description: "Test command",
            handler: async () => ({ ok: true })
          }
        }),
        options: {
          verbose: z.boolean().default(false),
          config: z.string().optional()
        }
      }

      const parser = new Parser(config)
      const result = parser.parse(["test", "--verbose", "--config", "test.json"])
      
      expect(result.command).toEqual(["test"])
      expect(result.options.verbose).toBe(true)
      expect(result.options.config).toBe("test.json")
    })
  })

  describe("Argument parsing", () => {
    it("parses multiple arguments", () => {
      const config = createTestConfig({
        copy: {
          description: "Copy files",
          args: {
            source: z.string(),
            dest: z.string()
          },
          handler: async () => ({ copied: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["copy", "file1.txt", "file2.txt"])
      
      expect(result.args.source).toBe("file1.txt")
      expect(result.args.dest).toBe("file2.txt")
    })

    it("parses variadic arguments", () => {
      const config = createTestConfig({
        concat: {
          description: "Concatenate files",
          args: {
            files: z.array(z.string())
          },
          handler: async () => ({ concatenated: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["concat", "a.txt", "b.txt", "c.txt"])
      
      expect(result.args.files).toEqual(["a.txt", "b.txt", "c.txt"])
    })

    it("handles optional arguments", () => {
      const config = createTestConfig({
        greet: {
          description: "Greet someone",
          args: {
            name: z.string().optional()
          },
          handler: async () => ({ greeted: true })
        }
      })

      const parser = new Parser(config)
      const result1 = parser.parse(["greet"])
      expect(result1.args.name).toBeUndefined()

      const result2 = parser.parse(["greet", "Bob"])
      expect(result2.args.name).toBe("Bob")
    })
  })

  describe("Option parsing", () => {
    it("parses boolean flags", () => {
      const config = createTestConfig({
        run: {
          description: "Run something",
          options: {
            debug: z.boolean().default(false),
            quiet: z.boolean().default(false)
          },
          handler: async () => ({ ran: true })
        }
      })

      const parser = new Parser(config)
      
      // Long form
      const result1 = parser.parse(["run", "--debug", "--quiet"])
      expect(result1.options.debug).toBe(true)
      expect(result1.options.quiet).toBe(true)

      // Negation
      const result2 = parser.parse(["run", "--no-debug"])
      expect(result2.options.debug).toBe(false)
    })

    it("parses string options", () => {
      const config = createTestConfig({
        connect: {
          description: "Connect to server",
          options: {
            host: z.string().default("localhost"),
            port: z.coerce.number().default(8080)
          },
          handler: async () => ({ connected: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["connect", "--host", "example.com", "--port", "3000"])
      
      expect(result.options.host).toBe("example.com")
      expect(result.options.port).toBe(3000)
    })

    it("parses array options", () => {
      const config = createTestConfig({
        build: {
          description: "Build project",
          options: {
            targets: z.array(z.string()).default([])
          },
          handler: async () => ({ built: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse([
        "build", 
        "--targets", "web",
        "--targets", "mobile",
        "--targets", "desktop"
      ])
      
      expect(result.options.targets).toEqual(["web", "mobile", "desktop"])
    })

    it("handles option aliases", () => {
      const config = createTestConfig({
        list: {
          description: "List items",
          options: {
            all: z.boolean().default(false),
            long: z.boolean().default(false)
          },
          aliases: {
            a: "all",
            l: "long"
          },
          handler: async () => ({ listed: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["list", "-a", "-l"])
      
      expect(result.options.a).toBe(true)
      expect(result.options.l).toBe(true)
    })
  })

  describe("Error handling", () => {
    it("parses unknown command as positional arg", () => {
      const config = createTestConfig({
        known: {
          description: "Known command",
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["unknown"])
      expect(result.command).toEqual([])
      // Unknown commands are stored in rawArgs but not processed as args
      expect(result.rawArgs).toContain("unknown")
    })

    it("throws on missing required args", () => {
      const config = createTestConfig({
        greet: {
          description: "Greet someone",
          args: {
            name: z.string()
          },
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      expect(() => parser.parse(["greet"])).toThrow()
    })

    it("throws on invalid option values", () => {
      const config = createTestConfig({
        run: {
          description: "Run",
          options: {
            count: z.coerce.number()
          },
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      expect(() => parser.parse(["run", "--count", "not-a-number"])).toThrow()
    })
  })

  describe("Special cases", () => {
    it("handles empty args", () => {
      const config = createTestConfig({})
      const parser = new Parser(config)
      
      expect(() => parser.parse([])).not.toThrow()
      const result = parser.parse([])
      expect(result.command).toEqual([])
    })

    it("stops parsing at --", () => {
      const config = createTestConfig({
        exec: {
          description: "Execute command",
          args: {
            cmd: z.string(),
            cmdArgs: z.array(z.string()).optional()
          },
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["exec", "npm", "--", "run", "--verbose"])
      
      expect(result.args.cmd).toBe("npm")
      // Arguments after -- are stored in rawArgs
      expect(result.rawArgs).toContain("run")
      expect(result.rawArgs).toContain("--verbose")
    })

    it("handles = in options", () => {
      const config = createTestConfig({
        set: {
          description: "Set value",
          options: {
            key: z.string(),
            value: z.string()
          },
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      const result = parser.parse(["set", "--key=name", "--value=John Doe"])
      
      expect(result.options.key).toBe("name")
      expect(result.options.value).toBe("John Doe")
    })
  })

  describe("Help generation", () => {
    it("detects help flag", () => {
      const config = createTestConfig({
        test: {
          description: "Test command",
          handler: async () => ({ ok: true })
        }
      })

      const parser = new Parser(config)
      
      const result1 = parser.parse(["--help"])
      expect(result1.options.help).toBe(true)

      const result2 = parser.parse(["test", "--help"])
      expect(result2.options.help).toBe(true)
      expect(result2.command).toEqual(["test"])
    })
  })
})