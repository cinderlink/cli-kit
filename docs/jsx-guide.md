# JSX Guide for Tuix

This guide covers how to build terminal user interfaces using JSX with Tuix.

## Overview

Tuix provides a complete JSX runtime that allows you to build terminal applications using familiar React-like syntax. With JSX, you can create declarative UIs, manage state with runes, and build complex CLI applications.

## Getting Started

### Creating a New JSX Project

Use the `tuix init` command to create a new JSX-enabled project:

```bash
# Create a basic JSX app
tuix init my-app --template jsx

# Create a CLI app with JSX
tuix init my-cli --template cli

# Without JSX (traditional functional approach)
tuix init my-app --template basic --no-jsx
```

### Basic JSX App Structure

```tsx
#!/usr/bin/env bun

import { jsx } from "tuix/jsx-app"

function App() {
  return (
    <vstack>
      <text color="green" bold>Welcome to Tuix!</text>
      <text>Your first JSX terminal app</text>
    </vstack>
  )
}

jsx(App).catch(console.error)
```

## JSX Elements

### Layout Elements

```tsx
// Vertical stack (column layout)
<vstack>
  <text>Item 1</text>
  <text>Item 2</text>
</vstack>

// Horizontal stack (row layout)
<hstack>
  <text>Left</text>
  <text>Right</text>
</hstack>

// Generic div (acts like vstack)
<div>
  <text>Content</text>
</div>
```

### Text Elements

```tsx
// Basic text
<text>Hello World</text>

// Styled text with props
<text color="red" bold>Error Message</text>
<text color="green" italic>Success</text>
<text color="blue" underline>Link</text>

// Shorthand styled elements
<bold>Bold text</bold>
<italic>Italic text</italic>
<underline>Underlined text</underline>
<faint>Faint text</faint>

// Color shortcuts
<red>Red text</red>
<green>Green text</green>
<blue>Blue text</blue>
<yellow>Yellow text</yellow>
<cyan>Cyan text</cyan>
<magenta>Magenta text</magenta>
<white>White text</white>
<gray>Gray text</gray>

// Semantic colors
<error>Error message</error>
<success>Success message</success>
<warning>Warning message</warning>
<info>Info message</info>
```

### UI Components

```tsx
// Panel with border
<panel title="My Panel" border="rounded">
  <text>Panel content</text>
</panel>

// Buttons
<button variant="primary" onClick={() => console.log("Clicked!")}>
  Primary Button
</button>

<button variant="secondary">Secondary</button>
<button variant="success">Success</button>
<button variant="danger">Danger</button>

// Input fields (with rune binding)
const value = $state("")
<input bind:value={value} placeholder="Enter text" />
```

## State Management with Runes

Tuix uses Svelte-inspired runes for reactive state management:

```tsx
import { $state, $derived, $effect } from "tuix/runes"

function TodoApp() {
  const todos = $state([])
  const newTodo = $state("")
  const completedCount = $derived(() => 
    todos.filter(todo => todo.completed).length
  )
  
  $effect(() => {
    console.log(`Completed: ${completedCount()}`)
  })

  const addTodo = () => {
    if (newTodo.trim()) {
      todos.push({
        id: Date.now(),
        text: newTodo.trim(),
        completed: false
      })
      newTodo.$set("")
    }
  }

  return (
    <vstack>
      <text color="cyan" bold>Todo App</text>
      
      <hstack>
        <input 
          bind:value={newTodo} 
          placeholder="Enter new todo" 
        />
        <button variant="primary" onClick={addTodo}>
          Add
        </button>
      </hstack>
      
      <text>Completed: {completedCount()} / {todos.length}</text>
      
      <vstack>
        {todos.map(todo => (
          <hstack key={todo.id}>
            <text color={todo.completed ? "green" : "white"}>
              {todo.completed ? "✓" : "○"} {todo.text}
            </text>
          </hstack>
        ))}
      </vstack>
    </vstack>
  )
}
```

## Building CLI Applications

### Simple CLI Commands

```tsx
import { createJSXApp, jsxCommand } from "tuix/jsx-app"

const HelloCommand = ({ name }: { name?: string }) => (
  <vstack>
    <text color="green" bold>👋 Hello, {name || 'World'}!</text>
    <text>This is a JSX-based CLI command</text>
  </vstack>
)

const commands = {
  hello: jsxCommand('hello', (ctx) => <HelloCommand name={ctx.args.name} />)
}

// Usage: ./app.tsx hello --name John
```

### Advanced CLI with Plugins

```tsx
import { createJSXPlugin, createJSXApp } from "tuix/jsx-app"

// Create a plugin
const myPlugin = createJSXPlugin({
  name: "my-plugin",
  commands: {
    status: jsxCommand("status", () => (
      <panel title="System Status" border="rounded">
        <text color="green">✓ All systems operational</text>
      </panel>
    ))
  },
  onInit: () => {
    console.log("Plugin initialized!")
  }
})

// Main app with plugin
function App() {
  return (
    <vstack>
      <text color="blue" bold>My CLI App</text>
      <text>Run commands with: ./app.tsx <command></text>
    </vstack>
  )
}

createJSXApp(App, {
  name: "my-cli",
  plugins: [myPlugin]
})
```

## Project Structure

### Recommended File Organization

```
my-tuix-app/
├── app.tsx                 # Main application entry
├── components/            # Reusable JSX components
│   ├── UserList.tsx
│   ├── StatusPanel.tsx
│   └── index.ts
├── plugins/               # CLI plugins
│   ├── auth.tsx
│   ├── database.tsx
│   └── index.ts
├── utils/                 # Utilities and helpers
├── package.json
├── tsconfig.json
└── README.md
```

### Component Organization

```tsx
// components/UserList.tsx
export const UserList = ({ users }: { users: User[] }) => (
  <vstack>
    <text color="cyan" bold>Users ({users.length})</text>
    {users.map(user => (
      <hstack key={user.id}>
        <text color="green">•</text>
        <text>{user.name}</text>
        <text color="gray">({user.email})</text>
      </hstack>
    ))}
  </vstack>
)

// plugins/userPlugin.tsx
export const userPlugin = createJSXPlugin({
  name: "user-management",
  commands: {
    "list-users": jsxCommand("list-users", () => <UserList users={getUsers()} />),
    "add-user": jsxCommand("add-user", (ctx) => <AddUserForm {...ctx.args} />)
  }
})
```

## TypeScript Configuration

For JSX support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "tuix",
    "lib": ["ES2020", "DOM"],
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

## Best Practices

### Component Design

1. **Keep components focused**: Each component should have a single responsibility
2. **Use props for configuration**: Make components reusable with props
3. **Prefer composition**: Build complex UIs by composing smaller components

```tsx
// Good: Focused component
const StatusIndicator = ({ status }: { status: 'online' | 'offline' }) => (
  <text color={status === 'online' ? 'green' : 'red'}>
    {status === 'online' ? '🟢' : '🔴'} {status}
  </text>
)

// Good: Composition
const UserCard = ({ user }: { user: User }) => (
  <panel title={user.name} border="single">
    <vstack>
      <text>{user.email}</text>
      <StatusIndicator status={user.status} />
    </vstack>
  </panel>
)
```

### State Management

1. **Use $state for local component state**
2. **Use $derived for computed values**
3. **Use $effect for side effects**
4. **Create shared state modules for app-wide state**

```tsx
// Shared state module
export const appState = {
  user: $state(null as User | null),
  theme: $state('dark' as 'light' | 'dark'),
  isOnline: $state(true)
}

// Computed values
export const userDisplayName = $derived(() => 
  appState.user ? appState.user.name : 'Guest'
)
```

### Error Handling

```tsx
const SafeComponent = ({ data }: { data: unknown }) => {
  try {
    return (
      <vstack>
        <text>Data: {JSON.stringify(data)}</text>
      </vstack>
    )
  } catch (error) {
    return (
      <error>Failed to render data: {error.message}</error>
    )
  }
}
```

## Common Patterns

### Loading States

```tsx
const DataView = () => {
  const isLoading = $state(true)
  const data = $state(null)
  
  $effect(() => {
    fetchData().then(result => {
      data.$set(result)
      isLoading.$set(false)
    })
  })
  
  if (isLoading()) {
    return <text color="yellow">Loading...</text>
  }
  
  return (
    <vstack>
      {data() && <text>Data loaded: {data().length} items</text>}
    </vstack>
  )
}
```

### Conditional Rendering

```tsx
const ConditionalExample = () => {
  const showDetails = $state(false)
  
  return (
    <vstack>
      <button onClick={() => showDetails.$set(!showDetails())}>
        {showDetails() ? 'Hide' : 'Show'} Details
      </button>
      
      {showDetails() && (
        <panel title="Details" border="rounded">
          <text>Here are the details!</text>
        </panel>
      )}
    </vstack>
  )
}
```

### Lists and Iteration

```tsx
const TodoList = () => {
  const todos = $state([
    { id: 1, text: "Learn Tuix", done: false },
    { id: 2, text: "Build awesome CLI", done: true }
  ])
  
  return (
    <vstack>
      {todos.map(todo => (
        <hstack key={todo.id}>
          <text color={todo.done ? "green" : "white"}>
            {todo.done ? "✓" : "○"}
          </text>
          <text>{todo.text}</text>
        </hstack>
      ))}
    </vstack>
  )
}
```

## Examples

Check out these example applications:

- `examples/jsx-cli-demo.tsx` - Complete CLI application with plugins
- `examples/todo-jsx.tsx` - Todo app with state management
- `examples/dashboard-jsx.tsx` - Dashboard with real-time updates

## Next Steps

- Explore the [Component Reference](./components.md)
- Learn about [State Management](./state-management.md) 
- Check out [Plugin Development](./plugins.md)
- See [Advanced Patterns](./advanced-patterns.md)