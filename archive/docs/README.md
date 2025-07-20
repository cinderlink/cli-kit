# TUIX Documentation

Welcome to the TUIX documentation! TUIX is a performant TUI (Terminal User Interface) framework for Bun with JSX support and Svelte-inspired reactive state management.

## Quick Start

```typescript
import { Component, runTUIApp } from 'tuix'
import { Effect } from 'effect'

const HelloWorld: Component<{}, never> = {
  init: Effect.succeed([{}, []]),
  update: () => Effect.succeed([{}, []]),
  view: () => ({
    render: () => Effect.succeed('Hello, TUIX! 🚀\nPress q to quit')
  })
}

runTUIApp(HelloWorld)
```

## Documentation Index

### Core Framework
- **[CLI Framework](./cli-framework.md)** - Core CLI framework concepts and architecture
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Coding Standards](./CODING-STANDARDS.md)** - Development guidelines and best practices

### Features
- **[Components](./COMPONENTS.md)** - Terminal UI components and layout system
- **[JSX Support](./jsx.md)** - JSX/TSX syntax for terminal UIs
- **[Input Handling](./INPUT-HANDLING.md)** - Keyboard and mouse input processing
- **[Styling](./STYLING.md)** - Colors, themes, and visual styling
- **[Plugins](./plugins.md)** - Plugin system and extensibility

### Guides
- **[Getting Started](./GETTING_STARTED.md)** - Quick start guide for building your first TUIX app
- **[Component Best Practices](./COMPONENT_BEST_PRACTICES.md)** - Guidelines for building robust components
- **[Styling Tips](./STYLING_TIPS.md)** - Master the art of terminal UI styling
- **[Examples](./EXAMPLES.md)** - Code examples and tutorials
- **[Performance](./performance.md)** - Performance optimization techniques

### Advanced
- **[API Design](./API.md)** - Internal API design principles
- **[Testing Guide](./TESTING.md)** - Testing strategies and utilities
- **[Test Coverage Report](./COMPREHENSIVE_TEST_COVERAGE_REPORT.md)** - Detailed test coverage analysis
- **[Runes System](./RUNES.md)** - Svelte-inspired reactive state management
- **[Effect Patterns](./EFFECT-PATTERNS.md)** - Effect.ts usage patterns

## Architecture Overview

TUIX is built around several core principles:

1. **Type Safety** - Full TypeScript support with strong typing
2. **Functional Programming** - Effect.ts for error handling and async operations
3. **Component-Based UI** - JSX components for terminal interfaces
4. **Plugin System** - Extensible architecture for custom functionality
5. **Performance** - Optimized rendering and caching systems

## Key Features

- 🎯 **Type-Safe Commands** - Define commands with Zod schema validation
- 🎨 **JSX Terminal UI** - Build UIs with Svelte-inspired runes for reactivity
- ⚡ **Performance Optimized** - Lazy loading, caching, and efficient rendering
- 🔌 **Plugin System** - Extensible with hooks and middleware
- 📦 **Zero Dependencies** - Minimal runtime with optional peer dependencies
- 🎨 **Rich Styling** - Colors, gradients, and advanced terminal features
- ⌨️ **Input Handling** - Keyboard shortcuts, mouse support, and event handling

## Getting Started

1. **Installation**
   ```bash
   bun add tuix
   ```

2. **Create Your First CLI**
   ```typescript
   import { Component, runTUIApp } from 'tuix'
   import { Effect } from 'effect'
   
   const App: Component<Model, Msg> = {
     init: Effect.succeed([initialModel, []]),
     update: (msg, model) => updateModel(msg, model),
     view: (model) => renderView(model)
   }
   
   runTUIApp(App)
   ```

3. **Add Components with Runes**
   ```typescript
   import { Button, Text, $state } from 'tuix'
   
   const MyApp = () => {
     let count = $state(0)
     
     return (
       <div>
         <Text color="blue">Welcome to my app!</Text>
         <Text>Count: {count}</Text>
         <Button onClick={() => count++}>
           Click me
         </Button>
       </div>
     )
   }
   ```

4. **Run Your CLI**
   ```bash
   bun run app.ts
   ```

## Contributing

Please read our [Coding Standards](./CODING-STANDARDS.md) before contributing. We follow strict type safety guidelines and Effect.ts patterns for consistent, maintainable code.

## Support

- 📖 [Documentation](./api-reference.md)
- 💡 [Examples](./EXAMPLES.md)
- 🐛 [Issues](https://github.com/cinderlink/tuix/issues)
- 💬 [Discussions](https://github.com/cinderlink/tuix/discussions)