/**
 * CLI Parser Tests
 */

import { describe, it, expect } from "bun:test"
import { CLIParser } from "./parser"
import { z } from "zod"
import type { CLIConfig } from "@cli/types"

describe("CLI Parser", () => {
  const testConfig: CLIConfig = {
    name: "test-cli",
    version: "1.0.0",
    options: {
      verbose: z.boolean().default(false),
      config: z.string().optional()
    },
    commands: {
      build: {
        description: "Build project",
        options: {
          watch: z.boolean().default(false),
          output: z.string().default("dist")
        },
        args: {
          target: z.string()
        },
        handler: () => {}
      },
      test: {
        description: "Run tests",
        options: {
          coverage: z.boolean().default(false)
        },
        handler: () => {}
      }
    }
  }

  describe("Basic Parsing", () => {
    it("should parse command with no arguments", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["test"])
      
      expect(result.command).toEqual(["test"])
      expect(result.options.coverage).toBe(false)
      expect(result.args).toEqual({})
    })

    it("should parse command with options", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["test", "--coverage"])
      
      expect(result.command).toEqual(["test"])
      expect(result.options.coverage).toBe(true)
    })

    it("should parse command with arguments", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "src"])
      
      expect(result.command).toEqual(["build"])
      expect(result.args.target).toBe("src")
    })

    it("should parse global options", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["test", "--verbose"])
      
      expect(result.command).toEqual(["test"])
      expect(result.options.verbose).toBe(true)
    })
  })

  describe("Option Parsing", () => {
    it("should parse long options with values", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "src", "--output", "build"])
      
      expect(result.options.output).toBe("build")
    })

    it("should parse long options with equals", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "src", "--output=build"])
      
      expect(result.options.output).toBe("build")
    })

    it("should parse short options", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["test", "-c"])
      
      // Note: This would need short option mapping in real implementation
      expect(result.options.c).toBe(true)
    })

    it("should apply default values", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "src"])
      
      expect(result.options.watch).toBe(false)
      expect(result.options.output).toBe("dist")
    })

    it("should handle help option specially", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["--help"])
      
      expect(result.options.help).toBe(true)
    })

    it("should handle version option specially", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["--version"])
      
      expect(result.options.version).toBe(true)
    })
  })

  describe("Argument Parsing", () => {
    it("should parse positional arguments", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "src"])
      
      expect(result.args.target).toBe("src")
    })

    it("should handle -- separator", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "--", "src"])
      
      expect(result.args.target).toBe("src")
    })

    it("should parse string arguments that look like numbers", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse(["build", "123"])
      
      // Parser returns 123 as number, but Zod expects string so it stays as "123"
      expect(result.args.target).toBe("123")
    })
  })

  describe("Validation", () => {
    it("should throw on missing required argument", () => {
      const parser = new CLIParser(testConfig)
      
      expect(() => parser.parse(["build"])).toThrow("Missing required argument")
    })

    it("should throw on invalid option type", () => {
      const parser = new CLIParser(testConfig)
      
      expect(() => parser.parse(["build", "src", "--watch", "not-boolean"]))
        .toThrow()
    })

    it("should allow extra arguments", () => {
      const parser = new CLIParser(testConfig)
      
      expect(() => parser.parse(["build", "src", "extra1", "extra2"]))
        .toThrow("Too many arguments")
    })
  })

  describe("Complex Scenarios", () => {
    it("should handle mixed options and arguments", () => {
      const parser = new CLIParser(testConfig)
      const result = parser.parse([
        "build",
        "src",
        "--verbose",
        "--watch",
        "--output=build",
        "--config",
        "custom.json"
      ])
      
      expect(result.command).toEqual(["build"])
      expect(result.options.verbose).toBe(true)
      expect(result.options.watch).toBe(true)
      expect(result.options.output).toBe("build")
      expect(result.options.config).toBe("custom.json")
      expect(result.args.target).toBe("src")
    })

    it("should preserve raw arguments", () => {
      const parser = new CLIParser(testConfig)
      const argv = ["test", "--coverage", "-v"]
      const result = parser.parse(argv)
      
      expect(result.rawArgs).toEqual(argv)
    })
  })
})