# Application Runtime

The runtime system is the heart of the TUIX framework, implementing the main application loop and coordinating between input, update, and render cycles using Effect.ts fiber system.

## Overview

The runtime provides:

- **Main Application Loop**: Coordinates input → update → render cycles
- **Fiber Management**: Uses Effect.ts fibers for concurrent operations
- **Signal Handling**: Graceful shutdown and emergency cleanup
- **Configuration**: Flexible runtime behavior configuration
- **Error Boundaries**: Comprehensive error handling and recovery

## Basic Usage

### Simple Application

```typescript
import { runApp } from "@/core/runtime"
import { Component } from "@/core/component"

// Define your component
const myComponent = Component.create({
  init: () => Effect.succeed([{ count: 0 }, []]),
  update: (msg, model) => Effect.succeed([model, []]),
  view: (model) => text(`Count: ${model.count}`)
})

// Run the application
const app = runApp(myComponent, {
  fps: 60,
  fullscreen: true,
  quitOnCtrlC: true
})

// Start the application
Effect.runPromise(app.pipe(
  Effect.provide(/* your services */)
))
```

### With Configuration

```typescript
import { Runtime, type RuntimeConfig } from "@/core/runtime"

const config: RuntimeConfig = {
  fps: 30,                // Target 30 FPS
  debug: true,           // Enable debug logging
  quitOnEscape: true,    // Quit when ESC pressed
  quitOnCtrlC: true,     // Quit when Ctrl+C pressed
  enableMouse: true,     // Enable mouse input
  fullscreen: true       // Use alternate screen buffer
}

const runtime = new Runtime(myComponent, config)
const app = runtime.run()
```

## Runtime Configuration

### RuntimeConfig Interface

```typescript
interface RuntimeConfig {
  readonly fps?: number           // Target frames per second (default: 60)
  readonly debug?: boolean        // Enable debug logging (default: false)
  readonly quitOnEscape?: boolean // Quit when ESC pressed (default: false)
  readonly quitOnCtrlC?: boolean  // Quit when Ctrl+C pressed (default: true)
  readonly enableMouse?: boolean  // Enable mouse support (default: false)
  readonly fullscreen?: boolean   // Use alternate screen buffer (default: true)
}
```

### Configuration Examples

```typescript
// Minimal configuration
const minimalConfig: RuntimeConfig = {}

// Development configuration
const devConfig: RuntimeConfig = {
  fps: 30,
  debug: true,
  quitOnEscape: true
}

// Production configuration
const prodConfig: RuntimeConfig = {
  fps: 60,
  debug: false,
  quitOnCtrlC: true,
  enableMouse: true,
  fullscreen: true
}

// Gaming/interactive configuration
const interactiveConfig: RuntimeConfig = {
  fps: 120,
  enableMouse: true,
  quitOnEscape: false, // Don't quit on ESC for games
  quitOnCtrlC: true
}
```

## System Messages

The runtime uses a system message type to coordinate between different parts of the application:

### SystemMsg Type

```typescript
type SystemMsg<Msg> = 
  | { readonly _tag: "WindowResized"; readonly width: number; readonly height: number }
  | { readonly _tag: "KeyPressed"; readonly key: KeyEvent }
  | { readonly _tag: "MouseEvent"; readonly event: MouseEvent }
  | { readonly _tag: "Tick"; readonly time: number }
  | { readonly _tag: "UserMsg"; readonly msg: Msg }
  | { readonly _tag: "Quit" }
```

### Message Flow

```
Input Events → System Messages → Component Update → Commands → System Messages
     ↑                                                                    ↓
     └─────────────────── Application Loop ────────────────────────────────┘
```

## Application Lifecycle

### 1. Initialization

```typescript
const runtime = new Runtime(component, config)

// Runtime initialization:
// 1. Apply configuration defaults
// 2. Setup terminal (raw mode, alternate screen, hide cursor)
// 3. Enable mouse input if configured
// 4. Initialize component
// 5. Create message queue and state
```

### 2. Main Loop

```typescript
// Main application loop:
// 1. Process initial commands
// 2. Setup signal handlers
// 3. Start fibers (quit handling, subscriptions, rendering)
// 4. Process messages until quit
// 5. Cleanup and shutdown
```

### 3. Concurrent Operations

The runtime manages several concurrent fibers:

- **Message Processing**: Main update loop
- **Render Loop**: Continuous rendering at target FPS
- **Subscription Handling**: Dynamic subscriptions based on model state
- **Quit Key Handling**: Automatic quit key processing
- **Signal Handling**: OS signal processing

### 4. Shutdown and Cleanup

```typescript
// Graceful shutdown:
// 1. Send quit message
// 2. Interrupt all fibers
// 3. Restore terminal state
// 4. Clean up resources

// Emergency shutdown:
// 1. Immediate terminal restoration
// 2. Process exit
```

## Error Handling

### Error Boundaries

The runtime includes comprehensive error handling:

```typescript
runtime.run().pipe(
  Effect.catchAllDefect(defect => {
    // Emergency cleanup on crash
    emergencyTerminalCleanup(config)
    // Propagate defect
  }),
  Effect.catchAll(error => {
    // Emergency cleanup on error
    emergencyTerminalCleanup(config)
    // Propagate error
  })
)
```

### Signal Handling

Automatic handling of OS signals:

```typescript
// Graceful shutdown signals
process.on('SIGINT', handleGracefulShutdown)   // Ctrl+C
process.on('SIGTERM', handleGracefulShutdown)  // Termination request

// Emergency cleanup events
process.on('exit', emergencyTerminalCleanup)
process.on('beforeExit', emergencyTerminalCleanup)
process.on('uncaughtException', handleEmergencyShutdown)
process.on('unhandledRejection', handleEmergencyShutdown)
```

### Terminal State Recovery

Emergency terminal cleanup ensures the terminal is always restored:

```typescript
const emergencyTerminalCleanup = (config: RuntimeConfig): void => {
  try {
    if (process.stdin.isTTY && 'setRawMode' in process.stdin) {
      process.stdin.setRawMode(false)
    }
    process.stdout.write('\x1b[?25h')  // Show cursor
    if (config.fullscreen ?? true) {
      process.stdout.write('\x1b[?1049l') // Exit alternate screen
    }
    process.stdout.write('\x1b[0m')     // Reset colors
    process.stdout.write('\x1b[2J')     // Clear screen
    process.stdout.write('\x1b[H')      // Move to home
  } catch {
    // Ignore errors during emergency cleanup
  }
}
```

## Advanced Usage

### Custom Component with Subscriptions

```typescript
const componentWithSubs = Component.create({
  init: () => Effect.succeed([{ listening: true }, []]),
  
  update: (msg, model) => {
    switch (msg._tag) {
      case "TimerTick":
        return Effect.succeed([model, []])
      case "Stop":
        return Effect.succeed([{ listening: false }, []])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model) => text(model.listening ? "Listening..." : "Stopped"),
  
  // Dynamic subscriptions based on model state
  subscriptions: (model) => 
    model.listening 
      ? Effect.succeed(
          Stream.fromSchedule(Schedule.fixed("1000 millis")).pipe(
            Stream.map(() => ({ _tag: "TimerTick" as const }))
          )
        )
      : Effect.succeed(Stream.empty)
})
```

### Mouse Event Handling

```typescript
const mouseComponent = Component.create({
  init: () => Effect.succeed([{ clicks: 0 }, []]),
  
  update: (msg, model) => {
    switch (msg._tag) {
      case "MouseClick":
        return Effect.succeed([{ clicks: model.clicks + 1 }, []])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model) => text(`Clicks: ${model.clicks}`)
})

// Run with mouse enabled
runApp(mouseComponent, { enableMouse: true })
```

### Graceful Quit Commands

```typescript
const componentWithQuit = Component.create({
  init: () => Effect.succeed([{}, []]),
  
  update: (msg, model) => {
    switch (msg._tag) {
      case "RequestQuit":
        // Return a quit command
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" })]])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model) => text("Press 'q' to quit")
})
```

## Performance Considerations

### Frame Rate Configuration

```typescript
// High performance - 120 FPS
const highPerfConfig = { fps: 120 }

// Battery friendly - 30 FPS
const batteryConfig = { fps: 30 }

// Responsive UI - 60 FPS (default)
const standardConfig = { fps: 60 }
```

### Subscription Management

The runtime automatically manages subscriptions:

- **Dynamic Restart**: Subscriptions restart when model changes
- **Automatic Cleanup**: Subscriptions stop when app shuts down
- **Efficient Monitoring**: Model changes checked at 60 FPS
- **Referential Equality**: Uses `===` for performance

### Memory Management

- **Fiber Cleanup**: All fibers properly interrupted on shutdown
- **Event Listener Cleanup**: Signal handlers removed on exit
- **Queue Management**: Message queues bounded to prevent memory leaks

## Debugging

### Debug Mode

Enable debug logging:

```typescript
runApp(component, { debug: true })
```

Debug output includes:
- Frame timing warnings for slow frames
- Mouse event routing information
- Component lifecycle events

### Performance Monitoring

```typescript
// Access runtime state for monitoring
interface RuntimeState<Model, Msg> {
  readonly model: Model
  readonly running: boolean
  readonly lastRenderTime: number
  readonly frameCount: number
}
```

### Common Issues

1. **Slow Frames**: Check component view complexity
2. **Memory Leaks**: Ensure subscriptions clean up properly
3. **Terminal Issues**: Verify signal handlers are working
4. **Mouse Not Working**: Enable mouse in configuration

## Integration with Services

The runtime requires several services to function:

```typescript
import { 
  TerminalService,
  InputService,
  RendererService,
  MouseRouterService
} from "@/services"

// Services must be provided in the Effect context
Effect.runPromise(
  runApp(component, config).pipe(
    Effect.provide(/* service implementations */)
  )
)
```

### Required Services

- **TerminalService**: Terminal control and capabilities
- **InputService**: Keyboard and mouse input handling  
- **RendererService**: View rendering and output
- **MouseRouterService**: Mouse event routing (if mouse enabled)

## Testing

### Unit Testing

```typescript
import { Runtime } from "@/core/runtime"

test("runtime configuration", () => {
  const component = createTestComponent()
  const runtime = new Runtime(component, { fps: 30 })
  
  expect((runtime as any).config.fps).toBe(30)
})
```

### Integration Testing

```typescript
test("component integration", async () => {
  const component = createTestComponent()
  const [model, cmds] = await Effect.runPromise(component.init)
  
  expect(model.count).toBe(0)
  expect(cmds).toEqual([])
})
```

### Mock Services

Create mock services for testing:

```typescript
const mockServices = {
  TerminalService: createMockTerminalService(),
  InputService: createMockInputService(),
  RendererService: createMockRendererService(),
  MouseRouterService: createMockMouseRouterService()
}
```

## Best Practices

### 1. Configuration

- Use appropriate FPS for your use case
- Enable debug mode during development
- Configure quit keys based on application type

### 2. Error Handling

- Always handle component errors gracefully
- Use Effect error boundaries for robust applications
- Test emergency cleanup scenarios

### 3. Performance

- Keep view functions lightweight
- Use subscriptions sparingly
- Monitor frame timing in debug mode

### 4. Testing

- Test component logic separately from runtime
- Use mocks for service dependencies
- Test error scenarios and edge cases

## Related Documentation

- [Component System](../components/README.md) - Building interactive components
- [Effect Patterns](./effect-patterns.md) - Working with Effect.ts
- [Error System](./errors.md) - Error handling and recovery
- [Services](../services/README.md) - Terminal and input services