# Core Debug Module

This module provides a centralized debug logging system for the Tuix framework, enabling structured collection and display of debug information.

## Overview

The debug module offers:
- **Category-based logging**: Organize debug output by functional areas
- **Structured entries**: Timestamp, level, and data for each log entry
- **Runtime control**: Enable/disable debugging via environment variables
- **Color coding**: Visual differentiation of debug categories
- **Performance-conscious**: Minimal overhead when debugging is disabled

## Usage

### Basic Debug Logger

```typescript
import { createDebugLogger } from "@core/debug"

const debug = createDebugLogger('my-module', { 
  color: '36' // cyan 
})

debug.info('Starting operation')
debug.debug('Processing item', { id: 123 })
debug.error('Operation failed', { error: 'Invalid input' })
```

### Pre-configured Loggers

```typescript
import { scopeDebug, jsxDebug, cliDebug, renderDebug } from "@core/debug"

scopeDebug.debug('Scope created', { id: 'root' })
jsxDebug.trace('Component rendered')
cliDebug.info('Command executed', { command: 'help' })
renderDebug.warn('Slow render detected', { duration: 150 })
```

### Debug Management

```typescript
import { getDebugEntries, clearDebugEntries, setDebugEnabled } from "@core/debug"

// Get all entries for a category
const scopeLogs = getDebugEntries('scope')

// Get all entries across all categories
const allLogs = getDebugEntries()

// Clear entries
clearDebugEntries('scope') // Clear specific category
clearDebugEntries() // Clear all

// Runtime control
setDebugEnabled('my-module', true)
```

## Environment Variables

- `TUIX_DEBUG=true` - Enable debug logging globally
- `TUIX_DEBUG_VERBOSE=true` - Also output to console in real-time

## Architecture

The debug system uses:
- In-memory storage for debug entries
- Category-based organization
- Minimal dependencies (only Effect)
- Zero overhead when disabled

## Module Boundaries

This module is part of the core framework and can be imported by any other module that needs debug logging capabilities. It has no dependencies except Effect.

## Best Practices

1. Create category-specific loggers at module initialization
2. Use appropriate log levels (trace, debug, info, warn, error)
3. Include structured data for complex debugging scenarios
4. Clear debug entries periodically to avoid memory issues
5. Use color coding to improve visual scanning of debug output