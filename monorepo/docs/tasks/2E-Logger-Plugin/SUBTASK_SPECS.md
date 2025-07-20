# Task 2E: Logger Plugin - Detailed Subtask Specifications

## **📋 SUBTASK SPECIFICATIONS**

---

## **Subtask 2E.1: Plugin Foundation**

### **Objective**
Create the foundational Logger Plugin structure following TUIX plugin architecture.

### **Requirements**
```typescript
// Location: packages/plugins/src/core/logger.ts

export class LoggerPlugin extends BasePlugin {
  // Plugin metadata
  static readonly metadata: PluginMetadata = {
    name: 'logger',
    version: '1.0.0',
    description: 'Centralized logging and log management system',
    author: 'TUIX Team',
    capabilities: [
      'structured-logging',
      'log-storage', 
      'log-streaming',
      'log-rotation',
      'multi-output'
    ],
    dependencies: [],
    platform: ['darwin', 'linux', 'win32']
  }
  
  // Plugin configuration
  private config: LoggerConfig
  private engine: LoggingEngine
  private isInitialized = false
  
  constructor(config: LoggerConfig = {}) {
    super(LoggerPlugin.metadata)
    this.config = {
      level: 'info',
      outputs: ['console'],
      format: 'json',
      bufferSize: 1000,
      flushInterval: 1000,
      rotation: {
        maxSize: '100MB',
        maxFiles: 5,
        datePattern: 'YYYY-MM-DD'
      },
      ...config
    }
  }
  
  // Plugin lifecycle
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    return Effect.runPromise(
      Effect.gen(function* () {
        // Initialize logging engine
        yield* Effect.sync(() => {
          this.engine = new LoggingEngine(this.config)
        })
        
        // Set up output destinations
        yield* this.initializeOutputs()
        
        // Start background services
        yield* this.startServices()
        
        this.isInitialized = true
        this.emit('initialized')
        
        // Log plugin startup
        this.engine.info('Logger plugin initialized', {
          config: this.config,
          outputs: Array.from(this.engine.getOutputNames())
        })
      }.bind(this))
    )
  }
  
  async destroy(): Promise<void> {
    if (!this.isInitialized) return
    
    return Effect.runPromise(
      Effect.gen(function* () {
        // Log shutdown
        this.engine.info('Logger plugin shutting down')
        
        // Flush pending logs
        yield* this.engine.flush()
        
        // Stop services
        yield* this.stopServices()
        
        // Cleanup resources
        yield* this.cleanup()
        
        this.isInitialized = false
        this.emit('destroyed')
      }.bind(this))
    )
  }
  
  // Plugin API exposure
  getAPI(): LoggerAPI {
    if (!this.isInitialized) {
      throw new Error('Logger plugin not initialized')
    }
    
    return {
      // Logging methods
      debug: this.debug.bind(this),
      info: this.info.bind(this),
      warn: this.warn.bind(this),
      error: this.error.bind(this),
      log: this.log.bind(this),
      
      // Log retrieval
      getLogHistory: this.getLogHistory.bind(this),
      searchLogs: this.searchLogs.bind(this),
      
      // Log streaming
      subscribeToLogs: this.subscribeToLogs.bind(this),
      createLogStream: this.createLogStream.bind(this),
      
      // Configuration
      setLogLevel: this.setLogLevel.bind(this),
      addOutput: this.addOutput.bind(this),
      removeOutput: this.removeOutput.bind(this),
      getConfig: this.getConfig.bind(this)
    }
  }
  
  // Configuration management
  private async initializeOutputs(): Promise<void> {
    for (const outputName of this.config.outputs) {
      const output = LogOutputFactory.create(outputName, this.config)
      await this.engine.addOutput(outputName, output)
    }
  }
}

// Configuration interfaces
interface LoggerConfig {
  level?: LogLevel
  outputs?: string[]
  format?: 'json' | 'text' | 'structured'
  bufferSize?: number
  flushInterval?: number
  rotation?: LogRotationConfig
  filters?: LogFilter[]
  metadata?: Record<string, any>
}

interface LogRotationConfig {
  maxSize?: string
  maxFiles?: number
  datePattern?: string
  compression?: boolean
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}
```

### **Implementation Steps**
1. Create LoggerPlugin class extending BasePlugin
2. Define comprehensive plugin metadata
3. Implement plugin lifecycle methods (initialize, destroy)
4. Create configuration system with validation
5. Add plugin event system integration
6. Test plugin registration with TUIX applications
7. Add error handling and resource cleanup

### **Testing Requirements**
- Plugin registers correctly with TUIX framework
- Lifecycle methods execute without errors
- Configuration validation works properly
- Plugin events are emitted correctly
- Resource cleanup is thorough

---

## **Subtask 2E.2: Core Logging Engine**

### **Objective**
Implement the core logging engine with structured logging and multiple output support.

### **Requirements**
```typescript
// Location: packages/plugins/src/core/logging-engine.ts

export class LoggingEngine {
  private config: LoggerConfig
  private outputs: Map<string, LogOutput> = new Map()
  private buffer: CircularBuffer<LogEntry> = new CircularBuffer(1000)
  private level: LogLevel
  private metadata: Record<string, any> = {}
  
  constructor(config: LoggerConfig) {
    this.config = config
    this.level = this.parseLogLevel(config.level || 'info')
    this.metadata = config.metadata || {}
  }
  
  // Core logging methods
  debug(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, meta)
  }
  
  info(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.INFO, message, meta)
  }
  
  warn(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.WARN, message, meta)
  }
  
  error(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.ERROR, message, meta)
  }
  
  fatal(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.FATAL, message, meta)
  }
  
  // Main logging implementation
  log(level: LogLevel, message: string, meta: LogMetadata = {}): void {
    // Check if this level should be logged
    if (level < this.level) return
    
    try {
      const entry = this.createLogEntry(level, message, meta)
      
      // Add to buffer for history
      this.buffer.push(entry)
      
      // Write to all outputs
      this.writeToOutputs(entry)
      
    } catch (error) {
      // Logging should never crash the application
      this.handleLoggingError(error, level, message, meta)
    }
  }
  
  private createLogEntry(level: LogLevel, message: string, meta: LogMetadata): LogEntry {
    return {
      timestamp: new Date(),
      level: LogLevel[level].toLowerCase() as keyof typeof LogLevel,
      message,
      metadata: {
        ...this.metadata,
        ...meta,
        pid: process.pid,
        hostname: os.hostname()
      },
      id: this.generateLogId()
    }
  }
  
  private writeToOutputs(entry: LogEntry): void {
    for (const [name, output] of this.outputs) {
      try {
        if (output.shouldLog(entry)) {
          output.write(entry)
        }
      } catch (error) {
        // If one output fails, others should still work
        this.handleOutputError(error, name, entry)
      }
    }
  }
  
  // Output management
  async addOutput(name: string, output: LogOutput): Promise<void> {
    await output.initialize()
    this.outputs.set(name, output)
  }
  
  async removeOutput(name: string): Promise<void> {
    const output = this.outputs.get(name)
    if (output) {
      await output.destroy()
      this.outputs.delete(name)
    }
  }
  
  // Buffering and flushing
  async flush(): Promise<void> {
    const flushPromises = Array.from(this.outputs.values()).map(output => 
      output.flush?.() || Promise.resolve()
    )
    
    await Promise.all(flushPromises)
  }
  
  // Log retrieval
  getLogHistory(query?: LogQuery): LogEntry[] {
    let logs = this.buffer.toArray()
    
    if (query) {
      logs = this.filterLogs(logs, query)
    }
    
    return logs
  }
  
  private filterLogs(logs: LogEntry[], query: LogQuery): LogEntry[] {
    return logs.filter(log => {
      if (query.level && log.level !== query.level) return false
      if (query.since && log.timestamp < query.since) return false
      if (query.until && log.timestamp > query.until) return false
      if (query.search && !log.message.includes(query.search)) return false
      return true
    })
  }
}

// Log output abstraction
export abstract class LogOutput {
  protected config: LoggerConfig
  
  constructor(config: LoggerConfig) {
    this.config = config
  }
  
  abstract initialize(): Promise<void>
  abstract write(entry: LogEntry): void
  abstract destroy(): Promise<void>
  abstract shouldLog(entry: LogEntry): boolean
  
  flush?(): Promise<void>
}

// Console output implementation
export class ConsoleLogOutput extends LogOutput {
  async initialize(): Promise<void> {
    // Console output needs no initialization
  }
  
  write(entry: LogEntry): void {
    const formatted = this.format(entry)
    
    switch (entry.level) {
      case 'error':
      case 'fatal':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }
  }
  
  shouldLog(entry: LogEntry): boolean {
    return true // Console logs all levels
  }
  
  async destroy(): Promise<void> {
    // Console output needs no cleanup
  }
  
  private format(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry)
      case 'structured':
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message} ${JSON.stringify(entry.metadata)}`
      case 'text':
      default:
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`
    }
  }
}

// Output factory
export class LogOutputFactory {
  static create(type: string, config: LoggerConfig): LogOutput {
    switch (type) {
      case 'console':
        return new ConsoleLogOutput(config)
      case 'file':
        return new FileLogOutput(config)
      case 'stream':
        return new StreamLogOutput(config)
      default:
        throw new Error(`Unknown log output type: ${type}`)
    }
  }
}
```

