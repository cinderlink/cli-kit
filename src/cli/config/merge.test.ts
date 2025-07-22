/**
 * Configuration Merging Tests
 */

import { describe, it, expect } from "bun:test"
import { mergeConfigs, expandAliases } from "./merge"
import type { CLIConfig } from "@cli/types"
import { z } from "zod"

describe("Configuration Merging", () => {
  describe("mergeConfigs", () => {
    it("should merge basic properties", () => {
      const base = {
        name: "base-cli",
        version: "1.0.0",
        description: "Base CLI"
      }
      
      const override = {
        description: "Updated CLI",
        settings: { debug: true }
      }
      
      const result = mergeConfigs(base, override)
      
      expect(result.name).toBe("base-cli")
      expect(result.version).toBe("1.0.0")
      expect(result.description).toBe("Updated CLI")
      expect(result.settings).toEqual({ debug: true })
    })

    it("should merge options", () => {
      const base = {
        name: "cli",
        version: "1.0.0",
        options: {
          verbose: z.boolean(),
          output: z.string()
        }
      }
      
      const override = {
        options: {
          debug: z.boolean(),
          output: z.string().optional() // Override
        }
      }
      
      const result = mergeConfigs(base, override)
      
      expect(Object.keys(result.options || {})).toContain("verbose")
      expect(Object.keys(result.options || {})).toContain("debug")
      expect(Object.keys(result.options || {})).toContain("output")
    })

    it("should merge commands recursively", () => {
      const base = {
        name: "cli",
        version: "1.0.0",
        commands: {
          build: {
            description: "Build project",
            options: { watch: z.boolean() },
            handler: () => console.log("build")
          },
          test: {
            description: "Run tests",
            handler: () => console.log("test")
          }
        }
      }
      
      const override = {
        commands: {
          build: {
            description: "Build project with enhancements",
            options: { output: z.string() }
          },
          deploy: {
            description: "Deploy project",
            handler: () => console.log("deploy")
          }
        }
      }
      
      const result = mergeConfigs(base, override)
      
      expect(result.commands?.build?.description).toBe("Build project with enhancements")
      expect(Object.keys(result.commands?.build?.options || {})).toContain("watch")
      expect(Object.keys(result.commands?.build?.options || {})).toContain("output")
      expect(result.commands?.test).toBeDefined()
      expect(result.commands?.deploy).toBeDefined()
    })

    it("should compose hooks", async () => {
      let calls: string[] = []
      
      const base = {
        name: "cli",
        version: "1.0.0",
        hooks: {
          preCommand: async () => { calls.push("base-pre") },
          postCommand: async () => { calls.push("base-post") }
        }
      }
      
      const override = {
        hooks: {
          preCommand: async () => { calls.push("override-pre") },
          postCommand: async () => { calls.push("override-post") }
        }
      }
      
      const result = mergeConfigs(base, override)
      
      // Execute hooks with mock context
      const mockContext = { args: {}, command: "test" } as any
      await result.hooks?.preCommand?.(mockContext)
      await result.hooks?.postCommand?.(mockContext, "test-result")
      
      // Both hooks should be called in order
      expect(calls).toEqual(["base-pre", "override-pre", "base-post", "override-post"])
    })

    it("should handle null/undefined configs", () => {
      const base = {
        name: "cli",
        version: "1.0.0"
      }
      
      const result = mergeConfigs(base, null as unknown as CLIConfig, undefined as unknown as CLIConfig, {})
      
      expect(result.name).toBe("cli")
      expect(result.version).toBe("1.0.0")
    })
  })

  describe("expandAliases", () => {
    it("should expand command aliases", () => {
      expect(expandAliases("b", { b: "build" })).toBe("build")
      expect(expandAliases("t", { t: "test" })).toBe("test")
    })

    it("should handle chained aliases", () => {
      const aliases = {
        b: "build",
        bd: "b",
        bld: "bd"
      }
      
      expect(expandAliases("bld", aliases)).toBe("build")
    })

    it("should prevent infinite recursion", () => {
      const aliases = {
        a: "b",
        b: "c",
        c: "a" // Circular reference
      }
      
      expect(() => expandAliases("a", aliases)).not.toThrow()
    })

    it("should return original if no alias", () => {
      expect(expandAliases("build", { b: "build" })).toBe("build")
    })

    it("should expand aliases in config", () => {
      const config = {
        name: "cli",
        version: "1.0.0",
        aliases: {
          b: "build",
          t: "test"
        },
        commands: {
          build: {
            description: "Build command",
            handler: () => console.log("build")
          },
          test: {
            description: "Test command",
            handler: () => console.log("test")
          }
        }
      }
      
      const expanded = expandAliases(config)
      
      // Should add aliased commands marked as hidden
      expect(expanded.commands?.b).toBeDefined()
      expect(expanded.commands?.b?.hidden).toBe(true)
      expect(expanded.commands?.t).toBeDefined()
      expect(expanded.commands?.t?.hidden).toBe(true)
    })
  })
})