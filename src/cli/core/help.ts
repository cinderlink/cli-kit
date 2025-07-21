/**
 * CLI Help System
 * 
 * Auto-generated help screens and documentation
 */

import type { CLIConfig, CommandConfig } from "./types"
import { largeTextWithPalette } from "../tea/display/LargeText"
import { styledText, text, vstack, hstack } from "../core/view"
import { style, Colors } from "../styling/index"
import { styledBox } from "../layout/box"
import { Borders } from "../styling/borders"
import type { View } from "../core/types"
import { z } from "zod"

export interface HelpOptions {
  showBranding?: boolean
  showExamples?: boolean
  colorize?: boolean
  width?: number
}

export class HelpGenerator {
  constructor(private config: CLIConfig) {}
  
  /**
   * Generate help text for the CLI or a specific command
   */
  generateHelp(commandPath?: string[], options: HelpOptions = {}): string {
    const {
      showBranding = true,
      showExamples = true,
      colorize = true,
      width = 80
    } = options
    
    if (!commandPath || commandPath.length === 0) {
      return this.generateGlobalHelp(options)
    }
    
    return this.generateCommandHelp(commandPath, options)
  }
  
  /**
   * Generate a beautiful interactive help component
   */
  generateHelpComponent(commandPath?: string[]): View {
    if (!commandPath || commandPath.length === 0) {
      return this.generateGlobalHelpComponent()
    }
    
    return this.generateCommandHelpComponent(commandPath)
  }
  
  /**
   * Generate global help text
   */
  private generateGlobalHelp(options: HelpOptions): string {
    const lines: string[] = []
    
    // Header
    lines.push(`${this.config.name} v${this.config.version}`)
    if (this.config.description) {
      lines.push(this.config.description)
    }
    lines.push("")
    
    // Usage
    lines.push("USAGE:")
    lines.push(`  ${this.config.name} [OPTIONS] <COMMAND>`)
    lines.push("")
    
    // Global options
    if (this.hasOptions(this.config.options)) {
      lines.push("OPTIONS:")
      this.addOptionsHelp(lines, this.config.options || {})
      lines.push("")
    }
    
    // Commands
    if (this.hasCommands(this.config.commands)) {
      lines.push("COMMANDS:")
      this.addCommandsHelp(lines, this.config.commands || {})
      lines.push("")
    }
    
    // Examples
    if (options.showExamples) {
      lines.push("EXAMPLES:")
      lines.push(`  ${this.config.name} --help        Show this help`)
      lines.push(`  ${this.config.name} --version     Show version`)
      
      const commands = Object.keys(this.config.commands || {})
      if (commands.length > 0) {
        lines.push(`  ${this.config.name} ${commands[0]} --help   Show command help`)
      }
      lines.push("")
    }
    
    return lines.join('\n')
  }
  
  /**
   * Generate command-specific help text
   */
  private generateCommandHelp(commandPath: string[], options: HelpOptions): string {
    const commandConfig = this.getCommandConfig(commandPath)
    if (!commandConfig) {
      return `Unknown command: ${commandPath.join(' ')}`
    }
    
    const lines: string[] = []
    
    // Header
    lines.push(`${this.config.name} ${commandPath.join(' ')}`)
    if (commandConfig.description) {
      lines.push(commandConfig.description)
    }
    lines.push("")
    
    // Usage
    lines.push("USAGE:")
    const usage = [this.config.name, ...commandPath]
    
    if (this.hasOptions(commandConfig.options)) {
      usage.push("[OPTIONS]")
    }
    
    if (this.hasArgs(commandConfig.args)) {
      Object.keys(commandConfig.args || {}).forEach(arg => {
        usage.push(`<${arg}>`)
      })
    }
    
    if (this.hasCommands(commandConfig.commands)) {
      usage.push("<COMMAND>")
    }
    
    lines.push(`  ${usage.join(' ')}`)
    lines.push("")
    
    // Arguments
    if (this.hasArgs(commandConfig.args)) {
      lines.push("ARGUMENTS:")
      this.addArgsHelp(lines, commandConfig.args || {})
      lines.push("")
    }
    
    // Options
    if (this.hasOptions(commandConfig.options)) {
      lines.push("OPTIONS:")
      this.addOptionsHelp(lines, commandConfig.options || {})
      lines.push("")
    }
    
    // Subcommands
    if (this.hasCommands(commandConfig.commands)) {
      lines.push("COMMANDS:")
      this.addCommandsHelp(lines, commandConfig.commands || {})
      lines.push("")
    }
    
    // Aliases
    if (commandConfig.aliases && commandConfig.aliases.length > 0) {
      lines.push("ALIASES:")
      lines.push(`  ${commandConfig.aliases.join(', ')}`)
      lines.push("")
    }
    
    return lines.join('\n')
  }
  
