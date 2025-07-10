/**
 * Tests for CLI Runner
 */

import { describe, it, expect, beforeEach, mock } from "bun:test"
import { CLIRunner } from "@/cli/runner"
import type { CLIConfig } from "@/cli/types"

describe("CLI Runner", () => {
  let config: CLIConfig
  let runner: CLIRunner
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let processExitSpy: any

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = mock(() => {})
    consoleErrorSpy = mock(() => {})
    processExitSpy = mock(() => {})
    
    global.console.log = consoleLogSpy
    global.console.error = consoleErrorSpy
    global.process.exit = processExitSpy as any

    // Basic config
    config = {
      name: "test-cli",
      version: "1.0.0",
      description: "Test CLI",
      commands: {
        test: {
          description: "Test command",
          handler: mock(() => Promise.resolve())
        },
        nested: {
          description: "Nested command",
          commands: {
            sub: {
              description: "Sub command",
              handler: mock(() => Promise.resolve())
            }
          }
        }
      }
    }
    
    runner = new CLIRunner(config)
  })

  describe("constructor", () => {
    it("validates config on creation", () => {
      expect(() => new CLIRunner(config)).not.toThrow()
    })

    it("throws on invalid config", () => {
      const invalidConfig = { name: "", version: "1.0.0" } as CLIConfig
      expect(() => new CLIRunner(invalidConfig)).toThrow()
    })
  })

  describe("run", () => {
    it("shows help when no arguments provided", async () => {
      await runner.run([])
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(processExitSpy).toHaveBeenCalledWith(0)
    })

    it("shows help with --help flag", async () => {
      await runner.run(["--help"])
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(processExitSpy).not.toHaveBeenCalled()
    })

    it("shows version with --version flag", async () => {
      await runner.run(["--version"])
      expect(consoleLogSpy).toHaveBeenCalledWith("test-cli 1.0.0")
      expect(processExitSpy).not.toHaveBeenCalled()
    })

    it("executes command handler", async () => {
      await runner.run(["test"])
      expect(config.commands.test.handler).toHaveBeenCalled()
    })

    it("executes nested command handler", async () => {
      await runner.run(["nested", "sub"])
      expect(config.commands.nested.commands?.sub.handler).toHaveBeenCalled()
    })

    it("shows error for unknown command", async () => {
      await runner.run(["unknown"])
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it("passes arguments to command handler", async () => {
      const handler = mock(() => Promise.resolve())
      config.commands.test.handler = handler
      runner = new CLIRunner(config)
      
      await runner.run(["test", "arg1", "arg2"])
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ["arg1", "arg2"],
          command: ["test"]
        })
      )
    })

    it("passes options to command handler", async () => {
      const handler = mock(() => Promise.resolve())
      config.commands.test.handler = handler
      runner = new CLIRunner(config)
      
      await runner.run(["test", "--verbose", "--force"])
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            verbose: true,
            force: true
          })
        })
      )
    })

    it("handles command errors gracefully", async () => {
      const error = new Error("Command failed")
      config.commands.test.handler = mock(() => Promise.reject(error))
      runner = new CLIRunner(config)
      
      await runner.run(["test"])
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Command failed"))
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it("runs beforeCommand hook", async () => {
      const beforeHook = mock(() => Promise.resolve())
      config.hooks = { beforeCommand: beforeHook }
      runner = new CLIRunner(config)
      
      await runner.run(["test"])
      expect(beforeHook).toHaveBeenCalled()
    })

    it("runs afterCommand hook", async () => {
      const afterHook = mock(() => Promise.resolve())
      config.hooks = { afterCommand: afterHook }
      runner = new CLIRunner(config)
      
      await runner.run(["test"])
      expect(afterHook).toHaveBeenCalled()
    })

    it("applies plugins", async () => {
      const pluginCommand = mock(() => Promise.resolve())
      const plugin = {
        name: "test-plugin",
        version: "1.0.0",
        commands: {
          plugin: {
            description: "Plugin command",
            handler: pluginCommand
          }
        }
      }
      
      config.plugins = [plugin]
      runner = new CLIRunner(config)
      
      await runner.run(["plugin"])
      expect(pluginCommand).toHaveBeenCalled()
    })

    it("suggests similar commands on typo", async () => {
      await runner.run(["tst"]) // typo of "test"
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Did you mean"))
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("test"))
    })

    it("expands aliases", async () => {
      config.aliases = { t: "test" }
      runner = new CLIRunner(config)
      
      await runner.run(["t"])
      expect(config.commands.test.handler).toHaveBeenCalled()
    })

    it("loads lazy commands", async () => {
      const lazyHandler = mock(() => Promise.resolve())
      config.commands.lazy = {
        description: "Lazy command",
        _lazy: true,
        _loader: () => Promise.resolve({ default: { handler: lazyHandler } })
      }
      runner = new CLIRunner(config)
      
      await runner.run(["lazy"])
      expect(lazyHandler).toHaveBeenCalled()
    })

    it("handles interactive mode", async () => {
      config.settings = { interactive: true }
      runner = new CLIRunner(config)
      
      // Interactive mode would normally start REPL
      await runner.run([])
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it("respects quiet mode", async () => {
      await runner.run(["test", "--quiet"])
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it("enables debug mode", async () => {
      await runner.run(["test", "--debug"])
      expect(process.env.DEBUG).toBeTruthy()
    })

    it("handles command with required args", async () => {
      config.commands.test.args = {
        file: { required: true, description: "File to test" }
      }
      runner = new CLIRunner(config)
      
      await runner.run(["test"])
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("required"))
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it("validates option types", async () => {
      config.commands.test.options = {
        count: { type: "number", description: "Count" }
      }
      runner = new CLIRunner(config)
      
      await runner.run(["test", "--count", "abc"])
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid"))
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe("showHelp", () => {
    it("shows general help", () => {
      runner.showHelp()
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const helpText = consoleLogSpy.mock.calls[0][0]
      expect(helpText).toContain("test-cli")
      expect(helpText).toContain("Test CLI")
      expect(helpText).toContain("COMMANDS:")
    })

    it("shows command-specific help", () => {
      runner.showHelp(["test"])
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("test"))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Test command"))
    })

    it("shows nested command help", () => {
      runner.showHelp(["nested", "sub"])
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const helpText = consoleLogSpy.mock.calls[0][0]
      expect(helpText).toContain("sub")
      expect(helpText).toContain("Sub command")
    })
  })

  describe("showVersion", () => {
    it("shows version string", () => {
      runner.showVersion()
      expect(consoleLogSpy).toHaveBeenCalledWith("test-cli 1.0.0")
    })
  })
})