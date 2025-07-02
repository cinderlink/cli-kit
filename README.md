# CLI-Kit 🎨

A modern, Effect-powered Terminal User Interface (TUI) framework for building rich command-line applications in TypeScript. Inspired by [Bubbletea](https://github.com/charmbracelet/bubbletea) but built with functional programming principles using [Effect](https://effect.website/).

## ✨ Features

- 🎯 **Type-Safe**: Full TypeScript support with strict typing
- 🧩 **Component-Based**: Reusable UI components with state management
- 🎨 **Rich Styling**: Advanced text styling with colors, backgrounds, and borders
- ⌨️ **Input Handling**: Keyboard and mouse event processing
- 📱 **Responsive**: Adaptive layouts that work in any terminal size
- 🔄 **Reactive**: Built on Effect streams for real-time updates
- 🏗️ **Extensible**: Easy to create custom components and styles

## 🚀 Quick Start

### Installation

```bash
bun install
```

### Hello World

```typescript
import { Effect } from "effect"
import { runApp } from "@/index.ts"
import { text, vstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"

interface Model {
  readonly count: number
}

type Msg = { readonly tag: "increment" }

const app: Component<Model, Msg> = {
  init: Effect.succeed([{ count: 0 }, []]),
  
  update: (msg: Msg, model: Model) => {
    switch (msg.tag) {
      case "increment":
        return Effect.succeed([{ ...model, count: model.count + 1 }, []])
    }
  },
  
  view: (model: Model) => {
    return vstack(
      text("Hello CLI-Kit! 👋", style(Colors.BrightCyan)),
      text(`Count: ${model.count}`, style(Colors.White)),
      text("Press Space to increment, Ctrl+C to exit", style(Colors.Gray))
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      return input.mapKeys(key => {
        if (key.key === ' ') return { tag: "increment" }
        return null
      })
    })
}

const config: RuntimeConfig = {
  fps: 30,
  quitOnCtrlC: true,
  fullscreen: true
}

Effect.runPromise(runApp(app, config))
```

## 🏗️ Architecture

CLI-Kit follows the **Model-View-Update (MVU)** pattern:

- **Model**: Your application state
- **View**: Pure functions that render the model to terminal output
- **Update**: Functions that transform the model based on messages
- **Subscriptions**: Streams of events (keyboard, mouse, timers) that generate messages

```
┌─────────────┐    Messages    ┌─────────────┐
│             │ ──────────────► │             │
│    View     │                 │   Update    │
│             │ ◄────────────── │             │
└─────────────┘    New Model   └─────────────┘
       │                              │
       │                              │
       ▼                              ▼
┌─────────────┐                ┌─────────────┐
│   Render    │                │    Model    │
│  Terminal   │                │    State    │
└─────────────┘                └─────────────┘
                                      │
                                      │
┌─────────────┐                      │
│ Subscriptions│ ◄────────────────────┘
│ (Input/Time) │
└─────────────┘
```

## 🧩 Built-in Components

### Form Controls

- **TextInput**: Single and multi-line text input with validation
- **Button**: Clickable buttons with multiple variants
- **List**: Selectable lists with single/multi-select modes

### Data Display

- **Table**: Sortable, filterable tables with pagination
- **Tabs**: Multi-view interfaces with tab navigation
- **ProgressBar**: Progress indicators (determinate/indeterminate)
- **Spinner**: Loading animations with multiple styles

### Layout

- **Box**: Container with borders, padding, and styling
- **VStack/HStack**: Vertical and horizontal layout containers

### Feedback

- **Modal**: Dialog boxes with backdrop (coming soon)
- **Help**: Keybinding help displays (coming soon)

## 🎨 Styling System

CLI-Kit includes a powerful styling system for text and layout:

```typescript
import { style, Colors, Borders } from "@/styling/index.ts"

// Text styling
const styledText = text("Hello", 
  style(Colors.BrightWhite)
    .background(Colors.Blue)
    .bold()
    .italic()
)

// Borders and boxes
const borderedBox = box(content, {
  border: Borders.rounded,
  borderStyle: style(Colors.Cyan),
  padding: { top: 1, right: 2, bottom: 1, left: 2 },
  width: 40,
  height: 10
})
```

### Available Colors

```typescript
// Standard colors
Colors.Black, Colors.Red, Colors.Green, Colors.Yellow
Colors.Blue, Colors.Magenta, Colors.Cyan, Colors.White

// Bright variants
Colors.BrightBlack, Colors.BrightRed, Colors.BrightGreen
Colors.BrightYellow, Colors.BrightBlue, Colors.BrightMagenta
Colors.BrightCyan, Colors.BrightWhite

// Extended colors
Colors.Gray, Colors.DarkGray
```

### Border Styles

```typescript
Borders.none       // No border
Borders.single     // ┌─┐ style
Borders.double     // ╔═╗ style  
Borders.rounded    // ╭─╮ style
Borders.thick      // ┏━┓ style
```

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

Check out the `examples/` directory for real-world TUI applications:

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
git clone <repository>
cd cli-kit
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
- Core runtime and MVU architecture
- Basic styling system with colors and borders
- Text input components with validation
- Button components with multiple variants
- List components with selection
- Table components with sorting and filtering
- Tabs components for multi-view interfaces
- Progress bars and spinners
- Mouse event capture infrastructure

### 🚧 In Progress
- Comprehensive documentation
- Coordinate-to-component mouse routing
- Input handling fixes for complex components

### 📋 Planned
- Modal/Dialog components
- Viewport for scrollable content
- File picker components
- Help system for keybindings
- Advanced styling utilities (gradients, etc.)
- Performance optimizations

---

**Built with Bun and Effect for modern TypeScript development**
