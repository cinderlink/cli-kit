# Coordination Module

## Overview

The Coordination module provides advanced event orchestration and workflow management capabilities for the Tuix framework. It enables complex event-driven patterns, performance monitoring, error recovery, and integration patterns for building robust terminal applications.

## Purpose

This module serves as the central coordination layer that:
- Orchestrates complex workflows with step dependencies and error handling
- Choreographs event flows between loosely coupled components
- Optimizes event streams for performance (batching, throttling, deduplication)
- Monitors system performance and generates health reports
- Provides automatic error recovery with configurable strategies
- Implements common integration patterns for CLI and TUI applications

## Core Components

### EventChoreographer
Manages loosely coupled event flows using publish-subscribe patterns.

```typescript
import { EventChoreographer } from '@core/coordination'

const choreographer = new EventChoreographer(eventBus)
await choreographer.addEventFlow({
  from: 'user-input',
  to: 'command-handler',
  transform: (event) => ({ ...event, timestamp: Date.now() })
})
```

### WorkflowOrchestrator
Executes complex workflows with step dependencies, retries, and error handling.

```typescript
import { WorkflowOrchestrator } from '@core/coordination'

const orchestrator = new WorkflowOrchestrator(eventBus)
const result = await orchestrator.executeWorkflow({
  id: 'build-deploy',
  steps: [
    { id: 'test', handler: runTests },
    { id: 'build', handler: buildProject, dependsOn: ['test'] },
    { id: 'deploy', handler: deployApp, dependsOn: ['build'] }
  ]
})
```

### EventStreamOptimizer
Optimizes high-frequency event streams for better performance.

```typescript
import { EventStreamOptimizer } from '@core/coordination'

const optimizer = new EventStreamOptimizer(eventBus)
await optimizer.configureBufferSize('ui-update', 50)
await optimizer.configureRateLimit('ui-update', 60) // 60fps
```

### PerformanceMonitor
Tracks system performance metrics and generates reports.

```typescript
import { PerformanceMonitor } from '@core/coordination'

const monitor = new PerformanceMonitor(eventBus)
const metrics = await monitor.getPerformanceMetrics()
const report = await monitor.generateReport()
```

### ErrorRecoveryManager
Provides automatic error recovery with configurable strategies.

```typescript
import { ErrorRecoveryManager } from '@core/coordination'

const recovery = new ErrorRecoveryManager(eventBus)
await recovery.registerErrorPattern({
  name: 'network-timeout',
  condition: { errorType: 'NetworkError', retryable: true },
  severity: 'medium'
})
```

### IntegrationPatterns
Pre-built patterns for common CLI/TUI scenarios.

```typescript
import { IntegrationPatterns } from '@core/coordination'

const patterns = new IntegrationPatterns(eventBus)
const processMonitor = await patterns.createProcessMonitoringPattern()
const cliPattern = await patterns.createInteractiveCLIPattern()
```

## API Reference

### CoordinationModule

The main module that integrates all coordination components.

```typescript
interface CoordinationConfig {
  eventFlowsEnabled?: boolean
  workflowsEnabled?: boolean
  optimizationEnabled?: boolean
  performanceMonitoringEnabled?: boolean
  errorRecoveryEnabled?: boolean
  performanceReportingInterval?: Duration
}
```

#### Methods

- `createEventFlow(config)` - Create a new event flow
- `createWorkflow(config)` - Create a new workflow
- `getSystemHealth()` - Get current system health metrics
- `configureIntegrationPattern(pattern, config)` - Configure integration patterns
- `registerErrorPattern(pattern)` - Register custom error patterns
- `registerRecoveryStrategy(strategy)` - Register custom recovery strategies

## Integration

The coordination module integrates with:
- **Event System**: Uses EventBus for all event communication
- **Service Module**: Coordinates service lifecycle and communication
- **Process Manager**: Provides process monitoring patterns
- **Logger**: Emits performance and error events for logging

## Best Practices

1. **Event Flows**: Use choreography for loosely coupled components
2. **Workflows**: Use orchestration for complex, ordered operations
3. **Error Recovery**: Always register error patterns for known failure modes
4. **Performance**: Monitor critical paths and optimize event streams
5. **Integration Patterns**: Use pre-built patterns when applicable

## Examples

See the `integration.test.ts` file for comprehensive examples of all coordination patterns.