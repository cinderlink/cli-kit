/**
 * Help Display Module
 * 
 * Handles displaying help information and version details
 */

import type { CLIConfig } from "@cli/types"
import { HelpGenerator } from "@cli/core/help"

export class HelpDisplay {
  private helpGenerator: HelpGenerator
  
  constructor(
    private config: CLIConfig,
    parser: unknown // Keep for compatibility but don't use
  ) {
    this.helpGenerator = new HelpGenerator(config)
  }
  
  /**
   * Show help for the CLI or a specific command
   */
  showHelp(commandPath?: string[]): void {
    this.helpGenerator.generateHelp(commandPath)
  }
  
  /**
   * Show version information
   */
  showVersion(): void {
    console.log(`${this.config.name} ${this.config.version}`)
  }
  
  /**
   * Check if help was requested
   */
  isHelpRequested(options: Record<string, unknown>): boolean {
    return options.help === true
  }
  
  /**
   * Check if version was requested
   */
  isVersionRequested(options: Record<string, unknown>): boolean {
    return options.version === true
  }
}