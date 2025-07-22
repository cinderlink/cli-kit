# Tuix Process Manager

The Tuix Process Manager provides robust process orchestration for development environments, with cross-platform support, automatic restart capabilities, integrated logging, and **automatic state persistence** across CLI invocations.

## Key Features

- **Automatic State Persistence**: Processes persist across CLI invocations
- **Lazy Initialization**: No need to manually call `init()` anymore
- **Config Integration**: Works seamlessly with Tuix config system
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Process Recovery**: Automatically reconnects to running processes
- **IPC Communication**: Reliable inter-process communication

## Quick Start

### Basic Usage in JSX CLI (with State Persistence)

```tsx
import { jsx, Plugin, Command } from 'tuix'
import { createConfiguredProcessManager, ProcessMonitor } from 'tuix/process-manager'
import { config } from 'tuix/config'

const DevCLI = () => {
  // Create app config that persists state
  const appConfig = await config.cli('dev-cli')
  
  return (
    <Plugin name="dev" description="Development environment">
      <Command 
        name="start" 
        description="Start all development processes"
        handler={async () => {
          // ProcessManager automatically initializes and recovers state
          const pm = await createConfiguredProcessManager(appConfig)
          
          // Add your processes (only if not already added)
          if (!pm.status('frontend')) {
            await pm.add({
              name: 'frontend',
              command: 'bun',
              args: ['run', 'dev'],
              cwd: './frontend',
              autostart: true
            })
          }
          
          if (!pm.status('backend')) {
            await pm.add({
              name: 'backend',
              command: 'bun',
              args: ['run', 'server'],
              cwd: './backend',
              autostart: true,
              env: {
                PORT: '3001'
              }
            })
          }
          
          // Start all processes
          const result = await pm.startAll()
          
          if (result.success) {
            return <text color="green">✅ All processes started successfully!</text>
          } else {
            return (
              <vstack>
                <text color="red">❌ Some processes failed to start:</text>
                {result.failures.map(failure => (
                  <text color="gray">  • {failure}</text>
                ))}
              </vstack>
            )
          }
        }}
      />
      
      <Command
        name="status"
        description="Show process status"
        handler={async () => {
          // ProcessManager recovers state automatically
          const pm = await createConfiguredProcessManager(appConfig)
          const processes = pm.list() // Shows all processes from previous runs!
          
          if (processes.length === 0) {
            return <text color="gray">No processes configured. Run 'dev start' first.</text>
          }
          
          return (
            <vstack>
              {processes.map(proc => (
                <hstack>
                  <text color={proc.status === 'running' ? 'green' : 'red'}>
                    {proc.status === 'running' ? '●' : '○'}
                  </text>
                  <text> {proc.name}: {proc.status}</text>
                  {proc.pid && <text color="gray"> (PID: {proc.pid})</text>}
                </hstack>
              ))}
            </vstack>
          )
        }}
      />
      
      <Command
        name="monitor"
        description="Interactive process monitor"
        interactive={true}
        handler={async () => {
          const pm = await createConfiguredProcessManager(appConfig)
          return <ProcessMonitor processManager={pm} />
        }}
      />
      
      <Command
        name="stop"
        description="Stop all processes"
        handler={async () => {
          const pm = await createConfiguredProcessManager(appConfig)
          await pm.stopAll()
          return <text color="yellow">🛑 All processes stopped</text>
        }}
      />
    </Plugin>
  )
}

jsx(<DevCLI />)
```

## State Persistence (NEW!)

ProcessManager now automatically persists state between CLI invocations:

```bash
# First invocation - starts processes
$ bun my-cli dev start
✅ All processes started successfully!

# Second invocation - shows running processes from first invocation!
$ bun my-cli dev status
● frontend: running (PID: 12345)
● backend: running (PID: 12346)

# Even after terminal restart, state persists
$ bun my-cli dev stop
🛑 All processes stopped
```

### How It Works

1. **Config Integration**: When you provide an app config, ProcessManager saves state to it
2. **Lazy Initialization**: No need to call `init()` - it happens automatically
3. **Automatic Recovery**: On startup, ProcessManager recovers running processes
4. **Dual Persistence**: State is saved to both config and `.tuix/` directory

### Manual Usage (without Config)

```typescript
// Old way still works but doesn't persist between invocations
const pm = new ProcessManager()
await pm.init() // Must manually init

// New way with persistence
const appConfig = await config.cli('my-app')
const pm = await createConfiguredProcessManager(appConfig)
// No init needed - automatic!
```

## Process Configuration

### Basic Process Config

```typescript
interface ProcessConfig {
  name: string              // Unique process identifier
  command: string           // Command to execute
  args?: string[]          // Command arguments
  cwd?: string             // Working directory
  env?: Record<string, string>  // Environment variables
  autostart?: boolean      // Start automatically (default: true)
  restartPolicy?: 'always' | 'on-failure' | 'never'
  restartDelay?: number    // Delay between restarts (ms)
  maxRestarts?: number     // Maximum restart attempts
}
```

### Example Configurations

```typescript
// Web server with auto-restart
await pm.add({
  name: 'api-server',
  command: 'bun',
  args: ['server.ts'],
  cwd: './api',
  env: {
    NODE_ENV: 'development',
    PORT: '3000'
  },
  restartPolicy: 'on-failure',
  maxRestarts: 5,
  restartDelay: 2000
})

// Build watcher
await pm.add({
  name: 'build-watch',
  command: 'bun',
  args: ['build', '--watch'],
  cwd: './src',
  autostart: true
})

// Database process
await pm.add({
  name: 'postgres',
  command: 'postgres',
  args: ['-D', './data'],
  env: {
    PGPORT: '5432'
  },
  restartPolicy: 'always'
})
```

## Interactive Process Monitor

The ProcessMonitor component provides a real-time view of all processes:

```tsx
import { ProcessMonitor } from 'tuix/process-manager'

// In your command handler
handler={() => <ProcessMonitor refreshInterval={1000} />}
```

Features:
- Real-time status updates
- CPU and memory usage
- Log viewing
- Interactive controls (start/stop/restart)
- Color-coded status indicators

## Advanced Features

### Process Groups

Group related processes for coordinated management:

```typescript
pm.createGroup({
  name: 'backend-services',
  processes: ['api', 'worker', 'scheduler'],
  startOrder: 'sequential',  // or 'parallel'
  stopOrder: 'sequential'
})

// Start entire group
await pm.startGroup('backend-services')
```

### Event Streaming

React to process events:

```typescript
import { Effect, Stream } from 'effect'

const eventStream = pm.events

await Effect.runPromise(
  Stream.runForEach(eventStream, event => {
    console.log(`Process ${event.process}: ${event.type}`)
    
    if (event.type === 'error') {
      // Handle process errors
      console.error(event.data.error)
    }
  })
)
```

### Health Checks

Configure health checks for processes:

```typescript
await pm.add({
  name: 'web-app',
  command: 'bun',
  args: ['app.ts'],
  healthCheck: {
    type: 'http',
    url: 'http://localhost:3000/health',
    interval: 30000,
    timeout: 5000,
    retries: 3
  }
})
```

## Integration with Effect

The ProcessManager integrates seamlessly with Effect for dependency injection:

```typescript
import { Effect, Layer } from 'effect'
import { ProcessManagerLayer, pm } from 'tuix/process-manager'
import { LoggerLayer } from 'tuix/logger'

// Create a program that uses ProcessManager
const program = Effect.gen(function* (_) {
  // Add a process
  yield* _(pm.add({
    name: 'my-service',
    command: 'bun',
    args: ['service.ts']
  }))
  
  // Start it
  yield* _(pm.start('my-service'))
  
  // Get status
  const status = yield* _(pm.status('my-service'))
  console.log(status)
})

// Run with dependencies
await Effect.runPromise(
  program.pipe(
    Effect.provide(ProcessManagerLayer()),
    Effect.provide(LoggerLayer)
  )
)
```

## CLI Integration

### Complete Example CLI

```tsx
import { jsx, Plugin, Command, Flag, Arg } from 'tuix'
import { ProcessManager, ProcessMonitor } from 'tuix/process-manager'

const CLI = () => {
  const pm = new ProcessManager({ tuixDir: '.dev' })
  
  return (
    <Plugin name="dev" description="Development environment manager">
      <Command
        name="add"
        description="Add a new process"
        handler={async ({ args, flags }) => {
          await pm.init()
          
          await pm.add({
            name: args.name,
            command: args.command,
            args: args.args?.split(' '),
            cwd: flags.cwd,
            autostart: !flags.noAutostart
          })
          
          return <text color="green">✅ Added process: {args.name}</text>
        }}
      >
        <Arg name="name" required description="Process name" />
        <Arg name="command" required description="Command to run" />
        <Arg name="args" description="Command arguments" />
        <Flag name="cwd" alias="d" description="Working directory" />
        <Flag name="no-autostart" description="Don't start automatically" />
      </Command>
      
      <Command
        name="start"
        description="Start process(es)"
        handler={async ({ args }) => {
          await pm.init()
          
          if (args.name) {
            await pm.start(args.name)
            return <text color="green">✅ Started: {args.name}</text>
          } else {
            const result = await pm.startAll()
            return result.success
              ? <text color="green">✅ All processes started</text>
              : <text color="red">❌ Some processes failed</text>
          }
        }}
      >
        <Arg name="name" description="Process name (omit for all)" />
      </Command>
      
      <Command
        name="monitor"
        description="Interactive process monitor"
        interactive={true}
        handler={() => <ProcessMonitor />}
      />
      
      <Command
        name="logs"
        description="View process logs"
        handler={async ({ args, flags }) => {
          await pm.init()
          const logs = await pm.getLogs(args.name, flags.lines)
          
          return (
            <vstack>
              <text bold>Logs for {args.name}:</text>
              {logs.map(log => (
                <text color={log.level === 'error' ? 'red' : 'gray'}>
                  [{log.timestamp.toISOString()}] {log.message}
                </text>
              ))}
            </vstack>
          )
        }}
      >
        <Arg name="name" required description="Process name" />
        <Flag name="lines" alias="n" type="number" default={50} description="Number of lines" />
      </Command>
    </Plugin>
  )
}

jsx(<CLI />)
```

## Best Practices

1. **Always initialize**: Call `pm.init()` before any operations
2. **Use descriptive names**: Process names should clearly indicate their purpose
3. **Set working directories**: Always specify `cwd` for proper file resolution
4. **Configure restart policies**: Choose appropriate policies for each process type
5. **Monitor logs**: Use the `.tuix/logs/` directory for debugging
6. **Clean shutdown**: Use `pm.stopAll()` or handle SIGTERM properly

## Troubleshooting

### Common Issues

1. **"Command not found"**: Ensure the command is in PATH or use absolute paths
2. **"Process already exists"**: Remove the process first with `pm.remove(name)`
3. **"IPC connection failed"**: Check `.tuix/sockets/` permissions
4. **Orphaned processes**: Run `pm.init()` to detect and clean up orphans

### Debug Mode

Enable debug logging:

```bash
TUIX_DEBUG=true bun your-cli.tsx
```

This will show detailed information about process spawning, IPC connections, and state management.

## API Reference

### ProcessManager Methods

- `init()`: Initialize the manager and recover existing processes
- `add(config)`: Add a new process configuration
- `remove(name)`: Remove a process
- `start(name)`: Start a specific process
- `stop(name)`: Stop a specific process
- `restart(name)`: Restart a process
- `startAll()`: Start all processes with autostart enabled
- `stopAll()`: Stop all running processes
- `status(name?)`: Get status of one or all processes
- `list()`: List all configured processes
- `getLogs(name, lines?)`: Retrieve process logs
- `save()`: Persist current state to disk
- `shutdown()`: Clean shutdown of manager

### Events

The ProcessManager emits these events via the `events` stream:

- `starting`: Process is starting
- `started`: Process successfully started
- `stopping`: Process is stopping
- `stopped`: Process stopped
- `error`: Process encountered an error
- `log`: New log entry from process
- `health`: Health check result

## Migration from Other Tools

### From PM2

```javascript
// PM2 config
module.exports = {
  apps: [{
    name: 'api',
    script: 'server.js',
    env: { PORT: 3000 }
  }]
}

// Tuix equivalent
await pm.add({
  name: 'api',
  command: 'node',
  args: ['server.js'],
  env: { PORT: '3000' }
})
```

### From Foreman/Overmind

```procfile
web: bun run dev
api: bun server.ts
worker: bun worker.ts
```

```typescript
// Tuix equivalent
const processes = [
  { name: 'web', command: 'bun', args: ['run', 'dev'] },
  { name: 'api', command: 'bun', args: ['server.ts'] },
  { name: 'worker', command: 'bun', args: ['worker.ts'] }
]

for (const proc of processes) {
  await pm.add(proc)
}
```