# SCOPE System Design

## Overview

The SCOPE system is a foundational architectural pattern for TUIX that provides hierarchical context management, command routing, and component lifecycle coordination. It's inspired by React Router's approach but tailored for CLI applications.

## Core Concepts

### ScopeDef Type

```typescript
interface ScopeDef {
  // Identity
  id: string                    // Unique scope identifier
  type: 'cli' | 'plugin' | 'command' | 'arg' | 'flag' | 'option' | 'component'
  name: string                  // User-facing name
  
  // Hierarchy
  parent?: ScopeDef            // Parent scope reference
  children: ScopeDef[]         // Child scopes
  path: string[]               // Full path from root (e.g., ['cli', 'pm', 'start'])
  
  // Execution
  executable: boolean          // Can this scope be invoked/rendered?
  handler?: Handler            // Execution handler
  defaultContent?: JSX.Element // Content to show when scope is accessed without subcommand
  
  // Configuration
  args?: Record<string, ArgDef>
  flags?: Record<string, FlagDef>
  options?: Record<string, OptionDef>
  
  // Metadata
  description?: string
  hidden?: boolean
  aliases?: string[]
  
  // Lifecycle hooks
  onEnter?: (ctx: ScopeContext) => Effect<void>
  onExit?: (ctx: ScopeContext) => Effect<void>
  onChild?: (child: ScopeDef) => Effect<void>
}
```

### Scope Component

```tsx
// Base Scope component that all CLI components use
function Scope({ 
  def: ScopeDef,
  children 
}: { 
  def: ScopeDef, 
  children?: ReactNode 
}) {
  // Register scope with the runtime
  useEffect(() => {
    const unsub = runtime.registerScope(def)
    return unsub
  }, [def])
  
  // Trigger lifecycle Effects
  useLayoutEffect(() => {
    if (def.onEnter) {
      Effect.runPromise(def.onEnter(context))
    }
    return () => {
      if (def.onExit) {
        Effect.runPromise(def.onExit(context))
      }
    }
  }, [])
  
  return <scope-intrinsic def={def}>{children}</scope-intrinsic>
}
```

### CLI Components as Scopes

All major CLI components wrap their content in Scope:

```tsx
function Plugin({ name, description, children }) {
  const def: ScopeDef = {
    id: useId(),
    type: 'plugin',
    name,
    description,
    executable: true,
    defaultContent: children,
    // ... other properties
  }
  
  return (
    <Scope def={def}>
      {children}
    </Scope>
  )
}

function Command({ name, handler, args, flags, children }) {
  const def: ScopeDef = {
    id: useId(),
    type: 'command',
    name,
    handler,
    args,
    flags,
    executable: true,
    // ...
  }
  
  return (
    <Scope def={def}>
      {children}
    </Scope>
  )
}

// Non-executable scopes
function Arg({ name, ...props }) {
  const def: ScopeDef = {
    id: useId(),
    type: 'arg',
    name,
    executable: false, // Does not count as content
    // ...
  }
  
  return <Scope def={def} />
}
```

## Scope Stack Management

The runtime maintains a scope stack that tracks the current navigation path:

```typescript
class ScopeStack {
  private stack: ScopeDef[] = []
  private registry: Map<string, ScopeDef> = new Map()
  
  push(scope: ScopeDef) {
    // Update parent/child relationships
    const parent = this.current()
    if (parent) {
      scope.parent = parent
      parent.children.push(scope)
    }
    
    // Update path
    scope.path = [...(parent?.path || []), scope.name]
    
    // Register
    this.stack.push(scope)
    this.registry.set(scope.id, scope)
    
    // Notify Effect pipeline
    this.notifyPush(scope)
  }
  
  pop() {
    const scope = this.stack.pop()
    if (scope) {
      this.notifyPop(scope)
    }
    return scope
  }
  
  current() {
    return this.stack[this.stack.length - 1]
  }
  
  findByPath(path: string[]): ScopeDef | null {
    // Navigate from root following path
    let current = this.root()
    for (const segment of path) {
      current = current?.children.find(c => c.name === segment)
      if (!current) return null
    }
    return current
  }
}
```

## Effect-based Communication

The scope system communicates with other modules via Effects:

```typescript
// JSX -> Core
const registerScope = (scope: ScopeDef) => 
  Effect.gen(function* () {
    yield* CoreModule.registerScope(scope)
    
    // Check for conflicts
    const conflicts = yield* CoreModule.checkScopeConflicts(scope)
    if (conflicts.length > 0) {
      yield* Effect.fail(new ScopeConflictError(scope, conflicts))
    }
    
    // Notify CLI module if executable
    if (scope.executable) {
      yield* CLIModule.registerCommand(scope)
    }
  })

// Core -> JSX  
const shouldExecuteScope = (path: string[]) =>
  Effect.gen(function* () {
    const scope = yield* CoreModule.findScope(path)
    if (!scope) {
      return { execute: false, reason: 'not-found' }
    }
    
    if (!scope.executable) {
      return { execute: false, reason: 'not-executable' }
    }
    
    if (scope.handler) {
      return { execute: true, scope }
    }
    
    if (scope.defaultContent) {
      return { execute: true, scope, useDefault: true }
    }
    
    return { execute: false, reason: 'no-handler' }
  })
```

## Routing and Execution

When a command is parsed, the CLI module uses the scope system to route:

```typescript
const routeCommand = (parsedArgs: ParsedArgs) =>
  Effect.gen(function* () {
    const path = parsedArgs.command // e.g., ['pm', 'start']
    
    // Find scope
    const result = yield* shouldExecuteScope(path)
    
    if (!result.execute) {
      // Try to find parent with defaultContent
      const parentPath = path.slice(0, -1)
      const parentResult = yield* shouldExecuteScope(parentPath)
      
      if (parentResult.execute && parentResult.scope?.defaultContent) {
        // Show parent's default content (help, etc.)
        return yield* renderScope(parentResult.scope)
      }
      
      yield* Effect.fail(new CommandNotFoundError(path))
    }
    
    // Execute the scope
    if (result.useDefault) {
      return yield* renderScope(result.scope)
    } else {
      return yield* executeHandler(result.scope, parsedArgs)
    }
  })
```

## Nested Plugin Example

With this system, nested plugins work naturally:

```tsx
<Plugin name="pm">
  <Command name="start" handler={startHandler} />
  <Command name="stop" handler={stopHandler} />
  
  {/* Nested plugin creates a new scope */}
  <Plugin name="logs">
    <Command name="show" handler={showLogsHandler} />
    <Command name="tail" handler={tailLogsHandler} />
  </Plugin>
</Plugin>
```

This creates the scope hierarchy:
- `pm` (plugin, executable)
  - `start` (command, executable)
  - `stop` (command, executable)
  - `logs` (plugin, executable)
    - `show` (command, executable)
    - `tail` (command, executable)

Commands route naturally:
- `app pm` → Shows PM plugin default content or help
- `app pm start` → Executes start command
- `app pm logs` → Shows logs plugin default content or help
- `app pm logs show` → Executes show command

## Benefits

1. **Unified Context Management**: Single system for all hierarchical relationships
2. **Natural Nesting**: Plugins, commands, and components nest without special handling
3. **Effect Integration**: Clean boundaries between modules with type-safe communication
4. **Lifecycle Control**: Enter/exit hooks for resource management
5. **Collision Detection**: Can detect naming conflicts at registration time
6. **Dynamic Routing**: Path-based routing with fallback to parent default content
7. **Extensibility**: Plugins can add their own scope types and behaviors