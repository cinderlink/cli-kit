# TUIX Scope System Usage Guide

## Overview

The TUIX scope system enables proper plugin nesting and hierarchical command registration in JSX-based CLI applications. This guide shows how to use the scope-aware components to build complex CLI structures.

## Basic Usage

### Creating Nested Plugins

```tsx
import { App, Plugin, Command } from 'tuix/cli'

export default jsx(() => (
  <App name="myapp" version="1.0.0">
    <Plugin name="dev" description="Development tools">
      <Command name="setup" handler={setupHandler} />
      
      <Plugin name="db" description="Database tools">
        <Command name="migrate" handler={migrateHandler} />
        <Command name="seed" handler={seedHandler} />
      </Plugin>
    </Plugin>
  </App>
))
```

This creates the following command structure:
- `myapp dev setup`
- `myapp dev db migrate`
- `myapp dev db seed`

## Components

### Plugin Component

The `Plugin` component creates a new scope for organizing related commands:

```tsx
<Plugin 
  name="tools"
  description="Development tools"
  version="1.0.0"
  hidden={false}
  onInit={async () => console.log('Plugin initialized')}
  onExit={async () => console.log('Plugin cleanup')}
>
  {/* Child commands and plugins */}
</Plugin>
```

**Props:**
- `name` (required): Plugin identifier used in command paths
- `description`: Help text description
- `version`: Plugin version
- `hidden`: Hide from help output
- `onInit`: Async initialization hook
- `onExit`: Async cleanup hook

### Command Component

The `Command` component is now scope-aware and automatically registers with the correct path:

```tsx
<Command
  name="build"
  description="Build the project"
  aliases={['b', 'compile']}
  handler={buildHandler}
  hidden={false}
>
  <Arg name="target" description="Build target" />
  <Option name="watch" type="boolean" description="Watch mode" />
</Command>
```

**Props:**
- `name` (required): Command name
- `description`: Help text
- `aliases`: Alternative names
- `handler`: Command implementation
- `hidden`: Hide from help

### App Component

The root `App` component remains unchanged but now properly manages the scope hierarchy:

```tsx
<App 
  name="myapp" 
  version="1.0.0"
  description="My CLI application"
>
  {/* Plugins and commands */}
</App>
```

## Advanced Usage

### Deep Nesting

Plugins can be nested arbitrarily deep:

```tsx
<Plugin name="project">
  <Plugin name="backend">
    <Plugin name="api">
      <Command name="generate" handler={generateApiHandler} />
      <Plugin name="docs">
        <Command name="build" handler={buildDocsHandler} />
      </Plugin>
    </Plugin>
  </Plugin>
</Plugin>
```

Creates:
- `myapp project backend api generate`
- `myapp project backend api docs build`

### Plugin Groups

Use `PluginGroup` for logical organization without affecting command paths:

```tsx
<PluginGroup name="utilities" description="Utility commands">
  <Plugin name="format">
    <Command name="code" handler={formatCodeHandler} />
  </Plugin>
  <Plugin name="lint">
    <Command name="check" handler={lintHandler} />
  </Plugin>
</PluginGroup>
```

### Manual Scope Management

For advanced use cases, you can manually manage scopes:

```tsx
import { ScopeProvider, useScope } from 'tuix/cli'

function CustomComponent() {
  const scope = useScope({
    type: 'component',
    name: 'custom',
    metadata: { /* custom data */ }
  })
  
  return (
    <ScopeProvider scope={scope}>
      {/* Scoped content */}
    </ScopeProvider>
  )
}
```

## Scope Hooks

### useScope

Create a scope context:

```typescript
const scope = useScope({
  type: 'plugin',
  name: 'myplugin',
  metadata: { version: '1.0.0' }
})
```

### useCurrentScope

Get the current active scope:

```typescript
const currentScope = useCurrentScope()
console.log('Current path:', currentScope?.path)
```

### useScopePath

Get the full scope path as an array:

```typescript
const path = useScopePath() // ['app', 'dev', 'build']
```

### useNearestScope

Find the nearest scope of a specific type:

```typescript
const pluginScope = useNearestScope('plugin')
const commandScope = useNearestScope('command')
```

## Best Practices

### 1. Use Semantic Plugin Names

Choose descriptive names that indicate the plugin's purpose:

```tsx
// Good
<Plugin name="database">
<Plugin name="auth">
<Plugin name="deployment">

// Avoid
<Plugin name="db">
<Plugin name="a">
<Plugin name="misc">
```

### 2. Group Related Commands

Keep related functionality together:

```tsx
<Plugin name="user" description="User management">
  <Command name="create" handler={createUser} />
  <Command name="update" handler={updateUser} />
  <Command name="delete" handler={deleteUser} />
  <Command name="list" handler={listUsers} />
</Plugin>
```

### 3. Consistent Nesting Depth

Avoid excessive nesting that makes commands hard to discover:

```tsx
// Good - 2-3 levels
myapp dev server start

// Avoid - too deep
myapp tools dev backend api v2 users create
```

### 4. Use Aliases for Common Commands

Provide shortcuts for frequently used commands:

```tsx
<Command 
  name="development" 
  aliases={['dev', 'd']}
  handler={devHandler}
/>
```

## Migration Guide

### From Non-Scoped Components

If you're migrating from the old CLI components:

**Before:**
```tsx
// Commands were manually registered
<Command name="start" handler={handler} />
// Had to manually track plugin context
```

**After:**
```tsx
// Commands automatically use scope
<Plugin name="pm">
  <Command name="start" handler={handler} />
</Plugin>
// Path is automatically "pm start"
```

### From Manual Registration

**Before:**
```typescript
cli.registerCommand(['pm', 'logs', 'show'], showHandler)
```

**After:**
```tsx
<Plugin name="pm">
  <Plugin name="logs">
    <Command name="show" handler={showHandler} />
  </Plugin>
</Plugin>
```

## Debugging

### View Scope Hierarchy

Use the debug helper to inspect the current scope state:

```typescript
import { debugScopeHierarchy } from 'tuix/cli'

// In your code
debugScopeHierarchy()
```

### Get Scope Statistics

```typescript
import { getScopeStack } from 'tuix/cli'

const stats = getScopeStack().getStats()
console.log('Total scopes:', stats.totalScopes)
console.log('Current depth:', stats.stackDepth)
console.log('Types:', stats.typeBreakdown)
```

## Examples

See the complete example at `examples/nested-plugins-demo.tsx` for a full demonstration of nested plugins with proper scope management.

## Troubleshooting

### Commands Not Found

If commands aren't being recognized:
1. Ensure plugins are properly nested in JSX
2. Check that command names don't have spaces
3. Verify handler functions are defined

### Scope Leakage

If commands appear in wrong plugins:
1. Ensure you're using the new Plugin/Command components
2. Check that you're not mixing old and new registration methods
3. Use `debugScopeHierarchy()` to inspect the scope state

### TypeScript Errors

Ensure you have:
1. `jsx-runtime.ts` at the project root
2. Correct `jsxImportSource` in tsconfig.json
3. Imported components from 'tuix/cli'