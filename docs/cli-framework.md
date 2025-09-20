# CLI Framework Documentation

## Overview

The TUIX framework provides a powerful, type-safe way to build command-line interfaces with rich terminal UI components. It combines the robustness of Effect.ts with an intuitive API inspired by modern web frameworks.

## Key Features

- 🎯 **Type-safe argument parsing** with Zod schemas
- 🏗️ **Hierarchical command structure** with subcommands
- 🔌 **Plugin system** for extensibility
- 🎨 **Rich UI components** for interactive CLIs
- ⚡ **Lazy loading** for faster startup
- 📝 **Auto-generated help** from schemas
- 🧪 **Testing utilities** for CLI applications

## Quick Start

```typescript
import { defineConfig, runCLI } from "tuix/cli"
import { z } from "zod"

const config = defineConfig({
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI",
  
  commands: {
    greet: {
      description: "Greet someone",
      args: {
        name: z.string().describe("Name to greet")
      },
      handler: (args) => {
        console.log(`Hello, ${args.name}!`)
      }
    }
  }
})

runCLI(config)
```

## Table of Contents

1. [Configuration](./configuration.md)
2. [Commands](./commands.md)
3. [Arguments & Options](./arguments.md)
4. [UI Components](./ui-components.md)
5. [Plugin System](./plugins.md)
6. [Testing](./testing.md)
7. [Examples](./examples.md)
8. [API Reference](./api-reference.md)

## Core Concepts

### Configuration

The `defineConfig` function creates a type-safe CLI configuration:

```typescript
const config = defineConfig({
  name: "my-cli",
  version: "1.0.0",
  description: "CLI description",
  
  // Global options available to all commands
  options: {
    verbose: z.boolean().default(false).describe("Verbose output"),
    json: z.boolean().default(false).describe("JSON output")
  },
  
  // Command definitions
  commands: {
    // Command configuration
  },
  
  // Lifecycle hooks
  hooks: {
    beforeCommand: async (command, args) => {
      console.log(`Running ${command.join(' ')}...`)
    }
  }
})
```

### Commands

Commands can be nested to create hierarchical CLI structures:

```typescript
commands: {
  db: {
    description: "Database operations",
    commands: {
      migrate: {
        description: "Run migrations",
        handler: () => { /* ... */ }
      },
      seed: {
        description: "Seed database",
        handler: () => { /* ... */ }
      }
    }
  }
}
```

### Arguments and Options

Use Zod schemas for type-safe argument parsing:

```typescript
commands: {
  create: {
    description: "Create a new item",
    args: {
      name: z.string().describe("Item name"),
      type: z.enum(["file", "directory"]).describe("Item type")
    },
    options: {
      template: z.string().optional().describe("Template to use"),
      force: z.boolean().default(false).describe("Overwrite existing")
    },
    handler: (args) => {
      // args is fully typed!
      // args.name: string
      // args.type: "file" | "directory"
      // args.template?: string
      // args.force: boolean
    }
  }
}
```

### UI Components

Create rich terminal UIs with the component system:

```typescript
import { Panel, SuccessPanel, ErrorPanel } from "tuix/components"
import { text, vstack, hstack } from "tuix/components"

handler: (args) => {
  if (success) {
    return SuccessPanel(
      vstack(
        text("✓ Operation completed"),
        text(`Created: ${args.name}`)
      ),
      "Success"
    )
  } else {
    return ErrorPanel(
      text("Operation failed"),
      "Error"
    )
  }
}
```

### Plugins

Extend your CLI with plugins:

```typescript
import { definePlugin } from "tuix/cli"

const authPlugin = definePlugin({
  metadata: {
    name: "auth",
    version: "1.0.0"
  },
  
  commands: {
    login: {
      description: "Login to service",
      handler: () => { /* ... */ }
    }
  },
  
  hooks: {
    beforeCommand: async (command, args) => {
      // Check authentication
    }
  }
})
```

## Architecture

The CLI framework is built on top of the existing TUIX TUI framework:

```
┌─ CLI Framework ────────────────────────────┐
│  • Command parsing & routing               │
│  • Plugin system                           │
│  • Simplified component API                │
│  • Testing utilities                       │
└────────────────────────────────────────────┘
┌─ Effect-based Core ────────────────────────┐
│  • Runtime & TEA architecture              │
│  • Component system                        │
│  • Services & implementations              │
│  • Styling & layout                        │
└────────────────────────────────────────────┘
```

## Best Practices

### 1. Use Type-Safe Schemas

Always define your arguments and options using Zod schemas:

```typescript
// ✅ Good
args: {
  port: z.number().min(1).max(65535).describe("Port number")
}

// ❌ Bad
args: {
  port: "number" // No type safety or validation
}
```

### 2. Provide Helpful Descriptions

Add descriptions to all commands, arguments, and options:

```typescript
commands: {
  deploy: {
    description: "Deploy application to cloud",
    args: {
      environment: z.enum(["dev", "staging", "prod"])
        .describe("Target environment")
    }
  }
}
```

### 3. Handle Errors Gracefully

Return UI components for better error display:

```typescript
handler: async (args) => {
  try {
    const result = await deploy(args.environment)
    return SuccessPanel(text("Deployment successful"), "Success")
  } catch (error) {
    return ErrorPanel(
      vstack(
        text("Deployment failed"),
        text(error.message)
      ),
      "Error"
    )
  }
}
```

### 4. Use Lazy Loading for Large Commands

Improve startup time by lazy loading command handlers:

```typescript
import { lazyLoad } from "tuix/cli"

commands: {
  analytics: {
    description: "Analytics commands",
    handler: lazyLoad(() => import("./commands/analytics"))
  }
}
```

### 5. Organize Complex CLIs with Plugins

Split functionality into plugins for better organization:

```typescript
// plugins/database.ts
export default definePlugin({
  metadata: { name: "database", version: "1.0.0" },
  commands: { /* database commands */ }
})

// main.ts
import databasePlugin from "./plugins/database"

const config = defineConfig({
  name: "my-cli",
  plugins: [databasePlugin]
})
```

## Migration Guide

If you're migrating from another CLI framework:

### From Commander.js

```typescript
// Commander.js
program
  .command('serve <port>')
  .description('Start server')
  .option('-h, --host <host>', 'Host', 'localhost')
  .action((port, options) => {
    // ...
  })

// TUIX
commands: {
  serve: {
    description: "Start server",
    args: {
      port: z.number().describe("Port number")
    },
    options: {
      host: z.string().default("localhost").describe("Host")
    },
    handler: (args) => {
      // args.port and args.host are typed!
    }
  }
}
```

### From Yargs

```typescript
// Yargs
yargs.command(
  'fetch <url>',
  'Fetch a URL',
  (yargs) => {
    yargs.positional('url', {
      type: 'string',
      describe: 'URL to fetch'
    })
  },
  (argv) => {
    // ...
  }
)

// TUIX
commands: {
  fetch: {
    description: "Fetch a URL",
    args: {
      url: z.string().url().describe("URL to fetch")
    },
    handler: (args) => {
      // args.url is validated as a URL!
    }
  }
}
```

## Advanced Topics

### Custom Validation

Use Zod's powerful validation features:

```typescript
args: {
  email: z.string().email().describe("Email address"),
  age: z.number().min(18).max(100).describe("Age"),
  config: z.string().transform(async (path) => {
    const content = await fs.readFile(path, 'utf-8')
    return JSON.parse(content)
  }).describe("Config file path")
}
```

### Interactive Components

Build interactive CLIs with reactive state:

```typescript
import { createComponent, $state } from "tuix/components"

const InteractivePrompt = createComponent(() => {
  const selected = $state(0)
  const options = ["Option 1", "Option 2", "Option 3"]
  
  return {
    update: (msg, model) => {
      if (msg._tag === "KeyPress") {
        switch (msg.key.name) {
          case "up":
            selected.update(s => Math.max(0, s - 1))
            break
          case "down":
            selected.update(s => Math.min(options.length - 1, s + 1))
            break
        }
      }
      return [model, []]
    },
    
    view: () => Panel(
      vstack(
        text("Select an option:"),
        ...options.map((opt, i) => 
          text(i === selected.value ? `> ${opt}` : `  ${opt}`)
        )
      )
    )
  }
})
```

### Testing

Test your CLI commands with the testing utilities:

```typescript
import { testPluginCommand, executeWithPlugins } from "tuix/cli/testing"

test("greet command", async () => {
  const result = await executeWithPlugins(
    config,
    [],
    ["greet", "World"]
  )
  
  expect(result).toContain("Hello, World!")
})
```

## Performance Tips

1. **Use lazy loading** for commands that import heavy dependencies
2. **Cache expensive operations** in plugins using services
3. **Minimize startup time** by deferring work until needed
4. **Use streaming** for large data processing
5. **Profile with Bun's built-in profiler** to find bottlenecks

## Troubleshooting

### Common Issues

**Command not found**
- Check command name spelling
- Verify command is exported in config
- Check for name conflicts with aliases

**Type errors**
- Ensure Zod schemas match handler expectations
- Update TypeScript to latest version
- Check for version mismatches

**Performance issues**
- Enable lazy loading for large commands
- Profile startup time
- Check for synchronous I/O in global scope

## Next Steps

- Explore the [example applications](../examples/cli/)
- Read the [API reference](./api-reference.md)
- Learn about [plugin development](./plugins.md)
- Join the community discussions

## Contributing

We welcome contributions! Please see our [contributing guide](../CONTRIBUTING.md) for details.
