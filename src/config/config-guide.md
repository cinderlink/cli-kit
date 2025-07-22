# Tuix Configuration System

A flexible, hierarchical configuration management system with multiple sources, inheritance, and validation.

## Overview

The Tuix configuration system provides:
- **Configuration inheritance**: app config → project config → user config → env vars → defaults
- **Multiple file formats**: JSON, TypeScript, YAML, TOML, .env
- **Live reloading**: Watch config files for changes
- **Type safety**: Zod schema validation
- **JSX integration**: Components and hooks for React apps
- **Plugin integration**: ProcessManager and Logger use config automatically

## Quick Start

### Basic Usage

```typescript
import { config } from 'tuix/config'

// Create a simple config with defaults
const appConfig = await config.simple({
  port: 3000,
  database: {
    host: 'localhost',
    port: 5432
  }
})

// Get values
const port = appConfig.get('port') // 3000
const dbHost = appConfig.get('database.host') // 'localhost'

// Set values
appConfig.set('port', 3001)
appConfig.set('database.ssl', true)
```

### CLI Application Config

```typescript
import { config } from 'tuix/config'

// Standard CLI config with all features
const appConfig = await config.cli('my-app', {
  // Default values
  verbose: false,
  outputDir: './dist',
  
  // Plugin configs
  logger: {
    level: 'info',
    format: 'pretty'
  },
  processManager: {
    tuixDir: '.tuix',
    autoRestart: true
  }
})

// Config loads from (in order of precedence):
// 1. CLI flags/options
// 2. Environment variables (MY_APP_*)
// 3. Project config (tuix.config.*)
// 4. User config (~/.config/tuix/settings.json)
// 5. Default values
```

### JSX Integration

```tsx
import { jsx, Plugin, Command } from 'tuix'
import { createJSXConfigApp, getConfig, getConfigValue } from 'tuix/config'

const MyCommands = () => {
  // Access config directly (no hooks needed)
  const config = getConfig()
  const theme = getConfigValue('theme', 'light')
  const apiUrl = getConfigValue('apiUrl')
  
  return (
    <Plugin name="app">
      <Command 
        name="status"
        handler={() => {
          // Access config in handlers
          const verbose = config.get('verbose')
          return <text>Theme: {theme}, API: {apiUrl}</text>
        }}
      />
    </Plugin>
  )
}

// Create app with config
const { config, app } = await createJSXConfigApp(
  <MyCommands />,
  {
    defaults: { theme: 'dark', apiUrl: 'http://localhost:3000' },
    envPrefix: "MYAPP_",
    loadUserConfig: true,
    loadProjectConfig: true
  }
)

jsx(app)
```

## Configuration Sources

### 1. Default Values (Lowest Priority)

```typescript
const config = await createConfig()
  .defaults({
    port: 3000,
    host: 'localhost'
  })
  .build()
```

### 2. User Config (~/.config/tuix/)

User-wide settings stored in:
- `~/.config/tuix/settings.json`
- `~/.config/tuix/config.json`
- `~/.config/tuix/tuix.json`

```json
{
  "theme": "dark",
  "editor": "vim",
  "telemetry": false
}
```

### 3. Project Config (tuix.config.*)

Project-specific config in order of precedence:
- `tuix.config.ts`
- `tuix.config.js`
- `tuix.config.json`
- `.tuixrc.json`
- `.tuixrc`

#### TypeScript Config

```typescript
// tuix.config.ts
import { defineConfig } from 'tuix/config'

export default defineConfig({
  name: 'my-app',
  version: '1.0.0',
  
  logger: {
    level: 'debug',
    format: 'pretty',
    showEmoji: true
  },
  
  processManager: {
    tuixDir: '.tuix',
    processes: {
      frontend: {
        command: 'bun',
        args: ['run', 'dev'],
        cwd: './frontend'
      },
      backend: {
        command: 'bun',
        args: ['server.ts'],
        cwd: './backend',
        env: {
          PORT: '3001'
        }
      }
    }
  },
  
  // Custom app config
  api: {
    baseUrl: process.env.API_URL || 'http://localhost:3000',
    timeout: 30000
  }
})
```

