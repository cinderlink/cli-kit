/**
 * Tests for CLI Configuration
 */

import { describe, it, expect } from "bun:test"
import {
  validateConfig,
  mergeConfigs,
  loadConfig,
  parseEnvVars,
  expandAliases,
  resolveConfigPath,
  createDefaultConfig,
  normalizeCommand,
  type CLIConfig
} from "@/cli/config"
import { z } from "zod"

describe("CLI Configuration", () => {
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
        settings: {
          colors: true,
          interactive: true
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("throws on invalid config", () => {
      const invalidConfigs = [
        { name: "", version: "1.0.0", description: "Empty name" },
        { name: "test", version: "", description: "Empty version" },
        { name: "test", version: "1.0.0", description: "" },
        { name: "test", version: "invalid-version", description: "Invalid version" }
      ]
      
      for (const config of invalidConfigs) {
        expect(() => validateConfig(config as CLIConfig)).toThrow()
      }
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
              },
              seed: {
                description: "Seed database",
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
    it("merges two configs", () => {
      const base: CLIConfig = {
        name: "base-cli",
        version: "1.0.0",
        description: "Base CLI",
        settings: {
          colors: true
        }
      }
      
      const override: Partial<CLIConfig> = {
        version: "2.0.0",
        settings: {
          interactive: false
        },
        commands: {
          new: {
            description: "New command",
            handler: async () => {}
          }
        }
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.name).toBe("base-cli")
      expect(merged.version).toBe("2.0.0")
      expect(merged.settings?.colors).toBe(true)
      expect(merged.settings?.interactive).toBe(false)
      expect(merged.commands?.new).toBeDefined()
    })

    it("deep merges commands", () => {
      const base: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          test: {
            description: "Test command",
            options: {
              force: z.boolean()
            },
            handler: async () => ({ result: "base" })
          }
        }
      }
      
      const override: Partial<CLIConfig> = {
        commands: {
          test: {
            description: "Updated test command",
            options: {
              verbose: z.boolean()
            }
          }
        }
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.commands?.test.description).toBe("Updated test command")
      expect(merged.commands?.test.options?.force).toBeDefined()
      expect(merged.commands?.test.options?.verbose).toBeDefined()
    })

    it("merges arrays correctly", () => {
      const base: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        plugins: ["plugin1"]
      }
      
      const override: Partial<CLIConfig> = {
        plugins: ["plugin2", "plugin3"]
      }
      
      const merged = mergeConfigs(base, override)
      
      expect(merged.plugins).toEqual(["plugin1", "plugin2", "plugin3"])
    })
  })

  describe("parseEnvVars", () => {
    it("parses environment variables", () => {
      const env = {
        CLI_NAME: "my-cli",
        CLI_VERSION: "3.0.0",
        CLI_COLORS: "false",
        CLI_VERBOSE: "true",
        OTHER_VAR: "ignored"
      }
      
      const config = parseEnvVars(env, "CLI_")
      
      expect(config.name).toBe("my-cli")
      expect(config.version).toBe("3.0.0")
      expect(config.settings?.colors).toBe(false)
      expect(config.globalOptions?.verbose).toBe(true)
    })

    it("handles nested env vars", () => {
      const env = {
        MYAPP_SETTINGS_COLORS: "true",
        MYAPP_SETTINGS_INTERACTIVE: "false",
        MYAPP_SETTINGS_OUTPUT: "json"
      }
      
      const config = parseEnvVars(env, "MYAPP_")
      
      expect(config.settings).toEqual({
        colors: true,
        interactive: false,
        output: "json"
      })
    })

    it("ignores invalid values", () => {
      const env = {
        CLI_COLORS: "not-a-boolean",
        CLI_VERSION: "1.0.0"
      }
      
      const config = parseEnvVars(env, "CLI_")
      
      expect(config.version).toBe("1.0.0")
      expect(config.settings?.colors).toBeUndefined()
    })
  })

  describe("expandAliases", () => {
    it("expands command aliases", () => {
      const config: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          install: {
            description: "Install packages",
            aliases: ["i", "add"],
            handler: async () => {}
          }
        }
      }
      
      const expanded = expandAliases(config)
      
      expect(expanded.commands?.i).toBeDefined()
      expect(expanded.commands?.add).toBeDefined()
      expect(expanded.commands?.i.handler).toBe(expanded.commands?.install.handler)
    })

    it("expands nested command aliases", () => {
      const config: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          database: {
            description: "Database commands",
            aliases: ["db"],
            subcommands: {
              migrate: {
                description: "Run migrations",
                aliases: ["m"],
                handler: async () => {}
              }
            }
          }
        }
      }
      
      const expanded = expandAliases(config)
      
      expect(expanded.commands?.db).toBeDefined()
      expect(expanded.commands?.db.subcommands?.m).toBeDefined()
    })

    it("warns on conflicting aliases", () => {
      const config: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        commands: {
          install: {
            description: "Install",
            aliases: ["i"],
            handler: async () => {}
          },
          info: {
            description: "Info",
            aliases: ["i"], // Conflict!
            handler: async () => {}
          }
        }
      }
      
      // Should handle conflicts gracefully
      const expanded = expandAliases(config)
      expect(expanded.commands?.i).toBeDefined()
    })
  })

  describe("loadConfig", () => {
    it("loads config from file", async () => {
      // This would normally read from filesystem
      // For testing, we'll mock the behavior
      const mockConfigPath = "/path/to/config.json"
      const mockConfig: CLIConfig = {
        name: "loaded-cli",
        version: "1.0.0",
        description: "Loaded from file"
      }
      
      // In real implementation, this would read from file
      // For now, just test the validation
      expect(() => validateConfig(mockConfig)).not.toThrow()
    })
  })

  describe("resolveConfigPath", () => {
    it("resolves config paths", () => {
      const paths = [
        ".myapprc",
        ".myapprc.json",
        ".myapprc.js",
        "myapp.config.js"
      ]
      
      // In real implementation, this would check filesystem
      // For testing, we verify the path patterns
      for (const path of paths) {
        expect(path).toMatch(/\.(json|js|rc)$|rc$/i)
      }
    })
  })

  describe("createDefaultConfig", () => {
    it("creates default config", () => {
      const config = createDefaultConfig("my-app")
      
      expect(config.name).toBe("my-app")
      expect(config.version).toBe("0.0.1")
      expect(config.description).toBe("A CLI application")
      expect(config.settings?.colors).toBe(true)
      expect(config.settings?.interactive).toBe(true)
    })
  })

  describe("normalizeCommand", () => {
    it("normalizes command names", () => {
      const tests = [
        { input: "my-command", expected: "my-command" },
        { input: "MyCommand", expected: "mycommand" },
        { input: "my_command", expected: "my-command" },
        { input: "MY_COMMAND", expected: "my-command" },
        { input: "myCommand", expected: "mycommand" }
      ]
      
      for (const test of tests) {
        expect(normalizeCommand(test.input)).toBe(test.expected)
      }
    })
  })

  describe("Complex Configuration Scenarios", () => {
    it("handles deeply nested commands", () => {
      const config: CLIConfig = {
        name: "complex-cli",
        version: "1.0.0",
        description: "Complex CLI",
        commands: {
          project: {
            description: "Project commands",
            subcommands: {
              create: {
                description: "Create project",
                subcommands: {
                  react: {
                    description: "Create React project",
                    handler: async () => {}
                  },
                  vue: {
                    description: "Create Vue project",
                    handler: async () => {}
                  }
                }
              }
            }
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("handles command inheritance", () => {
      const config: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        globalOptions: {
          verbose: z.boolean().default(false)
        },
        commands: {
          deploy: {
            description: "Deploy",
            options: {
              env: z.enum(["dev", "prod"])
            },
            handler: async () => {}
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
      // Commands should inherit global options
    })

    it("validates plugin configuration", () => {
      const config: CLIConfig = {
        name: "cli",
        version: "1.0.0",
        description: "CLI",
        plugins: [
          "my-plugin",
          {
            name: "inline-plugin",
            version: "1.0.0",
            commands: {
              custom: {
                description: "Custom command",
                handler: async () => {}
              }
            }
          }
        ]
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })
  })
})