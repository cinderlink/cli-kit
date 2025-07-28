# Core Update Module

This module provides the update mechanisms for the Model-View-Update (MVU) architecture, including commands, effects, subscriptions, and reactivity systems.

## Overview

The update module consists of:
- **Commands**: Declarative side effects that produce messages
- **Effects**: Integration with Effect library for async operations
- **Subscriptions**: Long-running event sources
- **Reactivity**: Reactive state management and component lifecycle

## Commands

Commands represent side effects that should be executed:

```typescript
import { Cmd } from "@core/update/commands"

// Create commands
const fetchDataCmd = Cmd.ofEffect(
  Effect.tryPromise(() => fetch('/api/data')),
  (result) => ({ type: 'DataLoaded', data: result }),
  (error) => ({ type: 'DataError', error })
)

// Batch commands
const batchedCmd = Cmd.batch([
  fetchDataCmd,
  Cmd.ofMsg({ type: 'Loading' })
])
```

## Effects

Integration with Effect for managed side effects:

```typescript
import { runEffect } from "@core/update/effects"

// Run effects in update functions
function update(msg: Msg, model: Model) {
  switch (msg.type) {
    case 'FetchUser':
      return [
        { ...model, loading: true },
        runEffect(
          UserService.fetchUser(msg.userId),
          (user) => ({ type: 'UserLoaded', user })
        )
      ]
  }
}
```

## Subscriptions

Long-running event sources:

```typescript
import { Sub } from "@core/update/subscriptions"

// Create subscriptions
const keyboardSub = Sub.onKeyPress((key) => ({
  type: 'KeyPressed',
  key
}))

const timerSub = Sub.every(1000, () => ({
  type: 'Tick'
}))

// Manage subscriptions
function subscriptions(model: Model) {
  return Sub.batch([
    model.listeningToKeyboard ? keyboardSub : Sub.none,
    model.timerActive ? timerSub : Sub.none
  ])
}
```

## Reactivity

Modern reactive patterns for state management:

```typescript
import { reactive, computed } from "@core/update/reactivity"

// Reactive state
const state = reactive({
  count: 0,
  items: []
})

// Computed values
const total = computed(() => 
  state.items.reduce((sum, item) => sum + item.value, 0)
)

// Reactive components
const Counter = reactiveComponent(() => {
  return <div>Count: {state.count}</div>
})
```

## Architecture

The update module:
- Provides the "Update" part of Model-View-Update
- Integrates deeply with Effect for async operations
- Manages side effects in a predictable way
- Enables reactive patterns while maintaining MVU principles
- Ensures all updates are traceable and debuggable

## Module Boundaries

This module is a core framework module used by:
- MVU runtime for executing updates
- Components needing reactive state
- Applications requiring side effect management

It depends on:
- Effect for async operations
- Core types and model primitives
- Event system for subscriptions

## Best Practices

1. Keep update functions pure - return commands for side effects
2. Use proper error handling in effects
3. Clean up subscriptions to prevent memory leaks
4. Batch related commands for efficiency
5. Use reactive state judiciously - prefer MVU patterns
6. Test update logic independently from effects