### **Implementation Steps**
1. Design core logging engine architecture
2. Implement structured logging with metadata
3. Create output abstraction and implementations
4. Add buffering and flushing mechanisms
5. Implement log level filtering
6. Add error handling for logging failures
7. Test logging performance and reliability

### **Testing Requirements**
- All log levels work correctly
- Multiple outputs receive log entries
- Buffering and flushing work properly
- Error handling prevents crashes
- Performance meets targets (<1ms per log)

---

## **Subtask 2E.3: Log Aggregation & Storage**

### **Objective**
Implement file-based log storage with rotation and efficient retrieval.

### **Requirements**
```typescript
// Location: packages/plugins/src/core/file-output.ts

export class FileLogOutput extends LogOutput {
  private currentFile: string
  private writeStream: fs.WriteStream
  private rotationTimer: NodeJS.Timer
  private bytesWritten: number = 0
  
  async initialize(): Promise<void> {
    await this.createLogDirectory()
    await this.openLogFile()
    this.scheduleRotation()
  }
  
  write(entry: LogEntry): void {
    const formatted = this.format(entry) + '\n'
    const bytes = Buffer.byteLength(formatted, 'utf8')
    
    this.writeStream.write(formatted)
    this.bytesWritten += bytes
    
    // Check if rotation is needed
    if (this.shouldRotate()) {
      this.rotateLog()
    }
  }
  
  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.writeStream) {
        this.writeStream.flush((error) => {
          if (error) reject(error)
          else resolve()
        })
      } else {
        resolve()
      }
    })
  }
  
  shouldLog(entry: LogEntry): boolean {
    return true // File logs all entries
  }
  
  async destroy(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }
    
    if (this.writeStream) {
      await this.flush()
      this.writeStream.end()
    }
  }
  
  // Log rotation
  private shouldRotate(): boolean {
    if (!this.config.rotation) return false
    
    const maxSize = this.parseSize(this.config.rotation.maxSize || '100MB')
    return this.bytesWritten >= maxSize
  }
  
  private async rotateLog(): Promise<void> {
    // Close current file
    await this.flush()
    this.writeStream.end()
    
    // Rename current file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const rotatedFile = this.currentFile.replace('.log', `.${timestamp}.log`)
    await fs.rename(this.currentFile, rotatedFile)
    
    // Compress if configured
    if (this.config.rotation?.compression) {
      await this.compressLogFile(rotatedFile)
    }
    
    // Clean up old files
    await this.cleanupOldLogs()
    
    // Open new log file
    await this.openLogFile()
  }
  
  private async cleanupOldLogs(): Promise<void> {
    const maxFiles = this.config.rotation?.maxFiles || 5
    const logDir = path.dirname(this.currentFile)
    const files = await fs.readdir(logDir)
    
    const logFiles = files
      .filter(file => file.endsWith('.log') || file.endsWith('.log.gz'))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        stats: fs.statSync(path.join(logDir, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
    
    // Remove excess files
    const filesToRemove = logFiles.slice(maxFiles)
    for (const file of filesToRemove) {
      await fs.unlink(file.path)
    }
  }
}

// Log indexing for efficient retrieval
export class LogIndex {
  private indexFile: string
  private index: Map<string, LogIndexEntry[]> = new Map()
  
  constructor(logDirectory: string) {
    this.indexFile = path.join(logDirectory, 'log.index')
    this.loadIndex()
  }
  
  addEntry(entry: LogEntry, file: string, position: number): void {
    const dateKey = entry.timestamp.toISOString().split('T')[0]
    
    if (!this.index.has(dateKey)) {
      this.index.set(dateKey, [])
    }
    
    this.index.get(dateKey)!.push({
      id: entry.id,
      level: entry.level,
      timestamp: entry.timestamp,
      file,
      position,
      length: JSON.stringify(entry).length
    })
  }
  
  async search(query: LogSearchQuery): Promise<LogEntry[]> {
    const relevantEntries = this.findRelevantEntries(query)
    const results: LogEntry[] = []
    
    for (const indexEntry of relevantEntries) {
      try {
        const logEntry = await this.readLogEntry(indexEntry)
        if (this.matchesQuery(logEntry, query)) {
          results.push(logEntry)
        }
      } catch (error) {
        // Skip corrupted entries
        continue
      }
    }
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  private findRelevantEntries(query: LogSearchQuery): LogIndexEntry[] {
    const entries: LogIndexEntry[] = []
    
    for (const [date, dateEntries] of this.index) {
      if (query.since && new Date(date) < query.since) continue
      if (query.until && new Date(date) > query.until) continue
      
      for (const entry of dateEntries) {
        if (query.level && entry.level !== query.level) continue
        entries.push(entry)
      }
    }
    
    return entries
  }
}

interface LogIndexEntry {
  id: string
  level: string
  timestamp: Date
  file: string
  position: number
  length: number
}
```

### **Implementation Steps**
1. Implement file-based log output
2. Add log rotation by size and time
3. Create log compression functionality
4. Implement log indexing for fast retrieval
5. Add log cleanup and retention policies
6. Test file operations and rotation
7. Optimize for high-throughput scenarios

### **Testing Requirements**
- File logging works reliably
- Log rotation triggers correctly
- Index provides fast log retrieval
- Cleanup maintains disk space limits
- No data loss during rotation

---

## **Subtask 2E.4: Log Streaming & Distribution**

### **Objective**
Create real-time log streaming for components and external consumers.

### **Requirements**
```typescript
// Location: packages/plugins/src/core/stream-output.ts

export class StreamLogOutput extends LogOutput {
  private streams: Map<string, LogStream> = new Map()
  private globalStream: Subject<LogEntry> = new Subject()
  
  async initialize(): Promise<void> {
    // Stream output needs no initialization
  }
  
  write(entry: LogEntry): void {
    // Emit to global stream
    this.globalStream.next(entry)
    
    // Emit to filtered streams
    for (const [name, stream] of this.streams) {
      if (stream.filter(entry)) {
        stream.emit(entry)
      }
    }
  }
  
  shouldLog(entry: LogEntry): boolean {
    return this.streams.size > 0 // Only log if there are active streams
  }
  
  async destroy(): Promise<void> {
    // Close all streams
    for (const stream of this.streams.values()) {
      stream.close()
    }
    this.streams.clear()
    this.globalStream.complete()
  }
  
  // Stream management
  createStream(name: string, filter?: LogFilter): Stream<LogEntry> {
    const logStream = new LogStream(name, filter)
    this.streams.set(name, logStream)
    
    return Stream.fromAsyncIterable(logStream)
  }
  
  removeStream(name: string): void {
    const stream = this.streams.get(name)
    if (stream) {
      stream.close()
      this.streams.delete(name)
    }
  }
  
  getGlobalStream(): Stream<LogEntry> {
    return Stream.fromAsyncIterable(this.globalStream)
  }
}

// Individual log stream with filtering
class LogStream implements AsyncIterable<LogEntry> {
  private subject: Subject<LogEntry> = new Subject()
  private isActive = true
  
  constructor(
    public readonly name: string,
    private filterFn?: LogFilter
  ) {}
  
  emit(entry: LogEntry): void {
    if (this.isActive) {
      this.subject.next(entry)
    }
  }
  
  filter(entry: LogEntry): boolean {
    return !this.filterFn || this.filterFn(entry)
  }
  
  close(): void {
    this.isActive = false
    this.subject.complete()
  }
  
  async *[Symbol.asyncIterator](): AsyncIterator<LogEntry> {
    while (this.isActive) {
      try {
        const entry = await this.subject.take(1).toPromise()
        yield entry
      } catch (error) {
        if (this.isActive) {
          throw error
        }
        break
      }
    }
  }
}

// Stream management service
export class LogStreamManager {
  private streams: Map<string, Stream<LogEntry>> = new Map()
  private streamOutput: StreamLogOutput
  
  constructor(engine: LoggingEngine) {
    this.streamOutput = new StreamLogOutput(engine.config)
    engine.addOutput('stream', this.streamOutput)
  }
  
  // Create filtered log streams
  createLogStream(name: string, filter?: LogFilter): Stream<LogEntry> {
    if (this.streams.has(name)) {
      throw new Error(`Stream '${name}' already exists`)
    }
    
    const stream = this.streamOutput.createStream(name, filter)
    this.streams.set(name, stream)
    
    return stream
  }
  
  // Convenience methods for common filters
  createLevelStream(level: LogLevel): Stream<LogEntry> {
    return this.createLogStream(`level-${level}`, entry => entry.level === level)
  }
  
  createComponentStream(component: string): Stream<LogEntry> {
    return this.createLogStream(`component-${component}`, entry => 
      entry.metadata?.component === component
    )
  }
  
  createErrorStream(): Stream<LogEntry> {
    return this.createLogStream('errors', entry => 
      entry.level === 'error' || entry.level === 'fatal'
    )
  }
  
  // Stream subscription management
  subscribeToLogs(filter?: LogFilter): Stream<LogEntry> {
    const streamName = `subscription-${this.generateStreamId()}`
    return this.createLogStream(streamName, filter)
  }
  
  // Backpressure handling
  createBufferedStream(name: string, bufferSize: number = 1000): Stream<LogEntry> {
    const baseStream = this.streamOutput.getGlobalStream()
    
    return Stream.pipe(
      baseStream,
      Stream.buffer(bufferSize),
      Stream.flatMap(entries => Stream.fromIterable(entries))
    )
  }
  
  // Stream analytics
  getStreamStats(): StreamStats {
    return {
      activeStreams: this.streams.size,
      streamNames: Array.from(this.streams.keys()),
      totalSubscribers: this.getTotalSubscribers()
    }
  }
  
  private getTotalSubscribers(): number {
    // Implementation would count active subscribers across all streams
    return Array.from(this.streams.values()).reduce((total, stream) => {
      return total + (stream as any).subscriberCount || 0
    }, 0)
  }
}

// Filter types
type LogFilter = (entry: LogEntry) => boolean

interface StreamStats {
  activeStreams: number
  streamNames: string[]
  totalSubscribers: number
}
```

### **Implementation Steps**
1. Design log streaming architecture
2. Implement stream output with filtering
3. Create stream management service
4. Add backpressure handling mechanisms
5. Implement stream subscription management
6. Test streaming performance and reliability
7. Add stream analytics and monitoring

### **Testing Requirements**
- Streams deliver log entries in real-time
- Filtering works correctly
- Backpressure handling prevents memory issues
- Multiple subscribers work simultaneously
- Stream cleanup prevents resource leaks

---

## **Subtask 2E.5: Logger Testing**

### **Objective**
Comprehensive testing suite ensuring logging reliability and performance.

### **Requirements**
```typescript
// Location: packages/plugins/src/core/__tests__/logger.test.ts

describe('LoggerPlugin', () => {
  let plugin: LoggerPlugin
  let mockApp: MockTUIXApp
  
  beforeEach(() => {
    plugin = new LoggerPlugin({
      level: 'debug',
      outputs: ['console', 'file'],
      bufferSize: 100
    })
    mockApp = new MockTUIXApp()
  })
  
  afterEach(async () => {
    await plugin.destroy()
  })
  
  // Plugin lifecycle tests
  test('initializes correctly', async () => {
    await plugin.initialize()
    expect(plugin.isInitialized).toBe(true)
    
    const api = plugin.getAPI()
    expect(api).toBeDefined()
    expect(typeof api.info).toBe('function')
    expect(typeof api.error).toBe('function')
  })
  
  // Logging functionality tests
  test('logs messages at different levels', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    const consoleSpy = jest.spyOn(console, 'log')
    const errorSpy = jest.spyOn(console, 'error')
    
    api.info('Test info message')
    api.error('Test error message')
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test info message'))
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error message'))
  })
  
  test('respects log level filtering', async () => {
    plugin = new LoggerPlugin({ level: 'warn' })
    await plugin.initialize()
    const api = plugin.getAPI()
    
    const consoleSpy = jest.spyOn(console, 'log')
    
    api.debug('This should not appear')
    api.info('This should not appear')
    api.warn('This should appear')
    
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('should not appear'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('This should appear'))
  })
  
  // Metadata and structured logging tests
  test('includes metadata in log entries', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    api.info('User action', { userId: 123, action: 'login' })
    
    const history = api.getLogHistory()
    const entry = history.find(e => e.message === 'User action')
    
    expect(entry).toBeDefined()
    expect(entry!.metadata.userId).toBe(123)
    expect(entry!.metadata.action).toBe('login')
  })
  
  // Stream functionality tests
  test('streams log entries in real-time', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    const logEntries: LogEntry[] = []
    const stream = api.subscribeToLogs()
    
    const subscription = Stream.runForEach(stream, (entry) =>
      Effect.sync(() => logEntries.push(entry))
    )
    
    api.info('Stream test message')
    
    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 50))
    await subscription
    
    expect(logEntries).toHaveLength(1)
    expect(logEntries[0].message).toBe('Stream test message')
  })
  
  // Performance benchmarks
  bench('logging performance', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    const start = performance.now()
    
    for (let i = 0; i < 1000; i++) {
      api.info(`Performance test message ${i}`)
    }
    
    const duration = performance.now() - start
    const avgTime = duration / 1000
    
    expect(avgTime).toBeLessThan(1) // Should be <1ms per log on average
  })
  
  bench('log retrieval performance', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    // Create test data
    for (let i = 0; i < 1000; i++) {
      api.info(`Test message ${i}`, { index: i })
    }
    
    const start = performance.now()
    const logs = api.getLogHistory({ level: 'info' })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(10) // Should retrieve quickly
    expect(logs.length).toBe(1000)
  })
  
  // Error handling tests
  test('handles logging errors gracefully', async () => {
    await plugin.initialize()
    const api = plugin.getAPI()
    
    // Mock an output that throws errors
    const faultyOutput = {
      write: () => { throw new Error('Output error') },
      initialize: () => Promise.resolve(),
      destroy: () => Promise.resolve(),
      shouldLog: () => true
    }
    
    api.addOutput('faulty', faultyOutput)
    
    // This should not crash the application
    expect(() => {
      api.info('This might cause an error')
    }).not.toThrow()
  })
  
  // Integration tests
  test('integrates with TUIX application', async () => {
    const app = new TUIXApp()
    app.registerPlugin(plugin)
    
    await app.initialize()
    
    const logger = app.getPlugin('logger')
    expect(logger).toBeDefined()
    expect(logger).toBe(plugin)
    
    // Test logging through app context
    logger.info('Integration test message')
    
    await app.destroy()
  })
})

// File output tests
describe('File logging', () => {
  let tempDir: string
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logger-test-'))
  })
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })
  
  test('writes logs to file', async () => {
    const plugin = new LoggerPlugin({
      outputs: ['file'],
      file: { path: path.join(tempDir, 'test.log') }
    })
    
    await plugin.initialize()
    const api = plugin.getAPI()
    
    api.info('File test message')
    await api.flush()
    
    const logContent = await fs.readFile(path.join(tempDir, 'test.log'), 'utf8')
    expect(logContent).toContain('File test message')
    
    await plugin.destroy()
  })
  
  test('rotates log files when size limit reached', async () => {
    const plugin = new LoggerPlugin({
      outputs: ['file'],
      file: { path: path.join(tempDir, 'test.log') },
      rotation: { maxSize: '1KB', maxFiles: 3 }
    })
    
    await plugin.initialize()
    const api = plugin.getAPI()
    
    // Write enough data to trigger rotation
    for (let i = 0; i < 100; i++) {
      api.info(`Long message that will cause rotation when repeated many times ${i}`)
    }
    
    await api.flush()
    
    const files = await fs.readdir(tempDir)
    const logFiles = files.filter(f => f.endsWith('.log'))
    
    expect(logFiles.length).toBeGreaterThan(1)
    
    await plugin.destroy()
  })
})
```

