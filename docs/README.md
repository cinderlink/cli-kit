# TUIX Documentation

Terminal User Interface eXtensions - A comprehensive framework for building modern terminal-based applications.

## Quick Links

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Component Guide](#components)
- [API Reference](#api-reference)

## Getting Started

TUIX is a powerful framework for creating rich terminal user interfaces with TypeScript and Effect.ts.

### Installation

```bash
bun add tuix
```

### Basic Example

```typescript
import { text, vstack, box } from "tuix/core/view"

const app = box(vstack(
  text("Welcome to TUIX!"),
  text("Building beautiful terminal UIs")
))

console.log(await Effect.runPromise(app.render()))
```

## Core Concepts

### Views
Views are the fundamental building blocks - composable units that render content:
- [View System](./core/view.md) - Basic view primitives and composition

### Error Handling
Comprehensive error system built on Effect.ts patterns:
- [Error System](./core/errors.md) - Typed errors, recovery, and boundaries

### Performance
Optimizations for smooth terminal experiences:
- [View Cache](./core/view-cache.md) - Render caching and memoization

## Components

Interactive UI components with state management:

- Button - Clickable buttons with styling
- TextInput - Text input fields with validation
- List - Scrollable lists with selection
- Table - Data tables with sorting and filtering
- Modal - Overlay dialogs and popups
- Tabs - Tabbed interfaces
- ProgressBar - Progress indicators
- Spinner - Loading animations

## API Reference

### Core Modules
- `@/core/view` - View primitives and composition
- `@/core/errors` - Error handling and recovery
- `@/core/view-cache` - Performance optimizations

### Component System
- `@/components/*` - Interactive UI components
- `@/components/base` - Component utilities and helpers

### Styling System
- `@/styling/*` - Colors, borders, effects, and themes

### Layout System
- `@/layout/*` - Flexbox, grid, and advanced layouts

### Services
- `@/services/*` - Terminal, input, rendering, and storage services

## Architecture

TUIX follows functional programming principles with Effect.ts:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │────│     Views       │────│    Services     │
│                 │    │                 │    │                 │
│ - Interactive   │    │ - Composable    │    │ - Terminal      │
│ - Stateful      │    │ - Renderable    │    │ - Input         │
│ - Event-driven  │    │ - Cacheable     │    │ - Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────────┐
                    │   Effect.ts     │
                    │                 │
                    │ - Error Safe    │
                    │ - Async         │
                    │ - Composable    │
                    └─────────────────┘
```

## Development

### Testing

```bash
# Run all tests
bun test

# Run specific module tests
bun test src/core/view.test.ts

# Watch mode
bun test --watch
```

### Building

```bash
# Type checking
bun run tsc --noEmit

# Lint code  
bun run eslint src/

# Build for production
bun build src/index.ts
```

### Contributing

1. Follow the existing code patterns
2. Use Effect.ts for async operations and error handling
3. Write comprehensive tests for all new features
4. Update documentation for public APIs
5. Ensure TypeScript compiles without errors

## Examples

See the `examples/` directory for complete applications:

- `examples/git-dashboard.ts` - Git repository dashboard
- `examples/process-monitor.ts` - System process monitor  
- `examples/log-viewer.ts` - Log file viewer with search
- `examples/table-showcase.ts` - Data table demonstrations

## Support

- [GitHub Issues](https://github.com/cinderlink/tuix/issues)
- [Documentation](https://docs.tuix.dev)
- [Examples](https://github.com/cinderlink/tuix/tree/main/examples)