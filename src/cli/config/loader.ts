/**
 * Configuration File Loading
 */

import * as path from 'node:path'
import type { CLIConfig } from '@cli/types'

/**
 * Load a configuration file
 *
 * Supports:
 * - .json files
 * - .js files (CommonJS or ESM)
 * - .ts files (through Bun's native TypeScript support)
 *
 * @param filePath - Path to the configuration file
 * @returns The loaded configuration
 */
export async function loadConfig(filePath: string): Promise<CLIConfig> {
  const resolvedPath = path.resolve(filePath)

  try {
    // Bun can directly import TypeScript and JavaScript files
    const module = await import(resolvedPath)

    // Handle both default and named exports
    const config = module.default ?? module.config ?? module

    if (!config.name || !config.version) {
      throw new Error(`Invalid configuration: missing required fields (name, version)`)
    }

    return config
  } catch (error) {
    throw new Error(`Failed to load configuration from ${filePath}: ${error}`)
  }
}

/**
 * Resolve configuration file path
 *
 * Looks for configuration files in standard locations:
 * 1. Provided path (if given)
 * 2. .clirc.json
 * 3. .clirc.js
 * 4. cli.config.js
 * 5. cli.config.ts
 *
 * @param path - Optional specific path to check
 * @returns Resolved configuration file path
 */
export async function resolveConfigPath(providedPath?: string): Promise<string> {
  if (providedPath) {
    return path.resolve(providedPath)
  }

  // Standard config file locations
  const configFiles = ['.clirc.json', '.clirc.js', 'cli.config.js', 'cli.config.ts']

  // Check each potential config file
  for (const fileName of configFiles) {
    const fullPath = path.resolve(process.cwd(), fileName)
    const file = Bun.file(fullPath)
    try {
      const stats = await file.exists()
      if (stats) {
        return fullPath
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  throw new Error('No configuration file found')
}
