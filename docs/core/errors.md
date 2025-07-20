# Error System

The error system provides comprehensive error handling capabilities for the TUIX framework, including typed errors, error boundaries, recovery strategies, and debugging utilities.

## Overview

The error system is built around Effect.ts patterns and provides:

- **Typed Error Classes**: Structured error types for different failure scenarios
- **Error Recovery**: Configurable strategies for handling and recovering from errors
- **Error Boundaries**: Catch and handle errors at component or application level
- **Debugging Utilities**: Extract detailed error information for logging and debugging

## Error Types

### Core Error Classes

All framework errors extend from Effect.ts's `Data.TaggedError` and include:

- `timestamp`: When the error occurred
- `message`: Human-readable error description
- `cause`: Optional underlying cause
- `component`: Optional component identifier where error occurred
- `context`: Optional additional context information

#### TerminalError

Errors related to terminal operations:

```typescript
import { TerminalError } from "@/core/errors"

const error = new TerminalError({
  operation: "write",
  component: "terminal-service",
  context: { buffer: "stdout" }
})
```

#### InputError

Errors from keyboard, mouse, or terminal input:

```typescript
import { InputError } from "@/core/errors"

const error = new InputError({
  device: "keyboard",
  operation: "parse",
  component: "input-handler"
})
```

#### RenderError

Errors during rendering, layout, or painting:

```typescript
import { RenderError } from "@/core/errors"

const error = new RenderError({
  phase: "layout",
  operation: "measure",
  component: "flex-container"
})
```

#### StorageError

File system and storage operation errors:

```typescript
import { StorageError } from "@/core/errors"

const error = new StorageError({
  operation: "read",
  path: "/config/app.json",
  component: "config-service"
})
```

#### ConfigError

Configuration validation and loading errors:

```typescript
import { ConfigError } from "@/core/errors"

const error = new ConfigError({
  key: "theme",
  value: "invalid",
  expected: "light | dark",
  component: "theme-service"
})
```

#### ComponentError

Component lifecycle and operation errors:

```typescript
import { ComponentError } from "@/core/errors"

const error = new ComponentError({
  phase: "update",
  componentType: "Button",
  component: "submit-button"
})
```

#### ApplicationError

Application-level errors and defects:

```typescript
import { ApplicationError } from "@/core/errors"

const error = new ApplicationError({
  phase: "startup",
  operation: "initialize",
  component: "app"
})
```

#### ValidationError

Input validation and schema errors:

```typescript
import { ValidationError } from "@/core/errors"

const error = new ValidationError({
  field: "email",
  value: "invalid-email",
  rules: ["email", "required"],
  component: "user-form"
})
```

## Error Classification

### Critical vs Recoverable Errors

Errors are classified as either critical (should terminate application) or recoverable:

```typescript
import { ErrorUtils } from "@/core/errors"

const error = new TerminalError({ operation: "init" })

if (ErrorUtils.isCritical(error)) {
  // Handle critical error - may need to exit
} else if (ErrorUtils.isRecoverable(error)) {
  // Apply recovery strategy
}
```

**Critical Errors**: `TerminalError`, `ApplicationError`
**Recoverable Errors**: `InputError`, `RenderError`, `StorageError`, `ConfigError`, `ValidationError`

## Recovery Strategies

### Built-in Recovery Strategies

#### Retry Strategy

Retry failed operations with exponential backoff:

```typescript
import { RecoveryStrategies, withRecovery } from "@/core/errors"

const retryStrategy = RecoveryStrategies.retry(3, 100) // 3 retries, 100ms initial delay

const result = await Effect.runPromise(
  withRecovery(riskyOperation, retryStrategy)
)
```

#### Fallback Strategy

Provide default values when operations fail:

```typescript
const fallbackStrategy = RecoveryStrategies.fallback("default value")

const result = await Effect.runPromise(
  withRecovery(riskyOperation, fallbackStrategy)
)
```

#### Ignore Strategy

Convert errors to null values:

```typescript
const ignoreStrategy = RecoveryStrategies.ignore()

const result = await Effect.runPromise(
  withRecovery(riskyOperation, ignoreStrategy)
) // result will be null on error
```

#### Terminal Restore Strategy

Restore terminal to clean state after terminal errors:

```typescript
const restoreStrategy = RecoveryStrategies.restoreTerminal()

await Effect.runPromise(
  withRecovery(terminalOperation, restoreStrategy)
)
```

### Custom Recovery Strategies

Create custom recovery strategies for specific error scenarios:

```typescript
import type { ErrorRecoveryStrategy } from "@/core/errors"

const customStrategy: ErrorRecoveryStrategy<InputError, string> = {
  canRecover: (error) => error.device === "keyboard",
  recover: (error) => Effect.succeed("keyboard input recovered"),
  maxRetries: 2,
  retryDelay: 500
}
```

## Error Boundaries

Error boundaries catch and handle errors at component or application boundaries:

```typescript
import { withErrorBoundary } from "@/core/errors"

const safeEffect = withErrorBoundary(riskyEffect, {
  fallback: (error) => Effect.succeed("Error occurred"),
  onError: (error) => ErrorUtils.logError(error),
  catchDefects: true,
  logErrors: true
})
```

