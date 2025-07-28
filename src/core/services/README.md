# Services Module

## Overview

The Services module provides the foundational service layer for the Tuix framework, managing core terminal interactions, input handling, rendering, and storage. It implements a dependency injection pattern using Effect's Context system for clean, testable, and modular service architecture.

## Purpose

This module serves as the abstraction layer between the framework and system-level operations:
- **Terminal Service**: Raw terminal I/O operations and capabilities
- **Input Service**: Keyboard and mouse input handling with event streams
- **Renderer Service**: Efficient terminal rendering with diffing and optimization
- **Storage Service**: Persistent storage with transactions and caching
- **Service Module**: Orchestrates service lifecycle and dependency injection

## Core Services

### Terminal Service

Provides low-level terminal operations and capability detection.

```typescript
import { Terminal } from '@core/services'

const terminal = yield* Terminal
yield* terminal.write('Hello, Terminal!')
yield* terminal.clear()
yield* terminal.moveCursor(10, 5)
const size = yield* terminal.getSize()
```

Key features:
- ANSI escape sequence handling
- Terminal capability detection
- Cursor control and positioning
- Screen clearing and scrolling
- Terminal resize event handling

### Input Service

Handles keyboard and mouse input with reactive streams.

```typescript
import { Input } from '@core/services'

const input = yield* Input
const keyStream = yield* input.streamKeys()
const mouseStream = yield* input.streamMouse()

// React to specific keys
yield* keyStream.pipe(
  Stream.filter(key => key.type === 'special' && key.value === 'enter'),
  Stream.runForEach(key => handleEnter())
)
```

Key features:
- Keyboard input parsing (characters, special keys, modifiers)
- Mouse event handling (click, move, wheel)
- Input mode management (raw, cooked)
- Focus management integration
- Event stream transformations

### Renderer Service

Efficient rendering engine with intelligent diffing.

```typescript
import { Renderer } from '@core/services'

const renderer = yield* Renderer
yield* renderer.render(view)
yield* renderer.update(patch)
yield* renderer.flush()
```

Key features:
- Virtual DOM-style diffing algorithm
- Batch rendering optimizations
- Double buffering for flicker-free updates
- Dirty region tracking
- Render performance metrics

### Storage Service

Persistent storage with multiple backends and caching.

```typescript
import { Storage } from '@core/services'

const storage = yield* Storage

// Key-value storage
yield* storage.set('user.theme', 'dark')
const theme = yield* storage.get('user.theme')

// Transactional updates
yield* storage.transaction(tx => 
  Effect.gen(function* (_) {
    yield* _(tx.set('user.name', 'Alice'))
    yield* _(tx.set('user.email', 'alice@example.com'))
  })
)
```

Key features:
- Multiple storage backends (file, memory, SQLite)
- Atomic transactions
- LRU caching layer
- Schema validation
- Migration support

## Service Module Architecture

The ServiceModule acts as the central coordinator:

```typescript
import { ServiceModule } from '@core/services'

const serviceModule = new ServiceModule(eventBus)
yield* serviceModule.initialize()

// Start services
yield* serviceModule.startService('main-terminal', 'terminal')
yield* serviceModule.startService('user-input', 'input')

// Get service status
const health = yield* serviceModule.getHealth()
```

### Service Lifecycle

1. **Registration**: Services are registered with the module
2. **Initialization**: Services are initialized in dependency order
3. **Start**: Services are started and become available
4. **Running**: Services handle requests and emit events
5. **Stop**: Services are gracefully shut down
6. **Cleanup**: Resources are released

### Dependency Injection

Services use Effect's Context pattern:

```typescript
// Define service interface
interface MyService {
  doSomething: () => Effect.Effect<void>
}

// Create service tag
const MyService = Context.GenericTag<MyService>('MyService')

// Implement service
const MyServiceLive = Layer.succeed(MyService, {
  doSomething: () => Effect.succeed(console.log('Done!'))
})

// Use in application
const program = Effect.gen(function* (_) {
  const service = yield* _(MyService)
  yield* _(service.doSomething())
})
```

## Input Service Extensions

### Mouse Hit Testing

Determines which component is under the mouse cursor.

```typescript
import { HitTestService } from '@core/services'

const hitTest = yield* HitTestService
const component = yield* hitTest.test({ x: 10, y: 5 })
```

### Mouse Router

Routes mouse events to the appropriate components.

```typescript
import { MouseRouter } from '@core/services'

const router = yield* MouseRouter
yield* router.register(componentId, bounds, handlers)
yield* router.route(mouseEvent)
```

### Focus Manager

Manages keyboard focus and tab navigation.

```typescript
import { FocusManager } from '@core/services'

const focus = yield* FocusManager
yield* focus.register(componentId, { tabIndex: 1 })
yield* focus.focusNext()
yield* focus.focusPrevious()
```

## Best Practices

1. **Service Boundaries**: Keep services focused on single responsibilities
2. **Error Handling**: Use Effect's error types for recoverable errors
3. **Resource Management**: Always use Effect's resource management for cleanup
4. **Event Communication**: Use EventBus for cross-service communication
5. **Testing**: Mock services using Layer.succeed for unit tests

## Integration Points

- **MVU Runtime**: Services are injected into the runtime context
- **Components**: Components access services through hooks
- **Event System**: Services emit and respond to domain events
- **Coordination Module**: Service lifecycle is managed by coordination

## Performance Considerations

1. **Rendering**: Batch updates and use dirty region tracking
2. **Input**: Debounce high-frequency events like mouse moves
3. **Storage**: Use caching layer for frequently accessed data
4. **Terminal**: Minimize escape sequences and use efficient updates

## Testing

Services can be easily mocked for testing:

```typescript
const TestTerminal = Layer.succeed(Terminal, {
  write: (text) => Effect.succeed(mockWrite(text)),
  clear: () => Effect.succeed(mockClear()),
  // ... other methods
})

const testProgram = program.pipe(
  Effect.provide(TestTerminal)
)