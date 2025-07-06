/**
 * Tests for CLI Configuration (actual exports)
 */

import { describe, it, expect } from "bun:test"
import {
  defineConfig,
  validateConfig,
  mergeConfigs,
  lazyLoad,
  defineCommand,
  commonOptions,
  commonArgs,
  type CLIConfig
} from "@/cli/config"
import { z } from "zod"

describe("CLI Configuration - Real Implementation", () => {
  describe("defineConfig", () => {
    it("returns the config unchanged", () => {
      const config: CLIConfig = {
        name: "test-cli",
        version: "1.0.0",
        description: "Test CLI"
      }
      
      const defined = defineConfig(config)
      expect(defined).toEqual({
        name: "test-cli",
        version: "1.0.0",
        description: "Test CLI",
        options: {},
        commands: {},
        plugins: [],
        hooks: {}
      })
    })
  })

  describe("validateConfig", () => {
    it("validates a minimal config", () => {
      const config: CLIConfig = {
        name: "test-cli",
        version: "1.0.0",
        description: "Test CLI"
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("validates config with commands", () => {
      const config: CLIConfig = {
        name: "test-cli",
        version: "1.0.0",
        description: "Test CLI",
        commands: {
          test: {
            description: "Test command",
            handler: async () => console.log("test")
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("throws on missing required fields", () => {
      const invalidConfigs = [
        { version: "1.0.0", description: "Missing name" },
        { name: "test", description: "Missing version" }
        // Note: description is optional, so { name: "test", version: "1.0.0" } is valid
      ]
      
      for (const config of invalidConfigs) {
        expect(() => validateConfig(config as CLIConfig)).toThrow()
      }
      
      // This should NOT throw since description is optional
      const validConfig = { name: "test", version: "1.0.0" }
      expect(() => validateConfig(validConfig as CLIConfig)).not.toThrow()
    })

    it("validates nested commands", () => {
      const config: CLIConfig = {
        name: "nested-cli",
        version: "1.0.0",
        description: "CLI with nested commands",
        commands: {
          db: {
            description: "Database commands",
            subcommands: {
              migrate: {
                description: "Run migrations",
                handler: async () => {}
              }
            }
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })
  })

  describe("mergeConfigs", () => {
    it("merges multiple configs", () => {
      const base: CLIConfig = {
        name: "base-cli",
        version: "1.0.0",
        description: "Base CLI"
      }
      
      const override1 = {
        version: "2.0.0"
      }
      
      const override2 = {
        description: "Updated description"
      }
      
      const merged = mergeConfigs(base, override1, override2)
      
      expect(merged.name).toBe("base-cli")
      expect(merged.version).toBe("2.0.0")
      expect(merged.description).toBe("Updated description")
    })

    it("deep merges commands", () => {
      const base: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          test: {
            description: "Test command",
            handler: async () => {}
          }
        }
      }
      
      const override = {
        commands: {
          deploy: {
            description: "Deploy command",
            handler: async () => {}
          }
        }
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.commands?.test).toBeDefined()
      expect(merged.commands?.deploy).toBeDefined()
    })
  })

  describe("lazyLoad", () => {
    it("creates a lazy handler", () => {
      const handler = lazyLoad(async () => ({
        default: async () => ({ result: "lazy loaded" })
      }))
      
      expect(typeof handler).toBe("function")
      expect(handler._lazy).toBe(true)
    })

    it("can be executed", async () => {
      const handler = lazyLoad(async () => ({
        default: async () => ({ result: "test" })
      }))
      
      const loader = handler._loader
      expect(loader).toBeDefined()
      
      if (loader) {
        const module = await loader()
        const loadedHandler = module.default
        const result = await loadedHandler({})
        expect(result).toEqual({ result: "test" })
      }
    })
  })

  describe("defineCommand", () => {
    it("creates a command config with handler", () => {
      const command = defineCommand({
        description: "Test command",
        args: {
          input: z.string()
        },
        handler: async (args) => {
          return { output: args.input }
        }
      })
      
      expect(command.description).toBe("Test command")
      expect(command.args).toBeDefined()
      expect(command.handler).toBeDefined()
    })

    it("supports lazy handlers", () => {
      const command = defineCommand({
        description: "Lazy command",
        lazy: true,
        handler: lazyLoad(async () => ({
          default: async () => ({ result: "lazy" })
        }))
      })
      
      expect(command.lazy).toBe(true)
      expect(command.handler._lazy).toBe(true)
    })
  })

  describe("commonOptions", () => {
    it("provides common option schemas", () => {
      expect(commonOptions.help).toBeDefined()
      expect(commonOptions.version).toBeDefined()
      expect(commonOptions.verbose).toBeDefined()
      expect(commonOptions.quiet).toBeDefined()
      expect(commonOptions.config).toBeDefined()
      expect(commonOptions.output).toBeDefined()
      expect(commonOptions.force).toBeDefined()
      expect(commonOptions.yes).toBeDefined()
      expect(commonOptions.no).toBeDefined()
    })

    it("schemas have descriptions", () => {
      const helpSchema = commonOptions.help
      expect(helpSchema._def.description).toContain("help")
    })
  })

  describe("commonArgs", () => {
    it("provides common argument schemas", () => {
      expect(commonArgs.path).toBeDefined()
      expect(commonArgs.paths).toBeDefined()
      expect(commonArgs.name).toBeDefined()
      expect(commonArgs.names).toBeDefined()
      expect(commonArgs.value).toBeDefined()
      expect(commonArgs.values).toBeDefined()
    })

    it("path schema validates strings", () => {
      const pathSchema = commonArgs.path
      expect(pathSchema.parse("./test.txt")).toBe("./test.txt")
    })

    it("paths schema validates arrays", () => {
      const pathsSchema = commonArgs.paths
      const result = pathsSchema.parse(["file1.txt", "file2.txt"])
      expect(result).toEqual(["file1.txt", "file2.txt"])
    })
  })

  describe("Complex Configurations", () => {
    it("handles config with all features", () => {
      const config: CLIConfig = {
        name: "full-cli",
        version: "1.0.0",
        description: "Full featured CLI",
        commands: {
          deploy: {
            description: "Deploy application",
            args: {
              target: z.enum(["dev", "staging", "prod"])
            },
            options: {
              ...commonOptions,
              dryRun: z.boolean().default(false).describe("Perform dry run")
            },
            handler: async (args) => {
              console.log(`Deploying to ${args.target}`)
            }
          }
        },
        globalOptions: commonOptions,
        plugins: ["my-plugin"],
        settings: {
          colors: true,
          interactive: true
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("merges complex nested structures", () => {
      const base: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          project: {
            description: "Project commands",
            commands: {
              create: {
                description: "Create project",
                handler: async () => {}
              }
            }
          }
        }
      }
      
      const extension = {
        commands: {
          project: {
            commands: {
              delete: {
                description: "Delete project",
                handler: async () => {}
              }
            }
          }
        }
      }
      
      const merged = mergeConfigs(base, extension)
      
      expect(merged.commands?.project?.commands?.create).toBeDefined()
      expect(merged.commands?.project?.commands?.delete).toBeDefined()
    })
  })
})