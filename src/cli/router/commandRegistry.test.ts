/**
 * Command Registry Tests
 */

import { describe, it, expect } from "bun:test"
import { CommandRegistry } from "./commandRegistry"
import type { CommandConfig } from "@cli/types"

describe("CommandRegistry", () => {
  const createCommand = (description: string): CommandConfig => ({
    description,
    handler: () => {}
  })
  
  describe("initialize", () => {
    it("should initialize with commands", () => {
      const registry = new CommandRegistry()
      const commands = {
        build: createCommand("Build project"),
        test: createCommand("Run tests")
      }
      
      registry.initialize(commands)
      
      expect(registry.getCommands()).toEqual(["build", "test"])
    })
    
    it("should replace existing commands", () => {
      const registry = new CommandRegistry()
      
      registry.initialize({ old: createCommand("Old command") })
      expect(registry.hasCommand("old")).toBe(true)
      
      registry.initialize({ new: createCommand("New command") })
      expect(registry.hasCommand("old")).toBe(false)
      expect(registry.hasCommand("new")).toBe(true)
    })
  })
  
  describe("addCommand", () => {
    it("should add new commands", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build project"))
      
      expect(registry.hasCommand("build")).toBe(true)
      expect(registry.getCommand("build")?.description).toBe("Build project")
    })
    
    it("should overwrite existing commands", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build v1"))
      registry.addCommand("build", createCommand("Build v2"))
      
      expect(registry.getCommand("build")?.description).toBe("Build v2")
    })
  })
  
  describe("getCommand", () => {
    it("should get existing commands", () => {
      const registry = new CommandRegistry()
      const command = createCommand("Build project")
      
      registry.addCommand("build", command)
      
      expect(registry.getCommand("build")).toEqual(command)
    })
    
    it("should return null for non-existent commands", () => {
      const registry = new CommandRegistry()
      
      expect(registry.getCommand("unknown")).toBeNull()
    })
  })
  
  describe("removeCommand", () => {
    it("should remove existing commands", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build project"))
      expect(registry.hasCommand("build")).toBe(true)
      
      const removed = registry.removeCommand("build")
      expect(removed).toBe(true)
      expect(registry.hasCommand("build")).toBe(false)
    })
    
    it("should return false for non-existent commands", () => {
      const registry = new CommandRegistry()
      
      const removed = registry.removeCommand("unknown")
      expect(removed).toBe(false)
    })
  })
  
  describe("updateCommand", () => {
    it("should update existing commands", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build project"))
      
      const updated = registry.updateCommand("build", {
        description: "Build project with new description",
        aliases: ["b"]
      })
      
      expect(updated).toBe(true)
      
      const command = registry.getCommand("build")
      expect(command?.description).toBe("Build project with new description")
      expect(command?.aliases).toEqual(["b"])
      expect(command?.handler).toBeDefined() // Original handler preserved
    })
    
    it("should return false for non-existent commands", () => {
      const registry = new CommandRegistry()
      
      const updated = registry.updateCommand("unknown", {
        description: "New description"
      })
      
      expect(updated).toBe(false)
    })
  })
  
  describe("getAllCommands", () => {
    it("should return all commands as a copy", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build"))
      registry.addCommand("test", createCommand("Test"))
      
      const all1 = registry.getAllCommands()
      const all2 = registry.getAllCommands()
      
      expect(all1).not.toBe(all2) // Different objects
      expect(all1).toEqual(all2)  // Same contents
      expect(Object.keys(all1)).toEqual(["build", "test"])
    })
  })
  
  describe("clearCommands", () => {
    it("should clear all commands", () => {
      const registry = new CommandRegistry()
      
      registry.addCommand("build", createCommand("Build"))
      registry.addCommand("test", createCommand("Test"))
      expect(registry.getCommands().length).toBe(2)
      
      registry.clearCommands()
      expect(registry.getCommands().length).toBe(0)
      expect(registry.getAllCommands()).toEqual({})
    })
  })
})