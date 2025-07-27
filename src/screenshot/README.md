# Screenshot Module

The Screenshot module provides functionality for capturing terminal application state and output. This module enables automated testing, documentation generation, and debugging by creating visual snapshots of terminal interfaces.

## Architecture

The Screenshot module follows the Tuix framework patterns with Effect-based async operations and composable interfaces:

### Core Components

1. **Screenshot Capture**
   - Terminal output capture with ANSI code preservation
   - PTY-based command execution with visual recording
   - Metadata collection including dimensions and timing

2. **Storage Management** 
   - File-based screenshot persistence
   - Structured metadata for searchability
   - Size and compression optimization

3. **Data Types**
   - `ScreenshotInfo` - File metadata and indexing
   - `ScreenshotData` - Visual content and raw ANSI codes
   - `ScreenshotResult` - Complete capture result with path

## API Reference

### Core Functions

#### `Screenshot.take(command: string, options?: any): Effect<ScreenshotResult>`

Captures a screenshot of command execution.

```typescript
import { Screenshot } from '@tuix/screenshot'

const result = await Effect.runPromise(
  Screenshot.take('ls -la', { timeout: 5000 })
)
```

#### `Screenshot.capturePty(cmd: string, args: string[], options?: any): Effect<ScreenshotData>`

Captures command execution in a pseudo-terminal for full ANSI support.

```typescript
const screenshot = await Effect.runPromise(
  Screenshot.capturePty('npm', ['run', 'build'], {
    env: { NODE_ENV: 'production' },
    timeout: 30000
  })
)
```

#### `Screenshot.list(): Effect<ScreenshotInfo[]>`

Lists all stored screenshots with metadata.

```typescript
const screenshots = await Effect.runPromise(Screenshot.list())
console.log(`Found ${screenshots.length} screenshots`)
```

#### `Screenshot.save(screenshot: ScreenshotData): Effect<string>`

Saves screenshot data to storage and returns the file path.

```typescript
const path = await Effect.runPromise(
  Screenshot.save(screenshotData)
)
```

#### `Screenshot.load(name: string): Effect<ScreenshotData>`

Loads a previously saved screenshot by name.

```typescript
const screenshot = await Effect.runPromise(
  Screenshot.load('build-output-2024-01-15')
)
```

#### `Screenshot.delete(name: string): Effect<void>`

Removes a screenshot from storage.

```typescript
await Effect.runPromise(
  Screenshot.delete('old-screenshot')
)
```

### Utility Functions

#### `formatScreenshot(screenshot: ScreenshotData, options?: any): string`

Formats screenshot data for display or export.

```typescript
const formatted = formatScreenshot(screenshot, {
  stripAnsi: true,
  maxWidth: 120
})
```

## Data Structures

### ScreenshotInfo

```typescript
interface ScreenshotInfo {
  name: string          // Unique identifier
  filename: string      // Storage filename
  timestamp: number     // Creation timestamp
  description?: string  // Optional description
  app?: string         // Application name
  size: number         // File size in bytes
}
```

### ScreenshotData

```typescript
interface ScreenshotData {
  metadata: {
    dimensions: {
      width: number    // Terminal width in columns
      height: number   // Terminal height in rows
    }
  }
  visual: {
    lines: string[]    // Processed visual lines
  }
  raw?: {
    ansiCodes?: string // Raw ANSI escape sequences
  }
}
```

### ScreenshotResult

```typescript
interface ScreenshotResult {
  screenshot: ScreenshotData
  path: string         // Saved file path
}
```

## Usage Examples

### Basic Command Screenshot

```typescript
import { Screenshot } from '@tuix/screenshot'
import { Effect, Console } from 'effect'

const captureCommand = Effect.gen(function* (_) {
  // Capture a simple command
  const result = yield* _(Screenshot.take('echo "Hello World"'))
  
  // Display the captured output
  yield* _(Console.log(formatScreenshot(result.screenshot)))
  
  return result.path
})

// Run the effect
Effect.runPromise(captureCommand)
```

### Interactive Application Testing

