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
import { jsx, Plugin, Command, Arg, Flag } from "tuix"

function MyCLI() {
  return (
    <vstack>
      {/* Define commands declaratively */}
      <Plugin name="myapp" description="My awesome CLI" version="1.0.0">
        <Command 
          name="hello" 
          description="Say hello"
          handler={() => <success>Hello, World! 🎉</success>}
        />
        
        <Command name="greet" description="Greet someone">
          <Arg name="name" description="Person to greet" required />
          <Flag name="loud" description="Shout the greeting" alias="l" />
          
          <Command handler={(ctx) => (
            <text color="blue">
              {ctx.flags.loud ? `HELLO ${ctx.args.name.toUpperCase()}!` : `Hello ${ctx.args.name}`}
            </text>
          )} />
        </Command>
      </Plugin>
      
      {/* Main UI shown when no command is provided */}
      <text color="cyan" bold>Welcome to My CLI!</text>
      <text>Run 'hello' or 'greet <name>' to get started</text>
    </vstack>
  )
}

// Run the app
jsx(MyCLI).catch(console.error)
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
// Main exports
import { runApp, Component, Effect } from 'tuix'

// Components (JSX elements)
import { Text, Button, Box, List, Table } from 'tuix/components'

// Stream components
import { Stream, Pipe, Transform, StreamBox } from 'tuix/components/streams'
import { Spawn, ManagedSpawn, CommandPipeline } from 'tuix/components/streams/spawn'
import { timer, poll, fromArray, random } from 'tuix/components/streams'

// Styling system
import { style, Colors, Borders } from 'tuix/styling'

// Layout utilities
import { flexbox, grid, spacer, center } from 'tuix/layout'

// CLI framework
import { createCLI, plugin, middleware } from 'tuix/cli'

// Testing utilities
import { testComponent, createTestHarness } from 'tuix/testing'

// Logger
import { logger, LogLevel } from 'tuix/logger'

// Process management
import { ProcessManager } from 'tuix/process-manager'

// Direct core imports for advanced usage
import { View, text, vstack, hstack } from 'tuix/core/view'
import type { AppServices, TerminalCapabilities } from 'tuix/core/types'
```

### Create Your First CLI

```typescript
import { createCLI, z } from 'tuix'

const cli = createCLI({
  name: 'my-app',
  version: '1.0.0',
  commands: {
    hello: {
      description: 'Say hello to someone',
      args: {
        name: z.string().describe('Name to greet')
      },
      handler: (args) => `Hello, ${args.name}!`
    }
  }
})

await cli.run(process.argv.slice(2))
```

### JSX Terminal UI with Runes

```tsx
import { Text, Button, Box } from 'tuix/components'

const MyComponent = ({ name }: { name: string }) => {
  let clickCount = $state(0)
  
  return (
    <Box border="rounded" padding={2}>
      <Text color="cyan" bold>
        Welcome to TUIX, {name}! 🎉
      </Text>
      <Text>Clicked {clickCount} times</Text>
      <Button 
        variant="primary" 
        onClick={() => clickCount++}
      >
        Get Started
      </Button>
    </Box>
  )
}
```

### Advanced TUI Application with MVU

```typescript
import { Component, runApp, Effect, View, Sub, KeyUtils } from "tuix"

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
  
  view: (model: Model) => View.vstack(
    View.bold(View.cyan(View.text('TUIX Counter 🎯'))),
    View.text(`Count: ${model.count}`),
    View.text(`Last action: ${model.lastAction}`),
    View.empty,
    View.gray(View.text('Controls:')),
    View.gray(View.text('  [+] Increment  [-] Decrement  [r] Reset  [q] Quit'))
  ),
  
  subscriptions: () => Sub.fromKeys((key) => {
    if (KeyUtils.isChar(key, '+')) return { type: 'increment' }
    if (KeyUtils.isChar(key, '-')) return { type: 'decrement' }
    if (KeyUtils.isChar(key, 'r')) return { type: 'reset' }
    if (KeyUtils.isChar(key, 'q')) return Sub.quit()
    return null
  })
}

// Run with proper error handling and cleanup
await Effect.runPromise(
  runApp(counterApp, { 
    fps: 60,
    fullscreen: true 
  })
)
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

## 🌊 Stream Components

Tuix provides powerful stream components that integrate seamlessly with Effect.ts for real-time data processing:

### Basic Streaming

```tsx
import { Stream } from "effect"
import { timer, fromArray } from "tuix/streams"

function StreamingApp() {
  // Create a timer that emits every second
  const timerStream = timer(1000, 10)
  
  return (
    <vstack>
      {/* Stream component renders items as they arrive */}
      <Stream 
        stream={timerStream}
        transform={(n) => <text color="green">Tick {n}</text>}
        maxItems={5}
      />
      
      {/* StreamBox provides a bordered container */}
      <StreamBox
        title="Live Data"
        border="rounded"
        stream={dataStream}
        placeholder="Waiting for data..."
      >
        {(item) => <text>{JSON.stringify(item)}</text>}
      </StreamBox>
    </vstack>
  )
}
```

### Process Spawning & Output Streaming

```tsx
// Spawn a process and stream its output
<Spawn 
  command="npm test" 
  stdout="stream"
  stderr="stream"
  stdoutStyle={{ foreground: "green" }}
  stderrStyle={{ foreground: "red" }}
/>

// Custom spawn rendering
<Spawn command={["ls", "-la"]} >
  {({ stdout, stderr, exitCode }) => (
    <vstack>
      <Stream stream={stdout} />
      <Stream stream={stderr} transform={(line) => <error>{line}</error>} />
    </vstack>
  )}
</Spawn>

// Command pipeline - pipe multiple commands
<CommandPipeline
  commands={[
    { command: "find . -name '*.ts'" },
    { command: "grep -v node_modules" },
    { command: "wc -l" }
  ]}
  showPipeline={true}
>
  {(output) => <Stream stream={output} />}
</CommandPipeline>
```

### Stream Transformations

```tsx
// Pipe component for single transformations
<Pipe
  from={numberStream}
  through={(n) => n * n}
  concurrency={5}
>
  {(squaredStream) => <Stream stream={squaredStream} />}
</Pipe>

// Transform component for multiple transformations
<Transform
  stream={dataStream}
  transforms={[
    { name: "Parse", fn: (s) => Stream.map(s, JSON.parse) },
    { name: "Filter", fn: (s) => Stream.filter(s, (d) => d.active) },
    { name: "Format", fn: (s) => Stream.map(s, formatData) }
  ]}
  showPipeline={true}
>
  {(finalStream) => <StreamBox stream={finalStream} />}
</Transform>
```

## 🎮 Interactive Mode

Tuix provides a powerful context-based interactive mode system that works universally across the framework. By default, all commands and applications are non-interactive (they render and exit), but you can enable interactive mode at any scope.

### Non-Interactive by Default

```tsx
// Commands render and exit immediately by default
<Command name="status" handler={() => (
  <text color="green">✅ All systems operational</text>
)} />
```

### Enabling Interactive Mode

```tsx
// Always interactive
<Command name="monitor" interactive={true} handler={() => (
  <vstack>
    <text>Monitoring... Press Ctrl+C to exit</text>
    <Stream stream={metricsStream} />
  </vstack>
)} />

// Conditionally interactive based on context
<Command 
  name="logs"
  interactive={(ctx) => ctx.flags.follow === true}
  handler={(ctx) => (
    <LogViewer follow={ctx.flags.follow} />
  )}
/>

// Interactive with configuration
<Command
  name="watch"
  interactive={{
    enabled: true,
    timeout: 60000,     // Exit after 1 minute
    exitOn: {
      idle: 10000,      // Exit after 10s of inactivity
      complete: true,   // Exit when streams complete
      error: true       // Exit on errors
    }
  }}
  handler={() => <WatchUI />}
/>
```

### Using the Interactive API

```tsx
import { Interactive } from "tuix"

// Run part of your app in interactive mode
const MyCommand = () => Effect.gen(function* () {
  // Non-interactive work
  yield* doSetup()
  
  // Enter interactive mode for a section
  yield* Interactive.scope(
    showInteractiveUI(),
    { timeout: 30000 }
  )
  
  // Back to non-interactive
  yield* cleanup()
})

// Check if currently interactive
const StatusBar = () => Effect.gen(function* () {
  const isInteractive = yield* Interactive.isActive
  
  return (
    <hstack>
      <text>Mode: {isInteractive ? "Interactive" : "Batch"}</text>
      {isInteractive && <text color="gray">Press 'q' to quit</text>}
    </hstack>
  )
})
```

### Exit Control

```tsx
// Exit with the Exit component
<Exit code={0} message="✅ Done!" />
<Exit code={1} delay={3000}>💥 Self-destruct in 3s...</Exit>

// Exit programmatically
yield* Interactive.exit(0)
```

## 🧩 JSX Components

### Core Elements

```tsx
// Text rendering with styling
<Text color="blue" bold italic>Styled text</Text>

// Layout containers
<Box border="rounded" padding={2} width={40}>
  <div>Content goes here</div>
</Box>

// Flexible layouts
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</div>
```

### Interactive Components

```tsx
// Reactive state with Svelte-inspired runes
let count = $state(0)
let inputValue = $state('')
let selectedIndex = $state(0)

// Buttons with reactive callbacks
<Button variant="primary" onClick={() => count++}>
  Clicked {count} times
</Button>

// Text input with callback handlers
<TextInput 
  value={inputValue}
  onChange={(value) => inputValue = value}
  placeholder="Enter text..."
  validate={(value) => value.length > 0}
/>

// Selectable lists with callback handlers
<List 
  items={['Option 1', 'Option 2', 'Option 3']}
  selected={selectedIndex}
  onSelect={(index) => selectedIndex = index}
/>
```

### Data Display

```tsx
// Reactive data with Svelte-inspired runes
let tableData = $state([...])
let currentTab = $state(0)
let progress = $state(75)

// Tables with callback handlers
<Table 
  data={tableData}
  columns={[
    { key: 'name', title: 'Name', sortable: true },
    { key: 'value', title: 'Value', sortable: true }
  ]}
  onSort={(column) => /* handle sorting */}
  onFilter={(column) => /* handle filtering */}
/>

// Tab navigation with callback handlers
<Tabs 
  activeTab={currentTab}
  onTabChange={(index) => currentTab = index}
>
  <Tab title="Tab 1">Content 1</Tab>
  <Tab title="Tab 2">Content 2</Tab>
</Tabs>

// Progress indicators
<ProgressBar value={progress} max={100} />
<Spinner variant="dots" />
```

### Advanced Components

- **Modal**: Dialog boxes with backdrop (coming soon)
- **FilePicker**: File and directory selection (coming soon)
- **Help**: Keybinding help system (coming soon)
- **Viewport**: Scrollable content areas (coming soon)

## 🎨 Styling System

TUIX provides a comprehensive styling system with multiple approaches:

### JSX Style Props

```tsx
// Direct style props
<Text 
  color="blue" 
  backgroundColor="white"
  bold 
  italic 
  underline
>
  Styled text
</Text>

// CSS-like styling
<div style={{
  color: 'rgb(255, 100, 100)',
  backgroundColor: '#1a1a1a',
  border: '1px solid cyan',
  padding: '2px 4px',
  margin: '1px',
  textAlign: 'center'
}}>
  CSS-styled content
</div>
```

### Advanced Color System

```tsx
// Standard colors
<Text color="red">Red text</Text>
<Text color="brightCyan">Bright cyan text</Text>

// RGB colors
<Text color="rgb(255, 100, 50)">Custom RGB</Text>

// Hex colors  
<Text color="#ff6432">Hex color</Text>

// Gradients
<Text gradient="linear-gradient(90deg, red, blue)">
  Gradient text
</Text>
```

### Layout and Borders

