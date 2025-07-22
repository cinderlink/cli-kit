# CLI Module

The CLI module provides a complete command-line interface framework built on the TUIX architecture. It offers type-safe command definition, plugin extensibility, lazy loading, and sophisticated argument parsing with validation.

## Architecture

The CLI module is designed with a clean, decoupled architecture that separates concerns:

### Core Components (View-Agnostic)

1. **Model Layer** - Pure data and logic
   - `types.ts` - Type definitions for CLI structures
   - `config.ts` - Configuration management and validation
   - `parser/` - Argument parsing with schema validation
   - `router/` - Command routing and resolution
   - `hooks.ts` - Event-driven lifecycle hooks

2. **Update Layer** - State management and command execution
   - `runner/` - Application lifecycle and execution
   - `plugin.ts` - Plugin system with lifecycle management
   - `registry.ts` - Plugin registration and discovery
   - `loader/` - Dynamic module loading

3. **View Layer** - Presentation concerns (DECOUPLED)
   - View-agnostic interfaces for help generation
   - Runtime registration for different view systems (TEA, JSX)
   - No direct dependencies on specific view implementations

### Design Principles

1. **View Runtime Agnostic**
   - The CLI core is completely unopinionated about view rendering
   - Help generation produces abstract data structures
   - View runtimes (TEA, JSX) register themselves with the core

2. **Lazy Loading**
   - Commands are loaded on-demand for faster startup
   - Plugin discovery happens at runtime
   - Module resolution is deferred until needed

3. **Type Safety**
   - Full TypeScript support with Zod schema validation
   - Type-safe command definitions and argument parsing
   - Plugin interfaces enforce correct implementation

4. **Extensibility**
   - Plugin system allows third-party extensions
   - Lifecycle hooks enable cross-cutting concerns
   - Command composition through nested structures

## Usage

### Basic CLI Definition

```typescript
import { defineConfig, runCLI } from '@/cli'

const config = defineConfig({
  name: 'myapp',
  version: '1.0.0',
  description: 'My CLI application',
  commands: {
    build: {
      description: 'Build the application',
      handler: async (args) => {
        // Command implementation
        console.log('Building...')
      }
    }
  }
})

// Run the CLI
await runCLI(config)
```

### View Runtime Registration

The CLI module supports different view runtimes through a registration pattern:

```typescript
import { registerViewRuntime } from '@/cli'
import { teaRuntime } from '@/tea'
import { jsxRuntime } from '@/jsx'

// Register a view runtime (e.g., for TEA)
registerViewRuntime(teaRuntime)

// Or use JSX runtime
registerViewRuntime(jsxRuntime)
```

### Help Generation

Help is generated as abstract data that view runtimes can render:

```typescript
import { HelpGenerator } from '@/cli'

const generator = new HelpGenerator(config)

// Get help data (view-agnostic)
const helpData = generator.generateHelpData()

// View runtime renders the data
// This happens internally when --help is used
```

## API Reference

### CLI Configuration

#### `defineConfig(config: CLIConfig): CLIConfig`
Defines a CLI application configuration with commands, plugins, and settings.

#### `runCLI(config: CLIConfig): Promise<void>`
Runs a CLI application with the provided configuration.

#### `cli.command(name: string, config: CommandConfig): void`
Defines a command with arguments, flags, and handler.

### Command Configuration

```typescript
interface CommandConfig {
  description: string
  args?: Record<string, ZodType>
  flags?: Record<string, ZodType>
  options?: Record<string, ZodType>
  handler: (context: CLIContext) => Promise<any> | any
  lazy?: () => Promise<CommandConfig>
}
```

### Plugin System

#### `definePlugin(plugin: Plugin): Plugin`
Defines a plugin with commands, middleware, and lifecycle hooks.

#### `createPluginManager(): PluginManager`
Creates a plugin manager for loading and managing plugins.

### Lazy Loading

#### `lazyLoad(path: string): LazyHandler`
Creates a lazy-loaded command handler that imports on first use.

#### `lazyLoadPlugin(path: string): PluginReference`
Creates a lazy-loaded plugin reference.

### Router and Parser

#### `CLIRouter.route(args: string[]): Promise<any>`
Routes command-line arguments to appropriate handlers.

#### `CLIParser.parse(args: string[], schema: Schema): ParsedArgs`
Parses command-line arguments against a schema.

## Examples

