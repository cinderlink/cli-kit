# Hook System

The hook system provides a unified, event-driven approach for lifecycle management, plugin communication, and cross-cutting concerns in the CLI framework.

## Overview

The hook system replaces the legacy `CLIHooks`, `CommandHooks`, and `PluginMiddleware` interfaces with a single, consistent event-driven API that wraps the EventBus.

## Key Concepts

### Events
All hooks are based on typed events that extend `BaseEvent`:
- `BeforeCommandEvent` - Fired before command execution
- `AfterCommandEvent` - Fired after command execution
- `OnErrorEvent` - Fired when errors occur
- `PluginLoadEvent` - Fired when plugins are loaded
- And many more lifecycle events

### Subscriptions
Hooks provide a clean subscription API:
```typescript
hooks.onBeforeCommand.subscribe((event) => {
  console.log('Command:', event.command)
  return Effect.void
})
```

### Filters
Events can be filtered before reaching handlers:
```typescript
hooks.onBeforeCommand
  .filter(event => event.command[0] === 'deploy')
  .subscribe((event) => {
    console.log('Deploy command starting')
  })
```

## Usage Examples

### Basic Hook Subscription

```typescript
import { getGlobalHooks } from 'tuix/cli'

const hooks = getGlobalHooks(eventBus)

// Subscribe to command lifecycle
hooks.onBeforeCommand.subscribe((event) => {
  console.log(`Executing: ${event.command.join(' ')}`)
})

hooks.onAfterCommand.subscribe((event) => {
  console.log(`Completed with result:`, event.result)
})

hooks.onError.subscribe((event) => {
  console.error(`Error in ${event.command.join(' ')}:`, event.error)
})
```

### Plugin Integration

```typescript
import { definePlugin } from 'tuix/cli'

const myPlugin = definePlugin({
  metadata: { name: 'my-plugin', version: '1.0.0' },
  
  install(context) {
    const hooks = context.hooks
    
    // Add logging to all commands
    hooks.onBeforeCommand.subscribe((event) => {
      console.log(`[${new Date().toISOString()}] ${event.command.join(' ')}`)
    })
    
    // Track command execution time
    const startTimes = new Map<string, number>()
    
    hooks.onBeforeExecute.subscribe((event) => {
      const key = event.command.join(':')
      startTimes.set(key, Date.now())
    })
    
    hooks.onAfterExecute.subscribe((event) => {
      const key = event.command.join(':')
      const startTime = startTimes.get(key)
      if (startTime) {
        const duration = Date.now() - startTime
        console.log(`Command took ${duration}ms`)
        startTimes.delete(key)
      }
    })
  }
})
```

### One-time Subscriptions

```typescript
// Wait for a specific plugin to load
hooks.onPluginLoad
  .filter(event => event.pluginName === 'logger')
  .once((event) => {
    console.log('Logger plugin is ready')
  })
```

### Custom Events

```typescript
// Define custom event
interface DeployStartEvent extends BaseEvent {
  type: 'deploy:start'
  environment: string
  version: string
}

// Subscribe to custom event
hooks.on<DeployStartEvent>('deploy:start').subscribe((event) => {
  console.log(`Deploying ${event.version} to ${event.environment}`)
})

// Emit custom event
hooks.emit(createHookEvent('deploy:start', {
  environment: 'production',
  version: '1.2.3'
}))
```

### Error Handling

```typescript
// Global error handler
hooks.onError.subscribe((event) => {
  // Log to external service
  logService.error({
    command: event.command.join(' '),
    error: event.error.message,
    stack: event.error.stack,
    args: event.args
  })
  
  // Show user-friendly message
  console.error(`Command failed: ${event.error.message}`)
})
```

### Validation Hooks

```typescript
// Add global validation
hooks.onBeforeValidate.subscribe((event) => {
  // Check for required auth
  if (event.command[0] === 'deploy' && !event.args.token) {
    return hooks.emit(createHookEvent('hook:onError', {
      error: new Error('Authentication token required for deploy'),
      command: event.command,
      args: event.args
    }))
  }
})
```

## Hook Lifecycle

The complete command lifecycle flows through these hooks:

1. `onBeforeInit` - Application initialization
2. `onAfterInit` - Application ready
3. `onBeforeParse` - Before parsing command line arguments
4. `onAfterParse` - After parsing arguments
5. `onBeforeValidate` - Before validating parsed arguments
6. `onAfterValidate` - After validation
7. `onBeforeCommand` - Before command routing
8. `onBeforeExecute` - Before handler execution
9. `onAfterExecute` - After handler execution
10. `onAfterCommand` - After command completion
11. `onError` - On any error

## Best Practices

1. **Use Filters**: Filter events early to avoid unnecessary processing
2. **Handle Errors**: Always handle potential errors in hook handlers
3. **Clean Up**: Unsubscribe when done to prevent memory leaks
4. **Type Safety**: Use typed events for better IDE support
5. **Effect Integration**: Return Effect types for proper error handling

## Migration from Legacy Hooks

If you're migrating from the old hook system:

```typescript
// Old way (REMOVED)
const config = {
  hooks: {
    beforeCommand: (cmd, args) => { ... }
  }
}

// New way
hooks.onBeforeCommand.subscribe((event) => {
  // event.command = cmd
  // event.args = args
})
```

## Performance Considerations

- Hooks are asynchronous and non-blocking
- Multiple subscribers execute in parallel
- Filters are evaluated before handler execution
- Use `once()` for one-time events to auto-cleanup

## Testing Hooks

```typescript
import { EventBus, createHooks } from 'tuix/cli'

describe('My Plugin', () => {
  it('should log commands', async () => {
    const eventBus = new EventBus()
    const hooks = createHooks(eventBus)
    const logs: string[] = []
    
    // Subscribe to hook
    await hooks.onBeforeCommand.subscribe((event) => {
      logs.push(event.command.join(' '))
    })
    
    // Emit test event
    await hooks.emit(createHookEvent('hook:beforeCommand', {
      command: ['test', 'command'],
      args: {}
    }))
    
    expect(logs).toContain('test command')
  })
})
```