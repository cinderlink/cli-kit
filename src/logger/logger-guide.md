# Tuix Logger Plugin

A comprehensive logging system implemented as a TUIX plugin, providing structured logging, multiple output destinations, real-time streaming, and advanced log management capabilities.

## Quick Start

### Plugin Registration

```typescript
import { LoggerPlugin } from '@tuix/plugins'

// Register the logger plugin in your application
app.registerPlugin(new LoggerPlugin({
  level: 'info',
  outputs: ['console', 'file'],
  format: 'pretty',
  bufferSize: 1000
}))

// Get the logger API
const logger = app.getPlugin('logger')

// Use the logger
logger.info("Server started successfully")
logger.warn("Memory usage is high", { usage: 85 })
logger.error("Failed to connect to database", { error, retryCount: 3 })
```

## Logger API

### Core Logging Methods

```typescript
interface LoggerAPI {
  // Log at specific levels
  debug(message: string, meta?: LogMetadata): void
  info(message: string, meta?: LogMetadata): void
  warn(message: string, meta?: LogMetadata): void
  error(message: string, meta?: LogMetadata): void
  fatal(message: string, meta?: LogMetadata): void
  
  // Log with explicit level
  log(level: LogLevel, message: string, meta?: LogMetadata): void
}
```

### Examples

```typescript
// Simple logging
logger.info("User logged in")

// With metadata
logger.info("Order processed", {
  orderId: "12345",
  amount: 99.99,
  customer: "john@example.com"
})

// Error logging
logger.error("Payment failed", {
  error: paymentError,
  orderId: "12345",
  retryCount: 3
})

// Debug logging
logger.debug("Cache hit", {
  key: "user:123",
  ttl: 3600
})
```

## Configuration

### Plugin Options

```typescript
interface LoggerConfig {
  // Minimum log level to process
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  
  // Output destinations
  outputs: Array<'console' | 'file' | 'stream'>
  
  // Output format
  format: 'pretty' | 'json' | 'compact'
  
  // Buffer size for in-memory storage
  bufferSize: number
  
  // File output options
  fileOptions?: {
    path: string
    maxSize: string  // e.g., "100MB"
    maxFiles: number
    rotation: boolean
  }
  
  // Console output options
  consoleOptions?: {
    colorize: boolean
    timestamps: boolean
    prettyPrint: boolean
  }
}
```

### Dynamic Configuration

```typescript
// Change log level at runtime
logger.setLogLevel('debug')

// Add new output
await logger.addOutput('remote', new RemoteOutput({
  endpoint: 'https://logs.example.com',
  apiKey: 'secret'
}))

// Remove output
await logger.removeOutput('console')
```

## Log Retrieval

### Query Historical Logs

```typescript
// Get recent logs
const recentLogs = await logger.getLogHistory({
  limit: 100,
  since: new Date(Date.now() - 3600000) // Last hour
})

// Filter by level
const errors = await logger.getLogHistory({
  level: 'error',
  limit: 50
})

// Search logs
const searchResults = await logger.searchLogs({
  textSearch: "database connection",
  level: 'error',
  metadata: { component: 'db' }
})
```

## Real-time Log Streaming

### Subscribe to Log Stream

```typescript
import { Effect, Stream } from 'effect'

// Subscribe to all logs
const logStream = logger.subscribeToLogs()

// Subscribe with filter
const errorStream = logger.subscribeToLogs({
  level: 'error',
  metadata: { critical: true }
})

// Process stream
await Effect.runPromise(
  Stream.runForEach(errorStream, (logEntry) => 
    Effect.sync(() => {
      console.log(`Error: ${logEntry.message}`)
      // Send alert, update UI, etc.
    })
  )
)
```

### Named Streams

```typescript
// Create a named stream for specific consumers
const auditStream = logger.createLogStream('audit', {
  metadata: { audit: true }
})

// Multiple consumers can subscribe to the same stream
const consumer1 = Stream.runForEach(auditStream, handleAuditLog)
const consumer2 = Stream.runForEach(auditStream, saveToDatabase)
```

## Output Types

### Console Output

Colorized console logging with ANSI formatting:

```typescript
new LoggerPlugin({
  outputs: ['console'],
  consoleOptions: {
    colorize: true,
    timestamps: true,
    prettyPrint: true
  }
})
```

### File Output

Rotating file logs with automatic cleanup:

```typescript
new LoggerPlugin({
  outputs: ['file'],
  fileOptions: {
    path: './logs/app.log',
    maxSize: '100MB',
    maxFiles: 5,
    rotation: true
  }
})
```

### Stream Output

For real-time processing and forwarding:

```typescript
new LoggerPlugin({
  outputs: ['stream'],
  streamOptions: {
    batchSize: 100,
    flushInterval: 5000
  }
})
```

## Custom Outputs

Create custom log outputs by implementing the LogOutput interface:

```typescript
import { LogOutput, LogEntry } from '@tuix/plugins'

class CustomOutput implements LogOutput {
  async initialize(): Promise<void> {
    // Setup connection, etc.
  }
  
  async write(entry: LogEntry): Promise<void> {
    // Write single log entry
  }
  
  async writeBatch(entries: LogEntry[]): Promise<void> {
    // Write multiple entries efficiently
  }
  
  async flush(): Promise<void> {
    // Flush any buffered data
  }
  
  async destroy(): Promise<void> {
    // Cleanup resources
  }
}

// Add custom output
await logger.addOutput('custom', new CustomOutput())
```

## Integration with Components

### LogViewer Component

Display logs in your TUIX application:

```tsx
import { LogViewer } from '@tuix/components'

const LogPanel = () => {
  const logger = usePlugin('logger')
  
  return (
    <LogViewer
      source={logger.subscribeToLogs()}
      maxEntries={1000}
      filters={{
        level: ['error', 'warn'],
        search: ''
      }}
    />
  )
}
```

## Performance Features

### Circular Buffer

The logger uses a circular buffer for efficient memory usage:

- Fixed memory footprint
- O(1) insertion time
- Automatic old log removal
- Configurable size

### Batch Processing

Logs are processed in batches for better performance:

- Asynchronous write operations
- Configurable batch size
- Automatic flushing
- Backpressure handling

### Statistics

Monitor logger performance:

```typescript
const stats = logger.getStats()
console.log({
  totalLogs: stats.totalLogs,
  logsByLevel: stats.logsByLevel,
  errorCount: stats.errorCount,
  bufferUsage: stats.bufferSize,
  uptime: stats.uptime
})
```

## Error Handling

The logger includes comprehensive error handling:

```typescript
// Logger continues operating even if an output fails
logger.on('output:error', (error) => {
  console.error('Output failed:', error)
})

// Fallback to console if all outputs fail
logger.on('fallback:console', () => {
  console.warn('All outputs failed, falling back to console')
})
```

## Best Practices

1. **Use structured metadata**: Include relevant context in metadata
   ```typescript
   logger.info("User action", {
     userId: user.id,
     action: 'login',
     ip: request.ip,
     userAgent: request.headers['user-agent']
   })
   ```

2. **Set appropriate log levels**: Use debug for development, info or warn for production
   ```typescript
   const logger = new LoggerPlugin({
     level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
   })
   ```

3. **Use log streams for real-time monitoring**: Subscribe to specific log types
   ```typescript
   const criticalErrors = logger.subscribeToLogs({
     level: 'error',
     metadata: { severity: 'critical' }
   })
   ```

4. **Implement log rotation**: Prevent disk space issues
   ```typescript
   fileOptions: {
     maxSize: '100MB',
     maxFiles: 7, // Keep 1 week of logs
     rotation: true
   }
   ```

5. **Flush logs on shutdown**: Ensure all logs are written
   ```typescript
   process.on('SIGTERM', async () => {
     await logger.flush()
     process.exit(0)
   })
   ```

## Advanced Usage

### Multi-tenant Logging

```typescript
// Create logger with tenant context
const tenantLogger = {
  info: (msg: string, meta?: LogMetadata) => 
    logger.info(msg, { ...meta, tenantId: currentTenant.id }),
  error: (msg: string, meta?: LogMetadata) => 
    logger.error(msg, { ...meta, tenantId: currentTenant.id })
}
```

### Correlation IDs

```typescript
// Add correlation ID to all logs in a request
const requestLogger = {
  info: (msg: string, meta?: LogMetadata) => 
    logger.info(msg, { ...meta, correlationId: request.id })
}
```

### Log Sampling

```typescript
// Sample verbose logs in production
if (process.env.NODE_ENV === 'production' && Math.random() > 0.1) {
  return // Skip 90% of debug logs
}
logger.debug("Verbose debug information")
```

## Environment Variables

- `LOG_LEVEL`: Override configured log level
- `LOG_OUTPUT`: Force specific output (console|file|none)
- `LOG_FORMAT`: Override output format (pretty|json|compact)
- `LOG_FILE`: Override log file path
- `LOG_MAX_SIZE`: Override max file size
- `LOG_BUFFER_SIZE`: Override buffer size

## Migration from Console Logging

Replace console methods with logger API:

```typescript
// Before
console.log('Server started')
console.error('Connection failed:', error)

// After
logger.info('Server started')
logger.error('Connection failed', { error })
```

## Troubleshooting

### Logger not initialized

```typescript
// Ensure plugin is registered before use
await app.init()
const logger = app.getPlugin('logger')
```

### Missing logs

```typescript
// Check log level
logger.getConfig().level // Current level

// Ensure outputs are working
const stats = logger.getStats()
console.log(stats.outputsActive)
```

### Performance issues

```typescript
// Reduce buffer size for lower memory usage
new LoggerPlugin({ bufferSize: 100 })

// Use batching for high-volume logging
new LoggerPlugin({
  streamOptions: { batchSize: 1000 }
})
```

For more examples and advanced patterns, see the [examples directory](../examples/) and [plugin tests](../packages/plugins/src/core/__tests__/).