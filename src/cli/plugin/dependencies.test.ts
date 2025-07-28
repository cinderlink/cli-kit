import { test, expect, describe } from 'bun:test'
import { resolvePluginDependencies, checkDependencies, getPluginDependents } from './dependencies'
import type { Plugin } from './types'

describe('Plugin Dependencies', () => {
  describe('resolvePluginDependencies', () => {
    test('sorts plugins by dependency order', () => {
      const pluginA: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'plugin-b': '1.0.0',
          },
        },
      }

      const pluginB: Plugin = {
        metadata: {
          name: 'plugin-b',
          version: '1.0.0',
        },
      }

      const result = resolvePluginDependencies([pluginA, pluginB])
      expect(result).toHaveLength(2)
      expect(result[0].metadata.name).toBe('plugin-b')
      expect(result[1].metadata.name).toBe('plugin-a')
    })

    test('handles multiple dependency levels', () => {
      const pluginA: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'plugin-b': '1.0.0',
          },
        },
      }

      const pluginB: Plugin = {
        metadata: {
          name: 'plugin-b',
          version: '1.0.0',
          dependencies: {
            'plugin-c': '1.0.0',
          },
        },
      }

      const pluginC: Plugin = {
        metadata: {
          name: 'plugin-c',
          version: '1.0.0',
        },
      }

      const result = resolvePluginDependencies([pluginA, pluginB, pluginC])
      expect(result).toHaveLength(3)
      expect(result[0].metadata.name).toBe('plugin-c')
      expect(result[1].metadata.name).toBe('plugin-b')
      expect(result[2].metadata.name).toBe('plugin-a')
    })

    test('detects circular dependencies', () => {
      const pluginA: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'plugin-b': '1.0.0',
          },
        },
      }

      const pluginB: Plugin = {
        metadata: {
          name: 'plugin-b',
          version: '1.0.0',
          dependencies: {
            'plugin-a': '1.0.0',
          },
        },
      }

      expect(() => resolvePluginDependencies([pluginA, pluginB])).toThrow(
        /Circular dependency detected/
      )
    })

    test('throws on missing dependencies', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'missing-plugin': '1.0.0',
          },
        },
      }

      expect(() => resolvePluginDependencies([plugin])).toThrow(
        "Plugin dependency 'missing-plugin' not found"
      )
    })

    test('handles plugins with no dependencies', () => {
      const plugins: Plugin[] = [
        {
          metadata: {
            name: 'plugin-a',
            version: '1.0.0',
          },
        },
        {
          metadata: {
            name: 'plugin-b',
            version: '1.0.0',
          },
        },
      ]

      const result = resolvePluginDependencies(plugins)
      expect(result).toHaveLength(2)
      // Order doesn't matter when there are no dependencies
      expect(result.map(p => p.metadata.name).sort()).toEqual(['plugin-a', 'plugin-b'])
    })
  })

  describe('checkDependencies', () => {
    test('reports satisfied dependencies', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'plugin-b': '1.0.0',
          },
        },
      }

      const available = new Map([
        ['plugin-b', { metadata: { name: 'plugin-b', version: '1.0.0' } } as Plugin],
      ])

      const result = checkDependencies(plugin, available)
      expect(result.satisfied).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    test('reports missing dependencies', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
          dependencies: {
            'plugin-b': '1.0.0',
            'plugin-c': '1.0.0',
          },
        },
      }

      const available = new Map([
        ['plugin-b', { metadata: { name: 'plugin-b', version: '1.0.0' } } as Plugin],
      ])

      const result = checkDependencies(plugin, available)
      expect(result.satisfied).toBe(false)
      expect(result.missing).toEqual(['plugin-c'])
    })

    test('handles plugins with no dependencies', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'plugin-a',
          version: '1.0.0',
        },
      }

      const result = checkDependencies(plugin, new Map())
      expect(result.satisfied).toBe(true)
      expect(result.missing).toHaveLength(0)
    })
  })

  describe('getPluginDependents', () => {
    test('finds direct dependents', () => {
      const plugins: Plugin[] = [
        {
          metadata: {
            name: 'plugin-a',
            version: '1.0.0',
            dependencies: {
              'plugin-c': '1.0.0',
            },
          },
        },
        {
          metadata: {
            name: 'plugin-b',
            version: '1.0.0',
            dependencies: {
              'plugin-c': '1.0.0',
            },
          },
        },
        {
          metadata: {
            name: 'plugin-c',
            version: '1.0.0',
          },
        },
      ]

      const dependents = getPluginDependents('plugin-c', plugins)
      expect(dependents).toHaveLength(2)
      expect(dependents.map(p => p.metadata.name).sort()).toEqual(['plugin-a', 'plugin-b'])
    })

    test('returns empty array when no dependents', () => {
      const plugins: Plugin[] = [
        {
          metadata: {
            name: 'plugin-a',
            version: '1.0.0',
          },
        },
        {
          metadata: {
            name: 'plugin-b',
            version: '1.0.0',
          },
        },
      ]

      const dependents = getPluginDependents('plugin-a', plugins)
      expect(dependents).toHaveLength(0)
    })
  })
})
