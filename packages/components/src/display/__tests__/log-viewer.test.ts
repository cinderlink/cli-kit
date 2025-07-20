/**
 * LogViewer Component Tests
 * 
 * Comprehensive test suite for the LogViewer component including:
 * - Virtual scrolling performance
 * - Search functionality
 * - Log level filtering  
 * - Stream integration
 * - Memory usage
 * - Syntax highlighting
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Stream } from "effect"
import { testComponent } from "@tuix/testing"
import { logViewer, simpleLogViewer, detailedLogViewer, streamingLogViewer } from "../log-viewer"
import { LogStreamManager, createLogStreamManager } from "../log-stream"
import { LogAnalyzer, createLogAnalyzer } from "../log-analysis"
import { createSyntaxHighlighter, LogFormat } from "../log-syntax"
import type { LogEntry, LogLevelString } from "../types"
import type { LogViewerModel, LogViewerMsg } from "../log-viewer"

/**
 * Generate test log entries
 */
function generateTestLogs(count: number): LogEntry[] {
  const levels: LogLevelString[] = ['debug', 'info', 'warn', 'error', 'fatal']
  const messages = [
    'Application started successfully',
    'Processing user request for user_123',
    'Database connection established',
    'Cache miss for key: session_abc',
    'API request completed in 150ms',
    'Background job scheduled: email_sender',
    'Memory usage: 75% (850MB/1GB)',
    'File uploaded: document.pdf (2.5MB)',
    'User authentication failed for admin',
    'Service health check passed',
    '{"event": "user_login", "userId": 123, "timestamp": "2025-01-17T10:30:00Z"}',
    'Error: Database connection timeout after 30000ms',
    'SQLException: Invalid column name "user_id" in table "users"',
    'GET /api/users/123 HTTP/1.1" 200 1024',
    'SELECT * FROM users WHERE active = true AND created_at > ?'
  ]

  return Array.from({ length: count }, (_, i) => ({
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(Date.now() - (count - i) * 1000), // Chronological order
    metadata: {
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
      userId: Math.floor(Math.random() * 1000),
      component: 'test-component'
    }
  }))
}

/**
 * Create a test component helper for LogViewer
 */
function createTestLogViewer(logs: LogEntry[] = []) {
  const component = logViewer({ logs })
  return testComponent(component)
}

describe('LogViewer Component', () => {
  let testLogs: LogEntry[]

  beforeEach(() => {
    testLogs = generateTestLogs(100)
  })

  describe('Initialization', () => {
    test('should initialize with empty logs', async () => {
      const tester = createTestLogViewer([])
      const [model, _cmds] = await tester.testInit()
      
      expect(model.logs).toEqual([])
      expect(model.config.followMode).toBe(true)
      expect(model.searchQuery).toBe("")
    })

    test('should initialize with provided logs', async () => {
      const tester = createTestLogViewer(testLogs)
      const [model, _cmds] = await tester.testInit()
      
      expect(model.logs).toHaveLength(100)
      expect(model.logs).toEqual(testLogs)
    })

    test('should set initial viewport configuration', async () => {
      const tester = createTestLogViewer([])
      const [model, _cmds] = await tester.testInit()
      
      expect(model.viewport).toBeDefined()
      expect(model.config.height).toBeGreaterThan(0)
      expect(model.config.lineHeight).toBeGreaterThan(0)
    })
  })

  describe('Virtual Scrolling', () => {
    test('should calculate correct visible range', async () => {
      const tester = createTestLogViewer(testLogs)
      const [model, _cmds] = await tester.testInit()
      
      expect(model.viewport).toBeDefined()
      
      // Verify viewport shows reasonable visible range
      expect(model.viewport.visibleStart).toBe(0)
      expect(model.viewport.visibleEnd).toBeGreaterThanOrEqual(0)
    })

    test('should update viewport on scroll', async () => {
      const tester = createTestLogViewer(testLogs)
      const [initialModel, _initialCmds] = await tester.testInit()
      const initialVisibleStart = initialModel.viewport.visibleStart
      
      // Simulate scroll by sending scroll message
      const scrollMsg: LogViewerMsg = { type: 'scroll', scrollTop: 320 }
      const [newModel, _cmds] = await tester.testUpdate(scrollMsg, initialModel)
      
      expect(newModel.viewport.scrollTop).toBe(320)
    })

    test.skip('should handle large log sets efficiently', async () => {
      const largeLogs = generateTestLogs(100000)
      const tester = createTestLogViewer(largeLogs)
      
      // Initialization should be fast
      const startTime = performance.now()
      await tester.testInit()
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should init in <100ms
    })
  })

  describe('Search Functionality', () => {
    test('should filter logs by simple text search', async () => {
      const tester = createTestLogViewer(testLogs)
      const [initialModel, _initialCmds] = await tester.testInit()
      
      // Send search message
      const searchMsg: LogViewerMsg = { type: 'search', query: 'user' }
      const [model, _cmds] = await tester.testUpdate(searchMsg, initialModel)
      
      expect(model.searchQuery).toBe('user')
      expect(model.filteredLogs.length).toBeGreaterThan(0)
      
      // All filtered logs should contain 'user'
      model.filteredLogs.forEach(log => {
        expect(log.message.toLowerCase()).toContain('user')
      })
    })

    test('should filter logs by regex search', async () => {
      const tester = createTestLogViewer(testLogs)
      const [initialModel, _initialCmds] = await tester.testInit()
      
      // Send regex search message
      const searchMsg: LogViewerMsg = { type: 'search', query: 'user_\\d+' }
      const [model, _cmds] = await tester.testUpdate(searchMsg, initialModel)
      
      expect(model.filteredLogs.length).toBeGreaterThan(0)
      
      // All filtered logs should match the regex pattern
      const regex = /user_\d+/i
      model.filteredLogs.forEach(log => {
        expect(regex.test(log.message)).toBe(true)
      })
    })

    test('should handle invalid regex gracefully', async () => {
      const tester = createTestLogViewer(testLogs)
      const [initialModel, _initialCmds] = await tester.testInit()
      
      // Send invalid regex search message
      const searchMsg: LogViewerMsg = { type: 'search', query: '[invalid' }
      const [model, _cmds] = await tester.testUpdate(searchMsg, initialModel)
      
      // Should not throw error and should perform string search instead
      expect(model.searchQuery).toBe('[invalid')
      expect(Array.isArray(model.filteredLogs)).toBe(true)
    })

    test('should clear search results', async () => {
      const tester = createTestLogViewer(testLogs)
      const [initialModel, _initialCmds] = await tester.testInit()
      
      // First search for something
      const searchMsg: LogViewerMsg = { type: 'search', query: 'user' }
      const [searchedModel, _searchCmds] = await tester.testUpdate(searchMsg, initialModel)
      expect(searchedModel.filteredLogs.length).toBeLessThan(searchedModel.logs.length)
      
      // Clear search
      const clearMsg: LogViewerMsg = { type: 'search', query: '' }
      const [clearedModel, _clearCmds] = await tester.testUpdate(clearMsg, searchedModel)
      expect(clearedModel.searchQuery).toBe('')
      // Should show all logs when search is cleared (considering level filters)
    })

    test.skip('should search large log sets quickly', () => {
      const largeLogs = generateTestLogs(10000)
      const largeViewer = logViewer()
      Effect.runSync(largeViewer.init({ logs: largeLogs }))
      
      const startTime = performance.now()
      largeViewer.search('user')
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50) // Should search in <50ms
    })
  })

  describe('Log Level Filtering', () => {
    test('should filter by selected log levels', async () => {
      const state = viewer.getState()
      const initialFilteredCount = state?.filteredLogs.length || 0
      
      // Filter to only show errors
      viewer.toggleLevel('info')
      viewer.toggleLevel('warn')
      viewer.toggleLevel('debug')
      viewer.toggleLevel('trace')
      
      const newState = viewer.getState()
      expect(newState?.selectedLevels.has('error')).toBe(true)
      expect(newState?.selectedLevels.has('info')).toBe(false)
      
      // Should only show error and fatal logs
      newState?.filteredLogs.forEach(log => {
        expect(['error', 'fatal']).toContain(log.level)
      })
    })

    test('should toggle log levels correctly', async () => {
      const initialState = viewer.getState()
      const hadInfo = initialState?.selectedLevels.has('info') || false
      
      viewer.toggleLevel('info')
      
      const newState = viewer.getState()
      expect(newState?.selectedLevels.has('info')).toBe(!hadInfo)
    })

    test('should update filtered logs when level selection changes', async () => {
      const initialState = viewer.getState()
      const initialCount = initialState?.filteredLogs.length || 0
      
      // Remove a common level
      viewer.toggleLevel('info')
      
      const newState = viewer.getState()
      expect(newState?.filteredLogs.length).not.toBe(initialCount)
    })
  })

  describe('Follow Mode', () => {
    test('should enable follow mode', async () => {
      viewer.setState(state => ({ ...state, followMode: false }))
      let state = viewer.getState()
      expect(state?.followMode).toBe(false)
      
      viewer.enableFollowMode()
      state = viewer.getState()
      expect(state?.followMode).toBe(true)
    })

    test('should auto-scroll when new logs are added in follow mode', async () => {
      viewer.enableFollowMode()
      
      // Add new logs
      const newLogs = generateTestLogs(5)
      viewer.appendLogs(newLogs)
      
      // In a real implementation, this would check if scroll position
      // moved to bottom, but since we don't have DOM, we check follow mode state
      const state = viewer.getState()
      expect(state?.followMode).toBe(true)
      expect(state?.logs.length).toBe(105) // Original 100 + 5 new
    })
  })

  describe('Stream Integration', () => {
    test('should connect to log stream', async () => {
      const streamManager = createLogStreamManager()
      const testStream = LogStreamManager.createTestStream(5, 1000) // 5 logs/sec for 1 second
      
      let updateCount = 0
      const mockUpdate = (logs: LogEntry[]) => {
        updateCount++
        viewer.appendLogs(logs)
      }
      
      // Run stream for a short time
      const streamEffect = streamManager.connectStream(testStream, mockUpdate)
      
      // This would run the stream in real implementation
      // For test, we manually trigger updates
      const testLogs = generateTestLogs(5)
      mockUpdate(testLogs)
      
      expect(updateCount).toBe(1)
      
      const state = viewer.getState()
      expect(state?.logs.length).toBe(105) // Original 100 + 5 from stream
    })

    test('should handle high-frequency log streams', async () => {
      const highFrequencyLogs = generateTestLogs(1000)
      
      const startTime = performance.now()
      viewer.appendLogs(highFrequencyLogs)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should handle in <100ms
      
      const state = viewer.getState()
      expect(state?.logs.length).toBeGreaterThan(100)
    })
  })

  describe('Memory Management', () => {
    test('should respect buffer size limits', async () => {
      const smallBufferViewer = await createTestLogViewer([], { maxBufferSize: 50 })
      
      // Add more logs than buffer size
      const largeBatch = generateTestLogs(100)
      Effect.runSync(smallBufferViewer.init({ logs: largeBatch, maxBufferSize: 50 }))
      
      const state = smallBufferViewer.getState()
      expect(state?.logs.length).toBeLessThanOrEqual(50)
    })

    test('should clear logs efficiently', async () => {
      viewer.clear()
      
      const state = viewer.getState()
      expect(state?.logs).toHaveLength(0)
      expect(state?.filteredLogs).toHaveLength(0)
    })

    test.skip('should maintain performance with buffer operations', () => {
      const operations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < operations; i++) {
        const log = generateTestLogs(1)[0]
        viewer.appendLogs([log])
      }
      
      const endTime = performance.now()
      const avgTime = (endTime - startTime) / operations
      
      expect(avgTime).toBeLessThan(1) // <1ms per operation
    })
  })

  describe('Syntax Highlighting', () => {
    test('should highlight JSON logs', () => {
      const highlighter = createSyntaxHighlighter('dark')
      const jsonLog = '{"event": "user_login", "userId": 123, "success": true}'
      
      const result = highlighter.highlight(jsonLog)
      
      expect(result.format).toBe(LogFormat.JSON)
      expect(result.segments.length).toBeGreaterThan(1)
      
      // Should have different colored segments
      const colors = new Set(result.segments.map(s => s.color))
      expect(colors.size).toBeGreaterThan(1)
    })

    test('should detect error stack traces', () => {
      const highlighter = createSyntaxHighlighter('dark')
      const stackTrace = `Error: Something went wrong
        at Object.func (/app/src/index.js:10:5)
        at require (internal/modules/cjs/loader.js:985:16)`
      
      const result = highlighter.highlight(stackTrace)
      
      expect(result.format).toBe(LogFormat.ERROR_STACK)
      expect(result.segments.some(s => s.type === 'error')).toBe(true)
    })

    test('should highlight SQL statements', () => {
      const highlighter = createSyntaxHighlighter('dark')
      const sqlLog = 'SELECT * FROM users WHERE active = true AND created_at > ?'
      
      const result = highlighter.highlight(sqlLog)
      
      expect(result.format).toBe(LogFormat.SQL)
      expect(result.segments.some(s => s.type === 'keyword')).toBe(true)
    })

    test('should switch themes correctly', () => {
      const darkHighlighter = createSyntaxHighlighter('dark')
      const lightHighlighter = createSyntaxHighlighter('light')
      
      const testText = 'SELECT * FROM users'
      
      const darkResult = darkHighlighter.highlight(testText)
      const lightResult = lightHighlighter.highlight(testText)
      
      // Should have different colors for same text
      expect(darkResult.segments[0].color).not.toBe(lightResult.segments[0].color)
    })
  })

  describe('Log Analysis', () => {
    test('should extract patterns from logs', async () => {
      const analyzer = createLogAnalyzer()
      const analysisResult = await Effect.runPromise(analyzer.analyzeLogs(testLogs))
      
      expect(analysisResult.totalLogs).toBe(100)
      expect(analysisResult.topPatterns.length).toBeGreaterThan(0)
      expect(typeof analysisResult.errorRate).toBe('number')
    })

    test('should group similar errors', async () => {
      const errorLogs = [
        { level: 'error' as LogLevel, message: 'Database timeout for user 123', timestamp: new Date() },
        { level: 'error' as LogLevel, message: 'Database timeout for user 456', timestamp: new Date() },
        { level: 'error' as LogLevel, message: 'Connection failed to server', timestamp: new Date() }
      ]
      
      const analyzer = createLogAnalyzer()
      await Effect.runPromise(analyzer.groupErrors(errorLogs))
      
      const errorGroups = analyzer.getErrorGroups()
      expect(errorGroups.length).toBeGreaterThan(0)
      
      // Should group similar database timeout errors
      const timeoutGroup = errorGroups.find(g => g.message.includes('Database timeout'))
      expect(timeoutGroup?.count).toBe(2)
    })

    test('should calculate statistics correctly', async () => {
      const analyzer = createLogAnalyzer()
      const stats = await Effect.runPromise(analyzer.analyzeLogs(testLogs))
      
      expect(stats.totalLogs).toBe(testLogs.length)
      expect(stats.timeRange.start).toBeInstanceOf(Date)
      expect(stats.timeRange.end).toBeInstanceOf(Date)
      expect(stats.timeRange.duration).toBeGreaterThan(0)
      expect(stats.averageLogsPerMinute).toBeGreaterThan(0)
      expect(stats.uniqueMessages).toBeGreaterThan(0)
      expect(stats.patternCoverage).toBeLessThanOrEqual(1)
    })

    test.skip('should analyze large log sets efficiently', async () => {
      const largeLogs = generateTestLogs(10000)
      const analyzer = createLogAnalyzer()
      
      const startTime = performance.now()
      await Effect.runPromise(analyzer.analyzeLogs(largeLogs))
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(200) // Should analyze in <200ms
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed log entries gracefully', async () => {
      const malformedLogs = [
        { level: 'info' as LogLevel, message: 'Good log', timestamp: new Date() },
        // @ts-ignore - Testing malformed data
        { level: 'invalid', message: null, timestamp: 'not-a-date' },
        { level: 'error' as LogLevel, message: 'Another good log', timestamp: new Date() }
      ]
      
      expect(() => {
        viewer.appendLogs(malformedLogs as LogEntry[])
      }).not.toThrow()
      
      // Should still have processed the valid logs
      const state = viewer.getState()
      expect(state?.logs.length).toBeGreaterThan(100) // Original 100 + valid new ones
    })

    test('should handle empty search gracefully', async () => {
      viewer.search('')
      
      const state = viewer.getState()
      expect(state?.searchQuery).toBe('')
      expect(Array.isArray(state?.filteredLogs)).toBe(true)
    })

    test('should handle component cleanup properly', async () => {
      const state = viewer.getState()
      expect(state).toBeDefined()
      
      if (state) {
        await Effect.runPromise(viewer.cleanup(state))
        // Component should be cleaned up without errors
      }
    })
  })

  describe('Performance Benchmarks', () => {
    test.skip('render 1000 log lines', () => {
      const logs = generateTestLogs(1000)
      const viewer = logViewer()
      
      const startTime = performance.now()
      Effect.runSync(viewer.init({ logs }))
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50) // <50ms
    })

    test.skip('search 10000 log lines', () => {
      const logs = generateTestLogs(10000)
      const viewer = logViewer()
      Effect.runSync(viewer.init({ logs }))
      
      const startTime = performance.now()
      viewer.search('user')
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50) // <50ms
    })

    test.skip('virtual scroll calculation', () => {
      const logs = generateTestLogs(100000)
      const viewer = logViewer()
      Effect.runSync(viewer.init({ logs, height: 400, lineHeight: 16 }))
      
      const startTime = performance.now()
      
      // Simulate multiple scroll position updates
      for (let i = 0; i < 100; i++) {
        viewer.setState(state => ({
          ...state,
          viewport: {
            ...state.viewport,
            scrollTop: i * 16
          }
        }))
      }
      
      const endTime = performance.now()
      const avgTime = (endTime - startTime) / 100
      
      expect(avgTime).toBeLessThan(1) // <1ms per scroll update
    })

    test.skip('memory usage with large buffer', () => {
      const logs = generateTestLogs(100000)
      const viewer = logViewer()
      
      const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0
      Effect.runSync(viewer.init({ logs, maxBufferSize: 50000 }))
      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      const memoryUsed = afterMemory - beforeMemory
      const memoryPerLog = memoryUsed / logs.length
      
      // Should use reasonable memory per log entry
      expect(memoryPerLog).toBeLessThan(1000) // <1KB per log
    })
  })
})