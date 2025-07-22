# Logger

## Overview

The Logger module provides a powerful, flexible logging system for Tuix applications. It features structured logging, multiple output formats, transport layers, log levels, context tracking, and both synchronous and asynchronous logging capabilities. Built with Effect-TS for composability and reliability.

## Installation

```bash
# Logger is included with tuix
import { createLogger, log, Logger } from 'tuix/logger'
```

## Quick Start

```typescript
import { createConsoleLogger, log } from 'tuix/logger'
import { Effect } from 'effect'

// Create a simple console logger
const logger = createConsoleLogger('debug', {
  colorize: true,
  showEmoji: true,
  prettyPrint: true
})

// Use the logger
logger.info('Application starting')
logger.warn('This is a warning', { userId: '123' })
logger.error('An error occurred', new Error('Something went wrong'))

// Use with Effect
const program = Effect.gen(function* (_) {
  yield* log.info('Processing data')
  yield* log.debug('Debug information', { step: 1 })
  return 'Complete'
})
```

## Core Concepts

### Log Levels
Supports standard log levels with filtering:
- `trace`: Detailed debugging information
- `debug`: General debugging information  
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error conditions
- `fatal`: Critical errors that may abort the application

### Transports
Pluggable output destinations for log messages:
- **ConsoleTransport**: Outputs to stdout/stderr with colors
- **FileTransport**: Writes to files with rotation support
- **StreamTransport**: Writes to any writable stream
- **HttpTransport**: Sends logs to remote HTTP endpoints

### Formatters
Customizable log message formatting:
- **PrettyFormatter**: Human-readable format with colors and emojis
- **JSONFormatter**: Structured JSON format for parsing
- **CompactFormatter**: Minimal space-efficient format
- **CLIFormatter**: Optimized for CLI applications

### Context
Hierarchical context for request/session tracking:

```typescript
const logger = createLogger({
  context: ['api', 'user-service']
})

logger.info('User logged in', { userId: '123' })
// Output: [api:user-service] User logged in {userId: "123"}
```

### Structured Logging
Supports structured data alongside messages:

```typescript
logger.info('Request processed', {
  method: 'GET',
  url: '/api/users',
  duration: 45,
  status: 200
})
```

## API Reference

### Logger Creation

#### `createConsoleLogger(level?, options?): Logger`
Creates a logger that outputs to console.

#### `createProductionLogger(name, options?): Layer<Logger>`
Creates a production-ready logger with file rotation and error separation.

#### `createDevelopmentLogger(name?, level?): Layer<Logger>`
Creates a development logger with pretty printing and verbose output.

#### `createCLILogger(level?, options?): Layer<Logger>`
Creates a logger optimized for CLI applications.

#### `createRemoteLogger(url, options?): Layer<Logger>`
Creates a logger that sends logs to a remote HTTP endpoint.

### Core Logger Interface

#### `Logger.trace(message, metadata?): void`
#### `Logger.debug(message, metadata?): void`
#### `Logger.info(message, metadata?): void`
#### `Logger.warn(message, metadata?): void`
#### `Logger.error(message, error?, metadata?): void`
#### `Logger.fatal(message, error?, metadata?): void`

Logs messages at the specified level.

#### `Logger.child(context): Logger`
Creates a child logger with additional context.

#### `Logger.withContext(context, fn): any`
Executes a function with additional logging context.

### Effect-Based Logging

#### `log.trace(message, metadata?): Effect<void>`
#### `log.debug(message, metadata?): Effect<void>`
#### `log.info(message, metadata?): Effect<void>`
#### `log.warn(message, metadata?): Effect<void>`
#### `log.error(message, error?, metadata?): Effect<void>`
#### `log.fatal(message, error?, metadata?): Effect<void>`

Effect-based logging functions for composable programs.

### Utilities

#### `LoggerUtils.parseLevel(level: string): LogLevel`
Parses log level from string.

#### `LoggerUtils.getLevelFromEnv(envVar?, defaultLevel?): LogLevel`
Gets log level from environment variable.

#### `LoggerUtils.fromEnv(name?): Layer<Logger>`
Creates logger from environment configuration.

## Examples

### Development Logger Setup
```typescript
import { createDevelopmentLogger } from 'tuix/logger'
import { Effect } from 'effect'

const DevLoggerLayer = createDevelopmentLogger('myapp', 'debug')

const program = Effect.gen(function* (_) {
  yield* log.info('Starting application')
  yield* log.debug('Configuration loaded', { config: 'dev' })
  yield* log.warn('Using development database')
  return 'App started'
})

Effect.runPromise(program.pipe(
  Effect.provide(DevLoggerLayer)
))
```

