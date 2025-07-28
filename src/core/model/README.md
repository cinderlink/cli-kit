# Core Model Module

This module provides the foundational modeling constructs for the Tuix framework, including event systems, scoping mechanisms, state management, and context handling.

## Overview

The model module consists of:
- **Events**: Domain event bus and event channels for communication
- **Scope**: Hierarchical scoping system for component isolation
- **State**: State management primitives and patterns
- **Context**: Contextual data propagation (specific context implementations)

## Event System

### Event Bus

```typescript
import { EventBus } from "@core/model/events"

// Create and use event bus
const bus = new EventBus()

// Publish events
yield* bus.publish({
  type: 'user.logged.in',
  payload: { userId: '123' }
})

// Subscribe to events
yield* bus.subscribe('user.*', (event) => 
  Effect.log(`User event: ${event.type}`)
)
```

### Event Channels

```typescript
import { createChannel } from "@core/model/events"

// Type-safe event channels
const userChannel = createChannel<UserEvents>('user')

yield* userChannel.send({ type: 'login', email: 'user@example.com' })
yield* userChannel.take() // Wait for next event
```

## Scope System

### Scope Management

```typescript
import { ScopeManager } from "@core/model/scope"

// Create hierarchical scopes
const rootScope = yield* scopeManager.create('root')
const childScope = yield* scopeManager.create('child', { parent: 'root' })

// Scope-isolated operations
yield* scopeManager.runInScope('child', Effect.log('Scoped operation'))
```

### JSX Integration

```typescript
import { Scope, useScope } from "@core/model/scope/jsx"

// Provide scope context
<Scope id="feature">
  <MyComponent />
</Scope>

// Use scope in components
function MyComponent() {
  const scope = useScope()
  // Access scoped resources
}
```

## State Management

The state subsystem provides:
- Immutable state containers
- State transitions with Effect
- Time-travel debugging capabilities
- State persistence options

## Architecture

The model module:
- Uses Effect for all async operations and state management
- Provides foundational patterns used throughout the framework
- Ensures proper isolation through scoping
- Enables loose coupling through events
- Maintains immutability and referential transparency

## Module Boundaries

This module is a core framework module and can be used by:
- UI components needing scoped state
- Services requiring event communication
- Applications needing hierarchical organization

It depends only on:
- Effect for functional programming patterns
- Core types and utilities

## Best Practices

1. Use scopes to isolate component state and prevent conflicts
2. Prefer event-based communication for loose coupling
3. Keep event payloads immutable and serializable
4. Design state shapes for easy debugging and time-travel
5. Use proper scope cleanup to prevent memory leaks
6. Leverage TypeScript for type-safe event definitions