# TUIX Scope System Architecture

## Overview

TUIX has two complementary scope implementations that serve different purposes:

1. **Core Scope System** (`src/core/scope.ts`) - Runtime scope management
2. **JSX Scope Component** (`src/jsx/scope.ts`) - UI rendering helpers

## Core Scope System

### Purpose
The core scope system provides:
- Hierarchical context management for plugins, commands, and components
- Stack-based scope tracking with parent-child relationships
- Path computation for command registration
- Effect-based operations for error handling

### Key Components

#### ScopeContext Interface
```typescript
interface ScopeContext {
  readonly id: string
  readonly type: 'plugin' | 'command' | 'component'
  readonly name: string
  readonly path: string[]
  parent?: ScopeContext
  children: ScopeContext[]
  metadata: Record<string, unknown>
}
```

#### ScopeStack Class
- Manages a stack of active scopes
- Maintains parent-child relationships
- Provides scope lookup by ID or path
- Tracks scope hierarchy for command registration

### Usage
```typescript
// Create and push a plugin scope
const pluginScope = createPluginScope('dev', { description: 'Dev tools' })
await Effect.runPromise(scopeStack.push(pluginScope))

// Create and push a command scope (inherits parent)
const commandScope = createCommandScope('build', { handler: buildHandler })
await Effect.runPromise(scopeStack.push(commandScope))

// Get full path: ['dev', 'build']
const path = scopeStack.current()?.path
```

## JSX Scope Component

### Purpose
The JSX scope component provides:
- Base component for CLI, Plugin, and Command components
- Automatic help text rendering
- Command discovery and organization
- UI-specific metadata handling

### Key Components

#### Scope Component
```typescript
interface ScopeProps {
  type: 'cli' | 'plugin' | 'command'
  name: string
  description?: string
  version?: string
  handler?: (ctx: any) => JSX.Element | View
  children?: JSX.Element | JSX.Element[]
  
  // UI-specific
  commands?: Record<string, any>
  args?: Record<string, any>
  flags?: Record<string, any>
  examples?: Array<{ example: string; description?: string }>
  help?: string
}
```

### Features
- Automatic help generation when no command is executed
- Command hierarchy visualization
- Example rendering
- Styled output for terminal display

## Integration Between Systems

### JSX Scope Integration (`src/core/jsx-scope-integration.ts`)
Bridges the two systems:
1. Processes JSX elements through the core scope system
2. Ensures commands register with correct hierarchical paths
3. Maintains scope context during JSX rendering

### CLI Component Integration
The updated CLI components use both systems:

```typescript
// Plugin component uses core scope for hierarchy
const scope = useScope({
  type: 'plugin',
  name,
  metadata: { description }
})

// Also leverages JSX scope for rendering
return <scope-provider value={scope}>
  <plugin name={name}>{children}</plugin>
</scope-provider>
```

## When to Use Each System

### Use Core Scope System When:
- Managing runtime plugin/command hierarchy
- Registering commands with proper paths
- Tracking scope relationships programmatically
- Implementing new scope-aware features

### Use JSX Scope Component When:
- Building CLI component UI
- Generating help text
- Rendering command hierarchy visually
- Handling interactive CLI features

## Benefits of Two Systems

1. **Separation of Concerns**
   - Core: Runtime state management
   - JSX: UI rendering and help generation

2. **Flexibility**
   - Core system can be used outside JSX context
   - JSX components can leverage rendering-specific features

3. **Performance**
   - Core system optimized for scope tracking
   - JSX system optimized for rendering

4. **Maintainability**
   - Clear boundaries between runtime and UI concerns
   - Easier to test each system independently

## Future Considerations

While the two systems could be merged, keeping them separate provides:
- Better modularity
- Clearer responsibilities
- Flexibility for different use cases

The integration layer (`jsx-scope-integration.ts`) ensures they work seamlessly together while maintaining their distinct purposes.