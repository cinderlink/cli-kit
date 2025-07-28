/**
 * Command Parsing Tests
 */

import { describe, it, expect } from 'bun:test'
import { findCommand, getCommandOptionSchemas, getCommandArgSchemas } from './command'
import { z } from 'zod'
import type { CLIConfig } from '../types'

describe('Command Parsing', () => {
  const testConfig: CLIConfig = {
    name: 'test-cli',
    version: '1.0.0',
    commands: {
      build: {
        description: 'Build project',
        options: {
          watch: z.boolean(),
          output: z.string(),
        },
        handler: () => console.log('build'),
      },
      git: {
        description: 'Git commands',
        options: {
          verbose: z.boolean(),
        },
        commands: {
          status: {
            description: 'Show status',
            options: {
              short: z.boolean(),
            },
            args: {
              path: z.string().optional(),
            },
            handler: () => console.log('git status'),
          },
          commit: {
            description: 'Commit changes',
            options: {
              message: z.string(),
              amend: z.boolean(),
            },
            handler: () => console.log('git commit'),
          },
        },
      },
    },
  }

  describe('findCommand', () => {
    it('should find top-level command', () => {
      const command = findCommand(testConfig, ['build'])

      expect(command).toBeDefined()
      expect(command?.description).toBe('Build project')
    })

    it('should find nested command', () => {
      const command = findCommand(testConfig, ['git', 'status'])

      expect(command).toBeDefined()
      expect(command?.description).toBe('Show status')
    })

    it('should return undefined for non-existent command', () => {
      const command = findCommand(testConfig, ['deploy'])

      expect(command).toBeUndefined()
    })

    it('should return undefined for incomplete path', () => {
      const command = findCommand(testConfig, ['git'])

      // git has subcommands, so it's found
      expect(command).toBeDefined()
      expect(command?.description).toBe('Git commands')
    })

    it('should return undefined for too deep path', () => {
      const command = findCommand(testConfig, ['git', 'status', 'extra'])

      expect(command).toBeUndefined()
    })
  })

  describe('getCommandOptionSchemas', () => {
    it('should get options for top-level command', () => {
      const schemas = getCommandOptionSchemas(testConfig, ['build'])

      expect(Object.keys(schemas)).toContain('watch')
      expect(Object.keys(schemas)).toContain('output')
    })

    it('should merge options from parent commands', () => {
      const schemas = getCommandOptionSchemas(testConfig, ['git', 'status'])

      expect(Object.keys(schemas)).toContain('verbose') // From git
      expect(Object.keys(schemas)).toContain('short') // From status
    })

    it('should return empty object for non-existent command', () => {
      const schemas = getCommandOptionSchemas(testConfig, ['deploy'])

      expect(schemas).toEqual({})
    })

    it('should handle commands without options', () => {
      const config: CLIConfig = {
        name: 'test',
        version: '1.0.0',
        commands: {
          simple: {
            description: 'Simple command',
            handler: () => {},
          },
        },
      }

      const schemas = getCommandOptionSchemas(config, ['simple'])

      expect(schemas).toEqual({})
    })
  })

  describe('getCommandArgSchemas', () => {
    it('should get args for command', () => {
      const schemas = getCommandArgSchemas(testConfig, ['git', 'status'])

      expect(schemas.path).toBeDefined()
    })

    it('should return empty object for command without args', () => {
      const schemas = getCommandArgSchemas(testConfig, ['build'])

      expect(schemas).toEqual({})
    })

    it('should return empty object for non-existent command', () => {
      const schemas = getCommandArgSchemas(testConfig, ['deploy'])

      expect(schemas).toEqual({})
    })
  })
})