  /**
   * Generate interactive global help component
   */
  private generateGlobalHelpComponent(): View {
    // Beautiful branded header
    const header = vstack(
      largeTextWithPalette(this.config.name, "neon", {
        font: 'ansiShadow',
        mode: 'outlined'
      }),
      text(""),
      styledText(
        this.config.description || "A CLI built with CLI-KIT",
        style().foreground(Colors.brightCyan).italic()
      ),
      styledText(
        `v${this.config.version}`,
        style().foreground(Colors.gray)
      ),
      text("")
    )
    
    // Commands section
    const commandsSection = this.hasCommands(this.config.commands)
      ? styledBox(
          vstack(
            styledText("Available Commands", style().foreground(Colors.yellow).bold()),
            text(""),
            ...this.getCommandViews(this.config.commands || {})
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            style: style().foreground(Colors.white)
          }
        )
      : text("")
    
    // Options section
    const optionsSection = this.hasOptions(this.config.options)
      ? styledBox(
          vstack(
            styledText("Global Options", style().foreground(Colors.yellow).bold()),
            text(""),
            ...this.getOptionViews(this.config.options || {})
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            style: style().foreground(Colors.white)
          }
        )
      : text("")
    
    // Footer
    const footer = styledText(
      "Use --help with any command for more information",
      style().foreground(Colors.gray).italic()
    )
    
    return vstack(
      header,
      commandsSection,
      text(""),
      optionsSection,
      text(""),
      footer
    )
  }
  
  /**
   * Generate interactive command help component
   */
  private generateCommandHelpComponent(commandPath: string[]): View {
    const commandConfig = this.getCommandConfig(commandPath)
    if (!commandConfig) {
      return styledText(
        `Unknown command: ${commandPath.join(' ')}`,
        style().foreground(Colors.red)
      )
    }
    
    const header = vstack(
      styledText(
        `${this.config.name} ${commandPath.join(' ')}`,
        style().foreground(Colors.brightCyan).bold()
      ),
      styledText(
        commandConfig.description || "",
        style().foreground(Colors.white)
      ),
      text("")
    )
    
    const sections: View[] = []
    
    // Arguments
    if (this.hasArgs(commandConfig.args)) {
      sections.push(
        styledBox(
          vstack(
            styledText("Arguments", style().foreground(Colors.yellow).bold()),
            text(""),
            ...this.getArgViews(commandConfig.args || {})
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 }
          }
        )
      )
    }
    
    // Options
    if (this.hasOptions(commandConfig.options)) {
      sections.push(
        styledBox(
          vstack(
            styledText("Options", style().foreground(Colors.yellow).bold()),
            text(""),
            ...this.getOptionViews(commandConfig.options || {})
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 }
          }
        )
      )
    }
    
    // Subcommands
    if (this.hasCommands(commandConfig.commands)) {
      sections.push(
        styledBox(
          vstack(
            styledText("Commands", style().foreground(Colors.yellow).bold()),
            text(""),
            ...this.getCommandViews(commandConfig.commands || {})
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 }
          }
        )
      )
    }
    
    return vstack(
      header,
      ...sections.reduce((acc, section) => [...acc, section, text("")], [] as View[])
    )
  }
  
  // Helper methods
  private getSchemaDescription(schema: z.ZodSchema): string {
    // Safely extract description from Zod schema
    if ('_def' in schema && typeof schema._def === 'object' && schema._def && 'description' in schema._def) {
      return String(schema._def.description || "")
    }
    return ""
  }

  private hasOptions(options?: Record<string, z.ZodSchema>): boolean {
    return Boolean(options && Object.keys(options).length > 0)
  }
  
  private hasCommands(commands?: Record<string, CommandConfig>): boolean {
    return Boolean(commands && Object.keys(commands).length > 0)
  }
  
  private hasArgs(args?: Record<string, z.ZodSchema>): boolean {
    return Boolean(args && Object.keys(args).length > 0)
  }
  
  private addOptionsHelp(lines: string[], options: Record<string, z.ZodSchema>): void {
    Object.entries(options).forEach(([name, schema]) => {
      const description = this.getSchemaDescription(schema)
      lines.push(`  --${name.padEnd(20)} ${description}`)
    })
  }
  
  private addCommandsHelp(lines: string[], commands: Record<string, CommandConfig>): void {
    Object.entries(commands).forEach(([name, config]) => {
      if (!config.hidden) {
        lines.push(`  ${name.padEnd(20)} ${config.description || ""}`)
      }
    })
  }
  
  private addArgsHelp(lines: string[], args: Record<string, z.ZodSchema>): void {
    Object.entries(args).forEach(([name, schema]) => {
      const description = this.getSchemaDescription(schema)
      lines.push(`  ${name.padEnd(20)} ${description}`)
    })
  }
  
  private getCommandViews(commands: Record<string, CommandConfig>): View[] {
    return Object.entries(commands)
      .filter(([, config]) => !config.hidden)
      .map(([name, config]) => 
        hstack(
          styledText(name.padEnd(20), style().foreground(Colors.cyan)),
          styledText(config.description || "", style().foreground(Colors.white))
        )
      )
  }
  
  private getOptionViews(options: Record<string, z.ZodSchema>): View[] {
    return Object.entries(options).map(([name, schema]) => {
      const description = this.getSchemaDescription(schema)
      return hstack(
        styledText(`--${name}`.padEnd(20), style().foreground(Colors.yellow)),
        styledText(description, style().foreground(Colors.white))
      )
    })
  }
  
  private getArgViews(args: Record<string, z.ZodSchema>): View[] {
    return Object.entries(args).map(([name, schema]) => {
      const description = this.getSchemaDescription(schema)
      return hstack(
        styledText(`<${name}>`.padEnd(20), style().foreground(Colors.green)),
        styledText(description, style().foreground(Colors.white))
      )
    })
  }
  
  private getCommandConfig(commandPath: string[]): CommandConfig | null {
    let currentCommands = this.config.commands || {}
    let currentConfig: CommandConfig | null = null
    
    for (const command of commandPath) {
      currentConfig = currentCommands[command] || null
      if (!currentConfig) return null
      currentCommands = currentConfig.commands || {}
    }
    
    return currentConfig
  }
}