/**
 * Environment Variable Configuration
 * 
 * Handles parsing and converting environment variables to CLI configuration
 */

import type { CLIConfig } from "@cli/types"

/**
 * Parse environment variables with a specific prefix into configuration values
 * 
 * Converts environment variables following these patterns:
 * - CLI_NAME -> { name: "value" }
 * - CLI_OPTION_VERBOSE -> { options: { verbose: true } }
 * - CLI_COMMAND_BUILD_OPTION_WATCH -> { commands: { build: { options: { watch: true } } } }
 * 
 * @param env - Environment variables object
 * @param prefix - Prefix to filter environment variables
 * @returns Parsed configuration object
 */
export function parseEnvVars(env: Record<string, string> | NodeJS.ProcessEnv, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const prefixUpper = prefix.toUpperCase()
  const prefixLen = prefixUpper.length + 1 // +1 for underscore

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(prefixUpper + '_') || !value) continue

    const path = key
      .substring(prefixLen)
      .toLowerCase()
      .split('_')

    let current: Record<string, unknown> = result
    
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i]
      if (!segment) continue // Skip empty segments
      if (!current[segment]) {
        current[segment] = {}
      }
      current = current[segment] as Record<string, unknown>
    }

    const lastSegment = path[path.length - 1]
    if (!lastSegment) continue // Skip if no last segment
    
    // Parse boolean values
    if (value === 'true' || value === '1') {
      current[lastSegment] = true
    } else if (value === 'false' || value === '0') {
      current[lastSegment] = false
    } else if (!isNaN(Number(value))) {
      // Parse numeric values
      current[lastSegment] = Number(value)
    } else {
      // Keep as string
      current[lastSegment] = value
    }
  }

  return result
}

/**
 * Create a partial CLI configuration from environment variables
 * 
 * @param prefix - Environment variable prefix (default: "CLI")
 * @returns Partial CLI configuration
 */
export function createConfigFromEnv(prefix = "CLI"): Partial<CLIConfig> {
  return parseEnvVars(process.env, prefix) as Partial<CLIConfig>
}