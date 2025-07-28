/**
 * Error Handler Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { ErrorHandler } from './errorHandler'
import type { CLIConfig } from '../types'

describe('ErrorHandler', () => {
  let config: CLIConfig
  let mockSuggestions: { getSuggestions: (unknown: string, path: string[]) => string[] }
  let originalError: typeof console.error
  let originalWarn: typeof console.warn
  let errorOutput: string[]
  let warnOutput: string[]

  beforeEach(() => {
    // Mock console methods
    originalError = console.error
    originalWarn = console.warn
    errorOutput = []
    warnOutput = []

    console.error = mock((...args: unknown[]) => {
      errorOutput.push(args.join(' '))
    })

    console.warn = mock((...args: unknown[]) => {
      warnOutput.push(args.join(' '))
    })

    // Mock suggestions
    mockSuggestions = {
      getSuggestions: mock((unknown: string, path: string[]) => {
        if (unknown === 'buld') return ['build']
        if (unknown === 'tset') return ['test']
        return []
      }),
    }

    // Test config
    config = {
      name: 'test-cli',
      version: '1.0.0',
    }
  })

  afterEach(() => {
    console.error = originalError
    console.warn = originalWarn
    delete process.env.CLI_VERBOSE
  })

  describe('handleUnknownCommand', () => {
    it('should show error for unknown command', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      handler.handleUnknownCommand(['buld'])

      expect(errorOutput[0]).toContain("Error: Unknown command 'buld'")
      expect(
        errorOutput.some(line => line.includes("Run 'test-cli --help' for usage information"))
      ).toBe(true)
    })

    it('should show suggestions when available', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      handler.handleUnknownCommand(['buld'])

      expect(errorOutput.some(line => line.includes('Did you mean:'))).toBe(true)
      expect(errorOutput.some(line => line.includes('build'))).toBe(true)
    })

    it('should handle nested commands', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      handler.handleUnknownCommand(['project', 'buld'])

      expect(errorOutput[0]).toContain("Error: Unknown command 'buld'")
      expect(mockSuggestions.getSuggestions).toHaveBeenCalledWith('buld', ['project'])
    })

    it('should not show suggestions when none available', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      handler.handleUnknownCommand(['xyz'])

      expect(errorOutput.every(line => !line.includes('Did you mean:'))).toBe(true)
    })
  })

  describe('handleError', () => {
    it('should handle Error instances', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      const error = new Error('Something went wrong')

      handler.handleError(error)

      expect(errorOutput[0]).toBe('Error: Something went wrong')
    })

    it('should show stack trace in verbose mode', () => {
      process.env.CLI_VERBOSE = 'true'
      const handler = new ErrorHandler(config, mockSuggestions)
      const error = new Error('Something went wrong')

      handler.handleError(error)

      expect(errorOutput.length).toBeGreaterThan(1)
      expect(errorOutput[1]).toContain('at ')
    })

    it('should handle non-Error values', () => {
      const handler = new ErrorHandler(config, mockSuggestions)

      handler.handleError('string error')
      expect(errorOutput[0]).toBe('Error: string error')

      handler.handleError(123)
      expect(errorOutput[1]).toBe('Error: 123')
    })
  })

  describe('formatValidationError', () => {
    it('should format validation errors', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      const error = new Error('ZodError: validation failed')

      const formatted = handler.formatValidationError(error)
      expect(formatted).toBe('Validation error: validation failed')
    })

    it('should return original message for non-validation errors', () => {
      const handler = new ErrorHandler(config, mockSuggestions)
      const error = new Error('Regular error')

      const formatted = handler.formatValidationError(error)
      expect(formatted).toBe('Regular error')
    })
  })

  describe('isVerboseMode', () => {
    it('should detect verbose mode', () => {
      const handler = new ErrorHandler(config, mockSuggestions)

      expect(handler.isVerboseMode()).toBe(false)

      process.env.CLI_VERBOSE = 'true'
      expect(handler.isVerboseMode()).toBe(true)

      process.env.CLI_VERBOSE = 'false'
      expect(handler.isVerboseMode()).toBe(false)
    })
  })

  describe('warn', () => {
    it('should output warning messages', () => {
      const handler = new ErrorHandler(config, mockSuggestions)

      handler.warn('This is a warning', { extra: 'data' })

      expect(warnOutput[0]).toContain('This is a warning')
    })
  })
})
