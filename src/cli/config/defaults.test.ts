/**
 * Default Configuration Tests
 */

import { describe, it, expect } from 'bun:test'
import { defineConfig, defineCommand, getDefaultConfig, createDefaultConfig } from './defaults'
import { z } from 'zod'

describe('Default Configuration', () => {
  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig()

      expect(config.name).toBe('cli')
      expect(config.version).toBe('0.0.0')
      expect(config.description).toBe('A CLI application')
      expect(config.options).toEqual({})
      expect(config.commands).toEqual({})
    })
  })

  describe('createDefaultConfig', () => {
    it('should create config with string name', () => {
      const config = createDefaultConfig('my-cli')

      expect(config.name).toBe('my-cli')
      expect(config.version).toBe('0.0.0')
    })

    it('should merge partial config', () => {
      const config = createDefaultConfig({
        name: 'test-cli',
        version: '1.0.0',
        description: 'Test CLI',
      })

      expect(config.name).toBe('test-cli')
      expect(config.version).toBe('1.0.0')
      expect(config.description).toBe('Test CLI')
      expect(config.options).toEqual({})
      expect(config.commands).toEqual({})
    })
  })

  describe('defineConfig', () => {
    it('should add defaults to config', () => {
      const config = defineConfig({
        name: 'my-cli',
        version: '1.0.0',
      })

      expect(config.name).toBe('my-cli')
      expect(config.version).toBe('1.0.0')
      expect(config.options).toEqual({})
      expect(config.commands).toEqual({})
      expect(config.plugins).toEqual([])
      expect(config.hooks).toEqual({})
    })

    it('should preserve existing values', () => {
      const config = defineConfig({
        name: 'my-cli',
        version: '1.0.0',
        options: {
          verbose: z.boolean(),
        },
        commands: {
          test: {
            description: 'Test command',
            handler: () => console.log('test'),
          },
        },
      })

      expect(Object.keys(config.options || {})).toContain('verbose')
      expect(Object.keys(config.commands || {})).toContain('test')
    })
  })

  describe('defineCommand', () => {
    it('should create command config', () => {
      const command = defineCommand({
        description: 'Test command',
        options: {
          force: z.boolean(),
        },
        handler: async args => {
          console.log(args)
        },
      })

      expect(command.description).toBe('Test command')
      expect(command.options).toBeDefined()
      expect(command.handler).toBeDefined()
    })

    it('should handle lazy handler import', () => {
      const command = defineCommand({
        description: 'Test command',
        handler: async () => ({ default: () => console.log('test') }),
      })

      expect(command.handler).toBeDefined()
      expect((command.handler as any)?._lazy).toBe(true)
    })
  })
})
