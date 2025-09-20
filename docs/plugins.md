# Plugin System Documentation

## Overview

The TUIX plugin system allows you to extend your CLI applications with reusable functionality. Plugins can add commands, modify existing behavior, provide services, and hook into the CLI lifecycle.

## Creating a Plugin

### Basic Plugin Structure

```typescript
import { definePlugin } from "tuix/cli"
import { z } from "zod"

export default definePlugin({
  metadata: {
    name: "my-plugin",
    version: "1.0.0",
    description: "My awesome plugin",
    author: "Your Name",
    keywords: ["cli", "plugin"]
  },
  
  // Add new commands
  commands: {
    hello: {
      description: "Say hello",
      handler: () => console.log("Hello from plugin!")
    }
  },
  
  // Hook into CLI lifecycle
  hooks: {
    beforeCommand: async (command, args) => {
      console.log(`[Plugin] Running ${command.join(' ')}`)
    }
  }
})
```

### Using the Builder API

For more complex plugins, use the builder API:

```typescript
import { createPlugin } from "tuix/cli"

export default createPlugin("my-plugin", "1.0.0", (api) => {
  // Add commands dynamically
  api.addCommand("greet", {
    description: "Greet someone",
    args: {
      name: z.string().describe("Name to greet")
    },
    handler: (args) => {
      console.log(`Hello, ${args.name}!`)
    }
  })
  
  // Add hooks
  api.addHook("beforeCommand", async (command, args) => {
    console.log("Command starting...")
  })
  
  // Provide services
  api.provideService("greeting", {
    greet: (name: string) => `Hello, ${name}!`,
    farewell: (name: string) => `Goodbye, ${name}!`
  })
})
```

## Plugin Features

### Adding Commands

Plugins can add top-level commands or extend existing command hierarchies:

```typescript
commands: {
  // Top-level command
  status: {
    description: "Show plugin status",
    handler: () => { /* ... */ }
  },
  
  // Nested commands
  plugin: {
    description: "Plugin operations",
    commands: {
      install: {
        description: "Install a plugin",
        handler: () => { /* ... */ }
      },
      list: {
        description: "List installed plugins",
        handler: () => { /* ... */ }
      }
    }
  }
}
```

### Extending Commands

Modify existing commands with additional options or wrapped behavior:

```typescript
extends: {
  "deploy": {
    // Add new options to existing command
    options: {
      dryRun: z.boolean().default(false).describe("Simulate deployment")
    },
    
    // Wrap the original handler
    wrapper: (originalHandler) => async (args) => {
      if (args.dryRun) {
        console.log("DRY RUN: Would deploy...")
        return
      }
      return originalHandler(args)
    }
  }
}
```

### Middleware and Hooks

Intercept command execution with hooks:

```typescript
hooks: {
  // Before any command runs
  beforeCommand: async (command, args) => {
    console.log(`Running: ${command.join(' ')}`)
    
    // Modify args
    args._timestamp = Date.now()
  },
  
  // After command completes
  afterCommand: async (command, args, result) => {
    const duration = Date.now() - args._timestamp
    console.log(`Completed in ${duration}ms`)
  },
  
  // Handle errors
  onError: async (error, command, args) => {
    console.error(`Command failed: ${error.message}`)
    // Could send to error tracking service
  }
}
```

### Providing Services

Plugins can provide services that other parts of the CLI can use:

```typescript
// In plugin
api.provideService("database", {
  connect: async () => { /* ... */ },
  query: async (sql: string) => { /* ... */ },
  close: async () => { /* ... */ }
})

// In command handler
handler: async (args) => {
  const db = args._services.database
  const results = await db.query("SELECT * FROM users")
  // ...
}
```

### Plugin Configuration

Plugins can accept configuration:

```typescript
// Define config schema
config: z.object({
  apiUrl: z.string().url().default("https://api.example.com"),
  timeout: z.number().default(5000),
  retries: z.number().default(3)
}),

// Default config
defaultConfig: {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
}

// Access config in plugin
install: async (context) => {
  const config = context.config
  console.log(`Using API: ${config.apiUrl}`)
}
```

### Lifecycle Methods

Plugins have lifecycle methods for setup and teardown:

```typescript
{
  // Called when plugin is loaded
  install: async (context) => {
    console.log("Plugin installing...")
    // Set up resources, connections, etc.
  },
  
  // Called when plugin is unloaded
  uninstall: async (context) => {
    console.log("Plugin uninstalling...")
    // Clean up resources
  },
  
  // Called when plugin is activated
  activate: async (context) => {
    console.log("Plugin activated")
  },
  
  // Called when plugin is deactivated
  deactivate: async (context) => {
    console.log("Plugin deactivated")
  }
}
```

## Example Plugins

### Authentication Plugin

```typescript
import { createPlugin } from "tuix/cli"
import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"

export default createPlugin("auth", "1.0.0", (api) => {
  let token: string | null = null
  const tokenPath = path.join(process.env.HOME!, ".mycli/token")
  
  // Load token on install
  api.onInstall(async () => {
    try {
      token = await fs.readFile(tokenPath, "utf-8")
    } catch {
      // No token yet
    }
  })
  
  // Add auth commands
  api.addCommand("login", {
    description: "Login to the service",
    args: {
      username: z.string().describe("Username")
    },
    options: {
      password: z.string().optional().describe("Password")
    },
    handler: async (args) => {
      // Simulate login
      token = `token-${args.username}-${Date.now()}`
      await fs.mkdir(path.dirname(tokenPath), { recursive: true })
      await fs.writeFile(tokenPath, token)
      
      return SuccessPanel(
        text(`✓ Logged in as ${args.username}`),
        "Login Successful"
      )
    }
  })
  
  api.addCommand("logout", {
    description: "Logout from the service",
    handler: async () => {
      token = null
      await fs.unlink(tokenPath).catch(() => {})
      
      return SuccessPanel(
        text("✓ Logged out successfully"),
        "Logout"
      )
    }
  })
  
  // Add auth check middleware
  api.addHook("beforeCommand", async (command, args) => {
    // Skip auth for login/logout commands
    if (command[0] === "login" || command[0] === "logout") {
      return
    }
    
    // Check if command requires auth
    if (!token) {
      throw new Error("Authentication required. Please login first.")
    }
    
    // Add token to args for handlers
    args._token = token
  })
  
  // Provide auth service
  api.provideService("auth", {
    isAuthenticated: () => !!token,
    getToken: () => token,
    requireAuth: () => {
      if (!token) {
        throw new Error("Not authenticated")
      }
      return token
    }
  })
})
```

### Configuration Plugin

```typescript
import { definePlugin } from "tuix/cli"
import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"

interface Config {
  [key: string]: any
}

export default definePlugin({
  metadata: {
    name: "config",
    version: "1.0.0",
    description: "Configuration management"
  },
  
  commands: {
    config: {
      description: "Manage configuration",
      commands: {
        get: {
          description: "Get config value",
          args: {
            key: z.string().describe("Config key")
          },
          handler: async (args) => {
            const config = await loadConfig()
            const value = getByPath(config, args.key)
            
            if (value === undefined) {
              return InfoPanel(
                text(`Key '${args.key}' not found`),
                "Config"
              )
            }
            
            return Panel(
              text(JSON.stringify(value, null, 2)),
              { title: args.key }
            )
          }
        },
        
        set: {
          description: "Set config value",
          args: {
            key: z.string().describe("Config key"),
            value: z.string().describe("Value")
          },
          handler: async (args) => {
            const config = await loadConfig()
            setByPath(config, args.key, JSON.parse(args.value))
            await saveConfig(config)
            
            return SuccessPanel(
              text(`✓ Set ${args.key} = ${args.value}`),
              "Config Updated"
            )
          }
        }
      }
    }
  },
  
  middleware: {
    beforeCommand: async (command, args) => {
      // Load config and inject into args
      const config = await loadConfig()
      args._config = config
    }
  }
})
```

### Telemetry Plugin

```typescript
import { definePlugin } from "tuix/cli"

interface CommandMetrics {
  command: string[]
  startTime: number
  endTime?: number
  error?: string
  args: Record<string, any>
}

const metrics: CommandMetrics[] = []

export default definePlugin({
  metadata: {
    name: "telemetry",
    version: "1.0.0",
    description: "Usage telemetry"
  },
  
  hooks: {
    beforeCommand: async (command, args) => {
      metrics.push({
        command,
        startTime: Date.now(),
        args: sanitizeArgs(args)
      })
    },
    
    afterCommand: async (command, args, result) => {
      const metric = metrics.find(m => 
        m.command.join(' ') === command.join(' ') && 
        !m.endTime
      )
      
      if (metric) {
        metric.endTime = Date.now()
      }
    },
    
    onError: async (error, command, args) => {
      const metric = metrics.find(m => 
        m.command.join(' ') === command.join(' ') && 
        !m.endTime
      )
      
      if (metric) {
        metric.endTime = Date.now()
        metric.error = error.message
      }
    }
  },
  
  commands: {
    telemetry: {
      description: "View telemetry data",
      handler: () => {
        const summary = {
          totalCommands: metrics.length,
          uniqueCommands: new Set(metrics.map(m => m.command.join(' '))).size,
          averageDuration: calculateAverageDuration(metrics),
          errorRate: calculateErrorRate(metrics),
          topCommands: getTopCommands(metrics, 5)
        }
        
        return Panel(
          vstack(
            text(`Total commands: ${summary.totalCommands}`),
            text(`Unique commands: ${summary.uniqueCommands}`),
            text(`Average duration: ${summary.averageDuration}ms`),
            text(`Error rate: ${summary.errorRate}%`),
            text(""),
            text("Top commands:"),
            ...summary.topCommands.map(([cmd, count]) => 
              text(`  ${cmd}: ${count} times`)
            )
          ),
          { title: "Telemetry Summary" }
        )
      }
    }
  }
})
```

## Plugin Development

### Testing Plugins

Use the plugin testing utilities:

```typescript
import { 
  testPluginCommand, 
  testPluginHook,
  testServiceRegistration 
} from "tuix/cli/testing"

describe("Auth Plugin", () => {
  test("login command", async () => {
    const result = await testPluginCommand(
      authPlugin,
      ["login"],
      { username: "testuser" }
    )
    
    expect(result).toContain("Logged in as testuser")
  })
  
  test("auth hook blocks unauthenticated", async () => {
    const result = await testPluginHook(
      authPlugin,
      "beforeCommand",
      ["protected-command"],
      {}
    )
    
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain("Authentication required")
  })
  
  test("provides auth service", () => {
    const services = testServiceRegistration(authPlugin)
    
    expect(services.has("auth")).toBe(true)
    expect(services.get("auth")).toHaveProperty("isAuthenticated")
  })
})
```

### Plugin Best Practices

1. **Namespace your commands** to avoid conflicts:
   ```typescript
   commands: {
     "myplugin:status": { /* ... */ },
     "myplugin:config": { /* ... */ }
   }
   ```

2. **Handle errors gracefully** and provide helpful messages:
   ```typescript
   handler: async (args) => {
     try {
       const result = await riskyOperation()
       return SuccessPanel(text("Success!"))
     } catch (error) {
       return ErrorPanel(
         vstack(
           text("Operation failed"),
           text(error.message),
           text("Try running with --verbose for more details")
         )
       )
     }
   }
   ```

3. **Use semantic versioning** for your plugins:
   ```typescript
   metadata: {
     name: "my-plugin",
     version: "1.2.3", // major.minor.patch
     compatibleWith: "^2.0.0" // CLI version compatibility
   }
   ```

4. **Document configuration options**:
   ```typescript
   config: z.object({
     apiUrl: z.string().url()
       .describe("API endpoint URL")
       .default("https://api.example.com"),
     
     timeout: z.number()
       .describe("Request timeout in milliseconds")
       .min(100)
       .max(60000)
       .default(5000)
   })
   ```

5. **Clean up resources** in lifecycle methods:
   ```typescript
   let connection: DatabaseConnection
   
   install: async () => {
     connection = await createConnection()
   },
   
   uninstall: async () => {
     await connection?.close()
   }
   ```

## Plugin Loading

### Automatic Discovery

Plugins can be automatically discovered from:

1. **Local directory**: `./plugins/`
2. **User directory**: `~/.mycli/plugins/`
3. **NPM packages**: `mycli-plugin-*`
4. **Configuration file**: `.myclirc.json`

### Manual Loading

```typescript
import authPlugin from "./plugins/auth"
import configPlugin from "./plugins/config"

const config = defineConfig({
  name: "my-cli",
  plugins: [authPlugin, configPlugin]
})
```

### Dynamic Loading

```typescript
const loader = new PluginLoader({
  searchPaths: [
    "./plugins",
    "~/.mycli/plugins"
  ],
  packagePattern: "mycli-plugin-*"
})

const plugins = await loader.loadAll()
const registry = new PluginRegistry()

plugins.forEach(plugin => {
  registry.register(plugin)
})

const enhancedConfig = registry.applyCLIConfig(baseConfig)
```

## Plugin Distribution

### NPM Package

Create an NPM package for your plugin:

```json
{
  "name": "mycli-plugin-awesome",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["mycli-plugin"],
  "peerDependencies": {
    "tuix": "^1.0.0"
  }
}
```

### Plugin Manifest

Include a manifest for plugin metadata:

```json
{
  "name": "awesome",
  "displayName": "Awesome Plugin",
  "version": "1.0.0",
  "description": "An awesome plugin",
  "author": "Your Name",
  "repository": "https://github.com/you/mycli-plugin-awesome",
  "keywords": ["cli", "plugin", "awesome"],
  "engines": {
    "tuix": "^1.0.0"
  },
  "config": {
    "apiUrl": "https://api.awesome.com"
  }
}
```

## Advanced Plugin Patterns

### Command Composition

Build complex commands from simpler ones:

```typescript
const createResourceCommands = (resourceName: string) => ({
  [`${resourceName}:list`]: {
    description: `List ${resourceName}s`,
    handler: () => { /* ... */ }
  },
  [`${resourceName}:create`]: {
    description: `Create ${resourceName}`,
    handler: () => { /* ... */ }
  },
  [`${resourceName}:delete`]: {
    description: `Delete ${resourceName}`,
    handler: () => { /* ... */ }
  }
})

export default definePlugin({
  commands: {
    ...createResourceCommands("user"),
    ...createResourceCommands("project"),
    ...createResourceCommands("task")
  }
})
```

### Plugin Communication

Plugins can communicate through services:

```typescript
// Plugin A provides a service
api.provideService("dataStore", {
  set: async (key: string, value: any) => { /* ... */ },
  get: async (key: string) => { /* ... */ }
})

// Plugin B uses the service
handler: async (args) => {
  const dataStore = args._services.dataStore
  await dataStore.set("lastRun", Date.now())
}
```

### Conditional Features

Enable features based on environment:

```typescript
install: async (context) => {
  if (process.env.NODE_ENV === "development") {
    api.addCommand("debug", {
      description: "Debug commands",
      handler: () => { /* ... */ }
    })
  }
}
```

## Troubleshooting

### Common Issues

**Plugin not loading**
- Check file path and exports
- Verify plugin metadata
- Check for syntax errors
- Enable debug logging

**Command conflicts**
- Use namespaced commands
- Check for duplicate names
- Use aliases carefully

**Service not available**
- Ensure plugin is loaded before use
- Check service registration
- Verify plugin load order

**Performance issues**
- Lazy load heavy dependencies
- Cache expensive operations
- Profile plugin startup

### Debug Mode

Enable plugin debug mode:

```bash
DEBUG=cli:plugins my-cli status
```

This will show:
- Plugin discovery
- Load timing
- Hook execution
- Service registration

## Next Steps

- See [plugin examples](../examples/cli/plugins/)
- Read about [testing plugins](./testing.md#plugin-testing)
- Learn about [plugin security](./security.md#plugins)
- Join plugin development discussions
