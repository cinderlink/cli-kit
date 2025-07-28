# Error Recovery

## Overview

Error Recovery manages error detection, pattern matching, recovery strategies, and circuit breakers. It provides automated error handling capabilities to improve system resilience and reduce manual intervention.

## Key Concepts

### Error Patterns
Error patterns define recognizable error conditions and their associated recovery strategies. The system can automatically detect known error patterns and apply appropriate recovery actions.

### Recovery Strategies
Recovery strategies define how to handle specific types of errors, including retry logic, fallback mechanisms, and compensating actions.

### Circuit Breaker
The circuit breaker pattern prevents cascading failures by temporarily stopping requests to a failing service, allowing it time to recover.

## Usage

```typescript
import { ErrorRecoveryManager } from '@core/coordination'

const errorRecovery = new ErrorRecoveryManager(eventBus)

// Register an error pattern
const pattern = {
  id: 'network-timeout',
  name: 'Network Timeout',
  condition: (error) => error.code === 'ECONNABORTED',
  recoveryStrategy: 'retry-with-backoff'
}

await errorRecovery.registerErrorPattern(pattern)

// Register a recovery strategy
const strategy = {
  id: 'retry-with-backoff',
  name: 'Retry with Exponential Backoff',
  execute: (error) => Effect.retry(
    failingOperation,
    Schedule.exponential(Duration.seconds(1))
  )
}

await errorRecovery.registerRecoveryStrategy(strategy)
```

## API

### `registerErrorPattern(pattern: ErrorPattern): Effect<void, CoordinationError>`
Registers a new error pattern for automatic detection.

### `registerRecoveryStrategy(strategy: RecoveryStrategy): Effect<void, CoordinationError>`
Registers a new recovery strategy.

### `detectErrorPattern(error: Error): Effect<Option<ErrorPattern>, CoordinationError>`
Attempts to detect a known error pattern for the given error.

### `executeRecoveryStrategy(strategyId: string, error: Error): Effect<RecoveryResult, CoordinationError>`
Executes a registered recovery strategy.
