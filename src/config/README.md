# Config

## Overview

The Config module provides flexible, hierarchical configuration management with multiple sources including files, environment variables, command-line arguments, and defaults. It supports schema validation, hot reloading, and type-safe configuration access using Effect-TS.

## Installation

```bash
# Config is included with tuix
import { createConfig, defineConfig, ConfigLayer } from 'tuix/config'
```

## Quick Start

```typescript
import { createConfig, config } from 'tuix/config'
import { Effect } from 'effect'

// Simple configuration with defaults
const simpleConfig = await config.simple({
  appName: 'myapp',
  debug: false,
  port: 3000
})

// Standard configuration loading
const standardConfig = await config.standard('myapp')

// Get configuration values
const appName = await Effect.runPromise(
  simpleConfig.get('appName', 'default-app')
)
console.log('App name:', appName)
```

## Core Concepts

### Hierarchical Sources
Configuration values are resolved from multiple sources in priority order:
1. Command-line arguments (highest priority)
2. Environment variables  
3. Project config files (tuix.config.ts, .tuixrc, etc.)
4. User config files (~/.tuix/config)
5. Default values (lowest priority)

### Schema Validation
Use Zod schemas to validate configuration values and ensure type safety:

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  port: z.number().min(1).max(65535),
  debug: z.boolean().default(false)
})

const config = createConfig()
  .schema(schema)
  .defaults({ name: 'myapp', port: 3000 })
  .build()
```

### File Formats
Supports multiple configuration file formats:
- TypeScript: `tuix.config.ts`
- JavaScript: `tuix.config.js` 
- JSON: `.tuixrc`, `tuix.json`
- Environment: `.env`, `.env.local`

### Hot Reloading
Configuration can be watched for changes and automatically reloaded:

```typescript
const config = createConfig()
  .withWatch()
  .build()

config.watch('debug', (newValue) => {
  console.log('Debug mode changed:', newValue)
})
```

## API Reference

### Configuration Builder

#### `createConfig(): ConfigBuilder`
Creates a new configuration builder for fluent configuration setup.

#### `ConfigBuilder.defaults(values: Record<string, any>): ConfigBuilder`
Sets default configuration values.

#### `ConfigBuilder.schema(schema: ZodSchema): ConfigBuilder`
Sets validation schema for configuration values.

#### `ConfigBuilder.envPrefix(prefix: string): ConfigBuilder`
Sets environment variable prefix (e.g., 'MYAPP_' for MYAPP_DEBUG).

#### `ConfigBuilder.withUserConfig(): ConfigBuilder`
Enables loading from user configuration directory (~/.tuix/).

#### `ConfigBuilder.withProjectConfig(): ConfigBuilder`
Enables loading from project configuration files.

#### `ConfigBuilder.withWatch(): ConfigBuilder`
Enables file watching for hot reload.

#### `ConfigBuilder.file(path: string): ConfigBuilder`
Adds a specific configuration file to load.

#### `ConfigBuilder.searchPath(path: string): ConfigBuilder`
Adds a directory to search for configuration files.

#### `ConfigBuilder.build(): Promise<Config>`
Builds and returns the configuration instance.

### Configuration Service

#### `Config.get<T>(key: string, defaultValue?: T): Effect<T, ConfigError>`
Gets a configuration value with optional default.

#### `Config.getAll(): Effect<Record<string, any>, ConfigError>`
Gets all configuration values as an object.

#### `Config.set(key: string, value: any): Effect<void, ConfigError>`
Sets a configuration value (runtime only).

#### `Config.has(key: string): Effect<boolean>`
Checks if a configuration key exists.

#### `Config.watch(key: string, callback: (value: any) => void): Effect<() => void, ConfigError>`
Watches a key for changes and returns an unsubscribe function.

#### `Config.reload(): Effect<void, ConfigError>`
Reloads configuration from all sources.

### Helper Functions

#### `defineConfig<T>(config: T): T`
Type-safe configuration definition helper.

#### `loadConfig(appName?: string): Promise<Config>`
Loads configuration from standard locations.

### Quick Helpers

#### `config.simple(defaults: Record<string, any>): Promise<Config>`
Creates a simple config with defaults only.

#### `config.standard(appName: string): Promise<Config>`
Creates a config that loads from standard locations.

#### `config.cli(appName: string, defaults?: Record<string, any>): Promise<Config>`
Creates a CLI-optimized config.

#### `config.env(prefix?: string): Promise<Config>`
Creates a config from environment variables only.

#### `config.file(path: string): Promise<Config>`
Creates a config from a specific file.

## Examples

### Basic Application Config
```typescript
import { createConfig } from 'tuix/config'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  version: z.string(),
  debug: z.boolean().default(false),
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost')
  })
})

