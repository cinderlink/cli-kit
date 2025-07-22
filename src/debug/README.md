# Debug Module

Interactive debugging tools for tuix applications.

## Overview

The debug module provides an interactive debugging interface that wraps around CLI applications when `TUIX_DEBUG=true` is set. It intercepts console output, tracks performance metrics, and provides a tabbed interface for exploring application internals.

## Features

- **Automatic Activation**: Enabled via `TUIX_DEBUG=true` environment variable
- **Output Interception**: Captures console.log, console.error, stdout, and stderr
- **Tabbed Interface**: Switch between different debug views with number keys
- **Performance Tracking**: Monitors component render times and operations
- **Event Logging**: Tracks all debug events with filtering capabilities
- **State Inspection**: View application state and scope registrations

## Usage

### Basic Usage

```bash
# Enable debug mode for any tuix CLI app
TUIX_DEBUG=true bun run your-app.tsx

# Debug with specific command
TUIX_DEBUG=true bun run your-cli.tsx dev start
```

### Keyboard Controls

- `1-4`: Switch between tabs (App, Logs, Output, Scopes)
- `R`: Run the command
- `C`: Clear logs/output
- `Q`: Quit the application

### Programmatic Usage

```typescript
import { debug, debugStore } from '@debug'

// Log debug events
debug.system('Application started')
debug.render('Component rendered', { componentName: 'MyComponent' })
debug.performance('Operation completed', 123.45)
debug.error('Something went wrong', new Error('Failed'))

// Access debug state
const state = debugStore.getState()
console.log(state.events)

// Subscribe to changes
const unsubscribe = debugStore.subscribe(() => {
  console.log('Debug state updated')
})
```

## Architecture

### Structure
```
debug/
├── core/          # Core debug store and enabler
├── cli/           # CLI integration and runner
├── jsx/           # JSX components for debug UI
├── logger/        # Logger transport integration
├── constants.ts   # Debug constants
├── types.ts       # TypeScript definitions
└── index.ts       # Public API
```

### Components

- **DebugStore**: Central state management for debug events
- **SimpleDebugWrapper**: UI component that displays debug interface
- **Debug Categories**: scope, jsx, render, lifecycle, match, performance, error, system, logger

## API

### Functions

#### `debug.system(message: string)`
Log a system-level debug event.

#### `debug.render(message: string, context?: { componentName?: string })`
Log a render event with optional component context.

#### `debug.performance(message: string, duration: number)`
Log a performance metric with duration in milliseconds.

#### `debug.error(message: string, error?: Error)`
Log an error with optional Error object.

### DebugStore Methods

#### `debugStore.getState(): DebugState`
Get the current debug state.

#### `debugStore.subscribe(listener: () => void): () => void`
Subscribe to state changes. Returns unsubscribe function.

#### `debugStore.clear()`
Clear all debug events.

#### `debugStore.setPaused(paused: boolean)`
Pause or resume event logging.

#### `debugStore.setFilter(filter: string)`
Set event filter string.

## Integration

The debug module automatically integrates with:
- CLI module: Wraps CLI apps in debug interface
- Logger module: Can capture logger output
- JSX runtime: Tracks component lifecycle

## Performance

- Events are capped at 10,000 by default
- Old events are automatically pruned
- Minimal overhead when disabled
- No production impact (can be tree-shaken)