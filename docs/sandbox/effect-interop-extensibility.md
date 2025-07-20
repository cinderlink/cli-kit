# Effect Interop and Extensibility Layer

## ARCHITECTURAL DESIGN PROPOSAL
### Status: Not Implemented
This document describes a proposed Effect-based interoperability and extensibility layer for TUIX. The event-driven module communication system described here does not currently exist in the codebase.

## Overview

The proposed Effect interop system would provide type-safe, composable communication between TUIX modules (JSX, Core, CLI, Styles, Process Management, etc.) and extensibility points for plugins. It would use Effect-ts as the foundation for streaming events, hooks, and cross-module coordination.

## Core Architecture

### Module Interface Pattern

Each core module exposes an Effect-based interface for inter-module communication:

```typescript
// Core Module Interface
interface CoreModule {
  // Scope management
  registerScope: (scope: ScopeDef) => Effect<void, ScopeError>
  unregisterScope: (scopeId: string) => Effect<void, never>
  findScope: (path: string[]) => Effect<ScopeDef | null, never>
  checkScopeConflicts: (scope: ScopeDef) => Effect<ScopeConflict[], never>
  
  // Lifecycle
  initialize: () => Effect<void, InitError>
  shutdown: () => Effect<void, never>
  
  // Events
  onScopeRegistered: Stream<ScopeEvent>
  onScopeUnregistered: Stream<ScopeEvent>
}

// CLI Module Interface  
interface CLIModule {
  // Command registration
  registerCommand: (scope: ScopeDef) => Effect<void, CommandError>
  parseArgs: (argv: string[]) => Effect<ParsedArgs, ParseError>
  route: (args: ParsedArgs) => Effect<RouteResult, RouteError>
  execute: (route: RouteResult) => Effect<ExitCode, ExecutionError>
  
  // Events
  onCommandRegistered: Stream<CommandEvent>
  onExecution: Stream<ExecutionEvent>
}

// JSX Module Interface
interface JSXModule {
  // Component lifecycle
  renderComponent: (element: JSX.Element) => Effect<RenderResult, RenderError>
  updateScope: (scopeId: string, updates: Partial<ScopeDef>) => Effect<void, ScopeError>
  
  // Hooks integration
  useScope: () => Effect<ScopeDef, never>
  useEffect: (effect: Effect<void>, deps: unknown[]) => Effect<void, never>
  
  // Events
  onRender: Stream<RenderEvent>
  onScopeUpdate: Stream<ScopeUpdateEvent>
}
```

### Event Streaming System

Modules communicate through typed event streams:

```typescript
// Core event types
interface ScopeEvent {
  type: 'scope-registered' | 'scope-unregistered' | 'scope-updated'
  scope: ScopeDef
  timestamp: Date
  source: string
}

interface CommandEvent {
  type: 'command-registered' | 'command-conflict' | 'command-resolved'
  command: CommandDef
  path: string[]
  metadata: Record<string, unknown>
}

interface ExecutionEvent {
  type: 'execution-start' | 'execution-end' | 'execution-error'
  scope: ScopeDef
  args: ParsedArgs
  result?: unknown
  error?: ExecutionError
  duration?: number
}

// Event bus for cross-module communication
class EventBus {
  private streams = new Map<string, Subject<unknown>>()
  
  publish<T>(channel: string, event: T): Effect<void, never> {
    return Effect.sync(() => {
      const stream = this.streams.get(channel)
      if (stream) {
        stream.next(event)
      }
    })
  }
  
  subscribe<T>(channel: string): Stream<T> {
    return Stream.fromEffect(
      Effect.sync(() => {
        if (!this.streams.has(channel)) {
          this.streams.set(channel, new Subject<T>())
        }
        return this.streams.get(channel)!
      })
    ).pipe(Stream.flatMap(subject => Stream.fromObservable(subject)))
  }
}
```

### Plugin Extension Points

Plugins can extend core functionality through Effect-based hooks:

```typescript
interface PluginExtensionPoint {
  // Scope processing
  onScopeRegistration?: (scope: ScopeDef) => Effect<ScopeDef, never>
  onScopeResolution?: (path: string[]) => Effect<ScopeDef | null, never>
  
  // Command processing  
  onCommandParsing?: (argv: string[]) => Effect<string[], never>
  onCommandExecution?: (args: ParsedArgs) => Effect<ParsedArgs, never>
  
  // Rendering pipeline
  onComponentRender?: (element: JSX.Element) => Effect<JSX.Element, never>
  onStyleApplication?: (styles: StyleDef) => Effect<StyleDef, never>
  
  // Process management
  onProcessSpawn?: (config: ProcessConfig) => Effect<ProcessConfig, never>
  onProcessExit?: (process: ProcessInfo) => Effect<void, never>
}

// Plugin registration
const registerPlugin = (plugin: Plugin) =>
  Effect.gen(function* () {
    // Register extension points
    if (plugin.extensions?.onScopeRegistration) {
      yield* CoreModule.addScopeHook(plugin.extensions.onScopeRegistration)
    }
    
    if (plugin.extensions?.onCommandExecution) {
      yield* CLIModule.addExecutionHook(plugin.extensions.onCommandExecution)
    }
    
    // Register plugin scopes
    for (const scope of plugin.scopes || []) {
      yield* CoreModule.registerScope(scope)
    }
    
    // Subscribe to events
    yield* Effect.fork(
      Stream.runForeach(
        CoreModule.onScopeRegistered,
        (event) => plugin.onScopeEvent?.(event) || Effect.void
      )
    )
  })
```

