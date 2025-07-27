# Core

## Overview

The core module provides a Model-View-Update (MVU) architecture powered by Effect.ts for building type-safe, functional terminal applications. It combines the predictability of MVU with the composability and error handling capabilities of Effect.ts.

## Architecture

### Model-View-Update (MVU) Pattern

The MVU pattern separates your application into three distinct parts:

1. **Model**: The immutable state of your application
2. **View**: A pure function that renders the model to the terminal
3. **Update**: A pure function that transforms the model based on messages

Enhanced with Effect.ts:
- **Commands**: Asynchronous operations that produce messages
- **Subscriptions**: Continuous streams of external events
- **Effects**: Type-safe error handling and dependency injection

## Installation

```bash
# Core is included with tuix
import { Component, runApp, Effect, View } from '@tuix/core'
```

## Quick Start

```typescript
import { Component, runApp, Effect, View } from '@tuix/core'

// Define your model and messages
type Model = { count: number }
type Msg = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }

// Create an MVU component
const counter: Component<Model, Msg> = {
  // Initialize the model
  init: Effect.succeed([{ count: 0 }, []]),
  
  // Update the model based on messages
  update: (msg, model) => {
    switch (msg.type) {
      case 'increment':
        return Effect.succeed([{ count: model.count + 1 }, []])
      case 'decrement':
        return Effect.succeed([{ count: model.count - 1 }, []])
      case 'reset':
        return Effect.succeed([{ count: 0 }, []])
    }
  },
  
  // Render the model to a view
  view: (model) => View.vstack(
    View.text(`Count: ${model.count}`),
    View.text('Press +/- to change, r to reset')
  )
}

// Run the application
await Effect.runPromise(runApp(counter))
```

## Core Concepts

### Component Type
```typescript
interface Component<Model, Msg, Deps = never> {
  init: Effect<[Model, Cmd<Msg>], ComponentError, Deps>
  update: (msg: Msg, model: Model) => Effect<[Model, Cmd<Msg>], ComponentError, Deps>
  view: (model: Model) => View<Msg>
  subscriptions?: (model: Model) => Sub<Msg>
}
```

### Commands and Effects
Commands represent asynchronous operations that produce messages:

```typescript
import { Cmd } from '@tuix/core'

// Create a command that fetches data
const fetchData = Cmd.perform(
  Effect.tryPromise({
    try: () => fetch('/api/data').then(r => r.json()),
    catch: (error) => new Error(`Fetch failed: ${error}`)
  }),
  (data) => ({ type: 'dataLoaded', data } as const),
  (error) => ({ type: 'dataError', error } as const)
)
```

### Subscriptions
Subscriptions provide continuous streams of messages:

```typescript
import { Sub, KeyUtils } from '@tuix/core'

// Subscribe to keyboard events
const keySub = Sub.fromKeys((key) => {
  if (KeyUtils.isChar(key, '+')) return { type: 'increment' }
  if (KeyUtils.isChar(key, '-')) return { type: 'decrement' }
  if (KeyUtils.isChar(key, 'r')) return { type: 'reset' }
  return null
})
```

## API Reference

### View Primitives

The View module provides functional primitives for building terminal UIs:

```typescript
import { View } from '@tuix/core'

// Text views
View.text('Hello, World!')

// Layout
View.vstack(view1, view2, view3)  // Vertical stack
View.hstack(view1, view2, view3)  // Horizontal stack
View.box(content)                 // Box with borders
View.center(content, width)       // Center within width

// Styling
View.bold(content)
View.italic(content)
View.blue(content)
View.green(content)
View.red(content)
```

### Runtime

The runtime manages the MVU lifecycle:

```typescript
import { runApp, Runtime } from '@tuix/core'

// Simple usage
await Effect.runPromise(runApp(component))

// With configuration
const runtime = new Runtime(component, {
  fps: 60,
  enableMouse: true,
  fullscreen: true
})

await Effect.runPromise(
  Effect.provide(runtime.run(), services)
)
```

### Error Handling

Comprehensive error types with recovery strategies:

```typescript
import { ComponentError, withErrorBoundary, RecoveryStrategies } from '@tuix/core'

// Wrap components with error boundaries
const safeComponent = withErrorBoundary(
  component,
  RecoveryStrategies.retry(3)
)

// Handle errors in update function
update: (msg, model) => {
  return Effect.tryPromise({
    try: async () => {
      // risky operation
      return [newModel, []]
    },
    catch: (error) => new ComponentError('Update failed', { cause: error })
  })
}
```

### Event Bus

Inter-module communication without tight coupling:

```typescript
import { EventBus, getGlobalEventBus } from '@tuix/core'

// Publish events
const eventBus = yield* getGlobalEventBus
yield* eventBus.publish({
  type: 'user.login',
  payload: { userId: '123' }
})

// Subscribe to events
yield* eventBus.subscribe('user.*', (event) => {
  console.log('User event:', event)
})
```

## Examples

### Timer Component
```typescript
const timer: Component<{ time: Date }, { type: 'tick' }> = {
  init: Effect.succeed([{ time: new Date() }, []]),
  
  update: (msg, model) => {
    switch (msg.type) {
      case 'tick':
        return Effect.succeed([{ time: new Date() }, []])
    }
  },
  
  view: (model) => View.text(model.time.toLocaleTimeString()),
  
  subscriptions: () => Sub.interval(1000, { type: 'tick' })
}
```

### HTTP Request Component
```typescript
type Model = {
  loading: boolean
  data: string | null
  error: string | null
}

type Msg = 
  | { type: 'fetch' }
  | { type: 'success'; data: string }
  | { type: 'error'; error: string }

const fetcher: Component<Model, Msg> = {
  init: Effect.succeed([
    { loading: false, data: null, error: null },
    []
  ]),
  
  update: (msg, model) => {
    switch (msg.type) {
      case 'fetch':
        return Effect.succeed([
          { ...model, loading: true },
          [fetchData]  // Command defined earlier
        ])
      case 'success':
        return Effect.succeed([
          { loading: false, data: msg.data, error: null },
          []
        ])
      case 'error':
        return Effect.succeed([
          { loading: false, data: null, error: msg.error },
          []
        ])
    }
  },
  
  view: (model) => {
    if (model.loading) return View.text('Loading...')
    if (model.error) return View.red(View.text(`Error: ${model.error}`))
    if (model.data) return View.text(model.data)
    return View.text('Press f to fetch')
  }
}
```

## Integration

The core module integrates with all other Tuix modules:

- **CLI**: MVU components can be used as CLI command handlers
- **JSX**: JSX elements compile to View primitives
- **UI**: Pre-built components follow the MVU pattern
- **Services**: Terminal, input, and storage services integrate via Effect.ts
- **Styling**: View primitives support ANSI styling

## Testing

```bash
# Run core tests
bun test src/core

# Run specific test
bun test src/core/runtime/mvu/runtime.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT