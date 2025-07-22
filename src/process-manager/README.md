# Process Manager

## Overview

The Process Manager module provides comprehensive process lifecycle management using Bun's native IPC capabilities. It enables spawning, monitoring, restarting, and coordinating multiple processes with health checking, file watching, resource monitoring, and advanced logging. Built for production-scale process orchestration.

## Installation

```bash
# Process Manager is included with tuix
import { ProcessManager, createProcessManager } from 'tuix/process-manager'
```

## Quick Start

```typescript
import { createProcessManager } from 'tuix/process-manager'

// Create a process manager
const manager = await createProcessManager({
  tuixDir: '.tuix',
  autoRestart: true,
  maxRestarts: 5
})

// Start a process
await manager.start({
  name: 'web-server',
  command: 'bun',
  args: ['run', 'server.ts'],
  autostart: true,
  autorestart: true,
  env: { PORT: '3000' }
})

// Monitor process status
const status = await manager.status('web-server')
console.log(`Process status: ${status.status}`)
console.log(`PID: ${status.pid}`)
console.log(`Restarts: ${status.restarts}`)

// Stop the process
await manager.stop('web-server')
```

## Core Concepts

### Process Lifecycle Management
Complete process lifecycle from spawn to cleanup:
1. **Configuration**: Define process parameters and behavior
2. **Starting**: Spawn process with proper environment setup
3. **Monitoring**: Track health, resources, and output
4. **Restarting**: Automatic restart on crashes with backoff
5. **Stopping**: Graceful shutdown with configurable timeouts

### Health Checking
Multiple health check strategies:
- **Output Pattern**: Monitor stdout/stderr for success patterns
- **HTTP Health Check**: Ping HTTP endpoints for liveness
- **TCP Connection**: Test TCP port connectivity
- **Custom Script**: Run custom health check scripts

### File Watching
Automatic process restart on file changes:
```typescript
const config = {
  name: 'api',
  command: 'bun',
  args: ['run', 'api.ts'],
  watch: true,
  watchPaths: ['src/**/*.ts', 'config/**/*.json'],
  ignoreWatch: ['logs/**', 'node_modules/**'],
  watchDebounce: 1000
}
```

### Resource Monitoring
Track memory, CPU, and network usage:
```typescript
const stats = await manager.getStats('my-process')
console.log(`Memory: ${stats.memory}MB`)
console.log(`CPU: ${stats.cpu}%`)
console.log(`Uptime: ${stats.uptime}s`)
```

### Process Groups
Organize related processes:
```typescript
// Start database cluster
await manager.start({
  name: 'db-primary',
  group: 'database',
  command: 'postgres',
  args: ['-c', 'config_file=primary.conf']
})

// Stop entire group
await manager.stopGroup('database')
```

## API Reference

### ProcessManager

#### `new ProcessManager(config?: ProcessManagerConfig, cwd?: string)`
Creates a new process manager instance.

#### `manager.init(): Promise<void>`
Initializes the process manager and loads existing processes.

#### `manager.start(config: ProcessConfig): Promise<void>`
Starts a new process with the given configuration.

#### `manager.stop(name: string): Promise<void>`
Stops a running process gracefully.

#### `manager.restart(name: string): Promise<void>`
Restarts a process (stops then starts).

#### `manager.status(name: string): Promise<ProcessState>`
Gets the current status of a process.

#### `manager.list(): Promise<ProcessState[]>`
Lists all managed processes.

#### `manager.logs(name: string, lines?: number): Promise<ProcessLog[]>`
Gets recent log entries for a process.

#### `manager.followLogs(name: string, callback: (log: ProcessLog) => void): () => void`
Follows live log output from a process. Returns unsubscribe function.

#### `manager.getStats(name: string): Promise<ProcessStats>`
Gets resource usage statistics for a process.

#### `manager.startGroup(group: string): Promise<void>`
Starts all processes in a group.

#### `manager.stopGroup(group: string): Promise<void>`
Stops all processes in a group.

#### `manager.cleanup(): Promise<void>`
Cleans up resources and stops all processes.

### Process Configuration

```typescript
interface ProcessConfig {
  name: string              // Unique process name
  command: string           // Command to execute
  args?: string[]          // Command arguments
  cwd?: string             // Working directory
  env?: Record<string, string>  // Environment variables
  autostart?: boolean      // Start on manager init
  autorestart?: boolean    // Restart on crash
  restartDelay?: number    // Delay before restart (ms)
  maxRestarts?: number     // Maximum restart attempts
  watch?: boolean          // Enable file watching
  watchPaths?: string[]    // Paths to watch
  ignoreWatch?: string[]   // Paths to ignore
  watchDebounce?: number   // Debounce delay (ms)
  logFile?: string         // Log output file
  errorFile?: string       // Error output file
  maxMemory?: number       // Memory limit (MB)
  maxCpu?: number          // CPU limit (percentage)
  group?: string           // Process group name
  interpreter?: string     // Process interpreter
  healthCheck?: HealthCheckConfig  // Health check config
}
```

### Health Check Configuration

```typescript
interface HealthCheckConfig {
  type: 'output' | 'http' | 'tcp' | 'script'
  outputPattern?: string | RegExp  // For output type
  url?: string                     // For HTTP type
  method?: 'GET' | 'POST' | 'HEAD' // For HTTP type
  host?: string                    // For TCP type
  port?: number                    // For TCP type
  script?: string                  // For script type
  interval?: number               // Check interval (ms)
  timeout?: number                // Check timeout (ms)
  retries?: number                // Retry attempts
  startPeriod?: number            // Grace period (ms)
}
```

## Examples

### Web Application Server
```typescript
import { createProcessManager } from 'tuix/process-manager'

const manager = await createProcessManager()

// Start web server with health checking
await manager.start({
  name: 'web-server',
  command: 'bun',
  args: ['run', 'server.ts'],
  env: {
    NODE_ENV: 'production',
    PORT: '3000'
  },
  autostart: true,
  autorestart: true,
  maxRestarts: 10,
  restartDelay: 2000,
  watch: true,
  watchPaths: ['src/**/*.ts', 'public/**/*'],
  ignoreWatch: ['logs/**', 'tmp/**'],
  healthCheck: {
    type: 'http',
    url: 'http://localhost:3000/health',
    interval: 30000,
    timeout: 5000,
    retries: 3
  },
  maxMemory: 512, // 512MB limit
  logFile: './logs/server.log',
  errorFile: './logs/server.error.log'
})

// Monitor the server
setInterval(async () => {
  const stats = await manager.getStats('web-server')
  console.log(`Server: ${stats.memory}MB, ${stats.cpu}% CPU, ${Math.floor(stats.uptime / 60)}min uptime`)
}, 60000)
```

### Microservices Architecture
```typescript
const manager = await createProcessManager({
  tuixDir: './.tuix',
  autoRestart: true,
  maxRestarts: 5
})

// Start API gateway
await manager.start({
  name: 'api-gateway',
  group: 'api',
  command: 'bun',
  args: ['run', 'gateway.ts'],
  env: { PORT: '8080' },
  healthCheck: {
    type: 'http',
    url: 'http://localhost:8080/health'
  }
})

// Start user service
await manager.start({
  name: 'user-service',
  group: 'services',
  command: 'bun',
  args: ['run', 'user-service.ts'],
  env: { PORT: '8001', DATABASE_URL: process.env.USER_DB_URL },
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: 8001
  }
})

// Start order service
await manager.start({
  name: 'order-service',
  group: 'services',
  command: 'bun',
  args: ['run', 'order-service.ts'],
  env: { PORT: '8002', DATABASE_URL: process.env.ORDER_DB_URL },
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: 8002
  }
})

// Start background workers
await manager.start({
  name: 'email-worker',
  group: 'workers',
  command: 'bun',
  args: ['run', 'workers/email.ts'],
  healthCheck: {
    type: 'output',
    outputPattern: /Worker ready/,
    interval: 10000
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down services...')
  await manager.stopGroup('services')
  await manager.stopGroup('workers')
  await manager.stop('api-gateway')
  process.exit(0)
})
```

### Development with Hot Reload
```typescript
const manager = await createProcessManager()

// Development server with file watching
await manager.start({
  name: 'dev-server',
  command: 'bun',
  args: ['--hot', 'run', 'src/index.ts'],
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true'
  },
  watch: true,
  watchPaths: [
    'src/**/*.ts',
    'src/**/*.tsx',
    'config/**/*.json',
    'public/**/*'
  ],
  ignoreWatch: [
    'node_modules/**',
    'dist/**',
    'logs/**',
    '**/*.log'
  ],
  watchDebounce: 500,
  autorestart: true,
  healthCheck: {
    type: 'output',
    outputPattern: /Server listening on/,
    startPeriod: 3000
  }
})

// Follow logs for development
const unfollow = manager.followLogs('dev-server', (log) => {
  const timestamp = log.timestamp.toISOString()
  console.log(`[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
})

// Stop following on exit
process.on('exit', unfollow)
```

### Database Cluster Management
```typescript
const manager = await createProcessManager()

// Primary database
await manager.start({
  name: 'postgres-primary',
  group: 'database',
  command: 'postgres',
  args: ['-D', '/var/lib/postgresql/data', '-c', 'config_file=primary.conf'],
  env: {
    POSTGRES_DB: 'myapp',
    POSTGRES_USER: 'app',
    POSTGRES_PASSWORD: process.env.DB_PASSWORD
  },
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: 5432,
    interval: 5000
  },
  maxMemory: 2048
})

// Read replica
await manager.start({
  name: 'postgres-replica',
  group: 'database',
  command: 'postgres',
  args: ['-D', '/var/lib/postgresql/replica', '-c', 'config_file=replica.conf'],
  env: {
    POSTGRES_DB: 'myapp',
    POSTGRES_USER: 'app',
    POSTGRES_PASSWORD: process.env.DB_PASSWORD
  },
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: 5433,
    interval: 5000
  },
  maxMemory: 1024
})

// Redis cache
await manager.start({
  name: 'redis-cache',
  group: 'cache',
  command: 'redis-server',
  args: ['--port', '6379', '--maxmemory', '256mb'],
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: 6379,
    interval: 10000
  }
})
```

### Custom Health Checks
```typescript
// Script-based health check
await manager.start({
  name: 'custom-service',
  command: 'bun',
  args: ['run', 'service.ts'],
  healthCheck: {
    type: 'script',
    script: `
      const response = await fetch('http://localhost:3000/deep-health')
      const data = await response.json()
      if (data.status === 'healthy' && data.database === 'connected') {
        process.exit(0) // Healthy
      } else {
        process.exit(1) // Unhealthy
      }
    `,
    interval: 60000,
    timeout: 10000,
    retries: 2
  }
})

// Output pattern health check
await manager.start({
  name: 'worker-service',
  command: 'bun',
  args: ['run', 'worker.ts'],
  healthCheck: {
    type: 'output',
    outputPattern: /Worker processed \d+ jobs successfully/,
    interval: 30000
  }
})
```

## Integration

The Process Manager integrates with all Tuix modules:

- **Logger**: Structured logging for all process events and output
- **Config**: Process configuration from config files
- **CLI**: CLI commands for process management
- **JSX**: React-like components for process monitoring UIs
- **Core**: Process lifecycle integration with application runtime
- **Plugins**: Process manager plugin for CLI applications

### JSX Process Monitor Component

```tsx
import { ProcessMonitor } from 'tuix/process-manager'

const Dashboard = () => (
  <vstack>
    <text style={{ bold: true }}>Process Dashboard</text>
    <ProcessMonitor 
      processes={['web-server', 'api-gateway', 'worker']}
      refreshInterval={5000}
      showLogs={true}
      showStats={true}
    />
  </vstack>
)
```

### CLI Integration

```typescript
// Add process management commands to CLI
import { ProcessManagerPlugin } from 'tuix/process-manager'

const config = defineConfig({
  name: 'myapp',
  plugins: [
    ProcessManagerPlugin({
      tuixDir: '.tuix',
      configFile: 'processes.json'
    })
  ]
})

// Now you have these commands:
// myapp ps list
// myapp ps start <name>
// myapp ps stop <name>
// myapp ps restart <name>
// myapp ps logs <name>
// myapp ps status <name>
```

### Configuration Integration

```typescript
// tuix.config.ts
export default defineConfig({
  processManager: {
    tuixDir: '.tuix',
    autoRestart: true,
    maxRestarts: 5,
    processes: [
      {
        name: 'web-server',
        command: 'bun run server.ts',
        autostart: true,
        env: { PORT: '3000' }
      }
    ]
  }
})
```

## Testing

```bash
# Run process manager tests
bun test src/process-manager

# Test process lifecycle
bun test src/process-manager/lifecycle.test.ts

# Test health checks
bun test src/process-manager/health.test.ts

# Test file watching
bun test src/process-manager/watcher.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT