# Effect TypeScript - Comprehensive Guide

> Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.

## Core Concepts

### The Effect Type

The fundamental abstraction in Effect is the `Effect` type with three type parameters:

```typescript
Effect<Requirements, Error, Success>
```

- **Requirements**: Context/dependencies needed to run the effect
- **Error**: Potential error types that can occur during execution  
- **Success**: The type of value produced when the effect succeeds

This design provides compile-time guarantees about dependencies, errors, and return values.

### Key Characteristics

- **Lazy Evaluation**: Effects don't run until explicitly executed
- **Type-Safe Context Tracking**: Dependencies tracked in the type system
- **Advanced Error Management**: Including error accumulation and channel operations
- **Concurrent and Asynchronous Workflows**: Built-in support for complex async patterns
- **Clean, Composable Code**: Functional approach leads to maintainable code

## Basic Constructors

```typescript
import { Effect } from "effect"

// Create a successful effect
const success = Effect.succeed(42)

// Create a failed effect
const failure = Effect.fail("Something went wrong")

// Create from synchronous function
const randomNumber = Effect.sync(() => Math.random())

// Create from Promise
const fetchData = Effect.promise(() => fetch('/api/data'))

// Create from async callback
const readFile = Effect.async<string>((resume) => {
  fs.readFile('file.txt', 'utf8', (err, data) => {
    if (err) resume(Effect.fail(err))
    else resume(Effect.succeed(data))
  })
})
```

## Functional Composition with Pipe

The `pipe` function enables clean, type-safe composition:

```typescript
import { pipe, Effect } from "effect"

const program = pipe(
  Effect.succeed(5),
  Effect.map(n => n * 2),              // Transform: 10
  Effect.flatMap(n => Effect.succeed(n + 1)), // Chain: 11
  Effect.tap(n => Effect.log(`Result: ${n}`)), // Side effect
  Effect.catchAll(error => Effect.succeed(0))  // Error handling
)
```

## Generator Functions

Effect's generators provide synchronous-like syntax for async operations:

```typescript
const program = Effect.gen(function* () {
  const x = yield* Effect.succeed(1)
  const y = yield* Effect.succeed(2)
  
  if (x + y > 10) {
    yield* Effect.fail("Sum too large")
  }
  
  return x + y
})
```

## Error Handling Patterns

### Tagged Errors

```typescript
class HttpError {
  readonly _tag = "HttpError"
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError" 
  constructor(readonly field: string) {}
}

// Handle specific error types
const handled = someEffect.pipe(
  Effect.catchTag("HttpError", (error) => 
    Effect.succeed(`Network: ${error.message}`)
  ),
  Effect.catchTags({
    HttpError: (error) => Effect.succeed(`HTTP: ${error.message}`),
    ValidationError: (error) => Effect.succeed(`Invalid: ${error.field}`)
  })
)
```

### Error Accumulation

```typescript
// Collect all validation errors instead of failing fast
const validateAll = Effect.all([
  validateName(input.name),
  validateEmail(input.email),
  validateAge(input.age)
], { mode: "either" })
```

## Resource Management

The `acquireRelease` pattern ensures safe cleanup:

```typescript
const fileResource = Effect.acquireRelease(
  // Acquire
  Effect.sync(() => fs.openSync('file.txt', 'r')),
  // Release - always called
  (file) => Effect.sync(() => fs.closeSync(file))
)

// Use within a scope
const program = Effect.gen(function* () {
  const file = yield* fileResource
  // Use file...
  return "done"
}).pipe(Effect.scoped)
```

## Dependency Injection

Effect's Layer system provides type-safe DI:

```typescript
import { Context, Layer, Effect } from "effect"

// Define service
interface Logger {
  log: (msg: string) => Effect.Effect<void>
}

// Create tag
const LoggerTag = Context.Tag<Logger>("Logger")

// Create layer
const LoggerLive = Layer.effect(
  LoggerTag,
  Effect.succeed({
    log: (msg) => Effect.sync(() => console.log(msg))
  })
)

// Use service
const program = Effect.gen(function* () {
  const logger = yield* LoggerTag
  yield* logger.log("Hello Effect!")
})

// Provide layer
const runnable = program.pipe(
  Effect.provide(LoggerLive)
)
```

## Concurrent Operations

```typescript
// Parallel execution
const parallel = Effect.all([
  task1,
  task2,
  task3
], { concurrency: "unbounded" })

// Limited concurrency
const limited = Effect.all(tasks, { concurrency: 3 })

// Race - first to complete wins
const fastest = Effect.race(slowTask, fastTask)

// Fork for background work
const forked = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longTask)
  // Do other work
  const result = yield* fiber.join
  return result
})
```

## Common Patterns

### Retry with Backoff

```typescript
import { Schedule } from "effect"

const retryable = someEffect.pipe(
  Effect.retry({
    times: 3,
    schedule: Schedule.exponential("100 millis")
  })
)
```

### Timeout

```typescript
const withTimeout = someEffect.pipe(
  Effect.timeout("5 seconds")
)
```

### Circuit Breaker

```typescript
const protected = someEffect.pipe(
  Effect.withCircuitBreaker({
    maxFailures: 5,
    resetTime: "30 seconds"
  })
)
```

## Key Modules

- **Stream**: Processing multiple values over time
- **Schema**: Data validation and transformation
- **Platform**: Cross-platform abstractions for Node/Browser/Bun
- **Config**: Type-safe configuration management
- **Metric**: Application metrics and monitoring
- **Logger**: Structured logging with context

## Learning Resources

### Official Documentation
- **Main Docs**: https://effect.website/docs/
- **API Reference**: https://tim-smart.github.io/effect-io-ai/
- **Getting Started**: https://effect.website/docs/quickstart

### Key Learning Paths
1. **Basics**: 
   - [Introduction](https://effect.website/docs/introduction)
   - [Installation](https://effect.website/docs/installation)
   - [Core Concepts](https://effect.website/docs/concepts/effect-type)

2. **Error Handling**:
   - [Expected vs Unexpected](https://effect.website/docs/error-management/expected-vs-unexpected)
   - [Error Accumulation](https://effect.website/docs/error-management/accumulating-errors)
   - [Recovering from Defects](https://effect.website/docs/error-management/recovering-from-defects)

3. **Concurrency**:
   - [Fibers](https://effect.website/docs/concurrency/fibers)
   - [Racing](https://effect.website/docs/concurrency/racing)
   - [Interruption](https://effect.website/docs/concurrency/interruption)

4. **Advanced Topics**:
   - [Dependency Management](https://effect.website/docs/requirements-management/services)
   - [Resource Management](https://effect.website/docs/resource-management/scopes)
   - [Testing](https://effect.website/docs/testing/introduction)
   - [Observability](https://effect.website/docs/observability/introduction)

### Migration Guides
- [From Promise](https://effect.website/docs/comparisons/promise)
- [From RxJS](https://effect.website/docs/comparisons/rxjs)
- [From fp-ts](https://effect.website/docs/comparisons/fp-ts)

### AI Integration
- [Vercel AI Provider](https://effect.website/docs/ai/vercel-ai-provider)
- [Structured Generation](https://effect.website/docs/ai/structured-generation)

## Best Practices

1. **Use Generators for Complex Logic**: Provides better readability than chained operations
2. **Tag Your Errors**: Use discriminated unions with `_tag` for better error handling
3. **Leverage Type Inference**: Let TypeScript infer types through the pipeline
4. **Resource Safety**: Always use `acquireRelease` for resources needing cleanup
5. **Layer Composition**: Build complex dependencies from simple layers
6. **Test with Layers**: Mock services by providing test layers
7. **Handle Interruption**: Design effects to be safely interruptible

## Quick Example: Complete Program

```typescript
import { Effect, pipe, Layer, Context, Console } from "effect"

// Services
interface Database {
  query: (sql: string) => Effect.Effect<any[], DbError>
}

interface Cache {
  get: (key: string) => Effect.Effect<string | null>
  set: (key: string, value: string) => Effect.Effect<void>
}

// Errors
class DbError {
  readonly _tag = "DbError"
  constructor(readonly message: string) {}
}

// Tags
const DatabaseTag = Context.Tag<Database>("Database")
const CacheTag = Context.Tag<Cache>("Cache")

// Program
const getUserData = (userId: string) => 
  Effect.gen(function* () {
    const cache = yield* CacheTag
    const db = yield* DatabaseTag
    
    // Check cache first
    const cached = yield* cache.get(`user:${userId}`)
    if (cached) {
      yield* Console.log("Cache hit")
      return JSON.parse(cached)
    }
    
    // Query database
    yield* Console.log("Cache miss, querying database")
    const rows = yield* db.query(`SELECT * FROM users WHERE id = ${userId}`)
    
    if (rows.length === 0) {
      yield* Effect.fail(new DbError("User not found"))
    }
    
    // Cache result
    yield* cache.set(`user:${userId}`, JSON.stringify(rows[0]))
    
    return rows[0]
  })

// Run with dependencies
const program = getUserData("123").pipe(
  Effect.catchTag("DbError", (error) => 
    Console.error(`Database error: ${error.message}`).pipe(
      Effect.flatMap(() => Effect.fail(error))
    )
  ),
  Effect.provide(Layer.merge(DatabaseLive, CacheLive))
)
```

This guide covers the essential concepts and patterns in Effect. The library provides a complete solution for building robust TypeScript applications with advanced features while maintaining type safety and functional programming principles.