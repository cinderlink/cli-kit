/**
 * Help Display Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"
import { HelpDisplay } from "./helpDisplay"
import type { CLIConfig } from "@cli/types"

describe("HelpDisplay", () => {
  let mockParser: { generateHelp: (commandPath?: string[]) => string }
  let config: CLIConfig
  let originalLog: typeof console.log
  let logOutput: string[]
  
  beforeEach(() => {
    // Mock console.log
    originalLog = console.log
    logOutput = []
    console.log = mock((...args: unknown[]) => {
      logOutput.push(args.join(' '))
    })
    
    // Mock parser
    mockParser = {
      generateHelp: mock((commandPath?: string[]) => {
        if (commandPath) {
          return `Help for command: ${commandPath.join(' ')}`
        }
        return "General help text"
      })
    }
    
    // Test config
    config = {
      name: "test-cli",
      version: "1.0.0"
    }
  })
  
  afterEach(() => {
    console.log = originalLog
  })
  
  describe("showHelp", () => {
    it("should show general help when no command path provided", () => {
      const display = new HelpDisplay(config, mockParser)
      display.showHelp()
      
      expect(mockParser.generateHelp).toHaveBeenCalledWith(undefined)
      expect(logOutput).toContain("General help text")
    })
    
    it("should show command-specific help when path provided", () => {
      const display = new HelpDisplay(config, mockParser)
      display.showHelp(["build", "watch"])
      
      expect(mockParser.generateHelp).toHaveBeenCalledWith(["build", "watch"])
      expect(logOutput).toContain("Help for command: build watch")
    })
  })
  
  describe("showVersion", () => {
    it("should display name and version", () => {
      const display = new HelpDisplay(config, mockParser)
      display.showVersion()
      
      expect(logOutput).toContain("test-cli 1.0.0")
    })
  })
  
  describe("isHelpRequested", () => {
    it("should return true when help is true", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isHelpRequested({ help: true })).toBe(true)
    })
    
    it("should return false when help is false", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isHelpRequested({ help: false })).toBe(false)
    })
    
    it("should return false when help is not present", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isHelpRequested({})).toBe(false)
    })
  })
  
  describe("isVersionRequested", () => {
    it("should return true when version is true", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isVersionRequested({ version: true })).toBe(true)
    })
    
    it("should return false when version is false", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isVersionRequested({ version: false })).toBe(false)
    })
    
    it("should return false when version is not present", () => {
      const display = new HelpDisplay(config, mockParser)
      expect(display.isVersionRequested({})).toBe(false)
    })
  })
})