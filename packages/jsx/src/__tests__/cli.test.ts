/**
 * Tests for CLI components
 * Covers CLI, Command, Scope, Arg, Flag, Help, Example components
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { CLI, Command, Scope, Arg, Flag, Help, Example, getCurrentCLIConfig, resetCLIState } from "../cli"

describe("CLI Components", () => {
  beforeEach(() => {
    resetCLIState()
  })

  describe("CLI component", () => {
    test("should create CLI configuration", () => {
      const result = CLI({
        name: "test-cli",
        alias: "tc",
        description: "Test CLI application",
        version: "1.0.0"
      })

      // CLI component should be invisible
      expect(result.render()).toBe("")

      // Should store CLI configuration
      const config = getCurrentCLIConfig()
      expect(config).not.toBeNull()
      expect(config?.name).toBe("test-cli")
      expect(config?.alias).toBe("tc")
      expect(config?.description).toBe("Test CLI application")
      expect(config?.version).toBe("1.0.0")
    })

    test("should handle minimal CLI configuration", () => {
      const result = CLI({ name: "minimal-cli" })

      expect(result.render()).toBe("")
      
      const config = getCurrentCLIConfig()
      expect(config?.name).toBe("minimal-cli")
      expect(config?.alias).toBeUndefined()
      expect(config?.description).toBeUndefined()
      expect(config?.version).toBeUndefined()
    })

    test("should handle CLI with configName", () => {
      const result = CLI({
        name: "custom-cli",
        configName: "custom-config"
      })

      expect(result.render()).toBe("")
      
      const config = getCurrentCLIConfig()
      expect(config?.name).toBe("custom-cli")
      expect(config?.configName).toBe("custom-config")
    })

    test("should handle CLI with function children", () => {
      const childrenFn = ({ config }: { config: any }) => {
        expect(config).toBeDefined()
        expect(config.name).toBe("test-cli")
        return Command({ name: "child-command" })
      }

      const result = CLI({
        name: "test-cli",
        children: childrenFn
      })

      expect(result.render()).toBe("")
    })
  })

  describe("Command component", () => {
    test("should create basic command", () => {
      const result = Command({
        name: "test-command",
        description: "A test command"
      })

      // Command component should be invisible
      expect(result.render()).toBe("")
    })

    test("should handle command with handler", () => {
      const mockHandler = (ctx: any) => ({ render: () => "Handler executed" })
      
      const result = Command({
        name: "handler-command",
        handler: mockHandler
      })

      expect(result.render()).toBe("")
    })

    test("should handle command with aliases", () => {
      const result = Command({
        name: "aliased-command",
        aliases: ["ac", "alias-cmd"]
      })

      expect(result.render()).toBe("")
    })

    test("should handle hidden command", () => {
      const result = Command({
        name: "hidden-command",
        hidden: true
      })

      expect(result.render()).toBe("")
    })

    test("should handle interactive command", () => {
      const result = Command({
        name: "interactive-command",
        interactive: true
      })

      expect(result.render()).toBe("")
    })

    test("should handle command with function interactive", () => {
      const interactiveFn = (ctx: any) => true
      
      const result = Command({
        name: "conditional-interactive",
        interactive: interactiveFn
      })

      expect(result.render()).toBe("")
    })

    test("should handle command with schema", () => {
      const mockSchema = {
        args: { name: { description: "Name argument" } },
        flags: { verbose: { description: "Verbose flag" } }
      }
      
      const result = Command({
        name: "schema-command",
        schema: mockSchema
      })

      expect(result.render()).toBe("")
    })

    test("should handle command with inline args and flags", () => {
      const result = Command({
        name: "inline-command",
        args: {
          target: {
            description: "Target argument",
            required: true,
            type: "string"
          }
        },
        flags: {
          force: {
            description: "Force flag",
            alias: "f",
            type: "boolean",
            default: false
          }
        }
      })

      expect(result.render()).toBe("")
    })

    test("should handle command with function children", () => {
      const childrenFn = (context: any) => {
        expect(context).toBeDefined()
        return Arg({ name: "dynamic-arg", description: "Dynamic argument" })
      }

      const result = Command({
        name: "function-children-command",
        children: childrenFn
      })

      expect(result.render()).toBe("")
    })

    test("should handle anonymous command", () => {
      const result = Command({
        description: "Anonymous command with no name"
      })

      expect(result.render()).toBe("")
    })
  })

  describe("Scope component", () => {
    test("should create basic scope", () => {
      const result = Scope({
        name: "test-scope",
        description: "A test scope"
      })

      // Scope component should be invisible
      expect(result.render()).toBe("")
    })

    test("should handle scope without description", () => {
      const result = Scope({
        name: "minimal-scope"
      })

      expect(result.render()).toBe("")
    })

    test("should handle scope with children", () => {
      const children = [
        Command({ name: "scope-command-1" }),
        Command({ name: "scope-command-2" })
      ]

      const result = Scope({
        name: "parent-scope",
        children: children
      })

      expect(result.render()).toBe("")
    })
  })

  describe("Arg component", () => {
    test("should create basic argument", () => {
      const result = Arg({
        name: "target",
        description: "Target file or directory"
      })

      // Arg component should be invisible
      expect(result.render()).toBe("")
    })

    test("should handle required argument", () => {
      const result = Arg({
        name: "required-arg",
        description: "Required argument",
        required: true
      })

      expect(result.render()).toBe("")
    })

    test("should handle typed argument", () => {
      const result = Arg({
        name: "count",
        description: "Number of items",
        type: "number",
        default: 10
      })

      expect(result.render()).toBe("")
    })

    test("should handle argument with choices", () => {
      const result = Arg({
        name: "format",
        description: "Output format",
        type: "string",
        choices: ["json", "yaml", "xml"]
      })

      expect(result.render()).toBe("")
    })
  })

  describe("Flag component", () => {
    test("should create basic flag", () => {
      const result = Flag({
        name: "verbose",
        description: "Enable verbose output"
      })

      // Flag component should be invisible
      expect(result.render()).toBe("")
    })

    test("should handle flag with alias", () => {
      const result = Flag({
        name: "verbose",
        description: "Enable verbose output",
        alias: "v"
      })

      expect(result.render()).toBe("")
    })

    test("should handle typed flag", () => {
      const result = Flag({
        name: "port",
        description: "Server port",
        type: "number",
        default: 3000
      })

      expect(result.render()).toBe("")
    })

    test("should handle flag with choices", () => {
      const result = Flag({
        name: "log-level",
        description: "Log level",
        type: "string",
        choices: ["debug", "info", "warn", "error"],
        default: "info"
      })

      expect(result.render()).toBe("")
    })
  })

  describe("Help component", () => {
    test("should create help with string children", () => {
      const result = Help({
        children: "This is help text for the command"
      })

      // Help component should be invisible
      expect(result.render()).toBe("")
    })

    test("should handle help without children", () => {
      const result = Help({})
      expect(result.render()).toBe("")
    })
  })

  describe("Example component", () => {
    test("should create example with string children", () => {
      const result = Example({
        children: "my-cli command --flag value"
      })

      // Example component should be invisible
      expect(result.render()).toBe("")
    })

    test("should create example with description", () => {
      const result = Example({
        children: "my-cli advanced --verbose",
        description: "Run command with verbose output"
      })

      expect(result.render()).toBe("")
    })

    test("should handle example without children", () => {
      const result = Example({})
      expect(result.render()).toBe("")
    })
  })

  describe("CLI state management", () => {
    test("should reset CLI state", () => {
      // Set up some state
      CLI({ name: "test-cli" })
      expect(getCurrentCLIConfig()).not.toBeNull()

      // Reset state
      resetCLIState()
      expect(getCurrentCLIConfig()).toBeNull()
    })

    test("should handle multiple CLI calls", () => {
      CLI({ name: "first-cli" })
      expect(getCurrentCLIConfig()?.name).toBe("first-cli")

      CLI({ name: "second-cli" })
      expect(getCurrentCLIConfig()?.name).toBe("second-cli")
    })
  })

  describe("Integration scenarios", () => {
    test("should handle complex CLI structure", () => {
      const cliResult = CLI({
        name: "complex-cli",
        version: "2.0.0",
        description: "A complex CLI application"
      })

      const scopeResult = Scope({
        name: "database",
        description: "Database operations"
      })

      const commandResult = Command({
        name: "migrate",
        description: "Run database migrations",
        handler: (ctx: any) => ({ render: () => "Migration complete" })
      })

      const argResult = Arg({
        name: "direction",
        description: "Migration direction",
        choices: ["up", "down"],
        default: "up"
      })

      const flagResult = Flag({
        name: "dry-run",
        description: "Preview changes without applying",
        alias: "n",
        type: "boolean"
      })

      const helpResult = Help({
        children: "Use this command to manage database schema changes"
      })

      const exampleResult = Example({
        children: "complex-cli database migrate --dry-run",
        description: "Preview migrations"
      })

      // All components should be invisible
      expect(cliResult.render()).toBe("")
      expect(scopeResult.render()).toBe("")
      expect(commandResult.render()).toBe("")
      expect(argResult.render()).toBe("")
      expect(flagResult.render()).toBe("")
      expect(helpResult.render()).toBe("")
      expect(exampleResult.render()).toBe("")

      // CLI config should be stored
      const config = getCurrentCLIConfig()
      expect(config?.name).toBe("complex-cli")
      expect(config?.version).toBe("2.0.0")
    })
  })
})