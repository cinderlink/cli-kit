/**
 * CLI Runner Module
 * 
 * Main entry point and public API for the runner system
 */

import { CLIRunner } from "./cliRunner"
import type { CLIConfig } from "@cli/types"
import { ConfigManager } from "./configManager"

// Re-export the main runner
export { CLIRunner } from "./cliRunner"

// Re-export types if needed
export type { ProcessedArguments } from "./argumentProcessor"

/**
 * Convenience function to run a CLI configuration
 */
export async function runCLI(config: CLIConfig, argv?: string[]): Promise<void> {
  const configManager = new ConfigManager()
  
  // Auto-load tuix config if available
  const tuixConfig = await configManager.loadTuixConfig()
  
  const runner = new CLIRunner(config, tuixConfig)
  await runner.run(argv)
}

/**
 * Create and run a CLI in one go
 */
export async function cli(config: CLIConfig): Promise<void> {
  await runCLI(config)
}

/**
 * Create default config if none exists
 */
export async function ensureConfig(appName?: string): Promise<import("../../config").TuixConfig> {
  const configManager = new ConfigManager()
  return configManager.ensureConfig(appName)
}