### **Implementation Steps**
1. Set up comprehensive test environment
2. Test plugin lifecycle and configuration
3. Add logging functionality tests
4. Create performance benchmarks
5. Test error handling and recovery
6. Add file logging and rotation tests
7. Test streaming functionality
8. Document testing procedures and coverage

### **Coverage Requirements**
- 95%+ code coverage
- All logging methods tested
- Performance benchmarks established
- Error handling verified
- Integration with TUIX framework tested

---

## **📝 INTEGRATION NOTES**

### **With Task 1C (Core Plugin System)**
- Must implement BasePlugin interface correctly
- Follow plugin lifecycle patterns
- Use plugin event system properly
- Handle plugin configuration appropriately

### **With Task 2B (LogViewer Component)**
- LogViewer consumes Logger plugin streams
- Plugin provides real-time log data
- Ensure data format compatibility
- Handle plugin availability gracefully

### **Performance Considerations**
- Minimize logging overhead in hot paths
- Use efficient buffering and batching
- Optimize file I/O operations
- Implement proper backpressure handling

---

## **🚀 DEVELOPMENT TIPS**

1. **Fail-Safe Design**: Logging failures should never crash the application
2. **Performance First**: Keep logging overhead minimal (<1ms per log)
3. **Structured Data**: Design for searchability and analysis
4. **Resource Management**: Ensure proper cleanup of files and streams
5. **Monitoring**: Include self-monitoring for logging system health