### Error Boundary Configuration

- `fallback`: Function to provide fallback value when error occurs
- `onError`: Optional callback to handle errors (logging, notifications, etc.)
- `catchDefects`: Whether to catch Effect defects (unhandled exceptions)
- `logErrors`: Whether to automatically log errors

## Error Utilities

### Type Guards

Check if unknown values are framework errors:

```typescript
import { isAppError } from "@/core/errors"

if (isAppError(unknownError)) {
  // Handle as framework error
  console.log(unknownError._tag, unknownError.message)
}
```

### Error Conversion

Convert unknown errors to framework errors:

```typescript
import { ErrorUtils } from "@/core/errors"

try {
  riskyOperation()
} catch (error) {
  const appError = ErrorUtils.fromUnknown(error, {
    operation: "risky-operation",
    component: "my-component"
  })
  
  // Now handle as framework error
  handleAppError(appError)
}
```

### User Messages

Get user-friendly error messages:

```typescript
const error = new StorageError({
  operation: "read",
  path: "/config.json"
})

const userMessage = ErrorUtils.getUserMessage(error)
// "File operation failed. Please check file permissions."
```

### Debug Information

Extract detailed error information for logging:

```typescript
const error = new RenderError({
  phase: "layout",
  operation: "measure",
  component: "container"
})

const debugInfo = ErrorUtils.getDebugInfo(error)
console.log(debugInfo)
// {
//   tag: "RenderError",
//   type: "RenderError", 
//   message: "Render error in layout: measure",
//   operation: "measure",
//   timestamp: "2024-01-01T00:00:00.000Z",
//   component: "container",
//   context: {},
//   cause: undefined,
//   stack: undefined
// }
```

### Error Logging

Log errors with appropriate levels:

```typescript
await Effect.runPromise(
  ErrorUtils.logError(error, "error") // "error" | "warn" | "debug"
)
```

## Best Practices

### 1. Use Appropriate Error Types

Choose the most specific error type for the failure scenario:

```typescript
// Good: Specific error type
throw new ValidationError({
  field: "email",
  value: userInput,
  rules: ["email", "required"]
})

// Bad: Generic error
throw new ApplicationError({
  phase: "runtime",
  operation: "validation"
})
```

### 2. Provide Context

Include relevant context information for debugging:

```typescript
// Good: Rich context
throw new RenderError({
  phase: "layout",
  operation: "flex-layout",
  component: "main-container",
  context: {
    containerWidth: 100,
    itemCount: 5,
    direction: "horizontal"
  }
})

// Bad: No context
throw new RenderError({
  phase: "layout"
})
```

### 3. Use Recovery Strategies

Apply appropriate recovery strategies for different error types:

```typescript
// For transient network errors
const networkEffect = withRecovery(
  fetchData(),
  RecoveryStrategies.retry(3, 1000)
)

// For missing configuration
const configEffect = withRecovery(
  loadConfig(),
  RecoveryStrategies.fallback(defaultConfig)
)
```

### 4. Implement Error Boundaries

Use error boundaries to prevent errors from crashing the application:

```typescript
// Component-level error boundary
const safeComponent = withErrorBoundary(renderComponent(), {
  fallback: () => Effect.succeed(errorComponent()),
  onError: (error) => Effect.sync(() => reportError(error)),
  logErrors: true
})

// Application-level error boundary  
const safeApp = withErrorBoundary(runApp(), {
  fallback: () => Effect.succeed(showErrorScreen()),
  catchDefects: true,
  logErrors: true
})
```

### 5. Convert Unknown Errors

Always convert unknown errors to framework errors:

```typescript
// In Effect generators
Effect.gen(function* (_) {
  try {
    return yield* _(externalOperation())
  } catch (error) {
    return yield* _(Effect.fail(
      ErrorUtils.fromUnknown(error, {
        operation: "external-call",
        component: "integration-service"
      })
    ))
  }
})
```

## Integration with Components

### Component Error Handling

Components should handle errors gracefully and provide fallback UI:

```typescript
import { Component } from "@/core/component"
import { withErrorBoundary, ComponentError } from "@/core/errors"

export const SafeButton = (props: ButtonProps) => {
  const safeRender = withErrorBoundary(
    Button(props),
    {
      fallback: () => Effect.succeed(text("Error")),
      onError: (error) => ErrorUtils.logError(error, "warn")
    }
  )
  
  return Component.create({
    init: () => Effect.succeed({}),
    update: (msg, model) => Effect.succeed([model, []]),
    view: (model) => safeRender
  })
}
```

### Service Error Propagation

Services should propagate typed errors to calling components:

```typescript
import { Effect } from "effect"
import { StorageError } from "@/core/errors"

export const loadUserData = (userId: string) =>
  Effect.gen(function* (_) {
    try {
      const data = yield* _(readFile(`/users/${userId}.json`))
      return JSON.parse(data)
    } catch (error) {
      return yield* _(Effect.fail(new StorageError({
        operation: "read",
        path: `/users/${userId}.json`,
        cause: error
      })))
    }
  })
```

## Related Documentation

- [Effect.ts Patterns](./effect-patterns.md)
- [Component Best Practices](../components/best-practices.md)
- [Testing Guide](../testing.md)