### Production Logger with File Rotation
```typescript
import { createProductionLogger } from 'tuix/logger'

const ProdLoggerLayer = createProductionLogger('myapp', {
  level: 'info',
  logDir: '/var/log/myapp',
  maxFileSize: '50mb',
  maxFiles: 30,
  console: false // Only log to files in production
})

const app = Effect.gen(function* (_) {
  yield* log.info('Application started in production mode')
  
  try {
    yield* businessLogic()
  } catch (error) {
    yield* log.error('Business logic failed', error, {
      operation: 'processData',
      timestamp: Date.now()
    })
    throw error
  }
}).pipe(Effect.provide(ProdLoggerLayer))
```

### CLI Logger with Verbose/Quiet Modes
```typescript
import { createCLILogger } from 'tuix/logger'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    verbose: { type: 'boolean', short: 'v' },
    quiet: { type: 'boolean', short: 'q' },
    'log-file': { type: 'string' }
  }
})

const CLILoggerLayer = createCLILogger('info', {
  verbose: values.verbose,
  quiet: values.quiet,
  logFile: values['log-file']
})

const cliProgram = Effect.gen(function* (_) {
  yield* log.info('Starting CLI operation')
  yield* log.debug('Verbose logging enabled') // Only shown with --verbose
  
  // Simulate work
  for (let i = 0; i < 10; i++) {
    yield* log.debug(`Processing item ${i + 1}/10`)
  }
  
  yield* log.info('CLI operation completed')
}).pipe(Effect.provide(CLILoggerLayer))
```

### Structured Logging for APIs
```typescript
import { createProductionLogger, log } from 'tuix/logger'

const ApiLoggerLayer = createProductionLogger('api')

const handleRequest = (request: Request) =>
  Effect.gen(function* (_) {
    const startTime = Date.now()
    
    yield* log.info('Request started', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent')
    })
    
    try {
      const response = yield* processRequest(request)
      const duration = Date.now() - startTime
      
      yield* log.info('Request completed', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration
      })
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      yield* log.error('Request failed', error, {
        method: request.method,
        url: request.url,
        duration
      })
      
      throw error
    }
  })
```

### Remote Logging
```typescript
import { createRemoteLogger } from 'tuix/logger'

// Send logs to remote monitoring service
const RemoteLoggerLayer = createRemoteLogger(
  'https://logs.myservice.com/api/logs',
  {
    level: 'info',
    headers: {
      'Authorization': `Bearer ${process.env.LOG_TOKEN}`,
      'X-App-Name': 'myapp'
    },
    batch: true,
    batchSize: 50,
    batchInterval: 10000,
    localFallback: true
  }
)
```

### Environment-Based Logger
```typescript
import { LoggerUtils } from 'tuix/logger'

// Automatically configure based on environment
// LOG_LEVEL=debug LOG_FORMAT=json LOG_OUTPUT=file
const EnvLoggerLayer = LoggerUtils.fromEnv('myapp')

const app = myAppLogic.pipe(
  Effect.provide(EnvLoggerLayer)
)
```

## Integration

The Logger module integrates with all Tuix modules:

- **CLI**: Automatic logging for CLI operations and command execution
- **Config**: Logger configuration from config files and environment
- **Process Manager**: Process lifecycle logging and monitoring
- **Core**: Runtime logging for view updates and lifecycle events
- **Plugins**: Plugin-specific logging contexts
- **JSX**: Component lifecycle and rendering logging

### Configuration Integration

```typescript
// tuix.config.ts
export default defineConfig({
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true,
    logFile: './logs/app.log',
    transports: [
      {
        type: 'console',
        level: 'info',
        colorize: true
      },
      {
        type: 'file',
        filename: './logs/app.log',
        level: 'debug',
        maxSize: '10mb',
        maxFiles: 5
      }
    ]
  }
})
```

### Components

The logger provides React-like components for log visualization:

```typescript
import { LogExplorer, LiveLogDashboard } from 'tuix/logger'

// Interactive log explorer
const explorer = <LogExplorer logFile="./logs/app.log" />

// Live log dashboard  
const dashboard = <LiveLogDashboard processes={['app', 'worker']} />
```

## Testing

```bash
# Run logger tests
bun test src/logger

# Test specific logger features
bun test src/logger/formatters.test.ts
bun test src/logger/transports.test.ts
bun test src/logger/core.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT