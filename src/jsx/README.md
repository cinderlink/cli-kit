# JSX

## Overview

The JSX module enables JSX/TSX syntax for building terminal user interfaces with Tuix. It provides a React-like developer experience with Svelte-inspired reactive bindings, allowing you to create dynamic CLI applications and interactive terminal UIs using familiar JSX syntax.

## Installation

```bash
# JSX is included with tuix
import { render, jsx } from 'tuix/jsx'
# Or use specific components
import { CLI, Command, Plugin } from 'tuix/jsx'
```

## Quick Start

```typescript
import { render } from 'tuix/jsx'

// Simple UI component
const MyApp = () => (
  <vstack gap={1}>
    <text>Welcome to Tuix!</text>
    <box style={{ padding: 1, border: 'single' }}>
      <text>This is a styled box</text>
    </box>
  </vstack>
)

// Render the app
await render(MyApp)
```

## Core Concepts

### JSX Runtime
Tuix uses a custom JSX runtime that transforms JSX elements into terminal View objects. It supports React's automatic JSX transform with `jsx` and `jsxs` functions.

### Reactive Bindings
Integrates with Svelte-style runes (`$state`, `$derived`, `$effect`) for reactive state management:

```tsx
const Counter = () => {
  const count = $state(0)
  
  return (
    <vstack>
      <text>Count: {count.value}</text>
      <button onClick={() => count.value++}>Increment</button>
    </vstack>
  )
}
```

### CLI Components
Special JSX components for building command-line interfaces:

```tsx
const MyCLI = () => (
  <cli name="myapp" version="1.0.0">
    <command name="greet" description="Greet someone">
      <arg name="name" required description="Name to greet" />
      <handler>{({args}) => `Hello, ${args.name}!`}</handler>
    </command>
  </cli>
)
```

### Layout Components
Built-in layout components for organizing UI elements:
- `<vstack>` - Vertical stack layout
- `<hstack>` - Horizontal stack layout  
- `<box>` - Flexible container with styling
- `<text>` - Text content
- `<styledText>` - Text with ANSI styling

## API Reference

### Core Functions

#### `render(component: JSX.Element | (() => JSX.Element)): Promise<void>`
Renders a JSX component to the terminal. Automatically detects CLI apps and delegates to appropriate runner.

#### `createJSXApp(component, config?): Promise<void>`
Creates and runs a complete JSX application with lifecycle management.

#### `jsx(type, props, key?): View`
Core JSX factory function that transforms JSX elements to View objects.

### Layout Components

#### `<vstack gap={number} align={'left'|'center'|'right'}>`
Vertical stack layout container.

#### `<hstack gap={number} align={'top'|'middle'|'bottom'}>`
Horizontal stack layout container.

#### `<box style={Style} padding={number} margin={number}>`
Flexible container with styling support.

#### `<text>{content}</text>`
Displays text content.

### CLI Components

#### `<cli name={string} version={string} description={string}>`
Root CLI application component.

#### `<command name={string} description={string} handler={Function}>`
Defines a CLI command.

#### `<arg name={string} type={Type} required={boolean} description={string}>`
Defines a command argument.

#### `<flag name={string} type={Type} description={string}>`
Defines a command flag/option.

### Reactive Hooks

#### `$state(initialValue): StateRune`
Creates reactive state.

#### `$derived(computation): DerivedRune`
Creates computed/derived state.

#### `$effect(callback): void`
Creates reactive side effect.

#### `$bindable(value): BindableRune`
Creates bindable prop for component communication.

### Lifecycle Hooks

#### `onMount(callback): void`
Runs when component mounts.

#### `onDestroy(callback): void`
Runs when component unmounts.

## Examples

### Interactive Counter
```tsx
import { render } from 'tuix/jsx'

const Counter = () => {
  const count = $state(0)
  
  $effect(() => {
    const interval = setInterval(() => count.value++, 1000)
    return () => clearInterval(interval)
  })
  
  return (
    <vstack align="center">
      <text>Auto Counter: {count.value}</text>
      <button onClick={() => count.value = 0}>Reset</button>
    </vstack>
  )
}

render(Counter)
```

### CLI Application
```tsx
import { render } from 'tuix/jsx'

const MyCLI = () => (
  <cli name="calculator" version="1.0.0" description="Simple calculator">
    <command name="add" description="Add two numbers">
      <arg name="a" type="number" required description="First number" />
      <arg name="b" type="number" required description="Second number" />
      <handler>
        {({ args }) => `Result: ${args.a + args.b}`}
      </handler>
    </command>
    
    <command name="multiply" description="Multiply two numbers">
      <arg name="a" type="number" required description="First number" />
      <arg name="b" type="number" required description="Second number" />
      <handler>
        {({ args }) => `Result: ${args.a * args.b}`}
      </handler>
    </command>
  </cli>
)

render(MyCLI)
```

### Dashboard with Plugins
```tsx
import { render } from 'tuix/jsx'

const Dashboard = () => (
  <cli name="dashboard" version="2.0.0">
    <plugin name="monitoring" />
    <plugin name="alerts" />
    
    <command name="status" description="Show system status">
      <handler>{() => 'System is running normally'}</handler>
    </command>
  </cli>
)

render(Dashboard)
```

## Integration

The JSX module integrates seamlessly with other Tuix modules:

- **Core**: JSX elements are transformed into View objects for rendering
- **CLI**: Special JSX components for building command-line interfaces
- **Styling**: Style props are applied to JSX elements automatically
- **Reactivity**: Svelte runes provide reactive state management
- **Plugins**: JSX components for plugin management and configuration
- **Layout**: Built-in layout components for flexible UI composition

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "tuix/jsx"
  }
}
```

### JSX Runtime Setup

Tuix automatically provides the JSX runtime. No additional setup required.

## Testing

```bash
# Run JSX tests
bun test src/jsx

# Test JSX runtime
bun test src/jsx/runtime.test.ts

# Test JSX integration
bun test src/jsx/integration.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT