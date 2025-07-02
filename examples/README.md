# CLI-Kit Examples

This directory contains real-world examples demonstrating CLI-Kit's capabilities through TUI applications inspired by popular open-source tools.

## Available Examples

### 🔧 Git Dashboard (`git-dashboard.ts`)
A lazygit-inspired Git repository management interface.

**Features:**
- Multi-panel layout (Working Directory, Staging Area, Commit History)
- File staging/unstaging simulation
- Git workflow demonstration
- Panel navigation with Tab and number keys

**Run:** `bun examples/git-dashboard.ts`

**Key Patterns Demonstrated:**
- Multi-panel navigation
- State management across panels
- Table components with different configurations
- Focus management between components

### 📊 Process Monitor (`process-monitor.ts`)
An htop-inspired system process monitoring interface.

**Features:**
- Real-time process table with CPU/Memory usage
- System resource meters (CPU, Memory, Network)
- Process management operations (kill, refresh)
- Auto-refresh with configurable intervals

**Run:** `bun examples/process-monitor.ts`

**Key Patterns Demonstrated:**
- Real-time data updates
- Progress bars for system metrics
- Auto-refresh mechanisms
- Process management workflows

### 📝 Log Viewer (`log-viewer.ts`)
An lnav-inspired log file viewer and analyzer.

**Features:**
- Streaming log display with auto-scroll
- Log level filtering (ERROR, WARN, INFO, DEBUG)
- Search functionality with highlighting
- Multiple view modes (list/detail)

**Run:** `bun examples/log-viewer.ts`

**Key Patterns Demonstrated:**
- Streaming data display
- Advanced filtering systems
- Search and highlighting
- Toggle-based UI controls

### 📦 Package Manager (`package-manager.ts`)
An npm/yarn-inspired package management interface.

**Features:**
- Multi-tab interface (Packages, Dependencies, Search)
- Package operations (install/uninstall/update)
- Bulk operations and selection
- Package details and metadata display

**Run:** `bun examples/package-manager.ts`

**Key Patterns Demonstrated:**
- Tab-based navigation
- Complex table interactions
- Bulk operations
- Multi-view state management

### 📋 Contact Form (`contact-form.ts`)
A comprehensive form example with validation.

**Features:**
- Multiple input fields with validation
- Field navigation and focus management
- Form submission and error handling
- Responsive layout

**Run:** `bun examples/contact-form.ts`

**Key Patterns Demonstrated:**
- Form state management
- Input validation
- Field navigation
- Error display

### 🎨 Layout Patterns (`layout-patterns.ts`)
Demonstrates various layout techniques and responsive design.

**Features:**
- Grid layouts and nested containers
- Dynamic sizing and alignment
- Responsive behavior demonstration
- Box model examples

**Run:** `bun examples/layout-patterns.ts`

**Key Patterns Demonstrated:**
- Advanced layouts
- Responsive design
- Container composition
- Styling techniques

## Quick Test

To quickly test all examples and ensure they work:

```bash
# Run examples with timeout to test basic functionality
timeout 3s bun examples/git-dashboard.ts
timeout 3s bun examples/process-monitor.ts
timeout 3s bun examples/log-viewer.ts
timeout 3s bun examples/package-manager.ts
timeout 3s bun examples/contact-form.ts
timeout 3s bun examples/layout-patterns.ts
```

## Example Categories

### Real-World Application Patterns
- **Git Dashboard**: Version control workflows
- **Process Monitor**: System administration tools
- **Log Viewer**: Log analysis and monitoring
- **Package Manager**: Package management workflows

### UI Pattern Libraries
- **Contact Form**: Form handling and validation
- **Layout Patterns**: Layout composition and responsive design

## Common Keyboard Shortcuts

Most examples follow these conventions:

- **Tab**: Navigate between panels/tabs
- **1-9**: Direct access to tabs/panels
- **↑↓**: Navigate lists/tables
- **Space**: Select/toggle items
- **Enter**: Confirm/submit actions
- **Escape**: Cancel/clear
- **Ctrl+C**: Exit application

## Testing

Each example has comprehensive e2e tests:

```bash
# Run all e2e tests
bun tests/e2e/run-tests.ts

# Run specific test
bun test tests/e2e/git-dashboard.test.ts
```

## Creating New Examples

Use this template for new examples:

```typescript
import { Effect } from "effect"
import { runApp } from "@/index.ts"
import { text, vstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"
import { LiveServices } from "../src/services/impl/index.ts"

interface Model {
  // Your state
}

type Msg = 
  // Your messages

const app: Component<Model, Msg> = {
  init: Effect.succeed([/* initial state */, []]),
  update: (msg, model) => { /* handle updates */ },
  view: (model) => { /* render UI */ },
  subscriptions: (model) => { /* handle input */ }
}

const config: RuntimeConfig = {
  fps: 30,
  quitOnCtrlC: true,
  fullscreen: true
}

Effect.runPromise(runApp(app, config).pipe(
  Effect.provide(LiveServices)
)).catch(console.error)
```

## Design Philosophy

These examples demonstrate:

1. **Real-world patterns**: Based on actual TUI applications
2. **Component composition**: How to build complex UIs from simple components
3. **State management**: Effective patterns for managing application state
4. **User experience**: Intuitive keyboard navigation and feedback
5. **Performance**: Efficient rendering and update patterns

Each example is designed to be:
- **Educational**: Clear demonstration of specific patterns
- **Functional**: Complete working applications
- **Tested**: Comprehensive e2e test coverage
- **Documented**: Well-commented code explaining key concepts