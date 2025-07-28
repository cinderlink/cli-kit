/**
 * Configuration File Loaders
 *
 * Support for various configuration file formats
 */

import * as path from 'path'
import { ConfigObject, ConfigLoader } from '../types'

/**
 * JSON configuration loader
 */
export class JSONLoader implements ConfigLoader {
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ext === '.json' || filePath.endsWith('rc')
  }

  async load(filePath: string): Promise<ConfigObject> {
    try {
      const file = Bun.file(filePath)
      const text = await file.text()

      // Handle empty files
      if (!text.trim()) {
        return {}
      }

      // Parse JSON with comments support
      const cleaned = text
        .split('\n')
        .map(line => {
          // Remove single-line comments
          const commentIndex = line.indexOf('//')
          if (commentIndex >= 0) {
            const beforeComment = line.slice(0, commentIndex)
            // Check if // is inside a string
            const quoteCount = (beforeComment.match(/"/g) || []).length
            if (quoteCount % 2 === 0) {
              return beforeComment
            }
          }
          return line
        })
        .join('\n')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')

      return JSON.parse(cleaned)
    } catch (error) {
      throw new Error(`Failed to load JSON config from ${filePath}: ${error}`)
    }
  }

  async save(filePath: string, config: ConfigObject): Promise<void> {
    const json = JSON.stringify(config, null, 2)
    await Bun.write(filePath, json)
  }
}

/**
 * TypeScript/JavaScript configuration loader
 */
export class TypeScriptLoader implements ConfigLoader {
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ext === '.ts' || ext === '.js' || ext === '.mjs'
  }

  async load(filePath: string): Promise<ConfigObject> {
    try {
      // Clear module cache to get fresh config
      delete require.cache[filePath]

      // Import the module
      const module = await import(filePath)

      // Handle various export formats
      const config = module.default || module.config || module

      // If it's a function, call it
      if (typeof config === 'function') {
        const result = await config()
        return this.normalizeConfig(result)
      }

      return this.normalizeConfig(config)
    } catch (error) {
      throw new Error(`Failed to load TypeScript config from ${filePath}: ${error}`)
    }
  }

  async save(filePath: string, config: ConfigObject): Promise<void> {
    const content = `/**
 * Auto-generated configuration file
 * Generated at: ${new Date().toISOString()}
 */

export default ${JSON.stringify(config, null, 2)}
`
    await Bun.write(filePath, content)
  }

  private normalizeConfig(config: any): ConfigObject {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object')
    }

    // Remove non-serializable values
    const normalized: ConfigObject = {}

    for (const [key, value] of Object.entries(config)) {
      if (value === undefined || typeof value === 'function') {
        continue
      }

      if (value instanceof Date) {
        normalized[key] = value.toISOString()
      } else if (value && typeof value === 'object') {
        normalized[key] = this.normalizeConfig(value)
      } else {
        normalized[key] = value
      }
    }

    return normalized
  }
}

/**
 * YAML configuration loader
 */
export class YAMLLoader implements ConfigLoader {
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ext === '.yaml' || ext === '.yml'
  }

  async load(filePath: string): Promise<ConfigObject> {
    throw new Error('YAML support not implemented. Install a YAML parser to enable.')
  }

  async save(filePath: string, config: ConfigObject): Promise<void> {
    throw new Error('YAML support not implemented. Install a YAML parser to enable.')
  }
}

/**
 * TOML configuration loader
 */
export class TOMLLoader implements ConfigLoader {
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ext === '.toml'
  }

  async load(filePath: string): Promise<ConfigObject> {
    throw new Error('TOML support not implemented. Install a TOML parser to enable.')
  }

  async save(filePath: string, config: ConfigObject): Promise<void> {
    throw new Error('TOML support not implemented. Install a TOML parser to enable.')
  }
}

/**
 * Environment file loader (.env)
 */
export class EnvLoader implements ConfigLoader {
  canLoad(filePath: string): boolean {
    const basename = path.basename(filePath)
    return basename === '.env' || basename.startsWith('.env.')
  }

  async load(filePath: string): Promise<ConfigObject> {
    try {
      const file = Bun.file(filePath)
      const text = await file.text()
      const config: ConfigObject = {}

      const lines = text.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue
        }

        // Parse KEY=VALUE
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex < 0) {
          continue
        }

        const key = trimmed.slice(0, equalIndex).trim()
        let value = trimmed.slice(equalIndex + 1).trim()

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        // Convert to nested object
        const parts = key.split('_')
        let current = config

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i].toLowerCase()
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part] as ConfigObject
        }

        const lastPart = parts[parts.length - 1].toLowerCase()

        // Parse value types
        if (value === 'true') {
          current[lastPart] = true
        } else if (value === 'false') {
          current[lastPart] = false
        } else if (value && !isNaN(Number(value))) {
          current[lastPart] = Number(value)
        } else {
          current[lastPart] = value
        }
      }

      return config
    } catch (error) {
      throw new Error(`Failed to load env config from ${filePath}: ${error}`)
    }
  }

  async save(filePath: string, config: ConfigObject): Promise<void> {
    const lines: string[] = []

    const flatten = (obj: ConfigObject, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const envKey = prefix ? `${prefix}_${key}` : key

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value as ConfigObject, envKey.toUpperCase())
        } else {
          const envValue = String(value)
          lines.push(`${envKey.toUpperCase()}=${envValue}`)
        }
      }
    }

    flatten(config)

    const content = lines.join('\n') + '\n'
    await Bun.write(filePath, content)
  }
}