const config = await createConfig()
  .name('myapp')
  .schema(schema)
  .defaults({
    name: 'MyApp',
    version: '1.0.0',
    server: { port: 3000, host: 'localhost' }
  })
  .withUserConfig()
  .withProjectConfig()
  .envPrefix('MYAPP_')
  .build()

// Get typed configuration values
const port = await Effect.runPromise(
  config.get('server.port', 8080)
)
```

### Configuration File Template
```typescript
// tuix.config.ts
import { defineConfig } from 'tuix/config'

export default defineConfig({
  name: 'myapp',
  version: '1.0.0',
  
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true
  },
  
  processManager: {
    tuixDir: '.tuix',
    autoRestart: true,
    maxRestarts: 5
  },
  
  cli: {
    defaults: {
      verbose: false,
      quiet: false
    }
  },
  
  custom: {
    apiUrl: 'https://api.example.com',
    timeout: 30000
  }
})
```

### Environment Configuration
```bash
# .env
MYAPP_DEBUG=true
MYAPP_SERVER_PORT=4000
MYAPP_LOGGER_LEVEL=debug
MYAPP_CUSTOM_API_URL=https://staging-api.example.com
```

### Configuration with Effect Integration
```typescript
import { Effect, Layer } from 'effect'
import { ConfigLayer, Config } from 'tuix/config'

const AppLayer = ConfigLayer({ 
  name: 'myapp',
  defaults: { debug: false } 
})

const program = Effect.gen(function* (_) {
  const config = yield* Config
  const debug = yield* config.get('debug', false)
  
  if (debug) {
    console.log('Debug mode enabled')
  }
  
  return 'App completed'
})

const runnable = program.pipe(
  Effect.provide(AppLayer)
)

Effect.runPromise(runnable)
```

## Integration

The Config module integrates with all Tuix modules:

- **CLI**: Provides CLI-specific configuration and argument parsing
- **Logger**: Configures logging levels, formats, and output
- **Process Manager**: Configures process management settings
- **Plugins**: Manages plugin-specific configuration
- **Core**: Provides base configuration for all modules

### Integration Examples

```typescript
// CLI integration
import { runCLI } from 'tuix/cli'
import { loadConfig } from 'tuix/config'

const config = await loadConfig('myapp')
const cliDefaults = await Effect.runPromise(
  config.get('cli.defaults', {})
)

runCLI({
  name: 'myapp',
  defaults: cliDefaults,
  // ... other CLI config
})
```

### Configuration Templates

Generate configuration templates for new projects:

```typescript
import { templates } from 'tuix/config'

// Generate TypeScript config
const tsConfig = templates.typescript('myapp')
await Bun.write('tuix.config.ts', tsConfig)

// Generate JSON config
const jsonConfig = templates.json('myapp')
await Bun.write('tuix.json', jsonConfig)

// Generate .env template
const envConfig = templates.env('myapp')
await Bun.write('.env.example', envConfig)
```

## Testing

```bash
# Run config tests
bun test src/config

# Test configuration loading
bun test src/config/config.test.ts

# Test configuration validation
bun test src/config/validation.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT