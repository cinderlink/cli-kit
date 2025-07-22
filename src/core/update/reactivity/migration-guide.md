# Hook System Migration Guide

This guide helps you migrate from the legacy hook systems (CLIHooks, CommandHooks, PluginMiddleware) to the new unified hook system.

## Overview

The new unified hook system provides:
- Single consistent API for all hooks
- Event-based architecture with proper typing
- Support for sync/async/Effect handlers
- Composable hook filters
- Better error handling

## Migration Examples

### CLIHooks → UnifiedHooks

**Old:**
```typescript
const config: CLIConfig = {
  hooks: {
    beforeCommand: async (command, args) => {
      console.log('Before command:', command)
    },
    afterCommand: async (command, args, result) => {
      console.log('Command completed')
    },
    onError: (error, command, args) => {
      console.error('Command failed:', error)
    }
  }
}
```

**New:**
```typescript
import { getGlobalHooks } from 'tuix/cli/unified-hooks'

const hooks = getGlobalHooks(eventBus)

// Subscribe to hooks
hooks.onBeforeCommand.subscribe((event) => {
  console.log('Before command:', event.command)
})

hooks.onAfterCommand.subscribe((event) => {
  console.log('Command completed')
})

hooks.onError.subscribe((event) => {
  console.error('Command failed:', event.error)
})
```

### CommandHooks → UnifiedHooks

**Old:**
```typescript
const commandHooks: CommandHooks = {
  beforeCommand: (args, context) => {
    console.log('Args:', args)
    console.log('Plugin:', context.metadata.name)
  },
  afterCommand: (args, result, context) => {
    console.log('Result:', result)
  },
  onError: (error, args, context) => {
    console.error('Error in plugin:', context.metadata.name, error)
  }
}
```

**New:**
```typescript
// Filter hooks by plugin context
hooks.onBeforeCommand
  .filter(event => event.source === 'my-plugin')
  .subscribe((event) => {
    console.log('Args:', event.args)
  })

hooks.onAfterCommand
  .filter(event => event.source === 'my-plugin')
  .subscribe((event) => {
    console.log('Result:', event.result)
  })

hooks.onError
  .filter(event => event.source === 'my-plugin')
  .subscribe((event) => {
    console.error('Error in plugin:', event.error)
  })
```

### PluginMiddleware → UnifiedHooks

**Old:**
```typescript
const middleware: PluginMiddleware = {
  beforeCommand: (command, args) => {
    console.log('Command:', command.join(' '))
  },
  transformArgs: (args, command) => {
    return { ...args, transformed: true }
  },
  validateArgs: (args, command) => {
    if (!args.required) {
      return 'Missing required argument'
    }
    return true
  }
}
```

**New:**
```typescript
// Basic hooks
hooks.onBeforeCommand.subscribe((event) => {
  console.log('Command:', event.command.join(' '))
})

// Argument transformation - implement in command handler
hooks.onBeforeExecute.subscribe((event) => {
  // Modify args before execution
  event.args.transformed = true
})

// Validation
hooks.onBeforeValidate.subscribe((event) => {
  if (!event.args.required) {
    // Emit error event
    hooks.emit(createHookEvent('hook:onError', {
      error: new Error('Missing required argument'),
      command: event.command,
      args: event.args
    }))
  }
})
```

## Plugin Definition Updates

### Using definePlugin()

**Old:**
```typescript
const plugin = definePlugin({
  metadata: { name: 'my-plugin', version: '1.0.0' },
  hooks: {
    beforeCommand: (command, args) => { ... }
  },
  middleware: {
    transformArgs: (args) => { ... }
  }
})
```

**New:**
```typescript
const plugin = definePlugin({
  metadata: { name: 'my-plugin', version: '1.0.0' },
  install: (context) => {
    const hooks = context.hooks
    
    // Register hooks
    hooks.onBeforeCommand.subscribe((event) => { ... })
    
    // Register transforms as hooks
    hooks.onBeforeExecute.subscribe((event) => {
      // Transform args here
    })
  }
})
```

### Using BasePlugin

**Old:**
```typescript
class MyPlugin extends BasePlugin {
  hooks = {
    beforeCommand: (command, args) => { ... }
  }
}
```

**New:**
```typescript
class MyPlugin extends BasePlugin {
  async initialize() {
    // Get hooks from context
    const hooks = this.context.hooks
    
    // Subscribe to hooks
    hooks.onBeforeCommand.subscribe((event) => { ... })
  }
}
```

## Advanced Hook Usage

### One-time Hooks

```typescript
// Execute only once
hooks.onPluginLoad.once((event) => {
  console.log('Plugin loaded:', event.pluginName)
})
```

### Filtered Hooks

```typescript
// Only for specific commands
hooks.onBeforeCommand
  .filter(event => event.command[0] === 'deploy')
  .subscribe((event) => {
    console.log('Deploying...')
  })
```

### Custom Hooks

```typescript
// Define custom event
interface CustomEvent extends BaseEvent {
  type: 'custom:myEvent'
  data: string
}

// Subscribe to custom hook
hooks.on<CustomEvent>('custom:myEvent').subscribe((event) => {
  console.log('Custom event:', event.data)
})

// Emit custom event
hooks.emit(createHookEvent('custom:myEvent', {
  data: 'Hello'
}))
```

### Effect-based Hooks

```typescript
import { Effect } from 'effect'

hooks.onBeforeCommand.subscribe((event) => 
  Effect.gen(function* () {
    // Use Effect capabilities
    yield* Effect.log('Command starting:', event.command)
    
    // Perform async operations
    const config = yield* loadConfig()
    
    // Handle errors
    if (!config.valid) {
      yield* Effect.fail(new Error('Invalid config'))
    }
  })
)
```

## Deprecation Timeline

1. **Current Release**: Both old and new APIs work, with deprecation warnings
2. **Next Minor Release**: Old APIs will log warnings on every use
3. **Next Major Release**: Old APIs will be removed completely

## Getting Help

If you need help migrating:
1. Check the unified-hooks.ts source for all available hooks
2. Use TypeScript autocomplete to explore the API
3. Report issues at https://github.com/anthropics/tuix/issues