#### JSON Config

```json
{
  "$schema": "https://tuix.dev/schemas/config.json",
  "name": "my-app",
  "extends": "@company/shared-config",
  
  "logger": {
    "level": "info"
  },
  
  "custom": {
    "features": ["auth", "payments"]
  }
}
```

### 4. Environment Variables

Environment variables with configurable prefix:

```bash
# Default prefix: TUIX_
TUIX_PORT=3001
TUIX_DATABASE_HOST=postgres.example.com
TUIX_DATABASE_SSL=true

# Custom prefix: MYAPP_
MYAPP_API_KEY=secret123
MYAPP_FEATURES_AUTH=true
```

### 5. Runtime/CLI Options (Highest Priority)

```typescript
// Set at runtime
config.set('port', 3002)
config.set('features.beta', true)

// Or from CLI flags
const cliOptions = { verbose: true, port: 3003 }
config.merge(cliOptions, 'cli')
```

## Schema Validation

Use Zod schemas for type-safe configuration:

```typescript
import { z } from 'zod'
import { createConfig, defineConfigSchema } from 'tuix/config'

// Define schema
const schema = defineConfigSchema({
  port: z.number().min(1).max(65535),
  host: z.string().ip(),
  
  database: {
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean().default(false)
  },
  
  features: z.array(z.enum(['auth', 'payments', 'analytics'])),
  
  api: {
    timeout: z.number().min(0).default(30000),
    retries: z.number().min(0).max(10).default(3)
  }
})

// Create config with validation
const config = await createConfig()
  .schema(schema)
  .defaults({
    port: 3000,
    host: '0.0.0.0',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'myapp'
    },
    features: ['auth']
  })
  .build()

// Validation happens automatically
config.set('port', 70000) // Throws: Validation failed
config.set('features', ['auth', 'invalid']) // Throws: Invalid enum value
```

## Plugin Integration

### ProcessManager with Config

```typescript
import { ProcessManager } from 'tuix/process-manager'
import { config } from 'tuix/config'

// Create app config
const appConfig = await config.cli('my-app')

// ProcessManager automatically uses config for persistence
const pm = new ProcessManager()
pm.setAppConfig(appConfig)

// Process state is saved to config
await pm.add({
  name: 'server',
  command: 'bun',
  args: ['server.ts']
})

// State persists across CLI invocations
// Next time: bun my-app status
// Shows the server process because state is in config
```

### Logger with Config

```typescript
import { createLogger } from 'tuix/logger'
import { config } from 'tuix/config'

const appConfig = await config.cli('my-app')

// Logger reads config automatically
const logger = createLogger({
  level: appConfig.get('logger.level'),
  format: appConfig.get('logger.format'),
  showEmoji: appConfig.get('logger.showEmoji')
})

// Or use Effect layer
const LoggerLayer = createLoggerLayer({
  config: appConfig.namespace('logger')
})
```

## Advanced Features

### Namespaces

```typescript
// Create namespaced config views
const dbConfig = appConfig.namespace('database')
dbConfig.get('host') // Same as appConfig.get('database.host')
dbConfig.set('ssl', true) // Sets appConfig['database.ssl']

// Plugin configs
const loggerConfig = appConfig.namespace('logger')
const pmConfig = appConfig.namespace('processManager')
```

### File Watching

```typescript
const config = await createConfig()
  .file('./config.json')
  .withWatch() // Enable file watching
  .build()

// React to changes
config.watch((key, value, source) => {
  console.log(`Config changed: ${key} = ${value} (from ${source})`)
})

// In JSX (tuix doesn't use React hooks - config is global)
const WatchedComponent = () => {
  const apiUrl = getConfigValue('apiUrl')
  
  // Config changes are handled globally, components re-render automatically
  return <text>API URL: {apiUrl}</text>
}
```

### Config Inheritance

```typescript
// Base config
const baseConfig = {
  name: 'my-app',
  version: '1.0.0',
  features: ['core']
}

// Environment-specific overrides
const devConfig = {
  extends: './base.config.json',
  api: {
    url: 'http://localhost:3000',
    mock: true
  },
  features: ['core', 'debug']
}

const prodConfig = {
  extends: './base.config.json',
  api: {
    url: 'https://api.example.com',
    mock: false
  }
}
```

### Custom Loaders

```typescript
import { ConfigLoader } from 'tuix/config'

class XMLLoader implements ConfigLoader {
  canLoad(path: string): boolean {
    return path.endsWith('.xml')
  }
  
  async load(path: string): Promise<ConfigObject> {
    // Parse XML to config object
    const xml = await Bun.file(path).text()
    return parseXML(xml)
  }
  
  async save(path: string, config: ConfigObject): Promise<void> {
    const xml = buildXML(config)
    await Bun.write(path, xml)
  }
}

// Register custom loader
config.addLoader(new XMLLoader())
```

## Config Templates

Generate config files for your project:

```typescript
import { templates } from 'tuix/config'

// Generate TypeScript config
const tsConfig = templates.typescript('my-app')
await Bun.write('tuix.config.ts', tsConfig)

// Generate JSON config
const jsonConfig = templates.json('my-app')
await Bun.write('tuix.config.json', jsonConfig)

// Generate .env template
const envTemplate = templates.env('my-app')
await Bun.write('.env.example', envTemplate)
```

## Best Practices

1. **Use TypeScript configs** for type safety and IDE support
   ```typescript
   // tuix.config.ts
   export default defineConfig({
     // Full TypeScript support
   })
   ```

2. **Define schemas** for runtime validation
   ```typescript
   const schema = z.object({
     port: z.number(),
     features: z.array(z.string())
   })
   ```

3. **Namespace plugin configs**
   ```typescript
   {
     logger: { /* logger config */ },
     processManager: { /* pm config */ },
     myApp: { /* app-specific */ }
   }
   ```

4. **Use environment variables** for secrets
   ```typescript
   {
     api: {
       key: process.env.API_KEY || throw new Error('API_KEY required')
     }
   }
   ```

5. **Provide sensible defaults**
   ```typescript
   .defaults({
     port: 3000,
     retries: 3,
     timeout: 30000
   })
   ```

## ProcessManager Integration Example

```tsx
import { jsx, Plugin, Command } from 'tuix'
import { ProcessManager } from 'tuix/process-manager'
import { config } from 'tuix/config'

const DevCLI = () => {
  // App config persists ProcessManager state
  const appConfig = await config.cli('dev-cli', {
    processManager: {
      tuixDir: '.tuix',
      processes: {} // Will be populated by ProcessManager
    }
  })
  
  return (
    <Plugin name="dev">
      <Command
        name="start"
        handler={async () => {
          const pm = new ProcessManager()
          pm.setAppConfig(appConfig) // Enable config persistence
          
          await pm.init() // Will recover from config automatically
          
          await pm.add({
            name: 'frontend',
            command: 'bun',
            args: ['run', 'dev']
          })
          
          await pm.startAll()
          return <text>Started all processes</text>
        }}
      />
      
      <Command
        name="status"
        handler={async () => {
          const pm = new ProcessManager()
          pm.setAppConfig(appConfig)
          
          // No need to init() - lazy init happens automatically
          const status = pm.list() // Shows processes from previous run
          
          return (
            <vstack>
              {status.map(proc => (
                <text color={proc.status === 'running' ? 'green' : 'red'}>
                  {proc.name}: {proc.status}
                </text>
              ))}
            </vstack>
          )
        }}
      />
    </Plugin>
  )
}
```

## Migration Guide

### From dotenv

```javascript
// Before (dotenv)
require('dotenv').config()
const port = process.env.PORT || 3000

// After (tuix config)
const config = await config.env('MYAPP_')
const port = config.get('port', 3000)
```

### From config packages

```javascript
// Before (node-config)
const config = require('config')
const dbHost = config.get('db.host')

// After (tuix config)
import { config } from 'tuix/config'
const appConfig = await config.standard('my-app')
const dbHost = appConfig.get('db.host')
```

### From custom JSON files

```javascript
// Before
const config = JSON.parse(fs.readFileSync('./config.json'))

// After
const config = await config.file('./config.json')
```