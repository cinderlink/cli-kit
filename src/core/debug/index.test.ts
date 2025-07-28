import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
  createDebugLogger,
  getDebugEntries,
  clearDebugEntries,
  getDebugCategories,
  setDebugEnabled,
  isDebugEnabled,
  type DebugEntry,
} from './index'

describe('Debug Module', () => {
  // Store initial categories to restore after tests
  const initialCategories = getDebugCategories().map(cat => ({
    name: cat.name,
    enabled: cat.enabled,
    color: cat.color,
  }))

  beforeEach(() => {
    // Clear all debug entries before each test
    clearDebugEntries()

    // Reset all categories to enabled for testing
    getDebugCategories().forEach(cat => {
      setDebugEnabled(cat.name, true)
    })
  })

  afterEach(() => {
    // Restore initial state
    initialCategories.forEach(cat => {
      setDebugEnabled(cat.name, cat.enabled)
    })
  })

  describe('createDebugLogger', () => {
    it('should create a logger with all log levels', () => {
      const logger = createDebugLogger('test')

      expect(logger).toHaveProperty('trace')
      expect(logger).toHaveProperty('debug')
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('warn')
      expect(logger).toHaveProperty('error')
    })

    it('should respect enabled option', () => {
      const logger = createDebugLogger('test', { enabled: true })
      logger.info('test message')

      const entries = getDebugEntries('test')
      expect(entries).toHaveLength(1)
    })

    it('should respect disabled option', () => {
      const logger = createDebugLogger('test-disabled', { enabled: false })
      logger.info('test message')

      const entries = getDebugEntries('test-disabled')
      expect(entries).toHaveLength(0)
    })

    it('should store entries with correct structure', () => {
      const logger = createDebugLogger('test', { enabled: true })
      const testData = { foo: 'bar' }
      logger.info('test message', testData)

      const entries = getDebugEntries('test')
      expect(entries).toHaveLength(1)

      const entry = entries[0]
      expect(entry.category).toBe('test')
      expect(entry.message).toBe('test message')
      expect(entry.data).toEqual(testData)
      expect(entry.level).toBe('info')
      expect(entry.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('getDebugEntries', () => {
    it('should return entries for specific category', () => {
      const logger1 = createDebugLogger('cat1', { enabled: true })
      const logger2 = createDebugLogger('cat2', { enabled: true })

      logger1.info('message 1')
      logger2.info('message 2')

      const cat1Entries = getDebugEntries('cat1')
      expect(cat1Entries).toHaveLength(1)
      expect(cat1Entries[0].message).toBe('message 1')
    })

    it('should return all entries when no category specified', () => {
      const logger1 = createDebugLogger('cat1', { enabled: true })
      const logger2 = createDebugLogger('cat2', { enabled: true })

      logger1.info('message 1')
      logger2.info('message 2')

      const allEntries = getDebugEntries()
      expect(allEntries).toHaveLength(2)
    })

    it('should return entries sorted by timestamp', () => {
      const logger = createDebugLogger('test', { enabled: true })

      logger.info('first')
      // Small delay to ensure different timestamps
      logger.info('second')
      logger.info('third')

      const entries = getDebugEntries()
      expect(entries[0].message).toBe('first')
      expect(entries[1].message).toBe('second')
      expect(entries[2].message).toBe('third')
    })
  })

  describe('clearDebugEntries', () => {
    it('should clear entries for specific category', () => {
      const logger1 = createDebugLogger('cat1', { enabled: true })
      const logger2 = createDebugLogger('cat2', { enabled: true })

      logger1.info('message 1')
      logger2.info('message 2')

      clearDebugEntries('cat1')

      expect(getDebugEntries('cat1')).toHaveLength(0)
      expect(getDebugEntries('cat2')).toHaveLength(1)
    })

    it('should clear all entries when no category specified', () => {
      const logger1 = createDebugLogger('cat1', { enabled: true })
      const logger2 = createDebugLogger('cat2', { enabled: true })

      logger1.info('message 1')
      logger2.info('message 2')

      clearDebugEntries()

      expect(getDebugEntries()).toHaveLength(0)
    })
  })

  describe('getDebugCategories', () => {
    it('should return all created categories', () => {
      createDebugLogger('cat1')
      createDebugLogger('cat2')
      createDebugLogger('cat3')

      const categories = getDebugCategories()
      const names = categories.map(c => c.name)

      expect(names).toContain('cat1')
      expect(names).toContain('cat2')
      expect(names).toContain('cat3')
    })

    it('should include category configuration', () => {
      createDebugLogger('test-config', { enabled: true, color: '36' })

      const categories = getDebugCategories()
      const testCat = categories.find(c => c.name === 'test-config')

      expect(testCat).toBeDefined()
      expect(testCat?.enabled).toBe(true)
      expect(testCat?.color).toBe('36')
    })
  })

  describe('setDebugEnabled', () => {
    it('should enable/disable category at runtime', () => {
      const logger = createDebugLogger('test-runtime', { enabled: false })

      logger.info('should not be logged')
      expect(getDebugEntries('test-runtime')).toHaveLength(0)

      setDebugEnabled('test-runtime', true)
      logger.info('should be logged')
      expect(getDebugEntries('test-runtime')).toHaveLength(1)

      setDebugEnabled('test-runtime', false)
      logger.info('should not be logged again')
      expect(getDebugEntries('test-runtime')).toHaveLength(1)
    })
  })

  describe('log levels', () => {
    it('should support all log levels', () => {
      const logger = createDebugLogger('test', { enabled: true })

      logger.trace('trace message')
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      const entries = getDebugEntries('test')
      expect(entries).toHaveLength(5)

      const levels = entries.map(e => e.level)
      expect(levels).toEqual(['trace', 'debug', 'info', 'warn', 'error'])
    })
  })

  describe('isDebugEnabled', () => {
    it('should return boolean based on environment', () => {
      // This test depends on the TUIX_DEBUG environment variable
      const result = isDebugEnabled()
      expect(typeof result).toBe('boolean')
    })
  })
})
