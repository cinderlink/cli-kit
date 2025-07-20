# Task 2B: LogViewer Component - Detailed Subtask Specifications

## **📋 CURRENT STATUS UPDATE**

**As of 2025-07-17**: The LogViewer component has been **fully implemented** using the TUIX functional MVU pattern instead of the originally planned class-based approach. All core functionality is complete and working. Only the tests need updating to match the functional API.

## **📋 SUBTASK SPECIFICATIONS**

---

## **Subtask 2B.1: Core LogViewer** ✅ COMPLETED

### **Objective**
Create the foundation LogViewer component with efficient rendering and basic functionality.

### **Requirements (UPDATED - Functional Pattern)**
```typescript
// Location: packages/components/src/display/log-viewer.ts

// TUIX MVU Architecture - Functional Component
export interface LogViewerModel {
  readonly logs: ReadonlyArray<LogEntry>
  readonly viewport: Viewport
  readonly selectedLevels: ReadonlySet<LogLevelString>
  readonly searchQuery: string
  readonly followMode: boolean
  readonly isStreaming: boolean
  readonly stats: LogStatistics | null
}

export type LogViewerMsg =
  | { readonly _tag: 'scroll'; readonly offset: number }
  | { readonly _tag: 'search'; readonly query: string }
  | { readonly _tag: 'toggleLevel'; readonly level: LogLevelString }
  | { readonly _tag: 'setFollowMode'; readonly enabled: boolean }
  | { readonly _tag: 'appendLogs'; readonly logs: ReadonlyArray<LogEntry> }
  | { readonly _tag: 'analyze' }

export function logViewer(props: LogViewerProps = {}): UIComponent<LogViewerModel, LogViewerMsg> {
  return {
    init: () => init(props),
    update,
    view
  }
}
```

### **Implementation Steps** ✅ ALL COMPLETED
1. ✅ Created functional LogViewer component with TUIX MVU pattern
2. ✅ Implemented virtual scrolling with viewport management
3. ✅ Added log level filtering with toggle messages
4. ✅ Created search functionality with regex support
5. ✅ Implemented follow mode (auto-scroll to new logs)
6. ✅ Added efficient rendering with View utils
7. ✅ Structured for testing with various log volumes

### **Testing Requirements** ⚠️ TESTS NEED UPDATE
- ✅ Component supports 100k log lines via virtual scrolling
- ✅ Only visible lines rendered via viewport calculation
- ✅ Search implemented with Effect-based filtering
- ✅ Follow mode behavior implemented
- ⚠️ Tests need rewriting for functional API

---

## **Subtask 2B.2: Syntax Highlighting**

### **Objective**
Add syntax highlighting and formatting for common log formats.

### **Requirements**
```typescript
// Location: packages/components/src/display/log-syntax.ts

interface SyntaxHighlighter {
  detectFormat(logMessage: string): LogFormat
  highlight(message: string, format: LogFormat): HighlightedText
  formatJSON(jsonString: string): HighlightedText
  formatXML(xmlString: string): HighlightedText
}

enum LogFormat {
  JSON = 'json',
  XML = 'xml',
  PLAIN = 'plain',
  ERROR_STACK = 'error-stack',
  HTTP_LOG = 'http-log'
}

export class LogSyntaxHighlighter implements SyntaxHighlighter {
  private themes = {
    dark: {
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      error: '#f44747'
    },
    light: {
      keyword: '#0000ff',
      string: '#a31515',
      number: '#098658',
      error: '#e51400'
    }
  }
  
  detectFormat(message: string): LogFormat {
    if (message.trim().startsWith('{')) return LogFormat.JSON
    if (message.trim().startsWith('<')) return LogFormat.XML
    if (message.includes('at ') && message.includes('(')) return LogFormat.ERROR_STACK
    return LogFormat.PLAIN
  }
}
```

### **Implementation Steps**
1. Design format detection algorithm
2. Implement JSON pretty printing and highlighting
3. Add XML formatting support
4. Create error stack trace highlighting
5. Add theme support for different terminals
6. Optimize highlighting performance
7. Create custom format plugin system

### **Performance Requirements**
- Highlight 1000 lines in <100ms
- Lazy highlighting for off-screen content
- Theme switching without re-highlighting
- Support for streaming highlighting

---

## **Subtask 2B.3: Log Streaming**

### **Objective**
Enable real-time log streaming with efficient buffer management.

### **Requirements**
```typescript
// Location: packages/components/src/display/log-stream.ts

export class LogStreamManager {
  private buffer: CircularBuffer<LogEntry>
  private maxBufferSize = 10000 // Configurable
  
  connectStream(stream: Stream.Stream<LogEntry>) {
    return Effect.gen(function* () {
      yield* Stream.runForEach(stream, (logEntry) =>
        Effect.sync(() => this.appendLog(logEntry))
      )
    })
  }
  
  private appendLog(entry: LogEntry) {
    // Add to circular buffer
    this.buffer.append(entry)
    
    // Update reactive state
    this.state.update(state => ({
      ...state,
      logs: this.buffer.toArray()
    }))
    
    // Trigger follow mode if enabled
    if (this.state.value.followMode) {
      this.scheduleScrollToBottom()
    }
  }
  
  // Handle log rotation detection
  private detectLogRotation(entry: LogEntry): boolean {
    return entry.timestamp < this.buffer.last()?.timestamp
  }
}
```

### **Implementation Steps**
1. Design circular buffer for log storage
2. Implement stream connection with Effect.js
3. Add batch processing for high-frequency logs
4. Create buffer size management
5. Implement log rotation detection
6. Add backpressure handling
7. Test with various stream patterns

### **Testing Requirements**
- Handle 1000 logs/second smoothly
- Verify buffer size limits are respected
- Test memory usage under sustained load
- Ensure no dropped logs
- Handle stream errors gracefully

---

## **Subtask 2B.4: Log Analysis**

### **Objective**
Add intelligent log analysis and pattern extraction.

### **Requirements**
```typescript
// Location: packages/components/src/display/log-analysis.ts

export class LogAnalyzer {
  // Extract common patterns
  extractPatterns(logs: LogEntry[]): LogPattern[] {
    const patterns = new Map<string, LogPattern>()
    
    for (const log of logs) {
      const pattern = this.identifyPattern(log.message)
      if (pattern) {
        const existing = patterns.get(pattern.signature)
        if (existing) {
          existing.count++
          existing.examples.push(log)
        } else {
          patterns.set(pattern.signature, {
            ...pattern,
            count: 1,
            examples: [log]
          })
        }
      }
    }
    
    return Array.from(patterns.values())
  }
  
  // Group related errors
  groupErrors(logs: LogEntry[]): ErrorGroup[] {
    const errorLogs = logs.filter(log => log.level === 'error')
    const groups = new Map<string, ErrorGroup>()
    
    for (const log of errorLogs) {
      const signature = this.generateErrorSignature(log.message)
      // Group logic...
    }
    
    return Array.from(groups.values())
  }
  
  // Generate statistics
  generateStats(logs: LogEntry[]): LogStatistics {
    return {
      totalLogs: logs.length,
      levelCounts: this.countByLevel(logs),
      timeRange: this.getTimeRange(logs),
      topPatterns: this.extractPatterns(logs).slice(0, 10),
      errorRate: this.calculateErrorRate(logs)
    }
  }
}
```

### **Implementation Steps**
1. Design pattern recognition algorithm
2. Implement error grouping logic
3. Create statistics calculation
4. Add pattern export functionality
5. Build analysis UI components
6. Optimize for large log sets
7. Add custom pattern definitions

### **Testing Requirements**
- Analyze 10k logs in <200ms
- Accurate pattern recognition
- Meaningful error grouping
- Export functionality works
- Statistics are accurate

---

## **Subtask 2B.5: LogViewer Testing**

### **Objective**
Comprehensive testing suite ensuring reliability and performance.

### **Requirements**
```typescript
// Location: packages/components/src/display/__tests__/log-viewer.test.ts

describe('LogViewer Component', () => {
  // Performance benchmarks
  bench('render 100k log lines', () => {
    const logs = generateLargeLogs(100000)
    const viewer = new LogViewer({ logs })
    expect(renderTime).toBeLessThan(100) // ms
  })
  
  // Search functionality
  test('search with regex', async () => {
    const logs = [
      { level: 'info', message: 'User login successful', timestamp: new Date() },
      { level: 'error', message: 'Database connection failed', timestamp: new Date() }
    ]
    const viewer = renderLogViewer({ logs })
    await viewer.search('login.*successful')
    expect(viewer.filteredLogs).toHaveLength(1)
  })
  
  // Follow mode
  test('follow mode auto-scrolls', async () => {
    const viewer = renderLogViewer({ followMode: true })
    const initialScrollTop = viewer.scrollTop
    await viewer.appendLog(newLogEntry)
    expect(viewer.scrollTop).toBeGreaterThan(initialScrollTop)
  })
  
  // Stream integration
  test('handles high-frequency streams', async () => {
    const logStream = Stream.fromArray(generateLargeLogs(1000))
    const viewer = renderLogViewer()
    await viewer.connectStream(logStream)
    expect(viewer.logs).toHaveLength(1000)
    expect(viewer.memoryUsage).toBeLessThan(50 * 1024 * 1024) // 50MB
  })
})
```

### **Implementation Steps**
1. Set up performance benchmarking
2. Create large log generators
3. Test search functionality thoroughly
4. Add stream integration tests
5. Test memory usage limits
6. Create visual regression tests
7. Document usage patterns
8. Add accessibility tests

### **Coverage Requirements**
- 95%+ code coverage
- All user interactions tested
- Performance benchmarks for key operations
- Memory leak detection
- Stream error handling verified

---

## **📝 INTEGRATION NOTES**

### **With Task 2A (DataTable)**
- Share virtual scrolling patterns
- Consistent keyboard navigation
- Similar search/filter UI

### **With Task 2E (Logger Plugin)**
- LogViewer displays plugin output
- Support plugin log formats
- Handle plugin metadata

### **Performance Considerations**
- Use requestAnimationFrame for smooth scrolling
- Implement line recycling for memory efficiency
- Batch log appends for performance
- Consider WebWorker for syntax highlighting

---

## **🚀 DEVELOPMENT TIPS**

1. **Start Simple**: Basic log display first, then add features
2. **Benchmark Early**: Set up performance tests immediately
3. **Test Real Logs**: Use production-like log files
4. **Profile Memory**: Watch for leaks in streaming
5. **Pattern Recognition**: Study common log formats for better highlighting