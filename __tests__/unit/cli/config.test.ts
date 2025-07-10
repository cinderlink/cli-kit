/**
 * Comprehensive tests for CLI Configuration
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  validateConfig,
  mergeConfigs,
  loadConfig,
  parseEnvVars,
  expandAliases,
  resolveConfigPath,
  createDefaultConfig,
  normalizeCommand,
  defineConfig,
  defineCommand,
  lazyLoad,
  commonOptions,
  commonArgs,
  type CLIConfig,
  type CommandConfig
} from "@/cli/config"
import { z } from "zod"

describe("CLI Configuration - Comprehensive", () => {
  describe("defineConfig", () => {
    it("creates basic config", () => {
      const config = defineConfig({
        name: "my-cli",
        version: "1.0.0"
      })
      
      expect(config.name).toBe("my-cli")
      expect(config.version).toBe("1.0.0")
      expect(config.commands).toEqual({})
    })

    it("creates config with all options", () => {
      const config = defineConfig({
        name: "full-cli",
        version: "2.0.0",
        description: "A full-featured CLI",
        commands: {
          test: defineCommand({
            description: "Run tests",
            handler: () => {}
          })
        },
        options: {
          verbose: commonOptions.verbose
        },
        plugins: [{
          name: "test-plugin",
          version: "1.0.0",
          commands: {}
        }],
        hooks: {
          beforeCommand: async () => {},
          afterCommand: async () => {}
        },
        settings: {
          theme: "dark",
          exitOnError: false
        }
      })
      
      expect(config.name).toBe("full-cli")
      expect(config.description).toBe("A full-featured CLI")
      expect(config.commands.test).toBeDefined()
      expect(config.options?.verbose).toBeDefined()
      expect(config.plugins).toHaveLength(1)
      expect(config.hooks?.beforeCommand).toBeDefined()
      expect(config.settings?.theme).toBe("dark")
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

    it("validates a complete config", () => {
      const config: CLIConfig = {
        name: "full-cli",
        version: "2.0.0",
        description: "Full featured CLI",
        commands: {
          test: {
            description: "Test command",
            handler: async () => {}
          }
        },
        globalOptions: {
          verbose: z.boolean().optional().describe("Verbose output"),
          config: z.string().optional().describe("Config file path")
        },
        hooks: {
          beforeCommand: async () => {},
          afterCommand: async () => {}
        },
        plugins: [],
        aliases: {
          t: "test",
          r: "run"
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("throws on invalid config", () => {
      const invalidConfigs = [
        { name: "", version: "1.0.0" }, // empty name
        { name: "test", version: "" }, // empty version
        { name: "test", version: "1.0.0", commands: "invalid" }, // invalid commands type
        { name: "test", version: "1.0.0", plugins: "invalid" } // invalid plugins type
      ]
      
      for (const config of invalidConfigs) {
        expect(() => validateConfig(config as any)).toThrow()
      }
    })
  })

  describe("defineCommand", () => {
    it("creates simple command", () => {
      const cmd = defineCommand({
        description: "Simple command",
        handler: () => {}
      })
      
      expect(cmd.description).toBe("Simple command")
      expect(cmd.handler).toBeDefined()
    })

    it("creates command with options and args", () => {
      const cmd = defineCommand({
        description: "Complex command",
        args: {
          file: commonArgs.file
        },
        options: {
          force: commonOptions.force,
          verbose: commonOptions.verbose
        },
        handler: () => {}
      })
      
      expect(cmd.args?.file).toBeDefined()
      expect(cmd.options?.force).toBeDefined()
      expect(cmd.options?.verbose).toBeDefined()
    })

    it("creates command with subcommands", () => {
      const cmd = defineCommand({
        description: "Parent command",
        subcommands: {
          add: defineCommand({
            description: "Add subcommand",
            handler: () => {}
          }),
          remove: defineCommand({
            description: "Remove subcommand",
            handler: () => {}
          })
        }
      })
      
      expect(cmd.subcommands?.add).toBeDefined()
      expect(cmd.subcommands?.remove).toBeDefined()
    })

    it("creates command with aliases", () => {
      const cmd = defineCommand({
        description: "Command with aliases",
        aliases: ["rm", "del"],
        handler: () => {}
      })
      
      expect(cmd.aliases).toEqual(["rm", "del"])
    })
  })

  describe("lazyLoad", () => {
    it("creates lazy-loaded command", () => {
      const cmd = lazyLoad(() => import("./test-module"))
      
      expect(cmd._lazy).toBe(true)
      expect(cmd._loader).toBeDefined()
    })

    it("creates lazy-loaded command with metadata", () => {
      const cmd = lazyLoad(() => import("./test-module"), {
        description: "Lazy command",
        aliases: ["lazy"]
      })
      
      expect(cmd.description).toBe("Lazy command")
      expect(cmd.aliases).toEqual(["lazy"])
    })
  })

  describe("mergeConfigs", () => {
    it("merges two configs", () => {
      const base: CLIConfig = {
        name: "base-cli",
        version: "1.0.0",
        commands: {
          test: {
            description: "Test command",
            handler: async () => {}
          }
        }
      }
      
      const override: CLIConfig = {
        name: "override-cli",
        version: "2.0.0",
        commands: {
          build: {
            description: "Build command",
            handler: async () => {}
          }
        },
        aliases: {
          t: "test"
        }
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.name).toBe("override-cli")
      expect(merged.version).toBe("2.0.0")
      expect(merged.commands?.test).toBeDefined()
      expect(merged.commands?.build).toBeDefined()
      expect(merged.aliases?.t).toBe("test")
    })

    it("merges configs with deep properties", () => {
      const base: CLIConfig = {
        name: "test",
        version: "1.0.0",
        settings: {
          theme: "light",
          colors: true
        }
      }
      
      const override: CLIConfig = {
        name: "test",
        version: "1.0.0",
        settings: {
          theme: "dark"
        }
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.settings?.theme).toBe("dark")
      expect(merged.settings?.colors).toBe(true)
    })
  })

  describe("expandAliases", () => {
    it("expands simple aliases", () => {
      const aliases = {
        t: "test",
        b: "build",
        r: "run"
      }
      
      expect(expandAliases("t", aliases)).toBe("test")
      expect(expandAliases("b", aliases)).toBe("build")
      expect(expandAliases("r", aliases)).toBe("run")
    })

    it("expands nested aliases", () => {
      const aliases = {
        t: "test",
        ta: "t --all",
        tav: "ta --verbose"
      }
      
      expect(expandAliases("ta", aliases)).toBe("test --all")
      expect(expandAliases("tav", aliases)).toBe("test --all --verbose")
    })

    it("returns original if no alias found", () => {
      const aliases = { t: "test" }
      
      expect(expandAliases("build", aliases)).toBe("build")
    })

    it("handles circular aliases", () => {
      const aliases = {
        a: "b",
        b: "c",
        c: "a"
      }
      
      expect(expandAliases("a", aliases)).toBe("a") // Should not infinite loop
    })
  })

  describe("parseEnvVars", () => {
    it("parses environment variables", () => {
      const env = {
        MY_CLI_NAME: "test-cli",
        MY_CLI_VERSION: "1.0.0",
        MY_CLI_VERBOSE: "true",
        OTHER_VAR: "ignored"
      }
      
      const parsed = parseEnvVars(env, "MY_CLI_")
      
      expect(parsed.name).toBe("test-cli")
      expect(parsed.version).toBe("1.0.0")
      expect(parsed.verbose).toBe(true)
      expect(parsed.other_var).toBeUndefined()
    })

    it("handles nested env vars", () => {
      const env = {
        CLI_SETTINGS_THEME: "dark",
        CLI_SETTINGS_COLORS: "false",
        CLI_HOOKS_BEFORE: "echo before"
      }
      
      const parsed = parseEnvVars(env, "CLI_")
      
      expect(parsed.settings_theme).toBe("dark")
      expect(parsed.settings_colors).toBe(false)
      expect(parsed.hooks_before).toBe("echo before")
    })
  })

  describe("createDefaultConfig", () => {
    it("creates default config with minimal input", () => {
      const config = createDefaultConfig({
        name: "my-cli",
        version: "1.0.0"
      })
      
      expect(config.name).toBe("my-cli")
      expect(config.version).toBe("1.0.0")
      expect(config.description).toBe("my-cli CLI")
      expect(config.commands).toEqual({})
      expect(config.settings?.colors).toBe(true)
    })

    it("preserves user settings", () => {
      const config = createDefaultConfig({
        name: "test",
        version: "1.0.0",
        description: "Custom description",
        settings: {
          colors: false
        }
      })
      
      expect(config.description).toBe("Custom description")
      expect(config.settings?.colors).toBe(false)
    })
  })

  describe("normalizeCommand", () => {
    it("normalizes command names", () => {
      expect(normalizeCommand("TEST")).toBe("test")
      expect(normalizeCommand("Test-Command")).toBe("test-command")
      expect(normalizeCommand("test_command")).toBe("test_command")
      expect(normalizeCommand("  test  ")).toBe("test")
    })
  })

  describe("resolveConfigPath", () => {
    it("resolves config paths", () => {
      const paths = [
        "./config.json",
        "../config.json",
        "~/config.json",
        "/absolute/config.json"
      ]
      
      for (const path of paths) {
        const resolved = resolveConfigPath(path)
        expect(resolved).toBeTruthy()
        expect(resolved).toContain("config.json")
      }
    })
  })

  describe("commonOptions", () => {
    it("provides standard options", () => {
      expect(commonOptions.verbose).toBeDefined()
      expect(commonOptions.force).toBeDefined()
      expect(commonOptions.yes).toBeDefined()
      expect(commonOptions.quiet).toBeDefined()
      expect(commonOptions.debug).toBeDefined()
    })
  })

  describe("commonArgs", () => {
    it("provides standard arguments", () => {
      expect(commonArgs.file).toBeDefined()
      expect(commonArgs.directory).toBeDefined()
      expect(commonArgs.files).toBeDefined()
    })
  })
})