```typescript
import { Screenshot } from '@tuix/screenshot'
import { Effect, Array } from 'effect'

const testCLIApp = Effect.gen(function* (_) {
  // Capture CLI app in interactive mode
  const screenshot = yield* _(
    Screenshot.capturePty('node', ['my-cli-app.js'], {
      input: 'help\nexit\n',  // Simulate user input
      timeout: 10000
    })
  )
  
  // Save with descriptive name
  const path = yield* _(Screenshot.save(screenshot))
  
  // Verify expected content
  const hasHelpText = screenshot.visual.lines.some(line => 
    line.includes('Available commands:')
  )
  
  return { path, hasHelpText }
})
```

### Screenshot Management

```typescript
import { Screenshot } from '@tuix/screenshot'
import { Effect, Array } from 'effect'

const manageScreenshots = Effect.gen(function* (_) {
  // List all screenshots
  const screenshots = yield* _(Screenshot.list())
  
  // Find old screenshots (older than 30 days)
  const oldScreenshots = screenshots.filter(
    s => Date.now() - s.timestamp > 30 * 24 * 60 * 60 * 1000
  )
  
  // Delete old screenshots
  yield* _(
    Effect.all(
      oldScreenshots.map(s => Screenshot.delete(s.name)),
      { concurrency: 'unbounded' }
    )
  )
  
  return `Cleaned up ${oldScreenshots.length} old screenshots`
})
```

## Integration with Testing

The Screenshot module integrates with the testing framework for visual regression testing:

```typescript
import { test, expect } from 'bun:test'
import { Screenshot } from '@tuix/screenshot'
import { Effect } from 'effect'

test('CLI help output matches expected format', async () => {
  const result = await Effect.runPromise(
    Screenshot.take('myapp --help')
  )
  
  const lines = result.screenshot.visual.lines
  
  // Verify help structure
  expect(lines.some(line => line.includes('Usage:'))).toBe(true)
  expect(lines.some(line => line.includes('Options:'))).toBe(true)
  expect(lines.some(line => line.includes('Commands:'))).toBe(true)
})
```

## Configuration Options

### Capture Options

```typescript
interface CaptureOptions {
  timeout?: number      // Maximum execution time (ms)
  input?: string       // Simulated user input
  env?: Record<string, string>  // Environment variables
  cwd?: string         // Working directory
  dimensions?: {       // Terminal size
    width: number
    height: number
  }
}
```

### Format Options

```typescript
interface FormatOptions {
  stripAnsi?: boolean   // Remove ANSI escape codes
  maxWidth?: number     // Maximum line width
  lineNumbers?: boolean // Add line numbers
  highlightPattern?: RegExp  // Highlight matching lines
}
```

## Implementation Status

> **Note**: This module is currently in stub/placeholder state. The API is defined but implementation returns mock data.

### Current Implementation
- ✅ Type definitions and interfaces
- ✅ Basic API structure with Effect return types
- ❌ Actual PTY capture functionality
- ❌ File storage and persistence
- ❌ ANSI code processing
- ❌ Command execution integration

### Next Steps
1. Implement PTY-based command execution
2. Add file system storage backend
3. Create ANSI code processing utilities
4. Integrate with Bun's process APIs
5. Add compression and optimization

## Best Practices

1. **Resource Management**: Always clean up PTY processes and temporary files
2. **Security**: Validate commands and sanitize inputs before execution
3. **Performance**: Use streaming for large outputs to avoid memory issues
4. **Storage**: Implement retention policies to prevent disk space exhaustion
5. **Testing**: Use screenshots for visual regression testing in CI/CD

## Contributing

When contributing to the Screenshot module:

1. Follow Effect-based async patterns
2. Maintain type safety with proper interfaces
3. Add comprehensive tests for capture scenarios
4. Document any new configuration options
5. Consider cross-platform compatibility (especially PTY handling)

## Related Modules

- **testing**: Visual testing utilities
- **core/services**: Terminal and process services
- **process-manager**: Command execution infrastructure
- **debug**: Development and debugging tools