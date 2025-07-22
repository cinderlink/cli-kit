/**
 * Command Resolver Tests
 */

import { describe, it, expect } from "bun:test"
import { CommandResolver } from "./commandResolver"
import type { CLIConfig } from "@cli/types"
import { z } from "zod"

describe("CommandResolver", () => {
  const testConfig: CLIConfig = {
    name: "test-cli",
    version: "1.0.0",
    commands: {
      build: {
        description: "Build project",
        handler: () => {},
        aliases: ["b"],
        commands: {
          watch: {
            description: "Build with watch mode",
            handler: () => {}
          }
        }
      },
      test: {
        description: "Run tests",
        handler: () => {},
        hidden: false
      },
      hidden: {
        description: "Hidden command",
        handler: () => {},
        hidden: true
      }
    }
  }
  
  describe("findCommandConfig", () => {
    it("should find top-level commands", () => {
      const resolver = new CommandResolver(testConfig)
      const config = resolver.findCommandConfig(["build"])
      
      expect(config).toBeTruthy()
      expect(config?.description).toBe("Build project")
    })
    
    it("should find nested commands", () => {
      const resolver = new CommandResolver(testConfig)
      const config = resolver.findCommandConfig(["build", "watch"])
      
      expect(config).toBeTruthy()
      expect(config?.description).toBe("Build with watch mode")
    })
    
    it("should return null for unknown commands", () => {
      const resolver = new CommandResolver(testConfig)
      const config = resolver.findCommandConfig(["unknown"])
      
      expect(config).toBeNull()
    })
    
    it("should return null for invalid nested paths", () => {
      const resolver = new CommandResolver(testConfig)
      const config = resolver.findCommandConfig(["build", "unknown"])
      
      expect(config).toBeNull()
    })
  })
  
  describe("getAvailableCommands", () => {
    it("should get top-level commands", () => {
      const resolver = new CommandResolver(testConfig)
      const commands = resolver.getAvailableCommands()
      
      expect(commands).toContain("build")
      expect(commands).toContain("test")
      expect(commands).not.toContain("hidden")
    })
    
    it("should get nested commands", () => {
      const resolver = new CommandResolver(testConfig)
      const commands = resolver.getAvailableCommands(["build"])
      
      expect(commands).toContain("watch")
      expect(commands.length).toBe(1)
    })
    
    it("should return empty array for invalid paths", () => {
      const resolver = new CommandResolver(testConfig)
      const commands = resolver.getAvailableCommands(["unknown"])
      
      expect(commands).toEqual([])
    })
  })
  
  describe("getCommandAliases", () => {
    it("should get command aliases", () => {
      const resolver = new CommandResolver(testConfig)
      const aliases = resolver.getCommandAliases("build")
      
      expect(aliases).toEqual(["b"])
    })
    
    it("should return empty array for commands without aliases", () => {
      const resolver = new CommandResolver(testConfig)
      const aliases = resolver.getCommandAliases("test")
      
      expect(aliases).toEqual([])
    })
    
    it("should return empty array for unknown commands", () => {
      const resolver = new CommandResolver(testConfig)
      const aliases = resolver.getCommandAliases("unknown")
      
      expect(aliases).toEqual([])
    })
  })
  
  describe("resolveCommandName", () => {
    it("should resolve direct command names", () => {
      const resolver = new CommandResolver(testConfig)
      const resolved = resolver.resolveCommandName("build")
      
      expect(resolved).toBe("build")
    })
    
    it("should resolve aliases", () => {
      const resolver = new CommandResolver(testConfig)
      const resolved = resolver.resolveCommandName("b")
      
      expect(resolved).toBe("build")
    })
    
    it("should return null for unknown commands", () => {
      const resolver = new CommandResolver(testConfig)
      const resolved = resolver.resolveCommandName("unknown")
      
      expect(resolved).toBeNull()
    })
  })
  
  describe("validateCommandPath", () => {
    it("should validate valid paths", () => {
      const resolver = new CommandResolver(testConfig)
      
      expect(resolver.validateCommandPath(["build"])).toBe(true)
      expect(resolver.validateCommandPath(["build", "watch"])).toBe(true)
    })
    
    it("should invalidate invalid paths", () => {
      const resolver = new CommandResolver(testConfig)
      
      expect(resolver.validateCommandPath(["unknown"])).toBe(false)
      expect(resolver.validateCommandPath(["build", "unknown"])).toBe(false)
    })
  })
})