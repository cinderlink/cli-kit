# TUIX 🎨

A comprehensive TypeScript framework for building modern command-line applications and terminal user interfaces. Built with [Effect.ts](https://effect.website/) for functional programming and featuring JSX support with [Svelte](https://svelte.dev/)-inspired reactive state management through runes.

## ✨ Features

- 🎯 **Declarative CLI with JSX**: Define complex command structures using intuitive JSX syntax
- 🧩 **JSX Terminal Components**: React-like syntax with [Svelte](https://svelte.dev/)-inspired runes for reactive terminal UIs
- 🌊 **Stream Components**: Powerful stream handling with Effect.ts for real-time data processing
- 🎨 **Rich Styling System**: Colors, gradients, borders, and advanced styling
- ⌨️ **Input & Mouse Handling**: Comprehensive event processing
- 🔌 **Plugin System**: Built-in plugins for logging, process management, and more
- ⚡ **Performance Optimized**: Lazy loading, caching, and efficient rendering
- 📱 **Responsive Layouts**: Adaptive designs for any terminal size
- 🔄 **Effect.ts Integration**: Functional programming with proper error handling

## 🚀 Quick Start

### Installation

```bash
bun add tuix
```

### Create Your First CLI App

```tsx
#!/usr/bin/env bun
import { jsx, JSXApp } from "tuix/jsx"
import { CLI, Command, Arg, Option } from "tuix/cli"

// Create a JSX CLI app
const app = new JSXApp()
  .command(
    <CLI command="myapp" description="My awesome CLI" version="1.0.0">
      <Command 
        name="hello" 
        description="Say hello"
        handler={() => jsx("text", { style: { color: "green" } }, "Hello, World! 🎉")}
      />
      
      <Command name="greet" description="Greet someone">
        <Arg name="name" description="Person to greet" required />
        <Option name="loud" description="Shout the greeting" alias="l" type="boolean" />
        
        <Command handler={(ctx) => jsx("text", { style: { color: "blue" } },
          ctx.flags.loud ? `HELLO ${ctx.args.name.toUpperCase()}!` : `Hello ${ctx.args.name}`
        )} />
      </Command>
    </CLI>
  )

// Run the app
await app.run()
```

Run your CLI:
```bash
./my-cli hello                    # Shows: Hello, World! 🎉
./my-cli greet Alice              # Shows: Hello Alice
./my-cli greet Alice --loud       # Shows: HELLO ALICE!
./my-cli help                     # Shows available commands
```

### Module Imports

TUIX exports are organized for optimal tree-shaking and type safety:

```typescript
// Main exports - core framework
import { Effect, Component, runApp, Runtime, View } from 'tuix'

// Core view primitives
import { text, vstack, hstack, box, empty } from 'tuix'

// JSX runtime and components
import { jsx, JSXApp, render } from 'tuix/jsx'

// UI Components
import { TextInput, Button, List, Table, Tabs } from 'tuix'

// CLI framework
import { runCLI, defineConfig, CLIRunner } from 'tuix/cli'
import { CLI, Command, Arg, Option } from 'tuix/cli' // JSX components

// Process management
import { ProcessManager } from 'tuix/process-manager'

// Logger
import { logger, createLogger } from 'tuix/logger'

// Configuration system
import { loadConfig, configSchema } from 'tuix/config'

// Plugin system  
import { definePlugin, PluginManager } from 'tuix/plugins'

// Testing utilities
import { createTestHarness } from 'tuix/testing'

// Reactivity (Svelte-inspired runes)
import { $state, $derived, $bindable } from 'tuix'
```

### Create Your First CLI

```typescript
import { runCLI, defineConfig } from 'tuix/cli'
import { z } from 'zod'

const config = defineConfig({
  name: 'my-app',
  version: '1.0.0',
  description: 'My awesome CLI application',
  commands: {
    hello: {
      description: 'Say hello to someone',
      args: {
        name: z.string().describe('Name to greet')
      },
      handler: async ({ args }) => {
        console.log(`Hello, ${args.name}!`)
      }
    }
  }
})

await runCLI(config)
```

### JSX Terminal UI with Runes

```tsx
import { jsx, $state } from 'tuix'

const MyComponent = ({ name }: { name: string }) => {
  let clickCount = $state(0)
  
  return jsx('box', { padding: 2 },
    jsx('text', { style: { color: 'cyan', bold: true } }, 
      `Welcome to TUIX, ${name}! 🎉`
    ),
    jsx('text', null, `Clicked ${clickCount()} times`),
    jsx('text', { style: { color: 'gray' } }, 
      'Press Enter to increment'
    )
  )
}
```

### Advanced TUI Application with MVU

```typescript
import { Component, runApp, Effect, View, text, vstack } from "tuix"

interface Model {
  readonly count: number
  readonly lastAction: string
}

type Msg = 
  | { readonly type: "increment" }
  | { readonly type: "decrement" }
  | { readonly type: "reset" }

const counterApp: Component<Model, Msg> = {
  init: Effect.succeed([{ count: 0, lastAction: 'Started' }, []]),
  
  update: (msg: Msg, model: Model) => {
    switch (msg.type) {
      case "increment":
        return Effect.succeed([{ count: model.count + 1, lastAction: 'Incremented' }, []])
      case "decrement":
        return Effect.succeed([{ count: model.count - 1, lastAction: 'Decremented' }, []])
      case "reset":
        return Effect.succeed([{ count: 0, lastAction: 'Reset' }, []])
    }
  },
  
  view: (model: Model) => vstack(
    text('TUIX Counter 🎯'),
    text(`Count: ${model.count}`),
    text(`Last action: ${model.lastAction}`),
    text(''),
    text('Controls:'),
    text('  [+] Increment  [-] Decrement  [r] Reset  [q] Quit')
  ),
  
  subscriptions: (model: Model) => Effect.succeed({
    // Keyboard subscriptions would be handled through the terminal service
    keys: ['increment', 'decrement', 'reset', 'quit']
  })
}

// Run the application
await Effect.runPromise(runApp(counterApp))
```

## 🏗️ Architecture

TUIX provides two complementary approaches:

### 1. CLI Framework
Type-safe command-line applications with argument parsing, validation, and plugins:

```
┌─────────────┐    Parse     ┌─────────────┐    Route     ┌─────────────┐
│   Raw Args  │ ──────────► │ Parsed Args │ ──────────► │   Handler   │
└─────────────┘             └─────────────┘             └─────────────┘
                                   │                            │
                                   ▼                            ▼
                            ┌─────────────┐            ┌─────────────┐
                            │ Validation  │            │   Result    │
                            │  (Zod)      │            │ (Any Type)  │
                            └─────────────┘            └─────────────┘
```

### 2. TUI Framework  
Interactive terminal applications following the **Model-View-Update (MVU)** pattern:

```
┌─────────────┐    Messages    ┌─────────────┐
│    View     │ ──────────────► │   Update    │
│   (JSX)     │                 │ (Pure Fn)   │
│             │ ◄────────────── │             │
└─────────────┘    New Model   └─────────────┘
       │                              │
       │                              │
       ▼                              ▼
┌─────────────┐                ┌─────────────┐
│   Render    │                │    Model    │
│  Terminal   │                │   State     │
└─────────────┘                └─────────────┘
                                      │
                                      │
┌─────────────┐                      │
│ Subscriptions│ ◄────────────────────┘
│ (Input/Time) │
└─────────────┘
```

Both frameworks are powered by **Effect.ts** for functional programming, error handling, and resource management, with **[Svelte](https://svelte.dev/)-inspired runes** providing reactive state management.

### Model-View-Update (MVU) Pattern

The MVU pattern provides a predictable way to build interactive terminal applications:

- **Model**: Your application's state as an immutable data structure
- **View**: A pure function that transforms the model into terminal output
- **Update**: A pure function that handles messages and returns a new model

Enhanced with Effect.ts:
- **Commands**: Side effects that produce messages (HTTP requests, file I/O, etc.)
- **Subscriptions**: Continuous streams of events (keyboard input, timers, etc.)
- **Type Safety**: Full type inference throughout the entire application
- **Error Handling**: Comprehensive error types with recovery strategies

```typescript
import { Component, runApp, Effect, View, Cmd, Sub } from 'tuix'

// 1. Define your Model (state)
type Model = {
  todos: Todo[]
  input: string
  filter: 'all' | 'active' | 'completed'
}

// 2. Define your Messages (events)
type Msg = 
  | { type: 'add' }
  | { type: 'toggle'; id: string }
  | { type: 'updateInput'; value: string }
  | { type: 'setFilter'; filter: Model['filter'] }

// 3. Create your Component
const todoApp: Component<Model, Msg> = {
  // Initialize with commands
  init: Effect.succeed([
    { todos: [], input: '', filter: 'all' },
    [Cmd.loadTodos()]  // Load todos from storage
  ]),
  
  // Handle messages and update state
  update: (msg, model) => {
    switch (msg.type) {
      case 'add':
        const newTodo = { id: Date.now().toString(), text: model.input, done: false }
        return Effect.succeed([
          { ...model, todos: [...model.todos, newTodo], input: '' },
          [Cmd.saveTodos([...model.todos, newTodo])]  // Save to storage
        ])
      // ... handle other messages
    }
  },
  
  // Render the UI
  view: (model) => View.vstack(
    View.text('Todo List'),
    View.input(model.input, (value) => ({ type: 'updateInput', value })),
    ...model.todos.map(todo => 
      View.checkbox(todo.done, () => ({ type: 'toggle', id: todo.id }))
    )
  ),
  
  // Subscribe to external events
  subscriptions: (model) => Sub.batch([
    Sub.onKey('ctrl+a', { type: 'add' }),
    Sub.interval(60000, { type: 'autosave' })
  ])
}

// Run the app with Effect.ts
await Effect.runPromise(runApp(todoApp))
```

## 🧩 JSX Components

TUIX provides JSX support for building declarative terminal UIs with reactive state management.

### Basic JSX Elements

```tsx
import { jsx } from 'tuix/jsx'

// Basic text elements
jsx('text', { style: { color: 'blue', bold: true } }, 'Hello World')

// Layout containers
jsx('vstack', { gap: 1 },
  jsx('text', null, 'First line'),
  jsx('text', null, 'Second line')
)

jsx('hstack', null,
  jsx('text', null, 'Left'),
  jsx('text', null, 'Right')
)

// Styled containers
jsx('box', { padding: 2, style: { border: '1px solid cyan' } },
  jsx('text', null, 'Boxed content')
)
```

### Process Management

```tsx
import { ProcessManager } from 'tuix/process-manager'

// Spawn and manage processes
const processManager = new ProcessManager()

await processManager.spawn('npm', ['test'], {
  stdio: 'inherit',
  shell: true
})
```

## 🎮 Interactive Applications

TUIX supports building interactive terminal applications using the MVU (Model-View-Update) pattern.

### Basic Interactive App

```tsx
import { Component, runApp, Effect } from 'tuix'

interface AppModel {
  message: string
  counter: number
}

type AppMsg = 
  | { type: 'increment' }
  | { type: 'decrement' }

const app: Component<AppModel, AppMsg> = {
  init: Effect.succeed([{ message: 'Hello TUIX!', counter: 0 }, []]),
  
  update: (msg, model) => {
    switch (msg.type) {
      case 'increment':
        return Effect.succeed([{ ...model, counter: model.counter + 1 }, []])
      case 'decrement':
        return Effect.succeed([{ ...model, counter: model.counter - 1 }, []])
    }
  },
  
  view: (model) => jsx('vstack', null,
    jsx('text', null, model.message),
    jsx('text', null, `Counter: ${model.counter}`),
    jsx('text', { style: { color: 'gray' } }, 'Press +/- to change, q to quit')
  )
}

await Effect.runPromise(runApp(app))
```

### CLI with Interactive Commands

```tsx
import { JSXApp } from 'tuix/jsx'
import { CLI, Command } from 'tuix/cli'

const app = new JSXApp()
  .command(
    <CLI command="myapp" description="Interactive CLI app">
      <Command 
        name="monitor" 
        description="Monitor system resources"
        handler={() => {
          // This would start an interactive monitoring session
          return jsx('text', { style: { color: 'green' } }, 'Monitoring started...')
        }}
      />
    </CLI>
  )
```

## 🧩 JSX Components

### Available Components

```tsx
import { TextInput, Button, List, Table, Tabs } from 'tuix'
import { jsx } from 'tuix/jsx'

// Text Input Component
const MyForm = () => {
  let inputValue = $state('')
  
  return jsx('vstack', null,
    jsx(TextInput, {
      value: inputValue(),
      onChange: (value) => inputValue.set(value),
      placeholder: 'Enter text...'
    }),
    jsx('text', null, `You typed: ${inputValue()}`)
  )
}

// List Component
const MyList = () => {
  let selectedIndex = $state(0)
  const items = ['Option 1', 'Option 2', 'Option 3']
  
  return jsx(List, {
    items,
    selectedIndex: selectedIndex(),
    onSelect: (index) => selectedIndex.set(index)
  })
}

// Table Component
const MyTable = () => {
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 }
  ]
  
  return jsx(Table, {
    data,
    columns: [
      { key: 'name', title: 'Name' },
      { key: 'age', title: 'Age' }
    ]
  })
}

// Tabs Component
const MyTabs = () => {
  let activeTab = $state(0)
  
  return jsx(Tabs, {
    activeTab: activeTab(),
    onTabChange: (index) => activeTab.set(index),
    tabs: [
      { title: 'Tab 1', content: jsx('text', null, 'Content 1') },
      { title: 'Tab 2', content: jsx('text', null, 'Content 2') }
    ]
  })
}
```

### Component Status

- ✅ **TextInput**: Interactive text input with validation
- ✅ **Button**: Clickable buttons with styling  
- ✅ **List**: Selectable lists with keyboard navigation
- ✅ **Table**: Data tables with column configuration
- ✅ **Tabs**: Tab navigation interface
- 🚧 **Modal**: Dialog boxes (in development)
- 🚧 **FilePicker**: File selection (in development)
- 🚧 **Viewport**: Scrollable areas (in development)

## 🎨 Styling System

TUIX provides a comprehensive styling system with multiple approaches:

### JSX Style Props

```tsx
import { jsx } from 'tuix/jsx'

// Direct styling through jsx
jsx('text', { 
  style: { 
    color: 'blue', 
    backgroundColor: 'white',
    bold: true,
    italic: true,
    underline: true
  } 
}, 'Styled text')

// Layout with styling
jsx('box', {
  padding: 2,
  style: {
    border: '1px solid cyan',
    backgroundColor: '#1a1a1a'
  }
}, jsx('text', { style: { color: 'white' } }, 'Boxed content'))
```

### Color System

```tsx
import { jsx } from 'tuix/jsx'

// Standard ANSI colors
jsx('text', { style: { color: 'red' } }, 'Red text')
jsx('text', { style: { color: 'brightCyan' } }, 'Bright cyan text')

// RGB colors
jsx('text', { style: { color: 'rgb(255, 100, 50)' } }, 'Custom RGB')

// Hex colors  
jsx('text', { style: { color: '#ff6432' } }, 'Hex color')

// Background colors
jsx('text', { 
  style: { 
    color: 'white', 
    backgroundColor: 'blue' 
  } 
}, 'Blue background')
```

### Layout and Borders

```tsx
// Layout containers
jsx('vstack', { gap: 1 },
  jsx('text', null, 'First line'),
  jsx('text', null, 'Second line')
)

jsx('hstack', { gap: 2 },
  jsx('text', null, 'Left'),
  jsx('text', null, 'Right')
)

// Box with padding
jsx('box', { padding: 2 },
  jsx('text', null, 'Padded content')
)
```

### Core Styling

```typescript
import { text, vstack, hstack, box } from 'tuix'

// Using core view primitives directly
const styledView = vstack(
  text('Title'),
  box(text('Boxed content')),
  hstack(
    text('Left'),
    text('Right')
  )
)
```

### Available Colors

```typescript
// Standard ANSI colors
'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'

// Bright variants
'brightBlack', 'brightRed', 'brightGreen', 'brightYellow'
'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'

// Extended colors
'gray', 'darkGray', 'lightGray'

// True color support
'rgb(255, 100, 50)'
'#ff6432'
'hsl(120, 50%, 75%)'
```

## 🔄 Reactive State with Runes

TUIX features a reactive state management system inspired by [Svelte 5's runes](https://svelte.dev/docs/svelte/what-are-runes). This provides a simple, powerful way to manage reactive state in terminal applications.

### Svelte-Inspired Runes

```tsx
import { $state, $derived, $bindable, jsx } from 'tuix'

// Reactive state (like Svelte's $state)
let count = $state(0)
let name = $state('World')

// Derived values (like Svelte's $derived)
let greeting = $derived(() => `Hello, ${name()}!`)
let doubled = $derived(() => count() * 2)

// Bindable values for two-way data binding (like Svelte's $bindable)
let inputValue = $bindable('')

// Use in components
const MyComponent = () => {
  return jsx('vstack', null,
    jsx('text', null, greeting()),
    jsx('text', null, `Count: ${count()}, Doubled: ${doubled()}`),
    jsx('text', { style: { color: 'gray' } }, 'Use + to increment')
  )
}
```

### Why Svelte-Inspired?

[Svelte's rune system](https://svelte.dev/docs/svelte/what-are-runes) provides an elegant approach to reactivity that works perfectly for terminal UIs:

- **Simple**: No complex state management boilerplate
- **Reactive**: Values automatically update when dependencies change  
- **Type-Safe**: Full TypeScript support with proper inference
- **Performance**: Efficient updates only when values actually change
- **Familiar**: Similar syntax to Svelte for web developers

Unlike web Svelte which compiles away the runes, TUIX implements them as runtime functions that work naturally with Effect.ts and the terminal environment.

## ⌨️ Input Handling

Handle keyboard and mouse events through subscriptions:

```typescript
subscriptions: (model: Model) =>
  Effect.gen(function* (_) {
    const input = yield* _(InputService)
    
    return input.mapKeys(key => {
      switch (key.key) {
        case 'enter': return { tag: "submit" }
        case 'escape': return { tag: "cancel" }
        case 'tab': return { tag: "nextField" }
        case 'up': return { tag: "moveUp" }
        case 'down': return { tag: "moveDown" }
        case 'ctrl+c': process.exit(0)
        default: return null
      }
    })
  })
```

### Key Event Properties

```typescript
interface KeyEvent {
  readonly key: string      // 'a', 'enter', 'ctrl+c', 'shift+tab'
  readonly ctrl: boolean    // Ctrl modifier
  readonly shift: boolean   // Shift modifier  
  readonly alt: boolean     // Alt modifier
  readonly meta: boolean    // Meta/Cmd modifier
}
```

## 🖱️ Mouse Support

Enable mouse support in your runtime config:

```typescript
const config: RuntimeConfig = {
  enableMouse: true,
  // ... other options
}
```

Mouse events are captured but coordinate-to-component routing is still in development.

## 📝 Examples

Check out the `examples/` directory for real-world TUIX applications:

### Real-World Applications
- **Git Dashboard** - Multi-panel git repository management (inspired by lazygit)
- **Process Monitor** - Real-time system monitoring (inspired by htop)
- **Log Viewer** - Streaming log analysis with filtering (inspired by lnav)
- **Package Manager** - Package management interface (inspired by npm/yarn)

### UI Pattern Libraries
- **Contact Form** - Form handling and validation patterns
- **Layout Patterns** - Layout composition and responsive design

### Component Showcases
- **Table Showcase** - Data table with sorting and filtering
- **Tabs Showcase** - Tab navigation and multi-view interfaces

### Quick Start

```bash
# List all available examples
bun run examples

# Run specific examples with convenient scripts
bun run example:git-dashboard
bun run example:process-monitor
bun run example:log-viewer
bun run example:package-manager

# Or run directly
bun examples/git-dashboard.ts
```

### Testing Examples

```bash
# Quick test all examples (3s timeout each)
bun run examples:test

# Run e2e tests for examples
bun run test:e2e:all
```

## 🔧 Configuration

### RuntimeConfig Options

```typescript
interface RuntimeConfig {
  readonly fps?: number           // Target FPS (default: 60)
  readonly debug?: boolean        // Enable debug logging
  readonly quitOnEscape?: boolean // Quit on ESC key
  readonly quitOnCtrlC?: boolean  // Quit on Ctrl+C
  readonly enableMouse?: boolean  // Enable mouse support
  readonly fullscreen?: boolean   // Use alternate screen buffer
}
```

### Recommended Settings

For most applications:

```typescript
const config: RuntimeConfig = {
  fps: 30,                // Good balance of responsiveness and performance
  quitOnCtrlC: true,     // Standard quit behavior
  fullscreen: true,      // Clean fullscreen experience
  enableMouse: false     // Enable if you need mouse support
}
```

## 🏃‍♂️ Performance

- **Efficient Rendering**: Only re-renders when the model changes
- **Stream-Based**: Uses Effect streams for efficient event processing
- **Memory Safe**: Automatic cleanup of resources and subscriptions
- **Fiber-Based**: Non-blocking concurrent processing

## 🤝 Development

### Development Setup

```bash
git clone https://github.com/cinderlink/tuix
cd tuix
bun install
```

### Development Scripts

```bash
# Run tests
bun test
bun test:watch

# Type checking
bun run typecheck:tsc

# Code formatting & linting (Biome + oxlint)
bun run format        # Format code
bun run lint          # Lint code
bun run check         # Check formatting and types
bun run check:fix     # Fix formatting and linting issues

# Build
bun run build

# Run examples
bun run examples                    # List all examples
bun run example:jsx-demo           # Run JSX demo
bun run example:git-dashboard      # Run git dashboard
```

### Project Structure

```
src/
├── core/           # Core framework (runtime, types, view)
├── jsx/            # JSX runtime and components
├── ui/             # UI components (forms, data, layout)
├── cli/            # CLI framework
├── logger/         # Logging system
├── plugins/        # Plugin system
├── config/         # Configuration management
├── process-manager/# Process management
└── testing/        # Test utilities

examples/           # Example applications
docs/              # Documentation
```

### TypeScript Path Mapping

The project uses TypeScript path mapping for clean internal imports:

```typescript
// Internal module imports (for contributors)
import { Component } from '@core/types'
import { jsx } from '@jsx/runtime'
import { TextInput } from '@ui/components/forms/text-input'
import { runCLI } from '@cli/runner'
import { logger } from '@logger/index'

// External imports (for users)
import { Component, jsx, TextInput, runCLI, logger } from 'tuix'
import { CLI, Command } from 'tuix/cli'
import { createTestHarness } from 'tuix/testing'
```

## 📚 API Reference

### Core Functions

```typescript
import { runApp, text, vstack, hstack, box, Component, Effect } from 'tuix'

// Application runner
runApp(component: Component<Model, Msg>, config?: RuntimeConfig): Effect<void>

// View primitives
text(content: string): View
vstack(...views: View[]): View  
hstack(...views: View[]): View
box(content: View, options?: BoxOptions): View
```

### JSX Runtime

```typescript
import { jsx, JSXApp } from 'tuix/jsx'
import { CLI, Command, Arg, Option } from 'tuix/cli'

// JSX factory
jsx(type: string | Function, props: Record<string, any> | null, ...children: any[]): View

// JSX application
const app = new JSXApp().command(<CLI>...</CLI>)
```

### Component Interface

```typescript
interface Component<Model, Msg> {
  init: Effect<[Model, Commands[]], never, AppServices>
  update: (msg: Msg, model: Model) => Effect<[Model, Commands[]], never, AppServices>
  view: (model: Model) => View
  subscriptions?: (model: Model) => Effect<Subscriptions, never, AppServices>
}
```

### CLI Configuration

```typescript
import { defineConfig, runCLI } from 'tuix/cli'

const config = defineConfig({
  name: string
  version: string
  description?: string
  commands: Record<string, CommandConfig>
  plugins?: PluginReference[]
})

runCLI(config: CLIConfig): Promise<void>
```

## 🚧 Current Status

This is an active development project. Some features are still being implemented:

### ✅ Completed
- ✅ **CLI Framework**: Command parsing, routing, and validation with Zod schemas
- ✅ **JSX Runtime**: JSX factory function with support for terminal elements
- ✅ **Plugin System**: Plugin registration and lifecycle management
- ✅ **Core Framework**: MVU architecture with Effect.ts integration
- ✅ **Basic Components**: TextInput, Button, List, Table, Tabs, ProgressBar, Spinner
- ✅ **View System**: text, vstack, hstack, box primitives for layout
- ✅ **Type Safety**: Full TypeScript support with Effect.ts integration
- ✅ **Process Manager**: Spawn and manage external processes
- ✅ **Configuration**: Config loading and validation system
- ✅ **Logger**: Structured logging with multiple levels
- ✅ **Runes System**: Svelte-inspired reactive state with $state, $derived, $bindable
- ✅ **Path Mapping**: TypeScript path mapping for clean imports
- ✅ **Tooling**: Biome formatting and oxlint for code quality

### 🚧 In Progress  
- 🔧 **Mouse Routing**: Fine-grained coordinate-to-component mouse event routing (basic hit testing works)

### 📋 Planned
- 📋 **Modal/Dialog**: Overlay components with backdrop (demo exists, needs integration)
- 📋 **Viewport**: Scrollable content areas for large datasets (demo exists, needs integration)
- 📋 **FilePicker**: File and directory selection components (demo exists, needs integration)
- 📋 **Help System**: Interactive keybinding help and documentation (demo exists, needs integration)
- 📋 **Themes**: Comprehensive theming system and presets
- 📋 **Animation**: Smooth transitions and loading animations

---

**Built with Bun and Effect for modern TypeScript development**

*TUIX is a play on "Twix" candy, referencing our .tuix file extension for reactive terminal UI components*
