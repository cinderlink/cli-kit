/**
 * Comprehensive tests for CLI help module
 */

import { describe, it, expect } from "bun:test"
import { 
  generateHelp,
  formatCommand,
  formatOption,
  formatFlag,
  formatExample,
  formatDescription,
  wrapText,
  alignColumns,
  colorizeHelp,
  generateCommandList,
  generateOptionList,
  generateUsageString,
  createHelpSections
} from "@/cli/help"

describe("CLI Help Module", () => {
  describe("wrapText function", () => {
    it("wraps long text to specified width", () => {
      const text = "This is a very long line that should be wrapped at the specified width"
      const wrapped = wrapText(text, 20)
      const lines = wrapped.split('\n')
      expect(lines.length).toBeGreaterThan(1)
      expect(lines[0].length).toBeLessThanOrEqual(20)
    })

    it("preserves short text", () => {
      const text = "Short text"
      const wrapped = wrapText(text, 50)
      expect(wrapped).toBe(text)
    })

    it("handles empty text", () => {
      const wrapped = wrapText("", 50)
      expect(wrapped).toBe("")
    })

    it("handles single character width", () => {
      const wrapped = wrapText("Hello", 1)
      expect(wrapped.split('\n')).toHaveLength(5)
    })

    it("preserves existing line breaks", () => {
      const text = "Line 1\nLine 2\nLine 3"
      const wrapped = wrapText(text, 50)
      expect(wrapped).toBe(text)
    })

    it("wraps at word boundaries", () => {
      const text = "Hello world this is test"
      const wrapped = wrapText(text, 12)
      const lines = wrapped.split('\n')
      expect(lines[0]).toBe("Hello world")
      expect(lines[1]).toBe("this is test")
    })
  })

  describe("alignColumns function", () => {
    it("aligns two-column data", () => {
      const data = [
        ["--help", "Show help"],
        ["--version", "Show version"],
        ["--verbose", "Enable verbose output"]
      ]
      const aligned = alignColumns(data, 2)
      const lines = aligned.split('\n')
      expect(lines).toHaveLength(3)
      expect(lines[0]).toContain("--help")
      expect(lines[0]).toContain("Show help")
    })

    it("handles empty data", () => {
      const aligned = alignColumns([], 2)
      expect(aligned).toBe("")
    })

    it("handles single column", () => {
      const data = [["Item 1"], ["Item 2"]]
      const aligned = alignColumns(data, 1)
      expect(aligned).toContain("Item 1")
      expect(aligned).toContain("Item 2")
    })

    it("handles varying column widths", () => {
      const data = [
        ["--h", "Help"],
        ["--very-long-option", "Description"]
      ]
      const aligned = alignColumns(data, 2)
      const lines = aligned.split('\n')
      expect(lines[0]).toContain("--h")
      expect(lines[1]).toContain("--very-long-option")
    })
  })

  describe("formatDescription function", () => {
    it("formats basic description", () => {
      const desc = formatDescription("This is a test description")
      expect(desc).toContain("This is a test description")
    })

    it("wraps long descriptions", () => {
      const longDesc = "This is a very long description that should be wrapped to fit within the specified width limits"
      const formatted = formatDescription(longDesc, 30)
      const lines = formatted.split('\n')
      expect(lines.length).toBeGreaterThan(1)
    })

    it("preserves markdown-style formatting", () => {
      const desc = "This has **bold** and *italic* text"
      const formatted = formatDescription(desc)
      expect(formatted).toContain("**bold**")
      expect(formatted).toContain("*italic*")
    })

    it("handles bullet points", () => {
      const desc = "Features:\n- Feature 1\n- Feature 2\n- Feature 3"
      const formatted = formatDescription(desc)
      expect(formatted).toContain("- Feature 1")
      expect(formatted).toContain("- Feature 2")
    })
  })

  describe("formatOption function", () => {
    it("formats option with short and long forms", () => {
      const option = {
        short: "h",
        long: "help",
        description: "Show help",
        type: "boolean" as const
      }
      const formatted = formatOption(option)
      expect(formatted).toContain("-h")
      expect(formatted).toContain("--help")
      expect(formatted).toContain("Show help")
    })

    it("formats option with only long form", () => {
      const option = {
        long: "verbose",
        description: "Enable verbose output",
        type: "boolean" as const
      }
      const formatted = formatOption(option)
      expect(formatted).toContain("--verbose")
      expect(formatted).toContain("Enable verbose output")
    })

    it("formats option with default value", () => {
      const option = {
        long: "output",
        description: "Output file",
        type: "string" as const,
        default: "output.txt"
      }
      const formatted = formatOption(option)
      expect(formatted).toContain("--output")
      expect(formatted).toContain("Output file")
      expect(formatted).toContain("output.txt")
    })

    it("formats option with required flag", () => {
      const option = {
        long: "input",
        description: "Input file",
        type: "string" as const,
        required: true
      }
      const formatted = formatOption(option)
      expect(formatted).toContain("--input")
      expect(formatted).toContain("required")
    })
  })

  describe("formatFlag function", () => {
    it("formats simple flag", () => {
      const flag = {
        name: "verbose",
        description: "Enable verbose mode"
      }
      const formatted = formatFlag(flag)
      expect(formatted).toContain("--verbose")
      expect(formatted).toContain("Enable verbose mode")
    })

    it("formats flag with short form", () => {
      const flag = {
        name: "help",
        short: "h",
        description: "Show help"
      }
      const formatted = formatFlag(flag)
      expect(formatted).toContain("-h")
      expect(formatted).toContain("--help")
    })
  })

  describe("formatCommand function", () => {
    it("formats basic command", () => {
      const command = {
        name: "build",
        description: "Build the project",
        usage: "build [options]"
      }
      const formatted = formatCommand(command)
      expect(formatted).toContain("build")
      expect(formatted).toContain("Build the project")
    })

    it("formats command with examples", () => {
      const command = {
        name: "serve",
        description: "Start development server",
        examples: [
          "serve --port 3000",
          "serve --host 0.0.0.0"
        ]
      }
      const formatted = formatCommand(command)
      expect(formatted).toContain("serve")
      expect(formatted).toContain("--port 3000")
    })

    it("formats command with options", () => {
      const command = {
        name: "test",
        description: "Run tests",
        options: [
          {
            long: "watch",
            description: "Watch for changes",
            type: "boolean" as const
          }
        ]
      }
      const formatted = formatCommand(command)
      expect(formatted).toContain("test")
      expect(formatted).toContain("--watch")
    })
  })

  describe("formatExample function", () => {
    it("formats simple example", () => {
      const example = "cli command --option value"
      const formatted = formatExample(example)
      expect(formatted).toContain(example)
    })

    it("formats example with description", () => {
      const example = {
        command: "cli build --prod",
        description: "Build for production"
      }
      const formatted = formatExample(example)
      expect(formatted).toContain("cli build --prod")
      expect(formatted).toContain("Build for production")
    })

    it("handles multi-line examples", () => {
      const example = "cli command \\\n  --long-option value \\\n  --another-option"
      const formatted = formatExample(example)
      expect(formatted).toContain("\\")
    })
  })

  describe("generateUsageString function", () => {
    it("generates basic usage", () => {
      const config = {
        name: "mycli",
        commands: ["build", "serve", "test"]
      }
      const usage = generateUsageString(config)
      expect(usage).toContain("mycli")
      expect(usage).toContain("<command>")
    })

    it("generates usage with global options", () => {
      const config = {
        name: "mycli",
        globalOptions: [
          { long: "help", type: "boolean" as const },
          { long: "version", type: "boolean" as const }
        ]
      }
      const usage = generateUsageString(config)
      expect(usage).toContain("[options]")
    })
  })

  describe("generateCommandList function", () => {
    it("generates list of commands", () => {
      const commands = [
        { name: "build", description: "Build the project" },
        { name: "serve", description: "Start server" },
        { name: "test", description: "Run tests" }
      ]
      const list = generateCommandList(commands)
      expect(list).toContain("build")
      expect(list).toContain("serve")
      expect(list).toContain("test")
      expect(list).toContain("Build the project")
    })

    it("handles empty command list", () => {
      const list = generateCommandList([])
      expect(list).toBe("")
    })
  })

  describe("generateOptionList function", () => {
    it("generates list of options", () => {
      const options = [
        { long: "help", description: "Show help", type: "boolean" as const },
        { long: "verbose", description: "Verbose output", type: "boolean" as const }
      ]
      const list = generateOptionList(options)
      expect(list).toContain("--help")
      expect(list).toContain("--verbose")
      expect(list).toContain("Show help")
    })

    it("handles empty option list", () => {
      const list = generateOptionList([])
      expect(list).toBe("")
    })
  })

  describe("createHelpSections function", () => {
    it("creates standard help sections", () => {
      const config = {
        name: "mycli",
        description: "A test CLI tool",
        version: "1.0.0",
        commands: [
          { name: "build", description: "Build project" }
        ],
        options: [
          { long: "help", description: "Show help", type: "boolean" as const }
        ]
      }
      const sections = createHelpSections(config)
      expect(sections).toHaveProperty("usage")
      expect(sections).toHaveProperty("description")
      expect(sections).toHaveProperty("commands")
      expect(sections).toHaveProperty("options")
    })

    it("includes examples section when provided", () => {
      const config = {
        name: "mycli",
        examples: [
          "mycli build --prod",
          "mycli serve --port 3000"
        ]
      }
      const sections = createHelpSections(config)
      expect(sections).toHaveProperty("examples")
      expect(sections.examples).toContain("--prod")
    })
  })

  describe("colorizeHelp function", () => {
    it("adds colors to help text", () => {
      const help = "Usage: mycli <command>\n\nCommands:\n  build  Build project"
      const colorized = colorizeHelp(help)
      expect(colorized).toContain("\x1b[") // ANSI escape codes
    })

    it("preserves original text structure", () => {
      const help = "Line 1\nLine 2\nLine 3"
      const colorized = colorizeHelp(help)
      const originalLines = help.split('\n')
      const colorizedLines = colorized.split('\n')
      expect(colorizedLines.length).toBe(originalLines.length)
    })

    it("handles empty text", () => {
      const colorized = colorizeHelp("")
      expect(colorized).toBe("")
    })
  })

  describe("generateHelp function", () => {
    it("generates complete help text", () => {
      const config = {
        name: "testcli",
        description: "A test CLI application",
        version: "1.0.0",
        commands: [
          { name: "build", description: "Build the project" },
          { name: "serve", description: "Start development server" }
        ],
        options: [
          { long: "help", short: "h", description: "Show help", type: "boolean" as const },
          { long: "version", short: "v", description: "Show version", type: "boolean" as const }
        ],
        examples: [
          "testcli build --prod",
          "testcli serve --port 3000"
        ]
      }
      const help = generateHelp(config)
      
      expect(help).toContain("testcli")
      expect(help).toContain("A test CLI application")
      expect(help).toContain("Usage:")
      expect(help).toContain("Commands:")
      expect(help).toContain("build")
      expect(help).toContain("serve")
      expect(help).toContain("Options:")
      expect(help).toContain("--help")
      expect(help).toContain("--version")
      expect(help).toContain("Examples:")
      expect(help).toContain("--prod")
      expect(help).toContain("--port 3000")
    })

    it("generates minimal help", () => {
      const config = {
        name: "minimal",
        description: "Minimal CLI"
      }
      const help = generateHelp(config)
      expect(help).toContain("minimal")
      expect(help).toContain("Minimal CLI")
    })

    it("handles missing optional fields", () => {
      const config = {
        name: "basic"
      }
      const help = generateHelp(config)
      expect(help).toContain("basic")
    })
  })
})