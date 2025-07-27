/**
 * Help System Tests
 */

import { describe, it, expect, beforeEach, mock } from "bun:test"
import { HelpGenerator } from "./help"
import { generateHelpData } from "./helpData"
import { TextViewRuntime, viewRuntimeRegistry } from "./viewRuntime"
import type { CLIConfig } from "@cli/types"
import { z } from "zod"

describe("Help System", () => {
  const testConfig: CLIConfig = {
    name: "test-cli",
    version: "1.0.0",
    description: "Test CLI application",
    options: {
      verbose: z.boolean().describe("Enable verbose output"),
      config: z.string().describe("Config file path")
    },
    commands: {
      build: {
        description: "Build the project",
        options: {
          watch: z.boolean().describe("Watch for changes"),
          output: z.string().describe("Output directory")
        },
        args: {
          target: z.string().describe("Build target")
        }
      },
      test: {
        description: "Run tests",
        aliases: ["t"],
        commands: {
          unit: {
            description: "Run unit tests"
          },
          integration: {
            description: "Run integration tests"
          }
        }
      }
    }
  }
  
  beforeEach(() => {
    // Reset to default text runtime
    viewRuntimeRegistry.reset()
  })
  
  describe("generateHelpData", () => {
    it("should generate global help data", () => {
      const data = generateHelpData(testConfig)
      
      expect(data.name).toBe("test-cli")
      expect(data.version).toBe("1.0.0")
      expect(data.description).toBe("Test CLI application")
      
      // Check sections
      const sections = data.sections
      const headerSection = sections.find(s => s.type === 'header')
      expect(headerSection?.content).toBe("test-cli")
      
      const usageSection = sections.find(s => s.type === 'usage')
      expect(usageSection?.content).toBe("test-cli [OPTIONS] <COMMAND>")
      
      const commandsSection = sections.find(s => s.type === 'commands')
      expect(commandsSection?.items).toHaveLength(2)
      expect(commandsSection?.items?.[0]?.name).toBe("build")
      expect(commandsSection?.items?.[1]?.name).toBe("test")
    })
    
    it("should generate command-specific help data", () => {
      const data = generateHelpData(testConfig, ["build"])
      
      expect(data.commandPath).toEqual(["build"])
      
      const usageSection = data.sections.find(s => s.type === 'usage')
      expect(usageSection?.content).toBe("test-cli build [OPTIONS] <target>")
      
      const argsSection = data.sections.find(s => s.type === 'arguments')
      expect(argsSection?.items).toHaveLength(1)
      expect(argsSection?.items?.[0]?.name).toBe("<target>")
      
      const optionsSection = data.sections.find(s => s.type === 'options')
      expect(optionsSection?.items).toHaveLength(2)
    })
    
    it("should handle nested commands", () => {
      const data = generateHelpData(testConfig, ["test"])
      
      const commandsSection = data.sections.find(s => s.type === 'commands')
      expect(commandsSection?.items).toHaveLength(2)
      expect(commandsSection?.items?.[0]?.name).toBe("unit")
      expect(commandsSection?.items?.[1]?.name).toBe("integration")
    })
  })
  
  describe("HelpGenerator", () => {
    it("should generate help using the view runtime", () => {
      const generator = new HelpGenerator(testConfig)
      
      // Mock console.log to capture output
      const originalLog = console.log
      const output: string[] = []
      console.log = mock((msg: string) => output.push(msg))
      
      try {
        generator.generateHelp()
        
        // Check that help was rendered
        expect(output.length).toBeGreaterThan(0)
        const helpText = output.join('\n')
        
        expect(helpText).toContain("test-cli")
        expect(helpText).toContain("v1.0.0")
        expect(helpText).toContain("Test CLI application")
        expect(helpText).toContain("USAGE:")
        expect(helpText).toContain("COMMANDS:")
        expect(helpText).toContain("build")
        expect(helpText).toContain("test")
      } finally {
        console.log = originalLog
      }
    })
  })
  
  describe("TextViewRuntime", () => {
    it("should render help data as plain text", () => {
      const runtime = new TextViewRuntime()
      const data = generateHelpData(testConfig)
      
      // Mock console.log
      const originalLog = console.log
      const output: string[] = []
      console.log = mock((msg: string) => output.push(msg))
      
      try {
        runtime.renderHelp(data)
        
        const helpText = output.join('\n')
        expect(helpText).toContain("test-cli")
        expect(helpText).toContain("USAGE:")
        expect(helpText).toContain("OPTIONS:")
        expect(helpText).toContain("--verbose")
        expect(helpText).toContain("--config")
        expect(helpText).toContain("COMMANDS:")
        expect(helpText).toContain("build")
        expect(helpText).toContain("Build the project")
      } finally {
        console.log = originalLog
      }
    })
    
    it("should render errors", () => {
      const runtime = new TextViewRuntime()
      const error = new Error("Test error")
      
      // Mock console.error
      const originalError = console.error
      const output: string[] = []
      console.error = mock((msg: string) => output.push(msg))
      
      try {
        runtime.renderError(error)
        
        expect(output).toHaveLength(1)
        expect(output[0]).toBe("Error: Test error")
      } finally {
        console.error = originalError
      }
    })
    
    it("should render output", () => {
      const runtime = new TextViewRuntime()
      
      // Mock console.log
      const originalLog = console.log
      const output: string[] = []
      console.log = mock((msg: string) => output.push(msg))
      
      try {
        // String output
        runtime.renderOutput("Hello world")
        expect(output[0]).toBe("Hello world")
        
        // Object output
        output.length = 0
        runtime.renderOutput({ foo: "bar" })
        expect(output[0]).toContain('"foo": "bar"')
        
        // Null output
        output.length = 0
        runtime.renderOutput(null)
        expect(output).toHaveLength(0)
      } finally {
        console.log = originalLog
      }
    })
  })
})