### Basic CLI Application
```typescript
import { cli } from 'tuix/cli'
import { z } from 'zod'

// Define commands
cli.command('greet', {
  description: 'Greet someone',
  args: {
    name: z.string().describe('Name to greet')
  },
  flags: {
    uppercase: z.boolean().describe('Use uppercase')
  },
  handler: ({ args, flags }) => {
    const greeting = `Hello, ${args.name}!`
    return flags.uppercase ? greeting.toUpperCase() : greeting
  }
})

cli.command('goodbye', {
  description: 'Say goodbye',
  args: {
    name: z.string().optional().describe('Name to say goodbye to')
  },
  handler: ({ args }) => {
    return `Goodbye, ${args.name || 'friend'}!`
  }
})

// Run the CLI
cli.run()
```

### Plugin-Based CLI
```typescript
import { defineConfig, runCLI } from 'tuix/cli'

const config = defineConfig({
  name: 'myapp',
  version: '1.0.0',
  description: 'My awesome CLI app',
  
  plugins: [
    './plugins/database',
    './plugins/auth',
    {
      name: 'monitoring',
      lazy: () => import('./plugins/monitoring')
    }
  ],
  
  commands: {
    status: {
      description: 'Show app status',
      handler: () => 'App is running'
    }
  }
})

runCLI(config)
```

### Lazy-Loaded Commands
```typescript
import { defineConfig, lazyLoad } from 'tuix/cli'

const config = defineConfig({
  name: 'developer-tools',
  commands: {
    // Heavy commands loaded only when needed
    build: lazyLoad('./commands/build'),
    test: lazyLoad('./commands/test'),
    deploy: lazyLoad('./commands/deploy'),
    
    // Light commands loaded immediately
    version: {
      description: 'Show version',
      handler: () => '1.0.0'
    }
  }
})
```

### JSX CLI Components
```typescript
import { render } from 'tuix/jsx'

const MyCLI = () => (
  <cli name="myapp" version="1.0.0">
    <plugin name="auth" />
    
    <command name="login" description="Login to service">
      <arg name="username" required description="Username" />
      <flag name="remember" description="Remember login" />
      <handler>{({args, flags}) => 
        `Logged in as ${args.username}${flags.remember ? ' (remembered)' : ''}`
      }</handler>
    </command>
  </cli>
)

render(MyCLI)
```

## Module Structure

```
cli/
├── index.ts           # Public API exports
├── types.ts           # Type definitions
├── config.ts          # Configuration utilities
├── parser/            # Argument parsing
│   ├── parser.ts      # Main parser implementation
│   ├── schema.ts      # Schema validation
│   └── ...
├── router/            # Command routing
│   ├── router.ts      # Route resolution
│   └── suggestions.ts # Command suggestions
├── runner/            # Execution engine
│   ├── cliRunner.ts   # Main runner
│   ├── helpDisplay.ts # Help coordination
│   └── ...
├── core/              # Core utilities
│   ├── help.ts        # Help data generation
│   └── loader.ts      # Module loading
├── plugin.ts          # Plugin system
├── hooks.ts           # Lifecycle hooks
└── registry.ts        # Plugin registry
```

## Integration Points

### With Core Services

The CLI module integrates with core services for:
- Terminal output through renderer service
- Input handling through input service
- Event coordination through event bus

### With View Systems

View systems integrate by:
1. Registering a view runtime
2. Implementing help rendering
3. Handling interactive components

### With Plugins

Plugins extend functionality by:
- Adding new commands
- Hooking into lifecycle events
- Providing custom handlers

## Best Practices

1. **Keep Commands Pure**
   - Command handlers should focus on logic
   - Delegate view concerns to the runtime
   - Return data, not rendered output

2. **Use Schema Validation**
   - Define Zod schemas for all inputs
   - Leverage schema descriptions for help
   - Validate early in the pipeline

3. **Leverage Lazy Loading**
   - Use dynamic imports for heavy commands
   - Defer plugin loading until needed
   - Keep the startup path minimal

4. **Follow Module Boundaries**
   - Don't import from internal paths
   - Use only the public API
   - Respect the decoupled architecture

### Plugin Development

Create plugins to extend CLI functionality:

```typescript
// plugins/database.ts
import { definePlugin } from '@/cli'

export default definePlugin({
  name: 'database',
  version: '1.0.0',
  commands: {
    migrate: {
      description: 'Run database migrations',
      handler: () => 'Migrations complete'
    },
    seed: {
      description: 'Seed database with data',
      handler: () => 'Database seeded'
    }
  },
  hooks: {
    beforeCommand: (context) => {
      console.log(`Running ${context.command} with database plugin`)
    }
  }
})
```

## Testing

```bash
# Run CLI tests
bun test src/cli

# Test specific CLI features
bun test src/cli/parser.test.ts
bun test src/cli/router.test.ts
bun test src/cli/plugin.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT