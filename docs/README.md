# CLI Kit Documentation

Welcome to the CLI Kit documentation! This framework provides a comprehensive toolkit for building modern command-line applications with TypeScript, Effect.ts, and JSX support with Svelte-inspired runes.

## Quick Start

```typescript
import { createCLI, z } from '@cli-kit/core'

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
- **[Examples](./EXAMPLES.md)** - Code examples and tutorials
- **[Performance](./performance.md)** - Performance optimization techniques

### Advanced
- **[API Design](./API.md)** - Internal API design principles

## Architecture Overview

CLI Kit is built around several core principles:

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
   bun add @cli-kit/core
   ```

2. **Create Your First CLI**
   ```typescript
   import { createCLI } from '@cli-kit/core'
   
   const cli = createCLI({
     name: 'my-cli',
     version: '1.0.0',
     commands: {
       hello: {
         handler: () => 'Hello, World!'
       }
     }
   })
   
   cli.run()
   ```

3. **Add Components with Runes**
   ```typescript
   import { Button, Text } from '@cli-kit/components'
   
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
   bun run my-cli hello
   ```

## Contributing

Please read our [Coding Standards](./CODING-STANDARDS.md) before contributing. We follow strict type safety guidelines and Effect.ts patterns for consistent, maintainable code.

## Support

- 📖 [Documentation](./api-reference.md)
- 💡 [Examples](./EXAMPLES.md)
- 🐛 [Issues](https://github.com/cinderlink/cli-kit/issues)
- 💬 [Discussions](https://github.com/cinderlink/cli-kit/discussions)