### Cross-Module Coordination Examples

#### Scope Registration Flow

```typescript
// 1. JSX component registers scope
const registerJSXScope = (component: JSX.Element) =>
  Effect.gen(function* () {
    const scope = yield* extractScopeFromComponent(component)
    
    // 2. Core validates and stores scope
    yield* CoreModule.registerScope(scope)
    
    // 3. If executable, register with CLI
    if (scope.executable) {
      yield* CLIModule.registerCommand(scope)
    }
    
    // 4. Apply styles if component has styling
    if (scope.styles) {
      yield* StyleModule.registerStyles(scope.styles)
    }
    
    // 5. Notify plugins
    yield* EventBus.publish('scope-registered', { scope })
  })
```

#### Command Execution Pipeline

```typescript
const executeCommand = (argv: string[]) =>
  Effect.gen(function* () {
    // 1. Parse arguments
    let parsedArgs = yield* CLIModule.parseArgs(argv)
    
    // 2. Allow plugins to modify parsing
    parsedArgs = yield* applyPluginHooks('command-parsing', parsedArgs)
    
    // 3. Route to scope
    const route = yield* CLIModule.route(parsedArgs)
    
    // 4. Pre-execution hooks
    yield* applyPluginHooks('pre-execution', route)
    
    // 5. Execute
    const result = yield* CLIModule.execute(route)
    
    // 6. Post-execution hooks
    yield* applyPluginHooks('post-execution', result)
    
    // 7. Render result if it's a component
    if (isComponent(result)) {
      yield* JSXModule.renderComponent(result)
    }
    
    return result
  })
```

### Process Management Integration

```typescript
interface ProcessModule {
  spawn: (config: ProcessConfig) => Effect<ProcessHandle, ProcessError>
  kill: (handle: ProcessHandle) => Effect<void, never>
  list: () => Effect<ProcessInfo[], never>
  
  // Events
  onProcessStart: Stream<ProcessEvent>
  onProcessExit: Stream<ProcessEvent>
  onProcessOutput: Stream<ProcessOutputEvent>
}

// Process-aware scope execution
const executeProcessScope = (scope: ScopeDef, args: ParsedArgs) =>
  Effect.gen(function* () {
    // Check if scope requires process spawning
    if (scope.processConfig) {
      const process = yield* ProcessModule.spawn(scope.processConfig)
      
      // Stream process output to JSX components
      yield* Effect.fork(
        Stream.runForeach(
          ProcessModule.onProcessOutput.pipe(
            Stream.filter(event => event.processId === process.id)
          ),
          (output) => JSXModule.updateScope(scope.id, { 
            runtimeData: { output } 
          })
        )
      )
    }
    
    // Execute normal scope handler
    return yield* scope.handler(args)
  })
```

### Style System Integration

```typescript
interface StyleModule {
  registerStyles: (styles: StyleDef) => Effect<void, StyleError>
  applyStyles: (element: JSX.Element) => Effect<StyledElement, never>
  computeLayout: (element: StyledElement) => Effect<LayoutInfo, LayoutError>
  
  // Reactive style updates
  onStyleChange: Stream<StyleChangeEvent>
}

// Style-aware rendering
const renderWithStyles = (element: JSX.Element) =>
  Effect.gen(function* () {
    // 1. Apply styles
    const styled = yield* StyleModule.applyStyles(element)
    
    // 2. Compute layout
    const layout = yield* StyleModule.computeLayout(styled)
    
    // 3. Render to terminal
    const rendered = yield* TerminalModule.render(styled, layout)
    
    return rendered
  })
```

### Plugin Development Example

```typescript
// Example: Logging plugin that extends all modules
const createLoggingPlugin = (): Plugin => ({
  name: 'logging',
  
  extensions: {
    onScopeRegistration: (scope) =>
      Effect.sync(() => {
        console.log(`[LOGGING] Scope registered: ${scope.path.join(' ')}`)
        return scope
      }),
      
    onCommandExecution: (args) =>
      Effect.sync(() => {
        console.log(`[LOGGING] Executing: ${args.command.join(' ')}`)
        return args
      }),
      
    onProcessSpawn: (config) =>
      Effect.sync(() => {
        console.log(`[LOGGING] Spawning process: ${config.command}`)
        return { ...config, env: { ...config.env, LOG_LEVEL: 'debug' } }
      })
  },
  
  scopes: [
    {
      type: 'command',
      name: 'logs',
      executable: true,
      handler: showLogsHandler
    }
  ],
  
  onScopeEvent: (event) =>
    Effect.sync(() => {
      console.log(`[LOGGING] Scope event: ${event.type}`)
    })
})
```

## Benefits

1. **Type Safety**: All inter-module communication is typed through Effect interfaces
2. **Composability**: Effects can be combined, transformed, and composed
3. **Error Handling**: Structured error types with automatic propagation
4. **Resource Management**: Automatic cleanup with `acquireRelease`
5. **Concurrency**: Built-in support for async operations and streaming
6. **Testing**: Effect pipelines are easily testable with mock modules
7. **Plugin Safety**: Plugins can't break core functionality, only extend it
8. **Performance**: Lazy evaluation and streaming prevent unnecessary work
9. **Observability**: Built-in tracing and metrics through Effect ecosystem

This architecture provides a solid foundation for extensible, type-safe module communication while maintaining clear separation of concerns.