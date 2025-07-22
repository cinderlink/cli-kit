# Plugins

## Overview

The Plugins module provides a comprehensive plugin architecture for extending Tuix applications. It enables modular functionality through a lifecycle-managed plugin system with dependency resolution, event communication, metrics collection, and both JSX and traditional plugin interfaces.

## Installation

```bash
# Plugins are included with tuix
import { createPlugin, PluginManager, JSXPlugin } from 'tuix/plugins'
```

## Quick Start

```typescript
import { createPlugin } from 'tuix/plugins'
import { Effect } from 'effect'

// Create a simple plugin
const myPlugin = await Effect.runPromise(
  createPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'A simple example plugin',
    
    initialize: () => Effect.gen(function* () {
      console.log('Plugin initialized!')
    }),
    
    teardown: () => Effect.gen(function* () {
      console.log('Plugin torn down!')
    }),
    
    api: {
      greet: (name: string) => Effect.succeed(`Hello, ${name}!`)
    }
  })
)

// Register and initialize the plugin
const manager = new PluginManager()
await Effect.runPromise(manager.register(myPlugin))
await Effect.runPromise(manager.initialize('my-plugin'))
```

## Core Concepts

### Plugin Lifecycle
Plugins follow a managed lifecycle:
1. **Registration**: Plugin is registered with the manager
2. **Initialization**: Plugin resources are set up
3. **Active**: Plugin is running and handling events
4. **Teardown**: Plugin resources are cleaned up
5. **Torn Down**: Plugin is fully deactivated

### Dependency Management
Plugins can declare dependencies on other plugins:

```typescript
const databasePlugin = createPlugin({
  id: 'database',
  dependencies: ['config', 'logger'],
  // Plugin will only initialize after dependencies are ready
})
```

### Event Communication
Plugins communicate through a typed event system:

```typescript
// Send events between plugins
const plugin = createPlugin({
  id: 'notifier',
  handlers: {
    'user.created': (event) => Effect.gen(function* () {
      console.log('New user:', event.payload.userId)
    })
  }
})

// Another plugin can emit events
communication.broadcastEvent({
  type: 'user.created',
  payload: { userId: '123' }
})
```

### Plugin APIs
Plugins expose typed APIs for inter-plugin communication:

```typescript
const apiPlugin = createPlugin({
  id: 'api',
  api: {
    getData: (id: string) => Effect.succeed(`data-${id}`),
    processData: (data: any) => Effect.succeed(processedData)
  }
})

// Other plugins can call APIs
const result = yield* apiPlugin.api.getData('user-123')
```

### JSX Plugins
Declarative plugin definition using JSX:

```tsx
import { createJSXPlugin } from 'tuix/plugins'

const MyJSXPlugin = createJSXPlugin({
  name: 'auth',
  version: '1.0.0',
  commands: [
    {
      name: 'login',
      description: 'Login to service',
      handler: async ({ args }) => {
        return `Logged in as ${args.username}`
      }
    }
  ]
})
```

### Plugin Metrics
Built-in metrics collection for monitoring:

```typescript
const metrics = yield* manager.getMetrics('my-plugin')
console.log('Events handled:', metrics.eventsHandled)
console.log('Memory usage:', metrics.memoryUsage)
console.log('Last activity:', metrics.lastActivity)
```

## API Reference

### Plugin Creation

#### `createPlugin(config: PluginConfig): Effect<Plugin, PluginError>`
Creates a new plugin instance with the provided configuration.

#### `createJSXPlugin(config: JSXPlugin): JSXPlugin`
Creates a JSX-based plugin for CLI applications.

### Plugin Manager

#### `PluginManager.register(plugin: Plugin): Effect<void, PluginError>`
Registers a plugin with the manager.

#### `PluginManager.unregister(id: string): Effect<void, PluginError>`
Unregisters a plugin.

#### `PluginManager.initialize(id: string): Effect<void, PluginError>`
Initializes a specific plugin.

#### `PluginManager.initializeAll(): Effect<void, PluginError>`
Initializes all registered plugins in dependency order.

#### `PluginManager.teardown(id: string): Effect<void, PluginError>`
Tears down a specific plugin.

#### `PluginManager.teardownAll(): Effect<void, PluginError>`
Tears down all plugins in reverse dependency order.

#### `PluginManager.getState(id: string): Effect<PluginLifecycleState, PluginError>`
Gets the current state of a plugin.

#### `PluginManager.getMetrics(id: string): Effect<PluginMetrics, PluginError>`
Gets performance metrics for a plugin.

### Plugin Registry

#### `PluginRegistry.register(plugin: Plugin): Effect<void, PluginError>`
#### `PluginRegistry.unregister(id: string): Effect<void, PluginError>`
#### `PluginRegistry.get(id: string): Plugin | undefined`
#### `PluginRegistry.list(): Plugin[]`
#### `PluginRegistry.has(id: string): boolean`

Manages plugin registration and discovery.

### Plugin Communication

#### `PluginCommunication.sendEvent(targetId: string, event): Effect<void, PluginError>`
Sends an event to a specific plugin.

#### `PluginCommunication.broadcastEvent(event): Effect<void, PluginError>`
Broadcasts an event to all plugins.

#### `PluginCommunication.subscribe(eventType: string, handler): Effect<void, PluginError>`
Subscribes to events of a specific type.

### Plugin Configuration Interface

```typescript
interface PluginConfig {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  dependencies?: string[]
  config?: Record<string, unknown>
  enabled?: boolean
}
```

### Plugin Interface

```typescript
interface Plugin extends PluginConfig {
  initialize(): Effect<void, PluginError>
  teardown(): Effect<void, PluginError>
  api?: Record<string, (...args: any[]) => Effect<unknown, PluginError>>
  handlers?: Record<string, (event: PluginEvent) => Effect<void, PluginError>>
}
```

## Examples

### Database Plugin
```typescript
import { createPlugin } from 'tuix/plugins'
import { Database } from 'my-db-lib'

const databasePlugin = createPlugin({
  id: 'database',
  name: 'Database Plugin',
  version: '1.0.0',
  dependencies: ['config'],
  
  initialize: () => Effect.gen(function* () {
    const config = yield* getPluginConfig('database')
    const db = new Database(config.connectionString)
    yield* Effect.promise(() => db.connect())
    yield* setPluginResource('database', 'connection', db)
  }),
  
  teardown: () => Effect.gen(function* () {
    const db = yield* getPluginResource('database', 'connection')
    yield* Effect.promise(() => db.disconnect())
  }),
  
  api: {
    query: (sql: string, params?: any[]) => Effect.gen(function* () {
      const db = yield* getPluginResource('database', 'connection')
      return yield* Effect.promise(() => db.query(sql, params))
    }),
    
    transaction: (operations: () => Effect<any, Error>) => Effect.gen(function* () {
      const db = yield* getPluginResource('database', 'connection')
      return yield* Effect.promise(() => db.transaction(() => 
        Effect.runPromise(operations())
      ))
    })
  },
  
  handlers: {
    'user.created': (event) => Effect.gen(function* () {
      yield* Effect.log('Inserting user into database')
      const db = yield* getPluginResource('database', 'connection')
      yield* Effect.promise(() => 
        db.query('INSERT INTO users (id, name) VALUES (?, ?)', 
                 [event.payload.id, event.payload.name])
      )
    })
  }
})
```

### Auth Plugin with CLI Commands
```typescript
import { createJSXPlugin } from 'tuix/plugins'

const authPlugin = createJSXPlugin({
  name: 'auth',
  version: '1.0.0',
  description: 'Authentication plugin',
  
  commands: [
    {
      name: 'login',
      description: 'Login to service',
      args: {
        username: { type: 'string', required: true, description: 'Username' },
        password: { type: 'string', required: true, description: 'Password' }
      },
      flags: {
        remember: { type: 'boolean', description: 'Remember login' }
      },
      handler: async ({ args, flags }) => {
        // Perform authentication
        const token = await authenticate(args.username, args.password)
        
        if (flags.remember) {
          await saveToken(token)
        }
        
        return `Successfully logged in as ${args.username}`
      }
    },
    
    {
      name: 'logout',
      description: 'Logout from service',
      handler: async () => {
        await clearToken()
        return 'Successfully logged out'
      }
    },
    
    {
      name: 'whoami',
      description: 'Show current user',
      handler: async () => {
        const token = await getToken()
        if (!token) throw new Error('Not logged in')
        
        const user = await getUserFromToken(token)
        return `Logged in as: ${user.username}`
      }
    }
  ],
  
  middleware: [
    {
      name: 'auth-check',
      handler: async (context, next) => {
        // Skip auth check for login command
        if (context.command === 'login') {
          return next()
        }
        
        const token = await getToken()
        if (!token) {
          throw new Error('Please login first')
        }
        
        context.user = await getUserFromToken(token)
        return next()
      }
    }
  ]
})
```

### Event-Driven Plugin System
```typescript
// Notification plugin
const notificationPlugin = createPlugin({
  id: 'notifications',
  name: 'Notification Plugin',
  version: '1.0.0',
  
  handlers: {
    'user.created': (event) => Effect.gen(function* () {
      yield* sendNotification({
        type: 'welcome',
        userId: event.payload.userId,
        message: 'Welcome to our service!'
      })
    }),
    
    'order.completed': (event) => Effect.gen(function* () {
      yield* sendNotification({
        type: 'order_confirmation',
        userId: event.payload.userId,
        orderId: event.payload.orderId,
        message: `Order #${event.payload.orderId} has been completed`
      })
    })
  }
})

// User service plugin
const userServicePlugin = createPlugin({
  id: 'user-service',
  name: 'User Service',
  version: '1.0.0',
  dependencies: ['database', 'notifications'],
  
  api: {
    createUser: (userData: UserData) => Effect.gen(function* () {
      // Save to database
      const db = yield* getPluginAPI('database')
      const user = yield* db.query(
        'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
        [userData.name, userData.email]
      )
      
      // Emit event for other plugins
      yield* broadcastEvent({
        type: 'user.created',
        payload: { userId: user.id, name: user.name }
      })
      
      return user
    })
  }
})
```

### Plugin Configuration and Loading
```typescript
// Load plugins from configuration
const pluginConfigs = [
  {
    id: 'database',
    path: './plugins/database.js',
    config: {
      connectionString: process.env.DATABASE_URL
    }
  },
  {
    id: 'auth',
    module: '@myapp/auth-plugin',
    enabled: true
  },
  {
    id: 'notifications',
    path: './plugins/notifications.js',
    config: {
      emailService: process.env.EMAIL_SERVICE,
      apiKey: process.env.EMAIL_API_KEY
    }
  }
]

// Initialize plugin system
const manager = new PluginManager()
const loader = new PluginLoader()

for (const config of pluginConfigs) {
  const plugin = yield* loader.loadFromConfig(config)
  yield* manager.register(plugin)
}

// Start all plugins in dependency order
yield* manager.initializeAll()
```

## Integration

The Plugins module integrates with all Tuix modules:

- **CLI**: Plugins can add commands, middleware, and CLI functionality
- **Config**: Plugin configuration through config files and environment
- **Logger**: Plugin-specific logging contexts and log aggregation
- **JSX**: Declarative plugin definition using JSX components
- **Process Manager**: Plugin process management and health monitoring
- **Core**: Plugin lifecycle integration with application runtime

### CLI Integration

```tsx
import { render } from 'tuix/jsx'

const MyApp = () => (
  <cli name="myapp" version="1.0.0">
    {/* Load plugins */}
    <plugin name="auth" />
    <plugin name="database" config={{ driver: 'postgres' }} />
    <plugin name="monitoring" enabled={process.env.NODE_ENV === 'production'} />
    
    {/* Core commands */}
    <command name="status" handler={() => 'App is running'} />
  </cli>
)

render(MyApp)
```

### Configuration Integration

```typescript
// tuix.config.ts
export default defineConfig({
  plugins: [
    {
      name: 'database',
      enabled: true,
      options: {
        connectionString: process.env.DATABASE_URL,
        poolSize: 10
      }
    },
    {
      name: 'auth',
      enabled: true,
      options: {
        provider: 'oauth2',
        clientId: process.env.OAUTH_CLIENT_ID
      }
    }
  ]
})
```

### Built-in Plugins

- **LoggingPlugin**: Centralized logging and log aggregation
- **ProcessManagerPlugin**: Process management and monitoring
- **ConfigPlugin**: Dynamic configuration management
- **HealthCheckPlugin**: Application health monitoring

## Testing

```bash
# Run plugin tests
bun test src/plugins

# Test plugin lifecycle
bun test src/plugins/lifecycle.test.ts

# Test plugin communication
bun test src/plugins/communication.test.ts

# Test JSX plugins
bun test src/plugins/jsx.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT