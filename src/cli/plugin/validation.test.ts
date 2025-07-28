import { test, expect, describe } from 'bun:test'
import { validatePlugin, checkPluginCompatibility } from './validation'
import type { Plugin, PluginMetadata } from './types'

describe('Plugin Validation', () => {
  describe('validatePlugin', () => {
    test('validates a well-formed plugin', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'A test plugin',
        },
        commands: {
          hello: {
            description: 'Say hello',
            handler: async () => {
              console.log('Hello!')
            },
          },
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('requires metadata', () => {
      const plugin = {} as Plugin
      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Plugin must have metadata')
    })

    test('requires name in metadata', () => {
      const plugin: Plugin = {
        metadata: {
          name: '',
          version: '1.0.0',
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Plugin metadata must include a name')
    })

    test('requires version in metadata', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '',
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Plugin metadata must include a version')
    })

    test('validates plugin name format', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'Test Plugin',
          version: '1.0.0',
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'Plugin name must be lowercase alphanumeric with hyphens only'
      )
    })

    test('validates command names', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        commands: {
          'Invalid Command': {
            description: 'Invalid',
            handler: async () => {},
          },
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Command name 'Invalid Command' must be lowercase alphanumeric with hyphens only"
      )
    })

    test('requires command handlers', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        commands: {
          hello: {
            description: 'Say hello',
            handler: undefined as unknown as Handler,
          },
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Command 'hello' must have a handler")
    })

    test('validates extension paths', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        extensions: {
          invalid: () => ({}),
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Extension path 'invalid' must target a specific command (e.g., 'app.build')"
      )
    })

    test('validates services', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        services: {
          myService: undefined,
        },
      }

      const result = validatePlugin(plugin)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Service 'myService' cannot be undefined")
    })
  })

  describe('checkPluginCompatibility', () => {
    test('checks version compatibility', () => {
      const plugin: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        tuixVersion: '2.0.0',
      }

      const result = checkPluginCompatibility(plugin, '1.0.0')
      expect(result.compatible).toBe(false)
      expect(result.issues).toContain(
        'Plugin requires TUIX version 2.0.0, but current version is 1.0.0'
      )
    })

    test('checks dependency availability', () => {
      const plugin: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          'missing-plugin': '1.0.0',
        },
      }

      const result = checkPluginCompatibility(plugin, '1.0.0', new Map())
      expect(result.compatible).toBe(false)
      expect(result.issues).toContain('Missing dependency: missing-plugin')
    })

    test('checks dependency versions', () => {
      const plugin: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          'other-plugin': '2.0.0',
        },
      }

      const loadedPlugins = new Map([['other-plugin', { name: 'other-plugin', version: '1.0.0' }]])

      const result = checkPluginCompatibility(plugin, '1.0.0', loadedPlugins)
      expect(result.compatible).toBe(false)
      expect(result.issues).toContain(
        'Dependency other-plugin requires version 2.0.0, but 1.0.0 is loaded'
      )
    })

    test('passes when all dependencies are satisfied', () => {
      const plugin: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          'other-plugin': '1.0.0',
        },
      }

      const loadedPlugins = new Map([['other-plugin', { name: 'other-plugin', version: '1.0.0' }]])

      const result = checkPluginCompatibility(plugin, '1.0.0', loadedPlugins)
      expect(result.compatible).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })
})
