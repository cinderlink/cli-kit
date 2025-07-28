/**
 * Option Parsing Tests
 */

import { describe, it, expect } from 'bun:test'
import { parseLongOption, parseShortOptions } from './options'

describe('Option Parsing', () => {
  describe('parseLongOption', () => {
    it('should parse long option without value', () => {
      const [name, value] = parseLongOption('--verbose')

      expect(name).toBe('verbose')
      expect(value).toBeUndefined()
    })

    it('should parse long option with equals value', () => {
      const [name, value] = parseLongOption('--output=dist')

      expect(name).toBe('output')
      expect(value).toBe('dist')
    })

    it('should handle empty value after equals', () => {
      const [name, value] = parseLongOption('--output=')

      expect(name).toBe('output')
      expect(value).toBe('')
    })

    it('should handle option names with hyphens', () => {
      const [name, value] = parseLongOption('--no-color')

      expect(name).toBe('no-color')
      expect(value).toBeUndefined()
    })

    it('should handle values with equals signs', () => {
      const [name, value] = parseLongOption('--env=KEY=VALUE')

      expect(name).toBe('env')
      expect(value).toBe('KEY=VALUE')
    })
  })

  describe('parseShortOptions', () => {
    it('should parse single short option as boolean', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-v']

      const consumed = parseShortOptions('v', options, argv, 0)

      expect(options.v).toBe(true)
      expect(consumed).toBe(0)
    })

    it('should parse multiple short options', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-abc']

      const consumed = parseShortOptions('abc', options, argv, 0)

      expect(options.a).toBe(true)
      expect(options.b).toBe(true)
      expect(options.c).toBe(true)
      expect(consumed).toBe(0)
    })

    it('should consume next argument for last flag', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-o', 'output.txt', 'other']

      const consumed = parseShortOptions('o', options, argv, 0)

      expect(options.o).toBe('output.txt')
      expect(consumed).toBe(1)
    })

    it('should not consume next argument if it starts with hyphen', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-o', '--other']

      const consumed = parseShortOptions('o', options, argv, 0)

      expect(options.o).toBe(true)
      expect(consumed).toBe(0)
    })

    it('should handle mixed flags with value at end', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-vfo', 'output.txt']

      const consumed = parseShortOptions('vfo', options, argv, 0)

      expect(options.v).toBe(true)
      expect(options.f).toBe(true)
      expect(options.o).toBe('output.txt')
      expect(consumed).toBe(1)
    })

    it('should handle empty next argument array', () => {
      const options: Record<string, unknown> = {}
      const argv = ['-v']

      const consumed = parseShortOptions('v', options, argv, 0)

      expect(options.v).toBe(true)
      expect(consumed).toBe(0)
    })
  })
})
