# Core

## Overview

The core module provides the fundamental runtime, view system, and lifecycle management for the Tuix framework. It handles view tree management, component lifecycle, event coordination, and the core abstractions that all other modules build upon.

## Installation

```bash
# Core is included with tuix
import { View, Component } from '@tuix/core'
```

## Quick Start

```typescript
import { View, Component } from '@tuix/core'

// Create a simple component
class MyComponent extends Component {
  render(): View {
    return View.text('Hello from Core!')
  }
}

// Use the view system
const view = View.text('Simple text view')
const box = View.box({ children: [view] })
```

## Core Concepts

### View System
The View abstraction represents all visual elements in Tuix. Views form a tree structure that gets rendered to the terminal.

### Component Lifecycle
Components have `onMount`, `onUpdate`, and `onDestroy` hooks for managing resources and side effects.

### Runtime Coordination
The runtime manages the application lifecycle, coordinates updates, and handles the main event loop.

## API Reference

### View

The main abstraction for visual elements:

```typescript
class View {
  static text(content: string): View
  static box(props: BoxProps): View
  static empty(): View
  
  // Lifecycle methods
  onMount(callback: () => void): void
  onDestroy(callback: () => void): void
}
```

### Component

Base class for reusable components:

```typescript
abstract class Component {
  abstract render(): View
  
  // Lifecycle hooks
  onMount?(): void | (() => void)
  onUpdate?(): void
  onDestroy?(): void
}
```

### Runtime

Manages application execution:

```typescript
interface Runtime {
  start(): Promise<void>
  stop(): Promise<void>
  render(view: View): void
}
```

## Examples

### Basic Component
```typescript
import { Component, View } from '@tuix/core'

class Counter extends Component {
  private count = 0
  
  render(): View {
    return View.box({
      children: [
        View.text(`Count: ${this.count}`),
        View.text('Press space to increment')
      ]
    })
  }
  
  increment() {
    this.count++
    this.update() // Trigger re-render
  }
}
```

### Lifecycle Management
```typescript
class TimerComponent extends Component {
  private timer?: NodeJS.Timeout
  
  onMount() {
    this.timer = setInterval(() => {
      this.update()
    }, 1000)
    
    // Return cleanup function
    return () => {
      if (this.timer) {
        clearInterval(this.timer)
      }
    }
  }
  
  render(): View {
    return View.text(`Time: ${new Date().toLocaleTimeString()}`)
  }
}
```

## Integration

The core module integrates with all other Tuix modules:

- **CLI**: Provides component base classes for CLI apps
- **JSX**: Renders JSX elements to View objects
- **Styling**: Applies styles to View elements
- **Layout**: Calculates positioning for View trees
- **Services**: Manages terminal interaction through Views

## Testing

```bash
# Run core tests
bun test src/core

# Run specific test
bun test src/core/runtime.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT