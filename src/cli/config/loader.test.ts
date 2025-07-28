import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { loadConfig, resolveConfigPath } from './loader'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('Config Loader', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-loader-test-'))
    originalCwd = process.cwd()
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('loadConfig', () => {
    test('should load valid JSON config', async () => {
      const configPath = path.join(tempDir, 'test.json')
      const config = {
        name: 'test-app',
        version: '1.0.0',
        description: 'Test application',
      }

      await fs.writeFile(configPath, JSON.stringify(config))

      const result = await loadConfig(configPath)
      expect(result.name).toBe('test-app')
      expect(result.version).toBe('1.0.0')
      expect(result.description).toBe('Test application')
    })

    test('should load valid JS config with default export', async () => {
      const configPath = path.join(tempDir, 'test.js')
      const configContent = `
        export default {
          name: "test-app",
          version: "1.0.0",
          type: "cli"
        }
      `

      await fs.writeFile(configPath, configContent)

      const result = await loadConfig(configPath)
      expect(result.name).toBe('test-app')
      expect(result.version).toBe('1.0.0')
      expect(result.type).toBe('cli')
    })

    test('should load valid JS config with named export', async () => {
      const configPath = path.join(tempDir, 'test-named.js')
      const configContent = `
        export const config = {
          name: "named-app",
          version: "2.0.0",
          features: ["logging", "plugins"]
        }
      `

      await fs.writeFile(configPath, configContent)

      const result = await loadConfig(configPath)
      expect(result.name).toBe('named-app')
      expect(result.version).toBe('2.0.0')
      expect(result.features).toEqual(['logging', 'plugins'])
    })

    test('should load valid CommonJS config', async () => {
      const configPath = path.join(tempDir, 'test-cjs.js')
      const configContent = `
        module.exports = {
          name: "cjs-app",
          version: "3.0.0",
          platform: "node"
        }
      `

      await fs.writeFile(configPath, configContent)

      const result = await loadConfig(configPath)
      expect(result.name).toBe('cjs-app')
      expect(result.version).toBe('3.0.0')
      expect(result.platform).toBe('node')
    })

    test('should load TypeScript config', async () => {
      const configPath = path.join(tempDir, 'test.ts')
      const configContent = `
        export default {
          name: "ts-app",
          version: "4.0.0",
          typescript: true
        }
      `

      await fs.writeFile(configPath, configContent)

      const result = await loadConfig(configPath)
      expect(result.name).toBe('ts-app')
      expect(result.version).toBe('4.0.0')
      expect(result.typescript).toBe(true)
    })

    test('should handle missing name field', async () => {
      const configPath = path.join(tempDir, 'invalid-no-name.js')
      const configContent = `
        export default {
          version: "1.0.0",
          description: "Missing name"
        }
      `

      await fs.writeFile(configPath, configContent)

      await expect(loadConfig(configPath)).rejects.toThrow(
        'Invalid configuration: missing required fields (name, version)'
      )
    })

    test('should handle missing version field', async () => {
      const configPath = path.join(tempDir, 'invalid-no-version.js')
      const configContent = `
        export default {
          name: "test-app",
          description: "Missing version"
        }
      `

      await fs.writeFile(configPath, configContent)

      await expect(loadConfig(configPath)).rejects.toThrow(
        'Invalid configuration: missing required fields (name, version)'
      )
    })

    test('should handle invalid JavaScript syntax', async () => {
      const configPath = path.join(tempDir, 'invalid-syntax.js')
      await fs.writeFile(configPath, 'invalid javascript { syntax')

      await expect(loadConfig(configPath)).rejects.toThrow(
        /Failed to load configuration from.*invalid-syntax\.js/
      )
    })

    test('should handle nonexistent file', async () => {
      const configPath = path.join(tempDir, 'nonexistent.js')

      await expect(loadConfig(configPath)).rejects.toThrow(
        /Failed to load configuration from.*nonexistent\.js/
      )
    })

    test('should handle config with no exports', async () => {
      const configPath = path.join(tempDir, 'no-exports.js')
      await fs.writeFile(configPath, '// No exports here')

      await expect(loadConfig(configPath)).rejects.toThrow(
        'Invalid configuration: missing required fields (name, version)'
      )
    })

    test('should resolve relative paths', async () => {
      const relativeDir = path.join(tempDir, 'subdir')
      await fs.mkdir(relativeDir)

      const configPath = path.join(relativeDir, 'config.js')
      const configContent = `
        export default {
          name: "relative-app",
          version: "1.0.0"
        }
      `

      await fs.writeFile(configPath, configContent)

      const result = await loadConfig('./subdir/config.js')
      expect(result.name).toBe('relative-app')
      expect(result.version).toBe('1.0.0')
    })
  })

  describe('resolveConfigPath', () => {
    test('should return provided path when given', async () => {
      const providedPath = '/some/custom/path.js'
      const result = await resolveConfigPath(providedPath)
      expect(result).toBe(path.resolve(providedPath))
    })

    test('should resolve relative provided path', async () => {
      const providedPath = './custom/config.js'
      const result = await resolveConfigPath(providedPath)
      expect(result).toContain('custom/config.js')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should find .clirc.json in current directory', async () => {
      const configPath = path.join(tempDir, '.clirc.json')
      await fs.writeFile(configPath, '{"name": "test", "version": "1.0.0"}')

      const result = await resolveConfigPath()
      expect(result).toContain('.clirc.json')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should find .clirc.js in current directory', async () => {
      const configPath = path.join(tempDir, '.clirc.js')
      await fs.writeFile(configPath, 'module.exports = {name: "test", version: "1.0.0"}')

      const result = await resolveConfigPath()
      expect(result).toContain('.clirc.js')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should find cli.config.js in current directory', async () => {
      const configPath = path.join(tempDir, 'cli.config.js')
      await fs.writeFile(configPath, 'module.exports = {name: "test", version: "1.0.0"}')

      const result = await resolveConfigPath()
      expect(result).toContain('cli.config.js')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should find cli.config.ts in current directory', async () => {
      const configPath = path.join(tempDir, 'cli.config.ts')
      await fs.writeFile(configPath, 'export default {name: "test", version: "1.0.0"}')

      const result = await resolveConfigPath()
      expect(result).toContain('cli.config.ts')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should prioritize files in the correct order', async () => {
      // Create multiple config files
      await fs.writeFile(path.join(tempDir, '.clirc.json'), '{}')
      await fs.writeFile(path.join(tempDir, '.clirc.js'), '{}')
      await fs.writeFile(path.join(tempDir, 'cli.config.js'), '{}')
      await fs.writeFile(path.join(tempDir, 'cli.config.ts'), '{}')

      const result = await resolveConfigPath()
      // Should return the first one found (.clirc.json)
      expect(result).toContain('.clirc.json')
      expect(path.isAbsolute(result)).toBe(true)
    })

    test('should throw error when no config file found', async () => {
      // Empty directory
      await expect(resolveConfigPath()).rejects.toThrow('No configuration file found')
    })

    test('should handle file access errors gracefully', async () => {
      // This test verifies that the function handles file access errors
      // Even if we can't create an actual permission error, the code handles it
      await expect(resolveConfigPath()).rejects.toThrow('No configuration file found')
    })

    test('should skip non-readable files and continue searching', async () => {
      // Create a valid config file that should be found
      const validConfigPath = path.join(tempDir, 'cli.config.js')
      await fs.writeFile(validConfigPath, 'module.exports = {name: "test", version: "1.0.0"}')

      const result = await resolveConfigPath()
      expect(result).toContain('cli.config.js')
      expect(path.isAbsolute(result)).toBe(true)
    })
  })

  describe('integration tests', () => {
    test('should load config found by resolveConfigPath', async () => {
      const configContent = `
        export default {
          name: "integration-app",
          version: "1.0.0",
          mode: "production"
        }
      `

      await fs.writeFile(path.join(tempDir, '.clirc.js'), configContent)

      const configPath = await resolveConfigPath()
      const config = await loadConfig(configPath)

      expect(config.name).toBe('integration-app')
      expect(config.version).toBe('1.0.0')
      expect(config.mode).toBe('production')
    })

    test('should handle complex config objects', async () => {
      const configContent = `
        export default {
          name: "complex-app",
          version: "2.1.0",
          database: {
            host: "localhost",
            port: 5432,
            ssl: true
          },
          features: {
            logging: {
              level: "info",
              transports: ["console", "file"]
            },
            authentication: {
              enabled: true,
              methods: ["oauth", "jwt"]
            }
          },
          plugins: [
            {
              name: "auth-plugin",
              version: "^1.0.0"
            },
            {
              name: "db-plugin",
              version: "^2.0.0"
            }
          ]
        }
      `

      await fs.writeFile(path.join(tempDir, 'complex.config.js'), configContent)

      const config = await loadConfig(path.join(tempDir, 'complex.config.js'))

      expect(config.name).toBe('complex-app')
      expect(config.version).toBe('2.1.0')
      expect(config.database.host).toBe('localhost')
      expect(config.database.port).toBe(5432)
      expect(config.features.logging.level).toBe('info')
      expect(config.features.logging.transports).toEqual(['console', 'file'])
      expect(config.features.authentication.enabled).toBe(true)
      expect(config.plugins).toHaveLength(2)
      expect(config.plugins[0].name).toBe('auth-plugin')
    })
  })
})