```tsx
// Border styles
<Box border="single">Single border</Box>
<Box border="double">Double border</Box>
<Box border="rounded">Rounded border</Box>
<Box border="thick">Thick border</Box>

// Padding and margins
<Box padding={2} margin={1}>
  Spaced content
</Box>

// Flexible layouts
<div style={{ 
  display: 'flex', 
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center' 
}}>
  <Text>Left</Text>
  <Text>Right</Text>
</div>
```

### Programmatic Styling

```typescript
import { style, Colors, createGradient } from 'tuix/styling'

// Function-based styling
const myStyle = style()
  .color(Colors.blue)
  .backgroundColor(Colors.white)
  .bold()
  .padding(2)

// Gradient creation
const gradient = createGradient({
  type: 'linear',
  angle: 90,
  stops: [
    { color: Colors.red, position: 0 },
    { color: Colors.blue, position: 100 }
  ]
})
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

```typescript
import { $state, $derived, $bindable } from 'tuix/runes'

// Reactive state (like Svelte's $state)
let count = $state(0)
let name = $state('World')

// Derived values (like Svelte's $derived)
let greeting = $derived(() => `Hello, ${name()}!`)
let doubled = $derived(() => count() * 2)

// Bindable values for two-way data binding (like Svelte's $bindable)
let inputValue = $bindable('', {
  validate: (value) => value.length > 0 || 'Value cannot be empty',
  transform: (value) => value.trim()
})

// Use in components
const MyComponent = () => {
  return (
    <div>
      <Text>{greeting()}</Text>
      <Text>Count: {count()}, Doubled: {doubled()}</Text>
      <Button onClick={() => count(count() + 1)}>
        Increment
      </Button>
    </div>
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

### Running Tests

```bash
bun test
```

### Project Structure

```
src/
├── core/           # Core framework (runtime, types, view)
├── components/     # Built-in UI components
├── styling/        # Styling system and themes
├── services/       # Input, rendering, and system services
└── testing/        # Test utilities

examples/           # Example applications
docs/              # Documentation
```

## 📚 API Reference

### Core Functions

- `runApp(component, config)` - Start your application
- `text(content, style?)` - Create styled text
- `vstack(...views)` - Vertical layout
- `hstack(...views)` - Horizontal layout
- `box(content, options)` - Container with borders

### Component Interface

Every component must implement:

```typescript
interface Component<Model, Msg> {
  init: Effect<[Model, Cmd<Msg>[]], never, AppServices>
  update: (msg: Msg, model: Model) => Effect<[Model, Cmd<Msg>[]], never, AppServices>
  view: (model: Model) => View
  subscriptions?: (model: Model) => Effect<Sub<Msg>, never, AppServices>
}
```

## 🚧 Current Status

This is an active development project. Some features are still being implemented:

### ✅ Completed
- ✅ **CLI Framework**: Complete command parsing, routing, and validation with Zod
- ✅ **JSX Runtime**: Full JSX support with [Svelte](https://svelte.dev/)-inspired runes for reactive terminal UIs
- ✅ **Plugin System**: Extensible architecture with hooks and middleware
- ✅ **Performance Optimizations**: Lazy loading, caching, view caching, and efficient rendering
- ✅ **Core Components**: Text, Button, Box, List, Table, Tabs, ProgressBar, Spinner, TextInput
- ✅ **Advanced Styling**: Colors, gradients, borders, layouts, and CSS-like styling
- ✅ **Type Safety**: Full TypeScript support with proper generics and Effect.ts integration
- ✅ **Input & Mouse Handling**: Comprehensive keyboard and mouse event processing
- ✅ **Testing Framework**: Comprehensive test utilities, E2E testing, and performance benchmarks
- ✅ **Documentation**: Comprehensive guides and API reference in `/docs` directory
- ✅ **Examples**: 20+ real-world application examples including git dashboard, process monitor, log viewer
- ✅ **Runes Reactivity**: [Svelte](https://svelte.dev/)-inspired reactive state management with `$state`, `$derived`, `$bindable`
- ✅ **TUIX Files**: Support for `.tuix` files with JSX compilation
- ✅ **Hit Testing**: Component boundary detection and coordinate mapping

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
