/**
 * CLI Help System
 *
 * Auto-generated help screens and documentation
 */

import type { CLIConfig } from '@cli/types'
import { generateHelpData, type HelpData } from './helpData'
import { getViewRuntime } from './viewRuntime'

export interface HelpOptions {
  showBranding?: boolean
  showExamples?: boolean
  colorize?: boolean
  width?: number
}

export class HelpGenerator {
  constructor(private config: CLIConfig) {}

  /**
   * Generate help data for the CLI or a specific command
   */
  generateHelpData(commandPath?: string[]): HelpData {
    return generateHelpData(this.config, commandPath)
  }

  /**
   * Generate and display help using the current view runtime
   */
  generateHelp(commandPath?: string[]): void {
    const helpData = this.generateHelpData(commandPath)
    const runtime = getViewRuntime()
    runtime.renderHelp(helpData)
  }
}
