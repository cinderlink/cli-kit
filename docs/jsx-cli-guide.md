# Tuix JSX CLI Guide: Svelte-like Command Line Applications

Tuix provides a Svelte-5-inspired JSX system for building command-line applications with reactive state management, lifecycle hooks, and Effect-based error handling. This guide explains how the JSX CLI system integrates with Tuix's core architecture.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [JSX CLI Components](#jsx-cli-components)
- [Svelte-like Runes](#svelte-like-runes)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Effect Integration](#effect-integration)
- [Command Patterns](#command-patterns)
- [Examples](#examples)

## Overview

The Tuix JSX CLI system provides:

- **Svelte-5-like Runes**: `$state`, `$derived`, `$effect`, `$bindable` for reactive state
- **Declarative Commands**: Define CLI commands using JSX components
- **Effect-based Architecture**: Leverages Effect.ts for error handling and async operations
- **MVU Pattern**: Model-View-Update architecture for complex command handlers
- **Lifecycle Hooks**: `onMount`, `onDestroy`, `beforeUpdate`, `afterUpdate`
- **Type-safe Schemas**: Zod integration for argument and option validation

### ⚠️ Important: Component Imports

When using TUIX JSX CLI components, you **must import the components explicitly**. The JSX transform treats uppercase elements as component references, not intrinsic elements:

```tsx
// ✅ Correct - Import CLI components
import { jsx, CLI, Plugin, Command, Flag, Arg } from 'tuix/jsx';

// ❌ Incorrect - Missing imports will cause "not defined" errors
// Just using <CLI> without importing won't work
```

## Core Concepts

### Architecture Overview

```
┌─────────────────────┐
│   JSX Components    │  <App>, <Command>, <Arg>, <Option>
├─────────────────────┤
│   Scope System      │  Command scoping, help generation
├─────────────────────┤
│  Reactivity Layer   │  $state, $derived, $effect runes
├─────────────────────┤
│   CLI Framework     │  CLIRunner, CLIRouter, CommandConfig
├─────────────────────┤
│   Effect Runtime    │  Error handling, async operations
└─────────────────────┘
```

### Quick Start

```tsx
#!/usr/bin/env bun
/** @jsxImportSource tuix */
import { jsx, CLI, Plugin, Command, Arg } from 'tuix/jsx'
import { Effect } from 'effect'

export default jsx(() => (
  <CLI name="my-cli" version="1.0.0">
    <Command name="hello" description="Say hello">
      <Arg name="name" description="Name to greet" />
      {({ args }) => Effect.succeed(`Hello, ${args.name}!`)}
    </Command>
  </CLI>
))
```

Run with: `bun my-cli.tsx hello World`

## JSX CLI Components

### CLI Component (or App)

The root component that defines your CLI application. Both `<CLI>` and `<App>` work - they're aliases:

```tsx
import { jsx, CLI } from 'tuix/jsx'

export default jsx(() => (
  <CLI 
    name="my-cli" 
    version="1.0.0"
    description="My CLI application"
  >
    {/* Commands go here */}
  </CLI>
))

// Or use <App> - it's the same:
<App name="my-cli">...</App>
```

### Command Component

Defines commands with automatic Zod schema generation:

```tsx
<Command 
  name="deploy"
  description="Deploy the application"
  aliases={["d", "push"]}
  hidden={false}
>
  <Arg name="environment" required type="string" />
  <Option name="force" alias="f" type="boolean" />
  
  {({ args, options }) => 
    Effect.gen(function* () {
      const result = yield* deploy(args.environment, options)
      return <Text color="green">Deployed to {args.environment}</Text>
    })
  }
</Command>
```

### Arg and Option Components

Define command arguments and options with validation:

```tsx
// Positional argument
<Arg 
  name="file"
  description="Input file"
  required
  type="string"
  validate={(value) => value.endsWith('.json') || "Must be a JSON file"}
/>

// Command option/flag
<Option
  name="verbose"
  alias="v"
  description="Verbose output"
  type="boolean"
  default={false}
/>
```

## Svelte-like Runes

Tuix implements Svelte-5-inspired runes for reactive state management:

### $state - Reactive State

```tsx
const Counter = () => {
  const count = $state(0)
  
  return (
    <Box>
      <Text>Count: {count()}</Text>
      <Button onClick={() => count.$set(count() + 1)}>Increment</Button>
    </Box>
  )
}
```

### $derived - Computed Values

```tsx
const TodoList = ({ todos }) => {
  const completed = $derived(() => 
    todos().filter(t => t.done).length
  )
  
  return <Text>Completed: {completed()}/{todos().length}</Text>
}
```

### $effect - Side Effects

```tsx
const Logger = ({ message }) => {
  $effect(() => {
    console.log('Message changed:', message())
    return () => console.log('Cleanup')
  })
  
  return <Text>{message()}</Text>
}
```

### $bindable - Two-way Binding

```tsx
const Form = () => {
  const name = $bindable('')
  
  return (
    <Box>
      <TextInput bind:value={name} />
      <Text>Hello, {name()}!</Text>
    </Box>
  )
}
```
    
## Lifecycle Hooks

Components support lifecycle hooks for setup and cleanup:

```tsx
const MonitoringCommand = () => {
  const metrics = $state({ cpu: 0, memory: 0 })
  let interval: Timer
  
  onMount(() => {
    console.log('Starting monitoring...')
    interval = setInterval(updateMetrics, 1000)
  })
  
  onDestroy(() => {
    console.log('Stopping monitoring...')
    clearInterval(interval)
  })
  
  beforeUpdate(() => {
    console.log('About to update')
  })
  
  afterUpdate(() => {
    console.log('Update complete')
  })
  
  return (
    <Box>
      <Text>CPU: {metrics.value.cpu}%</Text>
      <Text>Memory: {metrics.value.memory}%</Text>
    </Box>
  )
}
```

## Effect Integration

The CLI system is built on Effect.ts for robust error handling:

### Command Handlers with Effect

```tsx
<Command name="fetch-data">
  {() => Effect.gen(function* () {
    const data = yield* fetchFromAPI()
    const processed = yield* processData(data)
    return <Text>Processed {processed.length} items</Text>
  }).pipe(
    Effect.catchTag('NetworkError', (e) => 
      Effect.succeed(<Text color="red">Network error: {e.message}</Text>)
    )
  )}
</Command>
```

### Service Dependencies

```tsx
const DatabaseCommand = () => {
  return Effect.gen(function* () {
    const db = yield* Effect.service(DatabaseService)
    const results = yield* db.query('SELECT * FROM users')
    
    return (
      <Table data={results} columns={['id', 'name', 'email']} />
    )
  })
}
```

### Error Boundaries

```tsx
const SafeCommand = ({ children }) => {
  return Effect.catchAll(
    children,
    (error) => Effect.succeed(
      <Box borderStyle="round" borderColor="red">
        <Text color="red">Error: {error.message}</Text>
        <Text>Please try again or contact support</Text>
      </Box>
    )
  )
}
```

## Command Patterns

### MVU Pattern for Complex Commands

Use Model-View-Update for stateful commands:

```tsx
type Model = {
  items: string[]
  filter: string
  selected: number
}

type Msg = 
  | { type: 'Filter', value: string }
  | { type: 'Select', index: number }
  | { type: 'Delete' }

const TodoCommand = (): UIComponent<Model, Msg> => ({
  init: Effect.succeed([{ items: [], filter: '', selected: 0 }, []]),
  
  update: (msg, model) => Effect.gen(function* () {
    switch (msg.type) {
      case 'Filter':
        return [{ ...model, filter: msg.value }, []]
      case 'Select':
        return [{ ...model, selected: msg.index }, []]
      case 'Delete':
        const items = model.items.filter((_, i) => i !== model.selected)
        return [{ ...model, items }, []]
    }
  }),
  
  view: (model) => (
    <Box>
      <TextInput 
        value={model.filter}
        onChange={(v) => ({ type: 'Filter', value: v })}
      />
      <List
        items={model.items.filter(i => i.includes(model.filter))}
        selected={model.selected}
        onSelect={(i) => ({ type: 'Select', index: i })}
      />
    </Box>
  ),
  
  handleKey: (key) => {
    if (key.name === 'd') return { type: 'Delete' }
    return null
  }
})
```

### Nested Commands

Create hierarchical command structures:

```tsx
<App name="git-like">
  <Command name="remote" description="Manage remotes">
    <Command name="add" description="Add a remote">
      <Arg name="name" required />
      <Arg name="url" required />
      {({ args }) => Effect.succeed(
        `Added remote '${args.name}' -> ${args.url}`
      )}
    </Command>
    
    <Command name="remove" description="Remove a remote">
      <Arg name="name" required />
      {({ args }) => Effect.succeed(
        `Removed remote '${args.name}'`
      )}
    </Command>
  </Command>
</App>
```

### Command Scoping and Help Generation

#### The Scope Component

The `Scope` component is the foundation for CLI, Plugin, and Command components. It provides:

1. **Command Hierarchy Management**: Tracks parent-child relationships
2. **Automatic Help Generation**: Shows help when no command is executed
3. **Context Management**: Provides scoping for nested commands

```tsx
import { Scope, getCurrentScope, generateScopeHelp } from 'tuix/jsx/scope'

// The Scope component manages command context
const scope = {
  type: 'cli',
  name: 'myapp',
  description: 'My application',
  commands: {},
  args: {},
  flags: {},
  examples: [],
  hasExecuted: false
}

// CLI, Plugin, and Command internally use Scope
<Scope type="cli" name="myapp" description="My CLI app">
  {/* Child commands are registered in this scope */}
</Scope>
```

#### Automatic Help Rendering

When a CLI, Plugin, or Command has no handler executed and no child command matches, it automatically renders help:

```tsx
// Empty CLI shows help automatically
<CLI name="myapp" description="My application" version="1.0.0">
  {/* No commands - will show help */}
</CLI>

// Plugin with commands but no match shows help
<Plugin name="database" description="Database operations">
  <Command name="migrate" handler={...} />
  <Command name="seed" handler={...} />
  {/* Running 'myapp database' with no subcommand shows help */}
</Plugin>
```

#### How Scoping Works

1. **CLI Level**: When no command is provided, shows all available top-level commands
2. **Plugin Level**: When a plugin name is provided but no subcommand, shows plugin commands
3. **Command Level**: When a command has subcommands but none specified, shows subcommand help

The scoping is managed internally by the JSX runtime's plugin registry which tracks:
- Command hierarchy (parent-child relationships)
- Current context stack
- Available commands at each level

```tsx
// Example: Nested command structure
<CLI name="myapp">
  <Plugin name="db" description="Database commands">
    <Command name="migrate" handler={...} />
    <Command name="seed" handler={...} />
  </Plugin>
</CLI>

// Running 'myapp' shows:
// - Available commands: db

// Running 'myapp db' shows:
// - Database commands
// - Available commands: migrate, seed

// Running 'myapp db migrate' executes the migrate handler
```

### Built-in Help Command

Automatic help text is provided via the built-in help command:

```tsx
import { Help } from 'tuix/cli'

// In your command handler
{({ config, command }) => (
  <Help config={config} command={command} />
)}

// Custom styled help
<Help 
  config={config}
  styles={{
    title: style().bold().foreground(Colors.cyan),
    command: style().foreground(Colors.green),
    description: style().foreground(Colors.gray)
  }}
/>
```

## Examples

### Complete CLI Application

```tsx
#!/usr/bin/env bun
import { jsx, App, Command, Arg, Option } from 'tuix/cli'
import { Effect } from 'effect'
import { Box, Text, Table, List } from 'tuix/components'
import { $state, $derived, $effect } from 'tuix/runes'

export default jsx(() => (
  <App name="todo" version="1.0.0" description="Todo list manager">
    <Command name="add" description="Add a new todo">
      <Arg name="task" description="Task description" required />
      <Option name="priority" alias="p" type="string" default="medium" />
      
      {({ args, options }) => Effect.gen(function* () {
        const db = yield* TodoDatabase
        yield* db.add({ task: args.task, priority: options.priority })
        return `Added: ${args.task}`
      })}
    </Command>
    
    <Command name="list" description="List todos">
      <Option name="filter" alias="f" type="string" />
      <Option name="interactive" alias="i" type="boolean" />
      
      {({ options }) => {
        if (options.interactive) {
          return <InteractiveTodoList filter={options.filter} />
        }
        
        return Effect.gen(function* () {
          const db = yield* TodoDatabase
          const todos = yield* db.list(options.filter)
          
          return (
            <Table
              data={todos}
              columns={['id', 'task', 'priority', 'status']}
            />
          )
        })
      }}
    </Command>
  </App>
))
```

### Interactive Todo List Component

```tsx
const InteractiveTodoList = ({ filter }) => {
  const todos = $state([])
  const selected = $state(0)
  const filtered = $derived(() => 
    todos.value.filter(t => 
      !filter || t.task.includes(filter)
    )
  )
  
  onMount(() => {
    Effect.runPromise(
      Effect.gen(function* () {
        const db = yield* TodoDatabase
        const items = yield* db.list()
        todos.value = items
      })
    )
  })
  
  const handleKey = (key) => {
    switch (key.name) {
      case 'up':
        selected.value = Math.max(0, selected.value - 1)
        break
      case 'down':
        selected.value = Math.min(filtered.value.length - 1, selected.value + 1)
        break
      case 'd':
        const todo = filtered.value[selected.value]
        if (todo) {
          Effect.runPromise(
            Effect.gen(function* () {
              const db = yield* TodoDatabase
              yield* db.delete(todo.id)
              todos.value = todos.value.filter(t => t.id !== todo.id)
            })
          )
        }
        break
    }
  }
  
  $effect(() => {
    const handler = (key) => handleKey(key)
    process.stdin.on('keypress', handler)
    return () => process.stdin.off('keypress', handler)
  })
  
  return (
    <Box borderStyle="round">
      <Text bold>Todo List (↑/↓ to navigate, d to delete)</Text>
      <List
        items={filtered.value.map(t => t.task)}
        selected={selected.value}
      />
    </Box>
  )
}
```

### Using with Plugins

Integrate with the plugin system:

```tsx
import { definePlugin } from 'tuix/cli/plugin'
import { z } from 'zod'

const MyPlugin = definePlugin({
  name: 'myplugin',
  version: '1.0.0',
  commands: {
    'hello': {
      description: 'Say hello',
      args: {
        name: z.string().describe('Name to greet')
      },
      handler: ({ args }) => Effect.succeed(`Hello, ${args.name}!`)
    }
  }
})

// Register in JSX
<App name="my-app">
  <Command name="plugin" description="Plugin commands">
    {Object.entries(MyPlugin.commands).map(([name, cmd]) => (
      <Command key={name} name={name} description={cmd.description}>
        {cmd.handler}
      </Command>
    ))}
  </Command>
</App>
```

### Advanced Patterns

#### Service Layer Integration

```tsx
// Define services
const DatabaseService = Service.Tag<DatabaseService>()
const ConfigService = Service.Tag<ConfigService>()

// Use in commands
<Command name="backup">
  {() => Effect.gen(function* () {
    const db = yield* DatabaseService
    const config = yield* ConfigService
    const backup = yield* db.backup(config.backupPath)
    return `Backup completed: ${backup.filename}`
  }).pipe(
    Effect.provide(AppServices)
  )}
</Command>
```

#### Composition with Layers

```tsx
const AppLayer = Layer.merge(
  DatabaseLayer,
  ConfigLayer,
  LoggerLayer
)

export default jsx(() => (
  <App name="my-app">
    {/* Commands here */}
  </App>
)).pipe(
  Effect.provide(AppLayer)
)
```

## Relationship with Core Systems

### CLI System Architecture

The JSX CLI components integrate with Tuix's core CLI system:

1. **JSX Components** → Generate `CommandConfig` objects
2. **App Component** → Creates `CLIConfig` with all commands
3. **CLIRunner** → Parses arguments and routes to handlers
4. **Effect Runtime** → Executes handlers with error handling

### Reactivity Integration

- **Runes** work within command handlers and UI components
- **Lifecycle hooks** manage setup/cleanup for interactive commands
- **Effect integration** provides async operations and error handling

### Type Safety

- **Zod schemas** generated from Arg/Option components
- **TypeScript inference** for command handlers
- **Compile-time validation** of command structure

## Best Practices

### 1. Use Effect for All Async Operations

```tsx
// ✅ Good
{() => Effect.gen(function* () {
  const result = yield* fetchData()
  return <Text>{result}</Text>
})}

// ❌ Bad
{async () => {
  const result = await fetchData()
  return <Text>{result}</Text>
}}
```

### 2. Leverage Runes for State Management

```tsx
// ✅ Good - Reactive state
const count = $state(0)
const doubled = $derived(() => count.value * 2)

// ❌ Bad - Manual state
let count = 0
const doubled = count * 2
```

### 3. Use Lifecycle Hooks for Cleanup

```tsx
// ✅ Good
onMount(() => {
  const interval = setInterval(update, 1000)
  onDestroy(() => clearInterval(interval))
})

// ❌ Bad
setInterval(update, 1000) // No cleanup!
```

### 4. Structure Commands Hierarchically

```tsx
// ✅ Good - Logical grouping
<App name="myapp">
  <Command name="db">
    <Command name="migrate" />
    <Command name="seed" />
  </Command>
  <Command name="cache">
    <Command name="clear" />
    <Command name="warm" />
  </Command>
</App>

// ❌ Bad - Flat structure
<App name="myapp">
  <Command name="db-migrate" />
  <Command name="db-seed" />
  <Command name="cache-clear" />
  <Command name="cache-warm" />
</App>
```

## Summary

The Tuix JSX CLI system provides a Svelte-like development experience for building command-line applications:

- **Declarative Commands**: Define CLI structure with JSX components
- **Reactive State**: Use `$state`, `$derived`, `$effect` runes
- **Effect Integration**: Robust error handling and async operations
- **Type Safety**: Automatic Zod schema generation and TypeScript inference
- **Lifecycle Management**: Setup and cleanup with lifecycle hooks
- **MVU Architecture**: Model-View-Update pattern for complex commands

This approach combines the best of React/Svelte component models with Effect.ts for building maintainable, type-safe CLI applications.

## Next Steps

- Explore [jsx-cli-demo.tsx](../examples/jsx-cli-demo.tsx) for a working example
- Read the [JSX Guide](./jsx-guide.md) for component development
- Check the [Lifecycle Documentation](./LIFECYCLE.md) for detailed hook information
- See [Runes Documentation](../src/reactivity/runes.ts) for reactive state details

The JSX CLI system brings the ergonomics of modern web frameworks to command-line application development!