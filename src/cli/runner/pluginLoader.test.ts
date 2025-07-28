/**
 * Plugin Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { PluginLoader } from './pluginLoader'
import type { CLIConfig, Plugin } from '../types'

describe('PluginLoader', () => {
  let originalWarn: typeof console.warn
  let warnOutput: string[]

  beforeEach(() => {
    // Mock console.warn
    originalWarn = console.warn
    warnOutput = []
    console.warn = mock((...args: unknown[]) => {
      warnOutput.push(args.join(' '))
    })
  })

  afterEach(() => {
    console.warn = originalWarn
  })

  describe('loadPlugins', () => {
    it('should return empty array when no plugins configured', async () => {
      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
      }

      const loader = new PluginLoader(config)
      const plugins = await loader.loadPlugins()

      expect(plugins).toEqual([])
    })

    it('should load inline plugin objects', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
      }

      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
        plugins: [plugin],
      }

      const loader = new PluginLoader(config)
      const plugins = await loader.loadPlugins()

      expect(plugins.length).toBe(1)
      expect(plugins[0]).toBe(plugin)
    })

    it('should initialize plugins with install hook', async () => {
      const installMock = mock(() => Promise.resolve())

      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: installMock,
      }

      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
        plugins: [plugin],
      }

      const loader = new PluginLoader(config)
      await loader.loadPlugins()

      expect(installMock).toHaveBeenCalled()
    })

    it('should handle plugin initialization errors', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'failing-plugin',
          version: '1.0.0',
        },
        install: () => {
          throw new Error('Install failed')
        },
      }

      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
        plugins: [plugin],
      }

      const loader = new PluginLoader(config)
      const plugins = await loader.loadPlugins()

      expect(plugins.length).toBe(1)
      expect(warnOutput[0]).toContain('Failed to initialize plugin failing-plugin:')
    })

    it('should validate plugins', () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
      }

      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
      }

      const loader = new PluginLoader(config)
      expect(loader.validatePlugin(plugin)).toBe(true)
    })
  })

  describe('plugin context creation', () => {
    it('should create proper plugin context', async () => {
      let capturedContext: PluginContext | null = null

      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: context => {
          capturedContext = context
        },
      }

      const config: CLIConfig = {
        name: 'test-cli',
        version: '1.0.0',
        plugins: [plugin],
      }

      const loader = new PluginLoader(config)
      await loader.loadPlugins()

      expect(capturedContext).not.toBeNull()
      expect(capturedContext.config).toBe(config)
      expect(capturedContext.logger).toBe(console)
      expect(capturedContext.storage).toBeInstanceOf(Map)
      expect(capturedContext.events).toBeInstanceOf(EventTarget)
      expect(capturedContext.env).toBe(process.env)
      expect(capturedContext.plugins.get('test-plugin')).toEqual(plugin.metadata)
    })
  })
})
