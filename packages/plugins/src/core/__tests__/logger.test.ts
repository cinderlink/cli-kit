/**
 * Logger Plugin Tests
 * 
 * Comprehensive test suite for the Logger Plugin including lifecycle,
 * logging functionality, streaming, and error handling.
 * 
 * @module plugins/core/__tests__/logger.test
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Context } from "effect"
import { LoggerPlugin } from '../logger'
import { createLoggerPlugin, createTestLoggerPlugin, LogLevel, parseLogLevel } from '../index'
import type { LoggerAPI, LogEntry } from '../types'
import type { PluginDeps } from '../../../../core/src/plugin'

// Helper function to run Effects with context
async function runEffect<A, E>(effect: Effect.Effect<A, E, PluginDeps>): Promise<A> {
  const mockDeps: PluginDeps = {} // Mock dependencies for testing
  return Effect.runPromise(Effect.provide(effect, Context.make(Context.GenericTag<PluginDeps>("PluginDeps"), mockDeps)))
}

// Helper function to run Effects without dependencies
async function runSimpleEffect<A, E>(effect: Effect.Effect<A, E, never>): Promise<A> {
  return Effect.runPromise(effect)
}

describe('LoggerPlugin', () => {
  let plugin: LoggerPlugin
  let api: LoggerAPI

  beforeEach(async () => {
    plugin = createTestLoggerPlugin({
      level: 'debug',
      outputs: [], // No outputs by default to avoid internal logging pollution
      bufferSize: 100
    })
  })

  afterEach(async () => {
    if (plugin && plugin.getInitializationStatus()) {
      await runSimpleEffect(plugin.destroy)
    }
  })

  // =============================================================================
  // Plugin Lifecycle Tests
  // =============================================================================

  test('initializes correctly', async () => {
    expect(plugin.getInitializationStatus()).toBe(false)
    
    await runEffect(plugin.init)
    expect(plugin.getInitializationStatus()).toBe(true)
    
    api = plugin.getAPI()
    expect(api).toBeDefined()
    expect(typeof api.info).toBe('function')
    expect(typeof api.error).toBe('function')
    expect(typeof api.getLogHistory).toBe('function')
  })

  test('destroys correctly', async () => {
    await runEffect(plugin.init)
    expect(plugin.getInitializationStatus()).toBe(true)
    
    await runSimpleEffect(plugin.destroy)
    expect(plugin.getInitializationStatus()).toBe(false)
  })

  test('prevents double initialization', async () => {
    await runEffect(plugin.init)
    expect(plugin.getInitializationStatus()).toBe(true)
    
    // Second init should not throw
    await runEffect(plugin.init)
    expect(plugin.getInitializationStatus()).toBe(true)
  })

  test('handles destroy when not initialized', async () => {
    expect(plugin.getInitializationStatus()).toBe(false)
    
    // Should not throw
    await runSimpleEffect(plugin.destroy)
    expect(plugin.getInitializationStatus()).toBe(false)
  })

  // =============================================================================
  // Configuration Tests
  // =============================================================================

  test('validates configuration', () => {
    const validConfig = {
      level: 'info' as const,
      outputs: ['console'],
      format: 'json' as const,
      bufferSize: 1000,
    }
    
    const configuredPlugin = new LoggerPlugin(validConfig)
    expect(configuredPlugin).toBeDefined()
    expect(configuredPlugin.name).toBe('logger')
    expect(configuredPlugin.version).toBe('1.0.0')
  })

  test('uses default configuration', () => {
    const defaultPlugin = new LoggerPlugin()
    expect(defaultPlugin).toBeDefined()
    expect(defaultPlugin.name).toBe('logger')
  })

  test('merges custom configuration with defaults', () => {
    const customConfig = {
      level: 'warn' as const,
      bufferSize: 2000,
    }
    
    const configuredPlugin = new LoggerPlugin(customConfig)
    expect(configuredPlugin).toBeDefined()
  })

  // =============================================================================
  // Plugin Metadata Tests
  // =============================================================================

  test('has correct metadata', () => {
    expect(plugin.name).toBe('logger')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.metadata.description).toContain('logging')
    expect(plugin.metadata.capabilities).toContain('structured-logging')
    expect(plugin.metadata.capabilities).toContain('log-streaming')
  })

  // =============================================================================
  // Basic Logging Tests
  // =============================================================================

  test('logs messages at different levels', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    api.debug('Debug message')
    api.info('Info message')
    api.warn('Warning message')
    api.error('Error message')
    api.fatal('Fatal message')
    
    // Check log history - filter for our test messages only
    const history = await api.getLogHistory()
    const userLogs = history.filter(entry => 
      ['Debug message', 'Info message', 'Warning message', 'Error message', 'Fatal message'].includes(entry.message)
    )
    expect(userLogs.length).toBe(5)
    
    const levels = userLogs.map(entry => entry.level)
    expect(levels).toContain('debug')
    expect(levels).toContain('info')
    expect(levels).toContain('warn')
    expect(levels).toContain('error')
    expect(levels).toContain('fatal')
  })

  test('respects log level filtering', async () => {
    // Create plugin with warn level
    const warnPlugin = createTestLoggerPlugin({
      level: 'warn',
      outputs: ['console'],
    })
    
    await runEffect(warnPlugin.init)
    const warnAPI = warnPlugin.getAPI()
    
    try {
      warnAPI.debug('Should not appear')
      warnAPI.info('Should not appear')
      warnAPI.warn('Should appear')
      warnAPI.error('Should appear')
      
      const history = await warnAPI.getLogHistory()
      expect(history.length).toBe(2)
      
      const levels = history.map(entry => entry.level)
      expect(levels).not.toContain('debug')
      expect(levels).not.toContain('info')
      expect(levels).toContain('warn')
      expect(levels).toContain('error')
      
    } finally {
      await runSimpleEffect(warnPlugin.destroy)
    }
  })

  test('includes metadata in log entries', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    const metadata = { userId: 123, action: 'login', ip: '127.0.0.1' }
    api.info('User logged in', metadata)
    
    const history = await api.getLogHistory()
    const entry = history.find(e => e.message === 'User logged in')
    
    expect(entry).toBeDefined()
    expect(entry!.metadata.userId).toBe(123)
    expect(entry!.metadata.action).toBe('login')
    expect(entry!.metadata.ip).toBe('127.0.0.1')
  })

  // =============================================================================
  // Log History Tests
  // =============================================================================

  test('maintains log history in buffer', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    // Log several messages
    for (let i = 0; i < 10; i++) {
      api.info(`Message ${i}`)
    }
    
    const history = await api.getLogHistory()
    
    // Filter for our test messages only
    const testMessages = history.filter(entry => entry.message.startsWith('Message '))
    expect(testMessages.length).toBe(10)
    
    // Check chronological order
    for (let i = 0; i < 10; i++) {
      expect(testMessages[i].message).toBe(`Message ${i}`)
    }
  })

  test('searches logs with query', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    api.info('User login', { userId: 1, action: 'login' })
    api.warn('Failed attempt', { userId: 2, action: 'login' })
    api.error('System error', { component: 'auth' })
    api.info('User logout', { userId: 1, action: 'logout' })
    
    // Search by level
    const errors = await api.searchLogs({ level: 'error' })
    expect(errors.length).toBe(1)
    expect(errors[0].message).toBe('System error')
    
    // Search by message content
    const loginLogs = await api.searchLogs({ textSearch: 'login' })
    expect(loginLogs.length).toBe(2)
    
    // Search by metadata
    const user1Logs = await api.searchLogs({ metadataFilters: { userId: 1 } })
    expect(user1Logs.length).toBe(2)
  })

  test('filters logs by time range', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    const startTime = new Date()
    
    api.info('Before delay')
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 10))
    const midTime = new Date()
    
    api.info('After delay')
    
    // Query with time range
    const beforeMid = await api.getLogHistory({ until: midTime })
    const afterMid = await api.getLogHistory({ since: midTime })
    
    // Filter for our test messages only
    const beforeMessages = beforeMid.filter(e => e.message === 'Before delay')
    const afterMessages = afterMid.filter(e => e.message === 'After delay')
    
    expect(beforeMessages.length).toBe(1)
    expect(beforeMessages[0].message).toBe('Before delay')
    
    expect(afterMessages.length).toBe(1)
    expect(afterMessages[0].message).toBe('After delay')
  })

  // =============================================================================
  // Configuration Management Tests
  // =============================================================================

  test('updates log level dynamically', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    // Start with debug level
    api.debug('Should appear')
    api.info('Should appear')
    
    let history = await api.getLogHistory()
    let testMessages = history.filter(e => e.message.startsWith('Should'))
    expect(testMessages.length).toBe(2)
    
    // Change to warn level
    api.setLogLevel('warn')
    
    api.debug('Should not appear')
    api.info('Should not appear')
    api.warn('Should appear')
    
    history = await api.getLogHistory()
    testMessages = history.filter(e => e.message.startsWith('Should'))
    // Should have 2 from before + 1 new warn = 3 total
    expect(testMessages.length).toBe(3)
    const warnMessage = testMessages.find(e => e.message === 'Should appear' && e.level === 'warn')
    expect(warnMessage).toBeDefined()
  })

  test('gets configuration', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    const config = api.getConfig()
    expect(config).toBeDefined()
    expect(config.level).toBe('debug')
    expect(config.outputs).toEqual([]) // No outputs configured by default in test
  })

  // =============================================================================
  // Statistics Tests
  // =============================================================================

  test('tracks statistics', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    api.info('Info message')
    api.warn('Warning message')
    api.error('Error message')
    
    const stats = api.getStats()
    expect(stats.totalLogs).toBe(3)
    expect(stats.logsByLevel.info).toBe(1)
    expect(stats.logsByLevel.warn).toBe(1)
    expect(stats.logsByLevel.error).toBe(1)
    expect(stats.bufferSize).toBeGreaterThanOrEqual(3) // May include internal logs
    expect(stats.outputsActive).toContain('stream') // Default stream output
  })

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  test('throws error when accessing API before initialization', () => {
    expect(() => {
      plugin.getAPI()
    }).toThrow()
  })

  test('handles logging errors gracefully', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    // Should not crash even with problematic metadata
    const circularRef: any = {}
    circularRef.self = circularRef
    
    // This should not throw
    expect(() => {
      api.info('Test with circular reference', { circular: circularRef })
    }).not.toThrow()
  })

  // =============================================================================
  // Utility Tests
  // =============================================================================

  test('flushes logs', async () => {
    await runEffect(plugin.init)
    api = plugin.getAPI()
    
    api.info('Test message')
    
    // Should not throw
    await expect(api.flush()).resolves.toBeUndefined()
  })
})

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  test('parseLogLevel works correctly', () => {
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG)
    expect(parseLogLevel('info')).toBe(LogLevel.INFO)
    expect(parseLogLevel('warn')).toBe(LogLevel.WARN)
    expect(parseLogLevel('warning')).toBe(LogLevel.WARN)
    expect(parseLogLevel('error')).toBe(LogLevel.ERROR)
    expect(parseLogLevel('fatal')).toBe(LogLevel.FATAL)
    expect(parseLogLevel('critical')).toBe(LogLevel.FATAL)
    expect(parseLogLevel('unknown')).toBe(LogLevel.INFO)
  })
})

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('Factory Functions', () => {
  test('createLoggerPlugin creates plugin with default config', () => {
    const plugin = createLoggerPlugin()
    expect(plugin).toBeDefined()
    expect(plugin.name).toBe('logger')
  })

  test('createTestLoggerPlugin creates plugin suitable for testing', () => {
    const plugin = createTestLoggerPlugin()
    expect(plugin).toBeDefined()
    expect(plugin.name).toBe('logger')
  })
})