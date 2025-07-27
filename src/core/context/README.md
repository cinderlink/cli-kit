# Core Context Module

This module provides context abstractions for cross-cutting concerns that need to be shared between different parts of the framework.

## Overview

The context module currently provides:
- **Component Context**: Allows components to access MVU model and dispatch functions

## Component Context

The component context provides a way for components to access the current MVU model and dispatch messages without prop drilling.

### Usage

```typescript
import { withComponentContext, useComponentContext } from "@core/context"

// Provide context
const element = withComponentContext(
  { model: () => currentModel, dispatch: handleMessage },
  renderComponent()
)

// Use context within a component
const MyComponent = () => {
  return Effect.gen(function* () {
    const { model, dispatch } = yield* useComponentContext<MyModel, MyMsg>()
    const currentValue = model()
    // dispatch messages as needed
    dispatch({ type: "UpdateValue", value: 42 })
  })
}
```

## Architecture

The context system uses Effect's FiberRef for fiber-local state management. This ensures:
- Context is properly scoped to component trees
- Nested contexts work correctly
- No global state pollution
- Thread-safe in concurrent scenarios

## Module Boundaries

This module is part of the core framework and can be imported by:
- JSX module (re-exports for compatibility)
- CLI module (for MVU integration)
- Any other module that needs component context

It should NOT depend on any module except Effect itself.