/**
 * Configuration Validation Tests
 */

import { describe, it, expect } from "bun:test"
import { validateConfig, normalizeCommand } from "./validation"
import { z } from "zod"

describe("Configuration Validation", () => {
  describe("validateConfig", () => {
    it("should validate valid config", () => {
      const config = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          test: {
            description: "Test command",
            handler: () => console.log("test")
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it("should reject invalid version format", () => {
      const config = {
        name: "test-cli",
        version: "invalid-version",
        commands: {}
      }
      
      expect(() => validateConfig(config)).toThrow("Invalid version format")
    })

    it("should reject reserved command names", () => {
      const config = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          help: {
            description: "Custom help",
            handler: () => console.log("help")
          }
        }
      }
      
      expect(() => validateConfig(config)).toThrow("reserved and cannot be used")
    })

    it("should reject reserved subcommand names", () => {
      const config = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          git: {
            description: "Git commands",
            commands: {
              version: {
                description: "Version info",
                handler: () => console.log("version")
              }
            }
          }
        }
      }
      
      expect(() => validateConfig(config)).toThrow("reserved and cannot be used")
    })

    it("should require handler for leaf commands", () => {
      const config = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          test: {
            description: "Test command"
            // Missing handler
          }
        }
      }
      
      expect(() => validateConfig(config)).toThrow("must have a handler function")
    })

    it("should allow commands with subcommands without handler", () => {
      const config = {
        name: "test-cli",
        version: "1.0.0",
        commands: {
          git: {
            description: "Git commands",
            commands: {
              status: {
                description: "Show status",
                handler: () => console.log("status")
              }
            }
          }
        }
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })
  })

  describe("normalizeCommand", () => {
    it("should normalize string command", () => {
      expect(normalizeCommand("  TEST  ")).toBe("test")
      expect(normalizeCommand("CamelCase")).toBe("camelcase")
    })

    it("should normalize command config", () => {
      const command = {
        description: "Test command",
        handler: () => console.log("test")
      }
      
      const normalized = normalizeCommand(command)
      
      expect(normalized.options).toEqual({})
      expect(normalized.args).toEqual({})
      expect(normalized.commands).toEqual({})
    })
  })
})